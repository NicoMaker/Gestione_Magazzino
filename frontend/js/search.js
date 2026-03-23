// ==================== SISTEMA DI RICERCA ====================
// File: search.js
// Scopo: Filtri per ogni sezione + memoria persistente in localStorage

const SEARCHKEYS = {
  marche: "search_marche",
  prodotti: "search_prodotti",
  movimenti: "search_movimenti",
  movimentiStart: "search_movimenti_start",
  movimentiEnd: "search_movimenti_end",
  riepilogo: "search_riepilogo",
  storico: "search_storico",
  utenti: "search_utenti",
  riordino: "search_riordino",
};

function saveSearchTerm(key, value) {
  try {
    localStorage.setItem(key, value ?? "");
  } catch (e) {
    console.error(e);
  }
}

function getSearchTerm(key) {
  try {
    return localStorage.getItem(key) ?? "";
  } catch (e) {
    return "";
  }
}

// Riapplica il filtro corrente dopo un reload
function reapplyFilter(inputId) {
  const input = document.getElementById(inputId);
  if (input && input.value.trim()) {
    const filterMap = {
      filterMarche: filterMarche,
      filterProdotti: filterProdotti,
      filterMovimenti: filterMovimenti,
      filterRiepilogo: filterRiepilogo,
      filterStorico: filterStorico,
      filterUtenti: filterUtenti,
    };
    const fn = filterMap[inputId];
    if (fn) fn(input.value.trim());
  }
}

// Collega input di ricerca a localStorage e rilancia il filtro
function setupSearchPersistence(inputId, storageKey, filterFn) {
  const input = document.getElementById(inputId);
  if (!input) return;

  const saved = getSearchTerm(storageKey);
  if (saved) {
    input.value = saved;
    setTimeout(() => filterFn(saved), 0);
  }

  input.addEventListener("input", (e) => {
    const val = e.target.value;
    saveSearchTerm(storageKey, val);
    filterFn(val);
  });
}

// Collega input data a localStorage e rilancia il filtro
function setupDatePersistence(inputId, storageKey, filterFn) {
  const input = document.getElementById(inputId);
  if (!input) return;

  const saved = getSearchTerm(storageKey);
  if (saved) {
    input.value = saved;
  }

  input.addEventListener("change", (e) => {
    const val = e.target.value;

    // ── Validazione range date ───────────────────────────────
    const startInput = document.getElementById("filterMovimentiStart");
    const endInput   = document.getElementById("filterMovimentiEnd");

    if (startInput && endInput && startInput.value && endInput.value) {
      if (startInput.value > endInput.value) {
        // La data di inizio è successiva alla data di fine: correggi automaticamente
        if (inputId === "filterMovimentiStart") {
          // L'utente ha appena cambiato la data di inizio: riportala pari alla data di fine
          startInput.value = endInput.value;
          saveSearchTerm(storageKey, endInput.value);
        } else {
          // L'utente ha appena cambiato la data di fine: riportala pari alla data di inizio
          endInput.value = startInput.value;
          saveSearchTerm(storageKey, startInput.value);
        }
        // Effetto visivo lampeggiante per avvisare l'utente
        const errInput = inputId === "filterMovimentiStart" ? startInput : endInput;
        errInput.style.borderColor = "#ef4444";
        errInput.style.boxShadow = "0 0 0 3px rgba(239,68,68,0.2)";
        setTimeout(() => {
          errInput.style.borderColor = "";
          errInput.style.boxShadow = "";
        }, 1500);
      } else {
        saveSearchTerm(storageKey, val);
      }
    } else {
      saveSearchTerm(storageKey, val);
    }

    // Imposta min/max sui due campi per guidare il browser
    if (startInput && endInput) {
      if (startInput.value) endInput.min = startInput.value;
      else endInput.removeAttribute("min");
      if (endInput.value) startInput.max = endInput.value;
      else startInput.removeAttribute("max");
    }

    // Rilancia il filtro principale (che leggerà anche le date)
    const searchInput = document.getElementById("filterMovimenti");
    filterFn(searchInput ? searchInput.value : "");
  });
}

// ── Funzioni di filtro per ogni sezione ─────────────────────

function filterMarche(searchTerm) {
  const t = searchTerm.toLowerCase();
  marche = t
    ? allMarche.filter((m) => m.nome.toLowerCase().includes(t))
    : [...allMarche];
  renderMarche();
}

