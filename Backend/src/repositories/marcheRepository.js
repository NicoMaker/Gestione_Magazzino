// Repository marche
const { dbGet, dbAll, dbRun } = require("../config/database");

const marcheRepository = {
  listaConConteggio() {
    return dbAll(`
      SELECT m.id, m.nome, m.data_creazione, COUNT(p.id) as prodotti_count
      FROM marche m
      LEFT JOIN prodotti p ON m.id = p.marca_id
      GROUP BY m.id, m.nome, m.data_creazione
      ORDER BY m.nome COLLATE NOCASE, m.nome
    `);
  },

  crea(nome, data_creazione) {
    return dbRun("INSERT INTO marche (nome, data_creazione) VALUES (?, ?)", [
      nome,
      data_creazione,
    ]);
  },

  aggiorna(id, nome) {
    return dbRun("UPDATE marche SET nome = ? WHERE id = ?", [nome, id]);
  },

  elimina(id) {
    return dbRun("DELETE FROM marche WHERE id = ?", [id]);
  },

  async contaProdotti(id) {
    const row = await dbGet(
      "SELECT COUNT(*) as count FROM prodotti WHERE marca_id = ?",
      [id],
    );
    return row.count || 0;
  },
};

module.exports = marcheRepository;
