// routes/prodotti.js

const express = require("express");
const router = express.Router();
const { db } = require("../db/init");

// GET - Lista tutti i prodotti con giacenza
router.get("/", (req, res) => {
  const query = `
    SELECT 
      p.id, 
      p.nome,
      COALESCE(SUM(l.quantita_rimanente), 0) as giacenza
    FROM prodotti p
    LEFT JOIN lotti l ON p.id = l.prodotto_id
    GROUP BY p.id, p.nome
    ORDER BY p.nome
  `;
  db.all(query, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// POST - Crea nuovo prodotto
router.post("/", (req, res) => {
  const { nome } = req.body;
  if (!nome || !nome.trim()) {
    return res.status(400).json({ error: "Nome prodotto obbligatorio" });
  }

  // Verifica unicità (SQLite gestisce già l'errore UNIQUE)
  db.run(
    "INSERT INTO prodotti (nome) VALUES (?)",
    [nome.trim()],
    function (err) {
      if (err) {
        if (err.message.includes("UNIQUE")) {
          return res.status(400).json({ error: "Prodotto già esistente" });
        }
        return res.status(500).json({ error: err.message });
      }
      res.json({ id: this.lastID, nome: nome.trim(), giacenza: 0 });
    }
  );
});

// PUT - Aggiorna prodotto
router.put("/:id", (req, res) => {
  const { id } = req.params;
  const { nome } = req.body;

  if (!nome || !nome.trim()) {
    return res.status(400).json({ error: "Nome prodotto obbligatorio" });
  }

  db.run("UPDATE prodotti SET nome = ? WHERE id = ?", [nome.trim(), id], function (err) {
    if (err) {
      if (err.message.includes("UNIQUE")) {
        return res.status(400).json({ error: "Prodotto già esistente" });
      }
      return res.status(500).json({ error: err.message });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: "Prodotto non trovato" });
    }

    res.json({ success: true, nome: nome.trim() });
  });
});

// DELETE - Elimina prodotto
router.delete("/:id", (req, res) => {
  const { id } = req.params;

  db.serialize(() => {
    db.run("BEGIN TRANSACTION;");

    // 1. Controlla la giacenza
    db.get(
      "SELECT COALESCE(SUM(quantita_rimanente), 0) as giacenza FROM lotti WHERE prodotto_id = ?",
      [id],
      (err, row) => {
        if (err) {
          db.run("ROLLBACK;");
          return res.status(500).json({ error: err.message });
        }

        if (row.giacenza > 0) {
          db.run("ROLLBACK;");
          return res.status(400).json({
            error: `Impossibile eliminare: giacenza residua di ${row.giacenza} unità.`,
          });
        }

        // 2. Elimina i lotti (se giacenza è 0, elimina anche i lotti totalmente consumati)
        db.run("DELETE FROM lotti WHERE prodotto_id = ?", [id], (err) => {
          if (err) {
            db.run("ROLLBACK;");
            return res.status(500).json({
              error: `Errore durante l'eliminazione dei lotti: ${err.message}`,
            });
          }

          // 3. Elimina i movimenti (dati)
          db.run("DELETE FROM dati WHERE prodotto_id = ?", [id], (err) => {
            if (err) {
              db.run("ROLLBACK;");
              return res.status(500).json({
                error: `Errore durante l'eliminazione dei movimenti: ${err.message}`,
              });
            }

            // 4. Elimina il prodotto
            db.run("DELETE FROM prodotti WHERE id = ?", [id], function (err) {
              if (err) {
                db.run("ROLLBACK;");
                return res.status(500).json({
                  error: `Errore durante l'eliminazione del prodotto: ${err.message}`,
                });
              }

              if (this.changes === 0) {
                db.run("ROLLBACK;");
                return res.status(404).json({ error: "Prodotto non trovato" });
              }

              db.run("COMMIT;", (commitErr) => {
                if (commitErr) {
                  return res.status(500).json({
                    error: `Errore durante il commit: ${commitErr.message}`,
                  });
                }
                res.json({
                  success: true,
                  message: "Prodotto, lotti e movimenti associati eliminati con successo.",
                });
              });
            });
          });
        });
      }
    );
  });
});

module.exports = router;