// services/datiService.js — regole di business dei movimenti di magazzino.
// Usa il repository per l'I/O e il modulo fifo per i calcoli puri.
const repo = require("../repositories/datiRepository");
const { transaction } = require("../utils/dbHelpers");
const {
  formatDecimal,
  formatQuantitaMsg,
  dataItaliana,
  isDataValida,
} = require("../utils/format");
const {
  giacenzaDisponibile,
  calcolaScaricoFIFO,
  calcolaRipristino,
} = require("./fifo");

// Errore applicativo con status HTTP associato
class DatiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const now = () => new Date().toISOString();

const datiService = {
  DatiError,

  lista() {
    return repo.listaMovimenti().then((rows) =>
      rows.map((row) => ({
        ...row,
        quantita: formatDecimal(row.quantita),
        prezzo: formatDecimal(row.prezzo),
        prezzo_totale_movimento: formatDecimal(row.prezzo_totale_movimento),
        prezzo_unitario_scarico: formatDecimal(row.prezzo_unitario_scarico),
      })),
    );
  },

  // ---- Creazione movimento (carico o scarico) ----
  async creaMovimento(body) {
    const { prodotto_id, tipo, quantita, prezzo, data_movimento, fattura_doc, fornitore } = body;

    if (!prodotto_id || !tipo || !quantita || !data_movimento) {
      throw new DatiError(400, "Prodotto, tipo, quantità e data sono obbligatori");
    }
    if (!isDataValida(data_movimento)) {
      throw new DatiError(400, "Formato data non valido (YYYY-MM-DD)");
    }
    const qta = formatDecimal(String(quantita).replace(",", "."));
    if (qta === null || qta <= 0) {
      throw new DatiError(400, "La quantità deve essere maggiore di 0");
    }

    if (tipo === "carico") return this._creaCarico({ prodotto_id, qta, prezzo, data_movimento, fattura_doc, fornitore });
    if (tipo === "scarico") return this._creaScarico({ prodotto_id, qta, data_movimento });
    throw new DatiError(400, "Tipo movimento non valido");
  },

  async _creaCarico({ prodotto_id, qta, prezzo, data_movimento, fattura_doc, fornitore }) {
    const prezzoNum = formatDecimal(String(prezzo).replace(",", "."));
    if (prezzoNum === null || prezzoNum <= 0) {
      throw new DatiError(400, "Il prezzo deve essere maggiore di 0 per i carichi");
    }
    if (!fattura_doc || !fornitore) {
      throw new DatiError(400, "Documento e Fornitore sono obbligatori per i carichi");
    }
    const prezzoTotale = formatDecimal(prezzoNum * qta);
    const ts = now();

    const datiId = await transaction(async () => {
      const { lastID } = await repo.inserisciMovimento({
        prodotto_id, tipo: "carico", quantita: qta, prezzo: prezzoNum,
        prezzo_totale_movimento: prezzoTotale, data_movimento,
        data_registrazione: ts, fattura_doc, fornitore_cliente_id: fornitore,
      });
      await repo.inserisciLotto({
        prodotto_id, dati_id: lastID, quantita_iniziale: qta, quantita_rimanente: qta,
        prezzo: prezzoNum, data_carico: data_movimento, data_registrazione: ts,
        fattura_doc, fornitore,
      });
      return lastID;
    });

    return {
      events: [{ name: "movimento_creato", payload: { tipo: "carico", prodotto_id } }],
      response: { success: true, message: "Carico registrato con successo", id: datiId },
    };
  },

  async _creaScarico({ prodotto_id, qta, data_movimento }) {
    const lotti = await repo.lottiDisponibiliAllaData(prodotto_id, data_movimento);
    if (lotti.length === 0) {
      throw new DatiError(
        400,
        `Nessun carico disponibile alla data ${dataItaliana(data_movimento)}. Verifica di aver caricato il prodotto prima o nella stessa data dello scarico.`,
      );
    }

    const giacenza = giacenzaDisponibile(lotti);
    if (giacenza < qta) {
      throw new DatiError(
        400,
        `Giacenza insufficiente. Disponibili: ${formatQuantitaMsg(giacenza)} - Richiesti: ${formatQuantitaMsg(qta)}`,
      );
    }

    const { updates, costoTotale } = calcolaScaricoFIFO(lotti, qta);
    const ts = now();

    const datiId = await transaction(async () => {
      const { lastID } = await repo.inserisciMovimento({
        prodotto_id, tipo: "scarico", quantita: qta, prezzo: null,
        prezzo_totale_movimento: costoTotale, data_movimento,
        data_registrazione: ts, fattura_doc: null, fornitore_cliente_id: null,
      });
      for (const u of updates) await repo.aggiornaQuantitaLotto(u.id, u.nuova_quantita);
      return lastID;
    });

    return {
      events: [{ name: "movimento_creato", payload: { tipo: "scarico", prodotto_id } }],
      response: { success: true, message: "Scarico registrato con successo", id: datiId, costo_totale_scarico: costoTotale },
    };
  },

  // ---- Bulk scarico (import PDF) ----
  async bulkScarico({ scarichi, nome_documento }) {
    if (!Array.isArray(scarichi) || scarichi.length === 0) {
      throw new DatiError(400, "Array scarichi vuoto o non valido");
    }
    if (!nome_documento || !nome_documento.trim()) {
      throw new DatiError(400, "Nome documento obbligatorio");
    }

    const ts = now();
    const risultati = { success: [], failed: [], notFound: [], insufficientStock: [] };
    let emitNeeded = false;

    // Elabora in sequenza per rispettare l'ordine FIFO
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
        const lotti = await repo.lottiDisponibiliAllaData(prodotto_id, data_movimento);
        if (!lotti || lotti.length === 0) {
          risultati.insufficientStock.push({ codice, prodotto_id, quantita: qta, data_movimento, reason: `Nessun carico disponibile alla data ${data_movimento}` });
          continue;
        }
        const giacenza = giacenzaDisponibile(lotti);
        if (giacenza < qta) {
          risultati.insufficientStock.push({ codice, prodotto_id, quantita: qta, disponibile: giacenza, data_movimento, reason: `Giacenza insufficiente. Disponibili: ${giacenza} - Richiesti: ${qta}` });
          continue;
        }

        const { updates, costoTotale } = calcolaScaricoFIFO(lotti, qta);
        const datiId = await transaction(async () => {
          const { lastID } = await repo.inserisciMovimento({
            prodotto_id, tipo: "scarico", quantita: qta, prezzo: null,
            prezzo_totale_movimento: costoTotale, data_movimento,
            data_registrazione: ts, fattura_doc: null, fornitore_cliente_id: null,
          });
          for (const u of updates) await repo.aggiornaQuantitaLotto(u.id, u.nuova_quantita);
          return lastID;
        });

        emitNeeded = true;
        risultati.success.push({ codice, prodotto_id, quantita: qta, data_movimento, id: datiId });
      } catch (err) {
        risultati.failed.push({ codice, reason: err.message });
      }
    }

    return {
      events: emitNeeded ? [{ name: "magazzino_aggiornato" }] : [],
      response: { risultati },
    };
  },

  // ---- Modifica movimento ----
  async modificaMovimento(id, body) {
    const originale = await repo.movimentoPerId(id);
    if (!originale) throw new DatiError(404, "Movimento non trovato");

    const { quantita, data_movimento } = body;
    if (!quantita || !data_movimento) {
      throw new DatiError(400, "Quantità e data movimento sono obbligatori");
    }
    if (!isDataValida(data_movimento)) {
      throw new DatiError(400, "Formato data non valido (YYYY-MM-DD)");
    }
    const qty = formatDecimal(String(quantita).replace(",", "."));
    if (qty === null || qty <= 0) {
      throw new DatiError(400, "Quantità deve essere maggiore di 0");
    }

    if (originale.tipo === "carico") return this._modificaCarico(id, originale, qty, body);
    return this._modificaScarico(id, originale, qty, body);
  },

  async _modificaCarico(id, originale, qty, body) {
    const { prezzo, data_movimento, fattura_doc, fornitore } = body;
    const { prodotto_id } = originale;

    const prc = formatDecimal(String(prezzo).replace(",", "."));
    if (prc === null || prc <= 0) {
      throw new DatiError(400, "Prezzo obbligatorio e maggiore di 0 per il carico");
    }

    const lotto = await repo.lottoPerDatiId(id);
    if (!lotto) throw new DatiError(404, "Lotto collegato non trovato");

    const qtaIniziale = formatDecimal(lotto.quantita_iniziale);
    const qtaRimanente = formatDecimal(lotto.quantita_rimanente);
    const qtaConsumata = formatDecimal(qtaIniziale - qtaRimanente);

    if (qty < qtaConsumata) {
      throw new DatiError(
        400,
        `Impossibile ridurre la quantità a ${formatQuantitaMsg(qty)}: sono già stati scaricati ${formatQuantitaMsg(qtaConsumata)} pezzi da questo carico.`,
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
        quantita_iniziale: qty, quantita_rimanente: nuovaQtaRimanente, prezzo: prc,
        data_carico: data_movimento, fattura_doc, fornitore: fornitore || null,
      });
    });

    return {
      events: [{ name: "movimento_modificato", payload: { tipo: "carico", prodotto_id } }],
      response: { success: true, message: "Carico modificato con successo" },
    };
  },

  async _modificaScarico(id, originale, qty, body) {
    const { data_movimento, fattura_doc } = body;
    const { prodotto_id } = originale;
    const qtaOriginale = formatDecimal(originale.quantita);
    const dataOriginale = originale.data_movimento;

    // 1) Calcola ripristino dello scarico originale
    const lottiPerRipristino = await repo.lottiPerRipristinoAllaData(prodotto_id, dataOriginale);
    const { updates: updateRipristino } = calcolaRipristino(lottiPerRipristino, qtaOriginale);

    // 2) Verifica giacenza alla nuova data, considerando il ripristino
    const lottiDisponibili = await repo.lottiDisponibiliAllaData(prodotto_id, data_movimento);
    if (lottiDisponibili.length === 0) {
      throw new DatiError(
        400,
        `Nessun carico disponibile alla data ${dataItaliana(data_movimento)}. Verifica di aver caricato il prodotto prima o nella stessa data dello scarico.`,
      );
    }

    // Mappa lotto→quantità con il ripristino già applicato
    const mappaLotti = {};
    lottiDisponibili.forEach((l) => (mappaLotti[l.id] = formatDecimal(l.quantita_rimanente)));
    updateRipristino.forEach((u) => {
      if (mappaLotti[u.id] !== undefined) mappaLotti[u.id] = u.nuova_quantita;
    });

    let giacenza = 0;
    Object.values(mappaLotti).forEach((q) => (giacenza = formatDecimal(giacenza + q)));
    if (giacenza < qty) {
      throw new DatiError(
        400,
        `Giacenza insufficiente alla data indicata. Disponibili: ${formatQuantitaMsg(giacenza)} - Richiesti: ${formatQuantitaMsg(qty)}`,
      );
    }

    // 3) Calcola nuovo scarico FIFO sulle quantità mappate
    let daScaricare = qty;
    let costoTotaleScarico = 0;
    const updateNuovoScarico = [];
    for (const lotto of lottiDisponibili) {
      if (daScaricare <= 0) break;
      const qtaDisponibileLotto = mappaLotti[lotto.id];
      const qtaDaQuestoLotto = Math.min(daScaricare, qtaDisponibileLotto);
      updateNuovoScarico.push({ id: lotto.id, nuova_quantita: formatDecimal(qtaDisponibileLotto - qtaDaQuestoLotto) });
      costoTotaleScarico = formatDecimal(costoTotaleScarico + qtaDaQuestoLotto * formatDecimal(lotto.prezzo));
      daScaricare = formatDecimal(daScaricare - qtaDaQuestoLotto);
    }

    // Unisci ripristino + nuovo scarico (il nuovo scarico prevale sullo stesso lotto)
    const tuttiGliUpdates = [...updateRipristino];
    updateNuovoScarico.forEach((nuovo) => {
      const i = tuttiGliUpdates.findIndex((u) => u.id === nuovo.id);
      if (i >= 0) tuttiGliUpdates[i] = nuovo;
      else tuttiGliUpdates.push(nuovo);
    });

    await transaction(async () => {
      await repo.aggiornaMovimentoScarico(id, {
        quantita: qty, prezzo_totale_movimento: costoTotaleScarico,
        data_movimento, fattura_doc,
      });
      for (const u of tuttiGliUpdates) await repo.aggiornaQuantitaLotto(u.id, u.nuova_quantita);
    });

    return {
      events: [{ name: "movimento_modificato", payload: { tipo: "scarico", prodotto_id } }],
      response: { success: true, message: "Scarico modificato con successo", costo_totale_scarico: costoTotaleScarico },
    };
  },

  // ---- Elimina movimento ----
  async eliminaMovimento(id) {
    const movimento = await repo.movimentoBasePerId(id);
    if (!movimento) throw new DatiError(404, "Movimento non trovato");

    const { prodotto_id, tipo } = movimento;
    const qty = formatDecimal(movimento.quantita);

    if (tipo === "carico") return this._eliminaCarico(id, prodotto_id);
    return this._eliminaScarico(id, prodotto_id, qty);
  },

  async _eliminaCarico(id, prodotto_id) {
    const lotto = await repo.lottoCaricoPerEliminazione(id, prodotto_id);
    const qtaRimanente = formatDecimal(lotto?.quantita_rimanente);
    const qtaIniziale = formatDecimal(lotto?.quantita_iniziale);

    if (!lotto || qtaRimanente !== qtaIniziale) {
      throw new DatiError(400, "Impossibile eliminare: il lotto è stato parzialmente o totalmente scaricato.");
    }

    await transaction(async () => {
      await repo.eliminaLotto(lotto.id);
      await repo.eliminaMovimento(id);
    });

    return {
      events: [{ name: "movimento_eliminato", payload: { tipo: "carico", prodotto_id } }],
      response: { success: true, message: "Carico eliminato con successo" },
    };
  },

  async _eliminaScarico(id, prodotto_id, qty) {
    const lotti = await repo.lottiProdottoRecentiPrima(prodotto_id);

    // Ripristina la giacenza sui lotti (consumati) partendo dai più recenti
    let daRipristinare = qty;
    const updates = [];
    for (const lotto of lotti) {
      if (daRipristinare <= 0) break;
      const qtaIniziale = formatDecimal(lotto.quantita_iniziale);
      const qtaRimanente = formatDecimal(lotto.quantita_rimanente);
      const qtaConsumata = formatDecimal(qtaIniziale - qtaRimanente);
      const qtaDaQuestoLotto = Math.min(daRipristinare, qtaConsumata);
      if (qtaDaQuestoLotto > 0) {
        updates.push({ id: lotto.id, nuova_quantita: formatDecimal(qtaRimanente + qtaDaQuestoLotto) });
        daRipristinare = formatDecimal(daRipristinare - qtaDaQuestoLotto);
      }
    }

    if (daRipristinare > 0) {
      throw new DatiError(400, "Impossibile ripristinare completamente la quantità");
    }

    await transaction(async () => {
      for (const u of updates) await repo.aggiornaQuantitaLotto(u.id, u.nuova_quantita);
      await repo.eliminaMovimento(id);
    });

    return {
      events: [{ name: "movimento_eliminato", payload: { tipo: "scarico", prodotto_id } }],
      response: { success: true, message: "Scarico eliminato con successo" },
    };
  },
};

module.exports = datiService;
