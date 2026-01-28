// routes/dati.js - movimenti con vincoli su lotti (FIFO)

const express = require("express");
const router = express.Router();
const { db } = require("../db/init");

// Helper per decimali a 2 cifre
function formatDecimal(value) {
  if (value === null || value === undefined) return null;
  const num = parseFloat(value);
  if (isNaN(num)) return null;
  return parseFloat(num.toFixed(2));
}

// ========================= GET /api/dati =========================
// Lista tutti i movimenti con marca e descrizione
router.get("/", (req, res) => {
  const query = `
    SELECT
      d.id,
      d.prodotto_id,
      p.nome AS prodotto_nome,
      m.nome AS marca_nome,
      p.descrizione AS prodotto_descrizione,
      d.tipo,
      d.quantita,
      d.prezzo,
      d.prezzo_totale_movimento AS prezzo_totale_movimento,
      CASE
        WHEN d.tipo = 'scarico'
          AND d.prezzo_totale_movimento IS NOT NULL
          AND d.quantita > 0
        THEN d.prezzo_totale_movimento / d.quantita
        ELSE NULL
      END AS prezzo_unitario_scarico,
      d.data_movimento,
      d.data_registrazione,
      d.fattura_doc,
      d.fornitore_cliente_id
    FROM dati d
      JOIN prodotti p ON d.prodotto_id = p.id
      LEFT JOIN marche m ON p.marca_id = m.id
    ORDER BY
      d.data_movimento DESC,
      p.nome ASC,
      d.tipo ASC,
      d.data_registrazione DESC,
      d.id DESC
  `;

  db.all(query, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });

    const formattedRows = rows.map((row) => ({
      ...row,
      quantita: formatDecimal(row.quantita),
      prezzo: formatDecimal(row.prezzo),
      prezzo_totale_movimento: formatDecimal(row.prezzo_totale_movimento),
      prezzo_unitario_scarico: formatDecimal(row.prezzo_unitario_scarico),
    }));

    res.json(formattedRows);
  });
});

