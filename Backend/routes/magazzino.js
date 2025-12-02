// routes/magazzino.js

const express = require("express")
const router = express.Router()
const { db } = require("../db/init")

// GET - Valore totale del magazzino (FIFO)
router.get("/valore-magazzino", (req, res) => {
  const query = `
    SELECT COALESCE(SUM(quantita_rimanente * prezzo), 0) as valore_totale
    FROM lotti
    WHERE quantita_rimanente > 0
  `

  db.get(query, (err, row) => {
    if (err) return res.status(500).json({ error: err.message })
    res.json({ valore_totale: row.valore_totale || 0 })
  })
})

// GET - Riepilogo per prodotto con marca e descrizione
router.get("/riepilogo", (req, res) => {
  const query = `
    SELECT 
      p.id,
      p.nome,
      m.nome as marca_nome,
      p.descrizione,
      COALESCE(SUM(l.quantita_rimanente), 0) as giacenza,
      COALESCE(SUM(l.quantita_rimanente * l.prezzo), 0) as valore_totale
    FROM prodotti p
    LEFT JOIN marche m ON p.marca_id = m.id
    LEFT JOIN lotti l ON p.id = l.prodotto_id AND l.quantita_rimanente > 0
    GROUP BY p.id, p.nome, m.nome, p.descrizione
    HAVING giacenza >= 0
    ORDER BY p.nome
  `

  db.all(query, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message })

    const queryLotti = `
      SELECT 
        l.prodotto_id,
        l.id,
        l.quantita_rimanente,
        l.prezzo,
        l.data_carico,
        l.fattura_doc,
        l.fornitore
      FROM lotti l
      WHERE l.quantita_rimanente > 0
      ORDER BY l.data_carico ASC, l.id ASC
    `

    db.all(queryLotti, (errLotti, lotti) => {
      if (errLotti) return res.status(500).json({ error: errLotti.message })

      const lottiPerProdotto = {}
      lotti.forEach((lotto) => {
        if (!lottiPerProdotto[lotto.prodotto_id]) {
          lottiPerProdotto[lotto.prodotto_id] = []
        }
        lottiPerProdotto[lotto.prodotto_id].push(lotto)
      })

      const riepilogo = rows.map((row) => ({
        ...row,
        lotti: lottiPerProdotto[row.id] || [],
      }))

      const valoreTotale = riepilogo.reduce((sum, r) => sum + Number.parseFloat(r.valore_totale || 0), 0)

      res.json({
        riepilogo: riepilogo,
        valore_totale: valoreTotale,
      })
    })
  })
})

// GET - Dettaglio Lotti per Prodotto
router.get("/riepilogo/:prodottoId", (req, res) => {
  const { prodottoId } = req.params

  const query = `
    SELECT
      id,
      quantita_rimanente,
      prezzo,
      data_carico,
      fattura_doc,
      fornitore
    FROM lotti
    WHERE prodotto_id = ? AND quantita_rimanente > 0
    ORDER BY data_carico ASC, id ASC
  `

  db.all(query, [prodottoId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message })
    res.json(rows)
  })
})

// GET - Storico giacenza alla data con marca e descrizione
router.get("/storico-giacenza/:date", (req, res) => {
  const historicalDate = req.params.date

  if (!/^\d{4}-\d{2}-\d{2}$/.test(historicalDate)) {
    return res.status(400).json({ error: "Formato data non valido (YYYY-MM-DD)" })
  }

  db.all(
    `SELECT p.id, p.nome, m.nome as marca_nome, p.descrizione 
     FROM prodotti p 
     LEFT JOIN marche m ON p.marca_id = m.id 
     ORDER BY p.nome`,
    (err, prodotti) => {
      if (err) return res.status(500).json({ error: "Errore nel recupero prodotti" })

      const results = []
      let totalValue = 0
      let productsProcessed = 0

      if (prodotti.length === 0) return res.json({ riepilogo: [], valore_totale: 0 })

      prodotti.forEach((prodotto) => {
        const query = `
          SELECT 
            'lotto' as tipo_movimento,
            id,
            quantita_iniziale as quantita,
            prezzo,
            data_carico,
            fattura_doc,
            fornitore,
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
            NULL as fornitore,
            data_registrazione
          FROM dati 
          WHERE prodotto_id = ? AND tipo = 'scarico' AND data_movimento <= ?
          ORDER BY data_registrazione ASC, id ASC
        `

        db.all(query, [prodotto.id, historicalDate, prodotto.id, historicalDate], (err, movimenti) => {
          if (err) {
            console.error(`Errore storico prodotto ${prodotto.id}: ${err.message}`)
            productsProcessed++
            if (productsProcessed === prodotti.length) {
              return res.json({ riepilogo: results, valore_totale: totalValue })
            }
            return
          }

          const lottiAttivi = []
          let totaleGiacenza = 0
          let totaleValore = 0

          movimenti.forEach((mov) => {
            if (mov.tipo_movimento === "lotto") {
              lottiAttivi.push({
                id: mov.id,
                qty_iniziale: mov.quantita,
                qty_rimanente: mov.quantita,
                prezzo: mov.prezzo,
                data_carico: mov.data_carico,
                fattura_doc: mov.fattura_doc,
                fornitore: mov.fornitore,
              })
            } else if (mov.tipo_movimento === "scarico") {
              let qtaDaScaricare = mov.quantita

              for (let i = 0; i < lottiAttivi.length; i++) {
                if (qtaDaScaricare <= 0) break

                const lotto = lottiAttivi[i]
                if (lotto.qty_rimanente <= 0) continue

                const qtaPrelevata = Math.min(qtaDaScaricare, lotto.qty_rimanente)

                lotto.qty_rimanente -= qtaPrelevata
                qtaDaScaricare -= qtaPrelevata
              }
            }
          })

          const lottiRimanenti = lottiAttivi.filter((l) => l.qty_rimanente > 0)

          lottiRimanenti.forEach((l) => {
            totaleGiacenza += l.qty_rimanente
            totaleValore += l.qty_rimanente * l.prezzo
          })

          totalValue += totaleValore

          results.push({
            id: prodotto.id,
            nome: prodotto.nome,
            marca_nome: prodotto.marca_nome,
            descrizione: prodotto.descrizione,
            giacenza: totaleGiacenza,
            valore_totale: totaleValore,
            lotti_storici: lottiRimanenti.map((l) => ({
              id: l.id,
              quantita_rimanente: l.qty_rimanente,
              prezzo: l.prezzo,
              data_carico: l.data_carico,
              fattura_doc: l.fattura_doc,
              fornitore: l.fornitore,
            })),
          })

          productsProcessed++
          if (productsProcessed === prodotti.length) {
            res.json({ riepilogo: results, valore_totale: totalValue })
          }
        })
      })
    },
  )
})

module.exports = router
