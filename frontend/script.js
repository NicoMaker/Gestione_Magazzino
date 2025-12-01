// ================== VARIABILI GLOBALI ==================
let prodotti = [];
let dati = [];
let riepilogo = [];
let utenti = [];
let storico = []; // dati storico per data

let prodottoInModifica = null;
let utenteInModifica = null;

let prodottoDettaglioLotti = null;
let prodottoDettaglioLottiStorico = null;

// ================== CONFIG ==================
const API_BASE = "http://localhost:3000/api";

// ================== UTILITY ==================
function containsForbiddenChars(input) {
  if (typeof input !== "string") return false;
  const forbiddenRegex = /['\";<>\\-]/;
  return forbiddenRegex.test(input);
}

function sanitizeInputText(input) {
  if (typeof input !== "string") return "";
  return input.replace(/[^a-zA-Z0-9\s\-\\_.,]+/g, "").trim();
}

function formatNumber(value) {
  if (value === null || typeof value === "undefined" || isNaN(value)) {
    return "0,00";
  }
  return Number(value).toLocaleString("it-IT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function displayValue(val) {
  return val && String(val).trim() !== "" ? val : "—";
}

function mostraAlert(type, message, section) {
  const container = document.getElementById(`${section}-alert`);
  if (!container) return;

  let icon;
  let cssClass;

  switch (type) {
    case "success":
      icon = "✅";
      cssClass = "alert-success";
      break;
    case "error":
      icon = "❌";
      cssClass = "alert-error";
      break;
    case "warning":
      icon = "⚠️";
      cssClass = "alert-warning";
      break;
    default:
      icon = "ℹ️";
      cssClass = "alert-info";
      break;
  }

  container.innerHTML = `<div class="${cssClass}">${icon} ${message}</div>`;

  setTimeout(() => {
    container.innerHTML = "";
  }, 5000);
}

// ================== NAVIGAZIONE TABS ==================
function switchTab(tabName) {
  document
    .querySelectorAll(".section")
    .forEach((s) => s.classList.remove("active"));
  document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));

  const section = document.getElementById(`${tabName}-section`);
  if (section) section.classList.add("active");

  // attiva tab button
  const tabs = document.querySelectorAll(".tabs .tab");
  tabs.forEach((btn) => {
    if (btn.getAttribute("onclick") === `switchTab('${tabName}')`) {
      btn.classList.add("active");
    }
  });

  // caricamenti automatici per tab
  if (tabName === "prodotti") caricaProdotti();
  if (tabName === "dati") caricaDati();
  if (tabName === "riepilogo") caricaRiepilogo();
  if (tabName === "storico") {
    // non carico subito, aspetto data
  }
  if (tabName === "utenti") caricaUtenti();
}

// ================== LOGOUT ==================
function logout() {
  window.location.href = "index.html";
}

// ================== PRODOTTI ==================
async function caricaProdotti() {
  try {
    const res = await fetch(`${API_BASE}/prodotti`);
    if (!res.ok) throw new Error("Errore nel recupero prodotti");
    prodotti = await res.json();
    popolaSelectProdotti();
    visualizzaProdotti();
  } catch (err) {
    console.error(err);
    mostraAlert("error", "Errore nel caricamento dei prodotti", "prodotti");
  }
}

