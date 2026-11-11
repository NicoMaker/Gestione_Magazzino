// ==================== MOVIMENTI: RICERCA PRODOTTO ====================
// File: js/crud/movimenti/search.js
// Scopo: ricerca prodotti nel modal Movimento (combobox cercabile con
//        risultati a tendina e selezione).
// Stato condiviso: selectedProdottoId, prodotti, allProdotti

let selectedProdottoId = null;

function setupProductSearch() {
  const searchInput = document.getElementById("movimentoProdottoSearch");
  const hiddenInput = document.getElementById("movimentoProdotto");
  const resultsCont = document.getElementById("prodottoSearchResults");
  if (!searchInput || !resultsCont) return;

  selectedProdottoId = null;
  searchInput.classList.remove("has-selection");

  searchInput.addEventListener("input", (e) => {
    const searchTerm = e.target.value.toLowerCase().trim();
    if (selectedProdottoId !== null) {
      selectedProdottoId = null;
      hiddenInput.value = "";
      searchInput.classList.remove("has-selection");
      document.getElementById("giacenzaInfo").style.display = "none";
    }
    if (!searchTerm) {
      resultsCont.classList.remove("show");
      resultsCont.innerHTML = "";
      return;
    }
    const filtered = prodotti.filter(
      (p) =>
        p.nome.toLowerCase().includes(searchTerm) ||
        (p.marca_nome || "").toLowerCase().includes(searchTerm) ||
        (p.descrizione || "").toLowerCase().includes(searchTerm),
    );
    _renderProductSearchResults(filtered, searchTerm);
  });

  document.addEventListener("click", (e) => {
    if (!searchInput.contains(e.target) && !resultsCont.contains(e.target)) {
      resultsCont.classList.remove("show");
    }
  });

  searchInput.addEventListener("focus", function () {
    if (this.value.trim().length > 0 && resultsCont.children.length > 0) {
      resultsCont.classList.add("show");
    }
  });
}

async function searchProducts() {
  const searchInput = document.getElementById("movimentoProdottoSearch");
  const resultsCont = document.getElementById("prodottoSearchResults");
  if (!searchInput || !resultsCont) return;

  const searchTerm = searchInput.value.toLowerCase().trim();

  if (!allProdotti || allProdotti.length === 0) {
    resultsCont.innerHTML = `<div class="search-no-results">Caricamento prodotti...</div>`;
    resultsCont.classList.add("show");
    try {
      const res = await fetch(`${API_URL}/prodotti`);
      allProdotti = await res.json();
      prodotti = allProdotti;
    } catch {
      resultsCont.innerHTML = `<div class="search-no-results">Errore nel caricamento dei prodotti.</div>`;
      return;
    }
  }

  const filtered = allProdotti.filter(
    (p) =>
      !searchTerm ||
      p.nome.toLowerCase().includes(searchTerm) ||
      (p.marca_nome || "").toLowerCase().includes(searchTerm) ||
      (p.descrizione || "").toLowerCase().includes(searchTerm),
  );

  _renderProductSearchResults(filtered, searchTerm);
}

function _renderProductSearchResults(filtered, searchTerm) {
  const resultsCont = document.getElementById("prodottoSearchResults");
  if (filtered.length === 0) {
    resultsCont.innerHTML = `<div class="search-no-results">Nessun prodotto trovato per "<strong>${searchTerm}</strong>"</div>`;
    resultsCont.classList.add("show");
    return;
  }
  resultsCont.innerHTML = filtered
    .map(
      (p) => `
    <div class="search-result-item" data-id="${p.id}" data-nome="${p.nome}" data-marca="${p.marca_nome || ""}" data-giacenza="${p.giacenza || 0}">
      <div class="search-result-name">${highlightMatch(p.nome, searchTerm)}</div>
      <div class="search-result-meta">
        ${p.marca_nome ? `<span class="search-result-marca">${p.marca_nome.toUpperCase()}</span>` : ""}
        <span class="search-result-giacenza">${formatQuantity(p.giacenza || 0)} PZ/L</span>
        ${p.descrizione ? `<span style="opacity:0.7;">• ${p.descrizione.substring(0, 40)}${p.descrizione.length > 40 ? "..." : ""}</span>` : ""}
      </div>
    </div>`,
    )
    .join("");

  resultsCont.querySelectorAll(".search-result-item").forEach((item) => {
    item.addEventListener("click", function () {
      selectProduct(
        this.dataset.id,
        this.dataset.nome,
        this.dataset.marca,
        this.dataset.giacenza,
      );
    });
  });
  resultsCont.classList.add("show");
}

function selectProduct(id, nome, marca, giacenza) {
  const searchInput = document.getElementById("movimentoProdottoSearch");
  const hiddenInput = document.getElementById("movimentoProdotto");
  const resultsCont = document.getElementById("prodottoSearchResults");

  selectedProdottoId = id;
  hiddenInput.value = id;
  searchInput.value = marca ? `${nome} (${marca.toUpperCase()})` : nome;
  searchInput.classList.add("has-selection");
  resultsCont.classList.remove("show");
  showGiacenzaInfo(id);
}

// ── Esposizione globale ───────────────────────────────────────
window.setupProductSearch = setupProductSearch;
window.searchProducts = searchProducts;
window.selectProduct = selectProduct;
