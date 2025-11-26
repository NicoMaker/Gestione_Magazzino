let prodotti = [];
let dati = [];
let prodottoInModifica = null;
let prodottoDettaglio = null;

// ⭐ FUNZIONE DI RILEVAMENTO CARATTERI PROIBITI (SQL/XSS) ⭐
function containsForbiddenChars(input) {
  if (typeof input !== 'string') return false;
  // Cerca: apice ('), virgoletta ("), punto e virgola (;), trattini per commenti (--) e parentesi angolari (<>)
  const forbiddenRegex = /['";\-\-<>]/; 
  return forbiddenRegex.test(input);
}

// FUNZIONE DI SANIFICAZIONE MASSIMA (Rimuove tutto ciò che non è nella whitelist, difesa secondaria)
function sanitizeInputText(input) {
  if (typeof input !== 'string') return '';
  // Permette solo lettere, numeri, spazi, trattini (-), underscore (_), virgole (,) e punti (.).
  return input.replace(/[^a-zA-Z0-9\s\-\_.,]+/g, '').trim();
}

// Funzione helper per formattare i numeri come valuta italiana (virgola come separatore decimale)
function formatNumber(value) {
  if (value === null || typeof value === 'undefined' || isNaN(value)) {
    return '0,00';
  }
  return value.toLocaleString('it-IT', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  });
}

// Funzione per formattare la data in formato gg/mm/aaaa
function formatDate(dateString) {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

// Funzione per impostare la data corrente (oggi) al caricamento della pagina
function setInitialDate() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById("dato-data").value = today;
}

// Funzione di logout
function logout() {
  if (confirm('Sei sicuro di voler uscire?')) {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('username');
    window.location.href = '/index.html';
  }
}

// Funzione centrale per aggiornare tutti i dati
async function refreshAllData() {
  console.log("Aggiornamento automatico di tutte le sezioni...");
  await caricaProdotti();
  caricaDati();
  caricaRiepilogo();
  caricaValoreMagazzino();
  caricaSelectProdotti();
}

// Funzione interna pulita per cambiare tab senza dipendere dall'evento
function forceSwitchTab(tab) {
  document
    .querySelectorAll(".tab")
    .forEach((t) => t.classList.remove("active"));
  document
    .querySelectorAll(".section")
    .forEach((s) => s.classList.remove("active"));

  const tabButton = document.querySelector(
    `.tab[onclick="switchTab('${tab}')"]`
  );

  if (tabButton) {
    tabButton.classList.add("active");
  }

  const section = document.getElementById(`${tab}-section`);
  if (section) {
    section.classList.add("active");
  }

  if (["prodotti", "dati", "riepilogo"].includes(tab)) {
    refreshAllData();
  }
}

function checkUrlHashAndSwitch() {
  const hash = window.location.hash.substring(1);
  const validTabs = ["prodotti", "dati", "riepilogo"];

  let targetTab = "prodotti";

  if (hash && validTabs.includes(hash)) {
    targetTab = hash;
  }

  forceSwitchTab(targetTab);
}

// Inizializzazione: Chiama la funzione di refresh completa all'avvio E controlla l'URL
document.addEventListener("DOMContentLoaded", () => {
  setInitialDate();
  toggleCaricoFields();
  checkUrlHashAndSwitch();
  
  // Mostra username nella header
  const username = localStorage.getItem('username');
  if (username) {
    const userInfo = document.createElement('div');
    userInfo.className = 'user-info';
    userInfo.innerHTML = `
      <span>👤 ${username}</span>
      <button class="btn-logout" onclick="logout()">🚪 Esci</button>
    `;
    document.querySelector('header').appendChild(userInfo);
  }
});

// Switch tra tabs e aggiorna l'URL hash
function switchTab(tab) {
  if (window.location.hash !== `#${tab}`) {
    history.replaceState(null, null, `#${tab}`);
  }

  forceSwitchTab(tab);
}

