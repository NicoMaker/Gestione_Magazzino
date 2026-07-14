// Utility numeriche condivise dai layer del magazzino

// Arrotonda a 2 decimali, ritorna null se non numerico
function formatDecimal(value) {
  if (value === null || value === undefined) return null;
  const num = parseFloat(value);
  if (isNaN(num)) return null;
  return parseFloat(num.toFixed(2));
}

// Formatta una quantità in stile italiano (virgola decimale, niente decimali se intero)
function formatQtaIT(n) {
  return (n % 1 === 0 ? n.toFixed(0) : n.toFixed(2)).replace(".", ",");
}

// yyyy-mm-dd → gg/mm/aaaa
function dataItaliana(iso) {
  const [anno, mese, giorno] = iso.split("-");
  return `${giorno}/${mese}/${anno}`;
}

const isDataValida = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s);

module.exports = { formatDecimal, formatQtaIT, dataItaliana, isDataValida };
