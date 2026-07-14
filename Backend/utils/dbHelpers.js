// utils/dbHelpers.js — promisifica sqlite3 e fornisce un helper di transazione
const { db } = require("../db/init");

function get(sql, params = []) {
  return new Promise((resolve, reject) =>
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row))),
  );
}

function all(sql, params = []) {
  return new Promise((resolve, reject) =>
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows))),
  );
}

function run(sql, params = []) {
  return new Promise((resolve, reject) =>
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve({ lastID: this.lastID, changes: this.changes });
    }),
  );
}

// Esegue `work` dentro BEGIN/COMMIT; su errore fa ROLLBACK e rilancia.
async function transaction(work) {
  await run("BEGIN TRANSACTION;");
  try {
    const result = await work();
    await run("COMMIT;");
    return result;
  } catch (err) {
    try {
      await run("ROLLBACK;");
    } catch (e) {
      /* ignora errori di rollback */
    }
    throw err;
  }
}

module.exports = { db, get, all, run, transaction };
