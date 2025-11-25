let prodotti = [];
let dati = [];
let prodottoInModifica = null;
let prodottoDettaglio = null;

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
  // Messaggio di conferma aggiornato
  if (!confirm("ATTENZIONE: L'eliminazione è consentita SOLO se la giacenza è zero. Se procedi, verranno cancellati PERMANENTEMENTE tutti i movimenti e lotti associati. Sei sicuro di voler procedere?")) {
    return;
  }

  try {
    const res = await fetch(`/api/prodotti/${id}`, {
      method: "DELETE",
    });

    const data = await res.json();

    if (!res.ok) {
      // Se fallisce, mostra l'errore specifico (es. giacenza > 0)
      mostraAlert("error", data.error || "Errore durante l'eliminazione", "prodotti");
      return;
    }

    mostraAlert("success", "Prodotto e tutti i suoi dati storici eliminati con successo", "prodotti");
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

        if (d.tipo === "carico") {
          if (d.prezzo !== null) {
            prezzoUnitarioDisplay = `€ ${d.prezzo.toFixed(2)}`;
          }
          if (d.prezzo_totale !== null) {
            prezzoTotaleDisplay = `€ ${d.prezzo_totale.toFixed(2)}`;
            prezzoTotaleClass = "tipo-carico"; 
          }
        } else if (d.tipo === "scarico") {
          if (d.prezzo_unitario_scarico !== null) {
            prezzoUnitarioDisplay = `Ø € ${d.prezzo_unitario_scarico.toFixed(
              2
            )}`;
          }

          if (d.prezzo_totale !== null) {
            const costoScarico = -Math.abs(d.prezzo_totale);
            prezzoTotaleDisplay = `€ ${costoScarico.toFixed(2)}`;
            prezzoTotaleClass = "tipo-scarico"; 
          }
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
                <span style="color: #c0392b; font-size: 10px;">(Bloccato)</span>
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
    document.getElementById("valore-magazzino").textContent =
      data.valore_totale.toFixed(2);
  } catch (err) {
    console.error("Errore caricamento valore:", err);
  }
}

function caricaSelectProdotti() {
  const select = document.getElementById("dato-prodotto");
  select.innerHTML =
    '<option value="">Seleziona prodotto...</option>' +
    prodotti
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

  if (tipo === "carico" && (!prezzo || parseFloat(prezzo) <= 0)) {
    mostraAlert(
      "error",
      "Il prezzo è obbligatorio e deve essere maggiore di 0 per il carico",
      "dati"
    );
    return;
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

async function eliminaDato(id) {
  alert(
    "Non è possibile eliminare movimenti dopo la registrazione. Questo comprometterebbe il calcolo dei lotti e delle giacenze."
  );
  return;
}

// ===== RIEPILOGO =====
async function caricaRiepilogo() {
  try {
    const res = await fetch("/api/riepilogo");
    const riepilogo = await res.json();
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
    document.getElementById("valore-magazzino-riepilogo").textContent = "0.00";
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
                <strong>€ ${r.valore_totale.toFixed(2)}</strong>
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

    document.getElementById("valore-magazzino-riepilogo").textContent =
      totaleGenerale.toFixed(2);
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
              <td style="text-align: right;">€ ${l.prezzo.toFixed(2)}</td>
              <td style="text-align: right;"><strong>€ ${valoreLotto.toFixed(
                2
              )}</strong></td>
            </tr>
          `;
      })
      .join("");
  }

  document.getElementById("totale-lotti").textContent = lotti.length;
}

function tornaARiepilogo() {
  switchTab("riepilogo");
}