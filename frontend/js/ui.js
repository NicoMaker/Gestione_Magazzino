// ==================== LOGICA UI CENTRALIZZATA ====================
// File: ui.js
// Scopo: Tutte le funzioni di interfaccia utente: notifiche, modali (alert/confirm/CRUD),
//        toggle password, toggle campi form, open/close di ogni modal dell'app.
//
// DIPENDENZE (devono essere caricati PRIMA di ui.js):
//   - utils.js      → escapeHtml, formatNumber, setupDecimalInputs, formatQuantity
//   - config.js     → API_URL, allProdotti, prodotti, allMarche, movimenti
//
// CARICAMENTO SUGGERITO in home.html (sostituisce realtime.js per la parte modal):
//   <script src="js/realtime.js"></script>   ← mantieni solo Socket.IO + ignoreNextSocketUpdate
//   <script src="js/ui.js"></script>         ← questo file


// ══════════════════════════════════════════════════════════════
// 1. SISTEMA DI NOTIFICHE TOAST
// ══════════════════════════════════════════════════════════════

/**
 * Mostra una notifica toast nell'angolo dello schermo.
 * @param {string} message - Testo della notifica
 * @param {'info'|'success'|'error'|'warning'} type
 * @param {number} duration - Millisecondi prima della scomparsa (0 = mai)
 */
function showNotification(message, type = "info", duration = 4000) {
  const container = document.getElementById("notificationContainer");
  if (!container) return;

  const icons = {
    success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
    error:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
    warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    info:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
  };

  const notification = document.createElement("div");
  notification.className = `notification notification-${type}`;
  notification.innerHTML = `
    <div class="notification-icon">${icons[type] || icons.info}</div>
    <div class="notification-content">
      <div class="notification-message">${message}</div>
    </div>
    <button class="notification-close" onclick="this.parentElement.remove()">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="18" y1="6" x2="6" y2="18"/>
        <line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
    </button>`;

  container.appendChild(notification);
  setTimeout(() => notification.classList.add("show"), 10);

  if (duration > 0) {
    setTimeout(() => {
      notification.classList.remove("show");
      setTimeout(() => notification.parentElement && notification.remove(), 300);
    }, duration);
  }
}


// ══════════════════════════════════════════════════════════════
// 2. MODAL CONFIRM (sostituisce window.confirm)
// ══════════════════════════════════════════════════════════════

/**
 * Mostra un modal di conferma moderno.
 * @param {string} message - Testo (supporta HTML)
 * @param {string} title
 * @returns {Promise<boolean>}
 */
function showConfirmModal(message, title = "Conferma") {
  return new Promise((resolve) => {
    const modal       = document.getElementById("confirmModal");
    const msgElem     = document.getElementById("confirmMessage");
    const titleElem   = modal.querySelector(".modal-header h2");
    const confirmBtn  = document.getElementById("confirmButton");
    const cancelBtn   = modal.querySelector(".btn-secondary");
    const closeBtn    = modal.querySelector(".modal-close");
    const iconEl      = document.getElementById("confirmIcon");

    msgElem.innerHTML      = message;
    titleElem.textContent  = title;

    const isDanger = title.toLowerCase().includes("elimina");
    confirmBtn.style.background      = isDanger ? "var(--danger)" : "var(--primary)";
    iconEl.innerHTML                 = isDanger ? "🗑️" : "❓";
    iconEl.style.background          = isDanger ? "rgba(239,68,68,0.1)" : "rgba(99,102,241,0.1)";
    iconEl.style.color               = isDanger ? "var(--danger)"        : "var(--primary)";

    modal.classList.add("show");

    const cleanup = () => {
      modal.classList.remove("show");
      confirmBtn.removeEventListener("click", handleConfirm);
      cancelBtn.removeEventListener("click", handleCancel);
      closeBtn.removeEventListener("click", handleCancel);
    };
    const handleConfirm = () => { cleanup(); resolve(true); };
    const handleCancel  = () => { cleanup(); resolve(false); };

    confirmBtn.addEventListener("click", handleConfirm);
    cancelBtn.addEventListener("click",  handleCancel);
    closeBtn.addEventListener("click",   handleCancel);
  });
}

function closeConfirmModal() {
  document.getElementById("confirmModal")?.classList.remove("active", "show");
}


// ══════════════════════════════════════════════════════════════
// 3. MODAL ALERT (sostituisce window.alert)
// ══════════════════════════════════════════════════════════════

