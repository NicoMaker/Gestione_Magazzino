// ==================== UI: GESTIONE MODALI ====================
// File: js/ui/modals.js
// Scopo: apertura/chiusura di tutti i modal CRUD dell'app
//        (marca, prodotto, movimento, utente, import PDF, dettagli lotti)
//        + chiusura al click sul backdrop.
// Dipendenze: notifications.js (alert), formHelpers.js (togglePrezzoField,
//             setupPasswordToggle), utils.js (formatNumber, setupDecimalInputs),
//             store.js (statoApp), e le funzioni di ricerca dei rispettivi CRUD.

// ── MODAL MARCHE ──────────────────────────────────────────────
function openMarcaModal(marca = null) {
  const modal = document.getElementById("modalMarca");
  document.getElementById("formMarca").reset();

  if (marca) {
    document.getElementById("modalMarcaTitle").textContent = "Modifica Marca";
    document.getElementById("marcaId").value = marca.id;
    document.getElementById("marcaNome").value = marca.nome;
  } else {
    document.getElementById("modalMarcaTitle").textContent = "Nuova Marca";
    document.getElementById("marcaId").value = "";
  }
  modal.classList.add("active");
}

function closeMarcaModal() {
  document.getElementById("modalMarca").classList.remove("active");
}

// ── MODAL PRODOTTI ────────────────────────────────────────────
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

  const modal = document.getElementById("modalProdotto");
  const searchInput = document.getElementById("prodottoMarcaSearch");
  const hiddenInput = document.getElementById("prodottoMarca");
  const resultsCont = document.getElementById("marcaSearchResults");

  document.getElementById("formProdotto").reset();
  if (searchInput) {
    searchInput.value = "";
    searchInput.classList.remove("has-selection");
  }
  if (hiddenInput) hiddenInput.value = "";
  if (resultsCont) resultsCont.classList.remove("show");
  selectedMarcaId = null;

  if (prodotto) {
    document.getElementById("modalProdottoTitle").textContent =
      "Modifica Prodotto";
    document.getElementById("prodottoId").value = prodotto.id;
    document.getElementById("prodottoNome").value = prodotto.nome;
    document.getElementById("prodottoDescrizione").value =
      prodotto.descrizione || "";
    if (prodotto.marca_id) {
      const marca = allMarche.find((m) => m.id == prodotto.marca_id);
      if (marca) {
        selectedMarcaId = prodotto.marca_id;
        hiddenInput.value = prodotto.marca_id;
        searchInput.value = marca.nome.toUpperCase();
        searchInput.classList.add("has-selection");
      }
    }
  } else {
    document.getElementById("modalProdottoTitle").textContent =
      "Nuovo Prodotto";
    document.getElementById("prodottoId").value = "";
  }

  modal.classList.add("active");
  setTimeout(() => {
    if (typeof setupMarcaSearch === "function") setupMarcaSearch();
  }, 150);
}

function closeProdottoModal() {
  document.getElementById("modalProdotto").classList.remove("active");
  if (typeof selectedMarcaId !== "undefined") selectedMarcaId = null;
}

