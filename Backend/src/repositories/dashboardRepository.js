// Repository dashboard: sole query di lettura aggregata (nessuna scrittura)
const { dbGet, dbAll } = require("../config/database");

const cont = async (sql, params = []) => (await dbGet(sql, params)).n || 0;

const dashboardRepository = {
  conteggi() {
    return Promise.all([
      cont("SELECT COUNT(*) AS n FROM marche"),
      cont("SELECT COUNT(*) AS n FROM prodotti"),
      cont("SELECT COUNT(*) AS n FROM dati"),
      cont("SELECT COUNT(*) AS n FROM users"),
    ]).then(([marche, prodotti, movimenti, utenti]) => ({
      marche,
      prodotti,
      movimenti,
      utenti,
    }));
  },

  valoreEPezzi() {
    return dbGet(
      `SELECT COALESCE(SUM(quantita_rimanente * prezzo), 0) AS valore,
              COALESCE(SUM(quantita_rimanente), 0) AS pezzi
       FROM lotti WHERE quantita_rimanente > 0`,
    );
  },

  movimentiUltimiGiorni(giorni) {
    return cont(
      `SELECT COUNT(*) AS n FROM dati WHERE data_movimento >= date('now', ?)`,
      [`-${giorni} day`],
    );
  },

  // Prodotti a giacenza zero che hanno già avuto almeno un movimento
  prodottiEsauriti() {
    return dbAll(
      `SELECT p.id, p.nome
       FROM prodotti p
       LEFT JOIN lotti l ON l.prodotto_id = p.id
       WHERE EXISTS (SELECT 1 FROM dati d WHERE d.prodotto_id = p.id)
       GROUP BY p.id, p.nome
       HAVING COALESCE(SUM(l.quantita_rimanente), 0) = 0
       ORDER BY p.nome COLLATE NOCASE`,
    );
  },

  prodottiSenzaMovimenti() {
    return dbAll(
      `SELECT p.id, p.nome FROM prodotti p
       WHERE NOT EXISTS (SELECT 1 FROM dati d WHERE d.prodotto_id = p.id)
       ORDER BY p.nome COLLATE NOCASE`,
    );
  },

  prodottiSenzaMarca() {
    return dbAll(
      `SELECT id, nome FROM prodotti WHERE marca_id IS NULL
       ORDER BY nome COLLATE NOCASE`,
    );
  },

  marcheSenzaProdotti() {
    return dbAll(
      `SELECT m.id, m.nome FROM marche m
       WHERE NOT EXISTS (SELECT 1 FROM prodotti p WHERE p.marca_id = m.id)
       ORDER BY m.nome COLLATE NOCASE`,
    );
  },

  // Prodotti con almeno un lotto ancora in magazzino da più di `giorni` giorni
  merceFerma(giorni) {
    return dbAll(
      `SELECT p.id, p.nome
       FROM lotti l JOIN prodotti p ON p.id = l.prodotto_id
       WHERE l.quantita_rimanente > 0 AND l.data_carico <= date('now', ?)
       GROUP BY p.id, p.nome
       ORDER BY MIN(l.data_carico) ASC`,
      [`-${giorni} day`],
    );
  },

  andamentoMensile(dataInizio) {
    return dbAll(
      `SELECT substr(data_movimento, 1, 7) AS mese, tipo,
              COUNT(*) AS movimenti, COALESCE(SUM(quantita), 0) AS pezzi
       FROM dati WHERE data_movimento >= ?
       GROUP BY mese, tipo`,
      [dataInizio],
    );
  },

  ultimiMovimenti(limite) {
    return dbAll(
      `SELECT d.id, d.tipo, d.quantita, d.data_movimento, p.nome AS prodotto_nome
       FROM dati d LEFT JOIN prodotti p ON p.id = d.prodotto_id
       ORDER BY d.data_movimento DESC, d.id DESC LIMIT ?`,
      [limite],
    );
  },

  topValore(limite) {
    return dbAll(
      `SELECT p.id, p.nome,
              SUM(l.quantita_rimanente) AS pezzi,
              SUM(l.quantita_rimanente * l.prezzo) AS valore
       FROM lotti l JOIN prodotti p ON p.id = l.prodotto_id
       WHERE l.quantita_rimanente > 0
       GROUP BY p.id, p.nome
       ORDER BY valore DESC LIMIT ?`,
      [limite],
    );
  },
};

module.exports = dashboardRepository;
