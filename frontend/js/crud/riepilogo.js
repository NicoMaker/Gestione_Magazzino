// ==================== GESTIONE RIEPILOGO ====================
// File: riepilogo.js
// Scopo: Riepilogo giacenze FIFO, storico a data, stampe

// ── Riepilogo ────────────────────────────────────────────────
async function loadRiepilogo() {
  try {
    const res  = await fetch(`${API_URL}/magazzino/riepilogo`);
    const data = await res.json();
    allRiepilogo = data.riepilogo || [];
    riepilogo    = allRiepilogo;
    updateRiepilogoTotal();
    renderRiepilogo();
    reapplyFilter("filterRiepilogo");
  } catch (error) {
    console.error("Errore caricamento riepilogo:", error);
  }
}

function updateRiepilogoTotal() {
  const tot = riepilogo.reduce((s, r) => s + Number.parseFloat(r.valore_totale || 0), 0);
  const el  = document.getElementById("valoreTotale");
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
          <th>Data Carico</th><th>Quantità (pz)</th><th>Prezzo Unitario</th>
          <th>Valore</th><th>Documento/Fattura</th><th>Fornitore</th>
        </tr></thead><tbody>`;
      r.lotti.forEach((l) => {
        html += `<tr>
          <td>${new Date(l.data_carico).toLocaleDateString("it-IT")}</td>
          <td><strong>${formatQuantity(l.quantita_rimanente)}</strong></td>
          <td>${formatCurrency(l.prezzo)}</td>
          <td><strong>${formatCurrency(l.quantita_rimanente * l.prezzo)}</strong></td>
          <td>${l.fattura_doc || '<span style="color:#999;">-</span>'}</td>
          <td>${l.fornitore  || '<span style="color:#999;">-</span>'}</td>
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
  if (!data) { allStorico = []; storico = []; updateStoricoTotal(); renderStorico(storico); return; }

  try {
    const res    = await fetch(`${API_URL}/magazzino/storico-giacenza/${data}`);
    const result = await res.json();
    allStorico = result.riepilogo || [];
    storico    = allStorico;
    updateStoricoTotal();
    renderStorico(storico);
    reapplyFilter("filterStorico");
  } catch (error) {
    console.error("Errore caricamento storico:", error);
    showAlertModal("Errore nel caricamento dello storico", "Errore", "error");
  }
}