/**
 * Mostra un modal di alert moderno.
 * @param {string} message
 * @param {string} title
 * @param {'info'|'success'|'error'|'warning'} type
 */
function showAlertModal(message, title = "Informazione", type = "info") {
  const modal     = document.getElementById("alertModal");
  const titleEl   = document.getElementById("alertModalTitle");
  const messageEl = document.getElementById("alertMessage");
  const iconEl    = document.getElementById("alertIcon");

  titleEl.textContent = title;

  const iconsSvg = {
    success: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
    error:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
    warning: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    info:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
  };
  iconEl.className = `alert-icon ${type}`;
  iconEl.innerHTML = iconsSvg[type] || iconsSvg.info;

  // Formattazione messaggio (multilinea / lungo)
  if (message.includes("\n") || message.length > 200) {
    const lines = message.split("\n");
    let fmt = "";
    lines.forEach((line) => {
      if (line.trim().startsWith("━━")) {
        fmt += `<hr style="margin:8px 0;border:none;border-top:1px solid var(--border);">`;
      } else if (/^[✅⚠️❌]/.test(line.trim())) {
        fmt += `<div style="margin:8px 0;font-weight:600;">${escapeHtml(line)}</div>`;
      } else if (/^[•\-]/.test(line.trim())) {
        fmt += `<div style="margin:4px 0;padding-left:16px;">${escapeHtml(line)}</div>`;
      } else if (line.trim() === "") {
        fmt += "<br>";
      } else {
        fmt += `<div style="margin:4px 0;">${escapeHtml(line)}</div>`;
      }
    });
    messageEl.innerHTML = fmt;
  } else {
    messageEl.textContent = message;
  }

  modal.classList.add("active", "show");

  const okBtn    = document.getElementById("alertModalOkBtn");
  const closeBtn = modal.querySelector(".modal-close");
  const dismiss  = (e) => { e && e.stopPropagation(); closeAlertModal(); };

  if (okBtn)    okBtn.onclick    = dismiss;
  if (closeBtn) closeBtn.onclick = dismiss;

  const backdropHandler = (e) => { if (e.target === modal) closeAlertModal(); };
  modal.addEventListener("click", backdropHandler);
  window._alertBackdropHandler = backdropHandler;

  modal.querySelector(".modal-content")?.addEventListener("click", (e) => e.stopPropagation());
}

function closeAlertModal() {
  const modal = document.getElementById("alertModal");
  modal.classList.remove("active", "show");
  if (window._alertBackdropHandler) {
    modal.removeEventListener("click", window._alertBackdropHandler);
    delete window._alertBackdropHandler;
  }
}


// ══════════════════════════════════════════════════════════════
// 4. OVERRIDE window.alert / window.confirm
// ══════════════════════════════════════════════════════════════

window.alert = function (message) {
  const m = String(message).toLowerCase();
  let type  = "info";
  let title = "Informazione";
  if (message.includes("✅") || m.includes("successo") || m.includes("creato") ||
      m.includes("aggiornato") || m.includes("registrato") || m.includes("salvato")) {
    type = "success"; title = "Successo";
  } else if (message.includes("❌") || m.includes("errore") || m.includes("error")) {
    type = "error"; title = "Errore";
  } else if (message.includes("⚠️") || m.includes("attenzione") || m.includes("warning") ||
             m.includes("compila") || m.includes("obbligatorio") || m.includes("seleziona")) {
    type = "warning"; title = "Attenzione";
  }
  showAlertModal(message, title, type);
};

window.confirm = function (message) {
  return showConfirmModal(message, "Conferma eliminazione");
};


// ══════════════════════════════════════════════════════════════
// 5. TOGGLE PASSWORD (riutilizzabile)
// ══════════════════════════════════════════════════════════════

/**
 * Configura il toggle visibilità password su un input.
 * @param {string} inputId   - id dell'<input type="password">
 * @param {string} toggleId  - id del pulsante/icona SVG
 */
function setupPasswordToggle(inputId, toggleId) {
  const passwordInput  = document.getElementById(inputId);
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
    const type = passwordInput.getAttribute("type") === "password" ? "text" : "password";
    passwordInput.setAttribute("type", type);
    newToggle.innerHTML = type === "text" ? iconHidden : iconVisible;
  });
}


// ══════════════════════════════════════════════════════════════
// 6. TOGGLE CAMPI CARICO/SCARICO (modal Movimento)
// ══════════════════════════════════════════════════════════════

/**
 * Mostra/nasconde i campi Prezzo, Fattura e Fornitore
 * in base al tipo di movimento selezionato.
 */
