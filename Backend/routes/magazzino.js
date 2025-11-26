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
        fattura_doc,
        fornitore_cliente_id
      FROM lotti
      WHERE prodotto_id = ? AND quantita_rimanente > 0
      ORDER BY data_carico ASC, id ASC
    `;

    db.all(query, [prodottoId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// =========================================================
// NUOVA ROTTA: STORICO GIA CENZA ALLA DATA
// =========================================================
router.get("/storico-giacenza/:date", (req, res) => {
    const historicalDate = req.params.date;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(historicalDate)) {
        return res.status(400).json({ error: "Formato data storico non valido (YYYY-MM-DD)" });
    }

    // 1. Get all products
    db.all("SELECT id, nome FROM prodotti ORDER BY nome", (err, prodotti) => {
        if (err) return res.status(500).json({ error: "Errore nel recupero prodotti" });

        const results = [];
        let totalValue = 0;
        let productsProcessed = 0;

        if (prodotti.length === 0) return res.json({ riepilogo: [], valore_totale: 0 });

        prodotti.forEach(prodotto => {
            // 2. Get all Lotti (carichi) and Dati (scarichi) up to the historical date, ordinati per l'applicazione FIFO
            const query = `
                SELECT 
                    'lotto' as tipo_movimento,
                    id,
                    quantita_iniziale as quantita,
                    prezzo,
                    data_carico,
                    fattura_doc,
                    fornitore_cliente_id,
                    data_registrazione
                FROM lotti 
                WHERE prodotto_id = ? AND data_carico <= ?
                UNION ALL
                SELECT 
                    'scarico' as tipo_movimento,
                    id,
                    quantita,
                    NULL as prezzo,
                    data_movimento as data_carico,
                    NULL as fattura_doc,
                    NULL as fornitore_cliente_id,
                    data_registrazione
                FROM dati 
                WHERE prodotto_id = ? AND tipo = 'scarico' AND data_movimento <= ?
                ORDER BY data_registrazione ASC, id ASC
            `;
            
            db.all(query, [prodotto.id, historicalDate, prodotto.id, historicalDate], (err, movimenti) => {
                if (err) {
                    console.error(`Errore storico prodotto ${prodotto.id}: ${err.message}`);
                    productsProcessed++;
                    if (productsProcessed === prodotti.length) {
                        return res.json({ riepilogo: results, valore_totale: totalValue });
                    }
                    return;
                }

                // 3. Simula FIFO per calcolare la giacenza netta
                // Contiene tutti i lotti caricati, con le quantità ridotte dagli scarichi storici
                const lottiAttivi = []; 
                let totaleGiacenza = 0;
                let totaleValore = 0;

                movimenti.forEach(mov => {
                    if (mov.tipo_movimento === 'lotto') {
                        // CARICO: Aggiungi un nuovo lotto
                        lottiAttivi.push({
                            id: mov.id,
                            qty_iniziale: mov.quantita,
                            qty_rimanente: mov.quantita,
                            prezzo: mov.prezzo,
                            data_carico: mov.data_carico,
                            fattura_doc: mov.fattura_doc,
                            fornitore_cliente_id: mov.fornitore_cliente_id,
                        });
                    } else if (mov.tipo_movimento === 'scarico') {
                        // SCARICO: Applica FIFO sui lotti attivi
                        let qtaDaScaricare = mov.quantita;

                        // I lottiAttivi sono ordinati per data_registrazione/id (FIFO)
                        for (let i = 0; i < lottiAttivi.length; i++) {
                            if (qtaDaScaricare <= 0) break;
                            
                            const lotto = lottiAttivi[i];
                            // Non scaricare da lotti già esauriti
                            if (lotto.qty_rimanente <= 0) continue; 

                            const qtaPrelevata = Math.min(qtaDaScaricare, lotto.qty_rimanente);
                            
                            lotto.qty_rimanente -= qtaPrelevata;
                            qtaDaScaricare -= qtaPrelevata;
                        }
                    }
                });
                
                // 4. Calcola totali finali e prepara il risultato
                const lottiRimanenti = lottiAttivi.filter(l => l.qty_rimanente > 0);
                
                lottiRimanenti.forEach(l => {
                    totaleGiacenza += l.qty_rimanente;
                    totaleValore += l.qty_rimanente * l.prezzo;
                });
                
                totalValue += totaleValore;

                results.push({
                    id: prodotto.id,
                    nome: prodotto.nome,
                    giacenza: totaleGiacenza,
                    valore_totale: totaleValore,
                    // Dati per il modale di dettaglio
                    lotti_storici: lottiRimanenti.map(l => ({
                        id: l.id,
                        quantita_rimanente: l.qty_rimanente,
                        prezzo: l.prezzo,
                        data_carico: l.data_carico,
                        fattura_doc: l.fattura_doc,
                        fornitore_cliente_id: l.fornitore_cliente_id,
                    }))
                });

                productsProcessed++;
                if (productsProcessed === prodotti.length) {
                    res.json({ riepilogo: results, valore_totale: totalValue });
                }
            });
        });
    });
});


module.exports = router;