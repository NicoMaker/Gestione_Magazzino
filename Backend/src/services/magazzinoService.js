// Service magazzino: valore totale, riepilogo con lotti, storico giacenza alla data
const repo = require("../repositories/magazzinoRepository");
const { HttpError } = require("../middleware/errorHandler");
const { formatDecimal, isDataValida } = require("../utils/decimal");

const magazzinoService = {
  async valoreMagazzino() {
    return { valore_totale: formatDecimal(await repo.valoreMagazzino()) || 0 };
  },

  async riepilogo() {
    const [rows, lotti] = await Promise.all([
      repo.riepilogoProdotti(),
      repo.lottiAttivi(),
    ]);

    const lottiPerProdotto = {};
    for (const lotto of lotti) {
      (lottiPerProdotto[lotto.prodotto_id] ||= []).push({
        ...lotto,
        quantita_rimanente: formatDecimal(lotto.quantita_rimanente),
        prezzo: formatDecimal(lotto.prezzo),
      });
    }

    const riepilogo = rows.map((row) => ({
      ...row,
      giacenza: formatDecimal(row.giacenza),
      valore_totale: formatDecimal(row.valore_totale),
      lotti: lottiPerProdotto[row.id] || [],
    }));

    const valoreTotale = riepilogo.reduce(
      (sum, r) => sum + formatDecimal(r.valore_totale),
      0,
    );
    return { riepilogo, valore_totale: formatDecimal(valoreTotale) };
  },

  async lottiProdotto(prodottoId) {
    const rows = await repo.lottiProdotto(prodottoId);
    return rows.map((row) => ({
      ...row,
      quantita_rimanente: formatDecimal(row.quantita_rimanente),
      prezzo: formatDecimal(row.prezzo),
    }));
  },

  async storicoGiacenza(data) {
    if (!isDataValida(data)) {
      throw new HttpError(400, "Formato data non valido (YYYY-MM-DD)");
    }

    const prodotti = await repo.tuttiProdottiConMarca();
    if (prodotti.length === 0) {
      return { riepilogo: [], valore_totale: formatDecimal(0) };
    }

    let totalValue = 0;
    const results = [];

    for (const prodotto of prodotti) {
      const movimenti = await repo.movimentiFinoAData(prodotto.id, data);
      const { giacenza, valore, lotti } = ricostruisciGiacenza(movimenti);
      totalValue = formatDecimal(totalValue + valore);
      results.push({
        id: prodotto.id,
        nome: prodotto.nome,
        marca_nome: prodotto.marca_nome,
        descrizione: prodotto.descrizione,
        giacenza,
        valore_totale: valore,
        lotti,
      });
    }

    // Ordina: case-insensitive, poi maiuscole prima
    results.sort((a, b) => {
      const ci = a.nome.localeCompare(b.nome, "it", { sensitivity: "base" });
      return ci !== 0 ? ci : a.nome.localeCompare(b.nome);
    });

    return { riepilogo: results, valore_totale: formatDecimal(totalValue) };
  },
};

// Ricostruisce la giacenza FIFO a partire dai movimenti fino a una data
function ricostruisciGiacenza(movimenti) {
  const lottiAttivi = [];

  for (const mov of movimenti) {
    if (mov.tipo_movimento === "lotto") {
      lottiAttivi.push({
        id: mov.id,
        qty_iniziale: formatDecimal(mov.quantita),
        qty_rimanente: formatDecimal(mov.quantita),
        prezzo: formatDecimal(mov.prezzo),
        data_carico: mov.data_carico,
        fattura_doc: mov.fattura_doc,
        fornitore: mov.fornitore,
      });
    } else if (mov.tipo_movimento === "scarico") {
      let daScaricare = formatDecimal(mov.quantita);
      for (const lotto of lottiAttivi) {
        if (daScaricare <= 0) break;
        if (lotto.qty_rimanente <= 0) continue;
        const prelevata = Math.min(daScaricare, lotto.qty_rimanente);
        lotto.qty_rimanente = formatDecimal(lotto.qty_rimanente - prelevata);
        daScaricare = formatDecimal(daScaricare - prelevata);
      }
    }
  }

  const lottiRimanenti = lottiAttivi.filter((l) => l.qty_rimanente > 0);
  let giacenza = 0;
  let valore = 0;
  for (const l of lottiRimanenti) {
    giacenza = formatDecimal(giacenza + l.qty_rimanente);
    valore = formatDecimal(valore + l.qty_rimanente * l.prezzo);
  }

  return {
    giacenza,
    valore,
    lotti: lottiRimanenti.map((l) => ({
      id: l.id,
      quantita_rimanente: formatDecimal(l.qty_rimanente),
      prezzo: formatDecimal(l.prezzo),
      data_carico: l.data_carico,
      fattura_doc: l.fattura_doc,
      fornitore: l.fornitore,
    })),
  };
}

module.exports = magazzinoService;
