// routes/dati.js - CON VINCOLI TEMPORALI SUI LOTTI

// 🔧 Helper: trova prodotto per codice (nome) oppure lo crea
function findOrCreateProduct(db, code, descrizione = null, marcaId = null) {
  return new Promise((resolve, reject) => {
    if (!code || !code.trim()) {
      return reject(new Error("Codice prodotto mancante"));
    }

    const nome = code.trim();

    // 1) cerca prodotto esistente
    db.get(
      `SELECT p.id, p.nome, p.marca_id, p.descrizione
       FROM prodotti p
       WHERE UPPER(p.nome) = UPPER(?)`,
      [nome],
      (err, row) => {
        if (err) return reject(err);

        if (row) {
          return resolve(row); // trovato
        }

        // 2) non trovato → crealo
        const data_creazione = new Date().toISOString();
        db.run(
          `INSERT INTO prodotti (nome, marca_id, descrizione, data_creazione)
           VALUES (?, ?, ?, ?)`,
          [nome, marcaId || null, descrizione || null, data_creazione],
          function (err2) {
            if (err2) return reject(err2);

            const newId = this.lastID;
            db.get(
              `SELECT p.id, p.nome, p.marca_id, p.descrizione
               FROM prodotti p
               WHERE p.id = ?`,
              [newId],
              (err3, newRow) => {
                if (err3) return reject(err3);
                resolve(newRow);
              }
            );
          }
        );
      }
    );
  });
}


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

// GET - Lista tutti i movimenti con marca e descrizione
router.get("/", (req, res) => {
  const query = `
    SELECT 
      d.id,
      d.prodotto_id,
      p.nome as prodotto_nome,
      m.nome as marca_nome,
      p.descrizione as prodotto_descrizione,
      d.tipo,
      d.quantita,
      d.prezzo,
      d.prezzo_totale_movimento as prezzo_totale,
      CASE WHEN d.tipo = 'scarico' AND d.prezzo_totale_movimento IS NOT NULL AND d.quantita > 0 
        THEN d.prezzo_totale_movimento / d.quantita 
        ELSE NULL 
      END as prezzo_unitario_scarico,
      d.data_movimento,
      d.data_registrazione,
      d.fattura_doc,
      d.fornitore_cliente_id
    FROM dati d
    JOIN prodotti p ON d.prodotto_id = p.id
    LEFT JOIN marche m ON p.marca_id = m.id
    ORDER BY d.data_movimento DESC, d.data_registrazione DESC, d.id DESC  -- ✅ ORDINAMENTO CORRETTO
  `;

  db.all(query, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });

    const formattedRows = rows.map((row) => ({
      ...row,
      quantita: formatDecimal(row.quantita),
      prezzo: formatDecimal(row.prezzo),
      prezzo_totale: formatDecimal(row.prezzo_totale),
      prezzo_unitario_scarico: formatDecimal(row.prezzo_unitario_scarico),
    }));

    res.json(formattedRows);
  });
});

