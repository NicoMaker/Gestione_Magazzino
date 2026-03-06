// ==================== CONFIGURAZIONE ====================
const API_URL = "api";

let marche = [];
let prodotti = [];
let movimenti = [];
let utenti = [];
let allMarche = [];
let allProdotti = [];
let allMovimenti = [];
let allRiepilogo = [];
let riepilogo = [];
let allStorico = [];
let storico = [];
let allUtenti = [];

// Logout forzato con messaggio opzionale
function forceLogout(message) {
  if (message) alert(message);
  localStorage.removeItem("username");
  localStorage.removeItem("activeSection");
  window.location.href = "index.html";
}

document.getElementById("storicoDate")?.addEventListener("change", () => {
  loadStorico();
});

// ==================== INIZIALIZZAZIONE ====================
document.addEventListener("DOMContentLoaded", () => {
  const username = localStorage.getItem("username");
  if (username) {
    document.getElementById("currentUser").textContent = username;
  }

  const savedSection = localStorage.getItem("activeSection") || "marche";

  const mobileMenuToggle = document.getElementById("mobileMenuToggle");
  const sidebar = document.getElementById("sidebar");

  if (mobileMenuToggle) {
    mobileMenuToggle.addEventListener("click", () => {
      sidebar.classList.toggle("mobile-open");
      mobileMenuToggle.classList.toggle("active");
    });

    document.addEventListener("click", (e) => {
      if (window.innerWidth <= 768) {
        if (
          !sidebar.contains(e.target) &&
          !mobileMenuToggle.contains(e.target)
        ) {
          sidebar.classList.remove("mobile-open");
          mobileMenuToggle.classList.remove("active");
        }
      }
    });
  }

  // Setup navigation
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      const section = item.dataset.section;

      document
        .querySelectorAll(".nav-item")
        .forEach((i) => i.classList.remove("active"));
      document
        .querySelectorAll(".content-section")
        .forEach((s) => s.classList.remove("active"));

      item.classList.add("active");
      document.getElementById(`section-${section}`).classList.add("active");

      localStorage.setItem("activeSection", section);

      if (window.innerWidth <= 768) {
        sidebar.classList.remove("mobile-open");
        mobileMenuToggle.classList.remove("active");
      }

      // Carica dati sezione
      if (section === "marche") loadMarche();
      if (section === "prodotti") loadProdotti();
      if (section === "movimenti") loadMovimenti();
      if (section === "riepilogo") loadRiepilogo();
      if (section === "utenti") loadUtenti();
    });
  });

  document.querySelectorAll(".nav-item").forEach((item) => {
    if (item.dataset.section === savedSection) {
      item.click();
    }
  });

  // Logout
  document.getElementById("logoutBtn").addEventListener("click", () => {
    localStorage.removeItem("username");
    localStorage.removeItem("activeSection");
    window.location.href = "index.html";
  });

  // =======================================================
  // 🎯 NUOVO LISTENER PER CAMBIO CARICO/SCARICO
  // =======================================================
  const movimentoTipoSelect = document.getElementById("movimentoTipo");

  if (movimentoTipoSelect) {
    // Quando il valore del campo 'movimentoTipo' cambia,
    // esegui la funzione per mostrare/nascondere i campi.
    movimentoTipoSelect.addEventListener("change", togglePrezzoField);
  }
});

// ==================== MARCHE ====================

document.getElementById("filterMarche")?.addEventListener("input", (e) => {
  const searchTerm = e.target.value.toLowerCase();
  marche = allMarche.filter((m) => m.nome.toLowerCase().includes(searchTerm));
  renderMarche();
});

function openMarcaModal(marca = null) {
  const modal = document.getElementById("modalMarca");
  const title = document.getElementById("modalMarcaTitle");
  const form = document.getElementById("formMarca");

  form.reset();

  if (marca) {
    title.textContent = "Modifica Marca";
    document.getElementById("marcaId").value = marca.id;
    document.getElementById("marcaNome").value = marca.nome;
  } else {
    title.textContent = "Nuova Marca";
    document.getElementById("marcaId").value = "";
  }

  modal.classList.add("active");
}

function closeMarcaModal() {
  document.getElementById("modalMarca").classList.remove("active");
}

function editMarca(id) {
  const marca = marche.find((m) => m.id === id);
  if (marca) openMarcaModal(marca);
}

document.getElementById("formMarca").addEventListener("submit", async (e) => {
  e.preventDefault();

  const id = document.getElementById("marcaId").value;
  const nome = document.getElementById("marcaNome").value.trim();

  const method = id ? "PUT" : "POST";
  const url = id ? `${API_URL}/marche/${id}` : `${API_URL}/marche`;

  try {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome }),
    });

    const data = await res.json();

    if (res.ok) {
      if (typeof ignoreNextSocketUpdate === "function")
        ignoreNextSocketUpdate();
      alert(id ? "Marca aggiornata!" : "Marca creata!");
      closeMarcaModal();
      loadMarche();
    } else {
      alert(data.error || "Errore durante il salvataggio");
    }
  } catch (error) {
    alert("Errore di connessione");
  }
});

// ==================== PRODOTTI ====================
async function loadProdotti() {
  try {
    const res = await fetch(`${API_URL}/prodotti`);
    allProdotti = await res.json();
    prodotti = allProdotti;
    renderProdotti();
    reapplyFilter("filterProdotti");
  } catch (error) {
    console.error("Errore caricamento prodotti:", error);
  }
}

document.getElementById("filterProdotti")?.addEventListener("input", (e) => {
  const searchTerm = e.target.value.toLowerCase().trim();

  if (!searchTerm) {
    // ✅ Nessun testo: mostra tutti i prodotti
    prodotti = [...allProdotti];
  } else {
    // 🔍 Testo presente: applica il filtro COMPLETO
    prodotti = allProdotti.filter((p) => {
      // 1️⃣ Cerca nel CODICE/TELAIO PRODOTTO
      const matchesNome = p.nome.toLowerCase().includes(searchTerm);

      // 2️⃣ Cerca nella MARCA
      const matchesMarca = p.marca_nome
        ? p.marca_nome.toLowerCase().includes(searchTerm)
        : false;

      // 3️⃣ Cerca nella DESCRIZIONE
      const matchesDescrizione = p.descrizione
        ? p.descrizione.toLowerCase().includes(searchTerm)
        : false;

      // ✅ Ritorna TRUE se ALMENO UNO dei criteri è soddisfatto
      return matchesNome || matchesMarca || matchesDescrizione;
    });
  }

  // 🎨 Renderizza i risultati filtrati
  renderProdotti();

  // 📊 LOG per debug (opzionale)
  console.log(
    `🔍 Ricerca: "${searchTerm}" → ${prodotti.length} prodotti trovati`,
  );
});

function editProdotto(id) {
  const prodotto = prodotti.find((p) => p.id === id);
  if (prodotto) openProdottoModal(prodotto);
}

// listener di submit spostato più sotto per evitare registrazioni duplicate

// ==================== MOVIMENTI ====================

document.getElementById("filterMovimenti")?.addEventListener("input", (e) => {
  const searchTerm = e.target.value.toLowerCase();
  movimenti = allMovimenti.filter(
    (m) =>
      m.prodotto_nome.toLowerCase().includes(searchTerm) ||
      (m.marca_nome && m.marca_nome.toLowerCase().includes(searchTerm)) ||
      m.tipo.toLowerCase().includes(searchTerm) ||
      (m.prodotto_descrizione &&
        m.prodotto_descrizione.toLowerCase().includes(searchTerm)),
  );
  renderMovimenti();
});

function closeMovimentoModal() {
  document.getElementById("modalMovimento").classList.remove("active");
}

function editMovimento(id) {
  const movimento = movimenti.find((m) => m.id === id);
  if (movimento) openMovimentoModal(movimento);
}

document
  .getElementById("formMovimento")
  .addEventListener("submit", async (e) => {
    e.preventDefault();

    const id = document.getElementById("movimentoId").value;
    const prodotto_id = document.getElementById("movimentoProdotto").value;
    const tipo = document.getElementById("movimentoTipo").value;

    // ⭐ USA LA NUOVA FUNZIONE DI PARSING
    const quantitaValue = document.getElementById("movimentoQuantita").value;
    const quantita = parseDecimalInput(quantitaValue);

    const data_movimento = document.getElementById("movimentoData").value;

    // ⭐ USA LA NUOVA FUNZIONE DI PARSING PER IL PREZZO
    let prezzo = null;
    if (tipo === "carico") {
      const prezzoValue = document.getElementById("movimentoPrezzo").value;
      prezzo = parseDecimalInput(prezzoValue);
    }

    const fattura_doc =
      tipo === "carico"
        ? document.getElementById("movimentoFattura").value.trim() || null
        : null;
    const fornitore =
      tipo === "carico"
        ? document.getElementById("movimentoFornitore").value.trim() || null
        : null;

    // Validazioni
    if (!prodotto_id || !tipo || !quantita || !data_movimento) {
      alert("Compila tutti i campi obbligatori!");
      return;
    }

    if (quantita <= 0) {
      alert("La quantità deve essere maggiore di 0!");
      return;
    }

    if (tipo === "carico") {
      if (!prezzo || prezzo <= 0) {
        alert("Il prezzo deve essere maggiore di 0 per i carichi!");
        return;
      }

      if (!fattura_doc || !fornitore) {
        alert("Documento e Fornitore sono obbligatori per i carichi!");
        return;
      }
    }

    const method = id ? "PUT" : "POST";
    const url = id ? `${API_URL}/dati/${id}` : `${API_URL}/dati`;

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prodotto_id,
          tipo,
          quantita: Number.parseFloat(quantita.toFixed(2)), // Assicura 2 decimali
          prezzo: prezzo ? Number.parseFloat(prezzo.toFixed(2)) : null, // Assicura 2 decimali
          data_movimento,
          fattura_doc,
          fornitore,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        if (typeof ignoreNextSocketUpdate === "function")
          ignoreNextSocketUpdate();
        alert(id ? "Movimento aggiornato!" : "Movimento registrato!");
        closeMovimentoModal();
        loadMovimenti();
        loadProdotti();
      } else {
        alert(data.error || "Errore durante il salvataggio");
      }
    } catch (error) {
      alert("Errore di connessione");
    }
  });

document
  .getElementById("movimentoProdotto")
  ?.addEventListener("change", async (e) => {
    const prodottoId = e.target.value;
    if (prodottoId) {
      await showGiacenzaInfo(prodottoId);
    } else {
      document.getElementById("giacenzaInfo").style.display = "none";
    }
  });

async function showGiacenzaInfo(prodottoId) {
  try {
    const prodotto = prodotti.find((p) => p.id == prodottoId);
    if (prodotto) {
      const giacenzaInfo = document.getElementById("giacenzaInfo");
      const giacenzaValue = document.getElementById("giacenzaValue");

      giacenzaValue.textContent = `${prodotto.nome} ${
        prodotto.marca_nome ? `(${prodotto.marca_nome})` : ""
      } - Giacenza: ${formatQuantity(prodotto.giacenza || 0)} pz`;
      giacenzaInfo.style.display = "block";
    }
  } catch (error) {
    console.error("Errore caricamento giacenza:", error);
  }
}

// ==================== RIEPILOGO ====================
async function loadRiepilogo() {
  try {
    const res = await fetch(`${API_URL}/magazzino/riepilogo`);
    const data = await res.json();

    allRiepilogo = data.riepilogo || [];
    riepilogo = allRiepilogo;

    // CHANGE: Aggiorna il totale in base ai prodotti visibili
    updateRiepilogoTotal();
    renderRiepilogo();
    reapplyFilter("filterRiepilogo");
  } catch (error) {
    console.error("Errore caricamento riepilogo:", error);
  }
}

// CHANGE: Nuova funzione per aggiornare il totale del riepilogo
function updateRiepilogoTotal() {
  const valoreTotaleFiltrato = riepilogo.reduce(
    (sum, r) => sum + Number.parseFloat(r.valore_totale || 0),
    0,
  );
  document.getElementById("valoreTotale").textContent =
    formatCurrency(valoreTotaleFiltrato);
}

document.getElementById("filterRiepilogo")?.addEventListener("input", (e) => {
  const searchTerm = e.target.value.toLowerCase();
  riepilogo = allRiepilogo.filter(
    (r) =>
      r.nome.toLowerCase().includes(searchTerm) ||
      (r.marca_nome && r.marca_nome.toLowerCase().includes(searchTerm)) ||
      (r.descrizione && r.descrizione.toLowerCase().includes(searchTerm)),
  );
  updateRiepilogoTotal();
  renderRiepilogo();
});

// ==================== STORICO ====================

// ==================== STORICO ====================

// CHANGE: Nuova funzione per aggiornare il totale dello storico

document.getElementById("filterStorico")?.addEventListener("input", (e) => {
  const searchTerm = e.target.value.toLowerCase();
  storico = allStorico.filter(
    (s) =>
      s.nome.toLowerCase().includes(searchTerm) ||
      (s.marca_nome && s.marca_nome.toLowerCase().includes(searchTerm)) ||
      (s.descrizione && s.descrizione.toLowerCase().includes(searchTerm)),
  );
  // CHANGE: Aggiunto ricalcolo del totale dopo il filtro
  updateStoricoTotal();
  renderStorico(storico);
});

// ==================== UTENTI ====================
async function loadUtenti() {
  try {
    const res = await fetch(`${API_URL}/utenti`);
    allUtenti = await res.json(); // CHANGE: Salva tutte le marche in allUtenti
    utenti = allUtenti; // CHANGE: Reimposta utenti alla copia di allUtenti per il rendering iniziale
    renderUtenti();
    reapplyFilter("filterUtenti");
  } catch (error) {
    console.error("Errore caricamento utenti:", error);
  }
}

document.getElementById("filterUtenti")?.addEventListener("input", (e) => {
  const searchTerm = e.target.value.toLowerCase();
  utenti = allUtenti.filter((u) =>
    u.username.toLowerCase().includes(searchTerm),
  );
  renderUtenti();
});

function closeUserModal() {
  document.getElementById("modalUser").classList.remove("active");
}

function editUser(id) {
  const user = utenti.find((u) => u.id === id);
  if (user) openUserModal(user);
}

async function deleteUser(id) {
  if (!(await confirm("Sei sicuro di voler eliminare questo utente?"))) return;

  try {
    const currentUser = localStorage.getItem("username") || "";
    const res = await fetch(
      `${API_URL}/utenti/${id}?current_user=${encodeURIComponent(currentUser)}`,
      {
        method: "DELETE",
      },
    );
    const data = await res.json();

    if (res.ok) {
      if (data.utente_eliminato) {
        forceLogout(
          "Hai eliminato il tuo account. Verrai disconnesso e dovrai effettuare di nuovo il login.",
        );
      } else {
        if (typeof ignoreNextSocketUpdate === "function")
          ignoreNextSocketUpdate();
        alert("Utente eliminato con successo!");
        loadUtenti();
      }
    } else {
      alert(data.error || "Errore durante l'eliminazione");
    }
  } catch (error) {
    alert("Errore di connessione");
  }
}

document.getElementById("formUser").addEventListener("submit", async (e) => {
  e.preventDefault();

  const id = document.getElementById("userId").value;
  const username = document.getElementById("userUsername").value.trim();
  const password = document.getElementById("userPassword").value;

  const method = id ? "PUT" : "POST";
  const url = id ? `${API_URL}/utenti/${id}` : `${API_URL}/utenti`;

  const body = { username };
  if (password) body.password = password;
  if (id) {
    body.current_user = localStorage.getItem("username") || null;
  }

  try {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (res.ok) {
      const mustLogout =
        data.username_modificato || data.password_modificata || false;

      if (typeof ignoreNextSocketUpdate === "function")
        ignoreNextSocketUpdate();
      alert(id ? "Utente aggiornato!" : "Utente creato!");
      closeUserModal();
      if (mustLogout) {
        forceLogout(
          "Le tue credenziali sono cambiate. Effettua di nuovo l'accesso.",
        );
      } else {
        loadUtenti();
      }
    } else {
      alert(data.error || "Errore durante il salvataggio");
    }
  } catch (error) {
    alert("Errore di connessione");
  }
});

// ==================== FUNZIONI DI UTILITA ====================
// CHANGE: Aggiornata funzione formatCurrency per garantire € sempre davanti al numero

// CHANGE: Funzione helper per formattare valuta con simbolo €

// ==================== UTILITY PER INPUT DECIMALI ====================

// Funzione per limitare a 2 decimali durante la digitazione

// Applica la limitazione agli input quando si apre il modal

// ==================== GESTIONE SEPARATORE DECIMALE ====================

// Rileva il separatore decimale del browser dell'utente

// Formatta numero con separatore corretto per l'utente
function formatNumberWithLocale(num) {
  const n = Number.parseFloat(num);
  if (isNaN(n)) return "0";

  const separator = getDecimalSeparator();
  const formatted = n.toFixed(2);

  // Se il separatore locale è virgola, sostituisci il punto
  if (separator === ",") {
    return formatted.replace(".", ",");
  }

  return formatted;
}

// Aggiorna la funzione formatCurrency esistente

// Aggiorna formatNumber per usare il separatore locale

// Formatta quantità: senza decimali se intero, altrimenti 2 decimali con virgola

// ==================== GESTIONE INPUT DECIMALI (MAX 2 CIFRE) ====================

/**
 * Limita l'input a massimo 2 cifre decimali in tempo reale
 * Accetta sia punto che virgola come separatore
 */

/**
 * Converte il valore dell'input in numero float
 * Gestisce sia punto che virgola
 */

/**
 * Applica la limitazione decimale agli input quantità e prezzo
 */

// ==================== RICERCA PRODOTTI NEL MOVIMENTO ====================

let selectedProdottoId = null;

function setupProductSearch() {
  const searchInput = document.getElementById("movimentoProdottoSearch");
  const hiddenInput = document.getElementById("movimentoProdotto");
  const resultsContainer = document.getElementById("prodottoSearchResults");

  if (!searchInput || !resultsContainer) return;

  // Reset selezione
  selectedProdottoId = null;
  searchInput.classList.remove("has-selection");

  // Ricerca mentre digiti
  searchInput.addEventListener("input", (e) => {
    const searchTerm = e.target.value.toLowerCase().trim();

    // Se l'utente modifica dopo aver selezionato, resetta la selezione
    if (selectedProdottoId !== null) {
      selectedProdottoId = null;
      hiddenInput.value = "";
      searchInput.classList.remove("has-selection");
      document.getElementById("giacenzaInfo").style.display = "none";
    }

    if (searchTerm.length === 0) {
      resultsContainer.classList.remove("show");
      resultsContainer.innerHTML = "";
      return;
    }

    // Filtra i prodotti
    const filtered = prodotti.filter((p) => {
      const nome = p.nome.toLowerCase();
      const marca = (p.marca_nome || "").toLowerCase();
      const descrizione = (p.descrizione || "").toLowerCase();

      return (
        nome.includes(searchTerm) ||
        marca.includes(searchTerm) ||
        descrizione.includes(searchTerm)
      );
    });

    renderProductSearchResults(filtered, searchTerm);
  });

  // Chiudi risultati cliccando fuori
  document.addEventListener("click", (e) => {
    if (
      !searchInput.contains(e.target) &&
      !resultsContainer.contains(e.target)
    ) {
      resultsContainer.classList.remove("show");
    }
  });

  // Focus apre i risultati se c'è testo
  searchInput.addEventListener("focus", function () {
    if (this.value.trim().length > 0 && resultsContainer.children.length > 0) {
      resultsContainer.classList.add("show");
    }
  });
}

function renderProductSearchResults(filtered, searchTerm) {
  const resultsContainer = document.getElementById("prodottoSearchResults");

  if (filtered.length === 0) {
    resultsContainer.innerHTML = `
      <div class="search-no-results">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 32px; height: 32px; margin: 0 auto 8px; opacity: 0.5;">
          <circle cx="11" cy="11" r="8"/>
          <path d="M21 21l-4.35-4.35"/>
        </svg>
        Nessun prodotto trovato per "<strong>${searchTerm}</strong>"
      </div>
    `;
    resultsContainer.classList.add("show");
    return;
  }

  resultsContainer.innerHTML = filtered
    .map((p) => {
      const marcaBadge = p.marca_nome
        ? `<span class="search-result-marca">${p.marca_nome.toUpperCase()}</span>`
        : "";

      const giacenzaBadge = `<span class="search-result-giacenza">${formatQuantity(
        p.giacenza || 0,
      )} pz</span>`;

      return `
      <div class="search-result-item" data-id="${p.id}" data-nome="${
        p.nome
      }" data-marca="${p.marca_nome || ""}" data-giacenza="${p.giacenza || 0}">
        <div class="search-result-name">${highlightMatch(
          p.nome,
          searchTerm,
        )}</div>
        <div class="search-result-meta">
          ${marcaBadge}
          ${giacenzaBadge}
          ${
            p.descrizione
              ? `<span style="opacity: 0.7;">• ${p.descrizione.substring(
                  0,
                  40,
                )}${p.descrizione.length > 40 ? "..." : ""}</span>`
              : ""
          }
        </div>
      </div>
    `;
    })
    .join("");

  // Aggiungi event listener ai risultati
  resultsContainer.querySelectorAll(".search-result-item").forEach((item) => {
    item.addEventListener("click", function () {
      selectProduct(
        this.dataset.id,
        this.dataset.nome,
        this.dataset.marca,
        this.dataset.giacenza,
      );
    });
  });

  resultsContainer.classList.add("show");
}

