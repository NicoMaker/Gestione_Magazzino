// Installazione: npm install express sqlite3 cors
const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const os = require("os");
const { exec } = require("child_process");

const PORT = 3000;
const app = express();
app.use(cors());
app.use(express.json());

// Database locale SQLite
const db = new sqlite3.Database("./magazzino.db");

// Creazione tabelle (AGGIORNATE per fattura, fornitore e data_movimento)
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
    prezzo REAL, /* Prezzo unitario per il carico, NULL per lo scarico */
    prezzo_totale_movimento REAL, /* Valore totale del carico (Qta*Prezzo) o scarico (costo FIFO) */
    data_movimento TEXT NOT NULL, /* La data inserita dall'utente */
    data_registrazione TEXT NOT NULL, /* La data/ora di inserimento nel sistema (per ordinamento dati) */
    fattura_doc TEXT, /* Numero di fattura/documento (solo per carico) */
    fornitore_cliente_id TEXT, /* ID fornitore/cliente (solo per carico) */
    FOREIGN KEY(prodotto_id) REFERENCES prodotti(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS lotti (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    prodotto_id INTEGER,
    quantita_iniziale INTEGER NOT NULL,
    quantita_rimanente INTEGER NOT NULL,
    prezzo REAL NOT NULL,
    data_carico TEXT NOT NULL, /* Data inserita dall'utente */
    data_registrazione TEXT NOT NULL, /* Data/ora di registrazione effettiva (per FIFO) */
    fattura_doc TEXT,
    fornitore_cliente_id TEXT,
    FOREIGN KEY(prodotto_id) REFERENCES prodotti(id)
  )`);
});

app.use(express.static(path.join(__dirname, "../frontend")));

// ===== PRODOTTI (CRUD) - Nessuna modifica se non nell'ordinamento =====
app.get("/api/prodotti", (req, res) => {
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

app.post("/api/prodotti", (req, res) => {
  const { nome } = req.body;
  if (!nome || !nome.trim()) {
    return res.status(400).json({ error: "Nome prodotto obbligatorio" });
  }

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
      res.json({ id: this.lastID, nome: nome.trim() });
    }
  );
});

app.put("/api/prodotti/:id", (req, res) => {
  const { nome } = req.body;
  const { id } = req.params;

  if (!nome || !nome.trim()) {
    return res.status(400).json({ error: "Nome prodotto obbligatorio" });
  }

  db.run(
    "UPDATE prodotti SET nome = ? WHERE id = ?",
    [nome.trim(), id],
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
      res.json({ success: true });
    }
  );
});

app.delete("/api/prodotti/:id", (req, res) => {
  const { id } = req.params;

  db.serialize(() => {
    db.run("BEGIN TRANSACTION;");

    const checkGiacenzaQuery = `
      SELECT COALESCE(SUM(quantita_rimanente), 0) as giacenza
      FROM lotti
      WHERE prodotto_id = ?
    `;

    db.get(checkGiacenzaQuery, [id], (err, row) => {
      if (err) {
        db.run("ROLLBACK;");
        return res
          .status(500)
          .json({
            error: `Errore durante la verifica della giacenza: ${err.message}`,
          });
      }

      if (row.giacenza > 0) {
        db.run("ROLLBACK;");
        return res
          .status(400)
          .json({
            error: `Impossibile eliminare: il prodotto ha una giacenza residua di ${row.giacenza}. Scarica il prodotto prima di eliminarlo.`,
          });
      }

      db.run("DELETE FROM lotti WHERE prodotto_id = ?", [id], (err) => {
        if (err) {
          db.run("ROLLBACK;");
          return res
            .status(500)
            .json({
              error: `Errore durante l'eliminazione dei lotti: ${err.message}`,
            });
        }

        db.run("DELETE FROM dati WHERE prodotto_id = ?", [id], (err) => {
          if (err) {
            db.run("ROLLBACK;");
            return res
              .status(500)
              .json({
                error: `Errore durante l'eliminazione dei movimenti: ${err.message}`,
              });
          }

          db.run("DELETE FROM prodotti WHERE id = ?", [id], function (err) {
            if (err) {
              db.run("ROLLBACK;");
              return res
                .status(500)
                .json({
                  error: `Errore durante l'eliminazione del prodotto: ${err.message}`,
                });
            }

            if (this.changes === 0) {
              db.run("ROLLBACK;");
              return res.status(404).json({ error: "Prodotto non trovato" });
            }

            db.run("COMMIT;", (commitErr) => {
              if (commitErr) {
                return res
                  .status(500)
                  .json({
                    error: `Errore durante il commit: ${commitErr.message}`,
                  });
              }
              res.json({
                success: true,
                message: "Prodotto e storico eliminati con successo.",
              });
            });
          });
        });
      });
    });
  });
});

