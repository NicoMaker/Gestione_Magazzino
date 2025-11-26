let prodotti = [];
let dati = [];
let riepilogo = [];
let utenti = [];
let storicoGiacenza = []; // NUOVO
let storicoMovimenti = []; // NUOVO

let prodottoInModifica = null;
let utenteInModifica = null;
let prodottoDettaglioLotti = null; // Usato per il modale dettaglio lotti

// =========================================================================
// ⭐ FUNZIONI DI SICUREZZA, FORMATTAZIONE E UTILITY ⭐
// =========================================================================

// ⭐ CORREZIONE ERRORE SyntaxError: Range out of order in character class ⭐
function containsForbiddenChars(input) {
  if (typeof input !== "string") return false;
  // Ho spostato il trattino (-) alla fine per evitare l'errore
  const forbiddenRegex = /['";<>\\-]/; 
  return forbiddenRegex.test(input);
}

// FUNZIONE DI SANIFICAZIONE MASSIMA 
function sanitizeInputText(input) {
  if (typeof input !== "string") return "";
  return input.replace(/[^a-zA-Z0-9\s\-\\_.,]+/g, "").trim();
}

// Helper per formattare numeri come valuta italiana
function formatNumber(value) {
  if (value === null || typeof value === "undefined" || isNaN(value)) {
    return "0,00";
  }
  return value.toLocaleString("it-IT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// Helper per formattare data da YYYY-MM-DD a GG/MM/AAAA
function formatDate(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

// Helper per mostrare alert
function mostraAlert(type, message, section) {
  const container = document.getElementById(`${section}-alert`);
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

  container.innerHTML = `<div class="alert ${cssClass}">${icon} ${message}</div>`;
  setTimeout(() => {
    container.innerHTML = "";
  }, 5000);
}

// Imposta la data di oggi come default nel campo "data movimento"
function setInitialDate() {
  const today = new Date().toISOString().split("T")[0];
  const dateInput = document.getElementById("dato-data");
  if (dateInput) {
    dateInput.value = today;
  }
}

// NUOVO: Imposta la data di oggi come default nel campo "data storico"
function setInitialStoricoDate() {
    const today = new Date().toISOString().split("T")[0];
    const dateInput = document.getElementById("storico-data");
    
    // Imposta la data di oggi come default
    if (dateInput) {
        dateInput.value = today;
    }
    
    // Carica i dati con la data di oggi solo la prima volta che si apre il tab
    if (document.getElementById("storico-giacenza-body").innerHTML === "") {
        caricaDatiStorici(today);
    }
}


// =========================================================================
// 🔄 GESTIONE INTERFACCIA E REFRESH DATI (AGGIORNATO per coerenza)
// =========================================================================

function switchTab(tabId) {
  // Nasconde tutte le sezioni
  document.querySelectorAll(".section").forEach((section) => {
    section.classList.remove("active");
  });
  // Rimuove la classe 'active' da tutti i tab button
  document.querySelectorAll(".tabs button").forEach((tab) => {
    tab.classList.remove("active");
  });

  // Mostra la sezione selezionata e attiva il bottone
  document.getElementById(`${tabId}-section`).classList.add("active");
  document
    .querySelector(`.tabs button[onclick="switchTab('${tabId}')"]`)
    .classList.add("active");

  // Ricarica i dati specifici per il tab
  if (tabId === "prodotti") caricaProdotti();
  if (tabId === "dati") caricaDati();
  if (tabId === "riepilogo") caricaRiepilogo(true); // Forzo il ridisegno del riepilogo
  if (tabId === "storico") setInitialStoricoDate(); // NUOVO
  if (tabId === "utenti") caricaUtenti();
}

// AGGIORNATO: Forziamo il ricarico di Prodotti e Riepilogo per l'aggiornamento in tempo reale
async function refreshAllData() {
  await caricaProdotti(true); // Carica e ridisegna SEMPRE la tabella Prodotti
  caricaSelectProdotti(); // Aggiorna la select Prodotti (che ha i dati di giacenza)

  // Ricarica la tabella Movimenti SOLO se è il tab attivo
  if (document.getElementById("dati-section").classList.contains("active")) {
    await caricaDati(); 
  }
  
  // Ricarica Riepilogo e Valore Magazzino per l'aggiornamento immediato
  await caricaRiepilogo(true); 
  
  // Ricarica lo storico se il tab è attivo (per coerenza)
  if (document.getElementById("storico-section").classList.contains("active")) {
    caricaDatiStorici(); 
  }
}

// =========================================================================
// 🏍️ GESTIONE PRODOTTI
// =========================================================================

async function caricaProdotti(drawTable = true) {
  try {
    const res = await fetch("/api/prodotti");
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Errore nel caricamento prodotti");
    prodotti = data;
    if (drawTable) {
      disegnaTabellaProdotti();
    }
  } catch (err) {
    console.error(err);
    mostraAlert("error", "Errore nel caricamento prodotti: " + err.message, "prodotti");
  }
}

// AGGIORNATO: Rimosso ID dalla visualizzazione
function disegnaTabellaProdotti() {
  const tbody = document.getElementById("prodotti-body");
  tbody.innerHTML = prodotti
    .map(
      (p) => `
      <tr>
        <td>${p.nome}</td>
        <td style="text-align:right">${p.giacenza}</td>
        <td class="actions">
          <button class="btn btn-secondary" onclick="apriModalModificaProdotto(${p.id}, '${p.nome}')">Modifica</button>
          <button class="btn btn-danger" onclick="eliminaProdotto(${p.id}, '${p.nome}', ${p.giacenza})">Elimina</button>
        </td>
      </tr>
    `
    )
    .join("");
}

// ... (aggiungiProdotto, apriModalModificaProdotto, chiudiModalProdotto, salvaModificaProdotto, eliminaProdotto) ...

async function aggiungiProdotto() {
  const nomeInput = document.getElementById("prodotto-nome");
  const nome = nomeInput.value;
  const nomeSanificato = sanitizeInputText(nome);

  if (!nomeSanificato) {
    mostraAlert("error", "Il nome del prodotto è obbligatorio.", "prodotti");
    return;
  }

  if (containsForbiddenChars(nome)) {
    mostraAlert("error", "Caratteri non validi rilevati nel nome.", "prodotti");
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
      mostraAlert("error", data.error || "Errore aggiunta prodotto", "prodotti");
      return;
    }

    mostraAlert("success", `Prodotto "${data.nome}" aggiunto con successo!`, "prodotti");
    nomeInput.value = "";
    await refreshAllData();
  } catch (err) {
    console.error(err);
    mostraAlert("error", "Errore di rete durante l'aggiunta", "prodotti");
  }
}

function apriModalModificaProdotto(id, nome) {
  prodottoInModifica = id;
  document.getElementById("modifica-prodotto-id").textContent = id;
  document.getElementById("modifica-prodotto-nome").value = nome;
  document.getElementById("modal-modifica-prodotto").style.display = "flex";
}

function chiudiModalProdotto() {
  document.getElementById("modal-modifica-prodotto").style.display = "none";
  prodottoInModifica = null;
}

async function salvaModificaProdotto() {
  const nuovoNome = document.getElementById("modifica-prodotto-nome").value;
  const nomeSanificato = sanitizeInputText(nuovoNome);

  if (!nomeSanificato) {
    mostraAlert("error", "Il nome del prodotto è obbligatorio.", "prodotti");
    return;
  }
  if (containsForbiddenChars(nuovoNome)) {
    mostraAlert("error", "Caratteri non validi rilevati nel nome.", "prodotti");
    return;
  }

  try {
    const res = await fetch(`/api/prodotti/${prodottoInModifica}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome: nomeSanificato }),
    });

    const data = await res.json();
    if (!res.ok) {
      mostraAlert("error", data.error || "Errore aggiornamento prodotto", "prodotti");
      return;
    }

    mostraAlert("success", "Prodotto aggiornato con successo", "prodotti");
    chiudiModalProdotto();
    await refreshAllData();
  } catch (err) {
    console.error(err);
    mostraAlert("error", "Errore di rete durante l'aggiornamento", "prodotti");
  }
}

async function eliminaProdotto(id, nome, giacenza) {
  if (giacenza > 0) {
    mostraAlert("error", `Impossibile eliminare "${nome}": la giacenza è ${giacenza}.`, "prodotti");
    return;
  }
  if (!confirm(`Sei sicuro di voler eliminare il prodotto "${nome}"? Saranno eliminati anche tutti i movimenti (dati) e lotti associati.`)) return;

  try {
    const res = await fetch(`/api/prodotti/${id}`, {
      method: "DELETE",
    });

    const data = await res.json();
    if (!res.ok) {
      mostraAlert("error", data.error || "Errore eliminazione prodotto", "prodotti");
      return;
    }

    mostraAlert("success", data.message || `Prodotto "${nome}" eliminato con successo.`, "prodotti");
    await refreshAllData();
  } catch (err) {
    console.error(err);
    mostraAlert("error", "Errore di rete durante l'eliminazione", "prodotti");
  }
}


// =========================================================================
// 🚛 GESTIONE MOVIMENTI (DATI)
// =========================================================================

function caricaSelectProdotti() {
  const select = document.getElementById("dato-prodotto");
  // Ordina i prodotti per nome per una migliore UX
  const prodottiOrdinati = [...prodotti].sort((a, b) => a.nome.localeCompare(b.nome));

  select.innerHTML =
    '<option value="">Seleziona prodotto...</option>' +
    prodottiOrdinati
      .map((p) => `<option value="${p.id}">${p.nome} (Giacenza ${p.giacenza})</option>`)
      .join("");
}

function toggleCaricoFields() {
  const tipo = document.getElementById("dato-tipo").value;
  const prezzoGroup = document.getElementById("prezzo-group");
  const fatturaGroup = document.getElementById("fattura-group");
  const fornitoreGroup = document.getElementById("fornitore-group");

  // Riferimenti agli input
  const prezzoInput = document.getElementById("dato-prezzo");
  const fatturaInput = document.getElementById("dato-fattura");
  const fornitoreInput = document.getElementById("dato-fornitore");
  
  // Rimuove tutti i "required" di default
  prezzoInput.required = false;
  fatturaInput.required = false;
  fornitoreInput.required = false;

  if (tipo === "carico") {
    prezzoGroup.classList.remove("hidden");
    fatturaGroup.classList.remove("hidden");
    fornitoreGroup.classList.remove("hidden");
    
    // Imposta i "required" per il carico
    prezzoInput.required = true;
    fatturaInput.required = true;
    fornitoreInput.required = true;

  } else {
    prezzoGroup.classList.add("hidden");
    fatturaGroup.classList.add("hidden");
    fornitoreGroup.classList.add("hidden");
  }
}


async function caricaDati() {
  try {
    const res = await fetch("/api/dati");
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Errore nel caricamento movimenti");
    dati = data;
    disegnaTabellaDati();
  } catch (err) {
    console.error(err);
    mostraAlert("error", "Errore nel caricamento movimenti: " + err.message, "dati");
  }
}

// AGGIORNATO: Rimosso ID dalla visualizzazione
function disegnaTabellaDati() {
  const tbody = document.getElementById("dati-body");
  tbody.innerHTML = dati
    .map((d) => {
      let tipoClass = d.tipo === "carico" ? "text-success" : "text-danger";
      let prezzoCol = "—";
      let costoTotaleCol = "—";

      if (d.tipo === "carico" && d.prezzo !== null) {
        prezzoCol = `€ ${formatNumber(d.prezzo)}`;
        costoTotaleCol = `€ ${formatNumber(d.prezzo_totale)}`;
      } else if (d.tipo === "scarico" && d.prezzo_unitario_scarico !== null) {
        prezzoCol = `€ ${formatNumber(d.prezzo_unitario_scarico)} (FIFO)`;
        costoTotaleCol = `€ ${formatNumber(d.prezzo_totale)}`;
      }

      return `
      <tr>
        <td>${formatDate(d.data_movimento)}</td>
        <td>${d.prodotto_nome}</td>
        <td class="${tipoClass}">${d.tipo.toUpperCase()}</td>
        <td style="text-align:right">${d.quantita}</td>
        <td style="text-align:right">${prezzoCol}</td>
        <td style="text-align:right">${costoTotaleCol}</td>
        <td>${d.fattura_doc || "—"}</td>
        <td>${d.fornitore_cliente_id || "—"}</td>
        <td class="actions">
          <button class="btn btn-danger btn-sm" onclick="eliminaDato(${d.id}, '${d.tipo}', '${d.prodotto_nome}', ${d.quantita})">Annulla</button>
        </td>
      </tr>
    `;
    })
    .join("");
}

async function aggiungiDato() {
  const prodottoId = document.getElementById("dato-prodotto").value;
  const tipo = document.getElementById("dato-tipo").value;
  const dataMovimento = document.getElementById("dato-data").value;
  const quantitaRaw = document.getElementById("dato-quantita").value;
  const prezzoRaw = document.getElementById("dato-prezzo").value;
  const fatturaDocRaw = document.getElementById("dato-fattura").value;
  const fornitoreClienteIdRaw = document.getElementById("dato-fornitore").value;

  // 1. VALIDAZIONE DI BASE (Obbligatori per tutti i movimenti)
  if (!prodottoId) {
    mostraAlert("error", "Seleziona un Prodotto", "dati");
    return;
  }
  if (!tipo) {
    mostraAlert("error", "Seleziona il Tipo di operazione (Carico/Scarico)", "dati");
    return;
  }
  if (!dataMovimento) {
    mostraAlert("error", "Inserisci la Data del movimento (YYYY-MM-DD)", "dati");
    return;
  }

  const quantita = parseInt(quantitaRaw);
  if (isNaN(quantita) || quantita <= 0) {
    mostraAlert("error", "La Quantità deve essere un numero intero positivo.", "dati");
    return;
  }

  // 2. VALIDAZIONE E DATI SPECIFICI PER CARICO
  let prezzoSanificato = null;
  let fatturaDoc = null;
  let fornitoreClienteId = null;

  if (tipo === "carico") {
    // Conversione prezzo: accetta virgola o punto decimale
    const prezzoString = String(prezzoRaw).replace(",", ".");
    prezzoSanificato = parseFloat(prezzoString);

    if (isNaN(prezzoSanificato) || prezzoSanificato <= 0) {
      mostraAlert("error", "Per il Carico, Prezzo Unitario è obbligatorio e deve essere > 0.", "dati");
      return;
    }

    fatturaDoc = sanitizeInputText(fatturaDocRaw);
    fornitoreClienteId = sanitizeInputText(fornitoreClienteIdRaw);

    if (!fatturaDoc) {
      mostraAlert("error", "Per il Carico, il campo Fattura/Documento è obbligatorio.", "dati");
      return;
    }
    if (!fornitoreClienteId) {
      mostraAlert("error", "Per il Carico, il campo Fornitore è obbligatorio.", "dati");
      return;
    }
  }

  // 3. COSTRUZIONE DEL BODY E INVIO
  const bodyData = {
    // I nomi delle chiavi devono corrispondere al backend (dati.js)
    prodotto_id: prodottoId,
    tipo: tipo,
    quantita: quantita,
    data_movimento: dataMovimento,

    // Campi aggiuntivi (solo per Carico sono usati)
    prezzo: prezzoSanificato, // Sarà null per scarico
    fattura_doc: fatturaDoc || sanitizeInputText(fatturaDocRaw), 
    fornitore_cliente_id: fornitoreClienteId || sanitizeInputText(fornitoreClienteIdRaw), 
  };

  try {
    const res = await fetch("/api/dati", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bodyData),
    });

    const data = await res.json();
    if (!res.ok) {
      // Questo gestisce l'errore del backend (come quello che avevi)
      mostraAlert("error", data.error || `Errore durante l'aggiunta del movimento (${tipo})`, "dati");
      return;
    }

    // Pulizia Form e Ricarica Dati
    document.getElementById("dato-tipo").value = "scarico"; // Reset a scarico di default
    document.getElementById("dato-prodotto").value = "";
    document.getElementById("dato-quantita").value = "";
    document.getElementById("dato-prezzo").value = "";
    document.getElementById("dato-fattura").value = "";
    document.getElementById("dato-fornitore").value = "";
    setInitialDate();
    toggleCaricoFields();
    mostraAlert("success", `Movimento di ${tipo.toUpperCase()} registrato con successo`, "dati");
    await refreshAllData(); // AGGIORNATO: Aggiorna i dati per i 3 tab (inclusi prodotti e riepilogo)
  } catch (err) {
    console.error("Errore durante l'aggiunta", err);
    mostraAlert("error", "Errore di rete durante l'aggiunta", "dati");
  }
}

async function eliminaDato(id, tipo, nomeProdotto, quantita) {
  const azione = tipo === 'carico' ? 'annullare il carico' : 'annullare lo scarico';
  const messaggio = tipo === 'carico' 
    ? `Sei sicuro di voler ${azione} del prodotto "${nomeProdotto}" (Qtà: ${quantita})? Questo è possibile solo se il lotto non è stato scaricato.`
    : `Sei sicuro di voler ${azione} del prodotto "${nomeProdotto}" (Qtà: ${quantita})? Questo ripristinerà la merce nei lotti originali (logica inversa FIFO).`;

  if (!confirm(messaggio)) return;

  try {
    const res = await fetch(`/api/dati/${id}`, {
      method: "DELETE",
    });

    const data = await res.json();
    if (!res.ok) {
      mostraAlert("error", data.error || `Errore durante l'annullamento del ${tipo}`, "dati");
      return;
    }

    mostraAlert("success", data.message || `${tipo.toUpperCase()} annullato con successo.`, "dati");
    await refreshAllData(); // AGGIORNATO: Aggiorna i dati per i 3 tab (inclusi prodotti e riepilogo)
  } catch (err) {
    console.error(err);
    mostraAlert("error", "Errore di rete durante l'annullamento", "dati");
  }
}

// =========================================================================
// 📊 GESTIONE RIEPILOGO
// =========================================================================

async function caricaRiepilogo(drawTable = false) {
  try {
    const res = await fetch("/api/riepilogo");
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Errore nel caricamento riepilogo");
    riepilogo = data;
    // Disegna la tabella solo se il tab è attivo o se drawTable è forzato da refreshAllData()
    if (document.getElementById("riepilogo-section").classList.contains("active") || drawTable) {
      disegnaTabellaRiepilogo();
    }
    await caricaValoreMagazzino();
  } catch (err) {
    console.error(err);
    mostraAlert("error", "Errore nel caricamento riepilogo: " + err.message, "riepilogo");
  }
}

async function caricaValoreMagazzino() {
    try {
        const res = await fetch("/api/valore-magazzino");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Errore nel calcolo valore");
        
        document.getElementById("valore-magazzino").textContent = `€ ${formatNumber(data.valore_totale)}`;
    } catch (err) {
        document.getElementById("valore-magazzino").textContent = "Errore";
    }
}


// AGGIORNATO: Rimosso ID dalla visualizzazione
function disegnaTabellaRiepilogo() {
  const tbody = document.getElementById("riepilogo-body");
  tbody.innerHTML = riepilogo
    .map(
      (r) => `
      <tr>
        <td>${r.nome}</td>
        <td style="text-align:right">${r.giacenza}</td>
        <td style="text-align:right" class="text-success">€ ${formatNumber(r.valore_totale)}</td>
        <td class="actions">
          ${r.giacenza > 0 ? `<button class="btn btn-secondary btn-sm" onclick="apriModalDettaglioLotti(${r.id}, '${r.nome}')">Dettaglio Lotti</button>` : "—"}
        </td>
      </tr>
    `
    )
    .join("");
}

function apriModalDettaglioLotti(prodottoId, nomeProdotto) {
  prodottoDettaglioLotti = prodottoId;
  document.getElementById("dettaglio-prodotto-nome").textContent = `Dettaglio Lotti: ${nomeProdotto}`;
  caricaDettaglioLotti(prodottoId);
  document.getElementById("modal-dettaglio-lotti").style.display = "flex";
}

function chiudiModalDettaglioLotti() {
  document.getElementById("modal-dettaglio-lotti").style.display = "none";
  document.getElementById("lotti-body").innerHTML = ""; // Pulisce i dati alal chiusura
  prodottoDettaglioLotti = null;
}

async function caricaDettaglioLotti(prodottoId) {
    const tbody = document.getElementById("lotti-body");
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center">Caricamento lotti...</td></tr>';
    
    try {
        const res = await fetch(`/api/riepilogo/${prodottoId}`);
        const lotti = await res.json();
        
        if (!res.ok) throw new Error(lotti.error || "Errore nel caricamento dei lotti");

        if (lotti.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center">Nessun lotto attivo (Giacenza zero).</td></tr>';
            return;
        }

        tbody.innerHTML = lotti
            .map(l => `
                <tr>
                    <td>${l.id}</td>
                    <td>${formatDate(l.data_carico)}</td>
                    <td style="text-align:right">${l.quantita_rimanente}</td>
                    <td style="text-align:right">€ ${formatNumber(l.prezzo)}</td>
                </tr>
            `)
            .join('');

    } catch (err) {
        console.error(err);
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center" class="text-danger">Errore: ${err.message}</td></tr>`;
    }
}

// =========================================================================
// 🏛️ GESTIONE STORICO (NUOVA SEZIONE)
// =========================================================================

async function caricaDatiStorici(initialDate = null) {
  const dataInput = document.getElementById("storico-data");
  // Prendo la data dal parametro se specificato, altrimenti dal campo input
  const dataSelezionata = initialDate || dataInput.value;

  if (!dataSelezionata) {
    mostraAlert("error", "Seleziona una data per visualizzare lo storico.", "storico");
    return;
  }
  
  // Aggiorna l'intestazione
  const dataFormatted = formatDate(dataSelezionata) || "N/D";
  document.getElementById("storico-display-data").textContent = dataFormatted;
  document.getElementById("storico-movimenti-data").textContent = dataFormatted;

  // Visualizzazione loading
  document.getElementById("storico-giacenza-body").innerHTML = '<tr><td colspan="2" style="text-align:center">Caricamento Giacenza...</td></tr>';
  document.getElementById("storico-dati-body").innerHTML = '<tr><td colspan="8" style="text-align:center">Caricamento Movimenti...</td></tr>';


  try {
    // 1. Carica Giacenza Netta Storica (API /api/storico/giacenza)
    const resGiacenza = await fetch(`/api/storico/giacenza?data=${dataSelezionata}`);
    const dataGiacenza = await resGiacenza.json();
    if (!resGiacenza.ok) throw new Error(dataGiacenza.error || "Errore caricamento giacenza storica");
    storicoGiacenza = dataGiacenza;
    disegnaTabellaStoricoGiacenza();


    // 2. Carica Movimenti Storici (API /api/dati/storico)
    const resMovimenti = await fetch(`/api/dati/storico?data=${dataSelezionata}`);
    const dataMovimenti = await resMovimenti.json();
    if (!resMovimenti.ok) throw new Error(dataMovimenti.error || "Errore caricamento movimenti storici");
    storicoMovimenti = dataMovimenti;
    disegnaTabellaStoricoMovimenti();


    mostraAlert("success", `Dati storici aggiornati al ${dataFormatted}`, "storico");

  } catch (err) {
    console.error(err);
    mostraAlert("error", "Errore nel caricamento dati storici: " + err.message, "storico");
    document.getElementById("storico-giacenza-body").innerHTML = '<tr><td colspan="2" style="text-align:center">Errore nel caricamento dei dati.</td></tr>';
    document.getElementById("storico-dati-body").innerHTML = '<tr><td colspan="8" style="text-align:center">Errore nel caricamento dei dati.</td></tr>';
  }
}

// NUOVA: Disegna Tabella Giacenza Storica
function disegnaTabellaStoricoGiacenza() {
  const tbody = document.getElementById("storico-giacenza-body");
  if (storicoGiacenza.length === 0) {
    tbody.innerHTML = '<tr><td colspan="2" style="text-align:center">Nessuna giacenza netta trovata alla data.</td></tr>';
    return;
  }
  
  tbody.innerHTML = storicoGiacenza
    .map(
      (p) => `
      <tr>
        <td>${p.nome}</td>
        <td style="text-align:right">${p.giacenza_netta}</td>
      </tr>
    `
    )
    .join("");
}

// NUOVA: Disegna Tabella Movimenti Storici (Simile a disegnaTabellaDati)
function disegnaTabellaStoricoMovimenti() {
  const tbody = document.getElementById("storico-dati-body");
  if (storicoMovimenti.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center">Nessun movimento trovato fino alla data selezionata.</td></tr>';
    return;
  }
  
  tbody.innerHTML = storicoMovimenti
    .map((d) => {
      let tipoClass = d.tipo === "carico" ? "text-success" : "text-danger";
      let prezzoCol = "—";
      let costoTotaleCol = "—";

      // Mostriamo i dati di carico o il costo totale del movimento scarico
      if (d.tipo === "carico" && d.prezzo !== null) {
        prezzoCol = `€ ${formatNumber(d.prezzo)}`;
        costoTotaleCol = `€ ${formatNumber(d.prezzo_totale)}`;
      } else if (d.tipo === "scarico" && d.prezzo_unitario_scarico !== null) {
        prezzoCol = `€ ${formatNumber(d.prezzo_unitario_scarico)} (Storico)`;
        costoTotaleCol = `€ ${formatNumber(d.prezzo_totale)}`;
      }

      return `
      <tr>
        <td>${formatDate(d.data_movimento)}</td>
        <td>${d.prodotto_nome}</td>
        <td class="${tipoClass}">${d.tipo.toUpperCase()}</td>
        <td style="text-align:right">${d.quantita}</td>
        <td style="text-align:right">${prezzoCol}</td>
        <td style="text-align:right">${costoTotaleCol}</td>
        <td>${d.fattura_doc || "—"}</td>
        <td>${d.fornitore_cliente_id || "—"}</td>
      </tr>
    `;
    })
    .join("");
}

// =========================================================================
// 👥 GESTIONE UTENTI
// =========================================================================

async function caricaUtenti() {
  try {
    const res = await fetch("/api/utenti");
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Errore nel caricamento utenti");
    utenti = data;
    disegnaTabellaUtenti();
  } catch (err) {
    console.error(err);
    mostraAlert("error", "Errore nel caricamento utenti: " + err.message, "utenti");
  }
}

// AGGIORNATO: Rimosso ID dalla visualizzazione
function disegnaTabellaUtenti() {
  const tbody = document.getElementById("utenti-body");
  tbody.innerHTML = utenti
    .map(
      (u) => `
      <tr>
        <td>${u.username}</td>
        <td class="actions">
          <button class="btn btn-secondary" onclick="apriModalModificaUtente(${u.id}, '${u.username}')">Modifica</button>
          ${
            utenti.length > 1 // Non permette l'eliminazione se è l'unico utente
              ? `<button class="btn btn-danger" onclick="eliminaUtente(${u.id}, '${u.username}')">Elimina</button>`
              : '<button class="btn btn-danger" disabled title="Impossibile eliminare l\'unico utente">Elimina</button>'
          }
        </td>
      </tr>
    `
    )
    .join("");
}

async function aggiungiUtente() {
  const username = document.getElementById("nuovo-username").value;
  const password = document.getElementById("nuova-password").value;
  const usernameSanificato = sanitizeInputText(username);

  if (!usernameSanificato || !password) {
    mostraAlert("error", "Username e Password sono obbligatori.", "utenti");
    return;
  }
  if (containsForbiddenChars(username)) {
    mostraAlert("error", "Caratteri non validi nell'Username.", "utenti");
    return;
  }
  if (password.length < 8) {
    mostraAlert("error", "La Password deve contenere almeno 8 caratteri.", "utenti");
    return;
  }

  try {
    const res = await fetch("/api/utenti", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: usernameSanificato, password }),
    });

    const data = await res.json();
    if (!res.ok) {
      mostraAlert("error", data.error || "Errore aggiunta utente", "utenti");
      return;
    }

    mostraAlert("success", `Utente "${data.username}" creato con successo!`, "utenti");
    document.getElementById("nuovo-username").value = "";
    document.getElementById("nuova-password").value = "";
    caricaUtenti();
  } catch (err) {
    console.error(err);
    mostraAlert("error", "Errore di rete durante l'aggiunta", "utenti");
  }
}