function selectProduct(id, nome, marca, giacenza) {
  const searchInput = document.getElementById("movimentoProdottoSearch");
  const hiddenInput = document.getElementById("movimentoProdotto");
  const resultsContainer = document.getElementById("prodottoSearchResults");

  selectedProdottoId = id;
  hiddenInput.value = id;

  // Mostra il nome selezionato nell'input
  const displayText = marca ? `${nome} (${marca.toUpperCase()})` : nome;
  searchInput.value = displayText;
  searchInput.classList.add("has-selection");

  // Chiudi risultati
  resultsContainer.classList.remove("show");

  // Mostra giacenza
  showGiacenzaInfo(id);
}

// script.js (Intorno a riga 485)

// script.js (Intorno a riga 1120, o dove si trova la tua funzione searchProducts)

async function searchProducts() {
  const searchInput = document.getElementById("movimentoProdottoSearch");
  const resultsContainer = document.getElementById("prodottoSearchResults");

  if (!searchInput || !resultsContainer) {
    console.error("Elementi search non trovati");
    return;
  }

  const searchTerm = searchInput.value.toLowerCase().trim();

  console.log("searchProducts chiamata - searchTerm:", searchTerm);
  console.log("allProdotti disponibili:", allProdotti ? allProdotti.length : 0);

  // 🔥 Se allProdotti è vuoto (sezione prodotti non ancora visitata), carica dall'API
  if (!allProdotti || allProdotti.length === 0) {
    resultsContainer.innerHTML = `
      <div class="search-no-results">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 32px; height: 32px; margin: 0 auto 8px; opacity: 0.5; animation: spin 1s linear infinite;">
          <circle cx="11" cy="11" r="8" stroke-dasharray="25 10"/>
        </svg>
        Caricamento prodotti...
      </div>
    `;
    resultsContainer.classList.add("show");
    try {
      const res = await fetch(`${API_URL}/prodotti`);
      allProdotti = await res.json();
      prodotti = allProdotti;
      console.log("✅ Prodotti caricati per ricerca:", allProdotti.length);
    } catch (error) {
      console.error("Errore caricamento prodotti per ricerca:", error);
      resultsContainer.innerHTML = `
        <div class="search-no-results">
          Errore nel caricamento dei prodotti. Riprova.
        </div>
      `;
      return;
    }
  }

  // 🎯 Filtra i prodotti: se vuoto mostra TUTTI, altrimenti filtra
  const filteredProducts = allProdotti.filter((p) => {
    // Se non c'è testo di ricerca, mostra tutti i prodotti
    if (!searchTerm || searchTerm === "") {
      return true;
    }

    // Altrimenti filtra in base al termine di ricerca
    const matchesNome = p.nome.toLowerCase().includes(searchTerm);
    const matchesMarca = (p.marca_nome || "")
      .toLowerCase()
      .includes(searchTerm);
    const matchesDescrizione = p.descrizione
      ? p.descrizione.toLowerCase().includes(searchTerm)
      : false;

    return matchesNome || matchesMarca || matchesDescrizione;
  });

  console.log("Prodotti filtrati:", filteredProducts.length);

  // Se nessun prodotto trovato dopo il filtro
  if (filteredProducts.length === 0) {
    resultsContainer.innerHTML = `
      <div class="search-no-results">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 32px; height: 32px; margin: 0 auto 8px; opacity: 0.5;">
          <circle cx="11" cy="11" r="8"/>
          <path d="M21 21l-4.35-4.35"/>
        </svg>
        Nessun prodotto trovato per "<strong>${searchTerm}</strong>"
      </div>
    `;
    resultsContainer.classList.add("show");
    return;
  }

  // Costruisci l'HTML per i risultati
  resultsContainer.innerHTML = filteredProducts
    .map((p) => {
      const nomeHighlighted = highlightMatch(p.nome, searchTerm);
      const marcaHighlighted = highlightMatch(p.marca_nome || "", searchTerm);

      return `
      <div 
        class="search-result-item" 
        data-id="${p.id}" 
        data-nome="${p.nome}" 
        data-marca="${p.marca_nome || ""}" 
        data-giacenza="${p.giacenza || 0}"
      >
        <div class="search-result-name">${nomeHighlighted}</div>
        <div class="search-result-meta">
          ${
            p.marca_nome
              ? `<span class="search-result-marca">${marcaHighlighted}</span>`
              : ""
          }
          <span class="search-result-giacenza">${formatQuantity(
            p.giacenza || 0,
          )} pz</span>
          ${
            p.descrizione
              ? `<span style="opacity: 0.7;">• ${p.descrizione.substring(
                  0,
                  40,
                )}${p.descrizione.length > 40 ? "..." : ""}</span>`
              : ""
          }
        </div>
      </div>
    `;
    })
    .join("");

  // Aggiungi event listener ai risultati
  resultsContainer.querySelectorAll(".search-result-item").forEach((item) => {
    item.addEventListener("click", function () {
      selectProduct(
        this.dataset.id,
        this.dataset.nome,
        this.dataset.marca,
        this.dataset.giacenza,
      );
    });
  });

  resultsContainer.classList.add("show");
  console.log("Dropdown mostrato con", filteredProducts.length, "prodotti");
}

// File: script.js

/**
 * Converte il valore dell'input in numero float.
 * Gestisce sia punto che virgola, convertendo tutto in punto per il parseFloat.
 */

/**
 * Limita l'input a massimo 2 cifre decimali in tempo reale.
 * Usa toFixed(2) per visualizzare sempre lo zero finale (es. 0.5 diventa 0.50).
 */

// File: script.js

// Determina il separatore decimale locale (virgola o punto)

/**
 * Formatta numero con separatore corretto per l'utente,
 * garantendo sempre 2 decimali con toFixed(2).
 */

// Formatta un numero come valuta (es. € 1.234,56)

// ==================== FUNZIONI DI UTILITA (già presenti) ====================

// Determina il separatore decimale locale (virgola o punto)

/**
 * Converte il valore dell'input in numero float.
 * Gestisce sia punto che virgola, convertendo tutto in punto per il parseFloat.
 */

// ==================== NUOVE FUNZIONI CORRETTE ====================

/**
 * Limita l'input a massimo 2 cifre decimali, evitando di bloccare la digitazione.
 * La formattazione finale a .00 viene applicata solo al BLUR.
 *
 */

// File: script.js

/**
 * Formatta numero con separatore corretto per l'utente,
 * garantendo sempre 2 decimali con toFixed(2).
 */

// Formatta un numero come valuta (es. € 1.234,56)

// File: script.js

// Determina il separatore decimale locale (virgola o punto)

/**
 * Converte il valore dell'input in numero float.
 * Gestisce sia punto che virgola, convertendo tutto in punto per il parseFloat.
 */

// File: script.js

/**
 * Limita l'input a massimo 2 cifre decimali durante la digitazione
 * e forza la formattazione a due decimali (.00) all'uscita dal campo (blur).
 */

/**
 * Applica la limitazione decimale agli input quantità e prezzo
 * Questa funzione dovrebbe essere chiamata all'apertura del modal Movimenti.
 */

// File: script.js

/**
 * Formatta numero con separatore corretto per l'utente,
 * garantendo sempre 2 decimali con toFixed(2).
 */

// Formatta un numero come valuta (es. € 1.234,56)

// ==================== GESTIONE DECIMALI A 2 CIFRE ====================

/**
 * Determina il separatore decimale in base alle impostazioni locali
 * @returns {string} ',' o '.'
 */
function getDecimalSeparator() {
  const num = 1.1;
  const formatted = num.toLocaleString(undefined, { minimumFractionDigits: 1 });
  return formatted.includes(",") ? "," : ".";
}

/**
 * Converte stringa input in numero float
 * Accetta sia virgola che punto come separatore decimale
 * @param {string} value - Valore da convertire
 * @returns {number} - Numero convertito o 0 se non valido
 */
function parseDecimalInput(value) {
  if (!value || value === "") return 0;
  // Converte virgola in punto per parseFloat
  const cleaned = String(value).replace(",", ".");
  const num = Number.parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/**
 * Applica limitazione decimali a 2 cifre su un input
 * Gestisce input in tempo reale e formattazione al blur
 * @param {HTMLElement} inputElement - Elemento input da limitare
 */
function limitToTwoDecimals(inputElement) {
  if (!inputElement) {
    console.error("Input element non trovato per limitToTwoDecimals");
    return;
  }

  const separator = getDecimalSeparator();

  // ========== EVENTO INPUT (durante la digitazione) ==========
  const handleInput = function (e) {
    let value = this.value;

    // Rimuovi tutti i caratteri non validi (solo numeri, punto e virgola)
    value = value.replace(/[^\d.,]/g, "");

    // Sostituisci virgola con punto per gestione interna
    value = value.replace(",", ".");

    // Gestisci separatori multipli (mantieni solo il primo)
    const parts = value.split(".");
    if (parts.length > 2) {
      value = parts[0] + "." + parts.slice(1).join("");
    }

    // Limita decimali a 2 cifre SENZA applicare toFixed
    if (parts.length === 2 && parts[1].length > 2) {
      parts[1] = parts[1].substring(0, 2);
      value = parts.join(".");
    }

    // Mostra con separatore locale
    this.value = value.replace(".", separator);
  };

  // ========== EVENTO BLUR (quando si esce dal campo) ==========
  const handleBlur = function (e) {
    const value = this.value;

    // Se vuoto, imposta a 0.00
    if (value === "" || value === separator) {
      this.value = `0${separator}00`;
      return;
    }

    // Converte in numero
    const num = parseDecimalInput(value);

    if (!isNaN(num)) {
      // APPLICA toFixed(2) per forzare 2 decimali
      this.value = num.toFixed(2).replace(".", separator);
    } else {
      this.value = `0${separator}00`;
    }
  };

  // ========== EVENTO PASTE (incolla) ==========
  const handlePaste = function (e) {
    e.preventDefault();
    const pastedText = (e.clipboardData || window.clipboardData).getData(
      "text",
    );
    const cleaned = pastedText.replace(/[^\d.,]/g, "").replace(",", ".");
    const num = Number.parseFloat(cleaned);

    if (!isNaN(num) && num >= 0) {
      this.value = num.toFixed(2).replace(".", separator);
    }
  };

  // ========== EVENTO KEYDOWN (previeni caratteri non validi) ==========
  const handleKeydown = function (e) {
    const separator = getDecimalSeparator();
    const allowedKeys = [
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

    // Permetti tasti di controllo
    if (
      allowedKeys.includes(e.key) ||
      e.ctrlKey ||
      e.metaKey || // Ctrl/Cmd per copia/incolla
      e.key === "a" ||
      e.key === "A"
    ) {
      return;
    }

    // Permetti numeri
    if (/^\d$/.test(e.key)) {
      return;
    }

    // Permetti separatore decimale (solo uno)
    if (
      (e.key === separator || e.key === "." || e.key === ",") &&
      !this.value.includes(separator)
    ) {
      return;
    }

    // Blocca tutto il resto
    e.preventDefault();
  };

  // Rimuovi listener esistenti (clonando e sostituendo l'elemento)
  const newInput = inputElement.cloneNode(true);
  inputElement.parentNode.replaceChild(newInput, inputElement);

  // Aggiungi i nuovi listener
  newInput.addEventListener("input", handleInput);
  newInput.addEventListener("blur", handleBlur);
  newInput.addEventListener("paste", handlePaste);
  newInput.addEventListener("keydown", handleKeydown);

  return newInput;
}

/**
 * Applica limitazione decimali agli input Quantità e Prezzo
 * Chiamare questa funzione all'apertura del modal Movimento
 */
function setupDecimalInputs() {
  console.log("🔧 Setup decimal inputs chiamato");

  const quantitaInput = document.getElementById("movimentoQuantita");
  const prezzoInput = document.getElementById("movimentoPrezzo");

  if (quantitaInput) {
    console.log("✅ Applicando limitazione decimali a Quantità");
    limitToTwoDecimals(quantitaInput);
  } else {
    console.error("❌ Input movimentoQuantita non trovato");
  }

  if (prezzoInput) {
    console.log("✅ Applicando limitazione decimali a Prezzo");
    limitToTwoDecimals(prezzoInput);
  } else {
    console.error("❌ Input movimentoPrezzo non trovato");
  }
}

/**
 * Formatta numero con separatore locale e 2 decimali
 * @param {number} num - Numero da formattare
 * @returns {string} - Numero formattato (es. "1.234,56")
 */
function formatNumber(num) {
  const n = Number.parseFloat(num);
  if (isNaN(n)) return "0,00";

  const separator = getDecimalSeparator();
  // toFixed(2) garantisce sempre 2 decimali
  const parts = n.toFixed(2).split(".");

  // Aggiungi punto ogni 3 cifre nella parte intera
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");

  // Unisci con separatore locale
  return separator === "," ? parts.join(",") : parts.join(".");
}

/**
 * Formatta numero come valuta con simbolo €
 * @param {number} num - Numero da formattare
 * @returns {string} - Valuta formattata (es. "€ 1.234,56")
 */
function formatCurrency(num) {
  const n = Number.parseFloat(num);
  if (isNaN(n)) return "€ 0,00";
  return `€ ${formatNumber(n)}`;
}

// ==================== MODIFICA FUNZIONE openMovimentoModal ====================

/**
 * Apre il modal per inserire un nuovo movimento
 * IMPORTANTE: Chiama setupDecimalInputs() dopo un breve timeout
 */

// ==================== ESPORTA FUNZIONI (se usi moduli) ====================
// Se usi ES6 modules, decommenta:
// export {
//   getDecimalSeparator,
//   parseDecimalInput,
//   limitToTwoDecimals,
//   setupDecimalInputs,
//   formatNumber,
//   formatCurrency,
//   openMovimentoModal
// };

// ==================== RICERCA MARCHE NEL MODAL PRODOTTO ====================
// 🎯 GRAFICA IDENTICA ALLA RICERCA PRODOTTI NEI MOVIMENTI

let selectedMarcaId = null;

/**
 * Setup della ricerca marche nel modal prodotto
 * Chiamare questa funzione all'apertura del modal
 */
function setupMarcaSearch() {
  const searchInput = document.getElementById("prodottoMarcaSearch");
  const hiddenInput = document.getElementById("prodottoMarca");
  const resultsContainer = document.getElementById("marcaSearchResults");

  if (!searchInput || !resultsContainer) {
    console.error("❌ Elementi ricerca marca non trovati");
    return;
  }

  console.log("✅ Setup ricerca marca inizializzato");

  // Reset selezione
  selectedMarcaId = null;
  searchInput.classList.remove("has-selection");

  // Chiudi risultati cliccando fuori
  document.addEventListener("click", (e) => {
    if (
      !searchInput.contains(e.target) &&
      !resultsContainer.contains(e.target)
    ) {
      resultsContainer.classList.remove("show");
    }
  });

  // Focus apre i risultati
  searchInput.addEventListener("focus", function () {
    if (this.value.trim().length > 0 && resultsContainer.children.length > 0) {
      resultsContainer.classList.add("show");
    }
  });
}

/**
 * Funzione di ricerca marche (chiamata dall'evento oninput/onfocus)
 * 🎯 IDENTICA ALLA LOGICA DI searchProducts()
 */
function searchMarche() {
  const searchInput = document.getElementById("prodottoMarcaSearch");
  const resultsContainer = document.getElementById("marcaSearchResults");
  const hiddenInput = document.getElementById("prodottoMarca");

  if (!searchInput || !resultsContainer) {
    console.error("❌ Elementi search non trovati");
    return;
  }

  const searchTerm = searchInput.value.toLowerCase().trim();

  console.log("🔍 searchMarche chiamata - searchTerm:", searchTerm);
  console.log("📦 allMarche disponibili:", allMarche ? allMarche.length : 0);

  // Se l'utente modifica dopo aver selezionato, resetta la selezione
  if (
    selectedMarcaId !== null &&
    searchInput.classList.contains("has-selection")
  ) {
    const currentMarca = allMarche.find((m) => m.id == selectedMarcaId);
    if (currentMarca && searchInput.value !== currentMarca.nome.toUpperCase()) {
      selectedMarcaId = null;
      hiddenInput.value = "";
      searchInput.classList.remove("has-selection");
      console.log("🔄 Selezione resettata");
    }
  }

  // Verifica che allMarche sia definito e non vuoto
  if (!allMarche || allMarche.length === 0) {
    resultsContainer.innerHTML = `
      <div class="search-no-results">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/>
          <path d="M21 21l-4.35-4.35"/>
        </svg>
        Nessuna marca disponibile nel sistema
      </div>
    `;
    resultsContainer.classList.add("show");
    return;
  }

  // 🎯 Filtra le marche: se vuoto mostra TUTTE, altrimenti filtra
  const filteredMarche = allMarche.filter((m) => {
    // Se non c'è testo di ricerca, mostra tutte le marche
    if (!searchTerm || searchTerm === "") {
      return true;
    }

    // Altrimenti filtra in base al termine di ricerca
    const matchesNome = m.nome.toLowerCase().includes(searchTerm);
    return matchesNome;
  });

  console.log("📋 Marche filtrate:", filteredMarche.length);

  // Se nessuna marca trovata dopo il filtro
  if (filteredMarche.length === 0 && searchTerm) {
    resultsContainer.innerHTML = `
      <div class="search-no-results">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/>
          <path d="M21 21l-4.35-4.35"/>
        </svg>
        Nessuna marca trovata per "<strong>${searchTerm}</strong>"
      </div>
    `;
    resultsContainer.classList.add("show");
    return;
  }

  // Costruisci l'HTML per i risultati (🎯 IDENTICO AI PRODOTTI)
  resultsContainer.innerHTML = filteredMarche
    .map((m) => {
      const nomeHighlighted = highlightMatch(m.nome, searchTerm);

      return `
      <div 
        class="search-result-item marca-result-item" 
        data-id="${m.id}" 
        data-nome="${m.nome}"
      >
        <div class="search-result-name">${nomeHighlighted}</div>
      </div>
    `;
    })
    .join("");

  // Aggiungi event listener ai risultati
  resultsContainer.querySelectorAll(".marca-result-item").forEach((item) => {
    item.addEventListener("click", function () {
      selectMarca(this.dataset.id, this.dataset.nome);
    });
  });

  resultsContainer.classList.add("show");
  console.log("✅ Dropdown mostrato con", filteredMarche.length, "marche");
}

/**
 * Seleziona una marca dalla lista dei risultati
 * 🎯 IDENTICA ALLA LOGICA DI selectProduct()
 */
function selectMarca(id, nome) {
  const searchInput = document.getElementById("prodottoMarcaSearch");
  const hiddenInput = document.getElementById("prodottoMarca");
  const resultsContainer = document.getElementById("marcaSearchResults");

  selectedMarcaId = id;
  hiddenInput.value = id;

  // Mostra il nome selezionato nell'input
  searchInput.value = nome.toUpperCase();
  searchInput.classList.add("has-selection");

  // Chiudi risultati
  resultsContainer.classList.remove("show");

  console.log("✅ Marca selezionata:", { id, nome });
}

/**
 * Funzione di evidenziazione del testo cercato
 * 🎯 IDENTICA A highlightMatch() usata per i prodotti
 */
function highlightMatch(text, searchTerm) {
  if (!searchTerm) return text;

  const regex = new RegExp(`(${searchTerm})`, "gi");
  return text.replace(
    regex,
    '<mark style="background: #fef08a; padding: 2px 4px; border-radius: 3px; font-weight: 700;">$1</mark>',
  );
}

// ==================== MODIFICA FUNZIONE openProdottoModal ====================

/**
 * Apre il modal per inserire/modificare un prodotto
 * 🎯 IDENTICA ALLA LOGICA DI openMovimentoModal()
 */
async function openProdottoModal(prodotto = null) {
  console.log("📂 Apertura modal prodotto...");

  // Carica marche se necessario
  if (!allMarche || allMarche.length === 0) {
    try {
      const res = await fetch(`${API_URL}/marche`);
      allMarche = await res.json();
      console.log("📦 Marche caricate:", allMarche.length);
    } catch (error) {
      console.error("❌ Errore caricamento marche:", error);
      alert("Errore nel caricamento delle marche");
      return;
    }
  }

  const modal = document.getElementById("modalProdotto");
  const title = document.getElementById("modalProdottoTitle");
  const form = document.getElementById("formProdotto");

  form.reset();

  // Resetta ricerca marca
  const searchInput = document.getElementById("prodottoMarcaSearch");
  const hiddenInput = document.getElementById("prodottoMarca");
  const resultsContainer = document.getElementById("marcaSearchResults");

  if (searchInput) {
    searchInput.value = "";
    searchInput.classList.remove("has-selection");
  }
  if (hiddenInput) hiddenInput.value = "";
  if (resultsContainer) resultsContainer.classList.remove("show");
  selectedMarcaId = null;

  if (prodotto) {
    // Modalità modifica
    title.textContent = "Modifica Prodotto";
    document.getElementById("prodottoId").value = prodotto.id;
    document.getElementById("prodottoNome").value = prodotto.nome;
    document.getElementById("prodottoDescrizione").value =
      prodotto.descrizione || "";

    // Pre-seleziona la marca
    if (prodotto.marca_id) {
      const marca = allMarche.find((m) => m.id == prodotto.marca_id);
      if (marca) {
        selectedMarcaId = prodotto.marca_id;
        hiddenInput.value = prodotto.marca_id;
        searchInput.value = marca.nome.toUpperCase();
        searchInput.classList.add("has-selection");
        console.log("✅ Marca pre-selezionata:", marca.nome);
      }
    }
  } else {
    // Modalità creazione
    title.textContent = "Nuovo Prodotto";
    document.getElementById("prodottoId").value = "";
  }

  // Mostra modal
  modal.classList.add("active");

  // ⏱️ IMPORTANTE: Setup ricerca marca dopo breve timeout
  setTimeout(() => {
    console.log("⏱️ Timeout scaduto, applico setup ricerca marca...");
    setupMarcaSearch();
  }, 150);
}

/**
 * Chiude il modal prodotto
 */
function closeProdottoModal() {
  const modal = document.getElementById("modalProdotto");
  modal.classList.remove("active");
  selectedMarcaId = null;
  console.log("❌ Modal prodotto chiuso");
}

// ==================== SUBMIT FORM PRODOTTO ====================

/**
 * Submit del form prodotto con validazione marca
 */
document
  .getElementById("formProdotto")
  ?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const id = document.getElementById("prodottoId").value;
    const nome = document.getElementById("prodottoNome").value.trim();
    const marca_id = document.getElementById("prodottoMarca").value;
    const descrizione =
      document.getElementById("prodottoDescrizione").value.trim() || null;

    // Validazione nome
    if (!nome) {
      alert("⚠️ Il nome del prodotto è obbligatorio!");
      document.getElementById("prodottoNome").focus();
      return;
    }

    // Validazione marca
    if (!marca_id || marca_id === "") {
      alert("⚠️ Seleziona una marca dalla lista!");
      document.getElementById("prodottoMarcaSearch").focus();
      return;
    }

    const method = id ? "PUT" : "POST";
    const url = id ? `${API_URL}/prodotti/${id}` : `${API_URL}/prodotti`;

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, marca_id, descrizione }),
      });

      const data = await res.json();

      if (res.ok) {
        if (typeof ignoreNextSocketUpdate === "function")
          ignoreNextSocketUpdate();
        alert(id ? "✅ Prodotto aggiornato!" : "✅ Prodotto creato!");
        closeProdottoModal();
        loadProdotti(); // Ricarica la lista prodotti
      } else {
        alert(data.error || "❌ Errore durante il salvataggio");
      }
    } catch (error) {
      console.error("❌ Errore connessione:", error);
      alert("❌ Errore di connessione al server");
    }
  });