function updateStoricoTotal() {
  const tot = storico.reduce((s, x) => s + Number.parseFloat(x.valore_totale || 0), 0);
  const el  = document.getElementById("valoreStorico");
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
          <p style="font-size:16px;font-weight:600;">Seleziona una data</p>
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
          <th>Data Carico</th><th>Quantità (pz)</th><th>Prezzo Unitario</th>
          <th>Valore</th><th>Documento/Fattura</th><th>Fornitore</th>
        </tr></thead><tbody>`;
      s.lotti.forEach((l) => {
        html += `<tr>
          <td>${new Date(l.data_carico).toLocaleDateString("it-IT")}</td>
          <td><strong>${formatQuantity(l.quantita_rimanente)}</strong></td>
          <td>${formatCurrency(l.prezzo)}</td>
          <td><strong>${formatCurrency(l.quantita_rimanente * l.prezzo)}</strong></td>
          <td>${l.fattura_doc || '<span style="color:#999;">-</span>'}</td>
          <td>${l.fornitore  || '<span style="color:#999;">-</span>'}</td>
        </tr>`;
      });
      html += `</tbody></table></div></td></tr>`;
    }
  });
  tbody.innerHTML = html;
}

// ── Stampe ───────────────────────────────────────────────────
function _buildPrintFrame(content) {
  content = insertCompanyInfoPrint(content);
  const iframe = document.createElement("iframe");
  Object.assign(iframe.style, { position:"fixed", right:"0", bottom:"0", width:"0", height:"0", border:"0" });
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument || iframe.contentWindow.document;
  doc.open(); doc.write(content); doc.close();
  iframe.onload = () => {
    setTimeout(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      setTimeout(() => document.body.removeChild(iframe), 1000);
    }, 500);
  };
}

const _printCSS = `
  body{font-family:Arial,sans-serif;margin:20px}
  h1{color:#333;border-bottom:2px solid #4F46E5;padding-bottom:10px}
  .info{margin:20px 0;font-size:14px}
  .prodotto-block{margin-bottom:30px;page-break-inside:avoid}
  .prodotto-header{background:#e0e7ff;padding:10px;margin-bottom:10px;border-left:4px solid #4F46E5}
  .prodotto-info{display:flex;justify-content:space-between;margin:5px 0;gap:10px;flex-wrap:wrap}
  table{width:100%;border-collapse:collapse;margin-top:10px}
  th,td{border:1px solid #ddd;padding:8px;text-align:left;font-size:12px}
  th{background:#6366f1;color:white}
  .lotto-row{background:#f9fafb}
  .header-row{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;gap:10px}
  .header-left img{width:120px;height:auto}
  .header-right{text-align:right;font-size:12px;line-height:1.2}
  .header-right p{margin:2px 0}
  @page{margin:10mm}`;

const _printHeader = `
  <div class="header-row">
    <div class="header-left"><img src="img/Logo.png" alt="Logo"></div>
    <div class="header-right">
      <p><strong>Indirizzo:</strong> {{company.address}}, {{company.cap}} {{company.city}} ({{company.province}})</p>
      <p><strong>P. IVA:</strong> {{company.piva}}</p>
      <p><strong>Email:</strong> {{company.email}}</p>
      <p><strong>Tel:</strong> {{company.phone}}</p>
    </div>
  </div>`;

function _buildProductBlocks(lista) {
  let out = "";
  lista.forEach((prodotto) => {
    if (prodotto.giacenza <= 0) return;
    out += `
      <div class="prodotto-block">
        <div class="prodotto-header">
          <div class="prodotto-info"><span><strong>Prodotto:</strong> ${prodotto.nome}</span><span><strong>Giacenza:</strong> ${formatQuantity(prodotto.giacenza)} pz</span></div>
          <div class="prodotto-info"><span><strong>Marca:</strong> ${prodotto.marca_nome || "-"}</span><span><strong>Valore:</strong> ${formatCurrency(prodotto.valore_totale)}</span></div>
          ${prodotto.descrizione ? `<div class="prodotto-info"><span><strong>Descrizione:</strong> ${prodotto.descrizione}</span></div>` : ""}
        </div>`;
    if (prodotto.lotti && prodotto.lotti.length > 0) {
      out += `<table><thead><tr><th>Data Carico</th><th>Quantità (pz)</th><th>Prezzo Unitario</th><th>Valore</th><th>Documento/Fattura</th><th>Fornitore</th></tr></thead><tbody>`;
      prodotto.lotti.forEach((l) => {
        out += `<tr class="lotto-row"><td>${new Date(l.data_carico).toLocaleDateString("it-IT")}</td><td>${formatQuantity(l.quantita_rimanente)}</td><td>${formatCurrency(l.prezzo)}</td><td><strong>${formatCurrency(l.quantita_rimanente * l.prezzo)}</strong></td><td>${l.fattura_doc || "-"}</td><td>${l.fornitore || "-"}</td></tr>`;
      });
      out += `</tbody></table>`;
    }
    out += `</div>`;
  });
  return out;
}

function printRiepilogo() {
  if (!riepilogo || riepilogo.length === 0) { alert("Nessun prodotto da stampare"); return; }
  const tot = riepilogo.reduce((s, r) => s + Number.parseFloat(r.valore_totale || 0), 0);
  const content = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Riepilogo Magazzino</title><style>${_printCSS}</style></head><body>
    ${_printHeader}
    <h1>Riepilogo Giacenze Magazzino</h1>
    <div class="info">
      <p><strong>Valore Totale:</strong> ${formatCurrency(tot)}</p>
      <p><strong>Data Stampa:</strong> ${new Date().toLocaleDateString("it-IT")} ${new Date().toLocaleTimeString("it-IT")}</p>
    </div>
    ${_buildProductBlocks(riepilogo)}
  </body></html>`;
  _buildPrintFrame(content);
}

function printStorico() {
  if (!storico || storico.length === 0) { alert("Nessun prodotto da stampare"); return; }
  const tot = storico.reduce((s, x) => s + Number.parseFloat(x.valore_totale || 0), 0);
  const dataEl = document.getElementById("storicoDate").value;
  const dataIt = dataEl ? new Date(dataEl + "T00:00:00").toLocaleDateString("it-IT") : "Non selezionata";
  const content = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Storico Giacenze</title><style>${_printCSS}</style></head><body>
    ${_printHeader}
    <h1>Storico Giacenze Magazzino</h1>
    <div class="info">
      <p><strong>Data Selezionata:</strong> ${dataIt}</p>
      <p><strong>Valore Totale:</strong> ${formatCurrency(tot)}</p>
      <p><strong>Data Stampa:</strong> ${new Date().toLocaleDateString("it-IT")} ${new Date().toLocaleTimeString("it-IT")}</p>
    </div>
    ${_buildProductBlocks(storico)}
  </body></html>`;
  _buildPrintFrame(content);
}