function visualizzaProdotti() {
  const tbody = document.getElementById("prodotti-body");
  if (!tbody) return;
  tbody.innerHTML = "";

  let totalGiacenza = 0;

  prodotti.forEach((p) => {
    const giac = p.giacenza || 0;
    totalGiacenza += giac;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${p.nome}</td>
      <td style="text-align:right"><strong>${giac}</strong></td>
      <td>
        <button class="btn btn-secondary btn-small" onclick="apriModalModificaProdotto(${p.id})">✏️ Modifica</button>
        <button class="btn btn-danger btn-small" onclick="eliminaProdotto(${p.id})">🗑️ Elimina</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // totali
  const totProd = document.getElementById("total-prodotti");
  const totGiac = document.getElementById("total-giacenza");
  if (totProd) totProd.textContent = prodotti.length;
  if (totGiac) totGiac.textContent = totalGiacenza;
}

async function aggiungiProdotto() {
  const input = document.getElementById("prodotto-nome");
  if (!input) return;
  const nomeRaw = input.value;
  const nome = sanitizeInputText(nomeRaw);

  if (!nome) {
    mostraAlert("warning", "Inserisci un nome prodotto valido", "prodotti");
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/prodotti`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome }),
    });

    const data = await res.json();
    if (!res.ok) {
      mostraAlert("error", data.error || "Errore creazione prodotto", "prodotti");
      return;
    }

    mostraAlert("success", "Prodotto creato con successo", "prodotti");
    input.value = "";
    caricaProdotti();
  } catch (err) {
    console.error(err);
    mostraAlert("error", "Errore di comunicazione col server", "prodotti");
  }
}

function apriModalModificaProdotto(id) {
  const prodotto = prodotti.find((p) => p.id === id);
  if (!prodotto) return;

  prodottoInModifica = id;
  document.getElementById("modifica-prodotto-id").textContent = id;
  document.getElementById("modifica-prodotto-nome").value = prodotto.nome;
  document.getElementById("modal-modifica-prodotto").style.display = "block";
}

function chiudiModalProdotto() {
  prodottoInModifica = null;
  document.getElementById("modal-modifica-prodotto").style.display = "none";
}

async function salvaModificaProdotto() {
  if (!prodottoInModifica) return;
  const nome = sanitizeInputText(
    document.getElementById("modifica-prodotto-nome").value
  );
  if (!nome) {
    mostraAlert("warning", "Nome prodotto non valido", "prodotti");
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/prodotti/${prodottoInModifica}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome }),
    });
    const data = await res.json();
    if (!res.ok) {
      mostraAlert("error", data.error || "Errore aggiornamento prodotto", "prodotti");
      return;
    }
    mostraAlert("success", "Prodotto aggiornato", "prodotti");
    chiudiModalProdotto();
    caricaProdotti();
    caricaRiepilogo();
  } catch (err) {
    console.error(err);
    mostraAlert("error", "Errore di comunicazione col server", "prodotti");
  }
}

async function eliminaProdotto(id) {
  if (!confirm("Eliminare il prodotto selezionato?")) return;

  try {
    const res = await fetch(`${API_BASE}/prodotti/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      mostraAlert("error", data.error || "Errore eliminazione prodotto", "prodotti");
      return;
    }
    mostraAlert("success", data.message || "Prodotto eliminato", "prodotti");
    caricaProdotti();
    caricaRiepilogo();
  } catch (err) {
    console.error(err);
    mostraAlert("error", "Errore di comunicazione col server", "prodotti");
  }
}

function popolaSelectProdotti() {
  const select = document.getElementById("dato-prodotto");
  if (!select) return;
  select.innerHTML = `<option value="">Seleziona prodotto...</option>`;
  prodotti.forEach((p) => {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = p.nome;
    select.appendChild(opt);
  });
}

// ================== MOVIMENTI (DATI) ==================
function toggleCaricoFields() {
  const tipo = document.getElementById("dato-tipo").value;
  const prezzoGroup = document.getElementById("prezzo-group");
  const fatturaGroup = document.getElementById("fattura-group");
  const fornitoreGroup = document.getElementById("fornitore-group");

  const isCarico = tipo === "carico";

  [prezzoGroup, fatturaGroup, fornitoreGroup].forEach((el) => {
    if (!el) return;
    if (isCarico) {
      el.classList.remove("hidden");
    } else {
      el.classList.add("hidden");
    }
  });
}

async function caricaDati() {
  try {
    const res = await fetch(`${API_BASE}/dati`);
    if (!res.ok) throw new Error("Errore recupero movimenti");
    dati = await res.json();
    visualizzaDati();
    caricaProdotti(); // per tenere giacenze aggiornate
  } catch (err) {
    console.error(err);
    mostraAlert("error", "Errore nel caricamento dei movimenti", "dati");
  }
}

function visualizzaDati() {
  const tbody = document.getElementById("dati-body");
  if (!tbody) return;
  tbody.innerHTML = "";

  dati.forEach((d) => {
    const isCarico = d.tipo === "carico";

    const prezzoUnit = d.prezzo_unitario_scarico
      ? d.prezzo_unitario_scarico
      : d.prezzo;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${formatDate(d.data_movimento)}</td>
      <td>${d.prodotto_nome}</td>
      <td>${isCarico ? "CARICO" : "SCARICO"}</td>
      <td style="text-align:right">${d.quantita}</td>
      <td style="text-align:right">${
        prezzoUnit != null ? formatNumber(prezzoUnit) + " €" : "—"
      }</td>
      <td style="text-align:right">${
        d.prezzo_totale != null ? formatNumber(d.prezzo_totale) + " €" : "—"
      }</td>
      <td>${displayValue(d.fattura_doc)}</td>
      <td>${displayValue(d.fornitore_cliente_id)}</td>
      <td>
        <button class="btn btn-danger btn-small" onclick="eliminaDato(${d.id})">🗑️ Elimina</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

async function aggiungiDato() {
  const tipo = document.getElementById("dato-tipo").value;
  const prodottoId = document.getElementById("dato-prodotto").value;
  const dataMov = document.getElementById("dato-data").value;
  const quantita = Number(document.getElementById("dato-quantita").value);
  let prezzo = document.getElementById("dato-prezzo").value;
  const fattura = document.getElementById("dato-fattura").value;
  const fornitore = document.getElementById("dato-fornitore").value;

  if (!prodottoId || !dataMov || !quantita || quantita <= 0) {
    mostraAlert("warning", "Compila tutti i campi obbligatori", "dati");
    return;
  }

  if (tipo === "carico") {
    prezzo = String(prezzo).replace(",", ".");
    const prc = parseFloat(prezzo);
    if (!prc || prc <= 0) {
      mostraAlert("warning", "Prezzo unitario carico non valido", "dati");
      return;
    }
    prezzo = prc;
  } else {
    prezzo = null;
  }

  try {
    const res = await fetch(`${API_BASE}/dati`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prodotto_id: Number(prodottoId),
        tipo,
        quantita,
        prezzo,
        data_movimento: dataMov,
        fattura_doc: sanitizeInputText(fattura),
        fornitore_cliente_id: sanitizeInputText(fornitore),
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      mostraAlert("error", data.error || "Errore registrazione movimento", "dati");
      return;
    }

    mostraAlert("success", "Movimento registrato", "dati");

    // pulizia campi (lascio tipo e prodotto)
    document.getElementById("dato-quantita").value = "";
    document.getElementById("dato-prezzo").value = "";
    document.getElementById("dato-fattura").value = "";
    document.getElementById("dato-fornitore").value = "";

    caricaDati();
    caricaRiepilogo();
  } catch (err) {
    console.error(err);
    mostraAlert("error", "Errore di comunicazione col server", "dati");
  }
}

async function eliminaDato(id) {
  if (!confirm("Eliminare il movimento selezionato?")) return;

  try {
    const res = await fetch(`${API_BASE}/dati/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      mostraAlert("error", data.error || "Errore eliminazione movimento", "dati");
      return;
    }
    mostraAlert("success", data.message || "Movimento eliminato", "dati");
    caricaDati();
    caricaRiepilogo();
  } catch (err) {
    console.error(err);
    mostraAlert("error", "Errore di comunicazione col server", "dati");
  }
}

// ================== RIEPILOGO MAGAZZINO CORRENTE ==================
async function caricaRiepilogo() {
  try {
    const res = await fetch(`${API_BASE}/riepilogo`);
    if (!res.ok) throw new Error("Errore recupero riepilogo");
    riepilogo = await res.json();
    visualizzaRiepilogo();
  } catch (err) {
    console.error(err);
    mostraAlert("error", "Errore nel caricamento del riepilogo", "riepilogo");
  }
}

async function apriDettaglioLotti(prodottoId, nomeProdotto) {
  try {
    const res = await fetch(`${API_BASE}/riepilogo/${prodottoId}`);
    if (!res.ok) throw new Error("Errore recupero lotti");
    const lotti = await res.json();

    const titolo = document.getElementById("dettaglio-prodotto-nome");
    const tbody = document.getElementById("lotti-body");

    if (titolo) titolo.textContent = `Dettaglio Lotti - ${nomeProdotto}`;
    if (tbody) {
      tbody.innerHTML = "";
      lotti.forEach((lotto) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${formatDate(lotto.data_carico)}</td>
          <td style="text-align:right">${lotto.quantita_rimanente}</td>
          <td style="text-align:right">${formatNumber(lotto.prezzo)} €</td>
          <td>${displayValue(lotto.fattura_doc)}</td>
          <td>${displayValue(lotto.fornitore_cliente_id)}</td>
        `;
        tbody.appendChild(tr);
      });
    }

    document.getElementById("modal-dettaglio-lotti").style.display = "block";
  } catch (err) {
    console.error(err);
    mostraAlert("error", "Errore nel caricamento dei lotti", "riepilogo");
  }
}

function chiudiModalDettaglioLotti() {
  document.getElementById("modal-dettaglio-lotti").style.display = "none";
}

// stampa riepilogo completo prodotti + lotti
async function stampaRiepilogoCompleto() {
  if (!riepilogo || riepilogo.length === 0) {
    mostraAlert("warning", "Nessun dato di riepilogo da stampare", "riepilogo");
    return;
  }

  // per ogni prodotto, recupero i lotti
  const righeHTML = [];
  for (const r of riepilogo) {
    try {
      const res = await fetch(`${API_BASE}/riepilogo/${r.id}`);
      const lotti = res.ok ? await res.json() : [];
      righeHTML.push({ prodotto: r, lotti });
    } catch {
      righeHTML.push({ prodotto: r, lotti: [] });
    }
  }

  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8" />
      <title>Riepilogo Magazzino</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { text-align: center; margin-bottom: 20px; }
        .header h1 { margin: 0; }
        .total { margin: 15px 0; font-size: 16px; font-weight: bold; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { border: 1px solid #ddd; padding: 8px; font-size: 12px; }
        th { background: #6366f1; color: white; }
        tr:nth-child(even) { background: #f9f9f9; }
        .prodotto-row { background:#e5e7eb;font-weight:bold; }
        .price { text-align:right; min-width:80px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Riepilogo Magazzino (Prodotti + Lotti)</h1>
        <p>Data stampa: ${new Date().toLocaleString("it-IT")}</p>
      </div>
      <div class="total">
        Valore totale magazzino: ${
          document.getElementById("riepilogo-valore-totale")?.textContent || "€ 0,00"
        }<br/>
        Giacenza complessiva: ${
          document.getElementById("riepilogo-giacenza-totale")?.textContent || "0"
        }
      </div>
      <table>
        <thead>
          <tr>
            <th>Prodotto</th>
            <th>Giacenza Totale</th>
            <th>Valore Totale</th>
          </tr>
        </thead>
        <tbody>
  `;

  righeHTML.forEach(({ prodotto, lotti }) => {
    html += `
      <tr class="prodotto-row">
        <td>${prodotto.nome}</td>
        <td>${prodotto.giacenza}</td>
        <td class="price">€ ${formatNumber(prodotto.valore_totale)}</td>
      </tr>
    `;

    if (lotti && lotti.length > 0) {
      html += `
        <tr>
          <td colspan="3">
            <table style="width:100%;border-collapse:collapse;margin-top:5px;">
              <thead>
                <tr>
                  <th>Data Carico</th>
                  <th>Quantità Rimanente</th>
                  <th>Prezzo Unitario</th>
                  <th>Valore Lotto</th>
                  <th>Fattura/Doc.</th>
                  <th>Fornitore</th>
                </tr>
              </thead>
              <tbody>
      `;
      lotti.forEach((lotto) => {
        const valoreLotto = lotto.quantita_rimanente * lotto.prezzo;
        html += `
          <tr>
            <td>${formatDate(lotto.data_carico)}</td>
            <td>${lotto.quantita_rimanente}</td>
            <td class="price">€ ${formatNumber(lotto.prezzo)}</td>
            <td class="price">€ ${formatNumber(valoreLotto)}</td>
            <td>${displayValue(lotto.fattura_doc)}</td>
            <td>${displayValue(lotto.fornitore_cliente_id)}</td>
          </tr>
        `;
      });
      html += `
              </tbody>
            </table>
          </td>
        </tr>
      `;
    }
  });

  html += `
        </tbody>
      </table>
    </body>
    </html>
  `;

  const frame = document.getElementById("print-frame");
  frame.srcdoc = html;
  setTimeout(() => frame.contentWindow.print(), 400);
}

// ================== STORICO MAGAZZINO ==================
async function caricaStoricoGiacenza() {
  const data = document.getElementById("storico-data").value;
  if (!data) {
    mostraAlert("warning", "Seleziona una data", "storico");
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/storico-giacenza/${data}`);
    if (!res.ok) throw new Error("Errore recupero storico");
    const result = await res.json();
    storico = result.riepilogo || [];
    visualizzaStorico(result.valore_totale || 0);
  } catch (err) {
    console.error(err);
    mostraAlert("error", "Errore nel caricamento dello storico", "storico");
  }
}

function visualizzaStorico(valoreTotale) {
  const tbody = document.getElementById("storico-body");
  if (!tbody) return;
  tbody.innerHTML = "";

  let giacenzaTotale = 0;

  storico.forEach((s) => {
    const giac = s.giacenza || 0;
    giacenzaTotale += giac;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${s.nome}</td>
      <td style="text-align:right"><strong>${giac}</strong></td>
      <td style="text-align:right"><strong>${formatNumber(s.valore_totale)} €</strong></td>
      <td>
        <button class="btn btn-secondary btn-small" onclick="apriDettaglioLottiStorico(${s.id}, '${s.nome}')">👁️ Dettagli Lotti</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  const valElem = document.getElementById("storico-valore-totale");
  const giacElem = document.getElementById("storico-giacenza-totale");
  const valLegacy = document.getElementById("valore-magazzino-storico");

  if (valElem) valElem.textContent = `€ ${formatNumber(valoreTotale)}`;
  if (giacElem) giacElem.textContent = giacenzaTotale;
  if (valLegacy) valLegacy.textContent = `€ ${formatNumber(valoreTotale)}`;
}

async function apriDettaglioLottiStorico(prodottoId, nomeProdotto) {
  const data = document.getElementById("storico-data").value;
  if (!data) return;

  const prodotto = storico.find((s) => s.id === prodottoId);
  if (!prodotto) return;

  const titolo = document.getElementById("dettaglio-prodotto-nome-storico");
  const dataLabel = document.getElementById("data-dettaglio-storico");
  const tbody = document.getElementById("lotti-body-storico");

  if (titolo) titolo.textContent = `Dettaglio Lotti Storico - ${nomeProdotto}`;
  if (dataLabel) dataLabel.textContent = `Data: ${formatDate(data)}`;

  if (tbody) {
    tbody.innerHTML = "";
    (prodotto.lotti_storici || []).forEach((lotto) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${formatDate(lotto.data_carico)}</td>
        <td style="text-align:right">${lotto.quantita_rimanente}</td>
        <td style="text-align:right">${formatNumber(lotto.prezzo)} €</td>
        <td>${displayValue(lotto.fattura_doc)}</td>
        <td>${displayValue(lotto.fornitore_cliente_id)}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  document.getElementById("modal-dettaglio-lotti-storico").style.display =
    "block";
}

function chiudiModalDettaglioLottiStorico() {
  document.getElementById("modal-dettaglio-lotti-storico").style.display =
    "none";
}

// stampa storico con totali in alto e dettaglio per prodotto + lotti
function stampaStorico() {
  if (!storico || storico.length === 0) {
    mostraAlert(
      "warning",
      "Carica i dati dello storico prima di stampare",
      "storico"
    );
    return;
  }

  const data = document.getElementById("storico-data").value;
  const valoreTotaleText =
    document.getElementById("storico-valore-totale")?.textContent || "€ 0,00";
  const giacenzaTotaleText =
    document.getElementById("storico-giacenza-totale")?.textContent || "0";

  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8" />
      <title>Storico Magazzino ${data}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { text-align: center; margin-bottom: 20px; }
        .header h1 { margin: 0; }
        .total { margin: 15px 0; font-size: 16px; font-weight: bold; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { border: 1px solid #ddd; padding: 8px; font-size: 12px; }
        th { background: #6366f1; color: white; }
        tr:nth-child(even) { background: #f9f9f9; }
        .prodotto-row { background:#e5e7eb;font-weight:bold; }
        .price { text-align:right; min-width:80px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>📅 Storico Magazzino</h1>
        <p>Data: ${formatDate(data)}</p>
      </div>
      <div class="total">
        💰 Valore Totale Magazzino: <strong>${valoreTotaleText}</strong><br/>
        🧮 Giacenza complessiva: <strong>${giacenzaTotaleText}</strong>
      </div>
      <table>
        <thead>
          <tr>
            <th>Prodotto</th>
            <th>Giacenza Totale</th>
            <th>Valore Totale (Costo)</th>
          </tr>
        </thead>
        <tbody>
  `;

  storico.forEach((s) => {
    html += `
      <tr class="prodotto-row">
        <td>${s.nome}</td>
        <td>${s.giacenza}</td>
        <td class="price">€ ${formatNumber(s.valore_totale)}</td>
      </tr>
    `;

    if (s.lotti_storici && s.lotti_storici.length > 0) {
      html += `
        <tr>
          <td colspan="3">
            <table style="width:100%;border-collapse:collapse;margin-top:5px;">
              <thead>
                <tr>
                  <th>Data Carico</th>
                  <th>Quantità Rimanente</th>
                  <th>Prezzo Unitario</th>
                  <th>Valore Lotto</th>
                  <th>Fattura/Doc.</th>
                  <th>Fornitore</th>
                </tr>
              </thead>
              <tbody>
      `;
      s.lotti_storici.forEach((lotto) => {
        const valoreLotto = lotto.quantita_rimanente * lotto.prezzo;
        html += `
          <tr>
            <td>${formatDate(lotto.data_carico)}</td>
            <td>${lotto.quantita_rimanente}</td>
            <td class="price">€ ${formatNumber(lotto.prezzo)}</td>
            <td class="price">€ ${formatNumber(valoreLotto)}</td>
            <td>${displayValue(lotto.fattura_doc)}</td>
            <td>${displayValue(lotto.fornitore_cliente_id)}</td>
          </tr>
        `;
      });
      html += `
              </tbody>
            </table>
          </td>
        </tr>
      `;
    }
  });

  html += `
        </tbody>
      </table>
    </body>
    </html>
  `;

  const frame = document.getElementById("print-frame");
  frame.srcdoc = html;
  setTimeout(() => frame.contentWindow.print(), 400);
}

// ================== UTENTI ==================
async function caricaUtenti() {
  try {
    const res = await fetch(`${API_BASE}/utenti`);
    if (!res.ok) throw new Error("Errore recupero utenti");
    utenti = await res.json();
    visualizzaUtenti();
  } catch (err) {
    console.error(err);
    mostraAlert("error", "Errore nel caricamento utenti", "utenti");
  }
}

function visualizzaUtenti() {
  const tbody = document.getElementById("utenti-body");
  if (!tbody) return;
  tbody.innerHTML = "";

  utenti.forEach((u) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${u.username}</td>
      <td>
        <button class="btn btn-secondary btn-small" onclick="apriModalModificaUtente(${u.id})">✏️ Modifica</button>
        <button class="btn btn-danger btn-small" onclick="eliminaUtente(${u.id})">🗑️ Elimina</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  const tot = document.getElementById("total-utenti");
  if (tot) tot.textContent = utenti.length;
}

async function aggiungiUtente() {
  const usernameRaw = document.getElementById("nuovo-username").value;
  const password = document.getElementById("nuova-password").value;

  const username = sanitizeInputText(usernameRaw);

  if (!username || !password) {
    mostraAlert("warning", "Inserisci username e password", "utenti");
    return;
  }

  if (
    password.length < 8 ||
    !/[A-Z]/.test(password) ||
    !/[a-z]/.test(password) ||
    !/[0-9]/.test(password)
  ) {
    mostraAlert(
      "warning",
      "Password debole: min 8 caratteri, maiuscola, minuscola, numero",
      "utenti"
    );
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/utenti`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      mostraAlert("error", data.error || "Errore creazione utente", "utenti");
      return;
    }

    mostraAlert("success", "Utente creato con successo", "utenti");
    document.getElementById("nuovo-username").value = "";
    document.getElementById("nuova-password").value = "";
    caricaUtenti();
  } catch (err) {
    console.error(err);
    mostraAlert("error", "Errore di comunicazione col server", "utenti");
  }
}

function apriModalModificaUtente(id) {
  const utente = utenti.find((u) => u.id === id);
  if (!utente) return;

  utenteInModifica = id;
  document.getElementById("modifica-utente-id").textContent = id;
  document.getElementById("modifica-username").value = utente.username;
  document.getElementById("modifica-password").value = "";
  document.getElementById("modal-modifica-utente").style.display = "block";
}

function chiudiModalUtente() {
  utenteInModifica = null;
  document.getElementById("modal-modifica-utente").style.display = "none";
}

async function salvaModificaUtente() {
  if (!utenteInModifica) return;

  const username = sanitizeInputText(
    document.getElementById("modifica-username").value
  );
  const password = document.getElementById("modifica-password").value;

  if (!username) {
    mostraAlert("warning", "Username non valido", "utenti");
    return;
  }

  if (password) {
    if (
      password.length < 8 ||
      !/[A-Z]/.test(password) ||
      !/[a-z]/.test(password) ||
      !/[0-9]/.test(password)
    ) {
      mostraAlert(
        "warning",
        "Nuova password debole: min 8 caratteri, maiuscola, minuscola, numero",
        "utenti"
      );
      return;
    }
  }

  try {
    const body = { username };
    if (password) body.password = password;

    const res = await fetch(`${API_BASE}/utenti/${utenteInModifica}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) {
      mostraAlert("error", data.error || "Errore aggiornamento utente", "utenti");
      return;
    }

    mostraAlert("success", "Utente aggiornato", "utenti");
    chiudiModalUtente();
    caricaUtenti();
  } catch (err) {
    console.error(err);
    mostraAlert("error", "Errore di comunicazione col server", "utenti");
  }
}

async function eliminaUtente(id) {
  if (!confirm("Eliminare l'utente selezionato?")) return;

  try {
    const res = await fetch(`${API_BASE}/utenti/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      mostraAlert("error", data.error || "Errore eliminazione utente", "utenti");
      return;
    }

    mostraAlert("success", "Utente eliminato", "utenti");
    caricaUtenti();
  } catch (err) {
    console.error(err);
    mostraAlert("error", "Errore di comunicazione col server", "utenti");
  }
}

// ================== INIT ==================
window.addEventListener("load", () => {
  // imposta utente (se vuoi leggere da localStorage qui puoi)
  document.getElementById("user-display").textContent = "Utente: Admin";

  const oggi = new Date().toISOString().slice(0, 10);
  const inputDataMov = document.getElementById("dato-data");
  const inputDataStorico = document.getElementById("storico-data");
  if (inputDataMov) inputDataMov.value = oggi;
  if (inputDataStorico) inputDataStorico.value = oggi;

  caricaProdotti();
  caricaDati();
  caricaRiepilogo();
  caricaUtenti();
});

// chiusura modali cliccando fuori
window.addEventListener("click", (event) => {
  const modalProd = document.getElementById("modal-modifica-prodotto");
  const modalUt = document.getElementById("modal-modifica-utente");
  const modalDett = document.getElementById("modal-dettaglio-lotti");
  const modalDettStorico = document.getElementById(
    "modal-dettaglio-lotti-storico"
  );

  [modalProd, modalUt, modalDett, modalDettStorico].forEach((modal) => {
    if (modal && event.target === modal) {
      modal.style.display = "none";
    }
  });
});


function popolaSelectProdotti() {
  const select = document.getElementById("dato-prodotto");
  if (!select) return;

  select.innerHTML = `<option value="">Seleziona prodotto...</option>`;

  prodotti.forEach((p) => {
    const giac = p.giacenza || 0;
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = `${p.nome} (${giac})`;    // <-- numero tra parentesi
    select.appendChild(opt);
  });
}


function visualizzaRiepilogo() {
  const tbody = document.getElementById("riepilogo-body");
  if (!tbody) return;
  tbody.innerHTML = "";

  let valoreTotale = 0;
  let giacenzaTotale = 0;

  riepilogo.forEach((r) => {
    const giac = r.giacenza || 0;
    const val = r.valore_totale || 0;
    giacenzaTotale += giac;
    valoreTotale += val;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${r.nome}</td>
      <td style="text-align:right"><strong>${giac}</strong></td>
      <td style="text-align:right"><strong>${formatNumber(val)} €</strong></td>
      <td>
        ${
          giac > 0
            ? `<button class="btn btn-secondary btn-small" onclick="apriDettaglioLotti(${r.id}, '${r.nome}')">👁️ Dettagli Lotti</button>`
            : ""
        }
      </td>
    `;
    tbody.appendChild(tr);
  });

  const valElem = document.getElementById("riepilogo-valore-totale");
  const giacElem = document.getElementById("riepilogo-giacenza-totale");
  if (valElem) valElem.textContent = `€ ${formatNumber(valoreTotale)}`;
  if (giacElem) giacElem.textContent = giacenzaTotale;
}