function togglePrezzoField() {
  const tipo             = document.getElementById("movimentoTipo")?.value;
  const prezzoGroup      = document.getElementById("prezzoGroup");
  const prezzoInput      = document.getElementById("movimentoPrezzo");
  const fornitoreGroup   = document.getElementById("fornitoreGroup");
  const fatturaInput     = document.getElementById("movimentoFattura");
  const fornitoreInput   = document.getElementById("movimentoFornitore");
  const docOptional      = document.getElementById("docOptional");
  const fornitoreOptional= document.getElementById("fornitoreOptional");
  const fatturaGroup     = fatturaInput?.closest(".form-group");

  if (!tipo) return;

  const isCarico = tipo === "carico";

  if (prezzoGroup)    prezzoGroup.style.display  = isCarico ? "block" : "none";
  if (prezzoInput) {  prezzoInput.required = isCarico; if (!isCarico) prezzoInput.value = ""; }

  if (fatturaGroup)   fatturaGroup.style.display  = isCarico ? "block" : "none";
  if (fatturaInput) { fatturaInput.required = isCarico; if (!isCarico) fatturaInput.value = ""; }
  if (docOptional)    docOptional.textContent      = isCarico ? "*" : "";

  if (fornitoreGroup)   fornitoreGroup.style.display  = isCarico ? "block" : "none";
  if (fornitoreInput) { fornitoreInput.required = isCarico; if (!isCarico) fornitoreInput.value = ""; }
  if (fornitoreOptional) fornitoreOptional.textContent = isCarico ? "*" : "";
}


// ══════════════════════════════════════════════════════════════
// 7. MODAL MARCHE
// ══════════════════════════════════════════════════════════════

/**
 * Apre il modal per creare/modificare una marca.
 * @param {Object|null} marca - null = nuova marca
 */
function openMarcaModal(marca = null) {
  const modal = document.getElementById("modalMarca");
  document.getElementById("formMarca").reset();

  if (marca) {
    document.getElementById("modalMarcaTitle").textContent = "Modifica Marca";
    document.getElementById("marcaId").value               = marca.id;
    document.getElementById("marcaNome").value             = marca.nome;
  } else {
    document.getElementById("modalMarcaTitle").textContent = "Nuova Marca";
    document.getElementById("marcaId").value               = "";
  }
  modal.classList.add("active");
}

function closeMarcaModal() {
  document.getElementById("modalMarca").classList.remove("active");
}


// ══════════════════════════════════════════════════════════════
// 8. MODAL PRODOTTI
// ══════════════════════════════════════════════════════════════

/**
 * Apre il modal per creare/modificare un prodotto.
 * Carica le marche se non ancora presenti.
 * @param {Object|null} prodotto
 */
async function openProdottoModal(prodotto = null) {
  if (!allMarche || allMarche.length === 0) {
    try {
      const res = await fetch(`${API_URL}/marche`);
      allMarche = await res.json();
    } catch {
      alert("Errore nel caricamento delle marche");
      return;
    }
  }

  const modal       = document.getElementById("modalProdotto");
  const searchInput = document.getElementById("prodottoMarcaSearch");
  const hiddenInput = document.getElementById("prodottoMarca");
  const resultsCont = document.getElementById("marcaSearchResults");

  document.getElementById("formProdotto").reset();
  if (searchInput)  { searchInput.value = ""; searchInput.classList.remove("has-selection"); }
  if (hiddenInput)  hiddenInput.value = "";
  if (resultsCont)  resultsCont.classList.remove("show");
  selectedMarcaId = null;

  if (prodotto) {
    document.getElementById("modalProdottoTitle").textContent       = "Modifica Prodotto";
    document.getElementById("prodottoId").value                     = prodotto.id;
    document.getElementById("prodottoNome").value                   = prodotto.nome;
    document.getElementById("prodottoDescrizione").value            = prodotto.descrizione || "";
    if (prodotto.marca_id) {
      const marca = allMarche.find((m) => m.id == prodotto.marca_id);
      if (marca) {
        selectedMarcaId   = prodotto.marca_id;
        hiddenInput.value = prodotto.marca_id;
        searchInput.value = marca.nome.toUpperCase();
        searchInput.classList.add("has-selection");
      }
    }
  } else {
    document.getElementById("modalProdottoTitle").textContent = "Nuovo Prodotto";
    document.getElementById("prodottoId").value               = "";
  }

  modal.classList.add("active");
  setTimeout(() => { if (typeof setupMarcaSearch === "function") setupMarcaSearch(); }, 150);
}

