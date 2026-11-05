// ==================== UI: HELPER FORM ====================
// File: js/ui/formHelpers.js
// Scopo: comportamenti riutilizzabili dei form — toggle visibilità password
//        e toggle dei campi carico/scarico nel modal Movimento.

// ── Toggle visibilità password ────────────────────────────────
function setupPasswordToggle(inputId, toggleId) {
  const passwordInput = document.getElementById(inputId);
  const togglePassword = document.getElementById(toggleId);
  if (!passwordInput || !togglePassword) return;

  const iconVisible = `
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>`;
  const iconHidden = `
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.08 2.58"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
    <circle cx="12" cy="12" r="3"/>`;

  // Clona per rimuovere eventuali listener precedenti
  const newToggle = togglePassword.cloneNode(true);
  togglePassword.parentNode.replaceChild(newToggle, togglePassword);

  newToggle.addEventListener("click", () => {
    const type =
      passwordInput.getAttribute("type") === "password" ? "text" : "password";
    passwordInput.setAttribute("type", type);
    newToggle.innerHTML = type === "text" ? iconHidden : iconVisible;
  });
}

// ── Toggle campi carico/scarico (modal Movimento) ─────────────
// Mostra/nasconde Prezzo, Fattura e Fornitore in base al tipo movimento.
function togglePrezzoField() {
  const tipo = document.getElementById("movimentoTipo")?.value;
  const prezzoGroup = document.getElementById("prezzoGroup");
  const prezzoInput = document.getElementById("movimentoPrezzo");
  const fornitoreGroup = document.getElementById("fornitoreGroup");
  const fatturaInput = document.getElementById("movimentoFattura");
  const fornitoreInput = document.getElementById("movimentoFornitore");
  const docOptional = document.getElementById("docOptional");
  const fornitoreOptional = document.getElementById("fornitoreOptional");
  const fatturaGroup = fatturaInput?.closest(".form-group");

  if (!tipo) return;

  const isCarico = tipo === "carico";

  if (prezzoGroup) prezzoGroup.style.display = isCarico ? "block" : "none";
  if (prezzoInput) {
    prezzoInput.required = isCarico;
    if (!isCarico) prezzoInput.value = "";
  }

  if (fatturaGroup) fatturaGroup.style.display = isCarico ? "block" : "none";
  if (fatturaInput) {
    fatturaInput.required = isCarico;
    if (!isCarico) fatturaInput.value = "";
  }
  if (docOptional) docOptional.textContent = isCarico ? "*" : "";

  if (fornitoreGroup)
    fornitoreGroup.style.display = isCarico ? "block" : "none";
  if (fornitoreInput) {
    fornitoreInput.required = isCarico;
    if (!isCarico) fornitoreInput.value = "";
  }
  if (fornitoreOptional) fornitoreOptional.textContent = isCarico ? "*" : "";
}

// ── Esposizione globale ───────────────────────────────────────
window.setupPasswordToggle = setupPasswordToggle;
window.togglePrezzoField = togglePrezzoField;