function filterProdotti(searchTerm) {
  const t = searchTerm.toLowerCase();
  prodotti = t
    ? allProdotti.filter(
      (p) =>
        p.nome.toLowerCase().includes(t) ||
        (p.marca_nome && p.marca_nome.toLowerCase().includes(t)) ||
        (p.descrizione && p.descrizione.toLowerCase().includes(t)),
    )
    : [...allProdotti];
  renderProdotti();
}

function filterMovimenti(searchTerm) {
  const t = searchTerm.toLowerCase();
  const startStr = document.getElementById("filterMovimentiStart")?.value;
  const endStr = document.getElementById("filterMovimentiEnd")?.value;

  movimenti = allMovimenti.filter((m) => {
    // Filtro testuale
    const matchesText =
      !t ||
      m.prodotto_nome.toLowerCase().includes(t) ||
      (m.marca_nome && m.marca_nome.toLowerCase().includes(t)) ||
      m.tipo.toLowerCase().includes(t) ||
      (m.prodotto_descrizione &&
        m.prodotto_descrizione.toLowerCase().includes(t));

    if (!matchesText) return false;

    // Filtro per data
    if (startStr && m.data_movimento < startStr) return false;
    if (endStr && m.data_movimento > endStr) return false;

    return true;
  });

  renderMovimenti();
}

function filterRiepilogo(searchTerm) {
  const t = searchTerm.toLowerCase();
  riepilogo = t
    ? allRiepilogo.filter(
      (r) =>
        r.nome.toLowerCase().includes(t) ||
        (r.marca_nome && r.marca_nome.toLowerCase().includes(t)) ||
        (r.descrizione && r.descrizione.toLowerCase().includes(t)),
    )
    : [...allRiepilogo];
  updateRiepilogoTotal();
  renderRiepilogo();
}

function filterStorico(searchTerm) {
  const t = searchTerm.toLowerCase();
  storico = t
    ? allStorico.filter(
      (s) =>
        s.nome.toLowerCase().includes(t) ||
        (s.marca_nome && s.marca_nome.toLowerCase().includes(t)) ||
        (s.descrizione && s.descrizione.toLowerCase().includes(t)),
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
  setupSearchPersistence("filterMarche", SEARCHKEYS.marche, filterMarche);
  setupSearchPersistence("filterProdotti", SEARCHKEYS.prodotti, filterProdotti);
  setupSearchPersistence(
    "filterMovimenti",
    SEARCHKEYS.movimenti,
    filterMovimenti,
  );
  setupSearchPersistence(
    "filterRiepilogo",
    SEARCHKEYS.riepilogo,
    filterRiepilogo,
  );
  setupSearchPersistence("filterStorico", SEARCHKEYS.storico, filterStorico);
  setupSearchPersistence("filterUtenti", SEARCHKEYS.utenti, filterUtenti);
  setupSearchPersistence("filterRiordino", SEARCHKEYS.riordino, filterRiordinoList);

  // Setup persistenza date movimenti (se esistono nel DOM)
  setupDatePersistence("filterMovimentiStart", SEARCHKEYS.movimentiStart, filterMovimenti);
  setupDatePersistence("filterMovimentiEnd", SEARCHKEYS.movimentiEnd, filterMovimenti);
}

// ── Ripristina il termine di ricerca salvato quando si cambia sezione ─
function restoreSearchOnSectionChange(section) {
  const map = {
    marche: { inputId: "filterMarche", fn: filterMarche },
    prodotti: { inputId: "filterProdotti", fn: filterProdotti },
    movimenti: { inputId: "filterMovimenti", fn: filterMovimenti },
    riepilogo: { inputId: "filterRiepilogo", fn: filterRiepilogo },
    storico: { inputId: "filterStorico", fn: filterStorico },
    utenti: { inputId: "filterUtenti", fn: filterUtenti },
    riordino: { inputId: "filterRiordino", fn: filterRiordinoList },
  };

  const entry = map[section];
  if (!entry) return;

  const input = document.getElementById(entry.inputId);
  if (!input) return;

  const saved = getSearchTerm(SEARCHKEYS[section]);
  if (saved) {
    input.value = saved;
    setTimeout(() => entry.fn(saved), 0);
  }
}