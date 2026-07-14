// repositories/datiRepository.js — unico punto di accesso a `dati` e `lotti`
const { get, all, run } = require("../utils/dbHelpers");

const datiRepository = {
  // ---- Lettura movimenti ----
  listaMovimenti() {
    return all(`
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
    `);
  },

  movimentoPerId(id) {
    return get("SELECT * FROM dati WHERE id = ?", [id]);
  },

  movimentoBasePerId(id) {
    return get("SELECT prodotto_id, tipo, quantita FROM dati WHERE id = ?", [id]);
  },

  documentoScaricoEsistente(nomeDoc) {
    return get(
      "SELECT id FROM dati WHERE fattura_doc = ? AND tipo = 'scarico' LIMIT 1",
      [nomeDoc],
    );
  },

  // ---- Lotti (FIFO) ----
  // Lotti disponibili alla data (per scarico), ordinati FIFO
  lottiDisponibiliAllaData(prodottoId, data) {
    return all(
      `SELECT id, quantita_rimanente, prezzo, data_carico, data_registrazione
       FROM lotti
       WHERE prodotto_id = ? AND data_carico <= ?
       ORDER BY data_carico ASC, data_registrazione ASC`,
      [prodottoId, data],
    );
  },

  // Lotti per ripristino (con quantità iniziale/rimanente), ordinati FIFO
  lottiPerRipristinoAllaData(prodottoId, data) {
    return all(
      `SELECT id, quantita_iniziale, quantita_rimanente, data_carico, data_registrazione
       FROM lotti
       WHERE prodotto_id = ? AND data_carico <= ?
       ORDER BY data_carico ASC, data_registrazione ASC`,
      [prodottoId, data],
    );
  },

  // Tutti i lotti del prodotto, dal più recente (per delete scarico)
  lottiProdottoRecentiPrima(prodottoId) {
    return all(
      `SELECT id, quantita_iniziale, quantita_rimanente
       FROM lotti WHERE prodotto_id = ?
       ORDER BY data_registrazione DESC`,
      [prodottoId],
    );
  },

  lottoPerDatiId(datiId) {
    return get("SELECT * FROM lotti WHERE dati_id = ?", [datiId]);
  },

  lottoCaricoPerEliminazione(datiId, prodottoId) {
    return get(
      `SELECT id, quantita_rimanente, quantita_iniziale
       FROM lotti WHERE dati_id = ? AND prodotto_id = ? LIMIT 1`,
      [datiId, prodottoId],
    );
  },

  // ---- Scrittura ----
  inserisciMovimento(m) {
    return run(
      `INSERT INTO dati (
        prodotto_id, tipo, quantita, prezzo, prezzo_totale_movimento,
        data_movimento, data_registrazione, fattura_doc, fornitore_cliente_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        m.prodotto_id, m.tipo, m.quantita, m.prezzo, m.prezzo_totale_movimento,
        m.data_movimento, m.data_registrazione, m.fattura_doc, m.fornitore_cliente_id,
      ],
    );
  },

  inserisciLotto(l) {
    return run(
      `INSERT INTO lotti (
        prodotto_id, dati_id, quantita_iniziale, quantita_rimanente,
        prezzo, data_carico, data_registrazione, fattura_doc, fornitore
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        l.prodotto_id, l.dati_id, l.quantita_iniziale, l.quantita_rimanente,
        l.prezzo, l.data_carico, l.data_registrazione, l.fattura_doc, l.fornitore,
      ],
    );
  },

  aggiornaQuantitaLotto(id, nuovaQuantita) {
    return run("UPDATE lotti SET quantita_rimanente = ? WHERE id = ?", [
      nuovaQuantita,
      id,
    ]);
  },

  aggiornaMovimentoCarico(id, m) {
    return run(
      `UPDATE dati SET quantita = ?, prezzo = ?, prezzo_totale_movimento = ?,
       data_movimento = ?, fattura_doc = ?, fornitore_cliente_id = ? WHERE id = ?`,
      [m.quantita, m.prezzo, m.prezzo_totale_movimento, m.data_movimento, m.fattura_doc, m.fornitore, id],
    );
  },

  aggiornaLottoCarico(id, l) {
    return run(
      `UPDATE lotti SET quantita_iniziale = ?, quantita_rimanente = ?, prezzo = ?,
       data_carico = ?, fattura_doc = ?, fornitore = ? WHERE id = ?`,
      [l.quantita_iniziale, l.quantita_rimanente, l.prezzo, l.data_carico, l.fattura_doc, l.fornitore, id],
    );
  },

  aggiornaMovimentoScarico(id, m) {
    return run(
      `UPDATE dati SET quantita = ?, prezzo_totale_movimento = ?,
       data_movimento = ?, fattura_doc = ? WHERE id = ?`,
      [m.quantita, m.prezzo_totale_movimento, m.data_movimento, m.fattura_doc, id],
    );
  },

  eliminaLotto(id) {
    return run("DELETE FROM lotti WHERE id = ?", [id]);
  },

  eliminaMovimento(id) {
    return run("DELETE FROM dati WHERE id = ?", [id]);
  },
};

module.exports = datiRepository;
