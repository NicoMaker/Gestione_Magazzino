// services/fifo.js — algoritmo FIFO puro (nessun accesso a DB o rete).
// Riceve i lotti già letti e ritorna gli aggiornamenti da applicare.
const { formatDecimal } = require("../utils/format");

// Somma la giacenza rimanente di una lista di lotti
function giacenzaDisponibile(lotti) {
  return lotti.reduce(
    (sum, l) => formatDecimal(sum + formatDecimal(l.quantita_rimanente)),
    0,
  );
}

// Calcola lo scarico FIFO su lotti disponibili.
// Ritorna { updates: [{id, nuova_quantita}], costoTotale }.
// Presuppone che la giacenza sia già stata verificata sufficiente.
function calcolaScaricoFIFO(lotti, quantita) {
  let daScaricare = quantita;
  let costoTotale = 0;
  const updates = [];

  for (const lotto of lotti) {
    if (daScaricare <= 0) break;
    const qtaRimanente = formatDecimal(lotto.quantita_rimanente);
    const qtaDaQuestoLotto = Math.min(daScaricare, qtaRimanente);
    const nuovaQta = formatDecimal(qtaRimanente - qtaDaQuestoLotto);

    updates.push({ id: lotto.id, nuova_quantita: nuovaQta });
    costoTotale = formatDecimal(
      costoTotale + qtaDaQuestoLotto * formatDecimal(lotto.prezzo),
    );
    daScaricare = formatDecimal(daScaricare - qtaDaQuestoLotto);
  }

  return { updates, costoTotale };
}

// Calcola il ripristino della giacenza (quando si annulla/modifica uno scarico),
// riempiendo i lotti nell'ordine dato fino a esaurire la quantità.
// Ritorna { updates, residuo } dove residuo>0 = impossibile ripristinare tutto.
function calcolaRipristino(lotti, quantita) {
  let daRipristinare = quantita;
  const updates = [];

  for (const lotto of lotti) {
    if (daRipristinare <= 0) break;
    const qtaIniziale = formatDecimal(lotto.quantita_iniziale);
    const qtaRimanente = formatDecimal(lotto.quantita_rimanente);
    const spazioDisponibile = formatDecimal(qtaIniziale - qtaRimanente);
    const qtaDaQuestoLotto = Math.min(daRipristinare, spazioDisponibile);

    if (qtaDaQuestoLotto > 0) {
      updates.push({
        id: lotto.id,
        nuova_quantita: formatDecimal(qtaRimanente + qtaDaQuestoLotto),
      });
      daRipristinare = formatDecimal(daRipristinare - qtaDaQuestoLotto);
    }
  }

  return { updates, residuo: daRipristinare };
}

module.exports = {
  giacenzaDisponibile,
  calcolaScaricoFIFO,
  calcolaRipristino,
};
