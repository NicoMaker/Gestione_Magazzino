// ==================== GESTIONE RIORDINI ====================
// File: riordino.js

let allRiordino = [];
let riordinoList = [];
window._riordinoLoaded = false;

async function loadRiordinoSection() {
  window._riordinoLoaded = false;
  allRiordino = [];
  riordinoList = [];

  const grid = document.getElementById("riordinoGrid");
  const banner = document.getElementById("riordinoBanner");

  if (banner) banner.style.display = "none";
  if (grid) grid.innerHTML = `
    <div class="riordino-loading">
      <div class="riordino-loading-spinner"></div>
      <span>Caricamento prodotti...</span>
    </div>`;

  // ── Fetch SEMPRE dal server per avere dati aggiornati ──
  let tuttiProdotti = [];
  try {
    const url = (typeof API_URL !== "undefined" ? API_URL : "api") + "/prodotti";
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    tuttiProdotti = await res.json();
    // Aggiorna anche la cache globale usata dal resto dell'app
    allProdotti = tuttiProdotti;
    prodotti = allProdotti;
  } catch (e) {
    console.error("Errore riordino fetch:", e);
    if (grid) grid.innerHTML = `
      <div class="riordino-empty">
        <div class="riordino-empty-icon riordino-empty-icon--red">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <p class="riordino-empty-title" style="color:#dc2626;">Errore di caricamento</p>
        <p class="riordino-empty-sub">Impossibile caricare i prodotti.<br>
          <button onclick="loadRiordinoSection()" style="margin-top:10px;padding:8px 16px;background:#6366f1;color:white;border:none;border-radius:8px;cursor:pointer;font-weight:600;">
            🔄 Riprova
          </button>
        </p>
      </div>`;
    return;
  }

  // Filtra giacenza zero
  allRiordino = tuttiProdotti.filter((p) => {
    const g = p.giacenza;
    if (g === null || g === undefined || g === "") return true;
    return Number(g) === 0;
  });

  riordinoList = [...allRiordino];
  window._riordinoLoaded = true;

  // Applica filtro ricerca salvato
  const savedTerm = _getRiordinoSearch();
  const input = document.getElementById("filterRiordino");
  if (savedTerm && input) {
    input.value = savedTerm;
    riordinoList = _applyRiordinoFilter(savedTerm);
  }

  _renderGrid(riordinoList);
  _renderBanner();
}

// ── localStorage ─────────────────────────────────────────────
function _getRiordinoSearch() {
  try { return localStorage.getItem("search_riordino") || ""; } catch { return ""; }
}
function _saveRiordinoSearch(val) {
  try { localStorage.setItem("search_riordino", val || ""); } catch {}
}
function _applyRiordinoFilter(term) {
  const t = (term || "").toLowerCase().trim();
  if (!t) return [...allRiordino];
  return allRiordino.filter(
    (p) =>
      p.nome.toLowerCase().includes(t) ||
      (p.marca_nome && p.marca_nome.toLowerCase().includes(t)) ||
      (p.descrizione && p.descrizione.toLowerCase().includes(t))
  );
}

// Chiamata da search.js — salta se dati non pronti
function filterRiordinoList(term) {
  _saveRiordinoSearch(term);
  if (!window._riordinoLoaded) return;
  riordinoList = _applyRiordinoFilter(term);
  _renderGrid(riordinoList);
}

// ── Banner ────────────────────────────────────────────────────
function _renderBanner() {
  const banner = document.getElementById("riordinoBanner");
  if (!banner) return;
  banner.style.display = allRiordino.length > 0 ? "flex" : "none";
}

