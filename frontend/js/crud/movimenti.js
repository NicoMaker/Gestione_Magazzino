// ==================== GESTIONE MOVIMENTI ====================
// File: movimenti.js (VERSIONE AGGIORNATA CON RIORDINO)
// Scopo: Caricamento, rendering, creazione, modifica ed eliminazione movimenti
//        + ricerca prodotti nel modal + gestione campi carico/scarico
//        + NUOVO: Bottone Riordina per carichi

let selectedProdottoId = null;

// ── Caricamento ──────────────────────────────────────────────
async function loadMovimenti() {
  try {
    const res = await fetch(`${API_URL}/dati/`);
    if (!res.ok) {
      movimenti = [];
      allMovimenti = [];
      renderMovimenti();
      renderAlertRiordino();
      return;
    }
    const data = await res.json();
    allMovimenti = Array.isArray(data) ? data : [];
    movimenti = allMovimenti;
    renderMovimenti();
    renderAlertRiordino();
    injectDateFilters(); // Inietta i filtri data
    reapplyFilter("filterMovimenti");
    
    // Applica il filtro per tipo salvato in localStorage
    const savedTipo = localStorage.getItem('movimenti_tipo_filter');
    if (savedTipo) {
      const tipoFilterElement = document.getElementById('movimentiTipoFilter');
      if (tipoFilterElement) {
        tipoFilterElement.value = savedTipo;
        // La funzione filterMovimenti verrà chiamata da reapplyFilter o da un'altra logica di inizializzazione
      }
    }
    filterMovimenti(); // Chiamata iniziale per applicare tutti i filtri
    
  } catch (error) {
    console.error("Errore caricamento movimenti", error);
  }
}

// Funzione per filtrare i movimenti per tipo (carico, scarico, tutti)
function filterMovimentiByTipo(tipo) {
  // Salva la selezione nel localStorage
  localStorage.setItem("movimenti_tipo_filter", tipo);

  // Applica tutti i filtri correnti
  filterMovimenti();
}

// Modifica la funzione filterMovimenti per includere il filtro per tipo
function filterMovimenti() {
  const searchTerm = document.getElementById("filterMovimenti") ? document.getElementById("filterMovimenti").value.toLowerCase() : "";
  const startDate = document.getElementById("filterMovimentiStart") ? document.getElementById("filterMovimentiStart").value : null;
  const endDate = document.getElementById("filterMovimentiEnd") ? document.getElementById("filterMovimentiEnd").value : null;
  const tipo = document.getElementById("movimentiTipoFilter") ? document.getElementById("movimentiTipoFilter").value : "tutti";

  let filtered = allMovimenti;

  // Filtro per tipo
  if (tipo === "carico") {
    filtered = filtered.filter(m => m.tipo === "carico");
  } else if (tipo === "scarico") {
    filtered = filtered.filter(m => m.tipo === "scarico");
  }

  // Filtro per testo
  if (searchTerm) {
    filtered = filtered.filter(m =>
      (m.prodotto_nome && m.prodotto_nome.toLowerCase().includes(searchTerm)) ||
      (m.marca_nome && m.marca_nome.toLowerCase().includes(searchTerm)) ||
      (m.prodotto_descrizione && m.prodotto_descrizione.toLowerCase().includes(searchTerm))
    );
  }

  // Filtro per data
  if (startDate) {
    filtered = filtered.filter(m => m.data_movimento >= startDate);
  }
  if (endDate) {
    filtered = filtered.filter(m => m.data_movimento <= endDate);
  }

  movimenti = filtered;
  renderMovimenti();
}


