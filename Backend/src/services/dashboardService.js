// Service dashboard: trasforma i dati aggregati in KPI, grafico e "cose da fare"
const repo = require("../repositories/dashboardRepository");
const { formatDecimal } = require("../utils/decimal");

const GIORNI_MERCE_FERMA = 180;
const ESEMPI_MAX = 5;

const NOMI_MESI = [
  "Gen",
  "Feb",
  "Mar",
  "Apr",
  "Mag",
  "Giu",
  "Lug",
  "Ago",
  "Set",
  "Ott",
  "Nov",
  "Dic",
];

// Ultimi n mesi (compreso quello corrente) come [{ chiave: "2026-03", etichetta: "Mar" }]
function ultimiMesi(n) {
  const oggi = new Date();
  const mesi = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(
      Date.UTC(oggi.getUTCFullYear(), oggi.getUTCMonth() - i, 1),
    );
    const chiave = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    mesi.push({ chiave, etichetta: NOMI_MESI[d.getUTCMonth()] });
  }
  return mesi;
}

const esempi = (righe) => righe.slice(0, ESEMPI_MAX).map((r) => r.nome);

const dashboardService = {
  async panoramica() {
    const mesi = ultimiMesi(6);
    const [
      conteggi,
      valore,
      mov30,
      esauriti,
      senzaMov,
      senzaMarca,
      marcheVuote,
      ferma,
      andamento,
      ultimi,
      top,
    ] = await Promise.all([
      repo.conteggi(),
      repo.valoreEPezzi(),
      repo.movimentiUltimiGiorni(30),
      repo.prodottiEsauriti(),
      repo.prodottiSenzaMovimenti(),
      repo.prodottiSenzaMarca(),
      repo.marcheSenzaProdotti(),
      repo.merceFerma(GIORNI_MERCE_FERMA),
      repo.andamentoMensile(`${mesi[0].chiave}-01`),
      repo.ultimiMovimenti(6),
      repo.topValore(5),
    ]);

    // ── Cose da fare, ordinate per urgenza ──
    const azioni = [];
    if (esauriti.length)
      azioni.push({
        codice: "esauriti",
        gravita: "alta",
        titolo: "Prodotti esauriti da riordinare",
        descrizione: "Giacenza a zero: ordina di nuovo prima di restare senza.",
        conteggio: esauriti.length,
        esempi: esempi(esauriti),
        sezione: "riordino",
        azione: "Vai al riordino",
      });
    if (ferma.length)
      azioni.push({
        codice: "merce_ferma",
        gravita: "media",
        titolo: `Merce ferma da oltre ${GIORNI_MERCE_FERMA} giorni`,
        descrizione:
          "Lotti caricati da molto tempo e ancora in magazzino: valuta una promozione.",
        conteggio: ferma.length,
        esempi: esempi(ferma),
        sezione: "riepilogo",
        azione: "Apri il riepilogo",
      });
    if (senzaMov.length)
      azioni.push({
        codice: "senza_movimenti",
        gravita: "media",
        titolo: "Prodotti senza nessun movimento",
        descrizione: "Sono in anagrafica ma non hai ancora caricato nulla.",
        conteggio: senzaMov.length,
        esempi: esempi(senzaMov),
        sezione: "movimenti",
        azione: "Registra un carico",
      });
    if (senzaMarca.length)
      azioni.push({
        codice: "senza_marca",
        gravita: "info",
        titolo: "Prodotti senza marca",
        descrizione: "Assegna una marca per ritrovarli più facilmente.",
        conteggio: senzaMarca.length,
        esempi: esempi(senzaMarca),
        sezione: "prodotti",
        azione: "Apri i prodotti",
      });
    if (marcheVuote.length)
      azioni.push({
        codice: "marche_vuote",
        gravita: "info",
        titolo: "Marche senza prodotti",
        descrizione: "Non servono a nessuno: puoi selezionarle ed eliminarle.",
        conteggio: marcheVuote.length,
        esempi: esempi(marcheVuote),
        sezione: "marche",
        azione: "Apri le marche",
      });

    // ── Andamento ultimi 6 mesi ──
    const mappa = new Map(andamento.map((r) => [`${r.mese}|${r.tipo}`, r]));
    const serie = mesi.map(({ chiave, etichetta }) => ({
      mese: chiave,
      etichetta,
      carichi: formatDecimal(mappa.get(`${chiave}|carico`)?.pezzi) || 0,
      scarichi: formatDecimal(mappa.get(`${chiave}|scarico`)?.pezzi) || 0,
    }));

    return {
      generato_il: new Date().toISOString(),
      kpi: {
        ...conteggi,
        valore_magazzino: formatDecimal(valore.valore) || 0,
        pezzi_in_giacenza: formatDecimal(valore.pezzi) || 0,
        movimenti_30gg: mov30,
        prodotti_esauriti: esauriti.length,
      },
      azioni,
      andamento: serie,
      ultimi_movimenti: ultimi.map((m) => ({
        ...m,
        quantita: formatDecimal(m.quantita),
      })),
      top_valore: top.map((t) => ({
        ...t,
        pezzi: formatDecimal(t.pezzi),
        valore: formatDecimal(t.valore),
      })),
    };
  },
};

module.exports = dashboardService;
