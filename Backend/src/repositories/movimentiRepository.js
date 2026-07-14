// Repository movimenti: unico punto di accesso alle tabelle `dati` e `lotti`.
// Solo query, nessuna logica di business.
const { dbGet, dbAll, dbRun } = require("../config/database");

const LISTA_QUERY = `
  SELECT
    d.id, d.prodotto_id,
    p.nome AS prodotto_nome,
    m.nome AS marca_nome,
    p.descrizione AS prodotto_descrizione,
    d.tipo, d.quantita, d.prezzo,
    d.prezzo_totale_movimento AS prezzo_totale_movimento,
    CASE
      WHEN d.tipo = 'scarico' AND d.prezzo_totale_movimento IS NOT NULL AND d.quantita > 0
      THEN d.prezzo_totale_movimento / d.quantita
      ELSE NULL
    END AS prezzo_unitario_scarico,
    d.data_movimento, d.data_registrazione, d.fattura_doc, d.fornitore_cliente_id
  FROM dati d
    JOIN prodotti p ON d.prodotto_id = p.id
    LEFT JOIN marche m ON p.marca_id = m.id
  ORDER BY
    d.data_movimento DESC,
    p.nome ASC,
    CASE WHEN d.tipo = 'scarico' THEN 0 WHEN d.tipo = 'carico' THEN 1 END ASC,
    d.data_registrazione DESC,
    d.id DESC
`;

const movimentiRepository = {
  listaCompleta() {
    return dbAll(LISTA_QUERY);
  },

  trovaMovimento(id) {
    return dbGet("SELECT * FROM dati WHERE id = ?", [id]);
  },

  trovaMovimentoBase(id) {
    return dbGet(
      "SELECT prodotto_id, tipo, quantita FROM dati WHERE id = ?",
      [id],
    );
  },

  async inserisciMovimento(m) {
    const r = await dbRun(
      `INSERT INTO dati (
        prodotto_id, tipo, quantita, prezzo, prezzo_totale_movimento,
        data_movimento, data_registrazione, fattura_doc, fornitore_cliente_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        m.prodotto_id,
        m.tipo,
        m.quantita,
        m.prezzo,
        m.prezzo_totale_movimento,
        m.data_movimento,
        m.data_registrazione,
        m.fattura_doc,
        m.fornitore_cliente_id,
      ],
    );
    return r.lastID;
  },

  aggiornaMovimentoCarico(id, { quantita, prezzo, prezzo_totale_movimento, data_movimento, fattura_doc, fornitore }) {
    return dbRun(
      `UPDATE dati SET quantita=?, prezzo=?, prezzo_totale_movimento=?,
         data_movimento=?, fattura_doc=?, fornitore_cliente_id=? WHERE id=?`,
      [quantita, prezzo, prezzo_totale_movimento, data_movimento, fattura_doc, fornitore, id],
    );
  },

  aggiornaMovimentoScarico(id, { quantita, prezzo_totale_movimento, data_movimento, fattura_doc }) {
    return dbRun(
      `UPDATE dati SET quantita=?, prezzo_totale_movimento=?, data_movimento=?, fattura_doc=? WHERE id=?`,
      [quantita, prezzo_totale_movimento, data_movimento, fattura_doc, id],
    );
  },

  eliminaMovimento(id) {
    return dbRun("DELETE FROM dati WHERE id = ?", [id]);
  },

  // ── LOTTI ──
  inserisciLotto(l) {
    return dbRun(
      `INSERT INTO lotti (
        prodotto_id, dati_id, quantita_iniziale, quantita_rimanente,
        prezzo, data_carico, data_registrazione, fattura_doc, fornitore
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        l.prodotto_id,
        l.dati_id,
        l.quantita_iniziale,
        l.quantita_rimanente,
        l.prezzo,
        l.data_carico,
        l.data_registrazione,
        l.fattura_doc,
        l.fornitore,
      ],
    );
  },

  // Lotti disponibili per FIFO fino a una certa data
  lottiDisponibili(prodottoId, dataMax) {
    return dbAll(
      `SELECT id, quantita_rimanente, prezzo, data_carico, data_registrazione
       FROM lotti
       WHERE prodotto_id = ? AND data_carico <= ?
       ORDER BY data_carico ASC, data_registrazione ASC`,
      [prodottoId, dataMax],
    );
  },

  // Lotti con giacenza iniziale, per ripristini
  lottiPerRipristino(prodottoId, dataMax) {
    return dbAll(
      `SELECT id, quantita_iniziale, quantita_rimanente, data_carico, data_registrazione
       FROM lotti
       WHERE prodotto_id = ? AND data_carico <= ?
       ORDER BY data_carico ASC, data_registrazione ASC`,
      [prodottoId, dataMax],
    );
  },

  lottiPerProdottoRecenti(prodottoId) {
    return dbAll(
      `SELECT id, quantita_iniziale, quantita_rimanente
       FROM lotti WHERE prodotto_id = ?
       ORDER BY data_registrazione DESC`,
      [prodottoId],
    );
  },

  trovaLottoPerDatiId(datiId) {
    return dbGet("SELECT * FROM lotti WHERE dati_id = ?", [datiId]);
  },

  trovaLottoCaricoDaEliminare(datiId, prodottoId) {
    return dbGet(
      `SELECT id, quantita_rimanente, quantita_iniziale
       FROM lotti WHERE dati_id = ? AND prodotto_id = ? LIMIT 1`,
      [datiId, prodottoId],
    );
  },

  aggiornaQuantitaRimanente(lottoId, nuovaQuantita) {
    return dbRun("UPDATE lotti SET quantita_rimanente = ? WHERE id = ?", [
      nuovaQuantita,
      lottoId,
    ]);
  },

  aggiornaLottoCarico(lottoId, { quantita_iniziale, quantita_rimanente, prezzo, data_carico, fattura_doc, fornitore }) {
    return dbRun(
      `UPDATE lotti SET quantita_iniziale=?, quantita_rimanente=?, prezzo=?,
         data_carico=?, fattura_doc=?, fornitore=? WHERE id=?`,
      [quantita_iniziale, quantita_rimanente, prezzo, data_carico, fattura_doc, fornitore, lottoId],
    );
  },

  eliminaLotto(lottoId) {
    return dbRun("DELETE FROM lotti WHERE id = ?", [lottoId]);
  },

  scaricoEsistentePerDocumento(nomeDoc) {
    return dbGet(
      "SELECT id FROM dati WHERE fattura_doc = ? AND tipo = 'scarico' LIMIT 1",
      [nomeDoc],
    );
  },
};

module.exports = movimentiRepository;
