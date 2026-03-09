// ==================== STAMPE MAGAZZINO ====================
// File: stampe.js
// Scopo: Funzioni di stampa per riepilogo e storico giacenze

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

function _buildPrintFrame(content) {
  content = insertCompanyInfoPrint(content);
  const iframe = document.createElement("iframe");
  Object.assign(iframe.style, {
    position: "fixed",
    right: "0",
    bottom: "0",
    width: "0",
    height: "0",
    border: "0",
  });
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument || iframe.contentWindow.document;
  doc.open();
  doc.write(content);
  doc.close();
  iframe.onload = () => {
    setTimeout(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      setTimeout(() => document.body.removeChild(iframe), 1000);
    }, 500);
  };
}

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
  if (!riepilogo || riepilogo.length === 0) {
    alert("Nessun prodotto da stampare");
    return;
  }
  const tot = riepilogo.reduce(
    (s, r) => s + Number.parseFloat(r.valore_totale || 0),
    0,
  );
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
  if (!storico || storico.length === 0) {
    alert("Nessun prodotto da stampare");
    return;
  }
  const tot = storico.reduce(
    (s, x) => s + Number.parseFloat(x.valore_totale || 0),
    0,
  );
  const dataEl = document.getElementById("storicoDate").value;
  const dataIt = dataEl
    ? new Date(dataEl + "T00:00:00").toLocaleDateString("it-IT")
    : "Non selezionata";
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