function closeProdottoModal() {
  document.getElementById("modalProdotto").classList.remove("active");
  if (typeof selectedMarcaId !== "undefined") selectedMarcaId = null;
}


// ══════════════════════════════════════════════════════════════
// 9. MODAL MOVIMENTI
// ══════════════════════════════════════════════════════════════

/**
 * Apre il modal per creare/modificare un movimento.
 * @param {Object|null} movimento
 */
async function openMovimentoModal(movimento = null) {
  const modal       = document.getElementById("modalMovimento");
  const tipoSelect  = document.getElementById("movimentoTipo");
  const hiddenProd  = document.getElementById("movimentoProdotto");
  const searchInput = document.getElementById("movimentoProdottoSearch");
  const resultsBox  = document.getElementById("prodottoSearchResults");

  // Ricarica prodotti (o usa cache)
  try {
    const res  = await fetch(`${API_URL}/prodotti`);
    allProdotti = await res.json();
    prodotti    = allProdotti;
  } catch {
    console.warn("⚠️ Impossibile ricaricare prodotti, uso cache");
  }

  document.getElementById("formMovimento").reset();
  document.getElementById("movimentoId").value = "";

  if (!movimento) {
    document.getElementById("modalMovimentoTitle").textContent = "Nuovo Movimento";
    if (hiddenProd)  hiddenProd.value = "";
    if (searchInput) { searchInput.value = ""; searchInput.classList.remove("has-selection"); }
    if (resultsBox)  resultsBox.classList.remove("show");
    const gi = document.getElementById("giacenzaInfo");
    if (gi)  gi.style.display = "none";
    if (tipoSelect) tipoSelect.value = "carico";
  } else {
    document.getElementById("modalMovimentoTitle").textContent = "Modifica Movimento";
    document.getElementById("movimentoId").value               = movimento.id;

    if (hiddenProd)  hiddenProd.value = movimento.prodotto_id || movimento.prodottoid || "";
    if (searchInput) {
      const p = allProdotti.find((x) => x.id === (movimento.prodotto_id || movimento.prodottoid));
      if (p) {
        const marca = p.marca_nome || "";
        searchInput.value = marca ? `${p.nome} - ${marca.toUpperCase()}` : p.nome;
        searchInput.classList.add("has-selection");
      }
    }

    if (tipoSelect) tipoSelect.value = movimento.tipo;
    document.getElementById("movimentoQuantita").value = formatNumber(movimento.quantita);
    document.getElementById("movimentoData").value     = movimento.data_movimento || movimento.datamovimento || "";

    if (movimento.tipo === "carico") {
      const pEl  = document.getElementById("movimentoPrezzo");
      const fEl  = document.getElementById("movimentoFattura");
      const foEl = document.getElementById("movimentoFornitore");
      if (pEl)  pEl.value  = movimento.prezzo       ? formatNumber(movimento.prezzo) : "";
      if (fEl)  fEl.value  = movimento.fattura_doc  || movimento.fatturadoc          || "";
      if (foEl) foEl.value = movimento.fornitore     || movimento.fornitore_cliente_id || "";
    }

    const pid = movimento.prodotto_id || movimento.prodottoid;
    if (pid && typeof showGiacenzaInfo === "function") await showGiacenzaInfo(pid);
  }

  togglePrezzoField();
  modal.classList.add("active");
  setTimeout(() => {
    if (typeof setupDecimalInputs === "function") setupDecimalInputs();
    if (typeof setupProductSearch === "function") setupProductSearch();
  }, 150);
}

function closeMovimentoModal() {
  document.getElementById("modalMovimento").classList.remove("active");
}


// ══════════════════════════════════════════════════════════════
// 10. MODAL UTENTI
// ══════════════════════════════════════════════════════════════

/**
 * Apre il modal per creare/modificare un utente.
 * @param {Object|null} utente
 */
