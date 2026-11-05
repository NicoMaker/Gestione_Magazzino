// ==================== GESTIONE RIEPILOGO ====================
// File: riepilogo.js
// Scopo: Riepilogo giacenze FIFO, storico a data, stampe

// ── Riepilogo ────────────────────────────────────────────────
async function loadRiepilogo() {
  try {
    const res = await fetch(`${API_URL}/magazzino/riepilogo`);
    const data = await res.json();
    allRiepilogo = data.riepilogo || [];
    riepilogo = allRiepilogo;
    updateRiepilogoTotal();
    renderRiepilogo();
    reapplyFilter("filterRiepilogo");
  } catch (error) {
    console.error("Errore caricamento riepilogo:", error);
  }
}

function updateRiepilogoTotal() {
  const tot = riepilogo.reduce(
    (s, r) => s + Number.parseFloat(r.valore_totale || 0),
    0,
  );
  const el = document.getElementById("valoreTotale");
  if (el) el.textContent = formatCurrency(tot);
}

function renderRiepilogo() {
  const tbody = document.getElementById("riepilogoTableBody");
  if (!tbody) return;

  if (riepilogo.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" class="text-center">
          <div style="padding:40px 20px;color:var(--text-secondary);">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                 style="width:48px;height:48px;margin:0 auto 16px;opacity:0.5;">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
            </svg>
            <p style="font-size:16px;font-weight:600;margin-bottom:8px;">Nessun prodotto in magazzino</p>
            <p style="font-size:14px;">Registra dei movimenti di carico per iniziare</p>
          </div>
        </td>
      </tr>`;
    return;
  }

  let html = "";
  riepilogo.forEach((r) => {
    html += `
      <tr class="product-main-row">
        <td>
          <strong>${escapeHtml(r.nome)}</strong>
          ${r.marca_nome ? ` <span class="badge-marca">${escapeHtml(r.marca_nome).toUpperCase()}</span>` : ""}
        </td>
        <td>${r.descrizione ? `<small>${escapeHtml(r.descrizione.substring(0, 50))}${r.descrizione.length > 50 ? "..." : ""}</small>` : '<span style="color:#999;">-</span>'}</td>
        <td><span class="${(r.giacenza ?? 0) == 0 ? "badge-giacenza-zero" : "badge-giacenza"}">${formatQuantity(r.giacenza)}</span></td>
        <td><strong>${formatCurrency(r.valore_totale)}</strong></td>
      </tr>`;

    if (r.giacenza > 0 && r.lotti && r.lotti.length > 0) {
      html += `<tr class="lotti-row"><td colspan="4" class="lotti-container"><div class="lotti-table-wrapper">
        <table class="lotti-table"><thead><tr>
          <th>Data Carico</th><th>Quantità (pz/l)</th><th>Prezzo Unitario</th>
          <th>Valore</th><th>Documento/Fattura</th><th>Fornitore</th>
        </tr></thead><tbody>`;
      r.lotti.forEach((l) => {
        html += `<tr>
          <td>${new Date(l.data_carico).toLocaleDateString("it-IT")}</td>
          <td><strong>${formatQuantity(l.quantita_rimanente)}</strong></td>
          <td>${formatCurrency(l.prezzo)}</td>
          <td><strong>${formatCurrency(l.quantita_rimanente * l.prezzo)}</strong></td>
          <td>${l.fattura_doc || '<span style="color:#999;">-</span>'}</td>
          <td>${l.fornitore || '<span style="color:#999;">-</span>'}</td>
        </tr>`;
      });
      html += `</tbody></table></div></td></tr>`;
    }
  });
  tbody.innerHTML = html;
}

// ── Storico ──────────────────────────────────────────────────
async function loadStorico() {
  const data = document.getElementById("storicoDate").value;
  if (!data) {
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
    console.error("Errore caricamento storico:", error);
    showAlertModal("Errore nel caricamento dello storico", "Errore", "error");
  }
}

function updateStoricoTotal() {
  const tot = storico.reduce(
    (s, x) => s + Number.parseFloat(x.valore_totale || 0),
    0,
  );
  const el = document.getElementById("valoreStorico");
  if (el) el.textContent = formatCurrency(tot);
}

function renderStorico(storicoData) {
  const tbody = document.getElementById("storicoTableBody");
  if (!tbody) return;

  const dataSelezionata = document.getElementById("storicoDate").value;

  if (!dataSelezionata) {
    tbody.innerHTML = `
      <tr><td colspan="4" class="text-center">
        <div style="padding:40px 20px;color:var(--text-secondary);">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
               style="width:48px;height:48px;margin:0 auto 16px;display:block;opacity:0.5;">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          <p style="font-size:16px;font-weight:600;margin-bottom:8px;">Seleziona una data</p>
          <p style="font-size:14px;">Scegli una data dal calendario per visualizzare lo storico</p>
        </div>
      </td></tr>`;
    return;
  }

  if (storicoData.length === 0) {
    tbody.innerHTML = `
      <tr><td colspan="4" class="text-center">
        <div style="padding:40px 20px;color:var(--text-secondary);">
          <p style="font-size:16px;font-weight:600;">Nessun dato disponibile</p>
          <p style="font-size:14px;">Non ci sono prodotti in magazzino per questa data</p>
        </div>
      </td></tr>`;
    return;
  }

  let html = "";
  storicoData.forEach((s) => {
    html += `
      <tr class="product-main-row">
        <td>
          <strong>${escapeHtml(s.nome)}</strong>
          ${s.marca_nome ? ` <span class="badge-marca">${escapeHtml(s.marca_nome).toUpperCase()}</span>` : ""}
        </td>
        <td>${s.descrizione ? `<small>${escapeHtml(s.descrizione.substring(0, 50))}${s.descrizione.length > 50 ? "..." : ""}</small>` : '<span style="color:#999;">-</span>'}</td>
        <td><span class="${(s.giacenza ?? 0) == 0 ? "badge-giacenza-zero" : "badge-giacenza"}">${formatQuantity(s.giacenza)}</span></td>
        <td><strong>${formatCurrency(s.valore_totale)}</strong></td>
      </tr>`;

    if (s.giacenza > 0 && s.lotti && s.lotti.length > 0) {
      html += `<tr class="lotti-row"><td colspan="4" class="lotti-container"><div class="lotti-table-wrapper">
        <table class="lotti-table"><thead><tr>
          <th>Data Carico</th><th>Quantità (pz/l)</th><th>Prezzo Unitario</th>
          <th>Valore</th><th>Documento/Fattura</th><th>Fornitore</th>
        </tr></thead><tbody>`;
      s.lotti.forEach((l) => {
        html += `<tr>
          <td>${new Date(l.data_carico).toLocaleDateString("it-IT")}</td>
          <td><strong>${formatQuantity(l.quantita_rimanente)}</strong></td>
          <td>${formatCurrency(l.prezzo)}</td>
          <td><strong>${formatCurrency(l.quantita_rimanente * l.prezzo)}</strong></td>
          <td>${l.fattura_doc || '<span style="color:#999;">-</span>'}</td>
          <td>${l.fornitore || '<span style="color:#999;">-</span>'}</td>
        </tr>`;
      });
      html += `</tbody></table></div></td></tr>`;
    }
  });
  tbody.innerHTML = html;
}