function apriModalModificaUtente(id, username) {
  utenteInModifica = id;
  document.getElementById("modifica-utente-id").textContent = id;
  document.getElementById("modifica-username").value = username;
  document.getElementById("modifica-password").value = "";
  document.getElementById("modal-modifica-utente").style.display = "flex";
}

function chiudiModalUtente() {
  document.getElementById("modal-modifica-utente").style.display = "none";
  utenteInModifica = null;
}

async function salvaModificaUtente() {
  const nuovoUsername = document.getElementById("modifica-username").value;
  const nuovaPassword = document.getElementById("modifica-password").value;
  const usernameSanificato = sanitizeInputText(nuovoUsername);

  if (!usernameSanificato) {
    mostraAlert("error", "L'Username è obbligatorio.", "utenti");
    return;
  }
  if (containsForbiddenChars(nuovoUsername)) {
    mostraAlert("error", "Caratteri non validi nell'Username.", "utenti");
    return;
  }
  if (nuovaPassword && nuovaPassword.trim().length < 8) {
    mostraAlert("error", "La nuova Password deve contenere almeno 8 caratteri.", "utenti");
    return;
  }

  try {
    const body = { username: usernameSanificato };
    if (nuovaPassword && nuovaPassword.trim() !== "") {
      body.password = nuovaPassword;
    }

    const res = await fetch(`/api/utenti/${utenteInModifica}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (!res.ok) {
      mostraAlert(
        "error",
        data.error || "Errore aggiornamento utente",
        "utenti"
      );
      return;
    }

    mostraAlert("success", "Utente aggiornato con successo", "utenti");
    chiudiModalUtente();
    caricaUtenti();
  } catch (err) {
    console.error(err);
    mostraAlert("error", "Errore di rete durante l'aggiornamento", "utenti");
  }
}

async function eliminaUtente(id, username) {
  if (utenti.length <= 1) {
    mostraAlert("error", "Impossibile eliminare: devi lasciare almeno un utente amministratore.", "utenti");
    return;
  }
  if (!confirm(`Sei sicuro di voler eliminare l'utente "${username}"?`)) return;

  try {
    const res = await fetch(`/api/utenti/${id}`, {
      method: "DELETE",
    });

    const data = await res.json();
    if (!res.ok) {
      mostraAlert("error", data.error || "Errore eliminazione utente", "utenti");
      return;
    }

    mostraAlert("success", `Utente "${username}" eliminato con successo.`, "utenti");
    caricaUtenti();
  } catch (err) {
    console.error(err);
    mostraAlert("error", "Errore di rete durante l'eliminazione", "utenti");
  }
}

// =========================================================================
// 🚀 INIZIALIZZAZIONE E LOGOUT
// =========================================================================

function logout() {
    localStorage.removeItem("isLoggedIn"); 
    localStorage.removeItem("username"); 
    window.location.href = "/index.html";
}

// Funzione di setup iniziale
document.addEventListener("DOMContentLoaded", () => {
    // 1. Verifica login (semplice check per impedire accesso diretto a home.html)
    if (localStorage.getItem("isLoggedIn") !== "true") {
         window.location.href = "/index.html";
         return;
    }
    
    // 2. Imposta l'username in header
    const loggedInUsername = localStorage.getItem("username");
    if(loggedInUsername) {
        document.getElementById("user-display").textContent = `Utente: ${loggedInUsername}`;
    }

    // 3. Imposta la data di oggi e il tipo di movimento di default
    setInitialDate();
    
    // 4. Imposta il campo per i movimenti a 'scarico' di default e nasconde i campi carico
    document.getElementById("dato-tipo").value = "scarico";
    toggleCaricoFields();
    
    // 5. Carica tutti i dati iniziali (inizia con Prodotti attivo)
    refreshAllData(); 
});