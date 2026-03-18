// ==================== FUNZIONI DI UTILITÀ ====================
// File: utils.js
// Scopo: Formattazione valori, escape HTML, gestione decimali

// ── Separatore decimale locale ──────────────────────────────
function getDecimalSeparator() {
  const formatted = (1.1).toLocaleString(undefined, {
    minimumFractionDigits: 1,
  });
  return formatted.includes(",") ? "," : ".";
}

// ── Conversione stringa → float (gestisce , e .) ────────────
function parseDecimalInput(value) {
  if (!value || value === "") return 0;
  const cleaned = String(value).replace(",", ".");
  const num = Number.parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

// ── Formattazione numero con 2 decimali e separatore locale ─
function formatNumber(num) {
  const n = Number.parseFloat(num);
  if (isNaN(n)) return "0,00";
  const separator = getDecimalSeparator();
  const parts = n.toFixed(2).split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return separator === "," ? parts.join(",") : parts.join(".");
}

// ── Formattazione valuta ─────────────────────────────────────
function formatCurrency(num) {
  const n = Number.parseFloat(num);
  if (isNaN(n)) return "€ 0,00";
  return `€ ${formatNumber(n)}`;
}

// ── Formattazione quantità (intero se possibile) ─────────────
function formatQuantity(num) {
  const n = Number.parseFloat(num);
  if (isNaN(n)) return "0";
  if (Number.isInteger(n)) return n.toString();
  return n.toFixed(2).replace(".", ",");
}

// ── Escape HTML (prevenzione XSS) ───────────────────────────
function escapeHtml(text) {
  if (!text) return "";
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return String(text).replace(/[&<>"']/g, (m) => map[m]);
}

// ── Evidenziazione testo trovato nella ricerca ───────────────
function highlightMatch(text, searchTerm) {
  if (!searchTerm) return text;
  const regex = new RegExp(`(${searchTerm})`, "gi");
  return text.replace(
    regex,
    '<mark style="background:#fef08a;padding:2px 4px;border-radius:3px;font-weight:700;">$1</mark>',
  );
}

// ── Limitazione input a 2 decimali ──────────────────────────
function limitToTwoDecimals(inputElement) {
  if (!inputElement) return;

  const separator = getDecimalSeparator();

  const handleInput = function () {
    let value = this.value.replace(/[^\d.,]/g, "").replace(",", ".");
    const parts = value.split(".");
    if (parts.length > 2) value = parts[0] + "." + parts.slice(1).join("");
    if (parts.length === 2 && parts[1].length > 2) {
      parts[1] = parts[1].substring(0, 2);
      value = parts.join(".");
    }
    this.value = value.replace(".", separator);
  };

  const handleBlur = function () {
    const value = this.value;
    if (!value || value === separator) {
      this.value = `0${separator}00`;
      return;
    }
    const num = parseDecimalInput(value);
    this.value = !isNaN(num)
      ? num.toFixed(2).replace(".", separator)
      : `0${separator}00`;
  };

  const handlePaste = function (e) {
    e.preventDefault();
    const pasted = (e.clipboardData || window.clipboardData).getData("text");
    const num = Number.parseFloat(
      pasted.replace(/[^\d.,]/g, "").replace(",", "."),
    );
    if (!isNaN(num) && num >= 0)
      this.value = num.toFixed(2).replace(".", separator);
  };

  const handleKeydown = function (e) {
    const sep = getDecimalSeparator();
    const ctrl = [
      "Backspace",
      "Delete",
      "Tab",
      "Escape",
      "Enter",
      "ArrowLeft",
      "ArrowRight",
      "ArrowUp",
      "ArrowDown",
      "Home",
      "End",
    ];
    if (
      ctrl.includes(e.key) ||
      e.ctrlKey ||
      e.metaKey ||
      e.key === "a" ||
      e.key === "A"
    )
      return;
    if (e.key === "-" || e.key === "_") {
      e.preventDefault();
      return;
    }
    if (/^\d$/.test(e.key)) return;
    if (
      (e.key === sep || e.key === "." || e.key === ",") &&
      !this.value.includes(sep)
    )
      return;
    e.preventDefault();
  };

  const newInput = inputElement.cloneNode(true);
  inputElement.parentNode.replaceChild(newInput, inputElement);
  newInput.addEventListener("input", handleInput);
  newInput.addEventListener("blur", handleBlur);
  newInput.addEventListener("paste", handlePaste);
  newInput.addEventListener("keydown", handleKeydown);
  return newInput;
}

// ── Setup decimali per i campi del modal Movimento ───────────
function setupDecimalInputs() {
  const q = document.getElementById("movimentoQuantita");
  const p = document.getElementById("movimentoPrezzo");
  if (q) limitToTwoDecimals(q);
  if (p) limitToTwoDecimals(p);
}

// ── Logout forzato ───────────────────────────────────────────
function forceLogout(message) {
  if (message) alert(message);
  localStorage.removeItem("username");
  localStorage.removeItem("activeSection");
  window.location.href = "index.html";
}