// Toggle campi di Carico (Prezzo, Fattura, Fornitore)
function toggleCaricoFields() {
  const tipo = document.getElementById("dato-tipo").value;
  
  const prezzoGroup = document.getElementById("prezzo-group");
  const prezzoInput = document.getElementById("dato-prezzo");
  const fatturaGroup = document.getElementById("fattura-group");
  const fatturaInput = document.getElementById("dato-fattura");
  const fornitoreGroup = document.getElementById("fornitore-group");
  const fornitoreInput = document.getElementById("dato-fornitore");

  if (tipo === "scarico") {
    prezzoGroup.classList.add("hidden");
    prezzoInput.value = "";
    prezzoInput.removeAttribute("required");

    fatturaGroup.classList.add("hidden");
    fatturaInput.value = "";
    fatturaInput.removeAttribute("required");

    fornitoreGroup.classList.add("hidden");
    fornitoreInput.value = "";
    fornitoreInput.removeAttribute("required");
    
  } else if (tipo === "carico") {
    prezzoGroup.classList.remove("hidden");
    prezzoInput.setAttribute("required", "required");

    fatturaGroup.classList.remove("hidden");
    fatturaInput.setAttribute("required", "required");

    fornitoreGroup.classList.remove("hidden");
    fornitoreInput.setAttribute("required", "required");
  } else {
    prezzoGroup.classList.add("hidden");
    prezzoInput.value = "";
    prezzoInput.removeAttribute("required");

    fatturaGroup.classList.add("hidden");
    fatturaInput.value = "";
    fatturaInput.removeAttribute("required");

    fornitoreGroup.classList.add("hidden");
    fornitoreInput.value = "";
    fornitoreInput.removeAttribute("required");
  }
}

// Mostra alert
function mostraAlert(tipo, messaggio, sezione) {
  const alertDiv = document.getElementById(`${sezione}-alert`);
  alertDiv.innerHTML = `<div class="alert alert-${tipo}">${messaggio}</div>`;
  setTimeout(() => (alertDiv.innerHTML = ""), 4000);
}

// ===== PRODOTTI (CRUD) =====
async function caricaProdotti() {
  try {
    const res = await fetch("/api/prodotti");
    prodotti = await res.json();
    prodotti.sort((a, b) => a.nome.localeCompare(b.nome));
    renderProdotti();
  } catch (err) {
    console.error("Errore caricamento prodotti:", err);
  }
}

function renderProdotti() {
  const tbody = document.getElementById("prodotti-body");

  if (prodotti.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="3" class="empty-state">Nessun prodotto presente</td></tr>';
  } else {
    tbody.innerHTML = prodotti
      .map(
        (p) => `
          <tr>
            <td><strong>${p.nome}</strong></td>
            <td style="text-align: center;">
              <span class="giacenza ${p.giacenza > 0 ? "positiva" : "zero"}">
                ${p.giacenza}
              </span>
            </td>
            <td style="text-align: center;">
              <div class="actions">
                <button class="btn btn-warning btn-small" onclick="apriModificaProdotto(${
                  p.id
                }, '${p.nome.replace(/'/g, "\\'")}')">
                  ✏️ Modifica
                </button>
                <button class="btn btn-danger btn-small" onclick="eliminaProdotto(${
                  p.id
                })">
                  🗑️ Elimina
                </button>
              </div>
            </td>
          </tr>
        `
      )
      .join("");
  }

  document.getElementById("totale-prodotti").textContent = prodotti.length;

  const giacenzaTotale = prodotti.reduce((sum, p) => sum + p.giacenza, 0);
  document.getElementById("giacenza-totale-magazzino").textContent =
    giacenzaTotale;
}

async function aggiungiProdotto() {
  const input = document.getElementById("nuovo-prodotto");
  const nomeRaw = input.value;

  if (containsForbiddenChars(nomeRaw)) {
    mostraAlert("error", "⚠️ Caratteri non validi rilevati. Rimuovi simboli come ', \", ;, <, >.", "prodotti");
    return;
  }

  const nomeSanificato = sanitizeInputText(nomeRaw); 

  if (!nomeSanificato) {
    mostraAlert("error", "Inserisci il nome del prodotto (solo lettere, numeri e spazi)", "prodotti");
    return;
  }
  
  try {
    const res = await fetch("/api/prodotti", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome: nomeSanificato }),
    });

    const data = await res.json();

    if (!res.ok) {
      mostraAlert("error", data.error, "prodotti");
      return;
    }

    input.value = "";
    mostraAlert("success", "✅ Prodotto aggiunto con successo", "prodotti");
    refreshAllData();
  } catch (err) {
    mostraAlert("error", "Errore durante l'aggiunta", "prodotti");
  }
}

