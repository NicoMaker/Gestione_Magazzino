// Repository magazzino: query per valore, riepilogo e storico giacenza
const { dbGet, dbAll } = require("../config/database");

const magazzinoRepository = {
  async valoreMagazzino() {
    const row = await dbGet(
      `SELECT COALESCE(SUM(quantita_rimanente * prezzo), 0) as valore_totale
       FROM lotti WHERE quantita_rimanente > 0`,
    );
    return row.valore_totale;
  },

  riepilogoProdotti() {
    return dbAll(`
      SELECT p.id, p.nome, m.nome as marca_nome, p.descrizione,
             COALESCE(SUM(l.quantita_rimanente), 0) as giacenza,
             COALESCE(SUM(l.quantita_rimanente * l.prezzo), 0) as valore_totale
      FROM prodotti p
      LEFT JOIN marche m ON p.marca_id = m.id
      LEFT JOIN lotti l ON p.id = l.prodotto_id AND l.quantita_rimanente > 0
      GROUP BY p.id, p.nome, m.nome, p.descrizione
      HAVING giacenza >= 0
      ORDER BY p.nome COLLATE NOCASE, p.nome
    `);
  },

  lottiAttivi() {
    return dbAll(`
      SELECT l.prodotto_id, l.id, l.quantita_rimanente, l.prezzo,
             l.data_carico, l.fattura_doc, l.fornitore
      FROM lotti l
      WHERE l.quantita_rimanente > 0
      ORDER BY l.data_carico DESC, l.id DESC
    `);
  },

  lottiProdotto(prodottoId) {
    return dbAll(
      `SELECT id, quantita_rimanente, prezzo, data_carico, fattura_doc, fornitore
       FROM lotti WHERE prodotto_id = ? AND quantita_rimanente > 0
       ORDER BY data_carico DESC, id DESC`,
      [prodottoId],
    );
  },

  tuttiProdottiConMarca() {
    return dbAll(`
      SELECT p.id, p.nome, m.nome as marca_nome, p.descrizione
      FROM prodotti p LEFT JOIN marche m ON p.marca_id = m.id
      ORDER BY p.nome COLLATE NOCASE, p.nome
    `);
  },

  // Movimenti (lotti caricati + scarichi) fino a una data, per lo storico FIFO
  movimentiFinoAData(prodottoId, data) {
    return dbAll(
      `SELECT 'lotto' as tipo_movimento, id, quantita_iniziale as quantita, prezzo,
              data_carico, fattura_doc, fornitore
       FROM lotti WHERE prodotto_id = ? AND data_carico <= ?
       UNION ALL
       SELECT 'scarico' as tipo_movimento, id, quantita, NULL as prezzo,
              data_movimento as data_carico, NULL as fattura_doc, NULL as fornitore
       FROM dati WHERE prodotto_id = ? AND tipo = 'scarico' AND data_movimento <= ?
       ORDER BY data_carico ASC, id ASC`,
      [prodottoId, data, prodottoId, data],
    );
  },
};

module.exports = magazzinoRepository;
