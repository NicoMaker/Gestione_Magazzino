// routes/marche.js

const express = require("express");
const router = express.Router();
const { db } = require("../db/init");

// GET - Lista tutte le marche
router.get("/", (req, res) => {
  const query = `
    SELECT id, nome, data_creazione
    FROM marche
    ORDER BY nome ASC
  `;

  db.all(query, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// POST - Crea nuova marca
router.post("/", (req, res) => {
  const { nome } = req.body;

  if (!nome || !nome.trim()) {
    return res.status(400).json({ error: "Nome marca obbligatorio" });
  }

  const data_creazione = new Date().toISOString();

  db.run(
    "INSERT INTO marche (nome, data_creazione) VALUES (?, ?)",
    [nome.trim(), data_creazione],
    function (err) {
      if (err) {
        if (err.message.includes("UNIQUE")) {
          return res.status(400).json({ error: "Marca già esistente" });
        }
        return res.status(500).json({ error: err.message });
      }
      // Emetti evento Socket.IO per aggiornamento real-time
      const io = req.app.get("io");
      if (io) {
        io.emit("marca_aggiunta");
        io.emit("marche_aggiornate");
      }
      res.json({
        id: this.lastID,
        nome: nome.trim(),
        data_creazione,
      });
    }
  );
});

// PUT - Aggiorna marca
router.put("/:id", (req, res) => {
  const { id } = req.params;
  const { nome } = req.body;

  if (!nome || !nome.trim()) {
    return res.status(400).json({ error: "Nome marca obbligatorio" });
  }

  db.run(
    "UPDATE marche SET nome = ? WHERE id = ?",
    [nome.trim(), id],
    function (err) {
      if (err) {
        if (err.message.includes("UNIQUE")) {
          return res.status(400).json({ error: "Marca già esistente" });
        }
        return res.status(500).json({ error: err.message });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: "Marca non trovata" });
      }

      // Emetti evento Socket.IO per aggiornamento real-time
      const io = req.app.get("io");
      if (io) {
        io.emit("marca_modificata", { id });
        io.emit("marche_aggiornate");
        io.emit("prodotti_aggiornati");
      }

      res.json({ success: true, nome: nome.trim() });
    }
  );
});

// DELETE - Elimina marca
router.delete("/:id", (req, res) => {
  const { id } = req.params;

  // Verifica se ci sono prodotti collegati a questa marca
  db.get(
    "SELECT COUNT(*) as count FROM prodotti WHERE marca_id = ?",
    [id],
    (err, row) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (row.count > 0) {
        return res.status(400).json({
          error: `Impossibile eliminare: ci sono ${row.count} prodott${
            row.count === 1 ? "o" : "i"
          } collegat${row.count === 1 ? "o" : "i"} a questa marca.`,
        });
      }

      // Elimina la marca
      db.run("DELETE FROM marche WHERE id = ?", [id], function (err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        if (this.changes === 0) {
          return res.status(404).json({ error: "Marca non trovata" });
        }

        // Emetti evento Socket.IO per aggiornamento real-time
        const io = req.app.get("io");
        if (io) {
          io.emit("marca_eliminata", { id });
          io.emit("marche_aggiornate");
          io.emit("prodotti_aggiornati");
        }

        res.json({
          success: true,
          message: "Marca eliminata con successo",
        });
      });
    }
  );
});

module.exports = router;
