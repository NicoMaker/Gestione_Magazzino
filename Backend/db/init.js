// db/init.js

const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcrypt");
const path = require("path");
const fs = require("fs");

// Crea la cartella database se non esiste
const dbDir = path.join(__dirname);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Crea il database nella cartella database
const dbPath = path.join(dbDir, "magazzino.db");
const db = new sqlite3.Database(dbPath);

async function initDatabase() {
  db.serialize(async () => {
    // Tabella prodotti
    db.run(`
      CREATE TABLE IF NOT EXISTS prodotti (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT UNIQUE NOT NULL
      )
    `);

    // Tabella dati (movimenti)
    db.run(`
      CREATE TABLE IF NOT EXISTS dati (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        prodotto_id INTEGER NOT NULL,
        tipo TEXT CHECK(tipo IN ('carico', 'scarico')) NOT NULL,
        quantita INTEGER NOT NULL CHECK(quantita > 0),
        prezzo REAL,
        prezzo_totale_movimento REAL,
        data_movimento TEXT NOT NULL,
        data_registrazione TEXT NOT NULL,
        fattura_doc TEXT,
        fornitore_cliente_id TEXT,
        FOREIGN KEY(prodotto_id) REFERENCES prodotti(id)
      )
    `);

    // Tabella lotti (per la gestione FIFO)
    db.run(`
      CREATE TABLE IF NOT EXISTS lotti (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        prodotto_id INTEGER NOT NULL,
        quantita_iniziale INTEGER NOT NULL CHECK(quantita_iniziale > 0),
        quantita_rimanente INTEGER NOT NULL CHECK(quantita_rimanente >= 0),
        prezzo REAL NOT NULL,
        data_carico TEXT NOT NULL,
        data_registrazione TEXT NOT NULL,
        fattura_doc TEXT,
        fornitore_cliente_id TEXT,
        dati_id INTEGER,
        FOREIGN KEY(prodotto_id) REFERENCES prodotti(id),
        FOREIGN KEY(dati_id) REFERENCES dati(id)
      )
    `);

    // Tabella utenti
    db.run(
      `
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        createdat TEXT NOT NULL
      )
    `,
      async (err) => {
        if (err) {
          console.error("Errore creazione tabella users:", err);
          return;
        }

        // Verifica se esiste già l'utente Admin
        db.get(
          "SELECT * FROM users WHERE username = ?",
          ["Admin"],
          async (err2, row) => {
            if (err2) {
              console.error("Errore verifica utente Admin:", err2);
              return;
            }

            // Se non esiste, crea l'utente Admin con password hashata
            if (!row) {
              try {
                const hashedPassword = await bcrypt.hash("Admin123!", 10);
                const createdAt = new Date().toISOString();
                db.run(
                  "INSERT INTO users (username, password, createdat) VALUES (?, ?, ?)",
                  ["Admin", hashedPassword, createdAt],
                  (err3) => {
                    if (err3) {
                      console.error("Errore creazione utente Admin:", err3);
                    } else {
                      console.log("✅ Utente Admin creato con successo");
                    }
                  }
                );
              } catch (error) {
                console.error("Errore hashing password:", error);
              }
            }
          }
        );
      }
    );
  });
}

module.exports = { db, initDatabase };