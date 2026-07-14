// Schema del database e creazione dell'utente Admin al primo avvio
const bcrypt = require("bcrypt");
const { db, dbGet, dbRun } = require("./database");

const TABELLE = [
  `CREATE TABLE IF NOT EXISTS marche (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT UNIQUE NOT NULL,
    data_creazione TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS prodotti (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT UNIQUE NOT NULL,
    marca_id INTEGER,
    descrizione TEXT,
    data_creazione TEXT NOT NULL,
    FOREIGN KEY(marca_id) REFERENCES marche(id)
  )`,
  `CREATE TABLE IF NOT EXISTS dati (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    prodotto_id INTEGER NOT NULL,
    tipo TEXT CHECK(tipo IN ('carico', 'scarico')) NOT NULL,
    quantita REAL NOT NULL CHECK(quantita > 0),
    prezzo REAL,
    prezzo_totale_movimento REAL,
    data_movimento TEXT NOT NULL,
    data_registrazione TEXT NOT NULL,
    fattura_doc TEXT,
    fornitore_cliente_id TEXT,
    FOREIGN KEY(prodotto_id) REFERENCES prodotti(id)
  )`,
  `CREATE TABLE IF NOT EXISTS lotti (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    prodotto_id INTEGER NOT NULL,
    quantita_iniziale REAL NOT NULL CHECK(quantita_iniziale > 0),
    quantita_rimanente REAL NOT NULL CHECK(quantita_rimanente >= 0),
    prezzo REAL NOT NULL,
    data_carico TEXT NOT NULL,
    data_registrazione TEXT NOT NULL,
    fattura_doc TEXT,
    fornitore TEXT,
    dati_id INTEGER,
    FOREIGN KEY(prodotto_id) REFERENCES prodotti(id),
    FOREIGN KEY(dati_id) REFERENCES dati(id)
  )`,
  `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    createdat TEXT NOT NULL
  )`,
];

async function initDatabase() {
  for (const sql of TABELLE) {
    await dbRun(sql);
  }
  await creaAdminPredefinito();
}

async function creaAdminPredefinito() {
  const row = await dbGet("SELECT COUNT(*) AS count FROM users");
  if (row && row.count === 0) {
    const hashedPassword = await bcrypt.hash("Admin123!", 10);
    await dbRun(
      "INSERT INTO users (username, password, createdat) VALUES (?, ?, ?)",
      ["Admin", hashedPassword, new Date().toISOString()],
    );
    console.log(
      "✅ Utente Admin creato (username: Admin, password: Admin123!)",
    );
  }
}

module.exports = { db, initDatabase };