// POST - Crea nuovo movimento (carico o scarico)
// POST - Crea nuovo movimento (carico o scarico)
router.post("/", (req, res) => {
  const {
    prodotto_id,
    tipo,
    quantita,
    prezzo,
    data_movimento,
    fattura_doc,
    fornitore,
  } = req.body;

  if (!prodotto_id || !tipo || !quantita || !data_movimento) {
    return res.status(400).json({
      error: "Prodotto, tipo, quantità e data movimento sono obbligatori",
    });
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(data_movimento)) {
    return res
      .status(400)
      .json({ error: "Formato data non valido (YYYY-MM-DD)" });
  }

  const qtaString = String(quantita).replace(",", ".");
  const qty = formatDecimal(qtaString);
  if (qty === null || qty <= 0) {
    return res
      .status(400)
      .json({ error: "Quantità deve essere maggiore di 0" });
  }

  const data_registrazione = new Date().toISOString();

  // 🔍 CONTROLLO ANTI-DUPLICATO
  // - blocca solo i CARICHI (per evitare doppio import della stessa fattura)
  // - NON blocca gli SCARICHI (possono essere ripetuti se c'è giacenza)
  const dupQuery = `
    SELECT id FROM dati
    WHERE prodotto_id = ?
      AND tipo = ?
      AND quantita = ?
      AND data_movimento = ?
      AND IFNULL(fattura_doc, '') = IFNULL(?, '')
    LIMIT 1
  `;

  db.get(
    dupQuery,
    [prodotto_id, tipo, qty, data_movimento, fattura_doc || ""],
    (err, existing) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      // ⛔ blocca solo i duplicati di CARICO
      if (existing && tipo === "carico") {
        return res.status(409).json({
          error: "Movimento già presente (ordine PDF importato più volte).",
        });
      }

      // ===================== CARICO =====================
      if (tipo === "carico") {
        const prezzoString = String(prezzo).replace(",", ".");
        const prc = formatDecimal(prezzoString);
        if (prc === null || prc <= 0) {
          return res.status(400).json({
            error: "Prezzo obbligatorio e maggiore di 0 per il carico",
          });
        }

        const prezzoTotale = formatDecimal(prc * qty);

        db.serialize(() => {
          db.run("BEGIN TRANSACTION;");
          db.run(
            "INSERT INTO dati (prodotto_id, tipo, quantita, prezzo, prezzo_totale_movimento, data_movimento, data_registrazione, fattura_doc, fornitore_cliente_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [
              prodotto_id,
              tipo,
              qty,
              prc,
              prezzoTotale,
              data_movimento,
              data_registrazione,
              fattura_doc,
              fornitore || null,
            ],
            function (err) {
              if (err) {
                db.run("ROLLBACK;");
                return res.status(500).json({ error: err.message });
              }

              const dati_id = this.lastID;

              db.run(
                "INSERT INTO lotti (prodotto_id, quantita_iniziale, quantita_rimanente, prezzo, data_carico, data_registrazione, fattura_doc, fornitore, dati_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                [
                  prodotto_id,
                  qty,
                  qty,
                  prc,
                  data_movimento,
                  data_registrazione,
                  fattura_doc,
                  fornitore || null,
                  dati_id,
                ],
                function (err) {
                  if (err) {
                    db.run("ROLLBACK;");
                    return res.status(500).json({ error: err.message });
                  }

                  db.run("COMMIT;");

                  const io = req.app.get("io");
                  if (io) {
                    io.emit("movimento_aggiunto", { tipo: "carico", prodotto_id });
                    io.emit("magazzino_aggiornato");
                    io.emit("dati_aggiornati");
                  }

                  res.json({ id: dati_id, lotto_id: this.lastID });
                }
              );
            }
          );
        });
      } else {
        // ===================== SCARICO =====================
        db.all(
          `SELECT id, quantita_rimanente, prezzo, data_carico
           FROM lotti
           WHERE prodotto_id = ?
             AND quantita_rimanente > 0
             AND data_carico <= ?
           ORDER BY data_carico ASC, data_registrazione ASC`,
          [prodotto_id, data_movimento],
          (err, lotti) => {
            if (err) return res.status(500).json({ error: err.message });

            if (lotti.length === 0) {
              const [anno, mese, giorno] = data_movimento.split("-");
              const dataItaliana = `${giorno}/${mese}/${anno}`;
              return res.status(400).json({
                error: `Nessun carico disponibile alla data ${dataItaliana}. Verifica di aver caricato il prodotto prima o nella stessa data dello scarico.`,
              });
            }

            const giacenzaTotale = lotti.reduce(
              (sum, l) => sum + formatDecimal(l.quantita_rimanente),
              0
            );

            if (giacenzaTotale < qty) {
              return res.status(400).json({
                error: `Giacenza insufficiente alla data indicata. Disponibili: ${formatDecimal(
                  giacenzaTotale
                )} - Richiesti: ${qty}`,
              });
            }

            let daScaricare = qty;
            let costoTotaleScarico = 0;
            const updates = [];

            for (const lotto of lotti) {
              if (daScaricare <= 0) break;

              const qtaDaQuestoLotto = Math.min(
                daScaricare,
                formatDecimal(lotto.quantita_rimanente)
              );

              const nuovaQta = formatDecimal(
                formatDecimal(lotto.quantita_rimanente) - qtaDaQuestoLotto
              );

              costoTotaleScarico +=
                qtaDaQuestoLotto * formatDecimal(lotto.prezzo);

              updates.push({
                id: lotto.id,
                nuova_quantita: nuovaQta,
              });

              daScaricare = formatDecimal(daScaricare - qtaDaQuestoLotto);
            }

            costoTotaleScarico = formatDecimal(costoTotaleScarico);

            db.serialize(() => {
              db.run("BEGIN TRANSACTION;");
              db.run(
                "INSERT INTO dati (prodotto_id, tipo, quantita, prezzo, prezzo_totale_movimento, data_movimento, data_registrazione, fattura_doc, fornitore_cliente_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                [
                  prodotto_id,
                  tipo,
                  qty,
                  null,
                  costoTotaleScarico,
                  data_movimento,
                  data_registrazione,
                  fattura_doc,
                  null,
                ],
                (err) => {
                  if (err) {
                    db.run("ROLLBACK;");
                    return res.status(500).json({ error: err.message });
                  }

                  let updatesCompleted = 0;
                  const totalUpdates = updates.length;

                  if (totalUpdates === 0) {
                    db.run("COMMIT;");
                    const io = req.app.get("io");
                    if (io) {
                      io.emit("movimento_aggiunto", { tipo: "scarico", prodotto_id });
                      io.emit("magazzino_aggiornato");
                      io.emit("dati_aggiornati");
                    }
                    return res.json({
                      success: true,
                      costo_totale_scarico: costoTotaleScarico,
                    });
                  }

                  updates.forEach((u) => {
                    db.run(
                      "UPDATE lotti SET quantita_rimanente = ? WHERE id = ?",
                      [u.nuova_quantita, u.id],
                      (err) => {
                        if (err) {
                          if (!res.headersSent) {
                            db.run("ROLLBACK;");
                            return res
                              .status(500)
                              .json({ error: err.message });
                          }
                        } else {
                          updatesCompleted++;
                          if (updatesCompleted === totalUpdates) {
                            db.run("COMMIT;");
                            const io = req.app.get("io");
                            if (io) {
                              io.emit("movimento_aggiunto", {
                                tipo: "scarico",
                                prodotto_id,
                              });
                              io.emit("magazzino_aggiornato");
                              io.emit("dati_aggiornati");
                            }
                            return res.json({
                              success: true,
                              costo_totale_scarico: costoTotaleScarico,
                            });
                          }
                        }
                      }
                    );
                  });
                }
              );
            });
          }
        );
      }
    }
  );
});