// ==================== ESPORTA FUNZIONI (opzionale) ====================
// export {
//   setupMarcaSearch,
//   searchMarche,
//   selectMarca,
//   openProdottoModal,
//   closeProdottoModal,
//   highlightMatch
// };

// ========== EVENTO KEYDOWN (previeni caratteri non validi) ==========
const handleKeydown = function (e) {
  const separator = getDecimalSeparator();
  const allowedKeys = [
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

  // Permetti tasti di controllo
  if (
    allowedKeys.includes(e.key) ||
    e.ctrlKey ||
    e.metaKey || // Ctrl/Cmd per copia/incolla
    e.key === "a" ||
    e.key === "A"
  ) {
    return;
  }

  // ⛔ BLOCCA SEGNO MENO (valori negativi non permessi)
  if (e.key === "-" || e.key === "_") {
    e.preventDefault();
    return;
  }

  // Permetti numeri
  if (/^\d$/.test(e.key)) {
    return;
  }

  // Permetti separatore decimale (solo uno)
  if (
    (e.key === separator || e.key === "." || e.key === ",") &&
    !this.value.includes(separator)
  ) {
    return;
  }

  // Blocca tutto il resto
  e.preventDefault();
};

// ==================== MODIFICA FUNZIONE openMovimentoModal ====================

/**
 * Apre il modal per inserire un nuovo movimento
 * IMPORTANTE: Chiama setupDecimalInputs() dopo un breve timeout
 */

/**
 * Inizializza la funzione di toggle visibilità password per un campo specifico.
 * @param {string} inputId - L'ID del campo input (es. 'userPassword').
 * @param {string} toggleId - L'ID dell'icona SVG (es. 'toggleUserPassword').
 */
function setupPasswordToggle(inputId, toggleId) {
  const passwordInput = document.getElementById(inputId);
  const togglePassword = document.getElementById(toggleId);

  if (!passwordInput || !togglePassword) {
    console.error(
      `Elementi non trovati per il toggle: ${inputId} o ${toggleId}`,
    );
    return;
  }

  // Icone SVG (occhio aperto = mostra, occhio sbarrato = nascondi)
  const iconVisible = `
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  `;
  const iconHidden = `
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.08 2.58"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
    <circle cx="12" cy="12" r="3"/>
  `;

  // La logica si basa sullo stato iniziale: input è type="password" e icona è iconVisible (occhio aperto)
  togglePassword.addEventListener("click", () => {
    // Determina il nuovo tipo
    const type =
      passwordInput.getAttribute("type") === "password" ? "text" : "password";
    // Applica il nuovo tipo
    passwordInput.setAttribute("type", type);

    // Cambia l'icona in base al nuovo stato
    if (type === "text") {
      // Password visibile -> mostra icona 'nascondi' (occhio sbarrato)
      togglePassword.innerHTML = iconHidden;
    } else {
      // Password nascosta -> mostra icona 'mostra' (occhio aperto)
      togglePassword.innerHTML = iconVisible;
    }
  });
}

// ... (nel file script.js)

function openUserModal(utente = null) {
  const modal = document.getElementById("modalUser");
  const title = document.getElementById("modalUserTitle");
  const form = document.getElementById("formUser");
  const passwordInput = document.getElementById("userPassword");
  const passwordOptional = document.getElementById("passwordOptional");
  const togglePassword = document.getElementById("toggleUserPassword");

  form.reset();

  // ⭐ Reimposta l'icona a occhio aperto ogni volta che il modal si apre
  if (togglePassword) {
    togglePassword.innerHTML = `
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    `;
  }

  if (utente) {
    // ✅ CORREZIONE: Usa 'userUsername' invece di 'userName'
    title.textContent = "Modifica Utente";
    document.getElementById("userId").value = utente.id;
    document.getElementById("userUsername").value = utente.username; // 🎯 CORRETTO
    passwordInput.placeholder = "Lascia vuoto per non modificare";
    passwordInput.required = false;
    if (passwordOptional) passwordOptional.textContent = "(Opzionale)";
  } else {
    title.textContent = "Nuovo Utente";
    document.getElementById("userId").value = "";
    passwordInput.placeholder = "Inserisci password";
    passwordInput.required = true;
    if (passwordOptional) passwordOptional.textContent = "*";
  }

  modal.classList.add("active");

  // ⭐ Attiva la funzione di toggle password
  setupPasswordToggle("userPassword", "toggleUserPassword");
}

// ==================== PDF IMPORT HANDLER (SOLO SCARICHI) ====================
// File: pdf-import.js

/**
 * Estrae testo dal PDF usando PDF.js (da CDN)
 */

/**
 * Carica PDF.js da CDN
 */

/**
 * Parser per estrarre SCARICHI dal PDF
 * Cerca: CODICE PRODOTTO e QUANTITÀ
 */
function parseScarichiFromText(text) {
  const scarichi = [];
  const lines = text.split("\n").filter((line) => line.trim());

  let foundData = { code: null, quantity: null, date: null };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // 1. CERCA DATA (priorità)
    const datePattern = /(\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4})/g;
    const dateMatch = line.match(datePattern);
    if (dateMatch && dateMatch[0]) {
      foundData.date = normalizeDate(dateMatch[0]);
    }

    // 2. CERCA CODICE PRODOTTO (alfanumerico 3+ caratteri)
    const words = line.split(/\s+/);
    for (const word of words) {
      // Pattern per codici: ABC123, ABC-123, ABC_123, ABC/123
      if (/^[A-Z0-9]{3,}[-_/]?[A-Z0-9]*$/i.test(word) && word.length >= 3) {
        // Escludi parole comuni che non sono codici
        const excluded = [
          "TOTALE",
          "TOTALI",
          "NUMERO",
          "DATA",
          "PEZZI",
          "PREZZO",
        ];
        if (!excluded.includes(word.toUpperCase())) {
          foundData.code = word.toUpperCase();
          break;
        }
      }
    }

    // 3. CERCA QUANTITÀ (numero con/senza decimali)
    // Pattern: "5", "5.5", "5,5", "5 pz", "5 PZ", "n. 5"
    const qtyPattern = /(?:n\.?\s*)?(\d+[,.]?\d*)\s*(?:pz|PZ|pezzi|pezzo)?/gi;
    const qtyMatches = [...line.matchAll(qtyPattern)];

    if (qtyMatches.length > 0) {
      for (const match of qtyMatches) {
        const qty = Number.parseFloat(match[1].replace(",", "."));
        // Validazione: quantità ragionevole (non troppo grande, non zero)
        if (qty > 0 && qty <= 999999) {
          foundData.quantity = qty;
          break;
        }
      }
    }

    // 4. Se abbiamo CODICE + QUANTITÀ + DATA, crea scarico
    if (foundData.code && foundData.quantity !== null && foundData.date) {
      scarichi.push({
        code: foundData.code,
        quantity: foundData.quantity,
        date: foundData.date,
      });

      // Reset per il prossimo movimento (mantieni la data)
      const currentDate = foundData.date;
      foundData = { code: null, quantity: null, date: currentDate };
    }
  }

  // Se non abbiamo trovato date, usa data odierna per tutti
  if (scarichi.length > 0 && !scarichi[0].date) {
    const today = new Date().toISOString().split("T")[0];
    scarichi.forEach((s) => (s.date = today));
  }

  return scarichi;
}

/**
 * Normalizza data in formato ISO (YYYY-MM-DD)
 */

/**
 * Verifica se un prodotto esiste nel database
 */

/**
 * Crea gli SCARICHI dal PDF
 */

/**
 * Funzione principale per gestire l'import PDF
 */

/**
 * Mostra loading durante l'import
 */

/**
 * Nasconde loading
 */

/**
 * Mostra i risultati dell'import in modo dettagliato
 */

/**
 * Apre il modal di import PDF
 */

/**
 * Chiude il modal di import PDF
 */

/**
 * Gestisce il submit del form - vedere listener principale più avanti
 */

// Funzione helper per formattare quantità (già presente in script.js)
function formatQuantity(num) {
  const n = Number.parseFloat(num);
  if (isNaN(n)) return "0";
  if (Number.isInteger(n)) {
    return n.toString();
  }
  return n.toFixed(2).replace(".", ",");
}

// Aggiungi queste funzioni in script.js [cite: 6]

// Gestione dell'importazione PDF

// Gestione dell'importazione PDF - listener principale definito più avanti

// Funzione che simula la lettura dei dati da prova.pdf

// Inizializzazione listener - vedere listener principale più avanti

// ==================== 📄 IMPORT PDF SCARICHI - SISTEMA COMPLETO ====================

/**
 * 🔧 Carica PDF.js da CDN (Cloudflare)
 * Versione: 3.11.174 (stabile e testata)
 */

/**
 * 📖 Estrae tutto il testo dal PDF
 * @param {File} file - File PDF da leggere
 * @returns {Promise<string>} - Testo completo estratto
 */

/**
 * 📅 Estrae la DATA dal PDF (cerca "DATA___")
 * @param {string} text - Testo completo del PDF
 * @returns {string} - Data in formato YYYY-MM-DD
 */

/**
 * 📦 Estrae gli SCARICHI dalla sezione RICAMBI
 * @param {string} text - Testo completo del PDF
 * @param {string} date - Data degli scarichi
 * @returns {Array} - Array di oggetti {code, quantity, date}
 */

/**
 * 📅 Normalizza data in formato ISO (YYYY-MM-DD)
 * @param {string} dateStr - Data in formato DD/MM/YYYY, DD-MM-YYYY, ecc.
 * @returns {string} - Data in formato YYYY-MM-DD
 */

/**
 * 🔍 Verifica se un prodotto esiste nel database
 * @param {string} code - Codice prodotto da cercare
 * @returns {Promise<Object|null>} - Oggetto prodotto o null
 */

/**
 * ✅ Crea gli SCARICHI nel database
 * @param {Array} scarichi - Array di oggetti {code, quantity, date}
 * @returns {Promise<Object>} - Risultati {success, failed, notFound, insufficientStock}
 */

/**
 * 🚀 Funzione principale per gestire l'import PDF
 * @param {File} file - File PDF da importare
 * @returns {Promise<Object>} - Risultati dell'importazione
 */

/**
 * ⏳ Mostra loading durante l'import
 */
function showImportLoading() {
  const modal = document.getElementById("modalImportPDF");
  // Cerca il bottone submit del form (sia .btn-import-confirm che btn-primary nel footer)
  const importBtn =
    modal.querySelector(".btn-import-confirm") ||
    modal.querySelector('[type="submit"]') ||
    modal.querySelector(".btn-primary");

  if (!importBtn) {
    console.warn("⚠️ Bottone import non trovato, continuo senza loading UI");
    return;
  }

  const originalHTML = importBtn.innerHTML;

  importBtn.disabled = true;
  importBtn.dataset.originalHTML = originalHTML;
  importBtn.innerHTML = `<span>⏳ Elaborazione in corso...</span>`;

  console.log("⏳ Loading mostrato");
}

/**
 * ✅ Nasconde loading
 */
function hideImportLoading() {
  const modal = document.getElementById("modalImportPDF");
  const importBtn =
    modal.querySelector(".btn-import-confirm") ||
    modal.querySelector('[type="submit"]') ||
    modal.querySelector(".btn-primary");

  if (!importBtn) {
    console.warn("⚠️ Bottone import non trovato");
    return;
  }

  if (importBtn.dataset.originalHTML) {
    importBtn.innerHTML = importBtn.dataset.originalHTML;
    importBtn.disabled = false;
    delete importBtn.dataset.originalHTML;
  }

  console.log("✅ Loading nascosto");
}

/**
 * 📊 Mostra i risultati dell'import in un alert dettagliato
 * @param {Object} results - Risultati {success, failed, notFound, insufficientStock}
 */
function showImportResults(results) {
  hideImportLoading();

  // ⚠️ CASO SPECIALE: importazione annullata dall'utente
  const duplicato = results.failed.find((f) => f.duplicato);
  if (
    duplicato &&
    results.success.length === 0 &&
    results.insufficientStock.length === 0
  ) {
    alert(`⚠️ IMPORTAZIONE ANNULLATA\n\n${duplicato.reason}`);
    return;
  }

  const total =
    results.success.length +
    results.failed.length +
    results.notFound.length +
    results.insufficientStock.length;

  let message = `📊 IMPORT COMPLETATO\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  message += `✅ Scarichi importati: ${results.success.length}/${total}\n\n`;

  // ✅ SUCCESSI
  if (results.success.length > 0) {
    message += `✅ SCARICHI CREATI CON SUCCESSO:\n`;
    results.success.forEach((r) => {
      const dateFormatted = new Date(r.date).toLocaleDateString("it-IT");
      message += `  • ${r.code} (${r.nome})\n`;
      message += `    Quantità: ${formatQuantity(
        r.quantity,
      )} pz | Data: ${dateFormatted}\n`;
    });
    message += `\n`;
  }

  // ⚠️ PRODOTTI NON TROVATI
  if (results.notFound.length > 0) {
    message += `⚠️ PRODOTTI NON TROVATI (${results.notFound.length}):\n`;
    results.notFound.forEach((r) => {
      const dateFormatted = new Date(r.date).toLocaleDateString("it-IT");
      message += `  • ${r.code} - ${formatQuantity(
        r.quantity,
      )} pz (${dateFormatted})\n`;
      message += `    → Crea prima il prodotto nella sezione "Prodotti"\n`;
    });
    message += `\n`;
  }

  // ❌ GIACENZA INSUFFICIENTE
  if (results.insufficientStock.length > 0) {
    message += `❌ GIACENZA INSUFFICIENTE (${results.insufficientStock.length}):\n`;
    results.insufficientStock.forEach((r) => {
      const dateFormatted = new Date(r.date).toLocaleDateString("it-IT");
      message += `  • ${r.code} (${r.nome})\n`;
      message += `    Richiesto: ${formatQuantity(r.quantity)} pz | Data: ${dateFormatted}\n`;
      if (r.reason) {
        message += `    Motivo: ${r.reason}\n`;
      }
    });
    message += `\n`;
  }

  // ❌ ERRORI
  if (results.failed.length > 0) {
    message += `❌ ERRORI (${results.failed.length}):\n`;
    results.failed.forEach((r) => {
      message += `  • ${r.code}: ${r.reason}\n`;
    });
  }

  alert(message);

  // Chiudi il modal solo se tutto è andato bene
  if (
    results.failed.length === 0 &&
    results.notFound.length === 0 &&
    results.insufficientStock.length === 0
  ) {
    closeImportPDFModal();
  }
}

/**
 * 🔄 Apertura modal import PDF
 */
function openImportPDFModal() {
  console.log("🔄 Apertura modal import PDF");

  const modal = document.getElementById("modalImportPDF");
  const form = document.getElementById("formImportPDF");

  if (!modal || !form) {
    console.error("❌ Modal o form non trovati");
    return;
  }

  form.reset();

  // Supporta sia 'filePreview' che 'filePreviewBox'
  const filePreview =
    document.getElementById("filePreview") ||
    document.getElementById("filePreviewBox");
  if (filePreview) {
    filePreview.style.display = "none";
    filePreview.textContent = "Trascina il PDF qui o clicca per sfogliare";
  }

  modal.classList.add("active");
}

/**
 * ❌ Chiusura modal import PDF
 */
function closeImportPDFModal() {
  console.log("❌ Chiusura modal import PDF");

  const modal = document.getElementById("modalImportPDF");

  if (!modal) {
    console.error("❌ Modal non trovato");
    return;
  }

  modal.classList.remove("active");
}

// ==================== 🎯 EVENT LISTENERS ====================

document.addEventListener("DOMContentLoaded", () => {
  console.log("🎯 Inizializzazione event listeners import PDF");

  // 1️⃣ SUBMIT FORM
  const form = document.getElementById("formImportPDF");
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      console.log("📤 Submit form import PDF");

      const fileInput = document.getElementById("importPDFFile");
      const file = fileInput.files[0];

      // Validazioni
      if (!file) {
        alert("⚠️ Seleziona un file PDF");
        return;
      }

      if (file.type !== "application/pdf") {
        alert("⚠️ Il file deve essere un PDF");
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        alert("⚠️ Il file è troppo grande (max 10MB)");
        return;
      }

      try {
        await handlePDFImport(file);
      } catch (error) {
        // Errore già gestito in handlePDFImport
        console.error("❌ Errore gestione import:", error);
      }
    });

    console.log("✅ Event listener submit form registrato");
  } else {
    console.warn("⚠️ Form import PDF non trovato");
  }

  // 2️⃣ PREVIEW FILE SELEZIONATO
  const fileInput = document.getElementById("importPDFFile");
  if (fileInput) {
    fileInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      // Supporta sia 'filePreview' che 'filePreviewBox' come id
      const preview =
        document.getElementById("filePreview") ||
        document.getElementById("filePreviewBox");

      if (file && preview) {
        const sizeKB = (file.size / 1024).toFixed(1);
        preview.textContent = `📄 ${file.name} (${sizeKB} KB)`;
        preview.style.display = "block";

        console.log(`📄 File selezionato: ${file.name} (${sizeKB} KB)`);
      }
    });

    console.log("✅ Event listener preview file registrato");
  } else {
    console.warn("⚠️ Input file PDF non trovato");
  }
});

// ==================== 🎉 FINE SEZIONE IMPORT PDF ====================
console.log("✅ Script import PDF caricato correttamente");

function printRiepilogo() {
  if (!riepilogo || riepilogo.length === 0) {
    alert("Nessun prodotto da stampare");
    return;
  }

  const valoreTotaleFiltrato = riepilogo.reduce(
    (sum, r) => sum + Number.parseFloat(r.valore_totale || 0),
    0,
  );

  let printContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Riepilogo Magazzino</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1 { color: #333; border-bottom: 2px solid #4F46E5; padding-bottom: 10px; }
        .info { margin: 20px 0; font-size: 14px; }
        .prodotto-block { margin-bottom: 30px; page-break-inside: avoid; }
        .prodotto-header { 
          background-color: #e0e7ff; 
          padding: 10px; 
          margin-bottom: 10px;
          border-left: 4px solid #4F46E5;
        }
        .prodotto-info { 
          display: flex; 
          justify-content: space-between; 
          margin: 5px 0; 
          gap: 10px;
          flex-wrap: wrap;
        }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
        th { background-color: #6366f1; color: white; }
        .lotto-row { background-color: #f9fafb; }
        .no-lotti { text-align: center; color: #999; padding: 10px; }

        .header-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 10px;
          gap: 10px;
        }
        .header-left img.logo-header {
          width: 120px;
          height: auto;
          display: block;
        }
        .header-right {
          text-align: right;
          font-size: 12px;
          line-height: 1.2;
        }
        .header-right p {
          margin: 2px 0;
        }

        @media print {
          body { margin: 10mm; }
          .prodotto-info { flex-direction: row; }
          .header-row { flex-direction: row; }
        }

        @page {
          margin: 10mm;
        }
      </style>
    </head>
    <body>

      <div class="header-row">
        <div class="header-left">
          <img class="logo-header" src="img/Logo.png" alt="Logo Azienda">
        </div>
        <div class="header-right">
          <p><strong>Indirizzo:</strong> {{company.address}},{{company.cap}} {{company.city}} ({{company.province}})</p>
          <p><strong>P. IVA:</strong> {{company.piva}}</p>
          <p><strong>Email:</strong> {{company.email}}</p>
          <p><strong>Tel:</strong> {{company.phone}}</p>
        </div>
      </div>

      <h1>Riepilogo Giacenze Magazzino</h1>
      <div class="info">
        <p><strong>Valore Totale (Filtrato):</strong> ${formatCurrency(
          valoreTotaleFiltrato,
        )}</p>
        <p><strong>Data Stampa:</strong> ${new Date().toLocaleDateString(
          "it-IT",
        )} ${new Date().toLocaleTimeString("it-IT")}</p>
      </div>
  `;

  riepilogo.forEach((prodotto) => {
    if (prodotto.giacenza > 0) {
      printContent += `
        <div class="prodotto-block">
          <div class="prodotto-header">
            <div class="prodotto-info">
              <span><strong>Prodotto:</strong> ${prodotto.nome}</span>
              <span><strong>Giacenza Totale:</strong> ${formatQuantity(
                prodotto.giacenza,
              )} pz</span>
            </div>
            <div class="prodotto-info">
              <span><strong>Marca:</strong> ${prodotto.marca_nome || "-"}</span>
              <span><strong>Valore Totale:</strong> ${formatCurrency(
                prodotto.valore_totale,
              )}</span>
            </div>
            ${
              prodotto.descrizione
                ? `<div class="prodotto-info"><span><strong>Descrizione:</strong> ${prodotto.descrizione}</span></div>`
                : ""
            }
          </div>
      `;

      if (prodotto.lotti && prodotto.lotti.length > 0) {
        printContent += `
          <table>
            <thead>
              <tr>
                <th>Data Carico</th>
                <th>Quantità (pz)</th>
                <th>Prezzo Unit.</th>
                <th>Valore</th>
                <th>Documento/Fattura</th>
                <th>Fornitore</th>
              </tr>
            </thead>
            <tbody>
        `;

        prodotto.lotti.forEach((lotto) => {
          printContent += `
            <tr class="lotto-row">
              <td>${new Date(lotto.data_carico).toLocaleDateString(
                "it-IT",
              )}</td>
              <td>${formatQuantity(lotto.quantita_rimanente)}</td>
              <td>${formatCurrency(lotto.prezzo)}</td>
              <td><strong>${formatCurrency(
                lotto.quantita_rimanente * lotto.prezzo,
              )}</strong></td>
              <td>${lotto.fattura_doc || "-"}</td>
              <td>${lotto.fornitore || "-"}</td>
            </tr>
          `;
        });

        printContent += `
            </tbody>
          </table>
        `;
      } else {
        printContent += '<p class="no-lotti">Nessun lotto disponibile</p>';
      }

      printContent += `</div>`;
    }
  });

  printContent += `</body></html>`;

  // Sostituisci i placeholder con i dati JSON (company-loader.js)
  printContent = insertCompanyInfoPrint(printContent);

  const printFrame = document.createElement("iframe");
  printFrame.style.position = "fixed";
  printFrame.style.right = "0";
  printFrame.style.bottom = "0";
  printFrame.style.width = "0";
  printFrame.style.height = "0";
  printFrame.style.border = "0";
  document.body.appendChild(printFrame);

  const doc = printFrame.contentDocument || printFrame.contentWindow.document;
  doc.open();
  doc.write(printContent);
  doc.close();

  printFrame.onload = () => {
    setTimeout(() => {
      printFrame.contentWindow.focus();
      printFrame.contentWindow.print();
      setTimeout(() => document.body.removeChild(printFrame), 1000);
    }, 500);
  };
}

