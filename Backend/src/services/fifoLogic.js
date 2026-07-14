// Logica FIFO pura: calcoli su lotti senza toccare il database.
// Testabile in isolamento e riusata da carico/scarico/modifica/elimina.
const { formatDecimal } = require("../utils/decimal");

// Somma la giacenza rimanente di una lista di lotti
function giacenzaTotale(lotti) {
  return lotti.reduce(
    (sum, l) => formatDecimal(sum + formatDecimal(l.quantita_rimanente)),
    0,
  );
}

// Calcola lo scarico FIFO su `lotti` per la quantità richiesta.
// `disponibilita` opzionale sovrascrive la quantità rimanente per lotto id.
// Ritorna { updates: [{id, nuova_quantita}], costoTotale }.
function calcolaScaricoFIFO(lotti, quantita, disponibilita = null) {
  let daScaricare = quantita;
  let costoTotale = 0;
  const updates = [];

  for (const lotto of lotti) {
    if (daScaricare <= 0) break;
    const disponibile =
      disponibilita && disponibilita[lotto.id] !== undefined
        ? disponibilita[lotto.id]
        : formatDecimal(lotto.quantita_rimanente);
    const prelevata = Math.min(daScaricare, disponibile);
    const nuovaQta = formatDecimal(disponibile - prelevata);
    updates.push({ id: lotto.id, nuova_quantita: nuovaQta });
    costoTotale = formatDecimal(
      costoTotale + prelevata * formatDecimal(lotto.prezzo),
    );
    daScaricare = formatDecimal(daScaricare - prelevata);
  }

  return { updates, costoTotale };
}

// Calcola come ripristinare `quantita` sui lotti (annullando uno scarico).
// Riempie lo spazio consumato (iniziale - rimanente) in ordine dato.
// Ritorna { updates, mancante } (mancante > 0 se non ripristinabile del tutto).
function calcolaRipristino(lotti, quantita) {
  let daRipristinare = quantita;
  const updates = [];

  for (const lotto of lotti) {
    if (daRipristinare <= 0) break;
    const iniziale = formatDecimal(lotto.quantita_iniziale);
    const rimanente = formatDecimal(lotto.quantita_rimanente);
    const spazio = formatDecimal(iniziale - rimanente);
    const daQuesto = Math.min(daRipristinare, spazio);
    if (daQuesto > 0) {
      updates.push({
        id: lotto.id,
        nuova_quantita: formatDecimal(rimanente + daQuesto),
      });
      daRipristinare = formatDecimal(daRipristinare - daQuesto);
    }
  }

  return { updates, mancante: daRipristinare };
}

// Fonde due liste di update (per lo stesso lotto vince il secondo)
function fondiUpdates(base, sovrascrivi) {
  const risultato = [...base];
  for (const nuovo of sovrascrivi) {
    const i = risultato.findIndex((u) => u.id === nuovo.id);
    if (i >= 0) risultato[i] = nuovo;
    else risultato.push(nuovo);
  }
  return risultato;
}

module.exports = {
  giacenzaTotale,
  calcolaScaricoFIFO,
  calcolaRipristino,
  fondiUpdates,
};