// ── Rendering tabella ────────────────────────────────────────
function renderMovimenti() {
  const tbody = document.getElementById("movimentiTableBody");
  if (!tbody) return;

  if (!Array.isArray(movimenti) || movimenti.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="11" class="text-center">
          <div style="padding:40px 20px;color:var(--text-secondary);">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                 style="width:48px;height:48px;margin:0 auto 16px;opacity:0.5;">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
              <polyline points="17 6 23 6 23 12"/>
            </svg>
            <p style="font-size:16px;font-weight:600;margin-bottom:8px;">Nessun movimento presente</p>
            <p style="font-size:14px;">Clicca su <strong>Nuovo</strong> per registrare un carico o scarico</p>
          </div>
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = movimenti
    .map((m) => {
      const isScarico = m.tipo === "scarico";
      const colorClass = isScarico ? "text-red" : "text-green";

      // 1. Quantità (sempre positiva)
      const quantitaHtml = `${formatQuantity(m.quantita)}`;

      // 2. Prezzo Unitario
      let prezzoUnitHtml = "-";
      if (m.tipo === "carico") {
        prezzoUnitHtml = formatCurrency(m.prezzo);
      } else if (isScarico && m.prezzo_unitario_scarico != null) {
        prezzoUnitHtml = formatCurrency(m.prezzo_unitario_scarico);
      }

      // 3. Prezzo Totale (sempre positivo)
      const prezzoTotHtml = formatCurrency(Math.abs(m.prezzo_totale_movimento || 0));

      const descr = m.prodotto_descrizione
        ? `<small>${escapeHtml(m.prodotto_descrizione.substring(0, 30))}${m.prodotto_descrizione.length > 30 ? "…" : ""}</small>`
        : '<span style="color:#999;">-</span>';

      const docCell =
        isScarico
          ? ""
          : (() => {
            const doc = m.fattura_doc || "";
            if (/\.pdf$/i.test(doc.trim())) {
              const nome = doc.trim();
              return `<span style="display:inline-flex;align-items:center;gap:5px;">
                <svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" style="width:16px;height:16px;">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
                <span style="font-size:12px;color:#64748b;">${escapeHtml(nome.replace(/\.pdf$/i, ""))}</span>
              </span>`;
            }
            return doc ? escapeHtml(doc) : "";
          })();

      // Bottoni Azione
      let buttoniHTML = `<div class="action-buttons">`;
      if (m.tipo === "carico") {
        buttoniHTML += `
        <button class="btn-icon btn-riordina" onclick="handleRiordino(${m.id})" title="Riordina questo carico">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
          </svg>
        </button>`;
      }
      buttoniHTML += `
        <button class="btn-icon btn-modifica" onclick="editMovimento(${m.id})" title="Modifica">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
        <button class="btn-icon btn-elimina" onclick="deleteMovimento(${m.id},'${escapeHtml(m.prodotto_nome)}','${m.tipo}')" title="Elimina">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
        </button>
      </div>`;

      return `
      <tr>
        <td>${new Date(m.data_movimento).toLocaleDateString("it-IT")}</td>
        <td><strong>${escapeHtml(m.prodotto_nome)}</strong></td>
        <td>${m.marca_nome ? escapeHtml(m.marca_nome) : '<span style="color:#999;">-</span>'}</td>
        <td>${descr}</td>
        <td><span class="badge ${isScarico ? "badge-danger" : "badge-success"}">${m.tipo.toUpperCase()}</span></td>
        <td class="${colorClass}">${quantitaHtml}</td>
        <td class="${colorClass}">${prezzoUnitHtml}</td>
        <td class="${colorClass}"><strong>${prezzoTotHtml}</strong></td>
        <td>${docCell}</td>
        <td>${isScarico ? "" : m.fornitore_cliente_id || ""}</td>
        <td class="text-right">
          ${buttoniHTML}
        </td>
      </tr>`;
    })
    .join("");
}

// ── Toggle visibilità campi carico/scarico ───────────────────

function editMovimento(id) {
  const movimento = movimenti.find((m) => m.id === id);
  if (movimento) openMovimentoModal(movimento);
}

// ── Giacenza info ────────────────────────────────────────────
async function showGiacenzaInfo(prodottoId) {
  const prodotto = prodotti.find((p) => p.id == prodottoId);
  if (prodotto) {
    const el = document.getElementById("giacenzaValue");
    const gi = document.getElementById("giacenzaInfo");
    if (el)
      el.textContent = `${prodotto.nome}${prodotto.marca_nome ? ` (${prodotto.marca_nome})` : ""} - Giacenza: ${formatQuantity(prodotto.giacenza || 0)} PZ/L`;
    if (gi) gi.style.display = "block";
  }
}

// ── Eliminazione ─────────────────────────────────────────────
async function deleteMovimento(id, prodottoNome, tipo) {
  const tipoLabel = tipo === "carico" ? "CARICO" : "SCARICO";
  const messaggio = `
    Sei sicuro di voler eliminare questo movimento di <strong>${tipoLabel}</strong>?
    <div style="margin-top:12px;padding:10px;background:rgba(99,102,241,0.1);border-radius:6px;">
      <strong>Prodotto:</strong> ${escapeHtml(prodottoNome)}
    </div>`;
  const confermato = await showConfirmModal(messaggio, "Elimina Movimento");
  if (!confermato) return;

  try {
    const res = await fetch(`${API_URL}/dati/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (res.ok) {
      if (typeof ignoreNextSocketUpdate === "function")
        ignoreNextSocketUpdate();
      showAlertModal(
        "Movimento eliminato con successo!",
        "Operazione Completata",
        "success",
      );
      await loadMovimenti();
      await loadProdotti();
    } else {
      throw new Error(data.error || "Errore eliminazione");
    }
  } catch (error) {
    showAlertModal(`Errore: ${error.message}`, "Errore", "error");
  }
}

// ── Submit form movimento ────────────────────────────────────
document
  .getElementById("formMovimento")
  .addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("movimentoId").value;
    const prodotto_id = document.getElementById("movimentoProdotto").value;
    const tipo = document.getElementById("movimentoTipo").value;
    const quantita = parseDecimalInput(
      document.getElementById("movimentoQuantita").value,
    );
    const data_mov = document.getElementById("movimentoData").value;

    let prezzo = null;
    if (tipo === "carico")
      prezzo = parseDecimalInput(
        document.getElementById("movimentoPrezzo").value,
      );

    const fattura_doc =
      tipo === "carico"
        ? document.getElementById("movimentoFattura").value.trim() || null
        : null;
    const fornitore =
      tipo === "carico"
        ? document.getElementById("movimentoFornitore").value.trim() || null
        : null;

    if (!prodotto_id || !tipo || !quantita || !data_mov) {
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
          quantita: parseFloat(quantita.toFixed(2)),
          prezzo: prezzo ? parseFloat(prezzo.toFixed(2)) : null,
          data_movimento: data_mov,
          fattura_doc,
          fornitore,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        if (typeof skipNextSocketUpdate === "function")
          skipNextSocketUpdate();
        alert(id ? "Movimento aggiornato!" : "Movimento registrato!");
        closeMovimentoModal();
        loadMovimenti();
        loadProdotti();
      } else {
        alert(data.error || "Errore durante il salvataggio");
      }
    } catch {
      alert("Errore di connessione");
    }
  });

// ── Ricerca prodotti nel modal movimento ─────────────────────
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
// ==================== ALERT RIORDINO: Prodotti a Giacenza Zero ====================

/**
 * Renderizza il pannello "Alert Riordino" sotto la tabella movimenti.
 * Mostra tutti i prodotti con giacenza = 0 che hanno avuto almeno un carico passato,
 * così l'utente può riordinare con un click.
 */
function renderAlertRiordino() {
  const container = document.getElementById("alertRiordino");
  const grid = document.getElementById("alertRiordinoGrid");
  const countEl = document.getElementById("alertRiordinoCount");
  if (!container || !grid || !countEl) return;

  // Prodotti con giacenza zero (usa allProdotti che è sempre la lista completa)
  const prodottiZero = (allProdotti || []).filter(
    (p) => (parseFloat(p.giacenza) || 0) === 0
  );

  if (prodottiZero.length === 0) {
    container.style.display = "none";
    return;
  }

  countEl.textContent = prodottiZero.length;
  container.style.display = "block";

  grid.innerHTML = prodottiZero
    .map((p) => {
      const nome = escapeHtml(p.nome);
      const marca = p.marca_nome ? escapeHtml(p.marca_nome) : null;
      const descr = p.descrizione
        ? escapeHtml(p.descrizione.substring(0, 45)) +
        (p.descrizione.length > 45 ? "…" : "")
        : null;

      return `
        <div class="alert-riordino-card">
          <div class="alert-riordino-card-info">
            <div class="alert-riordino-card-nome" title="${nome}">${nome}</div>
            <div class="alert-riordino-card-meta">
              ${marca ? `<span class="alert-riordino-card-marca">${marca}</span>` : ""}
              <span class="alert-riordino-card-zero">Giacenza: 0</span>
            </div>
            ${descr ? `<div class="alert-riordino-card-descr">${descr}</div>` : ""}
          </div>
          <button
            class="btn-riordina-alert"
            onclick="handleRiordinoDaProdotto(${p.id})"
            title="Riordina ${nome}"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                 stroke-linecap="round" stroke-linejoin="round">
              <circle cx="9" cy="21" r="1"/>
              <circle cx="20" cy="21" r="1"/>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
            </svg>
            Riordina
          </button>
        </div>`;
    })
    .join("");
}

/**
 * Inietta i campi filtro data (Inizio/Fine) accanto alla barra di ricerca
 */
function injectDateFilters() {
  const searchInput = document.getElementById("filterMovimenti");
  if (!searchInput) return;

  // Trova il contenitore dei filtri
  const container = searchInput.parentNode;
  if (!container) return;

  // Evita duplicati
  if (document.getElementById("filterMovimentiStart")) return;

  // Wrapper per le date
  const dateWrapper = document.createElement("div");
  dateWrapper.className = "date-filter";
  // Rimosso stile inline per permettere al CSS (.date-filter) di gestire il responsive su mobile

  // HTML per Data Inizio
  const startGroup = document.createElement("div");
  startGroup.style.display = "flex";
  startGroup.style.flexDirection = "column";
  startGroup.style.gap = "4px";
  startGroup.innerHTML = `
    <label for="filterMovimentiStart" style="font-size:11px; font-weight:700; color:var(--text-secondary); text-transform:uppercase;">Data Inizio</label>
    <input type="date" id="filterMovimentiStart" class="input-date" style="padding: 8px 12px; height: 42px;">
  `;

  // HTML per Data Fine
  const endGroup = document.createElement("div");
  endGroup.style.display = "flex";
  endGroup.style.flexDirection = "column";
  endGroup.style.gap = "4px";
  endGroup.innerHTML = `
    <label for="filterMovimentiEnd" style="font-size:11px; font-weight:700; color:var(--text-secondary); text-transform:uppercase;">Data Fine</label>
    <input type="date" id="filterMovimentiEnd" class="input-date" style="padding: 8px 12px; height: 42px;">
  `;

  dateWrapper.appendChild(startGroup);
  dateWrapper.appendChild(endGroup);

  // Inserisci dopo il campo di ricerca
  if (searchInput.nextSibling) {
    container.insertBefore(dateWrapper, searchInput.nextSibling);
  } else {
    container.appendChild(dateWrapper);
  }

  // Inizializza persistenza (funzioni in search.js)
  if (typeof setupDatePersistence === "function") {
    setupDatePersistence("filterMovimentiStart", "search_movimenti_start", filterMovimenti);
    setupDatePersistence("filterMovimentiEnd", "search_movimenti_end", filterMovimenti);
  }

  // Aggiungi validazione (Data Fine >= Data Inizio)
  const startIn = document.getElementById("filterMovimentiStart");
  const endIn = document.getElementById("filterMovimentiEnd");

  startIn.addEventListener("change", () => {
    if (startIn.value) endIn.min = startIn.value;
    if (endIn.value && startIn.value && endIn.value < startIn.value) {
      endIn.value = startIn.value;
      endIn.dispatchEvent(new Event("change")); // Triggera il salvataggio/filtro
    }
    filterMovimenti();
  });

  endIn.addEventListener("change", () => {
    if (endIn.value && startIn.value && startIn.value > endIn.value) {
      startIn.value = endIn.value;
      startIn.dispatchEvent(new Event("change"));
    }
    filterMovimenti();
  });
}

// Esporta globalmente
window.renderAlertRiordino = renderAlertRiordino;