function printStorico() {
  if (!storico || storico.length === 0) {
    alert("Nessun prodotto da stampare");
    return;
  }

  const valoreStoricoFiltrato = storico.reduce(
    (sum, s) => sum + Number.parseFloat(s.valore_totale || 0),
    0,
  );

  const dataSelezionata = document.getElementById("storicoDate").value;
  const dataItalianaSelezionata = dataSelezionata
    ? new Date(dataSelezionata + "T00:00:00").toLocaleDateString("it-IT")
    : "Non selezionata";

  let printContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Storico Giacenze</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1 { color: #333; border-bottom: 2px solid #4F46E5; padding-bottom: 10px; }
        .info { margin: 20px 0; font-size: 14px; }
        .prodotto-block { margin-bottom: 30px; page-break-inside: avoid; }
        .prodotto-header { 
          background-color: #e0e7ff; 
          padding: 10px; 
          margin-bottom: 10px;
          border-left: 4px solid #4F46E5;
        }
        .prodotto-info { 
          display: flex; 
          justify-content: space-between; 
          margin: 5px 0;
          gap: 10px;
          flex-wrap: wrap;
        }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
        th { background-color: #6366f1; color: white; }
        .lotto-row { background-color: #f9fafb; }
        .no-lotti { text-align: center; color: #999; padding: 10px; }

        .header-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 10px;
          gap: 10px;
        }
        .header-left img.logo-header {
          width: 120px;
          height: auto;
          display: block;
        }
        .header-right {
          text-align: right;
          font-size: 12px;
          line-height: 1.2;
        }
        .header-right p {
          margin: 2px 0;
        }

        @media print {
          body { margin: 10mm; }
          .prodotto-info { flex-direction: row; }
          .header-row { flex-direction: row; }
        }

        @page {
          margin: 10mm;
        }
      </style>
    </head>
    <body>
      <div class="header-row">
        <div class="header-left">
          <img class="logo-header" src="img/Logo.png" alt="Logo Azienda">
        </div>
        <div class="header-right">
          <p><strong>Indirizzo:</strong> {{company.address}},{{company.cap}} {{company.city}} ({{company.province}})</p>
          <p><strong>P. IVA:</strong> {{company.piva}}</p>
          <p><strong>Email:</strong> {{company.email}}</p>
          <p><strong>Tel:</strong> {{company.phone}}</p>
        </div>
      </div>

      <h1>Storico Giacenze Magazzino</h1>
      <div class="info">
        <p><strong>Data Selezionata:</strong> ${dataItalianaSelezionata}</p>
        <p><strong>Valore Totale (Filtrato):</strong> ${formatCurrency(
          valoreStoricoFiltrato,
        )}</p>
        <p><strong>Data Stampa:</strong> ${new Date().toLocaleDateString(
          "it-IT",
        )} ${new Date().toLocaleTimeString("it-IT")}</p>
      </div>
  `;

  storico.forEach((prodotto) => {
    if (prodotto.giacenza > 0) {
      printContent += `
        <div class="prodotto-block">
          <div class="prodotto-header">
            <div class="prodotto-info">
              <span><strong>Prodotto:</strong> ${prodotto.nome}</span>
              <span><strong>Giacenza Totale:</strong> ${formatQuantity(
                prodotto.giacenza,
              )} pz</span>
            </div>
            <div class="prodotto-info">
              <span><strong>Marca:</strong> ${prodotto.marca_nome || "-"}</span>
              <span><strong>Valore Totale:</strong> ${formatCurrency(
                prodotto.valore_totale,
              )}</span>
            </div>
            ${
              prodotto.descrizione
                ? `<div class="prodotto-info"><span><strong>Descrizione:</strong> ${prodotto.descrizione}</span></div>`
                : ""
            }
          </div>
      `;

      if (prodotto.lotti && prodotto.lotti.length > 0) {
        printContent += `
          <table>
            <thead>
              <tr>
                <th>Data Carico</th>
                <th>Quantità (pz)</th>
                <th>Prezzo Unit.</th>
                <th>Valore</th>
                <th>Documento/Fattura</th>
                <th>Fornitore</th>
              </tr>
            </thead>
            <tbody>
        `;

        prodotto.lotti.forEach((lotto) => {
          printContent += `
            <tr class="lotto-row">
              <td>${new Date(lotto.data_carico).toLocaleDateString(
                "it-IT",
              )}</td>
              <td>${formatQuantity(lotto.quantita_rimanente)}</td>
              <td>${formatCurrency(lotto.prezzo)}</td>
              <td><strong>${formatCurrency(
                lotto.quantita_rimanente * lotto.prezzo,
              )}</strong></td>
              <td>${lotto.fattura_doc || "-"}</td>
              <td>${lotto.fornitore || "-"}</td>
            </tr>
          `;
        });

        printContent += `
            </tbody>
          </table>
        `;
      } else {
        printContent += '<p class="no-lotti">Nessun lotto disponibile</p>';
      }

      printContent += `</div>`;
    }
  });

  printContent += `</body></html>`;

  printContent = insertCompanyInfoPrint(printContent);

  const printFrame = document.createElement("iframe");
  printFrame.style.position = "fixed";
  printFrame.style.right = "0";
  printFrame.style.bottom = "0";
  printFrame.style.width = "0";
  printFrame.style.height = "0";
  printFrame.style.border = "0";
  document.body.appendChild(printFrame);

  const doc = printFrame.contentDocument || printFrame.contentWindow.document;
  doc.open();
  doc.write(printContent);
  doc.close();

  printFrame.onload = () => {
    setTimeout(() => {
      printFrame.contentWindow.focus();
      printFrame.contentWindow.print();
      setTimeout(() => document.body.removeChild(printFrame), 1000);
    }, 500);
  };
}

// ==================== 📄 SISTEMA IMPORT PDF MIGLIORATO ====================

/**
 * 🔧 Carica PDF.js da CDN (Cloudflare)
 */
async function loadPDFJS() {
  return new Promise((resolve, reject) => {
    if (window.pdfjsLib) {
      console.log("✅ PDF.js già caricato");
      resolve();
      return;
    }

    console.log("⏳ Caricamento PDF.js da CDN...");

    const script = document.createElement("script");
    script.src =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";

    script.onload = () => {
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      console.log("✅ PDF.js caricato con successo");
      resolve();
    };

    script.onerror = () => {
      console.error("❌ Errore caricamento PDF.js");
      reject(new Error("Impossibile caricare la libreria PDF.js"));
    };

    document.head.appendChild(script);
  });
}

/**
 * 📖 Estrae tutto il testo dal PDF con migliore gestione degli spazi
 */
async function extractTextFromPDF(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        console.log("📖 Inizio lettura PDF...");

        const typedarray = new Uint8Array(e.target.result);

        if (!window.pdfjsLib) {
          await loadPDFJS();
        }

        const loadingTask = pdfjsLib.getDocument(typedarray);
        const pdf = await loadingTask.promise;

        console.log(`📄 PDF caricato: ${pdf.numPages} pagine`);

        let fullText = "";

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          const page = await pdf.getPage(pageNum);
          const textContent = await page.getTextContent();

          // 🎯 MIGLIORAMENTO: Mantieni la struttura del testo con gli spazi
          let lastY = null;
          let pageText = "";

          textContent.items.forEach((item, index) => {
            const currentY = item.transform[5]; // Posizione Y

            // Se cambia riga, aggiungi newline
            if (lastY !== null && Math.abs(currentY - lastY) > 5) {
              pageText += "\n";
            }

            // Aggiungi spazio se necessario tra gli item sulla stessa riga
            if (index > 0 && lastY === currentY) {
              const prevItem = textContent.items[index - 1];
              const prevX = prevItem.transform[4] + prevItem.width;
              const currentX = item.transform[4];

              // Se c'è uno spazio significativo, aggiungilo
              if (currentX - prevX > 2) {
                pageText += " ";
              }
            }

            pageText += item.str;
            lastY = currentY;
          });

          fullText += pageText + "\n\n";

          console.log(`📄 Pagina ${pageNum}/${pdf.numPages} letta`);
        }

        console.log("✅ Estrazione testo completata");
        console.log("📝 Anteprima testo estratto:");
        console.log(fullText.substring(0, 1000) + "...");

        resolve(fullText);
      } catch (error) {
        console.error("❌ Errore estrazione PDF:", error);
        reject(
          new Error("Errore durante la lettura del PDF: " + error.message),
        );
      }
    };

    reader.onerror = () => {
      console.error("❌ Errore lettura file");
      reject(new Error("Impossibile leggere il file PDF"));
    };

    reader.readAsArrayBuffer(file);
  });
}

/**
 * 📅 Estrae la DATA dal PDF (cerca pattern "DATA_____")
 */
function extractDateFromPDF(text) {
  console.log("📅 Ricerca DATA nel PDF...");

  const lines = text.split("\n");

  // Pattern migliorati per trovare la data
  const datePatterns = [
    /DATA[_\s]{3,}(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
    /DATA\s*:\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
    /DATA\s+(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
  ];

  // Cerca nelle prime 20 righe
  for (let i = 0; i < Math.min(20, lines.length); i++) {
    const line = lines[i].trim();

    for (const pattern of datePatterns) {
      const match = line.match(pattern);
      if (match && match[1]) {
        const normalizedDate = normalizeDate(match[1]);
        console.log(`✅ Data trovata: ${match[1]} → ${normalizedDate}`);
        return normalizedDate;
      }
    }
  }

  // Fallback: cerca qualsiasi data nelle prime righe
  console.log("⚠️ Pattern DATA non trovato, cerco date generiche...");

  for (let i = 0; i < Math.min(20, lines.length); i++) {
    const line = lines[i];
    const anyDatePattern = /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/;
    const match = line.match(anyDatePattern);

    if (match && match[1]) {
      const normalizedDate = normalizeDate(match[1]);
      console.log(
        `✅ Data trovata (generica): ${match[1]} → ${normalizedDate}`,
      );
      return normalizedDate;
    }
  }

  // Se non trova nessuna data, usa oggi
  const today = new Date().toISOString().split("T")[0];
  console.warn(`⚠️ Nessuna data trovata nel PDF, uso data odierna: ${today}`);
  return today;
}

/**
 * 📦 Estrae gli SCARICHI dalla sezione RICAMBI - VERSIONE MIGLIORATA
 */
function extractScarichiFromPDF(text, date) {
  console.log("📦 Ricerca sezione RICAMBI...");

  const scarichi = [];
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  console.log(`📄 Totale righe da analizzare: ${lines.length}`);

  // 1️⃣ TROVA LA SEZIONE "RICAMBI"
  let ricambiStartIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toUpperCase();
    if (line.includes("RICAMBI")) {
      ricambiStartIndex = i;
      console.log(`✅ Sezione RICAMBI trovata alla riga ${i}: "${lines[i]}"`);
      break;
    }
  }

  if (ricambiStartIndex === -1) {
    console.warn("⚠️ Sezione RICAMBI non trovata nel PDF");
    return scarichi;
  }

  // 2️⃣ SALTA LE RIGHE DI INTESTAZIONE
  let dataStartIndex = ricambiStartIndex + 1;

  const headerKeywords = [
    "CODICE",
    "RICAMBIO",
    "DESCRIZIONE",
    "QUANTITA",
    "PREZZO",
    "IVA",
    "ESCLUSA",
    "QUANTITÀ",
  ];

  for (
    let i = ricambiStartIndex + 1;
    i < Math.min(ricambiStartIndex + 10, lines.length);
    i++
  ) {
    const lineUpper = lines[i].toUpperCase();

    // Se la riga contiene parole chiave dell'header, saltala
    if (headerKeywords.some((keyword) => lineUpper.includes(keyword))) {
      dataStartIndex = i + 1;
      console.log(`⏭️ Riga intestazione saltata: "${lines[i]}"`);
    } else {
      break; // Prima riga che non è intestazione
    }
  }

  console.log(`🔍 Inizio analisi dati dalla riga ${dataStartIndex}`);

  // 3️⃣ ANALIZZA LE RIGHE SUCCESSIVE
  const stopKeywords = [
    "MANODOPERA",
    "TOTALE",
    "IVA COMPRESA",
    "DESCRIZIONE LAVORAZIONI",
    "LAVORAZIONI",
  ];

  for (let i = dataStartIndex; i < lines.length; i++) {
    const line = lines[i].trim();

    if (!line) continue;

    // Stop se incontriamo una sezione diversa
    const lineUpper = line.toUpperCase();
    if (stopKeywords.some((keyword) => lineUpper.includes(keyword))) {
      console.log(`🛑 Fine sezione RICAMBI alla riga ${i}: "${line}"`);
      break;
    }

    console.log(`🔍 Analisi riga ${i}: "${line}"`);

    // 4️⃣ ESTRAI CODICE E QUANTITÀ
    const parsed = parseRicamboLine(line);

    if (parsed) {
      scarichi.push({
        code: parsed.code,
        quantity: parsed.quantity,
        date: date,
      });

      console.log(
        `✅ Scarico trovato: ${parsed.code} - ${parsed.quantity} pz (riga ${i})`,
      );
    } else {
      console.log(`⏭️ Riga ignorata: "${line}"`);
    }
  }

  console.log(`📊 Totale scarichi trovati: ${scarichi.length}`);

  return scarichi;
}

/**
 * 🔍 Parsing intelligente di una riga ricambio
 * Formato atteso: "CODICE [DESCRIZIONE...] QUANTITÀ"
 */
function parseRicamboLine(line) {
  // Rimuovi spazi multipli
  const cleanLine = line.replace(/\s+/g, " ").trim();

  console.log(`  🔍 Parsing: "${cleanLine}"`);

  // Pattern 1: CODICE alla fine con QUANTITÀ
  // Es: "Descrizione varia 101 2"
  const pattern1 = /^(.+)\s+(\d+)\s+(\d+(?:[,\.]\d{1,2})?)$/;
  const match1 = cleanLine.match(pattern1);

  if (match1) {
    const potentialCode = match1[2]; // Il penultimo numero
    const potentialQty = match1[3]; // L'ultimo numero

    const qty = parseFloat(potentialQty.replace(",", "."));

    if (isValidCode(potentialCode) && isValidQuantity(qty)) {
      console.log(`  ✅ Match Pattern 1: code=${potentialCode}, qty=${qty}`);
      return { code: potentialCode, quantity: qty };
    }
  }

  // Pattern 2: Solo CODICE e QUANTITÀ (senza descrizione)
  // Es: "101 2"
  const pattern2 = /^(\d+)\s+(\d+(?:[,\.]\d{1,2})?)$/;
  const match2 = cleanLine.match(pattern2);

  if (match2) {
    const potentialCode = match2[1];
    const potentialQty = match2[2];

    const qty = parseFloat(potentialQty.replace(",", "."));

    if (isValidCode(potentialCode) && isValidQuantity(qty)) {
      console.log(`  ✅ Match Pattern 2: code=${potentialCode}, qty=${qty}`);
      return { code: potentialCode, quantity: qty };
    }
  }

  // Pattern 3: CODICE all'inizio
  // Es: "101 Descrizione varia 2"
  const words = cleanLine.split(/\s+/);

  if (words.length >= 2) {
    const firstWord = words[0];
    const lastWord = words[words.length - 1];

    const qty = parseFloat(lastWord.replace(",", "."));

    if (isValidCode(firstWord) && isValidQuantity(qty)) {
      console.log(`  ✅ Match Pattern 3: code=${firstWord}, qty=${qty}`);
      return { code: firstWord, quantity: qty };
    }
  }

  console.log(`  ❌ Nessun match valido trovato`);
  return null;
}

/**
 * ✅ Valida un codice prodotto
 */
function isValidCode(code) {
  // Codice valido: almeno 1 carattere, solo alfanumerici e simboli comuni
  return /^[A-Z0-9\-_\/]{1,50}$/i.test(code);
}

/**
 * ✅ Valida una quantità
 */
function isValidQuantity(qty) {
  return !isNaN(qty) && qty > 0 && qty <= 9999;
}

/**
 * 📅 Normalizza data in formato ISO (YYYY-MM-DD)
 */
function normalizeDate(dateStr) {
  dateStr = dateStr.trim();

  const separator = dateStr.includes("/")
    ? "/"
    : dateStr.includes("-")
      ? "-"
      : ".";

  const parts = dateStr.split(separator);

  if (parts.length === 3) {
    if (parts[0].length === 4) {
      // YYYY-MM-DD (già corretto)
      return dateStr.replace(/\./g, "-").replace(/\//g, "-");
    } else {
      // DD-MM-YYYY → YYYY-MM-DD
      const day = parts[0].padStart(2, "0");
      const month = parts[1].padStart(2, "0");
      const year = parts[2].length === 2 ? "20" + parts[2] : parts[2];
      return `${year}-${month}-${day}`;
    }
  }

  console.warn(
    `⚠️ Formato data non riconosciuto: "${dateStr}", uso data odierna`,
  );
  return new Date().toISOString().split("T")[0];
}

/**
 * 🔍 Verifica se un prodotto esiste nel database
 */
async function checkProductExists(code) {
  try {
    const res = await fetch(`${API_URL}/prodotti`);

    if (!res.ok) {
      throw new Error("Errore caricamento prodotti dal server");
    }

    const prodotti = await res.json();

    const prodotto = prodotti.find(
      (p) => p.nome.toUpperCase() === code.toUpperCase(),
    );

    if (prodotto) {
      console.log(
        `✅ Prodotto trovato: ${code} → ${prodotto.nome} (ID: ${prodotto.id})`,
      );
    } else {
      console.warn(`⚠️ Prodotto NON trovato: ${code}`);
    }

    return prodotto;
  } catch (error) {
    console.error("❌ Errore verifica prodotto:", error);
    return null;
  }
}

/**
 * ✅ Crea gli SCARICHI nel database tramite endpoint bulk (anti-duplicato)
 *
 * - Aggrega le righe PDF per codice (una sola riga per prodotto)
 * - Usa POST /api/dati/bulk-scarico che salva fattura_doc = nome PDF

 */
async function processScarichi(scarichi, nomeFilePdf) {
  console.log(
    `🚀 Inizio elaborazione bulk: ${scarichi.length} righe PDF → nome file: "${nomeFilePdf}"`,
  );

  const results = {
    success: [],
    failed: [],
    notFound: [],
    insufficientStock: [],
  };

  // 1️⃣ Carica tutti i prodotti freschi dal server
  let prodottiDB = [];
  try {
    const r = await fetch(`${API_URL}/prodotti`);
    prodottiDB = await r.json();
  } catch (e) {
    console.error("❌ Impossibile caricare prodotti:", e);
    results.failed.push({
      code: "–",
      reason: "Errore caricamento prodotti dal server",
    });
    return results;
  }

  // 2️⃣ Aggrega per codice: una sola riga per prodotto (somma quantità se codice ripetuto nel PDF)
  const aggregati = {};
  for (const s of scarichi) {
    const codice = String(s.code).trim().toUpperCase();
    if (!codice) continue;
    if (!aggregati[codice]) {
      aggregati[codice] = { code: codice, quantity: 0, date: s.date };
    }
    aggregati[codice].quantity += s.quantity;
  }

  // 3️⃣ Risolvi prodotto_id per ogni codice aggregato
  const scarichiDaInviare = [];
  for (const [codice, agg] of Object.entries(aggregati)) {
    const prodotto = prodottiDB.find(
      (p) => p.nome.trim().toUpperCase() === codice,
    );
    if (!prodotto) {
      results.notFound.push({
        code: codice,
        quantity: agg.quantity,
        date: agg.date,
        reason: "Prodotto non trovato nel database",
      });
      console.warn(`⚠️ Prodotto non trovato: ${codice}`);
      continue;
    }
    scarichiDaInviare.push({
      codice,
      prodotto_id: prodotto.id,
      quantita: parseFloat(agg.quantity.toFixed(2)),
      data_movimento: agg.date,
    });
    console.log(
      `✅ Prodotto trovato: ${codice} → ID ${prodotto.id}, qty ${agg.quantity}`,
    );
  }

  // Se non ci sono scarichi validi (tutti notFound), esci subito
  if (scarichiDaInviare.length === 0) {
    console.warn("⚠️ Nessun prodotto valido trovato, skip chiamata bulk");
    return results;
  }

  // 4️⃣ Chiama l'endpoint bulk: UNA sola chiamata, il backend controlla i duplicati
  console.log(
    `📤 Invio ${scarichiDaInviare.length} scarichi al backend (bulk)...`,
  );

  try {
    // forza_reimport: true → salta sempre il blocco duplicati, la giacenza viene verificata normalmente
    const res = await fetch(`${API_URL}/dati/bulk-scarico`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scarichi: scarichiDaInviare,
        nome_documento: (nomeFilePdf || "")
          .replace(/\.pdf$/i, "")
          .replace(/^scaricato da /i, "")
          .trim(),
        forza_reimport: true,
      }),
    });
    const data = await res.json();

    if (!res.ok) {
      console.error("❌ Errore bulk:", data.error);
      results.failed.push({
        code: "–",
        reason: data.error || "Errore sconosciuto",
      });
      return results;
    }

    // 5️⃣ Mappa i risultati restituiti dal backend
    const r = data.risultati;

    for (const s of r.success) {
      results.success.push({
        code: s.codice,
        nome: s.codice,
        quantity: s.quantita,
        date: s.data_movimento,
      });
    }
    for (const s of r.insufficientStock) {
      results.insufficientStock.push({
        code: s.codice,
        nome: s.codice,
        quantity: s.quantita,
        available: s.disponibile,
        date: s.data_movimento,
        reason: s.reason,
      });
    }
    for (const s of r.failed) {
      results.failed.push({
        code: s.codice || "–",
        reason: s.reason,
      });
    }
  } catch (e) {
    console.error("❌ Errore chiamata bulk:", e);
    results.failed.push({ code: "–", reason: e.message });
  }

  console.log("📊 Elaborazione bulk completata:", results);
  return results;
}

/**
 * 🚀 Funzione principale per gestire l'import PDF
 */
async function handlePDFImport(file) {
  try {
    console.log("🚀 Inizio importazione PDF:", file.name);

    showImportLoading();

    // 1️⃣ Estrai testo dal PDF
    const text = await extractTextFromPDF(file);

    // 2️⃣ Estrai la DATA
    const date = extractDateFromPDF(text);

    // 3️⃣ Estrai gli SCARICHI
    const scarichi = extractScarichiFromPDF(text, date);

    console.log(`📦 ${scarichi.length} scarichi trovati per la data ${date}`);

    if (scarichi.length === 0) {
      throw new Error(
        "❌ Nessun prodotto trovato nel PDF.\n\n" +
          "Verifica che il PDF contenga:\n" +
          '• Sezione "RICAMBI"\n' +
          "• CODICE RICAMBIO (es. 101)\n" +
          "• QUANTITÀ (es. 2)\n\n" +
          "Formato atteso:\n" +
          "RICAMBI\n" +
          "CODICE RICAMBIO   DESCRIZIONE   QUANTITA'\n" +
          "101               Filtro Olio    2",
      );
    }

    // 4️⃣ Processa gli SCARICHI (passa il nome file per controllo duplicati)
    const results = await processScarichi(scarichi, file.name);

    // 5️⃣ Mostra risultati
    showImportResults(results);

    // 6️⃣ Ricarica le tabelle se ci sono stati successi
    if (results.success.length > 0) {
      console.log("🔄 Ricarico tabelle Movimenti e Prodotti...");
      await loadMovimenti();
      await loadProdotti();
      console.log("✅ Tabelle ricaricate");
    }

    return results;
  } catch (error) {
    console.error("❌ Errore import PDF:", error);
    alert("❌ Errore durante l'importazione:\n\n" + error.message);
    hideImportLoading();
    throw error;
  }
}

// Esporta le funzioni
window.handlePDFImport = handlePDFImport;
window.loadPDFJS = loadPDFJS;

// IMPORT PDF SCARICHI - FUNZIONE UNICA CORRETTA

// 🧾 Importa ordine da PDF e crea UN movimento di scarico per riga prodotto
async function importaOrdineDaPdf(righePdf, dataOrdine, nomeFilePdf) {
  try {
    // 1) Raggruppa per codice prodotto e somma le quantità
    const aggregati = {}; // { codice: { codice, quantita } }

    righePdf.forEach((r) => {
      const codice = String(r.codice).trim();
      if (!codice) return;

      const qta = Number(String(r.quantita).replace(",", ".")) || 0;
      if (qta <= 0) return;

      if (!aggregati[codice]) {
        aggregati[codice] = { codice, quantita: 0 };
      }
      aggregati[codice].quantita += qta;
    });

    const movimentiDaInviare = Object.values(aggregati);

    // 2) Per ogni prodotto aggregato fai UNA chiamata POST /dati
    for (const mov of movimentiDaInviare) {
      // trova il prodotto_id a partire dal codice (adatta a come hai salvato i prodotti)
      const prodotto = allProdotti.find(
        (p) => String(p.codice) === String(mov.codice),
      );
      if (!prodotto) {
        console.warn("Prodotto non trovato per codice", mov.codice);
        continue;
      }

      const body = {
        prodotto_id: prodotto.id,
        tipo: "scarico",
        quantita: mov.quantita,
        prezzo: null, // il costo lo calcola il backend
        data_movimento: dataOrdine, // es. "2026-01-07"
        fattura_doc: (nomeFilePdf || "")
          .replace(/\.pdf$/i, "")
          .replace(/^scaricato da /i, "")
          .trim(),
        fornitore: null,
      };

      const res = await fetch(`${API_URL}/dati`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error("Errore import movimento", mov, err);
      }
    }

    // 3) Ricarica la tabella movimenti
    await loadMovimenti();
  } catch (e) {
    console.error("Errore durante importaOrdineDaPdf:", e);
  }
}

// ==================== MARCHE CON CONTEGGIO PRODOTTI ====================

/**
 * 📦 Carica le marche con il conteggio dei prodotti relazionati
 */
async function loadMarche() {
  try {
    console.log("📦 Caricamento marche con conteggio prodotti...");

    const res = await fetch(`${API_URL}/marche`);

    if (!res.ok) {
      throw new Error(`Errore HTTP: ${res.status}`);
    }

    allMarche = await res.json();
    marche = allMarche;

    console.log(`✅ ${marche.length} marche caricate:`, marche);

    renderMarche();
    reapplyFilter("filterMarche");
  } catch (error) {
    console.error("❌ Errore caricamento marche:", error);
    showNotification("Errore nel caricamento delle marche", "error");
  }
}

/**
 * 🎨 Renderizza la tabella marche con conteggio prodotti
 */
function renderMarche() {
  const tbody = document.getElementById("marcheTableBody");

  if (!tbody) {
    console.error("❌ Elemento marcheTableBody non trovato");
    return;
  }

  // Caso: Nessuna marca presente
  if (marche.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="3" class="text-center">
          <div style="padding: 40px 20px; color: var(--text-secondary);">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 48px; height: 48px; margin: 0 auto 16px; opacity: 0.5;">
              <path d="M20 7h-9M14 17H5M3 7h2M21 17h-4M15 12h6M9 12H3M15 6v12M9 6v12"/>
            </svg>
            <p style="font-size: 16px; font-weight: 600; margin-bottom: 8px;">Nessuna marca presente</p>
            <p style="font-size: 14px;">Clicca su "Nuova Marca" per iniziare</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  // Rendering marche con badge conteggio
  tbody.innerHTML = marche
    .map((m) => {
      // Determina il numero di prodotti (fallback a 0 se mancante)
      const prodottiCount = parseInt(m.prodotti_count) || 0;

      // Classe badge dinamica
      const badgeClass = prodottiCount > 0 ? "has-products" : "empty";

      return `
      <tr>
        <!-- 📝 NOME MARCA -->
        <td>
          <strong style="font-size: 15px; color: var(--text-primary);">
            ${escapeHtml(m.nome)}
          </strong>
        </td>
        
        <!-- 🎯 BADGE CONTEGGIO PRODOTTI -->
        <td class="text-center-badge">
          <span class="prodotti-badge ${badgeClass}"">
            ${prodottiCount}
          </span>
        </td>
        
        <!-- ⚙️ AZIONI -->
        <td class="text-right">
          <button 
            class="btn-icon" 
            onclick="editMarca(${m.id})" 
            title="Modifica marca"
            aria-label="Modifica ${escapeHtml(m.nome)}"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          
          <button 
            class="btn-icon" 
            onclick="deleteMarca(${m.id}, '${escapeHtml(m.nome)}', ${prodottiCount})" 
            title="Elimina marca"
            aria-label="Elimina ${escapeHtml(m.nome)}"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
          </button>
        </td>
      </tr>
    `;
    })
    .join("");

  console.log(`✅ ${marche.length} marche renderizzate`);
}

/**
 * 🗑️ Elimina marca con controllo prodotti relazionati
 */

/**
 * 🔍 Filtra marche in base alla ricerca
 */
document.getElementById("filterMarche")?.addEventListener("input", (e) => {
  const searchTerm = e.target.value.toLowerCase().trim();

  console.log(`🔍 Ricerca marca: "${searchTerm}"`);

  if (!searchTerm) {
    // Nessun filtro: mostra tutte le marche
    marche = [...allMarche];
  } else {
    // Filtra per nome marca
    marche = allMarche.filter((m) => m.nome.toLowerCase().includes(searchTerm));
  }

  console.log(
    `📊 ${marche.length} marche trovate su ${allMarche.length} totali`,
  );

  renderMarche();
});

/**
 * 🛡️ Helper: Escape HTML per prevenire XSS
 */

// ==================== ESPORTA FUNZIONI (se usi moduli) ====================
// export { loadMarche, renderMarche, deleteMarca, escapeHtml };

/**
 * 🗑️ Elimina una marca con modale di conferma moderna
 */
async function deleteMarca(id, nome) {
  // 1. Calcola quanti prodotti appartengono a questa marca
  const prodottiCount = allProdotti.filter((p) => p.marca_id === id).length;

  // 2. Prepara il messaggio personalizzato
  let messaggio = `Sei sicuro di voler eliminare la marca "<strong>${escapeHtml(nome)}</strong>"?`;

  if (prodottiCount > 0) {
    messaggio += `
      <div style="margin-top: 15px; padding: 12px; background: rgba(239, 68, 68, 0.1); border-radius: 8px; border: 1px solid rgba(239, 68, 68, 0.2);">
        <span style="color: var(--danger); font-weight: 700; display: block; margin-bottom: 4px;">⚠️ ATTENZIONE</span>
        Ci sono <strong>${prodottiCount}</strong> prodotti collegati a questa marca. 
        Eliminando la marca, verranno eliminati anche tutti i prodotti associati!
      </div>`;
  }

  // 3. Mostra la modale (funzione definita in realtime.js)
  const confermato = await showConfirmModal(messaggio, "Elimina Marca");

  // Se l'utente clicca "Annulla", interrompiamo
  if (!confermato) return;

  try {
    console.log(`♻️ Eliminazione marca ${id} in corso...`);

    const response = await fetch(`${API_URL}/marche/${id}`, {
      method: "DELETE",
    });

    const data = await response.json();

    if (response.ok) {
      // Notifica di successo
      showAlertModal(
        `Marca "${nome}" e relativi prodotti eliminati correttamente.`,
        "Operazione Completata",
        "success",
      );

      // Aggiorna i dati locali
      await loadMarche();
      if (prodottiCount > 0) {
        await loadProdotti();
      }
    } else {
      throw new Error(data.error || "Errore durante l'eliminazione");
    }
  } catch (error) {
    console.error("❌ Errore eliminazione marca:", error);
    showAlertModal(`Errore: ${error.message}`, "Errore", "error");
  }
}

// ==================== PRODOTTI CON ICONA VUOTA ====================

/**
 * 🎨 Renderizza la tabella prodotti con messaggio personalizzato
 */

/**
 * 🗑️ Elimina prodotto con controllo movimenti
 */

// ==================== MOVIMENTI CON ICONA VUOTA ====================

/**
 * 🎨 Renderizza la tabella movimenti con messaggio personalizzato
 */

/**
 * 🗑️ Elimina movimento con conferma
 */

// ==================== RIEPILOGO CON ICONA VUOTA ====================

/**
 * 🎨 Renderizza il riepilogo con messaggio personalizzato
 */

// ==================== STORICO CON ICONA VUOTA ====================

/**
 * 🎨 Renderizza lo storico con messaggio personalizzato
 */

// ==================== HELPER FUNZIONI ====================

/**
 * 🛡️ Escape HTML per prevenire XSS
 */

/**
 * 🔔 Mostra notifica (opzionale, se hai un sistema di notifiche)
 */

// ==================== ESPORTA FUNZIONI ====================
// Se usi moduli ES6, decommenta:
// export {
//   renderProdotti,
//   deleteProdotto,
//   renderMovimenti,
//   deleteMovimento,
//   renderRiepilogo,
//   renderStorico,
//   escapeHtml,
//   showNotification
// };
// ==================== PRODOTTI CON ICONA VUOTA ====================

/**
 * 🎨 Renderizza la tabella prodotti con messaggio personalizzato
 */
function renderProdotti() {
  const tbody = document.getElementById("prodottiTableBody");

  if (!tbody) {
    console.error("❌ Elemento prodottiTableBody non trovato");
    return;
  }

  // Caso: Nessun prodotto presente
  if (prodotti.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="text-center">
          <div style="padding: 40px 20px; color: var(--text-secondary);">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" 
                 style="width: 48px; height: 48px; margin: 0 auto 16px; opacity: 0.5;">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <line x1="3" y1="9" x2="21" y2="9"/>
              <line x1="9" y1="21" x2="9" y2="9"/>
            </svg>
            <p style="font-size: 16px; font-weight: 600; margin-bottom: 8px;">
              Nessun prodotto presente
            </p>
            <p style="font-size: 14px;">
              Clicca su "Nuovo Prodotto" per iniziare
            </p>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  // Rendering prodotti
  tbody.innerHTML = prodotti
    .map(
      (p) => `
      <tr>
        <td><strong>${escapeHtml(p.nome)}</strong></td>
        <td>
          <span class="badge badge-marca">
            ${p.marca_nome ? escapeHtml(p.marca_nome).toUpperCase() : "N/A"}
          </span>
        </td>
        <td>
          <span class="${(p.giacenza ?? 0) == 0 ? "badge-giacenza-zero" : "badge-giacenza"}">
            ${formatQuantity(p.giacenza ?? 0)}
          </span>
        </td>
        <td>${p.descrizione ? escapeHtml(p.descrizione) : "-"}</td>
        <td class="text-right">
          <button 
            class="btn-icon" 
            onclick="editProdotto(${p.id})" 
            title="Modifica prodotto"
            aria-label="Modifica ${escapeHtml(p.nome)}"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button 
            class="btn-icon" 
            onclick="deleteProdotto(${p.id}, '${escapeHtml(p.nome)}')" 
            title="Elimina prodotto"
            aria-label="Elimina ${escapeHtml(p.nome)}"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
          </button>
        </td>
      </tr>
    `,
    )
    .join("");

  console.log(`✅ ${prodotti.length} prodotti renderizzati`);
}

/**
 * 🗑️ Elimina prodotto con controllo movimenti
 */
async function deleteProdotto(id, nome) {
  // Verifica se ci sono movimenti collegati
  const movimentiCollegati = allMovimenti.filter(
    (m) => m.prodotto_id === id,
  ).length;

  let messaggio = `Sei sicuro di voler eliminare il prodotto "<strong>${escapeHtml(nome)}</strong>"?`;

  if (movimentiCollegati > 0) {
    messaggio += `
      <div style="margin-top: 15px; padding: 12px; background: rgba(239, 68, 68, 0.1); border-radius: 8px; border: 1px solid rgba(239, 68, 68, 0.2);">
        <span style="color: var(--danger); font-weight: 700; display: block; margin-bottom: 4px;">⚠️ ATTENZIONE</span>
        Ci sono <strong>${movimentiCollegati}</strong> movimenti collegati a questo prodotto.
        Eliminando il prodotto, verranno eliminati anche tutti i movimenti associati!
      </div>`;
  }

  const confermato = await showConfirmModal(messaggio, "Elimina Prodotto");
  if (!confermato) return;

  try {
    const res = await fetch(`${API_URL}/prodotti/${id}`, { method: "DELETE" });
    const data = await res.json();

    if (res.ok) {
      if (typeof ignoreNextSocketUpdate === "function") {
        ignoreNextSocketUpdate();
      }

      showAlertModal(
        `Prodotto "${nome}" eliminato con successo!`,
        "Operazione Completata",
        "success",
      );

      await loadProdotti();
      if (movimentiCollegati > 0) {
        await loadMovimenti();
      }
    } else {
      throw new Error(data.error || "Errore durante l'eliminazione");
    }
  } catch (error) {
    console.error("❌ Errore eliminazione prodotto:", error);
    showAlertModal(`Errore: ${error.message}`, "Errore", "error");
  }
}

// ==================== MOVIMENTI CON ICONA VUOTA ====================

/**
 * 🎨 Renderizza la tabella movimenti con messaggio personalizzato
 */

/**
 * 🗑️ Elimina movimento con conferma
 */
async function deleteMovimento(id, prodottoNome, tipo) {
  const tipoLabel = tipo === "carico" ? "CARICO" : "SCARICO";

  const messaggio = `
    Sei sicuro di voler eliminare questo movimento di <strong>${tipoLabel}</strong>?
    <div style="margin-top: 12px; padding: 10px; background: rgba(99, 102, 241, 0.1); border-radius: 6px;">
      <strong>Prodotto:</strong> ${escapeHtml(prodottoNome)}
    </div>
  `;

  const confermato = await showConfirmModal(messaggio, "Elimina Movimento");
  if (!confermato) return;

  try {
    const res = await fetch(`${API_URL}/dati/${id}`, { method: "DELETE" });
    const data = await res.json();

    if (res.ok) {
      if (typeof ignoreNextSocketUpdate === "function") {
        ignoreNextSocketUpdate();
      }

      showAlertModal(
        "Movimento eliminato con successo!",
        "Operazione Completata",
        "success",
      );

      await loadMovimenti();
      await loadProdotti();
    } else {
      throw new Error(data.error || "Errore durante l'eliminazione");
    }
  } catch (error) {
    console.error("❌ Errore eliminazione movimento:", error);
    showAlertModal(`Errore: ${error.message}`, "Errore", "error");
  }
}

// ==================== RIEPILOGO CON ICONA VUOTA ====================

/**
 * 🎨 Renderizza il riepilogo con messaggio personalizzato
 */
function renderRiepilogo() {
  const tbody = document.getElementById("riepilogoTableBody");

  if (!tbody) {
    console.error("❌ Elemento riepilogoTableBody non trovato");
    return;
  }

  // Caso: Nessun prodotto in magazzino
  if (riepilogo.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" class="text-center">
          <div style="padding: 40px 20px; color: var(--text-secondary);">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" 
                 style="width: 48px; height: 48px; margin: 0 auto 16px; opacity: 0.5;">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
              <line x1="12" y1="22.08" x2="12" y2="12"/>
            </svg>
            <p style="font-size: 16px; font-weight: 600; margin-bottom: 8px;">
              Nessun prodotto in magazzino
            </p>
            <p style="font-size: 14px;">
              Registra dei movimenti di carico per iniziare
            </p>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  // Rendering riepilogo con lotti
  let html = "";

  riepilogo.forEach((r) => {
    html += `
      <tr class="product-main-row">
        <td>
          <strong>${escapeHtml(r.nome)}</strong>
          ${
            r.marca_nome
              ? ` <span class="badge-marca">${escapeHtml(r.marca_nome).toUpperCase()}</span>`
              : ""
          }
        </td>
        <td>
          ${
            r.descrizione
              ? `<small>${escapeHtml(r.descrizione.substring(0, 50))}${r.descrizione.length > 50 ? "..." : ""}</small>`
              : '<span style="color: #999;">-</span>'
          }
        </td>
        <td>
          <span class="${(r.giacenza ?? 0) == 0 ? "badge-giacenza-zero" : "badge-giacenza"}">${formatQuantity(r.giacenza)}</span>
        </td>
        <td>
          <strong>${formatCurrency(r.valore_totale)}</strong>
        </td>
      </tr>
    `;

    // Lotti (se presenti)
    if (r.giacenza > 0 && r.lotti && r.lotti.length > 0) {
      html += `
        <tr class="lotti-row">
          <td colspan="4" class="lotti-container">
            <div class="lotti-table-wrapper">
              <table class="lotti-table">
                <thead>
                  <tr>
                    <th>Data Carico</th>
                    <th>Quantità (pz)</th>
                    <th>Prezzo Unit.</th>
                    <th>Valore</th>
                    <th>Documento/Fattura</th>
                    <th>Fornitore</th>
                  </tr>
                </thead>
                <tbody>
      `;

      r.lotti.forEach((lotto) => {
        html += `
          <tr>
            <td>${new Date(lotto.data_carico).toLocaleDateString("it-IT")}</td>
            <td><strong>${formatQuantity(lotto.quantita_rimanente)}</strong></td>
            <td>${formatCurrency(lotto.prezzo)}</td>
            <td><strong>${formatCurrency(lotto.quantita_rimanente * lotto.prezzo)}</strong></td>
            <td>${lotto.fattura_doc || '<span style="color: #999;">-</span>'}</td>
            <td>${lotto.fornitore || '<span style="color: #999;">-</span>'}</td>
          </tr>
        `;
      });

      html += `
                </tbody>
              </table>
            </div>
          </td>
        </tr>
      `;
    }
  });

  tbody.innerHTML = html;
  console.log(`✅ ${riepilogo.length} prodotti nel riepilogo`);
}

// ==================== STORICO CON ICONA VUOTA ====================

/**
 * 📅 Carica lo storico giacenze per una data specifica
 */
async function loadStorico() {
  const data = document.getElementById("storicoDate").value;

  if (!data) {
    // Se non c'è una data, resetta la visualizzazione
    allStorico = [];
    storico = [];
    updateStoricoTotal();
    renderStorico(storico);
    return;
  }

  try {
    const res = await fetch(`${API_URL}/magazzino/storico-giacenza/${data}`);
    const result = await res.json();

    allStorico = result.riepilogo || [];
    storico = allStorico;

    updateStoricoTotal();
    renderStorico(storico);
    reapplyFilter("filterStorico");
  } catch (error) {
    console.error("❌ Errore caricamento storico:", error);
    showAlertModal("Errore nel caricamento dello storico", "Errore", "error");
  }
}

/**
 * 🎨 Renderizza lo storico con messaggio personalizzato
 */
function renderStorico(storico) {
  const tbody = document.getElementById("storicoTableBody");

  if (!tbody) {
    console.error("❌ Elemento storicoTableBody non trovato");
    return;
  }

  // Caso: Nessuna data selezionata
  if (!document.getElementById("storicoDate").value) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" class="text-center">
          <div style="padding: 40px 20px; color: var(--text-secondary);">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" 
                 style="width: 48px; height: 48px; margin: 0 auto 16px; opacity: 0.5;">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <p style="font-size: 16px; font-weight: 600; margin-bottom: 8px;">
              Seleziona una data
            </p>
            <p style="font-size: 14px;">
              Scegli una data dal calendario per visualizzare lo storico
            </p>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  // Caso: Nessun dato disponibile per la data
  if (storico.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" class="text-center">
          <div style="padding: 40px 20px; color: var(--text-secondary);">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" 
                 style="width: 48px; height: 48px; margin: 0 auto 16px; opacity: 0.5;">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <p style="font-size: 16px; font-weight: 600; margin-bottom: 8px;">
              Nessun dato disponibile
            </p>
            <p style="font-size: 14px;">
              Non ci sono prodotti in magazzino per questa data
            </p>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  // Rendering storico con lotti
  let html = "";

  storico.forEach((s) => {
    html += `
      <tr class="product-main-row">
        <td>
          <strong>${escapeHtml(s.nome)}</strong>
          ${
            s.marca_nome
              ? ` <span class="badge-marca">${escapeHtml(s.marca_nome).toUpperCase()}</span>`
              : ""
          }
        </td>
        <td>
          ${
            s.descrizione
              ? `<small>${escapeHtml(s.descrizione.substring(0, 50))}${s.descrizione.length > 50 ? "..." : ""}</small>`
              : '<span style="color: #999;">-</span>'
          }
        </td>
        <td>
          <span class="${(s.giacenza ?? 0) == 0 ? "badge-giacenza-zero" : "badge-giacenza"}">${formatQuantity(s.giacenza)}</span>
        </td>
        <td>
          <strong>${formatCurrency(s.valore_totale)}</strong>
        </td>
      </tr>
    `;

    // Lotti (se presenti)
    if (s.giacenza > 0 && s.lotti && s.lotti.length > 0) {
      html += `
        <tr class="lotti-row">
          <td colspan="4" class="lotti-container">
            <div class="lotti-table-wrapper">
              <table class="lotti-table">
                <thead>
                  <tr>
                    <th>Data Carico</th>
                    <th>Quantità (pz)</th>
                    <th>Prezzo Unit.</th>
                    <th>Valore</th>
                    <th>Documento/Fattura</th>
                    <th>Fornitore</th>
                  </tr>
                </thead>
                <tbody>
      `;

      s.lotti.forEach((lotto) => {
        html += `
          <tr>
            <td>${new Date(lotto.data_carico).toLocaleDateString("it-IT")}</td>
            <td><strong>${formatQuantity(lotto.quantita_rimanente)}</strong></td>
            <td>${formatCurrency(lotto.prezzo)}</td>
            <td><strong>${formatCurrency(lotto.quantita_rimanente * lotto.prezzo)}</strong></td>
            <td>${lotto.fattura_doc || '<span style="color: #999;">-</span>'}</td>
            <td>${lotto.fornitore || '<span style="color: #999;">-</span>'}</td>
          </tr>
        `;
      });

      html += `
                </tbody>
              </table>
            </div>
          </td>
        </tr>
      `;
    }
  });

  tbody.innerHTML = html;
  console.log(`✅ ${storico.length} prodotti nello storico`);
}

/**
 * 🔍 Filtra storico in base alla ricerca
 */
document.getElementById("filterStorico")?.addEventListener("input", (e) => {
  const searchTerm = e.target.value.toLowerCase();
  storico = allStorico.filter(
    (s) =>
      s.nome.toLowerCase().includes(searchTerm) ||
      (s.marca_nome && s.marca_nome.toLowerCase().includes(searchTerm)) ||
      (s.descrizione && s.descrizione.toLowerCase().includes(searchTerm)),
  );
  updateStoricoTotal();
  renderStorico(storico);
});

/**
 * 💰 Aggiorna il totale dello storico
 */
function updateStoricoTotal() {
  const valoreStoricoFiltrato = storico.reduce(
    (sum, s) => sum + Number.parseFloat(s.valore_totale || 0),
    0,
  );
  const totalElement = document.getElementById("valoreStorico");
  if (totalElement) {
    totalElement.textContent = formatCurrency(valoreStoricoFiltrato);
  }
}

// ==================== HELPER FUNZIONI ====================

/**
 * 🛡️ Escape HTML per prevenire XSS
 */
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

/**
 * 🔔 Mostra notifica (opzionale, se hai un sistema di notifiche)
 */
function showNotification(message, type = "info") {
  // Se hai un sistema di notifiche toast, usalo qui
  // Altrimenti, usa semplicemente alert
  console.log(`[${type.toUpperCase()}] ${message}`);

  if (type === "error") {
    alert("❌ " + message);
  } else if (type === "success") {
    // Potresti usare una libreria come Toastify.js o una modale custom
    console.log("✅ " + message);
  }
}

// ==================== ESPORTA FUNZIONI ====================
// Se usi moduli ES6, decommenta:
// export {
//   renderProdotti,
//   deleteProdotto,
//   renderMovimenti,
//   deleteMovimento,
//   renderRiepilogo,
//   renderStorico,
//   escapeHtml,
//   showNotification
// };

// ==================== 🔍 SISTEMA RICERCA CON MEMORIA LOCALSTORAGE ====================

/**
 * 🔄 Riapplica il filtro attivo dopo un reload dei dati.
 * Se c'è testo nell'input di ricerca, rilancia l'evento "input"
 * così la lista aggiornata viene subito filtrata — il nuovo elemento
 * creato/modificato che corrisponde al filtro compare immediatamente.
 * @param {string} inputId - ID dell'input (es. "filterProdotti")
 */
function reapplyFilter(inputId) {
  const input = document.getElementById(inputId);
  if (!input) return;
  if (input.value.trim()) {
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }
}

/**
 * 💾 STORAGE KEYS per ogni sezione
 */
const SEARCH_KEYS = {
  marche: "search_marche",
  prodotti: "search_prodotti",
  movimenti: "search_movimenti",
  riepilogo: "search_riepilogo",
  storico: "search_storico",
  utenti: "search_utenti",
};

/**
 * 📝 Salva il termine di ricerca nel localStorage
 * @param {string} section - Nome della sezione (es. 'marche', 'prodotti')
 * @param {string} searchTerm - Termine di ricerca da salvare
 */

/**
 * 📖 Recupera il termine di ricerca dal localStorage
 * @param {string} section - Nome della sezione
 * @returns {string} - Termine di ricerca salvato (o stringa vuota)
 */

/**
 * 🗑️ Cancella il termine di ricerca dal localStorage
 * @param {string} section - Nome della sezione
 */
function clearSearchTerm(section) {
  try {
    const key = SEARCH_KEYS[section];
    if (key) {
      localStorage.removeItem(key);
      console.log(`🗑️ Ricerca cancellata [${section}]`);
    }
  } catch (error) {
    console.error("❌ Errore cancellazione ricerca:", error);
  }
}

/**
 * 🔄 Ripristina e applica il filtro salvato per una sezione
 * @param {string} section - Nome della sezione
 * @param {string} inputId - ID del campo input di ricerca
 * @param {Function} filterFunction - Funzione di filtro da eseguire
 */
function restoreAndApplySearch(section, inputId, filterFunction) {
  try {
    const inputElement = document.getElementById(inputId);

    if (!inputElement) {
      console.warn(`⚠️ Input non trovato: ${inputId}`);
      return;
    }

    // 1️⃣ Recupera il termine salvato
    const savedTerm = getSearchTerm(section);

    // 2️⃣ Imposta il valore nell'input
    inputElement.value = savedTerm;

    // 3️⃣ Applica il filtro se c'è un termine salvato
    if (savedTerm && filterFunction) {
      console.log(
        `🔍 Applicazione filtro salvato [${section}]: "${savedTerm}"`,
      );
      filterFunction(savedTerm);
    }

    console.log(`✅ Ricerca ripristinata [${section}]`);
  } catch (error) {
    console.error("❌ Errore ripristino ricerca:", error);
  }
}

/**
 * 🎯 Setup listener per salvataggio automatico
 * @param {string} section - Nome della sezione
 * @param {string} inputId - ID del campo input di ricerca
 * @param {Function} filterFunction - Funzione di filtro da eseguire
 */
function setupSearchListener(section, inputId, filterFunction) {
  try {
    const inputElement = document.getElementById(inputId);

    if (!inputElement) {
      console.warn(`⚠️ Input non trovato per listener: ${inputId}`);
      return;
    }

    // Listener per input in tempo reale
    inputElement.addEventListener("input", function (e) {
      const searchTerm = e.target.value.trim();

      // Salva nel localStorage
      saveSearchTerm(section, searchTerm);

      // Applica il filtro
      if (filterFunction) {
        filterFunction(searchTerm);
      }
    });

    console.log(`✅ Listener ricerca attivo [${section}]`);
  } catch (error) {
    console.error("❌ Errore setup listener:", error);
  }
}

// ==================== 🎯 FUNZIONI DI FILTRO PER OGNI SEZIONE ====================

/**
 * 🏷️ Filtra MARCHE in base al termine di ricerca
 */
function filterMarche(searchTerm) {
  const term = searchTerm.toLowerCase();

  if (!term) {
    marche = [...allMarche];
  } else {
    marche = allMarche.filter((m) => m.nome.toLowerCase().includes(term));
  }

  renderMarche();
  console.log(`🔍 Marche filtrate: ${marche.length}/${allMarche.length}`);
}

/**
 * 📦 Filtra PRODOTTI in base al termine di ricerca
 */
function filterProdotti(searchTerm) {
  const term = searchTerm.toLowerCase();

  if (!term) {
    prodotti = [...allProdotti];
  } else {
    prodotti = allProdotti.filter((p) => {
      const matchesNome = p.nome.toLowerCase().includes(term);
      const matchesMarca = p.marca_nome
        ? p.marca_nome.toLowerCase().includes(term)
        : false;
      const matchesDescrizione = p.descrizione
        ? p.descrizione.toLowerCase().includes(term)
        : false;

      return matchesNome || matchesMarca || matchesDescrizione;
    });
  }

  renderProdotti();
  console.log(`🔍 Prodotti filtrati: ${prodotti.length}/${allProdotti.length}`);
}

/**
 * 📊 Filtra MOVIMENTI in base al termine di ricerca
 */
function filterMovimenti(searchTerm) {
  const term = searchTerm.toLowerCase();

  if (!term) {
    movimenti = [...allMovimenti];
  } else {
    movimenti = allMovimenti.filter((m) => {
      const matchesProdotto = m.prodotto_nome.toLowerCase().includes(term);
      const matchesMarca = m.marca_nome
        ? m.marca_nome.toLowerCase().includes(term)
        : false;
      const matchesTipo = m.tipo.toLowerCase().includes(term);
      const matchesDescrizione = m.prodotto_descrizione
        ? m.prodotto_descrizione.toLowerCase().includes(term)
        : false;

      return (
        matchesProdotto || matchesMarca || matchesTipo || matchesDescrizione
      );
    });
  }

  renderMovimenti();
  console.log(
    `🔍 Movimenti filtrati: ${movimenti.length}/${allMovimenti.length}`,
  );
}

/**
 * 📋 Filtra RIEPILOGO in base al termine di ricerca
 */
function filterRiepilogo(searchTerm) {
  const term = searchTerm.toLowerCase();

  if (!term) {
    riepilogo = [...allRiepilogo];
  } else {
    riepilogo = allRiepilogo.filter((r) => {
      const matchesNome = r.nome.toLowerCase().includes(term);
      const matchesMarca = r.marca_nome
        ? r.marca_nome.toLowerCase().includes(term)
        : false;
      const matchesDescrizione = r.descrizione
        ? r.descrizione.toLowerCase().includes(term)
        : false;

      return matchesNome || matchesMarca || matchesDescrizione;
    });
  }

  updateRiepilogoTotal();
  renderRiepilogo();
  console.log(
    `🔍 Riepilogo filtrato: ${riepilogo.length}/${allRiepilogo.length}`,
  );
}

/**
 * 🕐 Filtra STORICO in base al termine di ricerca
 */
function filterStorico(searchTerm) {
  const term = searchTerm.toLowerCase();

  if (!term) {
    storico = [...allStorico];
  } else {
    storico = allStorico.filter((s) => {
      const matchesNome = s.nome.toLowerCase().includes(term);
      const matchesMarca = s.marca_nome
        ? s.marca_nome.toLowerCase().includes(term)
        : false;
      const matchesDescrizione = s.descrizione
        ? s.descrizione.toLowerCase().includes(term)
        : false;

      return matchesNome || matchesMarca || matchesDescrizione;
    });
  }

  updateStoricoTotal();
  renderStorico(storico);
  console.log(`🔍 Storico filtrato: ${storico.length}/${allStorico.length}`);
}

/**
 * 👥 Filtra UTENTI in base al termine di ricerca
 */
function filterUtenti(searchTerm) {
  const term = searchTerm.toLowerCase();

  if (!term) {
    utenti = [...allUtenti];
  } else {
    utenti = allUtenti.filter((u) => u.username.toLowerCase().includes(term));
  }

  renderUtenti();
  console.log(`🔍 Utenti filtrati: ${utenti.length}/${allUtenti.length}`);
}

// ==================== 🎬 INIZIALIZZAZIONE SISTEMA RICERCA ====================

/**
 * 🚀 Inizializza il sistema di ricerca con memoria per tutte le sezioni
 */
function initSearchMemorySystem() {
  console.log("🚀 Inizializzazione sistema ricerca con memoria...");

  // Setup listener per tutte le sezioni
  const searchConfigs = [
    { section: "marche", inputId: "filterMarche", filterFn: filterMarche },
    {
      section: "prodotti",
      inputId: "filterProdotti",
      filterFn: filterProdotti,
    },
    {
      section: "movimenti",
      inputId: "filterMovimenti",
      filterFn: filterMovimenti,
    },
    {
      section: "riepilogo",
      inputId: "filterRiepilogo",
      filterFn: filterRiepilogo,
    },
    { section: "storico", inputId: "filterStorico", filterFn: filterStorico },
    { section: "utenti", inputId: "filterUtenti", filterFn: filterUtenti },
  ];

  searchConfigs.forEach((config) => {
    setupSearchListener(config.section, config.inputId, config.filterFn);
  });

  console.log("✅ Sistema ricerca inizializzato per tutte le sezioni");
}

/**
 * 🔄 Ripristina la ricerca quando si cambia sezione
 * @param {string} section - Nome della sezione attiva
 */
function restoreSearchOnSectionChange(section) {
  const searchConfigs = {
    marche: { inputId: "filterMarche", filterFn: filterMarche },
    prodotti: { inputId: "filterProdotti", filterFn: filterProdotti },
    movimenti: { inputId: "filterMovimenti", filterFn: filterMovimenti },
    riepilogo: { inputId: "filterRiepilogo", filterFn: filterRiepilogo },
    storico: { inputId: "filterStorico", filterFn: filterStorico },
    utenti: { inputId: "filterUtenti", filterFn: filterUtenti },
  };

  const config = searchConfigs[section];

  if (config) {
    restoreAndApplySearch(section, config.inputId, config.filterFn);
  }
}

// ==================== 🎯 INTEGRAZIONE CON NAVIGATION SYSTEM ====================

/**
 * 🔄 MODIFICA la funzione di navigazione esistente per includere il ripristino ricerca
 * Inserisci questa versione modificata nel tuo DOMContentLoaded
 */
function setupNavigationWithSearch() {
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      const section = item.dataset.section;

      // Aggiorna UI navigazione
      document
        .querySelectorAll(".nav-item")
        .forEach((i) => i.classList.remove("active"));
      document
        .querySelectorAll(".content-section")
        .forEach((s) => s.classList.remove("active"));

      item.classList.add("active");
      document.getElementById(`section-${section}`).classList.add("active");

      // Salva sezione attiva
      localStorage.setItem("activeSection", section);

      // Chiudi menu mobile se aperto
      const sidebar = document.getElementById("sidebar");
      const mobileMenuToggle = document.getElementById("mobileMenuToggle");
      if (window.innerWidth <= 768) {
        sidebar.classList.remove("mobile-open");
        mobileMenuToggle.classList.remove("active");
      }

      // 🎯 RIPRISTINA E APPLICA RICERCA SALVATA
      restoreSearchOnSectionChange(section);

      // Carica dati sezione
      if (section === "marche") loadMarche();
      if (section === "prodotti") loadProdotti();
      if (section === "movimenti") loadMovimenti();
      if (section === "riepilogo") loadRiepilogo();
      if (section === "utenti") loadUtenti();
    });
  });
}

// ==================== 🎬 AUTO-INIZIALIZZAZIONE ====================

/**
 * 🚀 Inizializza il sistema quando il DOM è pronto
 * AGGIUNGI QUESTA CHIAMATA nel tuo DOMContentLoaded esistente
 */

// ==================== 🛠️ UTILITY FUNCTIONS ====================

/**
 * 🗑️ Cancella tutte le ricerche salvate
 */
function clearAllSearches() {
  Object.keys(SEARCH_KEYS).forEach((section) => {
    clearSearchTerm(section);
  });
  console.log("🗑️ Tutte le ricerche cancellate");
}

/**
 * 📊 Mostra statistiche ricerche salvate
 */
function showSearchStats() {
  console.log("📊 STATISTICHE RICERCHE SALVATE:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  Object.entries(SEARCH_KEYS).forEach(([section, key]) => {
    const term = localStorage.getItem(key) || "(vuoto)";
    console.log(`  ${section.padEnd(12)} → "${term}"`);
  });

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

// ==================== 📝 EXPORT (se usi moduli ES6) ====================
// export {
//   saveSearchTerm,
//   getSearchTerm,
//   clearSearchTerm,
//   restoreAndApplySearch,
//   setupSearchListener,
//   initSearchMemorySystem,
//   restoreSearchOnSectionChange,
//   clearAllSearches,
//   showSearchStats
// };
document.addEventListener("DOMContentLoaded", () => {
  const username = localStorage.getItem("username");
  if (username) {
    document.getElementById("currentUser").textContent = username;
  }

  const savedSection = localStorage.getItem("activeSection") || "marche";

  const mobileMenuToggle = document.getElementById("mobileMenuToggle");
  const sidebar = document.getElementById("sidebar");

  if (mobileMenuToggle) {
    mobileMenuToggle.addEventListener("click", () => {
      sidebar.classList.toggle("mobile-open");
      mobileMenuToggle.classList.toggle("active");
    });

    document.addEventListener("click", (e) => {
      if (window.innerWidth <= 768) {
        if (
          !sidebar.contains(e.target) &&
          !mobileMenuToggle.contains(e.target)
        ) {
          sidebar.classList.remove("mobile-open");
          mobileMenuToggle.classList.remove("active");
        }
      }
    });
  }

  // NAVIGAZIONE SEZIONI + RILANCIO FILTRI
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.addEventListener("click", async (e) => {
      e.preventDefault();
      const section = item.dataset.section;

      // attiva voce menu
      document
        .querySelectorAll(".nav-item")
        .forEach((i) => i.classList.remove("active"));
      item.classList.add("active");

      // mostra sezione
      document
        .querySelectorAll(".content-section")
        .forEach((s) => s.classList.remove("active"));
      document.getElementById(`section-${section}`).classList.add("active");

      localStorage.setItem("activeSection", section);

      if (window.innerWidth <= 768) {
        sidebar.classList.remove("mobile-open");
        mobileMenuToggle?.classList.remove("active");
      }

      // carica dati sezione
      if (section === "marche") await loadMarche();
      if (section === "prodotti") await loadProdotti();
      if (section === "movimenti") await loadMovimenti();
      if (section === "riepilogo") await loadRiepilogo();
      if (section === "storico") await loadStorico();
      if (section === "utenti") await loadUtenti();

      // RILANCIA I FILTRI ESISTENTI IN BASE ALL'INPUT GIÀ SCRITTO
      if (section === "marche") {
        const input = document.getElementById("filterMarche");
        if (input) input.dispatchEvent(new Event("input"));
      }

      if (section === "prodotti") {
        const input = document.getElementById("filterProdotti");
        if (input) input.dispatchEvent(new Event("input"));
      }

      if (section === "movimenti") {
        const input = document.getElementById("filterMovimenti");
        if (input) input.dispatchEvent(new Event("input"));
      }

      if (section === "riepilogo") {
        const input = document.getElementById("filterRiepilogo");
        if (input) input.dispatchEvent(new Event("input"));
      }

      if (section === "storico") {
        const input = document.getElementById("filterStorico");
        if (input) input.dispatchEvent(new Event("input"));
      }

      if (section === "utenti") {
        const input = document.getElementById("filterUtenti");
        if (input) input.dispatchEvent(new Event("input"));
      }
    });
  });

  // attiva sezione salvata all'avvio
  document.querySelectorAll(".nav-item").forEach((item) => {
    if (item.dataset.section === savedSection) {
      item.click();
    }
  });

  document.getElementById("logoutBtn")?.addEventListener("click", () => {
    localStorage.removeItem("username");
    localStorage.removeItem("activeSection");
    window.location.href = "index.html";
  });
});

// INIZIALIZZAZIONE
document.addEventListener("DOMContentLoaded", () => {
  const username = localStorage.getItem("username");
  if (username) {
    const currentUserEl = document.getElementById("currentUser");
    if (currentUserEl) currentUserEl.textContent = username;
  }

  const savedSection = localStorage.getItem("activeSection") || "marche";

  // Riferimenti menu mobile
  const mobileMenuToggle = document.getElementById("mobileMenuToggle");
  const sidebar = document.getElementById("sidebar");

  // HAMBURGER + CLICK FUORI (MOBILE / TABLET)
  if (mobileMenuToggle && sidebar) {
    // Toggle apertura/chiusura sidebar
    mobileMenuToggle.addEventListener("click", (e) => {
      e.stopPropagation();
      sidebar.classList.toggle("mobile-open");
      mobileMenuToggle.classList.toggle("active");
    });

    // Chiudi sidebar cliccando fuori SOLO sotto 1024px
    document.addEventListener("click", (e) => {
      if (window.innerWidth < 1024) {
        if (
          !sidebar.contains(e.target) &&
          !mobileMenuToggle.contains(e.target)
        ) {
          sidebar.classList.remove("mobile-open");
          mobileMenuToggle.classList.remove("active");
        }
      }
    });
  }

  // NAVIGAZIONE SEZIONI
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.addEventListener("click", async (e) => {
      e.preventDefault();
      const section = item.dataset.section;
      if (!section) return;

      // Attiva voce di menu
      document
        .querySelectorAll(".nav-item")
        .forEach((i) => i.classList.remove("active"));
      item.classList.add("active");

      // Attiva sezione contenuto
      document
        .querySelectorAll(".content-section")
        .forEach((s) => s.classList.remove("active"));
      const sectionEl = document.getElementById(`section-${section}`);
      if (sectionEl) sectionEl.classList.add("active");

      // Salva sezione attiva
      localStorage.setItem("activeSection", section);

      // Chiudi menu mobile / tablet dopo il click
      if (window.innerWidth < 1024 && sidebar && mobileMenuToggle) {
        sidebar.classList.remove("mobile-open");
        mobileMenuToggle.classList.remove("active");
      }

      // Carica dati sezione
      if (section === "marche") await loadMarche();
      if (section === "prodotti") await loadProdotti();
      if (section === "movimenti") await loadMovimenti();
      if (section === "riepilogo") await loadRiepilogo();
      if (section === "storico") await loadStorico();
      if (section === "utenti") await loadUtenti();
    });
  });

  // Sezione iniziale
  const initialItem = document.querySelector(
    `.nav-item[data-section="${savedSection}"]`,
  );
  if (initialItem) {
    initialItem.click();
  }

  // Logout
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("username");
      localStorage.removeItem("activeSection");
      window.location.href = "index.html";
    });
  }

  // Listener storico (già presente nel tuo codice)
  document
    .getElementById("storicoDate")
    ?.addEventListener("change", loadStorico);
});

// NAVIGAZIONE SEZIONI + MEMORIA RICERCA

function renderUtenti() {
  const tbody = document.getElementById("utentiTableBody");
  if (!tbody) {
    console.error("Elemento utentiTableBody non trovato");
    return;
  }

  // Caso Nessun utente presente
  if (utenti.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="2" class="text-center">
          <div style="padding: 40px 20px; color: var(--text-secondary);">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                 style="width: 48px; height: 48px; margin: 0 auto 16px; opacity: 0.5;">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            <p style="font-size: 16px; font-weight: 600; margin-bottom: 8px;">
              Nessun utente trovato
            </p>
            <p style="font-size: 14px;">
              ${
                document.getElementById("filterUtenti")?.value
                  ? "Prova a modificare il termine di ricerca"
                  : "Clicca su Nuovo Utente per iniziare"
              }
            </p>
          </div>
        </td>
      </tr>`;
    return;
  }

  // Rendering utenti esistenti
  tbody.innerHTML = utenti
    .map(
      (u) => `
    <tr>
      <td><strong>${escapeHtml(u.username)}</strong></td>
      <td class="text-right">
        <!-- MODIFICA - Blu -->
        <button class="btn-icon btn-icononclickmodifica" 
                onclick="editUser(${u.id})"
                title="Modifica utente" aria-label="Modifica ${escapeHtml(u.username)}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
        
        <!-- ELIMINA - Rosso -->
        <button class="btn-icon btn-icononclickelimina" 
                onclick="deleteUser(${u.id}, '${escapeHtml(u.username)}')"
                title="Elimina utente" aria-label="Elimina ${escapeHtml(u.username)}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 6h18"/>
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
          </svg>
        </button>
      </td>
    </tr>
  `,
    )
    .join("");

  console.log(utenti.length, "utenti renderizzati");
}

// CHIAVI PER MEMORIZZARE INPUT VARI (NON SOLO RICERCA)
const INPUT_MEMORY_KEYS = {
  storicoData: "input_storicoDate",
  movimentoProdottoSearch: "input_movimentoProdottoSearch",
  // aggiungi qui altri campi che vuoi persistere
  // es: filtro globale movimenti: movimentiFilter: 'input_movimentiFilter'
};

// Salva il valore di un input nel localStorage
function saveInputValue(key, value) {
  try {
    localStorage.setItem(key, value ?? "");
  } catch (error) {
    console.error("Errore salvataggio input", key, error);
  }
}

// Recupera il valore di un input dal localStorage
function getInputValue(key) {
  try {
    const v = localStorage.getItem(key);
    return v ?? "";
  } catch (error) {
    console.error("Errore lettura input", key, error);
    return "";
  }
}
/**
 * Collega un input a localStorage e opzionalmente rilancia una funzione
 * @param {string} inputId   - id dell'input in DOM
 * @param {string} memoryKey - chiave in INPUT_MEMORY_KEYS
 * @param {Function} onRestore - funzione da chiamare dopo il ripristino (opzionale)
 */
function setupPersistentInput(inputId, memoryKey, onRestore) {
  const el = document.getElementById(inputId);
  if (!el) {
    console.warn("Input non trovato per memoria:", inputId);
    return;
  }

  // RIPRISTINO ALL’AVVIO
  const saved = getInputValue(memoryKey);
  if (saved) {
    el.value = saved;
    if (typeof onRestore === "function") {
      onRestore(saved);
    }
  }

  // SALVATAGGIO IN TEMPO REALE
  el.addEventListener("input", (e) => {
    saveInputValue(memoryKey, e.target.value);
  });
}

// ==================== MEMORIA CAMPI DI RICERCA ====================
const SEARCHKEYS = {
  marche: "search_marche",
  prodotti: "search_prodotti",
  movimenti: "search_movimenti",
  riepilogo: "search_riepilogo",
  storico: "search_storico",
  utenti: "search_utenti",
};

function saveSearchTerm(key, value) {
  try {
    localStorage.setItem(key, value ?? "");
  } catch (e) {
    console.error("Errore salvataggio filtro", key, e);
  }
}

function getSearchTerm(key) {
  try {
    return localStorage.getItem(key) ?? "";
  } catch (e) {
    console.error("Errore lettura filtro", key, e);
    return "";
  }
}

/**
 * Collega un input di ricerca ad una chiave di localStorage.
 * - ripristina il valore salvato all'avvio
 * - rilancia l'evento "input" per riapplicare il filtro
 */
function setupSearchPersistence(inputId, storageKey) {
  const input = document.getElementById(inputId);
  if (!input) return;

  // RIPRISTINA valore dal localStorage
  const saved = getSearchTerm(storageKey);
  if (saved) {
    input.value = saved;
    // rilancia l'evento input per riattivare il filtro
    setTimeout(() => {
      input.dispatchEvent(new Event("input"));
    }, 0);
  }

  // SALVA ad ogni digitazione
  input.addEventListener("input", (e) => {
    saveSearchTerm(storageKey, e.target.value);
  });
}

// ==================== INIZIALIZZAZIONE ====================
document.addEventListener("DOMContentLoaded", () => {
  // Username corrente
  const username = localStorage.getItem("username");
  if (username) {
    const userEl = document.getElementById("currentUser");
    if (userEl) userEl.textContent = username;
  }

  // Sezione attiva salvata
  const savedSection = localStorage.getItem("activeSection") || "marche";

  // Mobile menu
  const mobileMenuToggle = document.getElementById("mobileMenuToggle");
  const sidebar = document.getElementById("sidebar");

  if (mobileMenuToggle && sidebar) {
    mobileMenuToggle.addEventListener("click", () => {
      sidebar.classList.toggle("mobile-open");
      mobileMenuToggle.classList.toggle("active");
    });

    document.addEventListener("click", (e) => {
      if (window.innerWidth <= 768) {
        if (
          !sidebar.contains(e.target) &&
          !mobileMenuToggle.contains(e.target)
        ) {
          sidebar.classList.remove("mobile-open");
          mobileMenuToggle.classList.remove("active");
        }
      }
    });
  }

  // Navigazione laterale
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      const section = item.dataset.section;

      document
        .querySelectorAll(".nav-item")
        .forEach((i) => i.classList.remove("active"));
      document
        .querySelectorAll(".content-section")
        .forEach((s) => s.classList.remove("active"));

      item.classList.add("active");
      const sectionEl = document.getElementById(`section-${section}`);
      if (sectionEl) sectionEl.classList.add("active");

      localStorage.setItem("activeSection", section);

      if (window.innerWidth <= 768 && sidebar && mobileMenuToggle) {
        sidebar.classList.remove("mobile-open");
        mobileMenuToggle.classList.remove("active");
      }

      // Carica dati sezione
      if (section === "marche") loadMarche();
      if (section === "prodotti") loadProdotti();
      if (section === "movimenti") loadMovimenti();
      if (section === "riepilogo") loadRiepilogo();
      if (section === "utenti") loadUtenti();
    });
  });

  // Attiva la sezione salvata
  document.querySelectorAll(".nav-item").forEach((item) => {
    if (item.dataset.section === savedSection) {
      item.click();
    }
  });

  // Logout
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("username");
      localStorage.removeItem("activeSection");
      window.location.href = "index.html";
    });
  }

  // =======================================================
  // 🎯 MEMORIA FILTRI DI RICERCA (RESTANO DOPO F5)
  // =======================================================
  // Assicurati che questi ID esistano in home.html
  setupSearchPersistence("filterMarche", SEARCHKEYS.marche);
  setupSearchPersistence("filterProdotti", SEARCHKEYS.prodotti);
  setupSearchPersistence("filterMovimenti", SEARCHKEYS.movimenti);
  setupSearchPersistence("filterRiepilogo", SEARCHKEYS.riepilogo);
  setupSearchPersistence("filterStorico", SEARCHKEYS.storico);
  setupSearchPersistence("filterUtenti", SEARCHKEYS.utenti);

  // =======================================================
  // 🎯 LISTENER CAMBIO CARICO/SCARICO
  // =======================================================
  const movimentoTipoSelect = document.getElementById("movimentoTipo");
  if (movimentoTipoSelect) {
    movimentoTipoSelect.addEventListener("change", togglePrezzoField);
  }
});

