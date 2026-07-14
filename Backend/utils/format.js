// utils/format.js — utility numeriche condivise dai movimenti

// Arrotonda a 2 decimali; ritorna null se il valore non è un numero valido
function formatDecimal(value) {
  if (value === null || value === undefined) return null;
  const num = parseFloat(value);
  if (isNaN(num)) return null;
  return parseFloat(num.toFixed(2));
}

// Formatta una quantità per i messaggi d'errore (interi senza decimali, virgola IT)
function formatQuantitaMsg(value) {
  return (value % 1 === 0 ? value.toFixed(0) : value.toFixed(2)).replace(
    ".",
    ",",
  );
}

// yyyy-mm-dd → gg/mm/aaaa
function dataItaliana(iso) {
  const [anno, mese, giorno] = iso.split("-");
  return `${giorno}/${mese}/${anno}`;
}

function isDataValida(str) {
  return /^\d{4}-\d{2}-\d{2}$/.test(str);
}

module.exports = { formatDecimal, formatQuantitaMsg, dataItaliana, isDataValida };
