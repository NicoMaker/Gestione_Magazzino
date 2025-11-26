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

// GET - Dettaglio Lotti per Prodotto (FIFO Order)
router.get("/riepilogo/:prodottoId", (req, res) => {
    const { prodottoId } = req.params;

    const query = `
      SELECT
        id,
        quantita_rimanente,
        prezzo,
        data_carico,
        fattura_doc
      FROM lotti
      WHERE prodotto_id = ? AND quantita_rimanente > 0
      ORDER BY data_carico ASC, id ASC
    `;

    db.all(query, [prodottoId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});


module.exports = router;