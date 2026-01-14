// routes/marche.js - VERSIONE AGGIORNATA CON CONTEGGIO PRODOTTI

const express = require("express");
const router = express.Router();
const { db } = require("../db/init");

// ==================== GET - Lista tutte le marche con conteggio prodotti ====================
router.get("/", (req, res) => {
  // 🎯 QUERY MODIFICATA: Aggiunge il conteggio dei prodotti relazionati
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

    // 📊 LOG per debug (opzionale, rimuovi in produzione)
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

      // Emetti evento Socket.IO per aggiornamento real-time
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
        prodotti_count: 0  // 🆕 Nuova marca ha 0 prodotti
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

      // Emetti evento Socket.IO per aggiornamento real-time
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
// 🎯 VERSIONE MIGLIORATA: Permette eliminazione ma avvisa se ci sono prodotti
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

      // ⚠️ OPZIONE 1: BLOCCA ELIMINAZIONE SE CI SONO PRODOTTI (STRICT)
      /*
      if (prodottiCount > 0) {
        return res.status(400).json({
          error: prodottiCount === 1
            ? `Impossibile eliminare: c'è 1 prodotto collegato a questa marca.`
            : `Impossibile eliminare: ci sono ${prodottiCount} prodotti collegati a questa marca.`
        });
      }
      */

      // ✅ OPZIONE 2: PERMETTI ELIMINAZIONE, SETTA marca_id = NULL NEI PRODOTTI
      // (Questa è la soluzione che hai implementato nel frontend)
      
      db.serialize(() => {
        db.run("BEGIN TRANSACTION");

        // 2️⃣ Se ci sono prodotti, rimuovi il riferimento alla marca
        if (prodottiCount > 0) {
          db.run(
            "UPDATE prodotti SET marca_id = NULL WHERE marca_id = ?",
            [id],
            (err2) => {
              if (err2) {
                db.run("ROLLBACK");
                console.error('❌ Errore aggiornamento prodotti:', err2);
                return res.status(500).json({ error: err2.message });
              }

              console.log(`📝 ${prodottiCount} prodotti scollegati dalla marca ID ${id}`);

              // 3️⃣ Elimina la marca
              eliminaMarca();
            }
          );
        } else {
          // Nessun prodotto, elimina direttamente
          eliminaMarca();
        }

        // 🗑️ Funzione helper per eliminare la marca
        function eliminaMarca() {
          db.run("DELETE FROM marche WHERE id = ?", [id], function (err3) {
            if (err3) {
              db.run("ROLLBACK");
              console.error('❌ Errore eliminazione marca:', err3);
              return res.status(500).json({ error: err3.message });
            }

            if (this.changes === 0) {
              db.run("ROLLBACK");
              return res.status(404).json({ error: "Marca non trovata" });
            }

            db.run("COMMIT");

            // Emetti evento Socket.IO per aggiornamento real-time
            const io = req.app.get("io");
            if (io) {
              io.emit("marca_eliminata", { id });
              io.emit("marche_aggiornate");
              
              // Se ci sono prodotti modificati, aggiorna anche la lista prodotti
              if (prodottiCount > 0) {
                io.emit("prodotti_aggiornati");
              }
            }

            console.log(`✅ Marca eliminata: ID ${id} (${prodottiCount} prodotti scollegati)`);

            res.json({
              success: true,
              message: prodottiCount > 0 
                ? `Marca eliminata con successo. ${prodottiCount} prodotto/i scollegato/i.`
                : "Marca eliminata con successo",
              prodotti_scollegati: prodottiCount
            });
          });
        }
      });
    }
  );
});

module.exports = router;