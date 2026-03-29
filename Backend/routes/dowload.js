const express = require('express');
const router = express.Router();
const path = require('path'); 
const fs = require('fs');   

// Il percorso corretto: da routes/ sali di un livello per arrivare a backend/db/
const dbPath = path.join(__dirname, '..', 'db', 'magazzino.db');  // ← __dirname/../db/

router.get("/download-db", (req, res) => {  // ← tolto /api/admin/ perché è già nel prefix di server.js
  if (!fs.existsSync(dbPath)) {
    console.error("❌ File database non trovato:", dbPath);
    return res.status(404).json({
      error: "File database non trovato",
      path: dbPath,
    });
  }

  const timestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, "-")
    .replace("T", "_")
    .slice(0, 19);
  const downloadFilename = `magazzino_backup_${timestamp}.db`;

  console.log(`📥 Download DB richiesto - File: ${downloadFilename}`);

  res.setHeader("Content-Type", "application/octet-stream");
  res.setHeader("Content-Disposition", `attachment; filename="${downloadFilename}"`);

  const fileStream = fs.createReadStream(dbPath);
  fileStream.on("error", (err) => {
    console.error("❌ Errore lettura DB:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Errore durante la lettura del database" });
    }
  });
  fileStream.pipe(res);
});

module.exports = router;