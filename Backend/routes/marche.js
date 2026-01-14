// routes/marche.js - VERSIONE CON BLOCCO ELIMINAZIONE SE CI SONO PRODOTTI

const express = require("express");
const router = express.Router();
const { db } = require("../db/init");

// ==================== GET - Lista tutte le marche con conteggio prodotti ====================
router.get("/", (req, res) => {
  const query = `
    SELECT 
      m.id, 
      m.nome, 
      m.data_creazione,
      COUNT(p.id) as prodotti_count
    FROM marche m
    LEFT JOIN prodotti p ON m.id = p.marca_id
    GROUP BY m.id, m.nome, m.data_creazione
    ORDER BY m.nome ASC
  `;

  db.all(query, (err, rows) => {
    if (err) {
      console.error('❌ Errore caricamento marche:', err);
      return res.status(500).json({ error: err.message });
    }

    console.log(`✅ ${rows.length} marche caricate con conteggio prodotti`);
    res.json(rows);
  });
});

// ==================== POST - Crea nuova marca ====================
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
        console.error('❌ Errore creazione marca:', err);
        return res.status(500).json({ error: err.message });
      }

      const io = req.app.get("io");
      if (io) {
        io.emit("marca_aggiunta");
        io.emit("marche_aggiornate");
      }

      console.log(`✅ Marca creata: "${nome.trim()}" (ID: ${this.lastID})`);

      res.json({
        id: this.lastID,
        nome: nome.trim(),
        data_creazione,
        prodotti_count: 0
      });
    }
  );
});

// ==================== PUT - Aggiorna marca ====================
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
        console.error('❌ Errore aggiornamento marca:', err);
        return res.status(500).json({ error: err.message });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: "Marca non trovata" });
      }

      const io = req.app.get("io");
      if (io) {
        io.emit("marca_modificata", { id });
        io.emit("marche_aggiornate");
        io.emit("prodotti_aggiornati");
      }

      console.log(`✅ Marca aggiornata: ID ${id} -> "${nome.trim()}"`);
      res.json({ success: true, nome: nome.trim() });
    }
  );
});

// ==================== DELETE - Elimina marca ====================
// 🚫 VERSIONE STRICT: BLOCCA L'ELIMINAZIONE SE CI SONO PRODOTTI COLLEGATI
router.delete("/:id", (req, res) => {
  const { id } = req.params;

  // 1️⃣ Conta i prodotti collegati a questa marca
  db.get(
    "SELECT COUNT(*) as count FROM prodotti WHERE marca_id = ?",
    [id],
    (err, row) => {
      if (err) {
        console.error('❌ Errore verifica prodotti:', err);
        return res.status(500).json({ error: err.message });
      }

      const prodottiCount = row.count || 0;

      // 🚫 BLOCCA L'ELIMINAZIONE SE CI SONO PRODOTTI
      if (prodottiCount > 0) {
        console.log(`⚠️ Tentativo di eliminare marca ID ${id} con ${prodottiCount} prodotti - BLOCCATO`);
        
        return res.status(400).json({
          error: prodottiCount === 1
            ? "Impossibile eliminare: c'è 1 prodotto collegato a questa marca."
            : `Impossibile eliminare: ci sono ${prodottiCount} prodotti collegati a questa marca.`,
          prodotti_count: prodottiCount
        });
      }

      // ✅ Nessun prodotto collegato, procedi con l'eliminazione
      db.run("DELETE FROM marche WHERE id = ?", [id], function (err2) {
        if (err2) {
          console.error('❌ Errore eliminazione marca:', err2);
          return res.status(500).json({ error: err2.message });
        }

        if (this.changes === 0) {
          return res.status(404).json({ error: "Marca non trovata" });
        }

        // Emetti evento Socket.IO per aggiornamento real-time
        const io = req.app.get("io");
        if (io) {
          io.emit("marca_eliminata", { id });
          io.emit("marche_aggiornate");
        }

        console.log(`✅ Marca eliminata: ID ${id}`);

        res.json({
          success: true,
          message: "Marca eliminata con successo"
        });
      });
    }
  );
});

module.exports = router;