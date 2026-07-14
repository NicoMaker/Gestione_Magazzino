// Service movimenti: validazione, regole di business e orchestrazione FIFO.
// Usa il repository per l'accesso dati e fifoLogic per i calcoli.
const repo = require("../repositories/movimentiRepository");
const { transaction } = require("../config/database");
const realtime = require("../realtime/socket");
const { HttpError } = require("../middleware/errorHandler");
const {
  formatDecimal,
  formatQtaIT,
  dataItaliana,
  isDataValida,
} = require("../utils/decimal");
const {
  giacenzaTotale,
  calcolaScaricoFIFO,
  calcolaRipristino,
  fondiUpdates,
} = require("./fifoLogic");

// Applica una lista di update { id, nuova_quantita } ai lotti
async function applicaUpdatesLotti(updates) {
  for (const u of updates) {
    await repo.aggiornaQuantitaRimanente(u.id, u.nuova_quantita);
  }
}

const movimentiService = {
  async lista() {
    const rows = await repo.listaCompleta();
    return rows.map((row) => ({
      ...row,
      quantita: formatDecimal(row.quantita),
      prezzo: formatDecimal(row.prezzo),
      prezzo_totale_movimento: formatDecimal(row.prezzo_totale_movimento),
      prezzo_unitario_scarico: formatDecimal(row.prezzo_unitario_scarico),
    }));
  },

  // ───────────── CREA ─────────────
  async crea(body) {
    const { prodotto_id, tipo, quantita, prezzo, data_movimento, fattura_doc, fornitore } =
      body;

    if (!prodotto_id || !tipo || !quantita || !data_movimento) {
      throw new HttpError(400, "Prodotto, tipo, quantità e data sono obbligatori");
    }
    if (!isDataValida(data_movimento)) {
      throw new HttpError(400, "Formato data non valido (YYYY-MM-DD)");
    }
    const qta = formatDecimal(String(quantita).replace(",", "."));
    if (qta === null || qta <= 0) {
      throw new HttpError(400, "La quantità deve essere maggiore di 0");
    }

    if (tipo === "carico") return this._creaCarico({ prodotto_id, qta, prezzo, data_movimento, fattura_doc, fornitore });
    if (tipo === "scarico") return this._creaScarico({ prodotto_id, qta, data_movimento });
    throw new HttpError(400, "Tipo movimento non valido");
  },

  async _creaCarico({ prodotto_id, qta, prezzo, data_movimento, fattura_doc, fornitore }) {
    const prezzoNum = formatDecimal(String(prezzo).replace(",", "."));
    if (prezzoNum === null || prezzoNum <= 0) {
      throw new HttpError(400, "Il prezzo deve essere maggiore di 0 per i carichi");
    }
    if (!fattura_doc || !fornitore) {
      throw new HttpError(400, "Documento e Fornitore sono obbligatori per i carichi");
    }

    const now = new Date().toISOString();
    const prezzoTotale = formatDecimal(prezzoNum * qta);

    const datiId = await transaction(async () => {
      const id = await repo.inserisciMovimento({
        prodotto_id, tipo: "carico", quantita: qta, prezzo: prezzoNum,
        prezzo_totale_movimento: prezzoTotale, data_movimento,
        data_registrazione: now, fattura_doc, fornitore_cliente_id: fornitore,
      });
      await repo.inserisciLotto({
        prodotto_id, dati_id: id, quantita_iniziale: qta, quantita_rimanente: qta,
        prezzo: prezzoNum, data_carico: data_movimento, data_registrazione: now,
        fattura_doc, fornitore,
      });
      return id;
    });

    realtime.notificaMovimento("movimento_creato", { tipo: "carico", prodotto_id });
    return { success: true, message: "Carico registrato con successo", id: datiId };
  },

  async _creaScarico({ prodotto_id, qta, data_movimento }) {
    const lotti = await repo.lottiDisponibili(prodotto_id, data_movimento);
    if (lotti.length === 0) {
      throw new HttpError(
        400,
        `Nessun carico disponibile alla data ${dataItaliana(data_movimento)}. Verifica di aver caricato il prodotto prima o nella stessa data dello scarico.`,
      );
    }

    const giacenza = giacenzaTotale(lotti);
    if (giacenza < qta) {
      throw new HttpError(
        400,
        `Giacenza insufficiente. Disponibili: ${formatQtaIT(giacenza)} - Richiesti: ${formatQtaIT(qta)}`,
      );
    }

    const now = new Date().toISOString();
    const { updates, costoTotale } = calcolaScaricoFIFO(lotti, qta);

    const datiId = await transaction(async () => {
      const id = await repo.inserisciMovimento({
        prodotto_id, tipo: "scarico", quantita: qta, prezzo: null,
        prezzo_totale_movimento: costoTotale, data_movimento,
        data_registrazione: now, fattura_doc: null, fornitore_cliente_id: null,
      });
      await applicaUpdatesLotti(updates);
      return id;
    });

    realtime.notificaMovimento("movimento_creato", { tipo: "scarico", prodotto_id });
    return {
      success: true,
      message: "Scarico registrato con successo",
      id: datiId,
      costo_totale_scarico: costoTotale,
    };
  },

  // ───────────── BULK SCARICO ─────────────
  async bulkScarico({ scarichi, nome_documento }) {
    if (!Array.isArray(scarichi) || scarichi.length === 0) {
      throw new HttpError(400, "Array scarichi vuoto o non valido");
    }
    if (!nome_documento || !nome_documento.trim()) {
      throw new HttpError(400, "Nome documento obbligatorio");
    }

    const now = new Date().toISOString();
    const risultati = { success: [], failed: [], notFound: [], insufficientStock: [] };

    // Elaborazione sequenziale per rispettare l'ordine FIFO
    for (const s of scarichi) {
      const { prodotto_id, quantita, data_movimento, codice } = s;

      if (!prodotto_id || !quantita || !data_movimento) {
        risultati.failed.push({ codice, reason: "Dati mancanti (prodotto_id, quantita o data_movimento)" });
        continue;
      }
      if (!isDataValida(data_movimento)) {
        risultati.failed.push({ codice, reason: "Formato data non valido" });
        continue;
      }
      const qta = formatDecimal(String(quantita).replace(",", "."));
      if (!qta || qta <= 0) {
        risultati.failed.push({ codice, reason: "Quantità non valida" });
        continue;
      }

      try {
        const lotti = await repo.lottiDisponibili(prodotto_id, data_movimento);
        if (!lotti || lotti.length === 0) {
          risultati.insufficientStock.push({
            codice, prodotto_id, quantita: qta, data_movimento,
            reason: `Nessun carico disponibile alla data ${data_movimento}`,
          });
          continue;
        }

        const giacenza = giacenzaTotale(lotti);
        if (giacenza < qta) {
          risultati.insufficientStock.push({
            codice, prodotto_id, quantita: qta, disponibile: giacenza, data_movimento,
            reason: `Giacenza insufficiente. Disponibili: ${giacenza} - Richiesti: ${qta}`,
          });
          continue;
        }

        const { updates, costoTotale } = calcolaScaricoFIFO(lotti, qta);
        const datiId = await transaction(async () => {
          const id = await repo.inserisciMovimento({
            prodotto_id, tipo: "scarico", quantita: qta, prezzo: null,
            prezzo_totale_movimento: costoTotale, data_movimento,
            data_registrazione: now, fattura_doc: null, fornitore_cliente_id: null,
          });
          await applicaUpdatesLotti(updates);
          return id;
        });

        risultati.success.push({ codice, prodotto_id, quantita: qta, data_movimento, id: datiId });
        realtime.notificaMovimento(null);
      } catch (err) {
        risultati.failed.push({ codice, reason: err.message });
      }
    }

    return { risultati };
  },

  // ───────────── MODIFICA ─────────────
  async modifica(id, body) {
    const originale = await repo.trovaMovimento(id);
    if (!originale) throw new HttpError(404, "Movimento non trovato");

    const { quantita, prezzo, data_movimento, fattura_doc, fornitore } = body;
    if (!quantita || !data_movimento) {
      throw new HttpError(400, "Quantità e data movimento sono obbligatori");
    }
    if (!isDataValida(data_movimento)) {
      throw new HttpError(400, "Formato data non valido (YYYY-MM-DD)");
    }
    const qty = formatDecimal(String(quantita).replace(",", "."));
    if (qty === null || qty <= 0) {
      throw new HttpError(400, "Quantità deve essere maggiore di 0");
    }

    if (originale.tipo === "carico") {
      return this._modificaCarico(id, originale, { qty, prezzo, data_movimento, fattura_doc, fornitore });
    }
    return this._modificaScarico(id, originale, { qty, data_movimento, fattura_doc });
  },

  async _modificaCarico(id, originale, { qty, prezzo, data_movimento, fattura_doc, fornitore }) {
    const prc = formatDecimal(String(prezzo).replace(",", "."));
    if (prc === null || prc <= 0) {
      throw new HttpError(400, "Prezzo obbligatorio e maggiore di 0 per il carico");
    }

    const lotto = await repo.trovaLottoPerDatiId(id);
    if (!lotto) throw new HttpError(404, "Lotto collegato non trovato");

    const qtaIniziale = formatDecimal(lotto.quantita_iniziale);
    const qtaRimanente = formatDecimal(lotto.quantita_rimanente);
    const qtaConsumata = formatDecimal(qtaIniziale - qtaRimanente);

    if (qty < qtaConsumata) {
      throw new HttpError(
        400,
        `Impossibile ridurre la quantità a ${formatQtaIT(qty)}: sono già stati scaricati ${formatQtaIT(qtaConsumata)} pezzi da questo carico.`,
      );
    }

    const nuovaQtaRimanente = formatDecimal(qty - qtaConsumata);
    const prezzoTotale = formatDecimal(prc * qty);

    await transaction(async () => {
      await repo.aggiornaMovimentoCarico(id, {
        quantita: qty, prezzo: prc, prezzo_totale_movimento: prezzoTotale,
        data_movimento, fattura_doc, fornitore: fornitore || null,
      });
      await repo.aggiornaLottoCarico(lotto.id, {
        quantita_iniziale: qty, quantita_rimanente: nuovaQtaRimanente,
        prezzo: prc, data_carico: data_movimento, fattura_doc, fornitore: fornitore || null,
      });
    });

    realtime.notificaMovimento("movimento_modificato", { tipo: "carico", prodotto_id: originale.prodotto_id });
    return { success: true, message: "Carico modificato con successo" };
  },

  async _modificaScarico(id, originale, { qty, data_movimento, fattura_doc }) {
    const prodotto_id = originale.prodotto_id;
    const qtaOriginale = formatDecimal(originale.quantita);
    const dataOriginale = originale.data_movimento;

    // 1) ripristino virtuale dello scarico originale
    const lottiRipristino = await repo.lottiPerRipristino(prodotto_id, dataOriginale);
    const { updates: updateRipristino } = calcolaRipristino(lottiRipristino, qtaOriginale);

    // 2) verifica giacenza alla nuova data (considerando il ripristino)
    const lottiDisponibili = await repo.lottiDisponibili(prodotto_id, data_movimento);
    if (lottiDisponibili.length === 0) {
      throw new HttpError(
        400,
        `Nessun carico disponibile alla data ${dataItaliana(data_movimento)}. Verifica di aver caricato il prodotto prima o nella stessa data dello scarico.`,
      );
    }

    const mappaLotti = {};
    lottiDisponibili.forEach((l) => {
      mappaLotti[l.id] = formatDecimal(l.quantita_rimanente);
    });
    updateRipristino.forEach((u) => {
      if (mappaLotti[u.id] !== undefined) mappaLotti[u.id] = u.nuova_quantita;
    });

    let giacenza = 0;
    Object.values(mappaLotti).forEach((q) => {
      giacenza = formatDecimal(giacenza + q);
    });

    if (giacenza < qty) {
      throw new HttpError(
        400,
        `Giacenza insufficiente alla data indicata. Disponibili: ${formatQtaIT(giacenza)} - Richiesti: ${formatQtaIT(qty)}`,
      );
    }

    // 3) nuovo scarico FIFO usando le disponibilità aggiornate dal ripristino
    const { updates: updateNuovoScarico, costoTotale } = calcolaScaricoFIFO(
      lottiDisponibili,
      qty,
      mappaLotti,
    );

    // 4) transazione: aggiorna movimento + fondi ripristino e nuovo scarico
    await transaction(async () => {
      await repo.aggiornaMovimentoScarico(id, {
        quantita: qty, prezzo_totale_movimento: costoTotale, data_movimento, fattura_doc,
      });
      const tuttiGliUpdates = fondiUpdates(updateRipristino, updateNuovoScarico);
      await applicaUpdatesLotti(tuttiGliUpdates);
    });

    realtime.notificaMovimento("movimento_modificato", { tipo: "scarico", prodotto_id });
    return {
      success: true,
      message: "Scarico modificato con successo",
      costo_totale_scarico: costoTotale,
    };
  },

  // ───────────── ELIMINA ─────────────
  async elimina(id) {
    const movimento = await repo.trovaMovimentoBase(id);
    if (!movimento) throw new HttpError(404, "Movimento non trovato");

    const { prodotto_id, tipo, quantita } = movimento;
    const qty = formatDecimal(quantita);

    if (tipo === "carico") return this._eliminaCarico(id, prodotto_id);
    return this._eliminaScarico(id, prodotto_id, qty);
  },

  async _eliminaCarico(id, prodotto_id) {
    const lotto = await repo.trovaLottoCaricoDaEliminare(id, prodotto_id);
    const qtaRimanente = formatDecimal(lotto?.quantita_rimanente);
    const qtaIniziale = formatDecimal(lotto?.quantita_iniziale);

    if (!lotto || qtaRimanente !== qtaIniziale) {
      throw new HttpError(
        400,
        "Impossibile eliminare: il lotto è stato parzialmente o totalmente scaricato.",
      );
    }

    await transaction(async () => {
      await repo.eliminaLotto(lotto.id);
      await repo.eliminaMovimento(id);
    });

    realtime.notificaMovimento("movimento_eliminato", { tipo: "carico", prodotto_id });
    return { success: true, message: "Carico eliminato con successo" };
  },

  async _eliminaScarico(id, prodotto_id, qty) {
    const lotti = await repo.lottiPerProdottoRecenti(prodotto_id);
    const { updates, mancante } = calcolaRipristino(lotti, qty);

    if (mancante > 0) {
      throw new HttpError(400, "Impossibile ripristinare completamente la quantità");
    }

    await transaction(async () => {
      await applicaUpdatesLotti(updates);
      await repo.eliminaMovimento(id);
    });

    realtime.notificaMovimento("movimento_eliminato", { tipo: "scarico", prodotto_id });
    return { success: true, message: "Scarico eliminato con successo" };
  },
};

module.exports = movimentiService;
