// ==================== GESTIONE PRODOTTI ====================
// File: prodotti.js
// Scopo: Caricamento, rendering, creazione, modifica ed eliminazione prodotti
//        + ricerca marche nel modal prodotto

let selectedMarcaId = null;

// ── Caricamento ──────────────────────────────────────────────
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

// ── Rendering tabella ────────────────────────────────────────
function renderProdotti() {
  const tbody = document.getElementById("prodottiTableBody");
  if (!tbody) return;

  if (prodotti.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="text-center">
          <div style="padding:40px 20px;color:var(--text-secondary);">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                 style="width:48px;height:48px;margin:0 auto 16px;opacity:0.5;">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <line x1="3" y1="9" x2="21" y2="9"/>
              <line x1="9" y1="21" x2="9" y2="9"/>
            </svg>
            <p style="font-size:16px;font-weight:600;margin-bottom:8px;">Nessun prodotto presente</p>
            <p style="font-size:14px;">Clicca su "Nuovo Prodotto" per iniziare</p>
          </div>
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = prodotti
    .map(
      (p) => `
    <tr>
      <td><strong>${escapeHtml(p.nome)}</strong></td>
      <td><span class="badge badge-marca">${p.marca_nome ? escapeHtml(p.marca_nome).toUpperCase() : "N/A"}</span></td>
      <td>
        <span class="${(p.giacenza ?? 0) == 0 ? "badge-giacenza-zero" : "badge-giacenza"}">
          ${formatQuantity(p.giacenza ?? 0)}
        </span>
      </td>
      <td>${p.descrizione ? escapeHtml(p.descrizione) : "-"}</td>
      <td class="text-right">
        <button class="btn-icon btn-modifica" onclick="editProdotto(${p.id})" title="Modifica">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
        <button class="btn-icon btn-elimina" onclick="deleteProdotto(${p.id},'${escapeHtml(p.nome)}')" title="Elimina">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
        </button>
      </td>
    </tr>`,
    )
    .join("");
}

function editProdotto(id) {
  const prodotto = prodotti.find((p) => p.id === id);
  if (prodotto) openProdottoModal(prodotto);
}

// ── Eliminazione prodotto ────────────────────────────────────
async function deleteProdotto(id, nome) {
  // Calcolo movimenti collegati basandosi sui dati in memoria
  const movimentiCollegati = allMovimenti.filter(
    (m) => m.prodotto_id === id,
  ).length;

  // Messaggio principale centrato
  let messaggio = `<div style="text-align:center; margin-bottom:15px;">Sei sicuro di voler eliminare il prodotto "<strong>${escapeHtml(nome)}</strong>"?</div>`;

  if (movimentiCollegati > 0) {
    // Box rosso di avviso perfettamente centrato (Flexbox)
    messaggio += `
      <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding:15px; background:rgba(239,68,68,0.08); border-radius:12px; border:1px solid rgba(239,68,68,0.2); width:100%; box-sizing:border-box;">
        <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
          <svg style="width:24px; height:24px; color:#ff4d4d;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <span style="color:#ff4d4d; font-weight:800; font-size:14px; letter-spacing:1px;">ATTENZIONE</span>
        </div>
        <p style="margin:0; font-size:15px; color:var(--text-primary); text-align:center; line-height:1.4;">
          Ci sono <strong>${movimentiCollegati}</strong> movimenti collegati. Non ti lascia eliminare!
        </p>
      </div>`;
  }

  const confermato = await showConfirmModal(messaggio, "Elimina Prodotto");
  if (!confermato) return;

  try {
    const res = await fetch(`${API_URL}/prodotti/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (res.ok) {
      if (typeof ignoreNextSocketUpdate === "function")
        ignoreNextSocketUpdate();
      showAlertModal(
        `Prodotto "${nome}" eliminato!`,
        "Operazione Completata",
        "success",
      );
      await loadProdotti();
      if (movimentiCollegati > 0 && typeof loadMovimenti === "function") {
        await loadMovimenti();
      }
    } else {
      throw new Error(data.error || "Errore eliminazione");
    }
  } catch (error) {
    showAlertModal(`Errore: ${error.message}`, "Errore", "error");
  }
}

// ── Submit form prodotto ─────────────────────────────────────
document
  .getElementById("formProdotto")
  ?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("prodottoId").value;
    const nome = document.getElementById("prodottoNome").value.trim();
    const marca_id = document.getElementById("prodottoMarca").value;
    const descrizione =
      document.getElementById("prodottoDescrizione").value.trim() || null;

    if (!nome) {
      alert("⚠️ Il nome del prodotto è obbligatorio!");
      return;
    }
    if (!marca_id) {
      alert("⚠️ Seleziona una marca dalla lista!");
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
        loadProdotti();
      } else {
        alert(data.error || "❌ Errore durante il salvataggio");
      }
    } catch {
      alert("❌ Errore di connessione al server");
    }
  });

// ── Ricerca marche nel modal prodotto ────────────────────────

function setupMarcaSearch() {
  const searchInput = document.getElementById("prodottoMarcaSearch");
  const resultsCont = document.getElementById("marcaSearchResults");
  if (!searchInput || !resultsCont) return;

  selectedMarcaId = null;
  searchInput.classList.remove("has-selection");

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

function searchMarche() {
  const searchInput = document.getElementById("prodottoMarcaSearch");
  const resultsCont = document.getElementById("marcaSearchResults");
  const hiddenInput = document.getElementById("prodottoMarca");
  if (!searchInput || !resultsCont) return;

  const searchTerm = searchInput.value.toLowerCase().trim();

  // Reset se si sta modificando dopo una selezione
  if (
    selectedMarcaId !== null &&
    searchInput.classList.contains("has-selection")
  ) {
    const cur = allMarche.find((m) => m.id == selectedMarcaId);
    if (cur && searchInput.value !== cur.nome.toUpperCase()) {
      selectedMarcaId = null;
      hiddenInput.value = "";
      searchInput.classList.remove("has-selection");
    }
  }

  if (!allMarche || allMarche.length === 0) {
    resultsCont.innerHTML = `<div class="search-no-results">Nessuna marca disponibile</div>`;
    resultsCont.classList.add("show");
    return;
  }

  const filteredMarche = allMarche.filter(
    (m) => !searchTerm || m.nome.toLowerCase().includes(searchTerm),
  );

  if (filteredMarche.length === 0 && searchTerm) {
    resultsCont.innerHTML = `<div class="search-no-results">Nessuna marca trovata per "<strong>${searchTerm}</strong>"</div>`;
    resultsCont.classList.add("show");
    return;
  }

  resultsCont.innerHTML = filteredMarche
    .map(
      (m) => `
    <div class="search-result-item marca-result-item" data-id="${m.id}" data-nome="${m.nome}">
      <div class="search-result-name">${highlightMatch(m.nome, searchTerm)}</div>
    </div>`,
    )
    .join("");

  resultsCont.querySelectorAll(".marca-result-item").forEach((item) => {
    item.addEventListener("click", function () {
      selectMarca(this.dataset.id, this.dataset.nome);
    });
  });

  resultsCont.classList.add("show");
}

function selectMarca(id, nome) {
  const searchInput = document.getElementById("prodottoMarcaSearch");
  const hiddenInput = document.getElementById("prodottoMarca");
  const resultsCont = document.getElementById("marcaSearchResults");

  selectedMarcaId = id;
  hiddenInput.value = id;
  searchInput.value = nome.toUpperCase();
  searchInput.classList.add("has-selection");
  resultsCont.classList.remove("show");
}
