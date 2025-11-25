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

// Creazione tabelle (immutato)
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
    data TEXT NOT NULL,
    FOREIGN KEY(prodotto_id) REFERENCES prodotti(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS lotti (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    prodotto_id INTEGER,
    quantita_iniziale INTEGER NOT NULL,
    quantita_rimanente INTEGER NOT NULL,
    prezzo REAL NOT NULL,
    data_carico TEXT NOT NULL,
    FOREIGN KEY(prodotto_id) REFERENCES prodotti(id)
  )`);
});

app.use(express.static(path.join(__dirname, "../frontend")));

// ===== PRODOTTI (CRUD) =====
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
      data_carico
    FROM lotti
    WHERE prodotto_id = ? AND quantita_rimanente > 0
    ORDER BY data_carico ASC
  `;

  db.all(query, [prodotto_id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post("/api/dati", (req, res) => {
  const { prodotto_id, tipo, quantita, prezzo } = req.body;

  if (!prodotto_id || !tipo || !quantita) {
    return res
      .status(400)
      .json({ error: "Prodotto, tipo e quantità sono obbligatori" });
  }

  const qty = parseInt(quantita);

  if (qty <= 0) {
    return res
      .status(400)
      .json({ error: "Quantità deve essere maggiore di 0" });
  }

  if (tipo === "carico") {
    // MODIFICA: Prepara la stringa del prezzo per l'analisi, sostituendo la virgola con il punto
    let prezzoString = String(prezzo).replace(",", ".");
    const prc = parseFloat(prezzoString); 

    if (isNaN(prc) || prc <= 0) {
      return res
        .status(400)
        .json({ error: "Prezzo obbligatorio e maggiore di 0 per il carico" });
    }

    const prezzoTotale = prc * qty;
    const data = new Date().toISOString();

    db.run(
      "INSERT INTO dati (prodotto_id, tipo, quantita, prezzo, prezzo_totale_movimento, data) VALUES (?, ?, ?, ?, ?, ?)",
      [prodotto_id, tipo, qty, prc, prezzoTotale, data],
      function (err) {
        if (err) return res.status(500).json({ error: err.message });

        db.run(
          "INSERT INTO lotti (prodotto_id, quantita_iniziale, quantita_rimanente, prezzo, data_carico) VALUES (?, ?, ?, ?, ?)",
          [prodotto_id, qty, qty, prc, data],
          function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id: this.lastID });
          }
        );
      }
    );
  } else {
    // SCARICO - usa FIFO per scaricare dai lotti più vecchi
    db.all(
      "SELECT id, quantita_rimanente, prezzo FROM lotti WHERE prodotto_id = ? AND quantita_rimanente > 0 ORDER BY data_carico ASC",
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
          const data = new Date().toISOString();

          db.run(
            "INSERT INTO dati (prodotto_id, tipo, quantita, prezzo, prezzo_totale_movimento, data) VALUES (?, ?, ?, ?, ?, ?)",
            [prodotto_id, tipo, qty, null, costoTotaleScarico, data],
            function (err) {
              if (err) return res.status(500).json({ error: err.message });
            }
          );

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

    // 1. Recupera il movimento da eliminare
    db.get(
      "SELECT prodotto_id, tipo, quantita, data FROM dati WHERE id = ?",
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

        const { prodotto_id, tipo, quantita, data } = movimento;

        if (tipo === "carico") {
          // --- Logica di Eliminazione CARICO ---
          const lottoQuery = `
            SELECT id, quantita_rimanente, quantita_iniziale
            FROM lotti
            WHERE prodotto_id = ? 
            AND quantita_iniziale = ? 
            AND data_carico = ?
            ORDER BY id DESC 
            LIMIT 1
          `;

          db.get(
            lottoQuery,
            [prodotto_id, quantita, data],
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
          
          // Cerca i lotti in ordine inverso (dal più recente) per ripristinare la quantità
          const lottiQuery = `
            SELECT id, quantita_iniziale, quantita_rimanente 
            FROM lotti 
            WHERE prodotto_id = ? 
            ORDER BY data_carico DESC
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