// ── MODAL MOVIMENTI ───────────────────────────────────────────
async function openMovimentoModal(movimento = null) {
  const modal = document.getElementById("modalMovimento");
  const tipoSelect = document.getElementById("movimentoTipo");
  const hiddenProd = document.getElementById("movimentoProdotto");
  const searchInput = document.getElementById("movimentoProdottoSearch");
  const resultsBox = document.getElementById("prodottoSearchResults");

  // Ricarica prodotti (o usa cache)
  try {
    const res = await fetch(`${API_URL}/prodotti`);
    allProdotti = await res.json();
    prodotti = allProdotti;
  } catch {
    console.warn("⚠️ Impossibile ricaricare prodotti, uso cache");
  }

  document.getElementById("formMovimento").reset();
  document.getElementById("movimentoId").value = "";

  if (!movimento) {
    document.getElementById("modalMovimentoTitle").textContent =
      "Nuovo Movimento";
    if (hiddenProd) hiddenProd.value = "";
    if (searchInput) {
      searchInput.value = "";
      searchInput.classList.remove("has-selection");
    }
    if (resultsBox) resultsBox.classList.remove("show");

    const gi = document.getElementById("giacenzaInfo");
    if (gi) {
      // Rimuovi tutti i flag "RIORDINO" che precedono giacenzaInfo
      let prev = gi.previousElementSibling;
      while (prev) {
        if (prev.textContent && prev.textContent.includes("RIORDINO")) {
          const toRemove = prev;
          prev = prev.previousElementSibling;
          toRemove.remove();
        } else {
          prev = prev.previousElementSibling;
        }
      }
      gi.style.display = "none";
    }
    if (tipoSelect) tipoSelect.value = "carico";
  } else {
    document.getElementById("modalMovimentoTitle").textContent =
      "Modifica Movimento";
    document.getElementById("movimentoId").value = movimento.id;

    if (hiddenProd)
      hiddenProd.value = movimento.prodotto_id || movimento.prodottoid || "";
    if (searchInput) {
      const p = allProdotti.find(
        (x) => x.id === (movimento.prodotto_id || movimento.prodottoid),
      );
      if (p) {
        const marca = p.marca_nome || "";
        searchInput.value = marca
          ? `${p.nome} - ${marca.toUpperCase()}`
          : p.nome;
        searchInput.classList.add("has-selection");
      }
    }

    if (tipoSelect) tipoSelect.value = movimento.tipo;
    document.getElementById("movimentoQuantita").value = formatNumber(
      movimento.quantita,
    );
    document.getElementById("movimentoData").value =
      movimento.data_movimento || movimento.datamovimento || "";

    if (movimento.tipo === "carico") {
      const pEl = document.getElementById("movimentoPrezzo");
      const fEl = document.getElementById("movimentoFattura");
      const foEl = document.getElementById("movimentoFornitore");
      if (pEl)
        pEl.value = movimento.prezzo ? formatNumber(movimento.prezzo) : "";
      if (fEl) fEl.value = movimento.fattura_doc || movimento.fatturadoc || "";
      if (foEl)
        foEl.value =
          movimento.fornitore || movimento.fornitore_cliente_id || "";
    }

    const pid = movimento.prodotto_id || movimento.prodottoid;
    if (pid && typeof showGiacenzaInfo === "function")
      await showGiacenzaInfo(pid);
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

// ── MODAL UTENTI ──────────────────────────────────────────────
function openUserModal(utente = null) {
  const modal = document.getElementById("modalUser");
  const title = document.getElementById("modalUserTitle");
  const form = document.getElementById("formUser");
  const passwordInput = document.getElementById("userPassword");
  const passwordOpt = document.getElementById("passwordOptional");
  const togglePwd = document.getElementById("toggleUserPassword");

  form.reset();

  if (togglePwd) {
    togglePwd.innerHTML = `
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>`;
  }

  if (utente) {
    title.textContent = "Modifica Utente";
    document.getElementById("userId").value = utente.id;
    document.getElementById("userUsername").value = utente.username;
    passwordInput.placeholder = "Lascia vuoto per non modificare";
    passwordInput.required = false;
    if (passwordOpt) passwordOpt.textContent = "(Opzionale)";
  } else {
    title.textContent = "Nuovo Utente";
    document.getElementById("userId").value = "";
    passwordInput.placeholder = "Inserisci password";
    passwordInput.required = true;
    if (passwordOpt) passwordOpt.textContent = "*";
  }

  modal.classList.add("active");
  setupPasswordToggle("userPassword", "toggleUserPassword");
}

function closeUserModal() {
  document.getElementById("modalUser").classList.remove("active");
}

// ── MODAL IMPORT PDF SCARICHI ─────────────────────────────────
function openImportPDFModal() {
  const modal = document.getElementById("modalImportPDF");
  const form = document.getElementById("formImportPDF");
  if (!modal || !form) return;

  form.reset();
  const preview =
    document.getElementById("filePreview") ||
    document.getElementById("filePreviewBox");
  if (preview) {
    preview.style.display = "none";
    preview.textContent = "Trascina il PDF qui o clicca per sfogliare";
  }
  modal.classList.add("active");
}

function closeImportPDFModal() {
  document.getElementById("modalImportPDF")?.classList.remove("active");
}

// ── MODAL CARICO DA FATTURA PDF ───────────────────────────────
// Le funzioni openCaricoFatturaPDFModal / closeCaricoFatturaPDFModal
// richiedono lo stato interno di pdf-fattura.js e sono registrate
// direttamente su window da quel modulo.

// ── MODAL DETTAGLI LOTTI ──────────────────────────────────────
function openDettagliModal(prodottoId) {
  // La popolazione avviene in riepilogo.js; qui solo apertura/chiusura.
  const modal = document.getElementById("modalDettagli");
  if (!modal) return;
  modal.classList.add("active");
}

function closeDettagliModal() {
  document.getElementById("modalDettagli")?.classList.remove("active");
}

// ── Chiusura modal al click sul backdrop ──────────────────────
function initModalBackdropClose() {
  document.addEventListener("click", (e) => {
    if (!e.target.classList.contains("modal")) return;
    const modalId = e.target.id;
    // I modal confirm/alert hanno i loro handler
    if (modalId === "confirmModal" || modalId === "alertModal") return;
    e.target.classList.remove("active");
  });
}

// ── Esposizione globale ───────────────────────────────────────
window.openMarcaModal = openMarcaModal;
window.closeMarcaModal = closeMarcaModal;
window.openProdottoModal = openProdottoModal;
window.closeProdottoModal = closeProdottoModal;
window.openMovimentoModal = openMovimentoModal;
window.closeMovimentoModal = closeMovimentoModal;
window.openUserModal = openUserModal;
window.closeUserModal = closeUserModal;
window.openImportPDFModal = openImportPDFModal;
window.closeImportPDFModal = closeImportPDFModal;
window.openDettagliModal = openDettagliModal;
window.closeDettagliModal = closeDettagliModal;

// Auto-inizializzazione
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initModalBackdropClose);
} else {
  initModalBackdropClose();
}
