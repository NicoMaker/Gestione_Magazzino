// routes/magazzino.js

const express = require("express");
const router = express.Router();
const { db } = require("../db/init");

// GET - Valore totale del magazzino (FIFO)
router.get("/valore-magazzino", (req, res) => {
  const query = `
    SELECT COALESCE(SUM(quantita_rimanente * prezzo), 0) as valore_totale
    FROM lotti
    WHERE quantita_rimanente > 0
  `;

  db.get(query, (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ valore_totale: row.valore_totale || 0 });
  });
});

// GET - Riepilogo per prodotto (Giacenza e Valore Totale FIFO)
router.get("/riepilogo", (req, res) => {
  const query = `
    SELECT 
      p.id,
      p.nome,
      COALESCE(SUM(l.quantita_rimanente), 0) as giacenza,
      COALESCE(SUM(l.quantita_rimanente * l.prezzo), 0) as valore_totale
    FROM prodotti p
    LEFT JOIN lotti l ON p.id = l.prodotto_id AND l.quantita_rimanente > 0
    GROUP BY p.id, p.nome
    HAVING giacenza >= 0
    ORDER BY p.nome
  `;

  db.all(query, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// NUOVA ROTTA: GET - Giacenza netta per prodotto fino a una certa data
router.get("/storico/giacenza", (req, res) => {
  const { data } = req.query; // data is YYYY-MM-DD
  
  if (!data) {
    return res.status(400).json({ error: "Data obbligatoria" });
  }

  const query = `
    SELECT 
      p.id, 
      p.nome,
      COALESCE(SUM(CASE WHEN d.tipo = 'carico' THEN d.quantita ELSE -d.quantita END), 0) as giacenza_netta
    FROM prodotti p
    LEFT JOIN dati d 
      ON p.id = d.prodotto_id 
      AND d.data_movimento <= ?
    GROUP BY p.id, p.nome
    ORDER BY p.nome
  `;

  db.all(query, [data], (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: err.message });
    }
    // Filtra per mostrare solo i prodotti che hanno avuto movimenti o giacenza > 0
    const results = rows.filter(row => row.giacenza_netta !== 0);
    res.json(results);
  });
});

// GET - Dettaglio Lotti attivi per un prodotto (usato da Riepilogo)
router.get("/riepilogo/:id", (req, res) => {
  const { id } = req.params;
  const query = `
    SELECT 
      id, 
      quantita_rimanente, 
      prezzo, 
      data_carico 
    FROM lotti 
    WHERE prodotto_id = ? AND quantita_rimanente > 0 
    ORDER BY data_carico ASC, id ASC
  `;

  db.all(query, [id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});


module.exports = router;