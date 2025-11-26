// routes/dati.js (Modificato)

const express = require("express");
const router = express.Router();
const { db } = require("../db/init");

// GET - Lista tutti i movimenti
router.get("/", (req, res) => {
  const query = `
    SELECT 
      d.id,
      d.prodotto_id,
      p.nome as prodotto_nome,
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
    ORDER BY d.data_registrazione DESC, d.id DESC
  `;
  db.all(query, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// POST - Crea nuovo movimento (carico o scarico)
router.post("/", (req, res) => {
  const { prodotto_id, tipo, quantita, prezzo, data_movimento, fattura_doc, fornitore_cliente_id } = req.body;

  if (!prodotto_id || !tipo || !quantita || !data_movimento) {
    return res.status(400).json({ 
      error: "Prodotto, tipo, quantità e data movimento sono obbligatori" 
    });
  }
  
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data_movimento)) {
    return res.status(400).json({ error: "Formato data non valido (YYYY-MM-DD)" });
  }

  const qty = parseInt(quantita);

  if (qty <= 0) {
    return res.status(400).json({ error: "Quantità deve essere maggiore di 0" });
  }
  
  const data_registrazione = new Date().toISOString();

  if (tipo === "carico") {
    let prezzoString = String(prezzo).replace(",", ".");
    const prc = parseFloat(prezzoString); 

    if (isNaN(prc) || prc <= 0) {
      return res.status(400).json({ 
        error: "Prezzo obbligatorio e maggiore di 0 per il carico" 
      });
    }

    const prezzoTotale = prc * qty;
    
    // Transazione per garantire l'atomicità tra l'inserimento del movimento e la creazione del lotto
    db.serialize(() => {
      db.run("BEGIN TRANSACTION;");

      // 1. Inserimento Movimento (dati)
      db.run(
        "INSERT INTO dati (prodotto_id, tipo, quantita, prezzo, prezzo_totale_movimento, data_movimento, data_registrazione, fattura_doc, fornitore_cliente_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [prodotto_id, tipo, qty, prc, prezzoTotale, data_movimento, data_registrazione, fattura_doc, fornitore_cliente_id],
        function (err) {
          if (err) { db.run("ROLLBACK;"); return res.status(500).json({ error: err.message }); }
          const dati_id = this.lastID; // ID del movimento appena creato

          // 2. Inserimento Lotto (lotti)
          db.run(
            "INSERT INTO lotti (prodotto_id, quantita_iniziale, quantita_rimanente, prezzo, data_carico, data_registrazione, fattura_doc, fornitore_cliente_id, dati_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [prodotto_id, qty, qty, prc, data_movimento, data_registrazione, fattura_doc, fornitore_cliente_id, dati_id],
            function (err) {
              if (err) { db.run("ROLLBACK;"); return res.status(500).json({ error: err.message }); }
              db.run("COMMIT;");
              res.json({ id: dati_id, lotto_id: this.lastID });
            }
          );
        }
      );
    });

  } else {
    // SCARICO - usa FIFO
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
          return res.status(400).json({
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

        db.serialize(() => { // Transazione per garantire l'aggiornamento dei lotti e l'inserimento del movimento
          db.run("BEGIN TRANSACTION;");

          // 1. Inserimento Movimento (dati)
          db.run(
            "INSERT INTO dati (prodotto_id, tipo, quantita, prezzo, prezzo_totale_movimento, data_movimento, data_registrazione, fattura_doc, fornitore_cliente_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [prodotto_id, tipo, qty, null, costoTotaleScarico, data_movimento, data_registrazione, fattura_doc, fornitore_cliente_id],
            function (err) {
              if (err) { db.run("ROLLBACK;"); return res.status(500).json({ error: err.message }); }
            
              // 2. Aggiornamento Lotti (FIFO)
              let updatesCompleted = 0;
              const totalUpdates = updates.length;

              if (totalUpdates === 0) {
                  db.run("COMMIT;");
                  return res.json({ success: true, costo_totale_scarico: costoTotaleScarico });
              }

              updates.forEach((u) => {
                db.run("UPDATE lotti SET quantita_rimanente = ? WHERE id = ?", [
                  u.nuova_quantita,
                  u.id,
                ], (err) => {
                  if (err) { 
                    if (!res.headersSent) { // Previene multiple risposte
                      db.run("ROLLBACK;"); 
                      return res.status(500).json({ error: `Errore durante l'aggiornamento del lotto ${u.id}: ${err.message}` });
                    }
                  } else {
                    updatesCompleted++;
                    if (updatesCompleted === totalUpdates) {
                        db.run("COMMIT;");
                        return res.json({ success: true, costo_totale_scarico: costoTotaleScarico });
                    }
                  }
                });
              });
            }
          );
        });
      }
    );
  }
});

// DELETE - Elimina movimento
router.delete("/:id", (req, res) => {
  const { id } = req.params;

  db.serialize(() => {
    db.run("BEGIN TRANSACTION;");

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
          // Ricerca del lotto tramite il nuovo link dati_id
          const lottoQuery = `
            SELECT id, quantita_rimanente, quantita_iniziale
            FROM lotti
            WHERE dati_id = ? 
            AND prodotto_id = ?
            LIMIT 1
          `;

          db.get(
            lottoQuery,
            [id, prodotto_id], // Si usa l'ID del movimento
            (err, lotto) => {
              if (err) {
                db.run("ROLLBACK;");
                return res.status(500).json({
                  error: `Errore durante la ricerca del lotto: ${err.message}`,
                });
              }

              if (!lotto || lotto.quantita_rimanente !== lotto.quantita_iniziale) {
                db.run("ROLLBACK;");
                return res.status(400).json({
                  error: "Impossibile eliminare: il lotto di questo carico è stato parzialmente o totalmente scaricato.",
                });
              }

              db.run("DELETE FROM lotti WHERE id = ?", [lotto.id], (err) => {
                if (err) {
                  db.run("ROLLBACK;");
                  return res.status(500).json({
                    error: `Errore durante l'eliminazione del lotto: ${err.message}`,
                  });
                }

                db.run("DELETE FROM dati WHERE id = ?", [id], function (err) {
                  if (err) {
                    db.run("ROLLBACK;");
                    return res.status(500).json({
                      error: `Errore durante l'eliminazione del dato: ${err.message}`,
                    });
                  }

                  db.run("COMMIT;");
                  res.json({
                    success: true,
                    message: "Carico e lotto associato eliminati con successo.",
                  });
                });
              });
            }
          );
        } else if (tipo === "scarico") {
          let qtaDaRipristinare = quantita;
          
          // Per annullare uno scarico FIFO, ripristiniamo le quantità sui lotti
          // consumati, procedendo dal lotto più recente (quello consumato per ultimo).
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

              // Quantità effettivamente consumata da questo lotto in totale
              const qtaConsumata = lotto.quantita_iniziale - lotto.quantita_rimanente;
              // Quantità da ripristinare su questo lotto (minore tra quanto manca e quanto è stato consumato)
              const qtaDaQuestoLotto = Math.min(qtaDaRipristinare, qtaConsumata);

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
                db.run("DELETE FROM dati WHERE id = ?", [id], function (err) {
                  if (err) {
                    db.run("ROLLBACK;");
                    return res.status(500).json({
                      error: `Errore durante l'eliminazione del dato: ${err.message}`,
                    });
                  }

                  db.run("COMMIT;");
                  res.json({
                    success: true,
                    message: "Scarico annullato e lotti ripristinati con successo.",
                  });
                });
              }
            };

            if (totalUpdates === 0) {
              // Se non ci sono lotti da aggiornare, si elimina solo il dato (caso limite)
              handleUpdateComplete(); 
            } else {
              updates.forEach((u) => {
                db.run(
                  "UPDATE lotti SET quantita_rimanente = ? WHERE id = ?",
                  [u.nuova_quantita, u.id],
                  (err) => {
                    if (err) {
                      db.run("ROLLBACK;");
                      // Qui, se fallisce un aggiornamento, potremmo aver già inviato una risposta
                      if (!res.headersSent) {
                          return res.status(500).json({
                            error: `Errore durante il ripristino del lotto ${u.id}: ${err.message}`,
                          });
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

module.exports = router;