document.addEventListener("DOMContentLoaded", () => {
  const username = localStorage.getItem("username");
  const currentUserEl = document.getElementById("currentUser");
  if (currentUserEl && username) {
    currentUserEl.textContent = username;
  }

  // ===== HAMBURGER + SIDEBAR =====
  const mobileMenuToggle = document.getElementById("mobileMenuToggle");
  const sidebar = document.getElementById("sidebar");

  if (mobileMenuToggle && sidebar) {
    // Apertura/chiusura menu
    mobileMenuToggle.addEventListener("click", (e) => {
      e.stopPropagation(); // importantissimo per non chiudere subito
      sidebar.classList.toggle("mobile-open");
      mobileMenuToggle.classList.toggle("active");
    });

    // Chiudi cliccando fuori (solo sotto 1024px)
    document.addEventListener("click", (e) => {
      if (window.innerWidth <= 1024) {
        if (
          !sidebar.contains(e.target) &&
          !mobileMenuToggle.contains(e.target)
        ) {
          sidebar.classList.remove("mobile-open");
          mobileMenuToggle.classList.remove("active");
        }
      }
    });
  }

  // ===== NAVIGAZIONE SEZIONI + MEMORIA RICERCA =====
  const savedSection = localStorage.getItem("activeSection") || "marche";

  document.querySelectorAll(".nav-item").forEach((item) => {
    item.addEventListener("click", async (e) => {
      e.preventDefault();
      const section = item.dataset.section;
      if (!section) return;

      // attiva voce di menu
      document
        .querySelectorAll(".nav-item")
        .forEach((i) => i.classList.remove("active"));
      item.classList.add("active");

      // mostra sezione
      document
        .querySelectorAll(".content-section")
        .forEach((s) => s.classList.remove("active"));
      const sectionEl = document.getElementById(`section-${section}`);
      if (sectionEl) sectionEl.classList.add("active");

      localStorage.setItem("activeSection", section);

      // chiudi menu su mobile/tablet
      if (window.innerWidth <= 1024 && sidebar && mobileMenuToggle) {
        sidebar.classList.remove("mobile-open");
        mobileMenuToggle.classList.remove("active");
      }

      // carica dati sezione (usa await se le funzioni sono async)
      if (section === "marche") await loadMarche();
      if (section === "prodotti") await loadProdotti();
      if (section === "movimenti") await loadMovimenti();
      if (section === "riepilogo") await loadRiepilogo();
      if (section === "storico") await loadStorico();
      if (section === "utenti") await loadUtenti();

      // ripristina filtro salvato per quella sezione (se usi il sistema di memoria)
      restoreSearchOnSectionChange(section);
    });
  });

  // attiva sezione iniziale
  const initialItem = document.querySelector(
    `.nav-item[data-section="${savedSection}"]`,
  );
  if (initialItem) initialItem.click();

  // logout
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("username");
      localStorage.removeItem("activeSection");
      // se vuoi: clearAllSearches();
      window.location.href = "index.html";
    });
  }

  // se usi il sistema ricerche con memoria:
  initSearchMemorySystem();
  setTimeout(() => restoreSearchOnSectionChange(savedSection), 500);
});