// ── Griglia ───────────────────────────────────────────────────
function _renderGrid(lista) {
  const grid = document.getElementById("riordinoGrid");
  if (!grid) return;

  if (allRiordino.length === 0) {
    grid.innerHTML = `
      <div class="riordino-empty">
        <div class="riordino-empty-icon riordino-empty-icon--green">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
        </div>
        <p class="riordino-empty-title">Magazzino tutto a posto!</p>
        <p class="riordino-empty-sub">Nessun prodotto con giacenza esaurita al momento.</p>
      </div>`;
    return;
  }

  if (lista.length === 0) {
    grid.innerHTML = `
      <div class="riordino-empty">
        <div class="riordino-empty-icon riordino-empty-icon--blue">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
        </div>
        <p class="riordino-empty-title">Nessun risultato</p>
        <p class="riordino-empty-sub">Nessun prodotto corrisponde alla ricerca.<br>Prova con un termine diverso.</p>
      </div>`;
    return;
  }

  grid.innerHTML = lista.map((p) => {
    const nome = escapeHtml(p.nome);
    const marca = p.marca_nome ? escapeHtml(p.marca_nome) : null;
    const descr = p.descrizione
      ? escapeHtml(p.descrizione.substring(0, 55)) + (p.descrizione.length > 55 ? "…" : "")
      : null;
    return `
      <div class="riordino-card">
        <div class="riordino-card-info">
          <div class="riordino-card-nome" title="${nome}">${nome}</div>
          <div class="riordino-card-meta">
            ${marca ? `<span class="riordino-card-marca">${marca}</span>` : ""}
            <span class="riordino-card-zero">Giacenza: 0</span>
          </div>
          ${descr ? `<div class="riordino-card-descr">${descr}</div>` : ""}
        </div>
        <button class="btn-riordina-card" onclick="handleRiordinoDaProdotto(${p.id})" title="Riordina ${nome}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
          </svg>
          Riordina
        </button>
      </div>`;
  }).join("");
}

function renderRiordinoSection(lista) { _renderGrid(lista); _renderBanner(); }

// ══════════════════════════════════════════════════════════════
// CLICK RIORDINA → naviga Movimenti + apre modal
// ══════════════════════════════════════════════════════════════
function handleRiordinoDaProdotto(prodottoId) {
  window._pendingRiordinoProdottoId = prodottoId;
  const navItem = document.querySelector('.nav-item[data-section="movimenti"]');
  if (navItem) navItem.click();
  setTimeout(() => {
    _apriModalRiordino(window._pendingRiordinoProdottoId);
    window._pendingRiordinoProdottoId = null;
  }, 500);
}

function _apriModalRiordino(prodottoId) {
  const prodotto = (allProdotti || []).find((p) => p.id === prodottoId);
  openMovimentoModal(null);
  setTimeout(() => {
    const modalTitle = document.getElementById("modalMovimentoTitle");
    if (modalTitle) modalTitle.textContent = "Nuovo Movimento (Riordino)";
    document.getElementById("movimentoId").value = "";
    document.getElementById("movimentoTipo").value = "carico";
    togglePrezzoField();

    const giacenzaInfo = document.getElementById("giacenzaInfo");
    if (giacenzaInfo && giacenzaInfo.parentNode) {
      giacenzaInfo.parentNode.querySelectorAll('[data-riordino-flag="true"]').forEach((el) => el.remove());
    }
    if (!prodotto) return;

    const searchInput = document.getElementById("movimentoProdottoSearch");
    const hiddenInput = document.getElementById("movimentoProdotto");
    selectedProdottoId = prodotto.id;
    hiddenInput.value = prodotto.id;
    searchInput.value = prodotto.nome + (prodotto.marca_nome ? ` (${prodotto.marca_nome.toUpperCase()})` : "");
    searchInput.classList.add("has-selection");
    showGiacenzaInfo(prodotto.id);

    if (giacenzaInfo && giacenzaInfo.parentNode) {
      const flag = document.createElement("div");
      flag.setAttribute("data-riordino-flag", "true");
      giacenzaInfo.parentNode.insertBefore(flag, giacenzaInfo);
    }
    document.getElementById("movimentoData").value = new Date().toISOString().split("T")[0];
    document.getElementById("movimentoQuantita").focus();
  }, 150);
}

// ══════════════════════════════════════════════════════════════
// RIORDINO DA TABELLA MOVIMENTI
// ══════════════════════════════════════════════════════════════
function handleRiordino(movimentoId) {
  const movimento = allMovimenti.find((m) => m.id === movimentoId);
  if (!movimento) { alert("❌ Movimento non trovato"); return; }
  if (movimento.tipo !== "carico") { alert("❌ Puoi riordinare solo i carichi!"); return; }
  openRiordinoModal(movimento);
}