function openUserModal(utente = null) {
  const modal          = document.getElementById("modalUser");
  const title          = document.getElementById("modalUserTitle");
  const form           = document.getElementById("formUser");
  const passwordInput  = document.getElementById("userPassword");
  const passwordOpt    = document.getElementById("passwordOptional");
  const togglePwd      = document.getElementById("toggleUserPassword");

  form.reset();

  if (togglePwd) {
    togglePwd.innerHTML = `
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>`;
  }

  if (utente) {
    title.textContent                           = "Modifica Utente";
    document.getElementById("userId").value     = utente.id;
    document.getElementById("userUsername").value = utente.username;
    passwordInput.placeholder                   = "Lascia vuoto per non modificare";
    passwordInput.required                      = false;
    if (passwordOpt) passwordOpt.textContent    = "(Opzionale)";
  } else {
    title.textContent                           = "Nuovo Utente";
    document.getElementById("userId").value     = "";
    passwordInput.placeholder                   = "Inserisci password";
    passwordInput.required                      = true;
    if (passwordOpt) passwordOpt.textContent    = "*";
  }

  modal.classList.add("active");
  setupPasswordToggle("userPassword", "toggleUserPassword");
}

function closeUserModal() {
  document.getElementById("modalUser").classList.remove("active");
}


// ══════════════════════════════════════════════════════════════
// 11. MODAL IMPORT PDF SCARICHI
// ══════════════════════════════════════════════════════════════

function openImportPDFModal() {
  const modal = document.getElementById("modalImportPDF");
  const form  = document.getElementById("formImportPDF");
  if (!modal || !form) return;

  form.reset();
  const preview = document.getElementById("filePreview") || document.getElementById("filePreviewBox");
  if (preview) {
    preview.style.display = "none";
    preview.textContent   = "Trascina il PDF qui o clicca per sfogliare";
  }
  modal.classList.add("active");
}

function closeImportPDFModal() {
  document.getElementById("modalImportPDF")?.classList.remove("active");
}


// ══════════════════════════════════════════════════════════════
// 12. MODAL CARICO DA FATTURA PDF (pdf-fattura.js)
// ══════════════════════════════════════════════════════════════
// Nota: le funzioni openCaricoFatturaPDFModal / closeCaricoFatturaPDFModal
// richiedono variabili interne dell'IIFE di pdf-fattura.js (_cfpFile, _cfpRighe, ecc.).
// Vengono quindi registrate direttamente su window da pdf-fattura.js e sono
// accessibili globalmente senza doverle ridefinire qui.
// Se vuoi centralizzarle completamente, converti pdf-fattura.js da IIFE a modulo aperto.


// ══════════════════════════════════════════════════════════════
// 13. MODAL DETTAGLI LOTTI
// ══════════════════════════════════════════════════════════════

function openDettagliModal(prodottoId) {
  // La logica di popolazione rimane in riepilogo.js; qui gestiamo solo apertura/chiusura.
  const modal = document.getElementById("modalDettagli");
  if (!modal) return;
  modal.classList.add("active");
}

function closeDettagliModal() {
  document.getElementById("modalDettagli")?.classList.remove("active");
}


// ══════════════════════════════════════════════════════════════
// 14. CHIUSURA MODAL AL CLICK SUL BACKDROP
// ══════════════════════════════════════════════════════════════

/**
 * Registra un listener globale: cliccando fuori dal modal-content
 * chiude qualsiasi modal con classe "active" (eccetto confirm/alert
 * che hanno i propri handler).
 */
function initModalBackdropClose() {
  document.addEventListener("click", (e) => {
    if (!e.target.classList.contains("modal")) return;
    const modalId = e.target.id;
    // Non chiudiamo i modal gestiti da promise (confirm/alert)
    if (modalId === "confirmModal" || modalId === "alertModal") return;
    e.target.classList.remove("active");
  });
}


// ══════════════════════════════════════════════════════════════
// 15. ESPOSIZIONE GLOBALE
// ══════════════════════════════════════════════════════════════

window.showNotification       = showNotification;
window.showConfirmModal       = showConfirmModal;
window.closeConfirmModal      = closeConfirmModal;
window.showAlertModal         = showAlertModal;
window.closeAlertModal        = closeAlertModal;
window.setupPasswordToggle    = setupPasswordToggle;
window.togglePrezzoField      = togglePrezzoField;
window.openMarcaModal         = openMarcaModal;
window.closeMarcaModal        = closeMarcaModal;
window.openProdottoModal      = openProdottoModal;
window.closeProdottoModal     = closeProdottoModal;
window.openMovimentoModal     = openMovimentoModal;
window.closeMovimentoModal    = closeMovimentoModal;
window.openUserModal          = openUserModal;
window.closeUserModal         = closeUserModal;
window.openImportPDFModal     = openImportPDFModal;
window.closeImportPDFModal    = closeImportPDFModal;
window.openDettagliModal      = openDettagliModal;
window.closeDettagliModal     = closeDettagliModal;

// Auto-inizializzazione
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initModalBackdropClose);
} else {
  initModalBackdropClose();
}