function togglePrezzoField() {
  const tipo = document.getElementById("movimentoTipo").value;
  const prezzoGroup = document.getElementById("prezzoGroup");
  const prezzoInput = document.getElementById("movimentoPrezzo");
  const fornitoreGroup = document.getElementById("fornitoreGroup");
  const fatturaInput = document.getElementById("movimentoFattura");
  const fornitoreInput = document.getElementById("movimentoFornitore");
  const docOptional = document.getElementById("docOptional");
  const fornitoreOptional = document.getElementById("fornitoreOptional");
  const fatturaGroup = fatturaInput.closest(".form-group");

  if (tipo === "carico") {
    // CARICO: prezzo, documento e fornitore tutti OBBLIGATORI (*)
    prezzoGroup.style.display = "block";
    prezzoInput.required = true;

    fatturaGroup.style.display = "block";
    fatturaInput.required = true;
    if (docOptional) docOptional.textContent = "*";

    fornitoreGroup.style.display = "block";
    fornitoreInput.required = true;
    if (fornitoreOptional) fornitoreOptional.textContent = "*";
  } else {
    // SCARICO: prezzo, documento e fornitore tutti NASCOSTI
    prezzoGroup.style.display = "none";
    prezzoInput.required = false;
    prezzoInput.value = "";

    fatturaGroup.style.display = "none";
    fatturaInput.required = false;
    fatturaInput.value = "";
    if (docOptional) docOptional.textContent = "";

    fornitoreGroup.style.display = "none";
    fornitoreInput.required = false;
    fornitoreInput.value = "";
    if (fornitoreOptional) fornitoreOptional.textContent = "";
  }
}