function apriModificaProdotto(id, nome) {
  prodottoInModifica = id;
  document.getElementById("modifica-nome").value = nome;
  document.getElementById("modal-modifica").classList.add("active");
}

function chiudiModal() {
  document.getElementById("modal-modifica").classList.remove("active");
  prodottoInModifica = null;
}

async function salvaNomeProdotto() {
  const nuovoNomeInput = document.getElementById("modifica-nome");
  const nuovoNomeRaw = nuovoNomeInput.value;

  if (containsForbiddenChars(nuovoNomeRaw)) {
    alert("⚠️ Caratteri non validi rilevati. Rimuovi simboli come ', \", ;, <, >.");
    return;
  }

  const nuovoNomeSanificato = sanitizeInputText(nuovoNomeRaw); 
  
  if (!nuovoNomeSanificato) {
    alert("Inserisci un nome valido (solo lettere, numeri e spazi)");
    return;
  }

  try {
    const res = await fetch(`/api/prodotti/${prodottoInModifica}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome: nuovoNomeSanificato }),
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error);
      return;
    }

    chiudiModal();
    mostraAlert("success", "✅ Nome prodotto modificato", "prodotti");
    refreshAllData();
  } catch (err) {
    alert("Errore durante la modifica");
  }
}

async function eliminaProdotto(id) {
  if (
    !confirm(
      "⚠️ ATTENZIONE: L'eliminazione è consentita SOLO se la giacenza è zero. Se procedi, verranno cancellati PERMANENTEMENTE tutti i movimenti e lotti associati. Sei sicuro?"
    )
  ) {
    return;
  }

  try {
    const res = await fetch(`/api/prodotti/${id}`, {
      method: "DELETE",
    });

    const data = await res.json();

    if (!res.ok) {
      mostraAlert(
        "error",
        data.error || "Errore durante l'eliminazione",
        "prodotti"
      );
      return;
    }

    mostraAlert(
      "success",
      "✅ Prodotto e storico eliminati",
      "prodotti"
    );
    refreshAllData();
  } catch (err) {
    mostraAlert("error", "Errore di rete durante l'eliminazione", "prodotti");
  }
}

// ===== DATI (CARICO/SCARICO) =====
async function caricaDati() {
  try {
    const res = await fetch("/api/dati");
    dati = await res.json();
    renderDati();
  } catch (err) {
    console.error("Errore caricamento dati:", err);
    const tbody = document.getElementById("dati-body");
    tbody.innerHTML =
      '<tr><td colspan="9" class="empty-state" style="color: #ef4444;">⚠️ Errore nel caricamento dei dati</td></tr>';
  }
}

function renderDati() {
  const tbody = document.getElementById("dati-body");

  if (dati.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="9" class="empty-state">Nessun movimento presente</td></tr>';
  } else {
    tbody.innerHTML = dati
      .map((d) => {
        const dataMovimentoFormatted = formatDate(d.data_movimento);

        let prezzoUnitarioDisplay = "-";
        let prezzoTotaleDisplay = "-";
        let prezzoTotaleClass = "";
        let deleteButton = ""; 
        let fatturaDisplay = d.fattura_doc || "-";
        let fornitoreDisplay = d.fornitore_cliente_id || "-";

        if (d.tipo === "carico") {
          if (d.prezzo !== null) {
            prezzoUnitarioDisplay = `€ ${formatNumber(d.prezzo)}`;
          }
          if (d.prezzo_totale !== null) {
            prezzoTotaleDisplay = `€ ${formatNumber(d.prezzo_totale)}`;
            prezzoTotaleClass = "tipo-carico";
          }
          deleteButton = `<button class="btn btn-danger btn-small" onclick="eliminaDato(${d.id}, 'carico')">🗑️ Elimina</button>`;

        } else if (d.tipo === "scarico") {
          if (d.prezzo_unitario_scarico !== null) {
            prezzoUnitarioDisplay = `Ø € ${formatNumber(d.prezzo_unitario_scarico)}`;
          }

          if (d.prezzo_totale !== null) {
            const costoScarico = -Math.abs(d.prezzo_totale);
            prezzoTotaleDisplay = `€ ${formatNumber(costoScarico)}`;
            prezzoTotaleClass = "tipo-scarico";
          }
          deleteButton = `<button class="btn btn-danger btn-small" onclick="eliminaDato(${d.id}, 'scarico')">🗑️ Elimina</button>`;
          
          fatturaDisplay = "-";
          fornitoreDisplay = "-";
        }

        return `
            <tr>
              <td>${dataMovimentoFormatted}</td>
              <td><strong>${d.prodotto_nome}</strong></td>
              <td><span class="tipo-${d.tipo}">${d.tipo.toUpperCase()}</span></td>
              <td style="text-align: right;"><strong>${d.quantita}</strong></td>
              <td style="text-align: right;">${prezzoUnitarioDisplay}</td>
              <td style="text-align: right;" class="${prezzoTotaleClass}"><strong>${prezzoTotaleDisplay}</strong></td>
              <td style="text-align: center;">${fatturaDisplay}</td>
              <td style="text-align: center;">${fornitoreDisplay}</td>
              <td style="text-align: center;">
                <div class="actions">${deleteButton}</div>
              </td>
            </tr>
          `;
      })
      .join("");
  }

  document.getElementById("totale-dati").textContent = dati.length;
}

async function caricaValoreMagazzino() {
  try {
    const res = await fetch("/api/valore-magazzino");
    const data = await res.json();
    document.getElementById("valore-magazzino").textContent = formatNumber(data.valore_totale);
  } catch (err) {
    console.error("Errore caricamento valore:", err);
  }
}

function caricaSelectProdotti() {
  const select = document.getElementById("dato-prodotto");

  const prodottiOrdinati = [...prodotti].sort((a, b) =>
    a.nome.localeCompare(b.nome)
  );

  select.innerHTML =
    '<option value="">Seleziona prodotto...</option>' +
    prodottiOrdinati
      .map(
        (p) =>
          `<option value="${p.id}">${p.nome} (Giacenza: ${p.giacenza})</option>`
      )
      .join("");
}

async function aggiungiDato() {
  const prodotto_id = document.getElementById("dato-prodotto").value;
  const tipo = document.getElementById("dato-tipo").value;
  const data_movimento = document.getElementById("dato-data").value;
  const quantita = document.getElementById("dato-quantita").value;
  
  const prezzo = document.getElementById("dato-prezzo").value;
  
  const fattura_doc_raw = document.getElementById("dato-fattura").value;
  const fornitore_cliente_id_raw = document.getElementById("dato-fornitore").value;

  if (!tipo) {
    mostraAlert("error", "⚠️ Seleziona il tipo di operazione (Carico/Scarico)", "dati");
    return;
  }

  if (!prodotto_id) {
    mostraAlert("error", "⚠️ Seleziona un prodotto", "dati");
    return;
  }

  if (!data_movimento) {
    mostraAlert("error", "⚠️ Inserisci la data del movimento", "dati");
    return;
  }

  if (!quantita || quantita <= 0) {
    mostraAlert("error", "⚠️ Inserisci una quantità valida", "dati");
    return;
  }
  
  if (tipo === "carico") {
    const prezzoString = String(prezzo).trim();
    if (!prezzoString || prezzoString === "") {
      mostraAlert("error", "⚠️ Il prezzo è obbligatorio per il carico", "dati");
      return;
    }
    
    const prezzoNumerico = parseFloat(prezzoString.replace(",", "."));
    if (isNaN(prezzoNumerico) || prezzoNumerico <= 0) {
      mostraAlert("error", "⚠️ Il prezzo deve essere un numero valido maggiore di zero", "dati");
      return;
    }
    
    if (containsForbiddenChars(fattura_doc_raw)) {
      mostraAlert("error", "⚠️ La Fattura/Documento contiene caratteri non validi (rimuovi ', \", ;).", "dati");
      return;
    }
    
    if (containsForbiddenChars(fornitore_cliente_id_raw)) {
      mostraAlert("error", "⚠️ Il Fornitore/Cliente contiene caratteri non validi (rimuovi ', \", ;).", "dati");
      return;
    }
    
    const fattura_doc_sanitized = sanitizeInputText(fattura_doc_raw); 
    const fornitore_cliente_id_sanitized = sanitizeInputText(fornitore_cliente_id_raw); 
    
    if (!fattura_doc_sanitized) {
      mostraAlert("error", "⚠️ La fattura/documento è obbligatoria per il carico.", "dati");
      return;
    }
    if (!fornitore_cliente_id_sanitized) {
      mostraAlert("error", "⚠️ Il fornitore/cliente è obbligatorio per il carico.", "dati");
      return;
    }

    try {
        const res = await fetch("/api/dati", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                prodotto_id, 
                tipo, 
                quantita, 
                prezzo: prezzo,
                data_movimento,
                fattura_doc: fattura_doc_sanitized,
                fornitore_cliente_id: fornitore_cliente_id_sanitized
            }),
        });

        const data = await res.json();
        if (!res.ok) {
            mostraAlert("error", data.error, "dati");
            return;
        }

        const tipoSelect = document.getElementById("dato-tipo");
        tipoSelect.value = ""; 
        const defaultOption = tipoSelect.querySelector('option[value=""]');
        if (defaultOption) {
            defaultOption.selected = true;
        }
        
        document.getElementById("dato-prodotto").value = "";
        document.getElementById("dato-quantita").value = "";
        document.getElementById("dato-prezzo").value = "";
        document.getElementById("dato-fattura").value = "";
        document.getElementById("dato-fornitore").value = "";
        setInitialDate();
        toggleCaricoFields();
    
        mostraAlert("success", "✅ Movimento registrato con successo", "dati");
        await refreshAllData();
        
    } catch (err) {
        mostraAlert("error", "Errore durante l'aggiunta", "dati");
    }

  } else if (tipo === "scarico") {
    try {
        const res = await fetch("/api/dati", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                prodotto_id, 
                tipo, 
                quantita, 
                prezzo: null,
                data_movimento,
                fattura_doc: null,
                fornitore_cliente_id: null
            }),
        });
        
        const data = await res.json();
        if (!res.ok) {
            mostraAlert("error", data.error, "dati");
            return;
        }

        const tipoSelect = document.getElementById("dato-tipo");
        tipoSelect.value = ""; 
        const defaultOption = tipoSelect.querySelector('option[value=""]');
        if (defaultOption) {
            defaultOption.selected = true;
        }
        
        document.getElementById("dato-prodotto").value = "";
        document.getElementById("dato-quantita").value = "";
        document.getElementById("dato-prezzo").value = "";
        document.getElementById("dato-fattura").value = "";
        document.getElementById("dato-fornitore").value = "";
        setInitialDate();
        toggleCaricoFields();
    
        mostraAlert("success", "✅ Movimento registrato con successo", "dati");
        await refreshAllData();

    } catch (err) {
        mostraAlert("error", "Errore durante l'aggiunta", "dati");
    }
  }
}

async function eliminaDato(id, tipo) {
  let messaggioConferma;
  
  if (tipo === 'carico') {
      messaggioConferma = "⚠️ ATTENZIONE: Stai per eliminare un CARICO. L'eliminazione è consentita SOLO se il lotto non è stato utilizzato. Confermi?";
  } else if (tipo === 'scarico') {
      messaggioConferma = "⚠️ ATTENZIONE: Stai per annullare uno SCARICO. Questa operazione ripristinerà la quantità ai lotti. Confermi?";
  } else {
      messaggioConferma = "Sei sicuro di voler eliminare questo movimento?";
  }

  if (!confirm(messaggioConferma)) {
    return;
  }

  try {
    const res = await fetch(`/api/dati/${id}`, {
      method: "DELETE",
    });

    const data = await res.json();

    if (!res.ok) {
      mostraAlert(
        "error",
        data.error || "Errore durante l'eliminazione",
        "dati"
      );
      return;
    }

    mostraAlert(
      "success",
      data.message || "✅ Movimento eliminato con successo",
      "dati"
    );
    refreshAllData();
  } catch (err) {
    mostraAlert("error", "Errore di rete durante l'eliminazione", "dati");
  }
}

// ===== RIEPILOGO =====
async function caricaRiepilogo() {
  try {
    const res = await fetch("/api/riepilogo");
    const riepilogo = await res.json();
    riepilogo.sort((a, b) => a.nome.localeCompare(b.nome)); 
    renderRiepilogo(riepilogo);
  } catch (err) {
    console.error("Errore caricamento riepilogo:", err);
  }
}

function renderRiepilogo(riepilogo) {
  const tbody = document.getElementById("riepilogo-body");

  if (riepilogo.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="4" class="empty-state">Nessun prodotto in magazzino</td></tr>';
    document.getElementById("valore-magazzino-riepilogo").textContent = "0,00";
  } else {
    let totaleGenerale = 0;

    tbody.innerHTML = riepilogo
      .map((r) => {
        totaleGenerale += r.valore_totale;

        return `
            <tr>
              <td><strong>${r.nome}</strong></td>
              <td style="text-align: center;">
                <span class="giacenza ${r.giacenza > 0 ? "positiva" : "zero"}">
                  ${r.giacenza}
                </span>
              </td>
              <td style="text-align: right;">
                <strong>€ ${formatNumber(r.valore_totale)}</strong>
              </td>
              <td style="text-align: center;">
                <button class="btn btn-primary btn-small" onclick="mostraDettaglioLotti(${
                  r.id
                }, '${r.nome.replace(/'/g, "\\'")}')">
                  🔍 Lotti
                </button>
              </td>
            </tr>
          `;
      })
      .join("");

    document.getElementById("valore-magazzino-riepilogo").textContent =
      formatNumber(totaleGenerale);
  }
}

async function mostraDettaglioLotti(prodottoId, nomeProdotto) {
  prodottoDettaglio = prodottoId;
  document.getElementById("dettaglio-prodotto-nome").textContent = nomeProdotto;

  try {
    const res = await fetch(`/api/lotti/${prodottoId}`);
    const lotti = await res.json();
    renderDettaglioLotti(lotti);

    document
      .querySelectorAll(".section")
      .forEach((s) => s.classList.remove("active"));
    document
      .querySelectorAll(".tab")
      .forEach((t) => t.classList.remove("active"));
    document.getElementById("dettaglio-section").classList.add("active");

    history.replaceState(null, null, `#dettaglio`);
  } catch (err) {
    console.error("Errore caricamento lotti:", err);
  }
}

function renderDettaglioLotti(lotti) {
  const tbody = document.getElementById("dettaglio-body");

  if (lotti.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="6" class="empty-state">Nessun lotto disponibile</td></tr>';
  } else {
    tbody.innerHTML = lotti
      .map((l) => {
        const dataFormatted = formatDate(l.data_carico);
        const valoreLotto = l.quantita_rimanente * l.prezzo;
        const fatturaDisplay = l.fattura_doc || "-";
        const fornitoreDisplay = l.fornitore_cliente_id || "-";

        return `
            <tr>
              <td>${dataFormatted}</td>
              <td style="text-align: center;">${fatturaDisplay}</td>
              <td style="text-align: center;">${fornitoreDisplay}</td>
              <td style="text-align: right;">
                <span class="giacenza positiva">${l.quantita_rimanente}</span>
              </td>
              <td style="text-align: right;">€ ${formatNumber(l.prezzo)}</td>
              <td style="text-align: right;"><strong>€ ${formatNumber(valoreLotto)}</strong></td>
            </tr>
          `;
      })
      .join("");
  }

  document.getElementById("totale-lotti").textContent = lotti.length;
}

const tornaARiepilogo = () => switchTab("riepilogo");