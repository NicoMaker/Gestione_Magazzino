let prodotti = [];
let dati = [];
let prodottoInModifica = null;
let prodottoDettaglio = null;

// Funzione helper per formattare i numeri come valuta italiana (virgola come separatore decimale)
function formatNumber(value) {
  if (value === null || typeof value === 'undefined' || isNaN(value)) {
    return '0,00';
  }
  // Usa 'it-IT' per il formato europeo (virgola come separatore decimale)
  return value.toLocaleString('it-IT', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  });
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
  checkUrlHashAndSwitch();
  togglePrezzo();
});

// Switch tra tabs e aggiorna l'URL hash
function switchTab(tab) {
  if (window.location.hash !== `#${tab}`) {
    history.replaceState(null, null, `#${tab}`);
  }

  forceSwitchTab(tab);
}

// Toggle campo prezzo
function togglePrezzo() {
  const tipo = document.getElementById("dato-tipo").value;
  const prezzoGroup = document.getElementById("prezzo-group");
  const prezzoInput = document.getElementById("dato-prezzo");

  if (tipo === "scarico") {
    prezzoGroup.classList.add("hidden");
    prezzoInput.value = "";
    prezzoInput.removeAttribute("required");
  } else {
    prezzoGroup.classList.remove("hidden");
    prezzoInput.setAttribute("required", "required");
  }
}

// Mostra alert
function mostraAlert(tipo, messaggio, sezione) {
  const alertDiv = document.getElementById(`${sezione}-alert`);
  alertDiv.innerHTML = `<div class="alert alert-${tipo}">${messaggio}</div>`;
  setTimeout(() => (alertDiv.innerHTML = ""), 3000);
}

// ===== PRODOTTI (CRUD) =====
async function caricaProdotti() {
  try {
    const res = await fetch("/api/prodotti");
    prodotti = await res.json();
    prodotti.sort((a, b) => a.nome.localeCompare(b.nome)); // Ordina i prodotti per la tabella
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
            <td style="text-align: center;" class="giacenza ${
              p.giacenza > 0 ? "positiva" : "zero"
            }">
              ${p.giacenza}
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

  // Calcolo e aggiornamento giacenza totale
  const giacenzaTotale = prodotti.reduce((sum, p) => sum + p.giacenza, 0);
  document.getElementById("giacenza-totale-magazzino").textContent =
    giacenzaTotale;
}