// ==================== MOVIMENTI ====================

// Carica movimenti (lista completa)
async function loadMovimenti() {
  try {
    const res = await fetch(`${API_URL}/dati/`); // NOTA: "/" finale per combaciare con router.get("/")
    if (!res.ok) {
      console.error("Errore HTTP movimenti:", res.status, res.statusText);
      movimenti = [];
      allMovimenti = [];
      renderMovimenti();
      return;
    }

    const data = await res.json();

    if (!Array.isArray(data)) {
      console.warn("ATTENZIONE: /dati non ha restituito un array:", data);
      movimenti = [];
      allMovimenti = [];
    } else {
      allMovimenti = data;
      movimenti = allMovimenti;
    }

    renderMovimenti();
    reapplyFilter("filterMovimenti");
  } catch (error) {
    console.error("Errore caricamento movimenti", error);
  }
}

// Render tabella movimenti

// Filtro ricerca movimenti
document.getElementById("filterMovimenti")?.addEventListener("input", (e) => {
  const searchTerm = e.target.value.toLowerCase().trim();

  if (!searchTerm) {
    movimenti = allMovimenti;
    renderMovimenti();
    console.log("✅ Ricerca ripristinata [movimenti]");
    return;
  }

  movimenti = allMovimenti.filter((m) => {
    const nome = (m.prodotto_nome || "").toLowerCase();
    const marca = (m.marca_nome || "").toLowerCase();
    const tipo = (m.tipo || "").toLowerCase();
    const descr = (m.prodotto_descrizione || "").toLowerCase();

    return (
      nome.includes(searchTerm) ||
      marca.includes(searchTerm) ||
      tipo.includes(searchTerm) ||
      descr.includes(searchTerm)
    );
  });

  renderMovimenti();
});

// Apre il modal per inserire / modificare un movimento

