// routes/prodotti.js - VERSIONE COMPLETA CON FORMATTAZIONE DECIMALI

const express = require("express");
const router = express.Router();
const { db } = require("../db/init");

// 🎯 FUNZIONE HELPER PER FORMATTARE I DECIMALI A 2 CIFRE
function formatDecimal(value) {
  if (value === null || value === undefined) return null;
  const num = parseFloat(value);
  if (isNaN(num)) return null;
  return parseFloat(num.toFixed(2));
}

// GET - Lista tutti i prodotti con giacenza, marca e descrizione
router.get("/", (req, res) => {
  const query = `
    SELECT 
      p.id, 
      p.nome,
      p.marca_id,
      m.nome as marca_nome,
      p.descrizione,
      p.data_creazione,
      COALESCE(SUM(l.quantita_rimanente), 0) as giacenza
    FROM prodotti p
    LEFT JOIN marche m ON p.marca_id = m.id
    LEFT JOIN lotti l ON p.id = l.prodotto_id
    GROUP BY p.id, p.nome, p.marca_id, m.nome, p.descrizione, p.data_creazione
    ORDER BY p.nome
  `;

  db.all(query, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });

    // 🎯 FORMATTA GIACENZA A 2 DECIMALI
    const formattedRows = rows.map((row) => ({
      ...row,
      giacenza: formatDecimal(row.giacenza),
    }));

    res.json(formattedRows);
  });
});

// POST - Crea nuovo prodotto
router.post("/", (req, res) => {
  const { nome, marca_id, descrizione } = req.body;

  if (!nome || !nome.trim()) {
    return res.status(400).json({ error: "Nome prodotto obbligatorio" });
  }

  const data_creazione = new Date().toISOString();

  db.run(
    "INSERT INTO prodotti (nome, marca_id, descrizione, data_creazione) VALUES (?, ?, ?, ?)",
    [nome.trim(), marca_id || null, descrizione || null, data_creazione],
    function (err) {
      if (err) {
        if (err.message.includes("UNIQUE")) {
          return res.status(400).json({ error: "Prodotto già esistente" });
        }
        return res.status(500).json({ error: err.message });
      }

      // Recupera i dati completi del prodotto appena creato
      db.get(
        `SELECT p.id, p.nome, p.marca_id, m.nome as marca_nome, p.descrizione, p.data_creazione
         FROM prodotti p
         LEFT JOIN marche m ON p.marca_id = m.id
         WHERE p.id = ?`,
        [this.lastID],
        (err, row) => {
          if (err) return res.status(500).json({ error: err.message });
          // Emetti evento Socket.IO per aggiornamento real-time
          const io = req.app.get("io");
          if (io) {
            io.emit("prodotto_aggiunto");
            io.emit("prodotti_aggiornati");
          }
          res.json({ ...row, giacenza: formatDecimal(0) }); // 🎯 Giacenza 0.00
        }
      );
    }
  );
});

// PUT - Aggiorna prodotto
router.put("/:id", (req, res) => {
  const { id } = req.params;
  const { nome, marca_id, descrizione } = req.body;

  if (!nome || !nome.trim()) {
    return res.status(400).json({ error: "Nome prodotto obbligatorio" });
  }

  db.run(
    "UPDATE prodotti SET nome = ?, marca_id = ?, descrizione = ? WHERE id = ?",
    [nome.trim(), marca_id || null, descrizione || null, id],
    function (err) {
      if (err) {
        if (err.message.includes("UNIQUE")) {
          return res.status(400).json({ error: "Prodotto già esistente" });
        }
        return res.status(500).json({ error: err.message });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: "Prodotto non trovato" });
      }

      // Emetti evento Socket.IO per aggiornamento real-time
      const io = req.app.get("io");
      if (io) {
        io.emit("prodotto_modificato", { id });
        io.emit("prodotti_aggiornati");
        io.emit("magazzino_aggiornato");
      }

      res.json({ success: true });
    }
  );
});

// DELETE - Elimina prodotto
router.delete("/:id", (req, res) => {
  const { id } = req.params;

  db.serialize(() => {
    db.run("BEGIN TRANSACTION");

    // 1️⃣ Verifica giacenza
    db.get(
      "SELECT COALESCE(SUM(quantita_rimanente), 0) as giacenza FROM lotti WHERE prodotto_id = ?",
      [id],
      (err, row) => {
        if (err) {
          db.run("ROLLBACK");
          return res.status(500).json({ error: err.message });
        }

        const giacenza = formatDecimal(row.giacenza);

        // Format number: show decimals only if necessary
        const giacenzaFormattata = (
          giacenza % 1 === 0 ? giacenza.toFixed(0) : giacenza.toFixed(2)
        ).replace(".", ",");

        // Use singular/plural based on count
        const pezzoLabel = giacenza === 1 ? "pezzo" : "pezzi";

        if (giacenza > 0) {
          db.run("ROLLBACK");
          return res.status(400).json({
            error: `Impossibile eliminare: giacenza residua di ${giacenzaFormattata} ${pezzoLabel}.`,
          });
        }

        // 2️⃣ Verifica se ci sono movimenti collegati
        db.get(
          "SELECT COUNT(*) as count FROM dati WHERE prodotto_id = ?",
          [id],
          (err2, row2) => {
            if (err2) {
              db.run("ROLLBACK");
              return res.status(500).json({ error: err2.message });
            }

            if (row2.count > 0) {
              db.run("ROLLBACK");
              return res.status(400).json({
                error: `Impossibile eliminare: esistono ${row2.count} movimenti collegati a questo prodotto.`,
              });
            }

            // 3️⃣ Elimina eventuali lotti vuoti
            db.run(
              "DELETE FROM lotti WHERE prodotto_id = ?",
              [id],
              (err3) => {
                if (err3) {
                  db.run("ROLLBACK");
                  return res.status(500).json({ error: err3.message });
                }

                // 4️⃣ Elimina il prodotto
                db.run(
                  "DELETE FROM prodotti WHERE id = ?",
                  [id],
                  function (err4) {
                    if (err4) {
                      db.run("ROLLBACK");
                      return res.status(500).json({ error: err4.message });
                    }

                    if (this.changes === 0) {
                      db.run("ROLLBACK");
                      return res.status(404).json({ error: "Prodotto non trovato" });
                    }

                    // ✅ Commit della transazione
                    db.run("COMMIT");

                    // Emetti evento Socket.IO per aggiornamento real-time
                    const io = req.app.get("io");
                    if (io) {
                      io.emit("prodotto_eliminato", { id });
                      io.emit("prodotti_aggiornati");
                    }

                    res.json({
                      success: true,
                      message: "Prodotto eliminato con successo",
                    });
                  }
                );
              }
            );
          }
        );
      }
    );
  });
});

module.exports = router;