function openRiordinoModal(movimento) {
  openMovimentoModal(null);
  setTimeout(() => {
    const modalTitle = document.getElementById("modalMovimentoTitle");
    if (modalTitle) modalTitle.textContent = "Nuovo Movimento (Riordino)";
    precompileRiordino(movimento);
  }, 100);
}

function precompileRiordino(movimento) {
  document.getElementById("movimentoId").value = "";
  document.getElementById("movimentoTipo").value = "carico";
  togglePrezzoField();

  const giacenzaInfo = document.getElementById("giacenzaInfo");
  if (giacenzaInfo && giacenzaInfo.parentNode) {
    giacenzaInfo.parentNode.querySelectorAll('[data-riordino-flag="true"]').forEach((el) => el.remove());
  }

  const searchInput = document.getElementById("movimentoProdottoSearch");
  const hiddenInput = document.getElementById("movimentoProdotto");
  const prodotto = (allProdotti || []).find((p) => p.id === movimento.prodotto_id);

  if (prodotto) {
    selectedProdottoId = prodotto.id;
    hiddenInput.value = prodotto.id;
    searchInput.value = prodotto.nome + (prodotto.marca_nome ? ` (${prodotto.marca_nome.toUpperCase()})` : "");
    searchInput.classList.add("has-selection");
    showGiacenzaInfo(prodotto.id);
    if (giacenzaInfo && giacenzaInfo.parentNode) {
      const flag = document.createElement("div");
      flag.setAttribute("data-riordino-flag", "true");
      giacenzaInfo.parentNode.insertBefore(flag, giacenzaInfo);
      giacenzaInfo.style.display = "block";
    }
    document.getElementById("movimentoQuantita").focus();
  } else {
    selectedProdottoId = null;
    hiddenInput.value = "";
    searchInput.value = "";
    searchInput.classList.remove("has-selection");
    if (giacenzaInfo) giacenzaInfo.style.display = "none";
    document.getElementById("movimentoProdottoSearch").focus();
  }
  document.getElementById("movimentoData").value = movimento.data_movimento.split("T")[0];
  document.getElementById("movimentoQuantita").value = parseFloat(movimento.quantita || 0).toFixed(2);
  document.getElementById("movimentoPrezzo").value = parseFloat(movimento.prezzo || 0).toFixed(2);
  document.getElementById("movimentoFattura").value = movimento.fattura_doc || "";
  document.getElementById("movimentoFornitore").value = movimento.fornitore_cliente_id || "";
}

// ── Export globale ───────────────────────────────────────────
window.handleRiordino = handleRiordino;
window.handleRiordinoDaProdotto = handleRiordinoDaProdotto;
window.loadRiordinoSection = loadRiordinoSection;
window.filterRiordinoList = filterRiordinoList;
window.renderRiordinoSection = renderRiordinoSection;

// ══════════════════════════════════════════════════════════════
// AUTO-LOAD: osserva quando la sezione riordino diventa attiva
// Fallback indipendente da navigation.js
// ══════════════════════════════════════════════════════════════
document.addEventListener("DOMContentLoaded", () => {
  const sectionEl = document.getElementById("section-riordino");
  if (!sectionEl) return;

  // Ricarica sempre quando la sezione diventa attiva (non solo la prima volta)
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((m) => {
      if (m.type === "attributes" && m.attributeName === "class") {
        if (sectionEl.classList.contains("active")) {
          loadRiordinoSection();
        }
      }
    });
  });

  observer.observe(sectionEl, { attributes: true, attributeFilter: ["class"] });

  // ── Aggiornamento real-time via Socket.IO ──────────────────
  // Se la sezione riordino è aperta e arriva un aggiornamento
  // da un altro client (o dalla stessa tab dopo un movimento),
  // ricarica automaticamente senza bisogno di refresh.
  if (typeof io !== "undefined") {
    const socket = typeof window._socket !== "undefined" ? window._socket : io();
    window._socket = socket;

    const eventiDaAscoltare = [
      "magazzino_aggiornato",
      "prodotti_aggiornati",
      "prodotto_aggiunto",
      "prodotto_modificato",
      "prodotto_eliminato",
    ];

    eventiDaAscoltare.forEach((evento) => {
      socket.on(evento, () => {
        if (sectionEl.classList.contains("active")) {
          loadRiordinoSection();
        }
      });
    });
  }
});