// Render tabella movimenti COMPLETA
function renderMovimenti() {
  const tbody = document.getElementById("movimentiTableBody");
  if (!tbody) {
    console.error("Elemento movimentiTableBody non trovato");
    return;
  }

  if (!Array.isArray(movimenti) || movimenti.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="11" class="text-center">
          <div style="padding: 40px 20px; color: var(--text-secondary);">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                 style="width: 48px; height: 48px; margin: 0 auto 16px; opacity: 0.5;">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
              <polyline points="17 6 23 6 23 12"></polyline>
            </svg>
            <p style="font-size: 16px; font-weight: 600; margin-bottom: 8px;">Nessun movimento presente</p>
            <p style="font-size: 14px;">
              Clicca su <strong>Nuovo</strong> per registrare un carico o uno scarico
            </p>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = movimenti
    .map((m) => {
      const prefix = m.tipo === "scarico" ? "-" : "";

      let prezzoUnitarioRaw = "-";
      if (m.tipo === "carico") {
        prezzoUnitarioRaw = formatCurrency(m.prezzo);
      } else if (m.tipo === "scarico" && m.prezzo_unitario_scarico != null) {
        prezzoUnitarioRaw = formatCurrency(m.prezzo_unitario_scarico);
      }
      const prezzoUnitarioHtml =
        prezzoUnitarioRaw !== "-"
          ? prezzoUnitarioRaw.replace("€", `${prefix}€`)
          : prezzoUnitarioRaw;

      const prezzoTotaleRaw = formatCurrency(m.prezzo_totale_movimento || 0);
      const prezzoTotaleHtml = prezzoTotaleRaw.replace("€", `${prefix}€`);

      const colorClass = m.tipo === "carico" ? "text-green" : "text-red";

      const descr = m.prodotto_descrizione
        ? `<small>${escapeHtml(
            m.prodotto_descrizione.substring(0, 30),
          )}${m.prodotto_descrizione.length > 30 ? "…" : ""}</small>`
        : '<span style="color:#999;">-</span>';

      return `
        <tr>
          <td>${new Date(m.data_movimento).toLocaleDateString("it-IT")}</td>
          <td><strong>${escapeHtml(m.prodotto_nome)}</strong></td>
          <td>${
            m.marca_nome
              ? escapeHtml(m.marca_nome)
              : '<span style="color:#999;">-</span>'
          }</td>
          <td>${descr}</td>
          <td>
            <span class="badge ${
              m.tipo === "carico" ? "badge-success" : "badge-danger"
            }">${m.tipo.toUpperCase()}</span>
          </td>
          <td class="${colorClass}">${formatQuantity(m.quantita)}</td>
          <td class="${colorClass}">${prezzoUnitarioHtml}</td>
          <td class="${colorClass}"><strong>${prezzoTotaleHtml}</strong></td>
          <td>${
            m.tipo === "scarico"
              ? ""
              : (() => {
                  const doc = m.fattura_doc || "";
                  if (/\.pdf$/i.test(doc.trim())) {
                    const nome = doc.trim();
                    return `<span style="display:inline-flex;align-items:center;gap:5px;">
                <svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" style="width:16px;height:16px;flex-shrink:0;" title="${escapeHtml(nome)}">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="9" y1="13" x2="9" y2="17"/>
                  <line x1="12" y1="11" x2="12" y2="17"/>
                  <line x1="15" y1="14" x2="15" y2="17"/>
                </svg>
                <span style="font-size:12px;color:#64748b;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${escapeHtml(nome)}">${escapeHtml(nome.replace(/\.pdf$/i, ""))}</span>
              </span>`;
                  }
                  return doc ? escapeHtml(doc) : "";
                })()
          }</td>
          <td>${m.tipo === "scarico" ? "" : m.fornitore_cliente_id || ""}</td>
          <td class="text-right">
            <!-- PENNA MODIFICA -->
            <button class="btn-icon"
              onclick="editMovimento(${m.id})"
              title="Modifica movimento"
              aria-label="Modifica movimento ${m.tipo}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </button>

            <!-- CESTINO ELIMINA -->
            <button class="btn-icon"
              onclick="deleteMovimento(${m.id}, '${escapeHtml(
                m.prodotto_nome,
              )}', '${m.tipo}')"
              title="Elimina movimento"
              aria-label="Elimina movimento ${m.tipo}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 6h18"></path>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path>
                <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </td>
        </tr>
      `;
    })
    .join("");
}

// Apre il modal per inserire un nuovo movimento o modificarne uno esistente
async function openMovimentoModal(movimento = null) {
  console.log("Apertura modal movimento...", movimento);

  const modal = document.getElementById("modalMovimento");
  const title = document.getElementById("modalMovimentoTitle");
  const form = document.getElementById("formMovimento");
  const tipoSelect = document.getElementById("movimentoTipo");
  const hiddenProdotto = document.getElementById("movimentoProdotto");
  const searchInput = document.getElementById("movimentoProdottoSearch");
  const resultsBox = document.getElementById("prodottoSearchResults");

  // 🔥 Carica SEMPRE tutti i prodotti freschi dall'API al momento dell'apertura
  // In questo modo la ricerca nel form non è mai influenzata dal filtro attivo nella sezione prodotti
  try {
    const res = await fetch(`${API_URL}/prodotti`);
    allProdotti = await res.json();
    prodotti = allProdotti;
    console.log(
      "✅ Prodotti ricaricati per il modal movimento:",
      allProdotti.length,
    );
  } catch (error) {
    console.warn("⚠️ Impossibile ricaricare prodotti, uso cache:", error);
  }

  form.reset();
  document.getElementById("movimentoId").value = "";

  // NUOVO MOVIMENTO
  if (!movimento) {
    title.textContent = "Nuovo Movimento";

    // reset ricerca prodotto
    if (hiddenProdotto) hiddenProdotto.value = "";
    if (searchInput) searchInput.value = "";
    if (resultsBox) resultsBox.classList.remove("show");

    // nascondi info giacenza
    const giacenzaInfo = document.getElementById("giacenzaInfo");
    if (giacenzaInfo) giacenzaInfo.style.display = "none";

    // 🔥 preimposta TIPO su CARICO
    if (tipoSelect) tipoSelect.value = "carico";
  } else {
    // MODIFICA MOVIMENTO
    title.textContent = "Modifica Movimento";
    document.getElementById("movimentoId").value = movimento.id;

    // prodotto selezionato
    if (hiddenProdotto)
      hiddenProdotto.value = movimento.prodotto_id || movimento.prodottoid;

    if (searchInput) {
      const prodotto = allProdotti.find(
        (p) => p.id === (movimento.prodotto_id || movimento.prodottoid),
      );
      if (prodotto) {
        const marca = prodotto.marca_nome || prodotto.marcanome || "";
        const display = marca
          ? `${prodotto.nome} - ${marca.toUpperCase()}`
          : prodotto.nome;
        searchInput.value = display;
        searchInput.classList.add("has-selection");
      }
    }

    // tipo (carico/scarico)
    if (tipoSelect) tipoSelect.value = movimento.tipo;

    // altri campi
    document.getElementById("movimentoQuantita").value = formatNumber(
      movimento.quantita,
    );
    document.getElementById("movimentoData").value =
      movimento.data_movimento || movimento.datamovimento || "";

    if (movimento.tipo === "carico") {
      if (document.getElementById("movimentoPrezzo"))
        document.getElementById("movimentoPrezzo").value = movimento.prezzo
          ? formatNumber(movimento.prezzo)
          : "";
      if (document.getElementById("movimentoFattura"))
        document.getElementById("movimentoFattura").value =
          movimento.fattura_doc || movimento.fatturadoc || "";
      if (document.getElementById("movimentoFornitore"))
        document.getElementById("movimentoFornitore").value =
          movimento.fornitore || movimento.fornitore_cliente_id || "";
    }

    // mostra giacenza prodotto selezionato
    const pid = movimento.prodotto_id || movimento.prodottoid;
    if (pid) await showGiacenzaInfo(pid);
  }

  // aggiorna visibilità dei campi prezzo/fornitore in base al tipo
  togglePrezzoField();

  // mostra modal
  modal.classList.add("active");

  // dopo breve timeout: decimali + ricerca prodotto
  setTimeout(() => {
    if (typeof setupDecimalInputs === "function") setupDecimalInputs();
    if (typeof setupProductSearch === "function") setupProductSearch();
  }, 150);
}

// ================================================================
// 📄 CARICO DA FATTURA PDF (nella sezione MOVIMENTI)
// + 🧹 PULIZIA MOVIMENTI CON FATTURA = NOME FILE .PDF
// ================================================================

(function () {
  "use strict";

  let _cfpFile = null;
  let _cfpRighe = [];
  let _cfpProdotti = [];

  // ---- PDF.js ----
  function _loadPDFjs() {
    return new Promise((resolve, reject) => {
      if (window.pdfjsLib) return resolve();
      const s = document.createElement("script");
      s.src =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
      s.onload = () => {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc =
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
        resolve();
      };
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  async function _estraiTesto(file) {
    await _loadPDFjs();
    const buf = await file.arrayBuffer();
    const pdf = await window.pdfjsLib.getDocument({ data: buf }).promise;
    let testo = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      testo +=
        "\n--- PAG " +
        i +
        " ---\n" +
        content.items.map((it) => it.str).join(" ");
    }
    return testo;
  }

  async function _analizzaConAI(testo) {
    const prompt = `Sei un esperto di fatture commerciali italiane.
Analizza questo testo estratto da una fattura e restituisci SOLO JSON valido (no markdown, no testo extra).

TESTO:
${testo}

Estrai:
- numero_documento: numero fattura/DDT (stringa o null)
- fornitore: ragione sociale emittente (stringa o null)
- data_documento: data YYYY-MM-DD (stringa o null)
- righe: array prodotti con:
    nome_prodotto: nome/codice esatto nel documento
    quantita: numero
    prezzo_unitario: prezzo UNITARIO euro come numero (se vedi solo totale riga dividilo per quantita, null se non trovato)

Ignora IVA, sconti, spese trasporto, subtotali.
Risposta (SOLO JSON):
{"numero_documento":null,"fornitore":null,"data_documento":null,"righe":[{"nome_prodotto":"","quantita":1,"prezzo_unitario":null}]}`;

    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!resp.ok) {
      const e = await resp.json().catch(() => ({}));
      throw new Error(e.error?.message || "Errore AI (" + resp.status + ")");
    }
    const data = await resp.json();
    const raw = (data.content?.[0]?.text || "")
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    return JSON.parse(raw);
  }

  async function _loadProdotti() {
    if (_cfpProdotti.length > 0) return _cfpProdotti;
    const r = await fetch(API_URL + "/prodotti");
    _cfpProdotti = await r.json();
    return _cfpProdotti;
  }

  function _matchProdotto(nomePDF) {
    if (!nomePDF) return null;
    const q = nomePDF.toLowerCase().trim();
    let m = _cfpProdotti.find((p) => p.nome.toLowerCase() === q);
    if (m) return m;
    m = _cfpProdotti.find(
      (p) =>
        q.includes(p.nome.toLowerCase()) || p.nome.toLowerCase().includes(q),
    );
    if (m) return m;
    const pw = q.split(/\s+/).filter((w) => w.length > 2);
    let best = 0,
      bestM = null;
    _cfpProdotti.forEach((p) => {
      const pp = p.nome
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 2);
      const n = pw.filter((w) => pp.includes(w)).length;
      if (n >= 2 && n > best) {
        best = n;
        bestM = p;
      }
    });
    return bestM;
  }

  // ---- UI helpers ----
  function _showErr(msg) {
    const el = document.getElementById("cfp-error");
    if (el) {
      el.innerHTML = msg;
      el.style.display = "block";
    }
  }
  function _hideErr() {
    const el = document.getElementById("cfp-error");
    if (el) el.style.display = "none";
  }
  function _setStep(step) {
    ["upload", "loading", "risultati"].forEach((s) => {
      const el = document.getElementById("cfp-step-" + s);
      if (el) el.style.display = "none";
    });
    const t = document.getElementById("cfp-step-" + step);
    if (t) t.style.display = "block";
  }
  function _setMsg(msg) {
    const el = document.getElementById("cfp-loading-msg");
    if (el) el.textContent = msg;
  }

  // ---- render tabella ----
  function _renderRighe() {
    const tbody = document.getElementById("cfp-tbody");
    const counter = document.getElementById("cfp-counter");
    if (!tbody) return;

    const trovati = _cfpRighe.filter((r) => r.prodotto_id).length;
    if (counter) {
      counter.textContent =
        trovati + " di " + _cfpRighe.length + " trovati nel DB";
      counter.style.color =
        trovati === _cfpRighe.length ? "#10b981" : "#f59e0b";
    }

    tbody.innerHTML = _cfpRighe
      .map(
        (r, idx) => `
      <tr class="${r.prodotto_id ? "cfp-row-ok" : "cfp-row-warn"}" id="cfp-tr-${idx}">
        <td style="text-align:center;">
          <input type="checkbox" ${r.includi ? "checked" : ""}
            onchange="cfpToggle(${idx},this.checked)"
            style="width:16px;height:16px;cursor:pointer;" />
        </td>
        <td>
          <div class="cfp-pdf-nome" title="${escapeHtml(r.nome_pdf || "")}">${escapeHtml(r.nome_pdf || "—")}</div>
        </td>
        <td>
          <select class="cfp-select" onchange="cfpSetProdotto(${idx},this.value)">
            <option value="">— Non associare —</option>
            ${_cfpProdotti
              .map(
                (p) =>
                  `<option value="${p.id}" ${p.id === r.prodotto_id ? "selected" : ""}>
                ${escapeHtml(p.nome)}${p.marca_nome ? " — " + escapeHtml(p.marca_nome) : ""}
              </option>`,
              )
              .join("")}
          </select>
          <span id="cfp-badge-${idx}" class="${r.prodotto_id ? "cfp-badge-ok" : "cfp-badge-warn"}">
            ${r.prodotto_id ? "✓ Trovato" : "⚠ Non trovato"}
          </span>
        </td>
        <td>
          <input type="number" class="cfp-num-input" value="${r.quantita ?? ""}"
            min="0.01" step="0.01" onchange="cfpSetQta(${idx},this.value)" />
        </td>
        <td>
          <input type="number" class="cfp-num-input" value="${r.prezzo_unitario ?? ""}"
            min="0.01" step="0.01" onchange="cfpSetPrezzo(${idx},this.value)" />
        </td>
        <td>
          <button class="btn btn-primary cfp-btn-usa" onclick="cfpUsaRiga(${idx})" title="Apri form carico pre-compilato">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:13px;height:13px;"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Carica
          </button>
        </td>
      </tr>
    `,
      )
      .join("");
  }

  // ---- funzioni globali tabella ----
  window.cfpToggle = function (idx, v) {
    _cfpRighe[idx].includi = v;
  };

  window.cfpSetProdotto = function (idx, val) {
    const p = _cfpProdotti.find((x) => x.id == val);
    _cfpRighe[idx].prodotto_id = p ? p.id : null;
    _cfpRighe[idx].prodotto_nome = p ? p.nome : null;
    if (p) {
      _cfpRighe[idx].includi = true;
      const cb = document.querySelector(
        "#cfp-tr-" + idx + " input[type=checkbox]",
      );
      if (cb) cb.checked = true;
    }
    const badge = document.getElementById("cfp-badge-" + idx);
    if (badge) {
      badge.className = p ? "cfp-badge-ok" : "cfp-badge-warn";
      badge.textContent = p ? "✓ Trovato" : "⚠ Non trovato";
    }
  };
  window.cfpSetQta = function (idx, v) {
    _cfpRighe[idx].quantita = parseFloat(v) || null;
  };
  window.cfpSetPrezzo = function (idx, v) {
    _cfpRighe[idx].prezzo_unitario = parseFloat(v) || null;
  };

  // ---- clicca CARICA su una riga → salva il movimento DIRETTAMENTE via API ----
  window.cfpUsaRiga = async function (idx) {
    const r = _cfpRighe[idx];
    const errs = [];
    if (!r.prodotto_id)
      errs.push("Seleziona un prodotto dal DB per questa riga.");
    if (!r.quantita || r.quantita <= 0)
      errs.push("Inserisci una quantità valida.");
    if (!r.prezzo_unitario || r.prezzo_unitario <= 0)
      errs.push("Inserisci un prezzo unitario valido.");
    if (errs.length) {
      _showErr(errs.join("<br>"));
      return;
    }
    _hideErr();

    const numDoc = (
      document.getElementById("cfp-numero-doc")?.value || ""
    ).trim();
    const fornitore = (
      document.getElementById("cfp-fornitore")?.value || ""
    ).trim();
    const data =
      (document.getElementById("cfp-data")?.value || "").trim() ||
      new Date().toISOString().split("T")[0];

    if (!numDoc) {
      _showErr("⚠ Inserisci il numero documento prima di caricare.");
      return;
    }
    if (!fornitore) {
      _showErr("⚠ Inserisci il fornitore prima di caricare.");
      return;
    }

    // Disabilita il bottone durante il salvataggio
    const btn = document.querySelector(`#cfp-tr-${idx} .cfp-btn-usa`);
    if (btn) {
      btn.disabled = true;
      btn.textContent = "⏳";
    }

    try {
      const res = await fetch(`${API_URL}/dati`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prodotto_id: r.prodotto_id,
          tipo: "carico",
          quantita: parseFloat(r.quantita.toFixed(2)),
          prezzo: parseFloat(r.prezzo_unitario.toFixed(2)),
          data_movimento: data,
          fattura_doc: numDoc || null,
          fornitore: fornitore || null,
        }),
      });

      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(
          e.error || e.message || "Errore salvataggio (" + res.status + ")",
        );
      }

      // Riga salvata: mostra spunta verde e disabilita definitivamente
      const tr = document.getElementById("cfp-tr-" + idx);
      if (tr) tr.style.opacity = "0.55";
      if (btn) {
        btn.textContent = "✓ Caricato";
        btn.style.background = "linear-gradient(135deg,#10b981,#059669)";
        btn.disabled = true;
      }

      // Aggiorna i dati in background (movimenti, prodotti)
      if (typeof ignoreNextSocketUpdate === "function")
        ignoreNextSocketUpdate();
      if (typeof loadMovimenti === "function") loadMovimenti().catch(() => {});
      if (typeof loadProdotti === "function") loadProdotti().catch(() => {});
      if (typeof loadRiepilogo === "function") loadRiepilogo().catch(() => {});
    } catch (err) {
      _showErr("❌ " + err.message);
      if (btn) {
        btn.disabled = false;
        btn.innerHTML =
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:13px;height:13px;"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Carica';
      }
    }
  };

  // ---- open/close modal ----
  window.openCaricoFatturaPDFModal = function () {
    _cfpFile = null;
    _cfpRighe = [];
    const modal = document.getElementById("modalCaricoFatturaPDF");
    if (!modal) return;
    const fi = document.getElementById("cfp-file-input");
    if (fi) fi.value = "";
    const fl = document.getElementById("cfp-file-label");
    if (fl) fl.textContent = "Trascina il PDF qui o clicca per sfogliare";
    const ba = document.getElementById("cfp-btn-analizza");
    if (ba) ba.disabled = true;
    const tb = document.getElementById("cfp-tbody");
    if (tb) tb.innerHTML = "";
    _hideErr();
    _setStep("upload");
    _loadProdotti().catch(console.error);
    modal.classList.add("active");
  };

  window.closeCaricoFatturaPDFModal = function () {
    document
      .getElementById("modalCaricoFatturaPDF")
      ?.classList.remove("active");
  };

  // ---- selezione file ----
  window.cfpOnFileSelected = function (input) {
    const file = input.files[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      _showErr("⚠ Seleziona un file PDF valido.");
      return;
    }
    _cfpFile = file;
    const lbl = document.getElementById("cfp-file-label");
    if (lbl) lbl.textContent = "📄 " + file.name;
    const btn = document.getElementById("cfp-btn-analizza");
    if (btn) btn.disabled = false;
    _hideErr();
  };

  // ---- analizza PDF ----
  window.cfpAnalizzaPDF = async function () {
    if (!_cfpFile) return;
    const btn = document.getElementById("cfp-btn-analizza");
    if (btn) btn.disabled = true;
    try {
      _setStep("loading");
      _setMsg("📖 Lettura PDF...");
      const testo = await _estraiTesto(_cfpFile);
      if (!testo.trim())
        throw new Error(
          "Il PDF non contiene testo leggibile (potrebbe essere scansionato).",
        );

      _setMsg("🤖 Analisi AI in corso...");
      const dati = await _analizzaConAI(testo);

      _setMsg("🔍 Ricerca prodotti nel database...");
      await _loadProdotti();

      // Numero documento: togli ".pdf" e prefissi tipo "scaricato da"
      const numDocPulito = (dati.numero_documento || "")
        .replace(/\.pdf$/i, "")
        .replace(/^scaricato da /i, "")
        .trim();

      const ndEl = document.getElementById("cfp-numero-doc");
      const frEl = document.getElementById("cfp-fornitore");
      const dtEl = document.getElementById("cfp-data");
      if (ndEl) ndEl.value = numDocPulito;
      if (frEl && dati.fornitore) frEl.value = dati.fornitore;
      if (dtEl)
        dtEl.value =
          dati.data_documento || new Date().toISOString().split("T")[0];

      _cfpRighe = (dati.righe || []).map((r, idx) => {
        const trovato = _matchProdotto(r.nome_prodotto);
        return {
          idx,
          nome_pdf: r.nome_prodotto,
          quantita: r.quantita,
          prezzo_unitario: r.prezzo_unitario,
          prodotto_id: trovato ? trovato.id : null,
          prodotto_nome: trovato ? trovato.nome : null,
          includi: trovato !== null,
        };
      });

      _renderRighe();
      _setStep("risultati");
    } catch (err) {
      console.error("Errore analisi PDF:", err);
      _setStep("upload");
      _showErr("❌ " + err.message);
    } finally {
      if (btn) btn.disabled = false;
    }
  };

  // ---- drag & drop ----
  document.addEventListener("DOMContentLoaded", () => {
    const dz = document.getElementById("cfp-dropzone");
    if (!dz) return;
    dz.addEventListener("dragover", (e) => {
      e.preventDefault();
      dz.classList.add("cfp-drag-over");
    });
    dz.addEventListener("dragleave", () =>
      dz.classList.remove("cfp-drag-over"),
    );
    dz.addEventListener("drop", (e) => {
      e.preventDefault();
      dz.classList.remove("cfp-drag-over");
      const f = e.dataTransfer.files[0];
      if (f && f.type === "application/pdf") {
        _cfpFile = f;
        const lbl = document.getElementById("cfp-file-label");
        if (lbl) lbl.textContent = "📄 " + f.name;
        const btn = document.getElementById("cfp-btn-analizza");
        if (btn) btn.disabled = false;
        _hideErr();
      } else {
        _showErr("⚠ Seleziona un file PDF valido.");
      }
    });
  });

  // ================================================================
  // 🧹 PULIZIA: elimina movimenti con fattura_doc = nome file .pdf
  // ================================================================

  window.pulisciMovimentiPDF = async function () {
    // Trova tutti i movimenti che hanno fattura_doc finente con .pdf
    // oppure che inizia con "scaricato da"
    const sospetti = (allMovimenti || []).filter((m) => {
      const f = (m.fattura_doc || "").trim();
      return /\.pdf$/i.test(f) || /^scaricato da /i.test(f);
    });

    if (sospetti.length === 0) {
      showAlertModal(
        "Nessun movimento con nome file .pdf trovato. ✅",
        "Pulizia completata",
        "success",
      );
      return;
    }

    const lista = sospetti
      .map(
        (m) =>
          `• ${m.prodotto_nome || "?"} — ${m.tipo.toUpperCase()} — fattura: "${m.fattura_doc}"`,
      )
      .join("\n");

    const msg = `Trovati <strong>${sospetti.length}</strong> movimento/i con documento = nome file PDF:<br><br>
      <div style="background:#f8fafc;border-radius:8px;padding:12px;font-family:monospace;font-size:12px;max-height:200px;overflow-y:auto;text-align:left;white-space:pre-wrap;">${escapeHtml(lista)}</div>
      <br>Vuoi eliminarli tutti?`;

    const confermato = await showConfirmModal(
      msg,
      "🧹 Elimina movimenti con nome file PDF",
    );
    if (!confermato) return;

    let ok = 0,
      ko = 0;
    for (const m of sospetti) {
      try {
        const res = await fetch(`${API_URL}/dati/${m.id}`, {
          method: "DELETE",
        });
        if (res.ok) ok++;
        else ko++;
      } catch {
        ko++;
      }
    }

    if (typeof ignoreNextSocketUpdate === "function") ignoreNextSocketUpdate();
    showAlertModal(
      `Eliminati: ${ok} ✅${ko > 0 ? " — Errori: " + ko + " ❌" : ""}`,
      "Pulizia completata",
      ok > 0 ? "success" : "error",
    );

    await loadMovimenti();
    await loadProdotti();
  };
})();
