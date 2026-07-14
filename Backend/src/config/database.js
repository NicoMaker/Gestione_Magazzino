// Connessione SQLite + helper promisificati (usati da tutti i repository).
// Il resto del backend non chiama mai db.run/get/all direttamente.
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");

const dbDir = path.join(__dirname, "..", "..", "db");
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const dbPath = path.join(dbDir, "magazzino.db");
const db = new sqlite3.Database(dbPath);

function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
  });
}

function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
  });
}

// Risolve con { lastID, changes }
function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

// Esegue `work` dentro BEGIN/COMMIT; fa ROLLBACK e rilancia in caso di errore.
// Serializza le operazioni per evitare interleaving con altre transazioni.
function transaction(work) {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run("BEGIN TRANSACTION;", async (beginErr) => {
        if (beginErr) return reject(beginErr);
        try {
          const result = await work();
          db.run("COMMIT;", (commitErr) =>
            commitErr ? reject(commitErr) : resolve(result),
          );
        } catch (err) {
          db.run("ROLLBACK;", () => reject(err));
        }
      });
    });
  });
}

module.exports = { db, dbGet, dbAll, dbRun, transaction };