async function aggiungiProdotto() {
  const input = document.getElementById("nuovo-prodotto");
  const nome = input.value.trim();

  if (!nome) {
    mostraAlert("error", "Inserisci il nome del prodotto", "prodotti");
    return;
  }

  try {
    const res = await fetch("/api/prodotti", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome }),
    });

    const data = await res.json();

    if (!res.ok) {
      mostraAlert("error", data.error, "prodotti");
      return;
    }

    input.value = "";
    mostraAlert("success", "Prodotto aggiunto con successo", "prodotti");
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
  const nuovoNome = document.getElementById("modifica-nome").value.trim();

  if (!nuovoNome) {
    alert("Inserisci un nome valido");
    return;
  }

  try {
    const res = await fetch(`/api/prodotti/${prodottoInModifica}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome: nuovoNome }),
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error);
      return;
    }

    chiudiModal();
    mostraAlert("success", "Nome prodotto modificato con successo", "prodotti");
    refreshAllData();
  } catch (err) {
    alert("Errore durante la modifica");
  }
}

async function eliminaProdotto(id) {
  if (
    !confirm(
      "ATTENZIONE: L'eliminazione è consentita SOLO se la giacenza è zero. Se procedi, verranno cancellati PERMANENTEMENTE tutti i movimenti e lotti associati. Sei sicuro di voler procedere?"
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
      "Prodotto e tutti i suoi dati storici eliminati con successo",
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
      '<tr><td colspan="7" class="empty-state" style="color: #e74c3c;">Errore nel caricamento dei dati dal server.</td></tr>';
  }
}

function renderDati() {
  const tbody = document.getElementById("dati-body");

  if (dati.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="7" class="empty-state">Nessun movimento presente</td></tr>';
  } else {
    tbody.innerHTML = dati
      .map((d) => {
        const dataFormatted = new Date(d.data).toLocaleString("it-IT");

        let prezzoUnitarioDisplay = "-";
        let prezzoTotaleDisplay = "-";
        let prezzoTotaleClass = "";
        let deleteButton = ""; 

        if (d.tipo === "carico") {
          if (d.prezzo !== null) {
            // USO formatNumber
            prezzoUnitarioDisplay = `€ ${formatNumber(d.prezzo)}`;
          }
          if (d.prezzo_totale !== null) {
            // USO formatNumber
            prezzoTotaleDisplay = `€ ${formatNumber(d.prezzo_totale)}`;
            prezzoTotaleClass = "tipo-carico";
          }
          // Pulsante di eliminazione per i CARICHI
          deleteButton = `<button class="btn btn-danger btn-small" onclick="eliminaDato(${d.id}, 'carico')">🗑️ Elimina</button>`;

        } else if (d.tipo === "scarico") {
          if (d.prezzo_unitario_scarico !== null) {
            // USO formatNumber
            prezzoUnitarioDisplay = `Ø € ${formatNumber(d.prezzo_unitario_scarico)}`;
          }

          if (d.prezzo_totale !== null) {
            const costoScarico = -Math.abs(d.prezzo_totale);
            // USO formatNumber
            prezzoTotaleDisplay = `€ ${formatNumber(costoScarico)}`;
            prezzoTotaleClass = "tipo-scarico";
          }
           // Pulsante di eliminazione per gli SCARICHI
          deleteButton = `<button class="btn btn-danger btn-small" onclick="eliminaDato(${d.id}, 'scarico')">🗑️ Elimina</button>`;
        }

        return `
            <tr>
              <td>${dataFormatted}</td>
              <td><strong>${d.prodotto_nome}</strong></td>
              <td><span class="tipo-${
                d.tipo
              }">${d.tipo.toUpperCase()}</span></td>
              <td style="text-align: right;">${d.quantita}</td>
              <td style="text-align: right;">${prezzoUnitarioDisplay}</td>
              <td style="text-align: right;" class="${prezzoTotaleClass}"><strong>${prezzoTotaleDisplay}</strong></td>
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
    // USO formatNumber
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
  const quantita = document.getElementById("dato-quantita").value;
  const prezzo =
    tipo === "carico" ? document.getElementById("dato-prezzo").value : null;

  if (!prodotto_id || !quantita) {
    mostraAlert("error", "Compila prodotto e quantità", "dati");
    return;
  }
  
  // Controllo validità prezzo anche con la virgola (il server farà il parsing)
  if (tipo === "carico") {
    const prezzoString = String(prezzo).trim();
    if (!prezzoString || (!prezzoString.includes('.') && !prezzoString.includes(',')) || parseFloat(prezzoString.replace(",", ".")) <= 0) {
        mostraAlert(
          "error",
          "Il prezzo è obbligatorio e deve essere maggiore di 0 per il carico",
          "dati"
        );
        return;
    }
  }

  try {
    const res = await fetch("/api/dati", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prodotto_id, tipo, quantita, prezzo }),
    });

    const data = await res.json();

    if (!res.ok) {
      mostraAlert("error", data.error, "dati");
      return;
    }

    document.getElementById("dato-prodotto").value = "";
    document.getElementById("dato-quantita").value = "";
    document.getElementById("dato-prezzo").value = "";

    mostraAlert("success", "Dato aggiunto con successo", "dati");
    await refreshAllData();
  } catch (err) {
    mostraAlert("error", "Errore durante l'aggiunta", "dati");
  }
}

// Nuova funzione per l'eliminazione dei carichi e scarichi
async function eliminaDato(id, tipo) {
  let messaggioConferma;
  
  if (tipo === 'carico') {
      messaggioConferma = "ATTENZIONE: Stai per eliminare un movimento di CARICO. L'eliminazione è consentita SOLO se il lotto non è stato utilizzato. Sei sicuro?";
  } else if (tipo === 'scarico') {
      messaggioConferma = "ATTENZIONE: Stai per eliminare un movimento di SCARICO. Questa operazione annullerà lo scarico ripristinando la quantità ai lotti da cui è stata prelevata (dal più recente). L'uso di questa funzione richiede CAUTELA. Sei sicuro?";
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
        data.error || "Errore durante l'eliminazione del movimento",
        "dati"
      );
      return;
    }

    mostraAlert(
      "success",
      data.message || "Movimento eliminato con successo",
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
    document.getElementById("valore-magazzino-riepilogo").textContent = "0,00"; // Aggiornato a 0,00
  } else {
    let totaleGenerale = 0;

    tbody.innerHTML = riepilogo
      .map((r) => {
        totaleGenerale += r.valore_totale;

        return `
            <tr>
              <td><strong>${r.nome}</strong></td>
              <td style="text-align: center;" class="giacenza ${
                r.giacenza > 0 ? "positiva" : "zero"
              }">
                ${r.giacenza}
              </td>
              <td style="text-align: right;">
                <strong>€ ${formatNumber(r.valore_totale)}</strong>
              </td>
              <td style="text-align: center;">
                <button class="btn btn-primary btn-small" onclick="mostraDettaglioLotti(${
                  r.id
                }, '${r.nome.replace(/'/g, "\\'")}')">
                  📦 Vedi Lotti
                </button>
              </td>
            </tr>
          `;
      })
      .join("");

    // USO formatNumber
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
      '<tr><td colspan="4" class="empty-state">Nessun lotto disponibile</td></tr>';
  } else {
    tbody.innerHTML = lotti
      .map((l) => {
        const dataFormatted = new Date(l.data_carico).toLocaleString("it-IT");
        const valoreLotto = l.quantita_rimanente * l.prezzo;

        return `
            <tr>
              <td>${dataFormatted}</td>
              <td style="text-align: right;" class="giacenza positiva">${
                l.quantita_rimanente
              }</td>
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