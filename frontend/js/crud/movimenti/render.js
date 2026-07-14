// ==================== MOVIMENTI: RENDER + FILTRI ====================
// File: js/crud/movimenti/render.js
// Scopo: rendering della tabella movimenti, filtri (tipo/testo/data),
//        pannello Alert Riordino, iniezione filtri data.

// ── Filtro per tipo (carico/scarico/tutti) ───────────────────
function filterMovimentiByTipo(tipo) {
  localStorage.setItem("movimenti_tipo_filter", tipo);
  filterMovimenti();
}

// ── Applicazione di tutti i filtri ───────────────────────────
function filterMovimenti() {
  const searchTerm = document.getElementById("filterMovimenti")
    ? document.getElementById("filterMovimenti").value.toLowerCase()
    : "";
  const startDate = document.getElementById("filterMovimentiStart")
    ? document.getElementById("filterMovimentiStart").value
    : null;
  const endDate = document.getElementById("filterMovimentiEnd")
    ? document.getElementById("filterMovimentiEnd").value
    : null;
  const tipo = document.getElementById("movimentiTipoFilter")
    ? document.getElementById("movimentiTipoFilter").value
    : "tutti";

  let filtered = allMovimenti;

  if (tipo === "carico") {
    filtered = filtered.filter((m) => m.tipo === "carico");
  } else if (tipo === "scarico") {
    filtered = filtered.filter((m) => m.tipo === "scarico");
  }

  if (searchTerm) {
    filtered = filtered.filter(
      (m) =>
        (m.prodotto_nome &&
          m.prodotto_nome.toLowerCase().includes(searchTerm)) ||
        (m.marca_nome && m.marca_nome.toLowerCase().includes(searchTerm)) ||
        (m.prodotto_descrizione &&
          m.prodotto_descrizione.toLowerCase().includes(searchTerm)),
    );
  }

  if (startDate) filtered = filtered.filter((m) => m.data_movimento >= startDate);
  if (endDate) filtered = filtered.filter((m) => m.data_movimento <= endDate);

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

  tbody.innerHTML = movimenti.map(rigaMovimento).join("");
}

// Genera l'HTML di una riga della tabella movimenti
function rigaMovimento(m) {
  const isScarico = m.tipo === "scarico";
  const colorClass = isScarico ? "text-red" : "text-green";

  const quantitaHtml = `${formatQuantity(m.quantita)}`;

  let prezzoUnitHtml = "-";
  if (m.tipo === "carico") {
    prezzoUnitHtml = formatCurrency(m.prezzo);
  } else if (isScarico && m.prezzo_unitario_scarico != null) {
    prezzoUnitHtml = formatCurrency(m.prezzo_unitario_scarico);
  }

  const prezzoTotHtml = formatCurrency(Math.abs(m.prezzo_totale_movimento || 0));

  const descr = m.prodotto_descrizione
    ? `<small>${escapeHtml(m.prodotto_descrizione.substring(0, 30))}${m.prodotto_descrizione.length > 30 ? "…" : ""}</small>`
    : '<span style="color:#999;">-</span>';

  const docCell = isScarico
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
    <td class="text-right">${buttoniHTML}</td>
  </tr>`;
}

// ── Alert Riordino: prodotti a giacenza zero ─────────────────
function renderAlertRiordino() {
  const container = document.getElementById("alertRiordino");
  const grid = document.getElementById("alertRiordinoGrid");
  const countEl = document.getElementById("alertRiordinoCount");
  if (!container || !grid || !countEl) return;

  const prodottiZero = (allProdotti || []).filter(
    (p) => (parseFloat(p.giacenza) || 0) === 0,
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

// ── Iniezione filtri data (Inizio/Fine) ──────────────────────
function injectDateFilters() {
  const searchInput = document.getElementById("filterMovimenti");
  if (!searchInput) return;

  const container = searchInput.parentNode;
  if (!container) return;
  if (document.getElementById("filterMovimentiStart")) return; // evita duplicati

  const dateWrapper = document.createElement("div");
  dateWrapper.className = "date-filter";

  const startGroup = document.createElement("div");
  startGroup.style.display = "flex";
  startGroup.style.flexDirection = "column";
  startGroup.style.gap = "4px";
  startGroup.innerHTML = `
    <label for="filterMovimentiStart" style="font-size:11px; font-weight:700; color:var(--text-secondary); text-transform:uppercase;">Data Inizio</label>
    <input type="date" id="filterMovimentiStart" class="input-date" style="padding: 8px 12px; height: 42px;">
  `;

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

  if (searchInput.nextSibling) {
    container.insertBefore(dateWrapper, searchInput.nextSibling);
  } else {
    container.appendChild(dateWrapper);
  }

  // Persistenza (funzioni in search.js)
  if (typeof setupDatePersistence === "function") {
    setupDatePersistence("filterMovimentiStart", "search_movimenti_start", filterMovimenti);
    setupDatePersistence("filterMovimentiEnd", "search_movimenti_end", filterMovimenti);
  }

  // Validazione Data Fine >= Data Inizio
  const startIn = document.getElementById("filterMovimentiStart");
  const endIn = document.getElementById("filterMovimentiEnd");

  startIn.addEventListener("change", () => {
    if (startIn.value) endIn.min = startIn.value;
    if (endIn.value && startIn.value && endIn.value < startIn.value) {
      endIn.value = startIn.value;
      endIn.dispatchEvent(new Event("change"));
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

// ── Esposizione globale ───────────────────────────────────────
window.renderAlertRiordino = renderAlertRiordino;
window.filterMovimenti = filterMovimenti;
window.filterMovimentiByTipo = filterMovimentiByTipo;
