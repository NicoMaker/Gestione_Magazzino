// ==================== GESTIONE MOVIMENTI ====================
// File: movimenti.js
// Scopo: Caricamento, rendering, creazione, modifica ed eliminazione movimenti
//        + ricerca prodotti nel modal + gestione campi carico/scarico

let selectedProdottoId = null;

// ── Caricamento ──────────────────────────────────────────────
async function loadMovimenti() {
  try {
    const res = await fetch(`${API_URL}/dati/`);
    if (!res.ok) {
      movimenti = [];
      allMovimenti = [];
      renderMovimenti();
      return;
    }
    const data = await res.json();
    allMovimenti = Array.isArray(data) ? data : [];
    movimenti = allMovimenti;
    renderMovimenti();
    reapplyFilter("filterMovimenti");
  } catch (error) {
    console.error("Errore caricamento movimenti", error);
  }
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
      const prefix = m.tipo === "scarico" ? "-" : "";
      let prezzoUnitHtml = "-";
      if (m.tipo === "carico") prezzoUnitHtml = formatCurrency(m.prezzo);
      else if (m.tipo === "scarico" && m.prezzo_unitario_scarico != null)
        prezzoUnitHtml = formatCurrency(m.prezzo_unitario_scarico).replace(
          "€",
          `${prefix}€`,
        );

      const prezzoTotHtml = formatCurrency(
        m.prezzo_totale_movimento || 0,
      ).replace("€", `${prefix}€`);
      const colorClass = m.tipo === "carico" ? "text-green" : "text-red";
      const descr = m.prodotto_descrizione
        ? `<small>${escapeHtml(m.prodotto_descrizione.substring(0, 30))}${m.prodotto_descrizione.length > 30 ? "…" : ""}</small>`
        : '<span style="color:#999;">-</span>';

      const docCell =
        m.tipo === "scarico"
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

      return `
      <tr>
        <td>${new Date(m.data_movimento).toLocaleDateString("it-IT")}</td>
        <td><strong>${escapeHtml(m.prodotto_nome)}</strong></td>
        <td>${m.marca_nome ? escapeHtml(m.marca_nome) : '<span style="color:#999;">-</span>'}</td>
        <td>${descr}</td>
        <td><span class="badge ${m.tipo === "carico" ? "badge-success" : "badge-danger"}">${m.tipo.toUpperCase()}</span></td>
        <td class="${colorClass}">${formatQuantity(m.quantita)}</td>
        <td class="${colorClass}">${prezzoUnitHtml}</td>
        <td class="${colorClass}"><strong>${prezzoTotHtml}</strong></td>
        <td>${docCell}</td>
        <td>${m.tipo === "scarico" ? "" : m.fornitore_cliente_id || ""}</td>
        <td class="text-right">
          <button class="btn-icon" onclick="editMovimento(${m.id})" title="Modifica">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button class="btn-icon" onclick="deleteMovimento(${m.id},'${escapeHtml(m.prodotto_nome)}','${m.tipo}')" title="Elimina">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
          </button>
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
        if (typeof ignoreNextSocketUpdate === "function")
          ignoreNextSocketUpdate();
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
