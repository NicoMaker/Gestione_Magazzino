// Repository prodotti
const { dbGet, dbAll, dbRun } = require("../config/database");

const prodottiRepository = {
  listaConGiacenza() {
    return dbAll(`
      SELECT p.id, p.nome, p.marca_id, m.nome as marca_nome, p.descrizione,
             p.data_creazione,
             COALESCE(SUM(l.quantita_rimanente), 0) as giacenza
      FROM prodotti p
      LEFT JOIN marche m ON p.marca_id = m.id
      LEFT JOIN lotti l ON p.id = l.prodotto_id
      GROUP BY p.id, p.nome, p.marca_id, m.nome, p.descrizione, p.data_creazione
      ORDER BY p.nome COLLATE NOCASE, p.nome
    `);
  },

  trovaConMarca(id) {
    return dbGet(
      `SELECT p.id, p.nome, p.marca_id, m.nome as marca_nome, p.descrizione, p.data_creazione
       FROM prodotti p LEFT JOIN marche m ON p.marca_id = m.id WHERE p.id = ?`,
      [id],
    );
  },

  crea(nome, marca_id, descrizione, data_creazione) {
    return dbRun(
      "INSERT INTO prodotti (nome, marca_id, descrizione, data_creazione) VALUES (?, ?, ?, ?)",
      [nome, marca_id, descrizione, data_creazione],
    );
  },

  aggiorna(id, nome, marca_id, descrizione) {
    return dbRun(
      "UPDATE prodotti SET nome = ?, marca_id = ?, descrizione = ? WHERE id = ?",
      [nome, marca_id, descrizione, id],
    );
  },

  elimina(id) {
    return dbRun("DELETE FROM prodotti WHERE id = ?", [id]);
  },

  eliminaLottiVuoti(prodottoId) {
    return dbRun("DELETE FROM lotti WHERE prodotto_id = ?", [prodottoId]);
  },

  async giacenza(prodottoId) {
    const row = await dbGet(
      "SELECT COALESCE(SUM(quantita_rimanente), 0) as giacenza FROM lotti WHERE prodotto_id = ?",
      [prodottoId],
    );
    return row.giacenza;
  },

  async contaMovimenti(prodottoId) {
    const row = await dbGet(
      "SELECT COUNT(*) as count FROM dati WHERE prodotto_id = ?",
      [prodottoId],
    );
    return row.count;
  },
};

module.exports = prodottiRepository;