// ===== DATI & MAGAZZINO (CRUD) =====

app.get("/api/dati", (req, res) => {
  const query = `
    SELECT 
      d.id,
      d.prodotto_id,
      p.nome as prodotto_nome,
      d.tipo,
      d.quantita,
      d.prezzo,
      d.prezzo_totale_movimento as prezzo_totale,
      CASE WHEN d.tipo = 'scarico' AND d.prezzo_totale_movimento IS NOT NULL AND d.quantita > 0 THEN d.prezzo_totale_movimento / d.quantita ELSE NULL END as prezzo_unitario_scarico,
      d.data_movimento,
      d.data_registrazione,
      d.fattura_doc,
      d.fornitore_cliente_id
    FROM dati d
    JOIN prodotti p ON d.prodotto_id = p.id
    ORDER BY d.data_registrazione DESC, d.id DESC
  `;
  db.all(query, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get("/api/valore-magazzino", (req, res) => {
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

app.get("/api/riepilogo", (req, res) => {
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

app.get("/api/lotti/:prodotto_id", (req, res) => {
  const { prodotto_id } = req.params;
  const query = `
    SELECT 
      id,
      quantita_rimanente,
      prezzo,
      data_carico,
      fattura_doc,
      fornitore_cliente_id
    FROM lotti
    WHERE prodotto_id = ? AND quantita_rimanente > 0
    ORDER BY data_registrazione ASC
  `;

  db.all(query, [prodotto_id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post("/api/dati", (req, res) => {
  // Aggiunti i nuovi campi: data_movimento, fattura_doc, fornitore_cliente_id
  const { prodotto_id, tipo, quantita, prezzo, data_movimento, fattura_doc, fornitore_cliente_id } = req.body;

  if (!prodotto_id || !tipo || !quantita || !data_movimento) {
    return res
      .status(400)
      .json({ error: "Prodotto, tipo, quantità e data movimento sono obbligatori" });
  }
  
  // Validazione data (solo formato YYYY-MM-DD)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data_movimento)) {
    return res.status(400).json({ error: "Formato data non valido (YYYY-MM-DD)" });
  }

  const qty = parseInt(quantita);

  if (qty <= 0) {
    return res
      .status(400)
      .json({ error: "Quantità deve essere maggiore di 0" });
  }
  
  const data_registrazione = new Date().toISOString(); // Data/ora reale di inserimento

  if (tipo === "carico") {
    
    let prezzoString = String(prezzo).replace(",", ".");
    const prc = parseFloat(prezzoString); 

    if (isNaN(prc) || prc <= 0) {
      return res
        .status(400)
        .json({ error: "Prezzo obbligatorio e maggiore di 0 per il carico" });
    }

    const prezzoTotale = prc * qty;
    
    // Inserimento in `dati`
    db.run(
      "INSERT INTO dati (prodotto_id, tipo, quantita, prezzo, prezzo_totale_movimento, data_movimento, data_registrazione, fattura_doc, fornitore_cliente_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [prodotto_id, tipo, qty, prc, prezzoTotale, data_movimento, data_registrazione, fattura_doc, fornitore_cliente_id],
      function (err) {
        if (err) return res.status(500).json({ error: err.message });

        // Inserimento in `lotti`
        db.run(
          "INSERT INTO lotti (prodotto_id, quantita_iniziale, quantita_rimanente, prezzo, data_carico, data_registrazione, fattura_doc, fornitore_cliente_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
          [prodotto_id, qty, qty, prc, data_movimento, data_registrazione, fattura_doc, fornitore_cliente_id],
          function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID });
          }
        );
      }
    );
  } else {
    // SCARICO - usa FIFO per scaricare dai lotti più vecchi (ordinati per data_registrazione)
    db.all(
      "SELECT id, quantita_rimanente, prezzo FROM lotti WHERE prodotto_id = ? AND quantita_rimanente > 0 ORDER BY data_registrazione ASC",
      [prodotto_id],
      (err, lotti) => {
        if (err) return res.status(500).json({ error: err.message });

        const giacenzaTotale = lotti.reduce(
          (sum, l) => sum + l.quantita_rimanente,
          0
        );

        if (giacenzaTotale < qty) {
          return res
            .status(400)
            .json({
              error: `Giacenza insufficiente (disponibili: ${giacenzaTotale})`,
            });
        }

        let daScaricare = qty;
        let costoTotaleScarico = 0;
        const updates = [];

        for (const lotto of lotti) {
          if (daScaricare <= 0) break;

          const qtaDaQuestoLotto = Math.min(
            daScaricare,
            lotto.quantita_rimanente
          );
          const nuovaQta = lotto.quantita_rimanente - qtaDaQuestoLotto;

          costoTotaleScarico += qtaDaQuestoLotto * lotto.prezzo;

          updates.push({
            id: lotto.id,
            nuova_quantita: nuovaQta,
          });

          daScaricare -= qtaDaQuestoLotto;
        }

        db.serialize(() => {
          // Inserimento in `dati`
          db.run(
            "INSERT INTO dati (prodotto_id, tipo, quantita, prezzo, prezzo_totale_movimento, data_movimento, data_registrazione) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [prodotto_id, tipo, qty, null, costoTotaleScarico, data_movimento, data_registrazione],
            function (err) {
              if (err) return res.status(500).json({ error: err.message });
            }
          );

          // Aggiornamento `lotti`
          updates.forEach((u) => {
            db.run("UPDATE lotti SET quantita_rimanente = ? WHERE id = ?", [
              u.nuova_quantita,
              u.id,
            ]);
          });

          res.json({ success: true, costo_totale_scarico: costoTotaleScarico });
        });
      }
    );
  }
});

// DELETE dato (Logica modificata per consentire l'eliminazione di carichi intatti e scarichi con ripristino)
app.delete("/api/dati/:id", (req, res) => {
  const { id } = req.params;

  db.serialize(() => {
    db.run("BEGIN TRANSACTION;");

    // 1. Recupera il movimento da eliminare (usiamo la data di registrazione per l'identificazione univoca del lotto)
    db.get(
      "SELECT prodotto_id, tipo, quantita, data_movimento, data_registrazione FROM dati WHERE id = ?",
      [id],
      (err, movimento) => {
        if (err) {
          db.run("ROLLBACK;");
          return res.status(500).json({ error: err.message });
        }
        if (!movimento) {
          db.run("ROLLBACK;");
          return res.status(404).json({ error: "Movimento non trovato" });
        }

        const { prodotto_id, tipo, quantita, data_movimento, data_registrazione } = movimento;

        if (tipo === "carico") {
          // --- Logica di Eliminazione CARICO ---
          const lottoQuery = `
            SELECT id, quantita_rimanente, quantita_iniziale
            FROM lotti
            WHERE prodotto_id = ? 
            AND quantita_iniziale = ? 
            AND data_registrazione = ?
            ORDER BY id DESC 
            LIMIT 1
          `;

          db.get(
            lottoQuery,
            [prodotto_id, quantita, data_registrazione],
            (err, lotto) => {
              if (err) {
                db.run("ROLLBACK;");
                return res
                  .status(500)
                  .json({
                    error: `Errore durante la ricerca del lotto: ${err.message}`,
                  });
              }

              if (!lotto || lotto.quantita_rimanente !== lotto.quantita_iniziale) {
                db.run("ROLLBACK;");
                return res.status(400).json({
                  error:
                    "Impossibile eliminare: il lotto di questo carico è stato parzialmente o totalmente scaricato.",
                });
              }

              // Elimina il lotto
              db.run("DELETE FROM lotti WHERE id = ?", [lotto.id], (err) => {
                if (err) {
                  db.run("ROLLBACK;");
                  return res
                    .status(500)
                    .json({
                      error: `Errore durante l'eliminazione del lotto: ${err.message}`,
                    });
                }

                // Elimina il movimento
                db.run(
                  "DELETE FROM dati WHERE id = ?",
                  [id],
                  function (err) {
                    if (err) {
                      db.run("ROLLBACK;");
                      return res
                        .status(500)
                        .json({
                          error: `Errore durante l'eliminazione del dato: ${err.message}`,
                        });
                    }

                    db.run("COMMIT;");
                    res.json({
                      success: true,
                      message: "Carico e lotto associato eliminati con successo.",
                    });
                  }
                );
              });
            }
          );
        } else if (tipo === "scarico") {
          // --- Logica di Eliminazione SCARICO (ANNULLAMENTO/RIPRISTINO) ---
          
          let qtaDaRipristinare = quantita;
          
          // Cerca i lotti in ordine inverso (dal più recente, basato su data_registrazione) per ripristinare la quantità
          const lottiQuery = `
            SELECT id, quantita_iniziale, quantita_rimanente 
            FROM lotti 
            WHERE prodotto_id = ? 
            ORDER BY data_registrazione DESC
          `;

          db.all(lottiQuery, [prodotto_id], (err, lotti) => {
            if (err) {
              db.run("ROLLBACK;");
              return res.status(500).json({ error: err.message });
            }

            const updates = [];
            
            for (const lotto of lotti) {
              if (qtaDaRipristinare <= 0) break;

              const qtaConsumata = lotto.quantita_iniziale - lotto.quantita_rimanente;
              
              // Calcola quanto si può ripristinare su questo lotto (fino a raggiungere la qta iniziale)
              const qtaDaQuestoLotto = Math.min(
                qtaDaRipristinare,
                qtaConsumata
              );

              if (qtaDaQuestoLotto > 0) {
                const nuovaQta = lotto.quantita_rimanente + qtaDaQuestoLotto;
                
                updates.push({
                  id: lotto.id,
                  nuova_quantita: nuovaQta,
                });
                
                qtaDaRipristinare -= qtaDaQuestoLotto;
              }
            }
            
            if (qtaDaRipristinare > 0) {
                db.run("ROLLBACK;");
                return res.status(400).json({
                    error: `Impossibile ripristinare la quantità (${quantita - qtaDaRipristinare} ripristinate su ${quantita} totali). Il lotto originale è stato consumato da movimenti successivi o eliminato.`,
                });
            }

            let updatesCompleted = 0;
            const totalUpdates = updates.length;
            
            const handleUpdateComplete = () => {
                updatesCompleted++;
                if (updatesCompleted === totalUpdates) {
                    // Elimina il movimento dalla tabella dati
                    db.run(
                      "DELETE FROM dati WHERE id = ?",
                      [id],
                      function (err) {
                        if (err) {
                          db.run("ROLLBACK;");
                          return res
                            .status(500)
                            .json({
                              error: `Errore durante l'eliminazione del dato: ${err.message}`,
                            });
                        }

                        db.run("COMMIT;");
                        res.json({
                          success: true,
                          message: "Scarico annullato e lotti ripristinati con successo.",
                        });
                      }
                    );
                }
            };

            if (totalUpdates === 0) {
                 handleUpdateComplete();
            } else {
                 updates.forEach((u) => {
                    db.run(
                        "UPDATE lotti SET quantita_rimanente = ? WHERE id = ?",
                        [u.nuova_quantita, u.id],
                        (err) => {
                            if (err) {
                                db.run("ROLLBACK;");
                                return res.status(500).json({
                                    error: `Errore durante il ripristino del lotto ${u.id}: ${err.message}`,
                                });
                            }
                            handleUpdateComplete();
                        }
                    );
                });
            }
          });
        }
      }
    );
  });
});

// Avvio server e apertura browser (immutato)
app.listen(PORT, () => {
  console.log(`Backend avviato su http://localhost:${PORT}`);
  const url = `http://localhost:${PORT}/`;

  let cmd;
  switch (os.platform()) {
    case "win32":
      cmd = `start ${url}`;
      break;
    case "darwin":
      cmd = `open ${url}`;
      break;
    default:
      cmd = `xdg-open ${url}`; // Linux
  }
  exec(cmd, (err) => {
    if (err)
      console.warn(
        "Non è stato possibile aprire automaticamente il browser:",
        err
      );
  });
});