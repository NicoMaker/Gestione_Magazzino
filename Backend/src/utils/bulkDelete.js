// Eliminazione multipla "best effort".
//
// Per ogni id selezionato prova l'eliminazione usando la stessa logica della
// cancellazione singola (quindi con gli stessi blocchi: dati collegati, giacenza,
// ecc.). Se un elemento non si può eliminare NON blocca gli altri: viene
// semplicemente riportato in `non_eliminati` insieme al motivo.
const { HttpError } = require("../middleware/errorHandler");

/**
 * @param {object}   opts
 * @param {number[]} opts.ids              id selezionati dall'utente
 * @param {Function} opts.trovaEtichetta   async (id) => stringa leggibile (es. nome)
 * @param {Function} opts.eliminaSingolo   async (id) => elimina (lancia HttpError se bloccato)
 * @param {Function} [opts.motivoBlocco]   async (id) => stringa se va saltato a priori
 * @param {string}   [opts.singolare]      es. "marca"
 * @param {string}   [opts.plurale]        es. "marche"
 * @param {boolean}  [opts.femminile]      per l'accordo nei messaggi (marca → eliminata)
 */
async function eliminaMultipli({
  ids,
  trovaEtichetta,
  eliminaSingolo,
  motivoBlocco,
  singolare = "elemento",
  plurale = "elementi",
  femminile = false,
}) {
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new HttpError(400, "Nessun elemento selezionato");
  }
  const unici = [...new Set(ids.map(Number).filter(Number.isInteger))];
  if (unici.length === 0) {
    throw new HttpError(400, "Elenco di id non valido");
  }

  const eliminati = [];
  const nonEliminati = [];

  for (const id of unici) {
    let etichetta = `#${id}`;
    try {
      etichetta = (await trovaEtichetta(id)) || etichetta;
    } catch (_) {
      /* l'etichetta è solo informativa */
    }

    try {
      const blocco = motivoBlocco ? await motivoBlocco(id, etichetta) : null;
      if (blocco) {
        nonEliminati.push({ id, etichetta, motivo: blocco });
        continue;
      }
      await eliminaSingolo(id);
      eliminati.push({ id, etichetta });
    } catch (err) {
      let motivo = err.message || "Errore sconosciuto";
      if (String(motivo).includes("FOREIGN KEY")) {
        motivo = "Elemento collegato ad altri dati";
      }
      nonEliminati.push({ id, etichetta, motivo });
    }
  }

  const nome = (n) => (n === 1 ? singolare : plurale);
  const eliminat = (n) =>
    `eliminat${n === 1 ? (femminile ? "a" : "o") : femminile ? "e" : "i"}`;
  let message;
  if (eliminati.length === 0) {
    message = `Nessun elemento eliminato: controlla i motivi qui sotto.`;
  } else if (nonEliminati.length === 0) {
    message = `${eliminati.length} ${nome(eliminati.length)} ${eliminat(eliminati.length)} con successo.`;
  } else {
    message = `${eliminati.length} ${eliminat(eliminati.length)}, ${nonEliminati.length} non eliminabil${nonEliminati.length === 1 ? "e" : "i"}.`;
  }

  return {
    success: true,
    message,
    totale: unici.length,
    eliminati_count: eliminati.length,
    non_eliminati_count: nonEliminati.length,
    eliminati,
    non_eliminati: nonEliminati,
  };
}

module.exports = { eliminaMultipli };