// DELETE - Elimina movimento
router.delete("/:id", (req, res) => {
  const { id } = req.params;

  db.serialize(() => {
    db.run("BEGIN TRANSACTION;");

    db.get(
      "SELECT prodotto_id, tipo, quantita FROM dati WHERE id = ?",
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

        const { prodotto_id, tipo, quantita } = movimento;
        const qty = formatDecimal(quantita);

        if (tipo === "carico") {
          const lottoQuery = `
            SELECT id, quantita_rimanente, quantita_iniziale
            FROM lotti
            WHERE dati_id = ? AND prodotto_id = ?
            LIMIT 1
          `;

          db.get(lottoQuery, [id, prodotto_id], (err, lotto) => {
            if (err) {
              db.run("ROLLBACK;");
              return res.status(500).json({ error: err.message });
            }

            const qtaRimanente = formatDecimal(lotto?.quantita_rimanente);
            const qtaIniziale = formatDecimal(lotto?.quantita_iniziale);

            if (!lotto || qtaRimanente !== qtaIniziale) {
              db.run("ROLLBACK;");
              return res.status(400).json({
                error:
                  "Impossibile eliminare: il lotto è stato parzialmente o totalmente scaricato.",
              });
            }

            db.run("DELETE FROM lotti WHERE id = ?", [lotto.id], (err) => {
              if (err) {
                db.run("ROLLBACK;");
                return res.status(500).json({ error: err.message });
              }

              db.run("DELETE FROM dati WHERE id = ?", [id], (err) => {
                if (err) {
                  db.run("ROLLBACK;");
                  return res.status(500).json({ error: err.message });
                }

                db.run("COMMIT;");
                // Emetti evento Socket.IO per aggiornamento real-time
                const io = req.app.get("io");
                if (io) {
                  io.emit("movimento_eliminato", {
                    tipo: "carico",
                    prodotto_id,
                  });
                  io.emit("magazzino_aggiornato");
                  io.emit("dati_aggiornati");
                }
                res.json({
                  success: true,
                  message: "Carico eliminato con successo",
                });
              });
            });
          });
        } else if (tipo === "scarico") {
          let qtaDaRipristinare = qty;

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

              const qtaIniziale = formatDecimal(lotto.quantita_iniziale);
              const qtaRimanente = formatDecimal(lotto.quantita_rimanente);
              const qtaConsumata = formatDecimal(qtaIniziale - qtaRimanente);
              const qtaDaQuestoLotto = Math.min(
                qtaDaRipristinare,
                qtaConsumata
              );

              if (qtaDaQuestoLotto > 0) {
                const nuovaQta = formatDecimal(qtaRimanente + qtaDaQuestoLotto);
                updates.push({ id: lotto.id, nuova_quantita: nuovaQta });
                qtaDaRipristinare = formatDecimal(
                  qtaDaRipristinare - qtaDaQuestoLotto
                );
              }
            }

            if (qtaDaRipristinare > 0) {
              db.run("ROLLBACK;");
              return res.status(400).json({
                error: "Impossibile ripristinare completamente la quantità",
              });
            }

            let updatesCompleted = 0;
            const totalUpdates = updates.length;

            const handleUpdateComplete = () => {
              updatesCompleted++;
              if (updatesCompleted === totalUpdates) {
                db.run("DELETE FROM dati WHERE id = ?", [id], (err) => {
                  if (err) {
                    db.run("ROLLBACK;");
                    return res.status(500).json({ error: err.message });
                  }

                  db.run("COMMIT;");
                  // Emetti evento Socket.IO per aggiornamento real-time
                  const io = req.app.get("io");
                  if (io) {
                    io.emit("movimento_eliminato", {
                      tipo: "scarico",
                      prodotto_id,
                    });
                    io.emit("magazzino_aggiornato");
                    io.emit("dati_aggiornati");
                  }
                  res.json({
                    success: true,
                    message: "Scarico eliminato con successo",
                  });
                });
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
                      if (!res.headersSent) {
                        return res.status(500).json({ error: err.message });
                      }
                      return;
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

// POST /dati/import-fattura
// body: { righe: [{ code, descrizione, quantita, prezzo, data_movimento, fattura_doc, fornitore }] }
router.post("/import-fattura", async (req, res) => {
  const { righe } = req.body;

  if (!Array.isArray(righe) || righe.length === 0) {
    return res.status(400).json({ error: "Nessuna riga da importare" });
  }

  const results = {
    success: [],
    failed: [],
  };

  try {
    for (const riga of righe) {
      const {
        code,
        descrizione,
        quantita,
        prezzo,
        data_movimento,
        fattura_doc,
        fornitore,
      } = riga;

      try {
        const prodotto = await findOrCreateProduct(db, code, descrizione, null);

        await new Promise((resolve, reject) => {
          const qtaString = String(quantita || "").replace(",", ".");
          const qty = formatDecimal(qtaString);
          if (qty === null || qty <= 0) {
            return reject(new Error("Quantità non valida"));
          }

          const prezzoString = String(prezzo || "").replace(",", ".");
          const prc = formatDecimal(prezzoString);
          if (prc === null || prc <= 0) {
            return reject(new Error("Prezzo non valido"));
          }

          const data_registrazione = new Date().toISOString();
          const prezzoTotale = formatDecimal(prc * qty);
          const fornitoreValue =
            fornitore && String(fornitore).trim() !== ""
              ? String(fornitore).trim()
              : null;

          db.serialize(() => {
            db.run("BEGIN TRANSACTION;");

            db.run(
              `INSERT INTO dati
               (prodotto_id, tipo, quantita, prezzo, prezzo_totale_movimento,
                data_movimento, data_registrazione, fattura_doc, fornitore_cliente_id)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                prodotto.id,
                "carico",
                qty,
                prc,
                prezzoTotale,
                data_movimento,
                data_registrazione,
                fattura_doc,
                fornitoreValue,
              ],
              function (err) {
                if (err) {
                  db.run("ROLLBACK;");
                  return reject(err);
                }

                const dati_id = this.lastID;

                db.run(
                  `INSERT INTO lotti
                   (prodotto_id, quantita_iniziale, quantita_rimanente, prezzo,
                    data_carico, data_registrazione, fattura_doc, fornitore, dati_id)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                  [
                    prodotto.id,
                    qty,
                    qty,
                    prc,
                    data_movimento,
                    data_registrazione,
                    fattura_doc,
                    fornitoreValue,
                    dati_id,
                  ],
                  function (err2) {
                    if (err2) {
                      db.run("ROLLBACK;");
                      return reject(err2);
                    }

                    db.run("COMMIT;");
                    const io = req.app.get("io");
                    if (io) {
                      io.emit("movimento_aggiunto", {
                        tipo: "carico",
                        prodotto_id: prodotto.id,
                      });
                      io.emit("magazzino_aggiornato");
                      io.emit("dati_aggiornati");
                      io.emit("prodotti_aggiornati");
                    }
                    resolve();
                  }
                );
              }
            );
          });
        });

        results.success.push({
          code,
          descrizione,
          quantita,
          prezzo,
          data_movimento,
        });
      } catch (errRiga) {
        results.failed.push({
          code: riga.code,
          descrizione: riga.descrizione,
          error: errRiga.message,
        });
      }
    }

    return res.json(results);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});



module.exports = router;
