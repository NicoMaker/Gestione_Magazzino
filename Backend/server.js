// Installazione: npm install express sqlite3 cors
const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const os = require('os');
const { exec } = require('child_process');

const PORT = 3000;
const app = express();
app.use(cors());
app.use(express.json());

// Database locale SQLite
const db = new sqlite3.Database('./magazzino.db');

// Creazione tabelle
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS prodotti (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT UNIQUE NOT NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS dati (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    prodotto_id INTEGER,
    tipo TEXT CHECK(tipo IN ('carico', 'scarico')),
    quantita INTEGER NOT NULL CHECK(quantita > 0),
    prezzo REAL,
    data TEXT NOT NULL,
    FOREIGN KEY(prodotto_id) REFERENCES prodotti(id)
  )`);
});

app.use(express.static(path.join(__dirname, 'frontend')));

// ===== PRODOTTI =====
// GET tutti i prodotti con giacenza e valore
app.get('/api/prodotti', (req, res) => {
  const query = `
    SELECT 
      p.id, 
      p.nome,
      COALESCE(SUM(CASE WHEN d.tipo = 'carico' THEN d.quantita ELSE -d.quantita END), 0) as giacenza
    FROM prodotti p
    LEFT JOIN dati d ON p.id = d.prodotto_id
    GROUP BY p.id, p.nome
    ORDER BY p.nome
  `;
  db.all(query, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// POST nuovo prodotto
app.post('/api/prodotti', (req, res) => {
  const { nome } = req.body;
  if (!nome || !nome.trim()) {
    return res.status(400).json({ error: 'Nome prodotto obbligatorio' });
  }

  db.run('INSERT INTO prodotti (nome) VALUES (?)', [nome.trim()], function(err) {
    if (err) {
      if (err.message.includes('UNIQUE')) {
        return res.status(400).json({ error: 'Prodotto già esistente' });
      }
      return res.status(500).json({ error: err.message });
    }
    res.json({ id: this.lastID, nome: nome.trim() });
  });
});

// PUT modifica nome prodotto
app.put('/api/prodotti/:id', (req, res) => {
  const { nome } = req.body;
  const { id } = req.params;
  
  if (!nome || !nome.trim()) {
    return res.status(400).json({ error: 'Nome prodotto obbligatorio' });
  }

  db.run('UPDATE prodotti SET nome = ? WHERE id = ?', [nome.trim(), id], function(err) {
    if (err) {
      if (err.message.includes('UNIQUE')) {
        return res.status(400).json({ error: 'Prodotto già esistente' });
      }
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Prodotto non trovato' });
    }
    res.json({ success: true });
  });
});

// DELETE prodotto (solo se non ha dati)
app.delete('/api/prodotti/:id', (req, res) => {
  const { id } = req.params;
  
  // Verifica se ha dati
  db.get('SELECT COUNT(*) as count FROM dati WHERE prodotto_id = ?', [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    
    if (row.count > 0) {
      return res.status(400).json({ error: 'Impossibile eliminare: prodotto con movimenti' });
    }
    
    db.run('DELETE FROM prodotti WHERE id = ?', [id], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Prodotto non trovato' });
      }
      res.json({ success: true });
    });
  });
});

// ===== DATI =====
// GET tutti i dati
app.get('/api/dati', (req, res) => {
  const query = `
    SELECT 
      d.id,
      d.prodotto_id,
      p.nome as prodotto_nome,
      d.tipo,
      d.quantita,
      d.prezzo,
      d.data
    FROM dati d
    JOIN prodotti p ON d.prodotto_id = p.id
    ORDER BY d.data DESC, d.id DESC
  `;
  db.all(query, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// GET valore totale magazzino
app.get('/api/valore-magazzino', (req, res) => {
  const query = `
    WITH giacenze AS (
      SELECT 
        prodotto_id,
        SUM(CASE WHEN tipo = 'carico' THEN quantita ELSE -quantita END) as giacenza
      FROM dati
      GROUP BY prodotto_id
    ),
    prezzi_medi AS (
      SELECT 
        prodotto_id,
        AVG(prezzo) as prezzo_medio
      FROM dati
      WHERE tipo = 'carico' AND prezzo IS NOT NULL
      GROUP BY prodotto_id
    )
    SELECT 
      COALESCE(SUM(g.giacenza * pm.prezzo_medio), 0) as valore_totale
    FROM giacenze g
    JOIN prezzi_medi pm ON g.prodotto_id = pm.prodotto_id
    WHERE g.giacenza > 0
  `;
  
  db.get(query, (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ valore_totale: row.valore_totale || 0 });
  });
});

// POST nuovo dato (carico/scarico)
app.post('/api/dati', (req, res) => {
  const { prodotto_id, tipo, quantita, prezzo } = req.body;
  
  // Validazioni
  if (!prodotto_id || !tipo || !quantita) {
    return res.status(400).json({ error: 'Prodotto, tipo e quantità sono obbligatori' });
  }
  
  const qty = parseInt(quantita);
  
  if (qty <= 0) {
    return res.status(400).json({ error: 'Quantità deve essere maggiore di 0' });
  }
  
  // Validazione prezzo per carico
  if (tipo === 'carico') {
    if (!prezzo || parseFloat(prezzo) <= 0) {
      return res.status(400).json({ error: 'Prezzo obbligatorio e maggiore di 0 per il carico' });
    }
  }
  
  const prc = tipo === 'carico' ? parseFloat(prezzo) : null;
  
  // Se è scarico, verifica giacenza
  if (tipo === 'scarico') {
    const queryGiacenza = `
      SELECT COALESCE(SUM(CASE WHEN tipo = 'carico' THEN quantita ELSE -quantita END), 0) as giacenza
      FROM dati WHERE prodotto_id = ?
    `;
    
    db.get(queryGiacenza, [prodotto_id], (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      
      if (row.giacenza < qty) {
        return res.status(400).json({ error: `Giacenza insufficiente (disponibili: ${row.giacenza})` });
      }
      
      inserisciDato();
    });
  } else {
    inserisciDato();
  }
  
  function inserisciDato() {
    const data = new Date().toISOString();
    db.run(
      'INSERT INTO dati (prodotto_id, tipo, quantita, prezzo, data) VALUES (?, ?, ?, ?, ?)',
      [prodotto_id, tipo, qty, prc, data],
      function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID });
      }
    );
  }
});

// DELETE dato
app.delete('/api/dati/:id', (req, res) => {
  const { id } = req.params;
  
  db.run('DELETE FROM dati WHERE id = ?', [id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Dato non trovato' });
    }
    res.json({ success: true });
  });
});

// Avvio server e apertura browser
app.listen(PORT, () => {
  console.log(`Backend avviato su http://localhost:${PORT}`);
  const url = `http://localhost:${PORT}/`;

  let cmd;
  switch (os.platform()) {
    case 'win32': cmd = `start ${url}`; break;
    case 'darwin': cmd = `open ${url}`; break;
    default: cmd = `xdg-open ${url}`; // Linux
  }
  exec(cmd, (err) => {
    if (err) console.warn('Non è stato possibile aprire automaticamente il browser:', err);
  });
});