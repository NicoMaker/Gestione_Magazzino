// ==================== SISTEMA DI RICERCA ====================
// File: search.js
// Scopo: Filtri per ogni sezione + memoria persistente in localStorage

const SEARCHKEYS = {
  marche:    "search_marche",
  prodotti:  "search_prodotti",
  movimenti: "search_movimenti",
  riepilogo: "search_riepilogo",
  storico:   "search_storico",
  utenti:    "search_utenti",
};

function saveSearchTerm(key, value) {
  try { localStorage.setItem(key, value ?? ""); } catch (e) { console.error(e); }
}

function getSearchTerm(key) {
  try { return localStorage.getItem(key) ?? ""; } catch (e) { return ""; }
}

// Riapplica il filtro corrente dopo un reload
function reapplyFilter(inputId) {
  const input = document.getElementById(inputId);
  if (input && input.value.trim()) {
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }
}

// Collega input di ricerca a localStorage e rilancia il filtro
function setupSearchPersistence(inputId, storageKey) {
  const input = document.getElementById(inputId);
  if (!input) return;

  const saved = getSearchTerm(storageKey);
  if (saved) {
    input.value = saved;
    setTimeout(() => input.dispatchEvent(new Event("input")), 0);
  }

  input.addEventListener("input", (e) => saveSearchTerm(storageKey, e.target.value));
}

// ── Funzioni di filtro per ogni sezione ─────────────────────

function filterMarche(searchTerm) {
  const t = searchTerm.toLowerCase();
  marche = t ? allMarche.filter((m) => m.nome.toLowerCase().includes(t)) : [...allMarche];
  renderMarche();
}

function filterProdotti(searchTerm) {
  const t = searchTerm.toLowerCase();
  prodotti = t
    ? allProdotti.filter((p) =>
        p.nome.toLowerCase().includes(t) ||
        (p.marca_nome && p.marca_nome.toLowerCase().includes(t)) ||
        (p.descrizione && p.descrizione.toLowerCase().includes(t))
      )
    : [...allProdotti];
  renderProdotti();
}

function filterMovimenti(searchTerm) {
  const t = searchTerm.toLowerCase();
  movimenti = t
    ? allMovimenti.filter((m) =>
        m.prodotto_nome.toLowerCase().includes(t) ||
        (m.marca_nome && m.marca_nome.toLowerCase().includes(t)) ||
        m.tipo.toLowerCase().includes(t) ||
        (m.prodotto_descrizione && m.prodotto_descrizione.toLowerCase().includes(t))
      )
    : [...allMovimenti];
  renderMovimenti();
}

function filterRiepilogo(searchTerm) {
  const t = searchTerm.toLowerCase();
  riepilogo = t
    ? allRiepilogo.filter((r) =>
        r.nome.toLowerCase().includes(t) ||
        (r.marca_nome && r.marca_nome.toLowerCase().includes(t)) ||
        (r.descrizione && r.descrizione.toLowerCase().includes(t))
      )
    : [...allRiepilogo];
  updateRiepilogoTotal();
  renderRiepilogo();
}

function filterStorico(searchTerm) {
  const t = searchTerm.toLowerCase();
  storico = t
    ? allStorico.filter((s) =>
        s.nome.toLowerCase().includes(t) ||
        (s.marca_nome && s.marca_nome.toLowerCase().includes(t)) ||
        (s.descrizione && s.descrizione.toLowerCase().includes(t))
      )
    : [...allStorico];
  updateStoricoTotal();
  renderStorico(storico);
}

function filterUtenti(searchTerm) {
  const t = searchTerm.toLowerCase();
  utenti = t
    ? allUtenti.filter((u) => u.username.toLowerCase().includes(t))
    : [...allUtenti];
  renderUtenti();
}

// ── Inizializzazione sistema di ricerca ──────────────────────

function initSearchSystem() {
  setupSearchPersistence("filterMarche",    SEARCHKEYS.marche);
  setupSearchPersistence("filterProdotti",  SEARCHKEYS.prodotti);
  setupSearchPersistence("filterMovimenti", SEARCHKEYS.movimenti);
  setupSearchPersistence("filterRiepilogo", SEARCHKEYS.riepilogo);
  setupSearchPersistence("filterStorico",   SEARCHKEYS.storico);
  setupSearchPersistence("filterUtenti",    SEARCHKEYS.utenti);
}