// ========================= POST /api/dati =========================
// Nuovo movimento (carico o scarico)
router.post("/", (req, res) => {
  const {
    prodotto_id,
    tipo,
    quantita,
    prezzo,          // solo per carico
    data_movimento,
    fattura_doc,     // obbligatori per carico
    fornitore,       // obbligatori per carico
  } = req.body;

  if (!prodotto_id || !tipo || !quantita || !data_movimento) {
    return res
      .status(400)
      .json({ error: "Prodotto, tipo, quantità e data sono obbligatori" });
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(data_movimento)) {
    return res
      .status(400)
      .json({ error: "Formato data non valido (YYYY-MM-DD)" });
  }

  const qta = formatDecimal(String(quantita).replace(",", "."));
  if (qta === null || qta <= 0) {
    return res
      .status(400)
      .json({ error: "La quantità deve essere maggiore di 0" });
  }

  const now = new Date().toISOString();

  // ================= CARICO =================
  if (tipo === "carico") {
    const prezzoNum = formatDecimal(String(prezzo).replace(",", "."));
    if (prezzoNum === null || prezzoNum <= 0) {
      return res
        .status(400)
        .json({ error: "Il prezzo deve essere maggiore di 0 per i carichi" });
    }

    if (!fattura_doc || !fornitore) {
      return res.status(400).json({
        error: "Documento e Fornitore sono obbligatori per i carichi",
      });
    }

    const prezzoTotale = formatDecimal(prezzoNum * qta);

    db.serialize(() => {
      db.run("BEGIN TRANSACTION;");

      // Inserisci movimento
      db.run(
        `INSERT INTO dati (
          prodotto_id,
          tipo,
          quantita,
          prezzo,
          prezzo_totale_movimento,
          data_movimento,
          data_registrazione,
          fattura_doc,
          fornitore_cliente_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          prodotto_id,
          "carico",
          qta,
          prezzoNum,
          prezzoTotale,
          data_movimento,
          now,
          fattura_doc,
          fornitore,
        ],
        function (err) {
          if (err) {
            db.run("ROLLBACK;");
            return res.status(500).json({ error: err.message });
          }

          const datiId = this.lastID;

          // Inserisci lotto collegato
          db.run(
            `INSERT INTO lotti (
              prodotto_id,
              dati_id,
              quantita_iniziale,
              quantita_rimanente,
              prezzo,
              data_carico,
              data_registrazione,
              fattura_doc,
              fornitore
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              prodotto_id,
              datiId,
              qta,
              qta,
              prezzoNum,
              data_movimento,
              now,
              fattura_doc,
              fornitore,
            ],
            (err2) => {
              if (err2) {
                db.run("ROLLBACK;");
                return res.status(500).json({ error: err2.message });
              }

              db.run("COMMIT;");
              const io = req.app.get("io");
              if (io) {
                io.emit("movimento_creato", {
                  tipo: "carico",
                  prodotto_id,
                });
                io.emit("magazzino_aggiornato");
                io.emit("dati_aggiornati");
              }

              res.json({
                success: true,
                message: "Carico registrato con successo",
                id: datiId,
              });
            }
          );
        }
      );
    });
  }

  // ================= SCARICO =================
  else if (tipo === "scarico") {
    // Niente prezzo, fattura_doc, fornitore obbligatori per scarico
    // Controllo giacenza disponibile (FIFO alla data_movimento)

    db.all(
      `SELECT id, quantita_rimanente, prezzo, data_carico, data_registrazione
       FROM lotti
       WHERE prodotto_id = ?
         AND data_carico <= ?
       ORDER BY data_carico ASC, data_registrazione ASC`,
      [prodotto_id, data_movimento],
      (err, lottiDisponibili) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        if (lottiDisponibili.length === 0) {
          const [anno, mese, giorno] = data_movimento.split("-");
          const dataItaliana = `${giorno}/${mese}/${anno}`;
          return res.status(400).json({
            error: `Nessun carico disponibile alla data ${dataItaliana}. Verifica di aver caricato il prodotto prima o nella stessa data dello scarico.`,
          });
        }

        // Giacenza disponibile
        let giacenzaDisponibile = 0;
        lottiDisponibili.forEach((l) => {
          giacenzaDisponibile = formatDecimal(
            giacenzaDisponibile +
              formatDecimal(l.quantita_rimanente)
          );
        });

        if (giacenzaDisponibile < qta) {
          const giacenzaFormattata = (
            giacenzaDisponibile % 1 === 0
              ? giacenzaDisponibile.toFixed(0)
              : giacenzaDisponibile.toFixed(2)
          ).replace(".", ",");
          const qtyFormattata = (
            qta % 1 === 0 ? qta.toFixed(0) : qta.toFixed(2)
          ).replace(".", ",");
          return res.status(400).json({
            error: `Giacenza insufficiente. Disponibili: ${giacenzaFormattata} - Richiesti: ${qtyFormattata}`,
          });
        }

        // Calcola scarico FIFO
        let daScaricare = qta;
        let costoTotaleScarico = 0;
        const updatesLotti = [];

        for (const lotto of lottiDisponibili) {
          if (daScaricare <= 0) break;

          const qtaRimanente = formatDecimal(
            lotto.quantita_rimanente
          );
          const qtaDaQuestoLotto = Math.min(
            daScaricare,
            qtaRimanente
          );
          const nuovaQta = formatDecimal(
            qtaRimanente - qtaDaQuestoLotto
          );

          updatesLotti.push({
            id: lotto.id,
            nuova_quantita: nuovaQta,
          });

          costoTotaleScarico = formatDecimal(
            costoTotaleScarico +
              qtaDaQuestoLotto * formatDecimal(lotto.prezzo)
          );
          daScaricare = formatDecimal(
            daScaricare - qtaDaQuestoLotto
          );
        }

        db.serialize(() => {
          db.run("BEGIN TRANSACTION;");

          // Inserisci movimento scarico
          db.run(
            `INSERT INTO dati (
              prodotto_id,
              tipo,
              quantita,
              prezzo,
              prezzo_totale_movimento,
              data_movimento,
              data_registrazione,
              fattura_doc,
              fornitore_cliente_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              prodotto_id,
              "scarico",
              qta,
              null,
              costoTotaleScarico,
              data_movimento,
              now,
              null,
              null,
            ],
            function (err) {
              if (err) {
                db.run("ROLLBACK;");
                return res.status(500).json({ error: err.message });
              }

              const datiId = this.lastID;

              // Aggiorna lotti
              let updatesCompleted = 0;
              const totalUpdates = updatesLotti.length;

              if (totalUpdates === 0) {
                db.run("COMMIT;");
                const io = req.app.get("io");
                if (io) {
                  io.emit("movimento_creato", {
                    tipo: "scarico",
                    prodotto_id,
                  });
                  io.emit("magazzino_aggiornato");
                  io.emit("dati_aggiornati");
                }
                return res.json({
                  success: true,
                  message: "Scarico registrato con successo",
                  id: datiId,
                  costo_totale_scarico: costoTotaleScarico,
                });
              }

              updatesLotti.forEach((u) => {
                db.run(
                  "UPDATE lotti SET quantita_rimanente = ? WHERE id = ?",
                  [u.nuova_quantita, u.id],
                  (err2) => {
                    if (err2) {
                      db.run("ROLLBACK;");
                      return res
                        .status(500)
                        .json({ error: err2.message });
                    }
                    updatesCompleted++;
                    if (updatesCompleted === totalUpdates) {
                      db.run("COMMIT;");
                      const io = req.app.get("io");
                      if (io) {
                        io.emit("movimento_creato", {
                          tipo: "scarico",
                          prodotto_id,
                        });
                        io.emit("magazzino_aggiornato");
                        io.emit("dati_aggiornati");
                      }
                      return res.json({
                        success: true,
                        message: "Scarico registrato con successo",
                        id: datiId,
                        costo_totale_scarico: costoTotaleScarico,
                      });
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

  // tipo non valido
  else {
    return res.status(400).json({ error: "Tipo movimento non valido" });
  }
});

// ========================= PUT /api/dati/:id =========================
// Modifica movimento (carico o scarico) con vincoli
router.put("/:id", (req, res) => {
  const { id } = req.params;
  const { quantita, prezzo, data_movimento, fattura_doc, fornitore } =
    req.body;

  db.get(
    "SELECT * FROM dati WHERE id = ?",
    [id],
    (err, movimentoOriginale) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (!movimentoOriginale) {
        return res.status(404).json({ error: "Movimento non trovato" });
      }

      const { prodotto_id, tipo } = movimentoOriginale;

      if (!quantita || !data_movimento) {
        return res.status(400).json({
          error: "Quantità e data movimento sono obbligatori",
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

      // ---------- MODIFICA CARICO ----------
      if (tipo === "carico") {
        const prezzoString = String(prezzo).replace(",", ".");
        const prc = formatDecimal(prezzoString);
        if (prc === null || prc <= 0) {
          return res.status(400).json({
            error: "Prezzo obbligatorio e maggiore di 0 per il carico",
          });
        }

        db.get(
          "SELECT * FROM lotti WHERE dati_id = ?",
          [id],
          (err2, lotto) => {
            if (err2) {
              return res.status(500).json({ error: err2.message });
            }
            if (!lotto) {
              return res
                .status(404)
                .json({ error: "Lotto collegato non trovato" });
            }

            const qtaIniziale = formatDecimal(
              lotto.quantita_iniziale
            );
            const qtaRimanente = formatDecimal(
              lotto.quantita_rimanente
            );
            const qtaConsumata = formatDecimal(
              qtaIniziale - qtaRimanente
            );

            if (qty < qtaConsumata) {
              const qtaConsumataFormattata = (
                qtaConsumata % 1 === 0
                  ? qtaConsumata.toFixed(0)
                  : qtaConsumata.toFixed(2)
              ).replace(".", ",");
              const qtyFormattata = (
                qty % 1 === 0 ? qty.toFixed(0) : qty.toFixed(2)
              ).replace(".", ",");
              return res.status(400).json({
                error: `Impossibile ridurre la quantità a ${qtyFormattata}: sono già stati scaricati ${qtaConsumataFormattata} pezzi da questo carico.`,
              });
            }

            const nuovaQtaRimanente = formatDecimal(qty - qtaConsumata);
            const prezzoTotale = formatDecimal(prc * qty);

            db.serialize(() => {
              db.run("BEGIN TRANSACTION;");

              db.run(
                `UPDATE dati
                 SET quantita = ?,
                     prezzo = ?,
                     prezzo_totale_movimento = ?,
                     data_movimento = ?,
                     fattura_doc = ?,
                     fornitore_cliente_id = ?
                 WHERE id = ?`,
                [
                  qty,
                  prc,
                  prezzoTotale,
                  data_movimento,
                  fattura_doc,
                  fornitore || null,
                  id,
                ],
                (err3) => {
                  if (err3) {
                    db.run("ROLLBACK;");
                    return res
                      .status(500)
                      .json({ error: err3.message });
                  }

                  db.run(
                    `UPDATE lotti
                     SET quantita_iniziale = ?,
                         quantita_rimanente = ?,
                         prezzo = ?,
                         data_carico = ?,
                         fattura_doc = ?,
                         fornitore = ?
                     WHERE id = ?`,
                    [
                      qty,
                      nuovaQtaRimanente,
                      prc,
                      data_movimento,
                      fattura_doc,
                      fornitore || null,
                      lotto.id,
                    ],
                    (err4) => {
                      if (err4) {
                        db.run("ROLLBACK;");
                        return res
                          .status(500)
                          .json({ error: err4.message });
                      }

                      db.run("COMMIT;");
                      const io = req.app.get("io");
                      if (io) {
                        io.emit("movimento_modificato", {
                          tipo: "carico",
                          prodotto_id,
                        });
                        io.emit("magazzino_aggiornato");
                        io.emit("dati_aggiornati");
                      }

                      return res.json({
                        success: true,
                        message: "Carico modificato con successo",
                      });
                    }
                  );
                }
              );
            });
          }
        );
      }

      // ---------- MODIFICA SCARICO ----------
      else if (tipo === "scarico") {
        const qtaOriginale = formatDecimal(
          movimentoOriginale.quantita
        );
        const dataOriginale = movimentoOriginale.data_movimento;

        // 1) ripristina scarico originale
        db.all(
          `SELECT id, quantita_iniziale, quantita_rimanente, data_carico, data_registrazione
           FROM lotti
           WHERE prodotto_id = ?
             AND data_carico <= ?
           ORDER BY data_carico ASC, data_registrazione ASC`,
          [prodotto_id, dataOriginale],
          (err2, lottiPerRipristino) => {
            if (err2) {
              return res.status(500).json({ error: err2.message });
            }

            let qtaDaRipristinare = qtaOriginale;
            const updateRipristino = [];

            for (const lotto of lottiPerRipristino) {
              if (qtaDaRipristinare <= 0) break;

              const qtaIniziale = formatDecimal(
                lotto.quantita_iniziale
              );
              const qtaRimanente = formatDecimal(
                lotto.quantita_rimanente
              );
              const spazioDisponibile = formatDecimal(
                qtaIniziale - qtaRimanente
              );
              const qtaDaQuestoLotto = Math.min(
                qtaDaRipristinare,
                spazioDisponibile
              );

              if (qtaDaQuestoLotto > 0) {
                const nuovaQta = formatDecimal(
                  qtaRimanente + qtaDaQuestoLotto
                );
                updateRipristino.push({
                  id: lotto.id,
                  nuova_quantita: nuovaQta,
                });
                qtaDaRipristinare = formatDecimal(
                  qtaDaRipristinare - qtaDaQuestoLotto
                );
              }
            }

            // 2) verifica giacenza alla nuova data
            db.all(
              `SELECT id, quantita_rimanente, prezzo, data_carico, data_registrazione
               FROM lotti
               WHERE prodotto_id = ?
                 AND data_carico <= ?
               ORDER BY data_carico ASC, data_registrazione ASC`,
              [prodotto_id, data_movimento],
              (err3, lottiDisponibili) => {
                if (err3) {
                  return res
                    .status(500)
                    .json({ error: err3.message });
                }

                if (lottiDisponibili.length === 0) {
                  const [anno, mese, giorno] =
                    data_movimento.split("-");
                  const dataItaliana = `${giorno}/${mese}/${anno}`;
                  return res.status(400).json({
                    error: `Nessun carico disponibile alla data ${dataItaliana}. Verifica di aver caricato il prodotto prima o nella stessa data dello scarico.`,
                  });
                }

                const mappaLotti = {};
                lottiDisponibili.forEach((l) => {
                  mappaLotti[l.id] = formatDecimal(
                    l.quantita_rimanente
                  );
                });
                updateRipristino.forEach((u) => {
                  if (mappaLotti[u.id] !== undefined) {
                    mappaLotti[u.id] = u.nuova_quantita;
                  }
                });

                let giacenzaDisponibile = 0;
                Object.values(mappaLotti).forEach((qta) => {
                  giacenzaDisponibile = formatDecimal(
                    giacenzaDisponibile + qta
                  );
                });

                if (giacenzaDisponibile < qty) {
                  const giacenzaFormattata = (
                    giacenzaDisponibile % 1 === 0
                      ? giacenzaDisponibile.toFixed(0)
                      : giacenzaDisponibile.toFixed(2)
                  ).replace(".", ",");
                  const qtyFormattata = (
                    qty % 1 === 0 ? qty.toFixed(0) : qty.toFixed(2)
                  ).replace(".", ",");
                  return res.status(400).json({
                    error: `Giacenza insufficiente alla data indicata. Disponibili: ${giacenzaFormattata} - Richiesti: ${qtyFormattata}`,
                  });
                }

                // 3) calcola nuovo scarico FIFO
                let daScaricare = qty;
                let costoTotaleScarico = 0;
                const updateNuovoScarico = [];

                for (const lotto of lottiDisponibili) {
                  if (daScaricare <= 0) break;

                  let qtaDisponibileLotto = mappaLotti[lotto.id];
                  const qtaDaQuestoLotto = Math.min(
                    daScaricare,
                    qtaDisponibileLotto
                  );
                  const nuovaQta = formatDecimal(
                    qtaDisponibileLotto - qtaDaQuestoLotto
                  );

                  updateNuovoScarico.push({
                    id: lotto.id,
                    nuova_quantita: nuovaQta,
                  });

                  costoTotaleScarico = formatDecimal(
                    costoTotaleScarico +
                      qtaDaQuestoLotto *
                        formatDecimal(lotto.prezzo)
                  );
                  daScaricare = formatDecimal(
                    daScaricare - qtaDaQuestoLotto
                  );
                }

                // 4) transazione aggiornamento
                db.serialize(() => {
                  db.run("BEGIN TRANSACTION;");

                  db.run(
                    `UPDATE dati
                     SET quantita = ?,
                         prezzo_totale_movimento = ?,
                         data_movimento = ?,
                         fattura_doc = ?
                     WHERE id = ?`,
                    [
                      qty,
                      costoTotaleScarico,
                      data_movimento,
                      fattura_doc,
                      id,
                    ],
                    (err4) => {
                      if (err4) {
                        db.run("ROLLBACK;");
                        return res
                          .status(500)
                          .json({ error: err4.message });
                      }

                      const tuttiGliUpdates = [
                        ...updateRipristino,
                      ];
                      updateNuovoScarico.forEach((nuovo) => {
                        const index = tuttiGliUpdates.findIndex(
                          (u) => u.id === nuovo.id
                        );
                        if (index >= 0) {
                          tuttiGliUpdates[index] = nuovo;
                        } else {
                          tuttiGliUpdates.push(nuovo);
                        }
                      });

                      let updatesCompleted = 0;
                      const totalUpdates =
                        tuttiGliUpdates.length;

                      if (totalUpdates === 0) {
                        db.run("COMMIT;");
                        const io = req.app.get("io");
                        if (io) {
                          io.emit("movimento_modificato", {
                            tipo: "scarico",
                            prodotto_id,
                          });
                          io.emit("magazzino_aggiornato");
                          io.emit("dati_aggiornati");
                        }
                        return res.json({
                          success: true,
                          message:
                            "Scarico modificato con successo",
                          costo_totale_scarico: costoTotaleScarico,
                        });
                      }

                      tuttiGliUpdates.forEach((u) => {
                        db.run(
                          "UPDATE lotti SET quantita_rimanente = ? WHERE id = ?",
                          [u.nuova_quantita, u.id],
                          (err5) => {
                            if (err5) {
                              db.run("ROLLBACK;");
                              return res.status(500).json({
                                error: err5.message,
                              });
                            }
                            updatesCompleted++;
                            if (
                              updatesCompleted === totalUpdates
                            ) {
                              db.run("COMMIT;");
                              const io = req.app.get("io");
                              if (io) {
                                io.emit(
                                  "movimento_modificato",
                                  {
                                    tipo: "scarico",
                                    prodotto_id,
                                  }
                                );
                                io.emit(
                                  "magazzino_aggiornato"
                                );
                                io.emit("dati_aggiornati");
                              }
                              return res.json({
                                success: true,
                                message:
                                  "Scarico modificato con successo",
                                costo_totale_scarico:
                                  costoTotaleScarico,
                              });
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
        );
      }
    }
  );
});

// ========================= DELETE /api/dati/:id =========================
// Elimina movimento con ripristino lotti
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
          return res
            .status(404)
            .json({ error: "Movimento non trovato" });
        }

        const { prodotto_id, tipo, quantita } = movimento;
        const qty = formatDecimal(quantita);

        // ----- delete carico -----
        if (tipo === "carico") {
          const lottoQuery = `
            SELECT id, quantita_rimanente, quantita_iniziale
            FROM lotti
            WHERE dati_id = ? AND prodotto_id = ?
            LIMIT 1
          `;
          db.get(
            lottoQuery,
            [id, prodotto_id],
            (err2, lotto) => {
              if (err2) {
                db.run("ROLLBACK;");
                return res
                  .status(500)
                  .json({ error: err2.message });
              }

              const qtaRimanente = formatDecimal(
                lotto?.quantita_rimanente
              );
              const qtaIniziale = formatDecimal(
                lotto?.quantita_iniziale
              );

              if (!lotto || qtaRimanente !== qtaIniziale) {
                db.run("ROLLBACK;");
                return res.status(400).json({
                  error:
                    "Impossibile eliminare: il lotto è stato parzialmente o totalmente scaricato.",
                });
              }

              db.run(
                "DELETE FROM lotti WHERE id = ?",
                [lotto.id],
                (err3) => {
                  if (err3) {
                    db.run("ROLLBACK;");
                    return res.status(500).json({
                      error: err3.message,
                    });
                  }

                  db.run(
                    "DELETE FROM dati WHERE id = ?",
                    [id],
                    (err4) => {
                      if (err4) {
                        db.run("ROLLBACK;");
                        return res.status(500).json({
                          error: err4.message,
                        });
                      }

                      db.run("COMMIT;");
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
                        message:
                          "Carico eliminato con successo",
                      });
                    }
                  );
                }
              );
            }
          );
        }

        // ----- delete scarico -----
        else if (tipo === "scarico") {
          let qtaDaRipristinare = qty;

          const lottiQuery = `
            SELECT id, quantita_iniziale, quantita_rimanente
            FROM lotti
            WHERE prodotto_id = ?
            ORDER BY data_registrazione DESC
          `;
          db.all(
            lottiQuery,
            [prodotto_id],
            (err2, lotti) => {
              if (err2) {
                db.run("ROLLBACK;");
                return res
                  .status(500)
                  .json({ error: err2.message });
              }

              const updates = [];

              for (const lotto of lotti) {
                if (qtaDaRipristinare <= 0) break;

                const qtaIniziale = formatDecimal(
                  lotto.quantita_iniziale
                );
                const qtaRimanente = formatDecimal(
                  lotto.quantita_rimanente
                );
                const qtaConsumata = formatDecimal(
                  qtaIniziale - qtaRimanente
                );
                const qtaDaQuestoLotto = Math.min(
                  qtaDaRipristinare,
                  qtaConsumata
                );

                if (qtaDaQuestoLotto > 0) {
                  const nuovaQta = formatDecimal(
                    qtaRimanente + qtaDaQuestoLotto
                  );
                  updates.push({
                    id: lotto.id,
                    nuova_quantita: nuovaQta,
                  });
                  qtaDaRipristinare = formatDecimal(
                    qtaDaRipristinare - qtaDaQuestoLotto
                  );
                }
              }

              if (qtaDaRipristinare > 0) {
                db.run("ROLLBACK;");
                return res.status(400).json({
                  error:
                    "Impossibile ripristinare completamente la quantità",
                });
              }

              let updatesCompleted = 0;
              const totalUpdates = updates.length;

              const handleUpdateComplete = () => {
                updatesCompleted++;
                if (updatesCompleted === totalUpdates) {
                  db.run(
                    "DELETE FROM dati WHERE id = ?",
                    [id],
                    (err3) => {
                      if (err3) {
                        db.run("ROLLBACK;");
                        return res.status(500).json({
                          error: err3.message,
                        });
                      }

                      db.run("COMMIT;");
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
                        message:
                          "Scarico eliminato con successo",
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
                    (err3) => {
                      if (err3) {
                        db.run("ROLLBACK;");
                        if (!res.headersSent) {
                          return res.status(500).json({
                            error: err3.message,
                          });
                        }
                        return;
                      }
                      handleUpdateComplete();
                    }
                  );
                });
              }
            }
          );
        }
      }
    );
  });
});

module.exports = router;
