// ==================== CONFIGURAZIONE ====================
const API_URL = "api";

let marche = [];
let prodotti = [];
let movimenti = [];
let utenti = [];
let allMarche = [];
let allProdotti = [];
let allMovimenti = [];
let allRiepilogo = [];
let riepilogo = [];
let allStorico = [];
let storico = [];
let allUtenti = [];

// Logout forzato con messaggio opzionale
function forceLogout(message) {
  if (message) alert(message);
  localStorage.removeItem("username");
  localStorage.removeItem("activeSection");
  window.location.href = "index.html";
}

// ==================== INIZIALIZZAZIONE ====================
document.addEventListener("DOMContentLoaded", () => {
  const username = localStorage.getItem("username");
  if (username) {
    document.getElementById("currentUser").textContent = username;
  }

  const savedSection = localStorage.getItem("activeSection") || "marche";

  const mobileMenuToggle = document.getElementById("mobileMenuToggle");
  const sidebar = document.getElementById("sidebar");

  if (mobileMenuToggle) {
    mobileMenuToggle.addEventListener("click", () => {
      sidebar.classList.toggle("mobile-open");
      mobileMenuToggle.classList.toggle("active");
    });

    document.addEventListener("click", (e) => {
      if (window.innerWidth <= 768) {
        if (
          !sidebar.contains(e.target) &&
          !mobileMenuToggle.contains(e.target)
        ) {
          sidebar.classList.remove("mobile-open");
          mobileMenuToggle.classList.remove("active");
        }
      }
    });
  }

  // Setup navigation
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      const section = item.dataset.section;

      document
        .querySelectorAll(".nav-item")
        .forEach((i) => i.classList.remove("active"));
      document
        .querySelectorAll(".content-section")
        .forEach((s) => s.classList.remove("active"));

      item.classList.add("active");
      document.getElementById(`section-${section}`).classList.add("active");

      localStorage.setItem("activeSection", section);

      if (window.innerWidth <= 768) {
        sidebar.classList.remove("mobile-open");
        mobileMenuToggle.classList.remove("active");
      }

      // Carica dati sezione
      if (section === "marche") loadMarche();
      if (section === "prodotti") loadProdotti();
      if (section === "movimenti") loadMovimenti();
      if (section === "riepilogo") loadRiepilogo();
      if (section === "utenti") loadUtenti();
    });
  });

  document.querySelectorAll(".nav-item").forEach((item) => {
    if (item.dataset.section === savedSection) {
      item.click();
    }
  });

  // Logout
  document.getElementById("logoutBtn").addEventListener("click", () => {
    localStorage.removeItem("username");
    localStorage.removeItem("activeSection");
    window.location.href = "index.html";
  });

  // =======================================================
  // 🎯 NUOVO LISTENER PER CAMBIO CARICO/SCARICO
  // =======================================================
  const movimentoTipoSelect = document.getElementById("movimentoTipo");

  if (movimentoTipoSelect) {
    // Quando il valore del campo 'movimentoTipo' cambia,
    // esegui la funzione per mostrare/nascondere i campi.
    movimentoTipoSelect.addEventListener("change", togglePrezzoField);
  }
});

// ==================== MARCHE ====================
async function loadMarche() {
  try {
    const res = await fetch(`${API_URL}/marche`);
    allMarche = await res.json(); // CHANGE: Salva tutte le marche in allMarche
    marche = allMarche; // CHANGE: Reimposta marche alla copia di allMarche per il rendering iniziale
    renderMarche();
  } catch (error) {
    console.error("Errore caricamento marche:", error);
  }
}

function renderMarche() {
  const tbody = document.getElementById("marcheTableBody");

  if (marche.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="2" class="text-center">Nessuna marca presente</td></tr>';
    return;
  }

  tbody.innerHTML = marche
    .map(
      (m) => `
    <tr>
      <td><strong>${m.nome}</strong></td>
      <td class="text-right">
        <button class="btn-icon" onclick="editMarca(${m.id})" title="Modifica">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
        <button class="btn-icon" onclick="deleteMarca(${m.id})" title="Elimina">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
        </button>
      </td>
    </tr>
  `
    )
    .join("");
}

document.getElementById("filterMarche")?.addEventListener("input", (e) => {
  const searchTerm = e.target.value.toLowerCase();
  marche = allMarche.filter((m) => m.nome.toLowerCase().includes(searchTerm));
  renderMarche();
});

function openMarcaModal(marca = null) {
  const modal = document.getElementById("modalMarca");
  const title = document.getElementById("modalMarcaTitle");
  const form = document.getElementById("formMarca");

  form.reset();

  if (marca) {
    title.textContent = "Modifica Marca";
    document.getElementById("marcaId").value = marca.id;
    document.getElementById("marcaNome").value = marca.nome;
  } else {
    title.textContent = "Nuova Marca";
    document.getElementById("marcaId").value = "";
  }

  modal.classList.add("active");
}

function closeMarcaModal() {
  document.getElementById("modalMarca").classList.remove("active");
}

function editMarca(id) {
  const marca = marche.find((m) => m.id === id);
  if (marca) openMarcaModal(marca);
}

async function deleteMarca(id) {
  if (!confirm("Sei sicuro di voler eliminare questa marca?")) return;

  try {
    const res = await fetch(`${API_URL}/marche/${id}`, { method: "DELETE" });
    const data = await res.json();

    if (res.ok) {
      alert("Marca eliminata con successo!");
      loadMarche();
    } else {
      alert(data.error || "Errore durante l'eliminazione");
    }
  } catch (error) {
    alert("Errore di connessione");
  }
}

document.getElementById("formMarca").addEventListener("submit", async (e) => {
  e.preventDefault();

  const id = document.getElementById("marcaId").value;
  const nome = document.getElementById("marcaNome").value.trim();

  const method = id ? "PUT" : "POST";
  const url = id ? `${API_URL}/marche/${id}` : `${API_URL}/marche`;

  try {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome }),
    });

    const data = await res.json();

    if (res.ok) {
      alert(id ? "Marca aggiornata!" : "Marca creata!");
      closeMarcaModal();
      loadMarche();
    } else {
      alert(data.error || "Errore durante il salvataggio");
    }
  } catch (error) {
    alert("Errore di connessione");
  }
});

// ==================== PRODOTTI ====================
async function loadProdotti() {
  try {
    const res = await fetch(`${API_URL}/prodotti`);
    allProdotti = await res.json();
    prodotti = allProdotti;
    renderProdotti();
  } catch (error) {
    console.error("Errore caricamento prodotti:", error);
  }
}

function renderProdotti() {
  const tbody = document.getElementById("prodottiTableBody");

  if (prodotti.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="5" class="text-center">Nessun prodotto presente</td></tr>';
    return;
  }

  tbody.innerHTML = prodotti
    .map(
      (p) => `
    <tr>
      <td><strong>${p.nome}</strong></td>
      <td><span class="badge badge-marca">${
        p.marca_nome ? p.marca_nome.toUpperCase() : "N/A"
      }</span></td>
      <td><span class="badge-giacenza">${formatQuantity(
        p.giacenza ?? 0
      )} pz</span></td>
      <td>${p.descrizione || "-"}</td>
      <td class="text-right">
        <button class="btn-icon" onclick="editProdotto(${
          p.id
        })" title="Modifica">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
        <button class="btn-icon" onclick="deleteProdotto(${
          p.id
        })" title="Elimina">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
        </button>
      </td>
    </tr>
  `
    )
    .join("");
}

document.getElementById("filterProdotti")?.addEventListener("input", (e) => {
  const searchTerm = e.target.value.toLowerCase().trim();

  if (!searchTerm) {
    // Nessun testo: mostra tutti i prodotti
    prodotti = [...allProdotti];
  } else {
    // Testo presente: applica il filtro
    prodotti = allProdotti.filter(
      (p) =>
        p.nome.toLowerCase().includes(searchTerm) ||
        (p.marcanome && p.marcanome.toLowerCase().includes(searchTerm)) ||
        (p.descrizione && p.descrizione.toLowerCase().includes(searchTerm))
    );
  }

  renderProdotti();
});

async function openProdottoModal(prodotto = null) {
  if (marche.length === 0) {
    const res = await fetch(`${API_URL}/marche`);
    marche = await res.json();
  }

  const modal = document.getElementById("modalProdotto");
  const title = document.getElementById("modalProdottoTitle");
  const form = document.getElementById("formProdotto");
  const selectMarca = document.getElementById("prodottoMarca");

  form.reset();

  // CHANGE: Aggiunta opzione vuota come prima scelta per non preselezionare nessuna marca
  selectMarca.innerHTML = marche
    .map((m) => `<option value="${m.id}">${m.nome.toUpperCase()}</option>`)
    .join("");

  if (prodotto) {
    title.textContent = "Modifica Prodotto";
    document.getElementById("prodottoId").value = prodotto.id;
    document.getElementById("prodottoNome").value = prodotto.nome;
    document.getElementById("prodottoMarca").value = prodotto.marca_id || "";
    document.getElementById("prodottoDescrizione").value =
      prodotto.descrizione || "";
  } else {
    title.textContent = "Nuovo Prodotto";
    document.getElementById("prodottoId").value = "";
  }

  modal.classList.add("active");
}

function closeProdottoModal() {
  document.getElementById("modalProdotto").classList.remove("active");
}

function editProdotto(id) {
  const prodotto = prodotti.find((p) => p.id === id);
  if (prodotto) openProdottoModal(prodotto);
}

async function deleteProdotto(id) {
  if (!confirm("Sei sicuro di voler eliminare questo prodotto?")) return;

  try {
    const res = await fetch(`${API_URL}/prodotti/${id}`, { method: "DELETE" });
    const data = await res.json();

    if (res.ok) {
      alert("Prodotto eliminato con successo!");
      loadProdotti();
    } else {
      alert(data.error || "Errore durante l'eliminazione");
    }
  } catch (error) {
    alert("Errore di connessione");
  }
}

// listener di submit spostato più sotto per evitare registrazioni duplicate

// ==================== MOVIMENTI ====================
async function loadMovimenti() {
  try {
    const res = await fetch(`${API_URL}/dati`);
    allMovimenti = await res.json(); // CHANGE: Salva tutte le marche in allMovimenti
    movimenti = allMovimenti; // CHANGE: Reimposta movimenti alla copia di allMovimenti per il rendering iniziale
    renderMovimenti();
  } catch (error) {
    console.error("Errore caricamento movimenti:", error);
  }
}

function renderMovimenti() {
  const tbody = document.getElementById("movimentiTableBody");

  if (movimenti.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="10" class="text-center">Nessun movimento presente</td></tr>';
    return;
  }

  tbody.innerHTML = movimenti
    .map((m) => {
      const prefix = m.tipo === "scarico" ? "- " : "";

      // Calcolo prezzo unitario
      let prezzoUnitarioRaw = "-";
      if (m.tipo === "carico" && m.prezzo) {
        prezzoUnitarioRaw = formatCurrency(m.prezzo);
      } else if (m.tipo === "scarico" && m.prezzo_unitario_scarico) {
        prezzoUnitarioRaw = formatCurrency(m.prezzo_unitario_scarico);
      }

      const prezzoUnitarioHtml =
        prezzoUnitarioRaw !== "-"
          ? prezzoUnitarioRaw.replace("€ ", `${prefix}€ `)
          : "-";

      const prezzoTotaleRaw = formatCurrency(m.prezzo_totale || 0);
      const prezzoTotaleHtml = prezzoTotaleRaw.replace("€ ", `${prefix}€ `);

      // 🎨 Classe colore: verde per carico, rosso per scarico
      const colorClass = m.tipo === "carico" ? "text-green" : "text-red";

      return `
    <tr>
      <td><strong>${m.prodotto_nome}</strong></td>
      <td>${m.marca_nome || '<span style="color: #999;">-</span>'}</td>
      <td>${
        m.prodotto_descrizione
          ? `<small>${m.prodotto_descrizione.substring(0, 30)}${
              m.prodotto_descrizione.length > 30 ? "..." : ""
            }</small>`
          : '<span style="color: #999;">-</span>'
      }</td>
      <td><span class="badge ${
        m.tipo === "carico" ? "badge-success" : "badge-danger"
      }">${m.tipo.toUpperCase()}</span></td>

      <!-- 🎨 Colori dinamici -->
      <td class="${colorClass}">${formatQuantity(m.quantita)} pz</td>
      <td class="${colorClass}">${prezzoUnitarioHtml}</td>
      <td class="${colorClass}"><strong>${prezzoTotaleHtml}</strong></td>

      <td>${new Date(m.data_movimento).toLocaleDateString("it-IT")}</td>
      <td>${m.fattura_doc || '<span style="color: #999;">-</span>'}</td>
      <td class="text-right">
        <button class="btn-icon" onclick="deleteMovimento(${
          m.id
        })" title="Elimina">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
        </button>
      </td>
    </tr>
  `;
    })
    .join("");
}

document.getElementById("filterMovimenti")?.addEventListener("input", (e) => {
  const searchTerm = e.target.value.toLowerCase();
  movimenti = allMovimenti.filter(
    (m) =>
      m.prodotto_nome.toLowerCase().includes(searchTerm) ||
      (m.marca_nome && m.marca_nome.toLowerCase().includes(searchTerm)) ||
      m.tipo.toLowerCase().includes(searchTerm) ||
      (m.prodotto_descrizione &&
        m.prodotto_descrizione.toLowerCase().includes(searchTerm))
  );
  renderMovimenti();
});

function togglePrezzoField() {
  const tipo = document.getElementById("movimentoTipo").value;
  const prezzoGroup = document.getElementById("prezzoGroup");
  const prezzoInput = document.getElementById("movimentoPrezzo");
  const fornitoreGroup = document.getElementById("fornitoreGroup");
  const fatturaInput = document.getElementById("movimentoFattura");
  const fornitoreInput = document.getElementById("movimentoFornitore");
  const docOptional = document.getElementById("docOptional");
  const fornitoreOptional = document.getElementById("fornitoreOptional");
  const fatturaGroup = fatturaInput.closest(".form-group");

  // CHANGE: Gestione anche dell'opzione vuota (nessuna selezione)
  if (tipo === "carico") {
    prezzoGroup.style.display = "block";
    prezzoInput.required = true;
    fornitoreGroup.style.display = "block";
    fatturaGroup.style.display = "block";
    fatturaInput.required = true;
    fornitoreInput.required = true;
    docOptional.textContent = "*";
    fornitoreOptional.textContent = "*";
  } else {
    // Per 'scarico' o valore vuoto, nascondi i campi
    prezzoGroup.style.display = "none";
    prezzoInput.required = false;
    prezzoInput.value = "";
    fornitoreGroup.style.display = "none";
    fatturaGroup.style.display = "none";
    fornitoreInput.value = "";
    fatturaInput.value = "";
    fatturaInput.required = false;
    fornitoreInput.required = false;
    docOptional.textContent = "";
    fornitoreOptional.textContent = "";
  }
}

async function openMovimentoModal(movimento = null) {
  if (prodotti.length === 0) {
    const res = await fetch(`${API_URL}/prodotti`);
    prodotti = await res.json();
  }

  const modal = document.getElementById("modalMovimento");
  const title = document.getElementById("modalMovimentoTitle");
  const form = document.getElementById("formMovimento");
  const selectProdotto = document.getElementById("movimentoProdotto");

  form.reset();

  // CHANGE: Aggiunta opzione vuota iniziale nel select prodotto
  selectProdotto.innerHTML =
    '<option value="">Seleziona prodotto...</option>' +
    prodotti
      .map((p) => {
        const marcaNome = p.marca_nome
          ? ` (${p.marca_nome.toUpperCase()})`
          : "";
        return `<option value="${p.id}">${p.nome}${marcaNome}</option>`;
      })
      .join("");

  title.textContent = "Nuovo Movimento";
  document.getElementById("movimentoId").value = "";
  // CHANGE: Nascondi info giacenza all'apertura del modale se non è in modalità modifica
  if (!movimento) {
    document.getElementById("giacenzaInfo").style.display = "none";
  }

  togglePrezzoField();

  modal.classList.add("active");
}

function closeMovimentoModal() {
  document.getElementById("modalMovimento").classList.remove("active");
}

function editMovimento(id) {
  const movimento = movimenti.find((m) => m.id === id);
  if (movimento) openMovimentoModal(movimento);
}

async function deleteMovimento(id) {
  if (!confirm("Sei sicuro di voler eliminare questo movimento?")) return;

  try {
    const res = await fetch(`${API_URL}/dati/${id}`, { method: "DELETE" });
    const data = await res.json();

    if (res.ok) {
      alert("Movimento eliminato con successo!");
      loadMovimenti();
      loadProdotti();
    } else {
      alert(data.error || "Errore durante l'eliminazione");
    }
  } catch (error) {
    alert("Errore di connessione");
  }
}

document
  .getElementById("formMovimento")
  .addEventListener("submit", async (e) => {
    e.preventDefault();

    const id = document.getElementById("movimentoId").value;
    const prodotto_id = document.getElementById("movimentoProdotto").value;
    const tipo = document.getElementById("movimentoTipo").value;

    // ⭐ USA LA NUOVA FUNZIONE DI PARSING
    const quantitaValue = document.getElementById("movimentoQuantita").value;
    const quantita = parseDecimalInput(quantitaValue);

    const data_movimento = document.getElementById("movimentoData").value;

    // ⭐ USA LA NUOVA FUNZIONE DI PARSING PER IL PREZZO
    let prezzo = null;
    if (tipo === "carico") {
      const prezzoValue = document.getElementById("movimentoPrezzo").value;
      prezzo = parseDecimalInput(prezzoValue);
    }

    const fattura_doc =
      tipo === "carico"
        ? document.getElementById("movimentoFattura").value.trim() || null
        : null;
    const fornitore =
      tipo === "carico"
        ? document.getElementById("movimentoFornitore").value.trim() || null
        : null;

    // Validazioni
    if (!prodotto_id || !tipo || !quantita || !data_movimento) {
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
          quantita: parseFloat(quantita.toFixed(2)), // Assicura 2 decimali
          prezzo: prezzo ? parseFloat(prezzo.toFixed(2)) : null, // Assicura 2 decimali
          data_movimento,
          fattura_doc,
          fornitore,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        alert(id ? "Movimento aggiornato!" : "Movimento registrato!");
        closeMovimentoModal();
        loadMovimenti();
        loadProdotti();
      } else {
        alert(data.error || "Errore durante il salvataggio");
      }
    } catch (error) {
      alert("Errore di connessione");
    }
  });

document
  .getElementById("movimentoProdotto")
  ?.addEventListener("change", async (e) => {
    const prodottoId = e.target.value;
    if (prodottoId) {
      await showGiacenzaInfo(prodottoId);
    } else {
      document.getElementById("giacenzaInfo").style.display = "none";
    }
  });

async function showGiacenzaInfo(prodottoId) {
  try {
    const prodotto = prodotti.find((p) => p.id == prodottoId);
    if (prodotto) {
      const giacenzaInfo = document.getElementById("giacenzaInfo");
      const giacenzaValue = document.getElementById("giacenzaValue");

      giacenzaValue.textContent = `${prodotto.nome} ${
        prodotto.marca_nome ? `(${prodotto.marca_nome})` : ""
      } - Giacenza: ${formatQuantity(prodotto.giacenza || 0)} pz`;
      giacenzaInfo.style.display = "block";
    }
  } catch (error) {
    console.error("Errore caricamento giacenza:", error);
  }
}

// ==================== RIEPILOGO ====================
async function loadRiepilogo() {
  try {
    const res = await fetch(`${API_URL}/magazzino/riepilogo`);
    const data = await res.json();

    allRiepilogo = data.riepilogo || [];
    riepilogo = allRiepilogo;

    // CHANGE: Aggiorna il totale in base ai prodotti visibili
    updateRiepilogoTotal();
    renderRiepilogo();
  } catch (error) {
    console.error("Errore caricamento riepilogo:", error);
  }
}

// CHANGE: Nuova funzione per aggiornare il totale del riepilogo
function updateRiepilogoTotal() {
  const valoreTotaleFiltrato = riepilogo.reduce(
    (sum, r) => sum + Number.parseFloat(r.valore_totale || 0),
    0
  );
  document.getElementById("valoreTotale").textContent =
    formatCurrency(valoreTotaleFiltrato);
}

function renderRiepilogo() {
  const tbody = document.getElementById("riepilogoTableBody");

  if (riepilogo.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="4" class="text-center">Nessun prodotto in magazzino</td></tr>';
    return;
  }

  let html = "";

  riepilogo.forEach((r) => {
    html += `
    <tr class="product-main-row">
      <td><strong>${r.nome}</strong>${
      r.marca_nome
        ? ` <span class="badge-marca">(${r.marca_nome.toUpperCase()})</span>`
        : ""
    }</td>
      <td>${
        r.descrizione
          ? `<small>${r.descrizione.substring(0, 50)}${
              r.descrizione.length > 50 ? "..." : ""
            }</small>`
          : '<span style="color: #999;">-</span>'
      }</td>
      <td><span class="badge-giacenza">${formatQuantity(r.giacenza)} pz</span></td>
      <td><strong>${formatCurrency(r.valore_totale)}</strong></td>
    </tr>
    `;

    if (r.giacenza > 0 && r.lotti && r.lotti.length > 0) {
      html += `
      <tr class="lotti-row">
        <td colspan="4" class="lotti-container">
          <div class="lotti-header">Dettaglio Lotti</div>
          <div class="lotti-table-wrapper">
            <table class="lotti-table">
              <thead>
                <tr>
                  <th>Quantità</th>
                  <th>Prezzo Unit.</th>
                  <th>Valore</th>
                  <th>Data Carico</th>
                  <th>Documento</th>
                  <th>Fornitore</th>
                </tr>
              </thead>
              <tbody>
      `;

      r.lotti.forEach((lotto) => {
        html += `
                <tr>
                  <td><strong>${formatQuantity(lotto.quantita_rimanente)} pz</strong></td>
                  <td>${formatCurrency(lotto.prezzo)}</td>
                  <td><strong>${formatCurrency(
                    lotto.quantita_rimanente * lotto.prezzo
                  )}</strong></td>
                  <td>${new Date(lotto.data_carico).toLocaleDateString(
                    "it-IT"
                  )}</td>
                  <td>${
                    lotto.fattura_doc || '<span style="color: #999;">-</span>'
                  }</td>
                  <td>${
                    lotto.fornitore || '<span style="color: #999;">-</span>'
                  }</td>
                </tr>
        `;
      });

      html += `
              </tbody>
            </table>
          </div>
        </td>
      </tr>
      `;
    }
  });

  tbody.innerHTML = html;
}

document.getElementById("filterRiepilogo")?.addEventListener("input", (e) => {
  const searchTerm = e.target.value.toLowerCase();
  riepilogo = allRiepilogo.filter(
    (r) =>
      r.nome.toLowerCase().includes(searchTerm) ||
      (r.marca_nome && r.marca_nome.toLowerCase().includes(searchTerm)) ||
      (r.descrizione && r.descrizione.toLowerCase().includes(searchTerm))
  );
  updateRiepilogoTotal();
  renderRiepilogo();
});

function printRiepilogo() {
  if (riepilogo.length === 0) {
    alert("Nessun prodotto da stampare");
    return;
  }

  const valoreTotaleFiltrato = riepilogo.reduce(
    (sum, r) => sum + Number.parseFloat(r.valore_totale || 0),
    0
  );

  let printContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Riepilogo Magazzino</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1 { color: #333; border-bottom: 2px solid #4F46E5; padding-bottom: 10px; }
        .info { margin: 20px 0; font-size: 14px; }
        .prodotto-block { margin-bottom: 30px; page-break-inside: avoid; }
        .prodotto-header { 
          background-color: #e0e7ff; 
          padding: 10px; 
          margin-bottom: 10px;
          border-left: 4px solid #4F46E5;
        }
        .prodotto-info { display: flex; justify-content: space-between; margin: 5px 0; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
        th { background-color: #6366f1; color: white; }
        .lotto-row { background-color: #f9fafb; }
        .no-lotti { text-align: center; color: #999; padding: 10px; }
      </style>
    </head>
    <body>
      <h1>Riepilogo Giacenze Magazzino</h1>
      <div class="info">
        <p><strong>Valore Totale (Filtrato):</strong> ${formatCurrency(
          valoreTotaleFiltrato
        )}</p>
        <p><strong>Data Stampa:</strong> ${new Date().toLocaleDateString(
          "it-IT"
        )} ${new Date().toLocaleTimeString("it-IT")}</p>
      </div>
  `;

  riepilogo.forEach((prodotto) => {
    if (prodotto.giacenza > 0) {
      printContent += `
        <div class="prodotto-block">
          <div class="prodotto-header">
            <div class="prodotto-info">
              <span><strong>Prodotto:</strong> ${prodotto.nome}</span>
              <span><strong>Giacenza Totale:</strong> ${formatQuantity(
                prodotto.giacenza
              )} pz</span>
            </div>
            <div class="prodotto-info">
              <span><strong>Marca:</strong> ${prodotto.marca_nome || "-"}</span>
              <span><strong>Valore Totale:</strong> ${formatCurrency(
                prodotto.valore_totale
              )}</span>
            </div>
            ${
              prodotto.descrizione
                ? `<div class="prodotto-info"><span><strong>Descrizione:</strong> ${prodotto.descrizione}</span></div>`
                : ""
            }
          </div>
      `;

      if (prodotto.lotti && prodotto.lotti.length > 0) {
        printContent += `
          <table>
            <thead>
              <tr>
                <th>Quantità</th>
                <th>Prezzo Unit.</th>
                <th>Valore</th>
                <th>Data Carico</th>
                <th>Documento</th>
                <th>Fornitore</th>
              </tr>
            </thead>
            <tbody>
        `;

        prodotto.lotti.forEach((lotto) => {
          printContent += `
            <tr class="lotto-row">
              <td>${formatQuantity(lotto.quantita_rimanente)} pz</td>
              <td>${formatCurrency(lotto.prezzo)}</td>
              <td><strong>${formatCurrency(
                lotto.quantita_rimanente * lotto.prezzo
              )}</strong></td>
              <td>${new Date(lotto.data_carico).toLocaleDateString(
                "it-IT"
              )}</td>
              <td>${lotto.fattura_doc || "-"}</td>
              <td>${lotto.fornitore || "-"}</td>
            </tr>
          `;
        });

        printContent += `
            </tbody>
          </table>
        `;
      } else {
        printContent += '<p class="no-lotti">Nessun lotto disponibile</p>';
      }

      printContent += `</div>`;
    }
  });

  printContent += `</body></html>`;

  const printFrame = document.createElement("iframe");
  printFrame.style.display = "none";
  document.body.appendChild(printFrame);
  printFrame.contentDocument.write(printContent);
  printFrame.contentDocument.close();
  printFrame.contentWindow.print();
  setTimeout(() => document.body.removeChild(printFrame), 1000);
}

// ==================== STORICO ====================
async function loadStorico() {
  const data = document.getElementById("storicoDate").value;
  if (!data) {
    alert("Seleziona una data");
    return;
  }

  try {
    const res = await fetch(`${API_URL}/magazzino/storico-giacenza/${data}`);
    const result = await res.json();

    allStorico = result.riepilogo || [];
    storico = allStorico;

    // CHANGE: Aggiorna il totale in base ai prodotti visibili
    updateStoricoTotal();
    renderStorico(storico);
  } catch (error) {
    console.error("Errore caricamento storico:", error);
    alert("Errore nel caricamento dello storico");
  }
}

// CHANGE: Nuova funzione per aggiornare il totale dello storico
function updateStoricoTotal() {
  const valoreStoricoFiltrato = storico.reduce(
    (sum, s) => sum + Number.parseFloat(s.valore_totale || 0),
    0
  );
  document.getElementById("valoreStorico").textContent = formatCurrency(
    valoreStoricoFiltrato
  );
}

function renderStorico(storico) {
  const tbody = document.getElementById("storicoTableBody");

  if (storico.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="4" class="text-center">Nessun dato disponibile</td></tr>';
    return;
  }

  let html = "";

  storico.forEach((s) => {
    html += `
    <tr class="product-main-row">
      <td><strong>${s.nome}</strong>${
      s.marca_nome
        ? ` <span class="badge-marca">(${s.marca_nome.toUpperCase()})</span>`
        : ""
    }</td>
      <td>${
        s.descrizione
          ? `<small>${s.descrizione.substring(0, 50)}${
              s.descrizione.length > 50 ? "..." : ""
            }</small>`
          : '<span style="color: #999;">-</span>'
      }</td>
      <td><span class="badge-giacenza">${formatQuantity(s.giacenza)} pz</span></td>
      <td><strong>${formatCurrency(s.valore_totale)}</strong></td>
    </tr>
    `;

    if (s.giacenza > 0 && s.lotti && s.lotti.length > 0) {
      html += `
      <tr class="lotti-row">
        <td colspan="4" class="lotti-container">
          <div class="lotti-header">Dettaglio Lotti</div>
          <div class="lotti-table-wrapper">
            <table class="lotti-table">
              <thead>
                <tr>
                  <th>Quantità</th>
                  <th>Prezzo Unit.</th>
                  <th>Valore</th>
                  <th>Data Carico</th>
                  <th>Documento</th>
                  <th>Fornitore</th>
                </tr>
              </thead>
              <tbody>
      `;

      s.lotti.forEach((lotto) => {
        html += `
                <tr>
                  <td><strong>${formatQuantity(lotto.quantita_rimanente)} pz</strong></td>
                  <td>${formatCurrency(lotto.prezzo)}</td>
                  <td><strong>${formatCurrency(
                    lotto.quantita_rimanente * lotto.prezzo
                  )}</strong></td>
                  <td>${new Date(lotto.data_carico).toLocaleDateString(
                    "it-IT"
                  )}</td>
                  <td>${
                    lotto.fattura_doc || '<span style="color: #999;">-</span>'
                  }</td>
                  <td>${
                    lotto.fornitore || '<span style="color: #999;">-</span>'
                  }</td>
                </tr>
        `;
      });

      html += `
              </tbody>
            </table>
          </div>
        </td>
      </tr>
      `;
    }
  });

  tbody.innerHTML = html;
}

document.getElementById("filterStorico")?.addEventListener("input", (e) => {
  const searchTerm = e.target.value.toLowerCase();
  storico = allStorico.filter(
    (s) =>
      s.nome.toLowerCase().includes(searchTerm) ||
      (s.marca_nome && s.marca_nome.toLowerCase().includes(searchTerm)) ||
      (s.descrizione && s.descrizione.toLowerCase().includes(searchTerm))
  );
  // CHANGE: Aggiunto ricalcolo del totale dopo il filtro
  updateStoricoTotal();
  renderStorico(storico);
});

// CHANGE: Corretta la funzione printStorico per usare la struttura dati corretta
function printStorico() {
  if (storico.length === 0) {
    alert("Nessun prodotto da stampare");
    return;
  }

  const valoreStoricoFiltrato = storico.reduce(
    (sum, s) => sum + Number.parseFloat(s.valore_totale || 0),
    0
  );

  const dataSelezionata = document.getElementById("storicoDate").value;
  const dataItalianaSelezionata = dataSelezionata
    ? new Date(dataSelezionata + "T00:00:00").toLocaleDateString("it-IT")
    : "Non selezionata";

  let printContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Storico Giacenze</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1 { color: #333; border-bottom: 2px solid #4F46E5; padding-bottom: 10px; }
        .info { margin: 20px 0; font-size: 14px; }
        .prodotto-block { margin-bottom: 30px; page-break-inside: avoid; }
        .prodotto-header { 
          background-color: #e0e7ff; 
          padding: 10px; 
          margin-bottom: 10px;
          border-left: 4px solid #4F46E5;
        }
        .prodotto-info { display: flex; justify-content: space-between; margin: 5px 0; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
        th { background-color: #6366f1; color: white; }
        .lotto-row { background-color: #f9fafb; }
        .no-lotti { text-align: center; color: #999; padding: 10px; }
      </style>
    </head>
    <body>
      <h1>Storico Giacenze Magazzino</h1>
      <div class="info">
        <p><strong>Data Selezionata:</strong> ${dataItalianaSelezionata}</p>
        <p><strong>Valore Totale (Filtrato):</strong> ${formatCurrency(
          valoreStoricoFiltrato
        )}</p>
        <p><strong>Data Stampa:</strong> ${new Date().toLocaleDateString(
          "it-IT"
        )} ${new Date().toLocaleTimeString("it-IT")}</p>
      </div>
  `;

  storico.forEach((prodotto) => {
    if (prodotto.giacenza > 0) {
      printContent += `
        <div class="prodotto-block">
          <div class="prodotto-header">
            <div class="prodotto-info">
              <span><strong>Prodotto:</strong> ${prodotto.nome}</span>
              <span><strong>Giacenza Totale:</strong> ${formatQuantity(
                prodotto.giacenza
              )} pz</span>
            </div>
            <div class="prodotto-info">
              <span><strong>Marca:</strong> ${prodotto.marca_nome || "-"}</span>
              <span><strong>Valore Totale:</strong> ${formatCurrency(
                prodotto.valore_totale
              )}</span>
            </div>
            ${
              prodotto.descrizione
                ? `<div class="prodotto-info"><span><strong>Descrizione:</strong> ${prodotto.descrizione}</span></div>`
                : ""
            }
          </div>
      `;

      if (prodotto.lotti && prodotto.lotti.length > 0) {
        printContent += `
          <table>
            <thead>
              <tr>
                <th>Quantità</th>
                <th>Prezzo Unit.</th>
                <th>Valore</th>
                <th>Data Carico</th>
                <th>Documento</th>
                <th>Fornitore</th>
              </tr>
            </thead>
            <tbody>
        `;

        prodotto.lotti.forEach((lotto) => {
          printContent += `
            <tr class="lotto-row">
              <td>${formatQuantity(lotto.quantita_rimanente)} pz</td>
              <td>${formatCurrency(lotto.prezzo)}</td>
              <td><strong>${formatCurrency(
                lotto.quantita_rimanente * lotto.prezzo
              )}</strong></td>
              <td>${new Date(lotto.data_carico).toLocaleDateString(
                "it-IT"
              )}</td>
              <td>${lotto.fattura_doc || "-"}</td>
              <td>${lotto.fornitore || "-"}</td>
            </tr>
          `;
        });

        printContent += `
            </tbody>
          </table>
        `;
      } else {
        printContent += '<p class="no-lotti">Nessun lotto disponibile</p>';
      }

      printContent += `</div>`;
    }
  });

  printContent += `</body></html>`;

  const printFrame = document.createElement("iframe");
  printFrame.style.display = "none";
  document.body.appendChild(printFrame);
  printFrame.contentDocument.write(printContent);
  printFrame.contentDocument.close();
  printFrame.contentWindow.print();
  setTimeout(() => document.body.removeChild(printFrame), 1000);
}

// ==================== UTENTI ====================
async function loadUtenti() {
  try {
    const res = await fetch(`${API_URL}/utenti`);
    allUtenti = await res.json(); // CHANGE: Salva tutte le marche in allUtenti
    utenti = allUtenti; // CHANGE: Reimposta utenti alla copia di allUtenti per il rendering iniziale
    renderUtenti();
  } catch (error) {
    console.error("Errore caricamento utenti:", error);
  }
}

function renderUtenti() {
  const tbody = document.getElementById("utentiTableBody");

  if (utenti.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="2" class="text-center">Nessun utente presente</td></tr>';
    return;
  }

  tbody.innerHTML = utenti
    .map(
      (u) => `
    <tr>
      <!-- Rimosso ID utente -->
      <td><strong>${u.username}</strong></td>
      <td class="text-right">
        <button class="btn-icon" onclick="editUser(${u.id})" title="Modifica">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
        <button class="btn-icon" onclick="deleteUser(${u.id})" title="Elimina">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
        </button>
      </td>
    </tr>
  `
    )
    .join("");
}

document.getElementById("filterUtenti")?.addEventListener("input", (e) => {
  const searchTerm = e.target.value.toLowerCase();
  utenti = allUtenti.filter((u) =>
    u.username.toLowerCase().includes(searchTerm)
  );
  renderUtenti();
});

function openUserModal(user = null) {
  const modal = document.getElementById("modalUser");
  const title = document.getElementById("modalUserTitle");
  const form = document.getElementById("formUser");
  const passwordOptional = document.getElementById("passwordOptional");
  const passwordInput = document.getElementById("userPassword");

  form.reset();

  if (user) {
    title.textContent = "Modifica Utente";
    document.getElementById("userId").value = user.id;
    document.getElementById("userUsername").value = user.username;
    passwordOptional.textContent = "(opzionale)";
    passwordInput.required = false;
  } else {
    title.textContent = "Nuovo Utente";
    document.getElementById("userId").value = "";
    passwordOptional.textContent = "*";
    passwordInput.required = true;
  }

  modal.classList.add("active");
}

function closeUserModal() {
  document.getElementById("modalUser").classList.remove("active");
}

function editUser(id) {
  const user = utenti.find((u) => u.id === id);
  if (user) openUserModal(user);
}

async function deleteUser(id) {
  if (!confirm("Sei sicuro di voler eliminare questo utente?")) return;

  try {
    const currentUser = localStorage.getItem("username") || "";
    const res = await fetch(
      `${API_URL}/utenti/${id}?current_user=${encodeURIComponent(currentUser)}`,
      { method: "DELETE" }
    );
    const data = await res.json();

    if (res.ok) {
      if (data.utente_eliminato) {
        forceLogout(
          "Hai eliminato il tuo account. Verrai disconnesso e dovrai effettuare di nuovo il login."
        );
      } else {
        alert("Utente eliminato con successo!");
        loadUtenti();
      }
    } else {
      alert(data.error || "Errore durante l'eliminazione");
    }
  } catch (error) {
    alert("Errore di connessione");
  }
}

document.getElementById("formUser").addEventListener("submit", async (e) => {
  e.preventDefault();

  const id = document.getElementById("userId").value;
  const username = document.getElementById("userUsername").value.trim();
  const password = document.getElementById("userPassword").value;

  const method = id ? "PUT" : "POST";
  const url = id ? `${API_URL}/utenti/${id}` : `${API_URL}/utenti`;

  const body = { username };
  if (password) body.password = password;
  if (id) {
    body.current_user = localStorage.getItem("username") || null;
  }

  try {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (res.ok) {
      const mustLogout =
        data.username_modificato || data.password_modificata || false;

      alert(id ? "Utente aggiornato!" : "Utente creato!");
      closeUserModal();
      if (mustLogout) {
        forceLogout(
          "Le tue credenziali sono cambiate. Effettua di nuovo l'accesso."
        );
      } else {
        loadUtenti();
      }
    } else {
      alert(data.error || "Errore durante il salvataggio");
    }
  } catch (error) {
    alert("Errore di connessione");
  }
});

// ==================== FUNZIONI DI UTILITA ====================
// CHANGE: Aggiornata funzione formatCurrency per garantire € sempre davanti al numero
function formatCurrency(num) {
  const n = Number.parseFloat(num);
  if (isNaN(n)) return "€ 0,00";

  return `€ ${formatNumber(n)}`;
}

// CHANGE: Funzione helper per formattare valuta con simbolo €
function formatNumber(num) {
  const n = Number.parseFloat(num);
  if (isNaN(n)) return "0";

  // Separa parte intera e decimali
  const parts = n.toFixed(2).split(".");

  // Aggiungi il punto ogni 3 cifre nella parte intera
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");

  return parts.join(",");
}

// ==================== UTILITY PER INPUT DECIMALI ====================

// Funzione per limitare a 2 decimali durante la digitazione
function limitToTwoDecimals(inputElement) {
  inputElement.addEventListener("input", function (e) {
    let value = this.value;

    // Sostituisci virgola con punto
    value = value.replace(",", ".");

    // Rimuovi caratteri non validi (solo numeri, punto e virgola)
    value = value.replace(/[^\d.,]/g, "");

    // Gestisci multipli punti/virgole
    const parts = value.split(".");
    if (parts.length > 2) {
      value = parts[0] + "." + parts.slice(1).join("");
    }

    // Limita a 2 decimali
    if (parts.length === 2 && parts[1].length > 2) {
      value = parts[0] + "." + parts[1].substring(0, 2);
    }

    this.value = value;
  });

  // Formatta al blur (quando l'utente esce dal campo)
  inputElement.addEventListener("blur", function (e) {
    let value = this.value;
    if (value === "" || value === ".") {
      this.value = "";
      return;
    }

    value = value.replace(",", ".");
    const num = parseFloat(value);

    if (!isNaN(num)) {
      // Formatta con 2 decimali
      this.value = num.toFixed(2).replace(".", ",");
    }
  });
}

// Applica la limitazione agli input quando si apre il modal
function setupDecimalInputs() {
  const quantitaInput = document.getElementById("movimentoQuantita");
  const prezzoInput = document.getElementById("movimentoPrezzo");

  if (quantitaInput) limitToTwoDecimals(quantitaInput);
  if (prezzoInput) limitToTwoDecimals(prezzoInput);
}

async function openMovimentoModal(movimento = null) {
  if (prodotti.length === 0) {
    const res = await fetch(`${API_URL}/prodotti`);
    prodotti = await res.json();
  }

  const modal = document.getElementById("modalMovimento");
  const title = document.getElementById("modalMovimentoTitle");
  const form = document.getElementById("formMovimento");
  const selectProdotto = document.getElementById("movimentoProdotto");

  form.reset();

  selectProdotto.innerHTML =
    '<option value="">Seleziona prodotto...</option>' +
    prodotti
      .map((p) => {
        const marcaNome = p.marca_nome
          ? ` (${p.marca_nome.toUpperCase()})`
          : "";
        return `<option value="${p.id}">${p.nome}${marcaNome}</option>`;
      })
      .join("");

  title.textContent = "Nuovo Movimento";
  document.getElementById("movimentoId").value = "";

  if (!movimento) {
    document.getElementById("giacenzaInfo").style.display = "none";
  }

  togglePrezzoField();

  // ⭐ AGGIUNGI QUESTA RIGA
  setupDecimalInputs();

  modal.classList.add("active");
}

function renderMovimenti() {
  const tbody = document.getElementById("movimentiTableBody");

  if (movimenti.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="11" class="text-center">Nessun movimento presente</td></tr>';
    return;
  }

  tbody.innerHTML = movimenti
    .map((m) => {
      const prefix = m.tipo === "scarico" ? "- " : "";

      // Calcolo prezzo unitario
      let prezzoUnitarioRaw = "-";
      if (m.tipo === "carico" && m.prezzo) {
        prezzoUnitarioRaw = formatCurrency(m.prezzo);
      } else if (m.tipo === "scarico" && m.prezzo_unitario_scarico) {
        prezzoUnitarioRaw = formatCurrency(m.prezzo_unitario_scarico);
      }

      const prezzoUnitarioHtml =
        prezzoUnitarioRaw !== "-"
          ? prezzoUnitarioRaw.replace("€ ", `${prefix}€ `)
          : "-";

      const prezzoTotaleRaw = formatCurrency(m.prezzo_totale || 0);
      const prezzoTotaleHtml = prezzoTotaleRaw.replace("€ ", `${prefix}€ `);

      const colorClass = m.tipo === "carico" ? "text-green" : "text-red";

      return `
    <tr>
      <td><strong>${m.prodotto_nome}</strong></td>
      <td>${m.marca_nome || '<span style="color: #999;">-</span>'}</td>
      <td>${
        m.prodotto_descrizione
          ? `<small>${m.prodotto_descrizione.substring(0, 30)}${
              m.prodotto_descrizione.length > 30 ? "..." : ""
            }</small>`
          : '<span style="color: #999;">-</span>'
      }</td>
      <td><span class="badge ${
        m.tipo === "carico" ? "badge-success" : "badge-danger"
      }">${m.tipo.toUpperCase()}</span></td>

      <td class="${colorClass}">${formatQuantity(m.quantita)} pz</td>
      <td class="${colorClass}">${prezzoUnitarioHtml}</td>
      <td class="${colorClass}"><strong>${prezzoTotaleHtml}</strong></td>

      <td>${new Date(m.data_movimento).toLocaleDateString("it-IT")}</td>
      <td>${m.fattura_doc || '<span style="color: #999;">-</span>'}</td>
      <td>${
        m.fornitore_cliente_id || '<span style="color: #999;">-</span>'
      }</td>
      <td class="text-right">
        <button class="btn-icon" onclick="deleteMovimento(${
          m.id
        })" title="Elimina">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
        </button>
      </td>
    </tr>
  `;
    })
    .join("");
}

// ==================== GESTIONE SEPARATORE DECIMALE ====================

// Rileva il separatore decimale del browser dell'utente
function getDecimalSeparator() {
  const numberWithDecimal = 1.1;
  const formatted = numberWithDecimal.toLocaleString();
  return formatted.charAt(1); // Restituisce '.' o ','
}

// Formatta numero con separatore corretto per l'utente
function formatNumberWithLocale(num) {
  const n = parseFloat(num);
  if (isNaN(n)) return "0";

  const separator = getDecimalSeparator();
  const formatted = n.toFixed(2);

  // Se il separatore locale è virgola, sostituisci il punto
  if (separator === ",") {
    return formatted.replace(".", ",");
  }

  return formatted;
}

// Aggiorna la funzione formatCurrency esistente
function formatCurrency(num) {
  const n = parseFloat(num);
  if (isNaN(n)) return "€ 0,00";

  return `€ ${formatNumber(n)}`;
}

// Aggiorna formatNumber per usare il separatore locale
function formatNumber(num) {
  const n = parseFloat(num);
  if (isNaN(n)) return "0";

  const separator = getDecimalSeparator();
  const parts = n.toFixed(2).split(".");

  // Aggiungi il punto ogni 3 cifre nella parte intera
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");

  // Usa il separatore decimale corretto
  if (separator === ",") {
    return parts.join(",");
  } else {
    return parts.join(".");
  }
}

// Formatta quantità: senza decimali se intero, altrimenti 2 decimali con virgola
function formatQuantity(num) {
  const n = parseFloat(num);
  if (isNaN(n)) return "0";
  if (Number.isInteger(n)) {
    return n.toString();
  }
  return formatNumber(n);
}

// ==================== GESTIONE INPUT DECIMALI (MAX 2 CIFRE) ====================

/**
 * Limita l'input a massimo 2 cifre decimali in tempo reale
 * Accetta sia punto che virgola come separatore
 */
function limitToTwoDecimals(inputElement) {
  inputElement.addEventListener("input", function (e) {
    let value = this.value;

    // Permetti solo numeri, punto e virgola
    value = value.replace(/[^\d.,]/g, "");

    // Sostituisci virgola con punto per gestione interna
    value = value.replace(",", ".");

    // Rimuovi punti multipli (mantieni solo il primo)
    const parts = value.split(".");
    if (parts.length > 2) {
      value = parts[0] + "." + parts.slice(1).join("");
    }

    // Limita i decimali a 2 cifre
    if (parts.length === 2) {
      if (parts[1].length > 2) {
        parts[1] = parts[1].substring(0, 2);
        value = parts.join(".");
      }
    }

    // Aggiorna il valore con virgola per visualizzazione italiana
    this.value = value.replace(".", ",");
  });

  // Formatta correttamente quando l'utente esce dal campo
  inputElement.addEventListener("blur", function (e) {
    let value = this.value;

    // Campo vuoto o solo separatore
    if (value === "" || value === "," || value === ".") {
      this.value = "";
      return;
    }

    // Converti in numero
    value = value.replace(",", ".");
    const num = parseFloat(value);

    if (!isNaN(num) && num >= 0) {
      // Formatta con esattamente 2 decimali e virgola
      this.value = num.toFixed(2).replace(".", ",");
    } else {
      this.value = "";
    }
  });

  // Previeni incolla di testo non valido
  inputElement.addEventListener("paste", function (e) {
    e.preventDefault();
    const pastedText = (e.clipboardData || window.clipboardData).getData(
      "text"
    );
    const cleaned = pastedText.replace(/[^\d.,]/g, "").replace(",", ".");
    const num = parseFloat(cleaned);

    if (!isNaN(num) && num >= 0) {
      this.value = num.toFixed(2).replace(".", ",");
    }
  });
}

/**
 * Converte il valore dell'input in numero float
 * Gestisce sia punto che virgola
 */
function parseDecimalInput(value) {
  if (!value || value === "") return 0;
  const cleaned = String(value).replace(",", ".");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/**
 * Applica la limitazione decimale agli input quantità e prezzo
 */
function setupDecimalInputs() {
  const quantitaInput = document.getElementById("movimentoQuantita");
  const prezzoInput = document.getElementById("movimentoPrezzo");

  if (quantitaInput) {
    // Rimuovi listener esistenti per evitare duplicati
    const newQuantitaInput = quantitaInput.cloneNode(true);
    quantitaInput.parentNode.replaceChild(newQuantitaInput, quantitaInput);
    limitToTwoDecimals(newQuantitaInput);
  }

  if (prezzoInput) {
    // Rimuovi listener esistenti per evitare duplicati
    const newPrezzoInput = prezzoInput.cloneNode(true);
    prezzoInput.parentNode.replaceChild(newPrezzoInput, prezzoInput);
    limitToTwoDecimals(newPrezzoInput);
  }
}

async function openMovimentoModal(movimento = null) {
  if (prodotti.length === 0) {
    const res = await fetch(`${API_URL}/prodotti`);
    prodotti = await res.json();
  }

  const modal = document.getElementById("modalMovimento");
  const title = document.getElementById("modalMovimentoTitle");
  const form = document.getElementById("formMovimento");
  const selectProdotto = document.getElementById("movimentoProdotto");

  form.reset();

  selectProdotto.innerHTML =
    '<option value="">Seleziona prodotto...</option>' +
    prodotti
      .map((p) => {
        const marcaNome = p.marca_nome
          ? ` (${p.marca_nome.toUpperCase()})`
          : "";
        return `<option value="${p.id}">${p.nome}${marcaNome}</option>`;
      })
      .join("");

  title.textContent = "Nuovo Movimento";
  document.getElementById("movimentoId").value = "";

  if (!movimento) {
    document.getElementById("giacenzaInfo").style.display = "none";
  }

  togglePrezzoField();

  // ⭐ APPLICA I CONTROLLI DECIMALI
  setTimeout(() => {
    setupDecimalInputs();
  }, 100);

  modal.classList.add("active");
}

async function openMovimentoModal(movimento = null) {
  if (prodotti.length === 0) {
    const res = await fetch(`${API_URL}/prodotti`);
    prodotti = await res.json();
  }

  const modal = document.getElementById("modalMovimento");
  const title = document.getElementById("modalMovimentoTitle");
  const form = document.getElementById("formMovimento");

  form.reset();

  title.textContent = "Nuovo Movimento";
  document.getElementById("movimentoId").value = "";

  if (!movimento) {
    document.getElementById("giacenzaInfo").style.display = "none";
  }

  // Reset search input
  document.getElementById("movimentoProdottoSearch").value = "";
  document.getElementById("movimentoProdotto").value = "";
  document.getElementById("prodottoSearchResults").classList.remove("show");

  togglePrezzoField();

  setTimeout(() => {
    setupDecimalInputs();
    setupProductSearch(); // 🎯 NUOVA FUNZIONE
  }, 100);

  modal.classList.add("active");
}

// ==================== RICERCA PRODOTTI NEL MOVIMENTO ====================

let selectedProdottoId = null;

function setupProductSearch() {
  const searchInput = document.getElementById("movimentoProdottoSearch");
  const hiddenInput = document.getElementById("movimentoProdotto");
  const resultsContainer = document.getElementById("prodottoSearchResults");

  if (!searchInput || !resultsContainer) return;

  // Reset selezione
  selectedProdottoId = null;
  searchInput.classList.remove("has-selection");

  // Ricerca mentre digiti
  searchInput.addEventListener("input", function (e) {
    const searchTerm = e.target.value.toLowerCase().trim();

    // Se l'utente modifica dopo aver selezionato, resetta la selezione
    if (selectedProdottoId !== null) {
      selectedProdottoId = null;
      hiddenInput.value = "";
      searchInput.classList.remove("has-selection");
      document.getElementById("giacenzaInfo").style.display = "none";
    }

    if (searchTerm.length === 0) {
      resultsContainer.classList.remove("show");
      resultsContainer.innerHTML = "";
      return;
    }

    // Filtra i prodotti
    const filtered = prodotti.filter((p) => {
      const nome = p.nome.toLowerCase();
      const marca = (p.marca_nome || "").toLowerCase();
      const descrizione = (p.descrizione || "").toLowerCase();

      return (
        nome.includes(searchTerm) ||
        marca.includes(searchTerm) ||
        descrizione.includes(searchTerm)
      );
    });

    renderProductSearchResults(filtered, searchTerm);
  });

  // Chiudi risultati cliccando fuori
  document.addEventListener("click", function (e) {
    if (
      !searchInput.contains(e.target) &&
      !resultsContainer.contains(e.target)
    ) {
      resultsContainer.classList.remove("show");
    }
  });

  // Focus apre i risultati se c'è testo
  searchInput.addEventListener("focus", function () {
    if (this.value.trim().length > 0 && resultsContainer.children.length > 0) {
      resultsContainer.classList.add("show");
    }
  });
}

function renderProductSearchResults(filtered, searchTerm) {
  const resultsContainer = document.getElementById("prodottoSearchResults");

  if (filtered.length === 0) {
    resultsContainer.innerHTML = `
      <div class="search-no-results">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 32px; height: 32px; margin: 0 auto 8px; opacity: 0.5;">
          <circle cx="11" cy="11" r="8"/>
          <path d="M21 21l-4.35-4.35"/>
        </svg>
        Nessun prodotto trovato per "<strong>${searchTerm}</strong>"
      </div>
    `;
    resultsContainer.classList.add("show");
    return;
  }

  resultsContainer.innerHTML = filtered
    .map((p) => {
      const marcaBadge = p.marca_nome
        ? `<span class="search-result-marca">${p.marca_nome.toUpperCase()}</span>`
        : "";

      const giacenzaBadge = `<span class="search-result-giacenza">${formatQuantity(
        p.giacenza || 0
      )} pz</span>`;

      return `
      <div class="search-result-item" data-id="${p.id}" data-nome="${
        p.nome
      }" data-marca="${p.marca_nome || ""}" data-giacenza="${p.giacenza || 0}">
        <div class="search-result-name">${highlightMatch(
          p.nome,
          searchTerm
        )}</div>
        <div class="search-result-meta">
          ${marcaBadge}
          ${giacenzaBadge}
          ${
            p.descrizione
              ? `<span style="opacity: 0.7;">• ${p.descrizione.substring(
                  0,
                  40
                )}${p.descrizione.length > 40 ? "..." : ""}</span>`
              : ""
          }
        </div>
      </div>
    `;
    })
    .join("");

  // Aggiungi event listener ai risultati
  resultsContainer.querySelectorAll(".search-result-item").forEach((item) => {
    item.addEventListener("click", function () {
      selectProduct(
        this.dataset.id,
        this.dataset.nome,
        this.dataset.marca,
        this.dataset.giacenza
      );
    });
  });

  resultsContainer.classList.add("show");
}

function highlightMatch(text, searchTerm) {
  if (!searchTerm) return text;

  const regex = new RegExp(`(${searchTerm})`, "gi");
  return text.replace(
    regex,
    '<mark style="background: #fef08a; padding: 2px 4px; border-radius: 3px; font-weight: 700;">$1</mark>'
  );
}

function selectProduct(id, nome, marca, giacenza) {
  const searchInput = document.getElementById("movimentoProdottoSearch");
  const hiddenInput = document.getElementById("movimentoProdotto");
  const resultsContainer = document.getElementById("prodottoSearchResults");

  selectedProdottoId = id;
  hiddenInput.value = id;

  // Mostra il nome selezionato nell'input
  const displayText = marca ? `${nome} (${marca.toUpperCase()})` : nome;
  searchInput.value = displayText;
  searchInput.classList.add("has-selection");

  // Chiudi risultati
  resultsContainer.classList.remove("show");

  // Mostra giacenza
  showGiacenzaInfo(id);
}

// script.js (Intorno a riga 485)
function togglePrezzoField() {
  // 🎯 CORREZIONE: Controlla se l'elemento esiste prima di usarlo
  const tipoElement = document.getElementById("movimentoTipo");

  if (!tipoElement) {
    // L'elemento non è stato trovato (è null).
    // Interrompi la funzione per evitare il crash.
    // Puoi anche aggiungere un console.error per debugging.
    console.error("Elemento 'movimentoTipo' non trovato.");
    return;
  }

  // Usa il valore solo dopo aver verificato che l'elemento esiste
  const tipo = tipoElement.value;

  const prezzoGroup = document.getElementById("prezzoGroup");
  const prezzoInput = document.getElementById("movimentoPrezzo");
  const fornitoreGroup = document.getElementById("fornitoreGroup");
  const fatturaInput = document.getElementById("movimentoFattura");
  const fornitoreInput = document.getElementById("movimentoFornitore");
  const docOptional = document.getElementById("docOptional");
  const fornitoreOptional = document.getElementById("fornitoreOptional");

  // Utilizzo di closest() per trovare l'antenato .form-group
  const fatturaGroup = fatturaInput
    ? fatturaInput.closest(".form-group")
    : null;

  // CHANGE: Gestione anche dell'opzione vuota (nessuna selezione)
  if (tipo === "carico") {
    if (prezzoGroup) prezzoGroup.style.display = "block";
    if (prezzoInput) prezzoInput.required = true;
    if (fornitoreGroup) fornitoreGroup.style.display = "block";
    if (fatturaGroup) fatturaGroup.style.display = "block";
    if (fatturaInput) fatturaInput.required = true;
    if (fornitoreInput) fornitoreInput.required = true;
    if (docOptional) docOptional.textContent = "*";
    if (fornitoreOptional) fornitoreOptional.textContent = "*";
  } else {
    // Per 'scarico' o valore vuoto, nascondi i campi
    if (prezzoGroup) prezzoGroup.style.display = "none";
    if (prezzoInput) {
      prezzoInput.required = false;
      prezzoInput.value = "";
    }
    if (fornitoreGroup) fornitoreGroup.style.display = "none";
    if (fatturaGroup) fatturaGroup.style.display = "none";
    if (fornitoreInput) fornitoreInput.value = "";
    if (fatturaInput) fatturaInput.value = "";
    if (fatturaInput) fatturaInput.required = false;
    if (fornitoreInput) fornitoreInput.required = false;
    if (docOptional) docOptional.textContent = "";
    if (fornitoreOptional) fornitoreOptional.textContent = "";
  }
}

// script.js (Intorno a riga 1120, o dove si trova la tua funzione searchProducts)
function searchProducts() {
  const searchInput = document.getElementById("movimentoProdottoSearch");
  const resultsContainer = document.getElementById("prodottoSearchResults");
  const searchTerm = searchInput.value.toLowerCase().trim();

  // 🎯 CORREZIONE: Se il termine di ricerca è vuoto, mostra TUTTI i prodotti.
  const filteredProducts = allProdotti.filter((p) => {
    if (!searchTerm) {
      // Se la ricerca è vuota, includi tutti i prodotti (pulisci il filtro)
      return true;
    }

    // Logica di ricerca esistente (cerca in nome, marca, descrizione)
    const matchesNome = p.nome.toLowerCase().includes(searchTerm);
    const matchesMarca = p.marca.toLowerCase().includes(searchTerm);
    const matchesDescrizione = p.descrizione
      ? p.descrizione.toLowerCase().includes(searchTerm)
      : false;

    return matchesNome || matchesMarca || matchesDescrizione;
  });

  if (filteredProducts.length === 0) {
    resultsContainer.innerHTML = `<div class="search-no-results">Nessun prodotto trovato.</div>`;
    resultsContainer.classList.add("show");
    return;
  }

  // Costruisci l'HTML per i risultati
  resultsContainer.innerHTML = filteredProducts
    .map((p) => {
      const nomeHighlighted = highlightMatch(p.nome, searchTerm);
      const marcaHighlighted = highlightMatch(p.marca, searchTerm);

      return `
      <div 
        class="search-result-item" 
        data-id="${p.id}" 
        data-nome="${p.nome}" 
        data-marca="${p.marca}" 
        data-giacenza="${p.giacenza}"
      >
        <div class="search-result-header">
          <div class="search-result-title">${nomeHighlighted}</div>
          <div class="search-result-meta">
            <span class="search-result-marca">${marcaHighlighted}</span>
            <span class="search-result-giacenza">Giacenza: ${formatQuantity(p.giacenza)} pz</span>
          </div>
        </div>
        <div class="search-result-body">
          ${
            p.descrizione
              ? `<span style="opacity: 0.7; font-size: 13px;">• ${p.descrizione.substring(
                  0,
                  40
                )}${p.descrizione.length > 40 ? "..." : ""}</span>`
              : ""
          }
        </div>
      </div>
    `;
    })
    .join("");

  // Aggiungi event listener ai risultati
  resultsContainer.querySelectorAll(".search-result-item").forEach((item) => {
    item.addEventListener("click", function () {
      selectProduct(
        this.dataset.id,
        this.dataset.nome,
        this.dataset.marca,
        this.dataset.giacenza
      );
    });
  });

  resultsContainer.classList.add("show");
}

function togglePrezzoField() {
  const tipoElement = document.getElementById("movimentoTipo");

  if (!tipoElement) {
    console.error("Elemento 'movimentoTipo' non trovato.");
    return;
  }

  const tipo = tipoElement.value;

  const prezzoGroup = document.getElementById("prezzoGroup"); // 👈 Gruppo Prezzo Unitario
  const prezzoInput = document.getElementById("movimentoPrezzo");
  const fornitoreGroup = document.getElementById("fornitoreGroup"); // 👈 Gruppo Fornitore
  const fatturaInput = document.getElementById("movimentoFattura");
  const fornitoreInput = document.getElementById("movimentoFornitore");
  const docOptional = document.getElementById("docOptional");
  const fornitoreOptional = document.getElementById(
    "movimentoFornitoreOptional"
  );

  const fatturaGroup = fatturaInput
    ? fatturaInput.closest(".form-group")
    : null; // 👈 Gruppo Documento (Fattura)

  // =================================================================
  // LOGICA CARICO (tutti i campi visibili e richiesti)
  // =================================================================
  if (tipo === "carico") {
    if (prezzoGroup) prezzoGroup.style.display = "block"; // ✅ MOSTRA Prezzo Unitario
    if (prezzoInput) prezzoInput.required = true;
    if (fornitoreGroup) fornitoreGroup.style.display = "block"; // ✅ MOSTRA Fornitore
    if (fatturaGroup) fatturaGroup.style.display = "block"; // ✅ MOSTRA Documento
    if (fatturaInput) fatturaInput.required = true;
    if (fornitoreInput) fornitoreInput.required = true;
    if (docOptional) docOptional.textContent = "*";
    if (fornitoreOptional) fornitoreOptional.textContent = "*";
  }
  // =================================================================
  // LOGICA SCARICO (campi nascosti, non richiesti e resettati)
  // =================================================================
  else {
    // Per 'scarico' o valore vuoto, nascondi i campi
    if (prezzoGroup) prezzoGroup.style.display = "none";
    if (prezzoInput) {
      prezzoInput.required = false;
      prezzoInput.value = "";
    }
    if (fornitoreGroup) fornitoreGroup.style.display = "none";
    if (fatturaGroup) fatturaGroup.style.display = "none";
    if (fornitoreInput) fornitoreInput.value = "";
    if (fatturaInput) fatturaInput.value = "";
    if (fatturaInput) fatturaInput.required = false;
    if (fornitoreInput) fornitoreInput.required = false;
    if (docOptional) docOptional.textContent = "";
    if (fornitoreOptional) fornitoreOptional.textContent = "";
  }
}
function searchProducts() {
  const searchInput = document.getElementById("movimentoProdottoSearch");
  const resultsContainer = document.getElementById("prodottoSearchResults");
  const searchTerm = searchInput.value.toLowerCase().trim();

  // 🎯 LOGICA CHIAVE: Filtra i prodotti. Se la ricerca è vuota, include TUTTI i prodotti.
  const filteredProducts = allProdotti.filter((p) => {
    // Se la stringa di ricerca è vuota (searchTerm === ""),
    // l'espressione !searchTerm è true e restituisce tutti gli elementi.
    if (!searchTerm) {
      return true;
    }

    // Logica di ricerca esistente (solo quando c'è un termine inserito)
    const matchesNome = p.nome.toLowerCase().includes(searchTerm);
    const matchesMarca = p.marca.toLowerCase().includes(searchTerm);
    const matchesDescrizione = p.descrizione
      ? p.descrizione.toLowerCase().includes(searchTerm)
      : false;

    return matchesNome || matchesMarca || matchesDescrizione;
  });

  // Se non ci sono prodotti filtrati (e non erano tutti i prodotti)
  if (filteredProducts.length === 0) {
    resultsContainer.innerHTML = `<div class="search-no-results">Nessun prodotto trovato.</div>`;
    resultsContainer.classList.add("show");
    return;
  }

  // Costruisci l'HTML per i risultati
  resultsContainer.innerHTML = filteredProducts
    .map((p) => {
      // highlightMatch è una funzione di supporto che probabilmente hai già
      const nomeHighlighted = highlightMatch(p.nome, searchTerm);
      const marcaHighlighted = highlightMatch(p.marca, searchTerm);

      return `
      <div 
        class="search-result-item" 
        data-id="${p.id}" 
        data-nome="${p.nome}" 
        data-marca="${p.marca}" 
        data-giacenza="${p.giacenza}"
      >
        <div class="search-result-header">
          <div class="search-result-title">${nomeHighlighted}</div>
          <div class="search-result-meta">
            <span class="search-result-marca">${marcaHighlighted}</span>
            <span class="search-result-giacenza">Giacenza: ${formatQuantity(p.giacenza)} pz</span>
          </div>
        </div>
        <div class="search-result-body">
          ${
            p.descrizione
              ? `<span style="opacity: 0.7; font-size: 13px;">• ${p.descrizione.substring(
                  0,
                  40
                )}${p.descrizione.length > 40 ? "..." : ""}</span>`
              : ""
          }
        </div>
      </div>
    `;
    })
    .join("");

  // Aggiungi event listener ai risultati
  resultsContainer.querySelectorAll(".search-result-item").forEach((item) => {
    item.addEventListener("click", function () {
      selectProduct(
        this.dataset.id,
        this.dataset.nome,
        this.dataset.marca,
        this.dataset.giacenza
      );
    });
  });

  // Assicura che il contenitore dei risultati sia visibile
  resultsContainer.classList.add("show");
}

function searchProducts() {
  const searchInput = document.getElementById("movimentoProdottoSearch");
  const resultsContainer = document.getElementById("prodottoSearchResults");
  const searchTerm = searchInput.value.toLowerCase().trim();

  // 🎯 Filtra i prodotti: se vuoto mostra TUTTI, altrimenti filtra
  const filteredProducts = allProdotti.filter((p) => {
    // Se non c'è testo di ricerca, mostra tutti i prodotti
    if (!searchTerm) {
      return true;
    }

    // Altrimenti filtra in base al termine di ricerca
    const matchesNome = p.nome.toLowerCase().includes(searchTerm);
    const matchesMarca = (p.marca_nome || "")
      .toLowerCase()
      .includes(searchTerm);
    const matchesDescrizione = p.descrizione
      ? p.descrizione.toLowerCase().includes(searchTerm)
      : false;

    return matchesNome || matchesMarca || matchesDescrizione;
  });

  // Se nessun prodotto trovato
  if (filteredProducts.length === 0) {
    resultsContainer.innerHTML = `
      <div class="search-no-results">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 32px; height: 32px; margin: 0 auto 8px; opacity: 0.5;">
          <circle cx="11" cy="11" r="8"/>
          <path d="M21 21l-4.35-4.35"/>
        </svg>
        Nessun prodotto trovato per "<strong>${searchTerm}</strong>"
      </div>
    `;
    resultsContainer.classList.add("show");
    return;
  }

  // Costruisci l'HTML per i risultati
  resultsContainer.innerHTML = filteredProducts
    .map((p) => {
      const nomeHighlighted = highlightMatch(p.nome, searchTerm);
      const marcaHighlighted = highlightMatch(p.marca_nome || "", searchTerm);

      return `
      <div 
        class="search-result-item" 
        data-id="${p.id}" 
        data-nome="${p.nome}" 
        data-marca="${p.marca_nome || ""}" 
        data-giacenza="${p.giacenza || 0}"
      >
        <div class="search-result-name">${nomeHighlighted}</div>
        <div class="search-result-meta">
          ${
            p.marca_nome
              ? `<span class="search-result-marca">${marcaHighlighted}</span>`
              : ""
          }
          <span class="search-result-giacenza">${formatQuantity(p.giacenza || 0)} pz</span>
          ${
            p.descrizione
              ? `<span style="opacity: 0.7;">• ${p.descrizione.substring(
                  0,
                  40
                )}${p.descrizione.length > 40 ? "..." : ""}</span>`
              : ""
          }
        </div>
      </div>
    `;
    })
    .join("");

  // Aggiungi event listener ai risultati
  resultsContainer.querySelectorAll(".search-result-item").forEach((item) => {
    item.addEventListener("click", function () {
      selectProduct(
        this.dataset.id,
        this.dataset.nome,
        this.dataset.marca,
        this.dataset.giacenza
      );
    });
  });

  resultsContainer.classList.add("show");
}

function searchProducts() {
  const searchInput = document.getElementById("movimentoProdottoSearch");
  const resultsContainer = document.getElementById("prodottoSearchResults");
  const searchTerm = searchInput.value.toLowerCase().trim();

  // 🎯 Filtra i prodotti: se vuoto mostra TUTTI, altrimenti filtra
  const filteredProducts = allProdotti.filter((p) => {
    // Se non c'è testo di ricerca, mostra tutti i prodotti
    if (!searchTerm) {
      return true;
    }

    // Altrimenti filtra in base al termine di ricerca
    const matchesNome = p.nome.toLowerCase().includes(searchTerm);
    const matchesMarca = (p.marca_nome || "")
      .toLowerCase()
      .includes(searchTerm);
    const matchesDescrizione = p.descrizione
      ? p.descrizione.toLowerCase().includes(searchTerm)
      : false;

    return matchesNome || matchesMarca || matchesDescrizione;
  });

  // Se nessun prodotto trovato
  if (filteredProducts.length === 0) {
    resultsContainer.innerHTML = `
      <div class="search-no-results">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 32px; height: 32px; margin: 0 auto 8px; opacity: 0.5;">
          <circle cx="11" cy="11" r="8"/>
          <path d="M21 21l-4.35-4.35"/>
        </svg>
        Nessun prodotto trovato per "<strong>${searchTerm}</strong>"
      </div>
    `;
    resultsContainer.classList.add("show");
    return;
  }

  // Costruisci l'HTML per i risultati
  resultsContainer.innerHTML = filteredProducts
    .map((p) => {
      const nomeHighlighted = highlightMatch(p.nome, searchTerm);
      const marcaHighlighted = highlightMatch(p.marca_nome || "", searchTerm);

      return `
      <div 
        class="search-result-item" 
        data-id="${p.id}" 
        data-nome="${p.nome}" 
        data-marca="${p.marca_nome || ""}" 
        data-giacenza="${p.giacenza || 0}"
      >
        <div class="search-result-name">${nomeHighlighted}</div>
        <div class="search-result-meta">
          ${
            p.marca_nome
              ? `<span class="search-result-marca">${marcaHighlighted}</span>`
              : ""
          }
          <span class="search-result-giacenza">${formatQuantity(p.giacenza || 0)} pz</span>
          ${
            p.descrizione
              ? `<span style="opacity: 0.7;">• ${p.descrizione.substring(
                  0,
                  40
                )}${p.descrizione.length > 40 ? "..." : ""}</span>`
              : ""
          }
        </div>
      </div>
    `;
    })
    .join("");

  // Aggiungi event listener ai risultati
  resultsContainer.querySelectorAll(".search-result-item").forEach((item) => {
    item.addEventListener("click", function () {
      selectProduct(
        this.dataset.id,
        this.dataset.nome,
        this.dataset.marca,
        this.dataset.giacenza
      );
    });
  });

  resultsContainer.classList.add("show");
}

function searchProducts() {
  const searchInput = document.getElementById("movimentoProdottoSearch");
  const resultsContainer = document.getElementById("prodottoSearchResults");

  if (!searchInput || !resultsContainer) return;

  const searchTerm = searchInput.value.toLowerCase().trim();

  // 🎯 Filtra i prodotti: se vuoto mostra TUTTI, altrimenti filtra
  const filteredProducts = allProdotti.filter((p) => {
    // Se non c'è testo di ricerca, mostra tutti i prodotti
    if (!searchTerm) {
      return true;
    }

    // Altrimenti filtra in base al termine di ricerca
    const matchesNome = p.nome.toLowerCase().includes(searchTerm);
    const matchesMarca = (p.marca_nome || "")
      .toLowerCase()
      .includes(searchTerm);
    const matchesDescrizione = p.descrizione
      ? p.descrizione.toLowerCase().includes(searchTerm)
      : false;

    return matchesNome || matchesMarca || matchesDescrizione;
  });

  // Se nessun prodotto trovato (solo quando c'è una ricerca attiva)
  if (filteredProducts.length === 0 && searchTerm) {
    resultsContainer.innerHTML = `
      <div class="search-no-results">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 32px; height: 32px; margin: 0 auto 8px; opacity: 0.5;">
          <circle cx="11" cy="11" r="8"/>
          <path d="M21 21l-4.35-4.35"/>
        </svg>
        Nessun prodotto trovato per "<strong>${searchTerm}</strong>"
      </div>
    `;
    resultsContainer.classList.add("show");
    return;
  }

  // Se non ci sono prodotti in assoluto nel sistema
  if (filteredProducts.length === 0 && !searchTerm) {
    resultsContainer.innerHTML = `
      <div class="search-no-results">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 32px; height: 32px; margin: 0 auto 8px; opacity: 0.5;">
          <circle cx="11" cy="11" r="8"/>
          <path d="M21 21l-4.35-4.35"/>
        </svg>
        Nessun prodotto disponibile
      </div>
    `;
    resultsContainer.classList.add("show");
    return;
  }

  // Costruisci l'HTML per i risultati
  resultsContainer.innerHTML = filteredProducts
    .map((p) => {
      const nomeHighlighted = highlightMatch(p.nome, searchTerm);
      const marcaHighlighted = highlightMatch(p.marca_nome || "", searchTerm);

      return `
      <div 
        class="search-result-item" 
        data-id="${p.id}" 
        data-nome="${p.nome}" 
        data-marca="${p.marca_nome || ""}" 
        data-giacenza="${p.giacenza || 0}"
      >
        <div class="search-result-name">${nomeHighlighted}</div>
        <div class="search-result-meta">
          ${
            p.marca_nome
              ? `<span class="search-result-marca">${marcaHighlighted}</span>`
              : ""
          }
          <span class="search-result-giacenza">${formatQuantity(p.giacenza || 0)} pz</span>
          ${
            p.descrizione
              ? `<span style="opacity: 0.7;">• ${p.descrizione.substring(
                  0,
                  40
                )}${p.descrizione.length > 40 ? "..." : ""}</span>`
              : ""
          }
        </div>
      </div>
    `;
    })
    .join("");

  // Aggiungi event listener ai risultati
  resultsContainer.querySelectorAll(".search-result-item").forEach((item) => {
    item.addEventListener("click", function () {
      selectProduct(
        this.dataset.id,
        this.dataset.nome,
        this.dataset.marca,
        this.dataset.giacenza
      );
    });
  });

  resultsContainer.classList.add("show");
}

function searchProducts() {
  const searchInput = document.getElementById("movimentoProdottoSearch");
  const resultsContainer = document.getElementById("prodottoSearchResults");

  if (!searchInput || !resultsContainer) {
    console.error("Elementi search non trovati");
    return;
  }

  const searchTerm = searchInput.value.toLowerCase().trim();

  console.log("searchProducts chiamata - searchTerm:", searchTerm);
  console.log("allProdotti disponibili:", allProdotti ? allProdotti.length : 0);

  // Verifica che allProdotti sia definito e non vuoto
  if (!allProdotti || allProdotti.length === 0) {
    resultsContainer.innerHTML = `
      <div class="search-no-results">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 32px; height: 32px; margin: 0 auto 8px; opacity: 0.5;">
          <circle cx="11" cy="11" r="8"/>
          <path d="M21 21l-4.35-4.35"/>
        </svg>
        Nessun prodotto disponibile nel sistema
      </div>
    `;
    resultsContainer.classList.add("show");
    return;
  }

  // 🎯 Filtra i prodotti: se vuoto mostra TUTTI, altrimenti filtra
  const filteredProducts = allProdotti.filter((p) => {
    // Se non c'è testo di ricerca, mostra tutti i prodotti
    if (!searchTerm || searchTerm === "") {
      return true;
    }

    // Altrimenti filtra in base al termine di ricerca
    const matchesNome = p.nome.toLowerCase().includes(searchTerm);
    const matchesMarca = (p.marca_nome || "")
      .toLowerCase()
      .includes(searchTerm);
    const matchesDescrizione = p.descrizione
      ? p.descrizione.toLowerCase().includes(searchTerm)
      : false;

    return matchesNome || matchesMarca || matchesDescrizione;
  });

  console.log("Prodotti filtrati:", filteredProducts.length);

  // Se nessun prodotto trovato dopo il filtro
  if (filteredProducts.length === 0) {
    resultsContainer.innerHTML = `
      <div class="search-no-results">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 32px; height: 32px; margin: 0 auto 8px; opacity: 0.5;">
          <circle cx="11" cy="11" r="8"/>
          <path d="M21 21l-4.35-4.35"/>
        </svg>
        Nessun prodotto trovato per "<strong>${searchTerm}</strong>"
      </div>
    `;
    resultsContainer.classList.add("show");
    return;
  }

  // Costruisci l'HTML per i risultati
  resultsContainer.innerHTML = filteredProducts
    .map((p) => {
      const nomeHighlighted = highlightMatch(p.nome, searchTerm);
      const marcaHighlighted = highlightMatch(p.marca_nome || "", searchTerm);

      return `
      <div 
        class="search-result-item" 
        data-id="${p.id}" 
        data-nome="${p.nome}" 
        data-marca="${p.marca_nome || ""}" 
        data-giacenza="${p.giacenza || 0}"
      >
        <div class="search-result-name">${nomeHighlighted}</div>
        <div class="search-result-meta">
          ${
            p.marca_nome
              ? `<span class="search-result-marca">${marcaHighlighted}</span>`
              : ""
          }
          <span class="search-result-giacenza">${formatQuantity(p.giacenza || 0)} pz</span>
          ${
            p.descrizione
              ? `<span style="opacity: 0.7;">• ${p.descrizione.substring(
                  0,
                  40
                )}${p.descrizione.length > 40 ? "..." : ""}</span>`
              : ""
          }
        </div>
      </div>
    `;
    })
    .join("");

  // Aggiungi event listener ai risultati
  resultsContainer.querySelectorAll(".search-result-item").forEach((item) => {
    item.addEventListener("click", function () {
      selectProduct(
        this.dataset.id,
        this.dataset.nome,
        this.dataset.marca,
        this.dataset.giacenza
      );
    });
  });

  resultsContainer.classList.add("show");
  console.log("Dropdown mostrato con", filteredProducts.length, "prodotti");
}

// File: script.js

/**
 * Converte il valore dell'input in numero float.
 * Gestisce sia punto che virgola, convertendo tutto in punto per il parseFloat.
 */
function parseDecimalInput(value) {
  if (!value || value === "") return 0;
  const cleaned = String(value).replace(",", ".");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/**
 * Limita l'input a massimo 2 cifre decimali in tempo reale.
 * Usa toFixed(2) per visualizzare sempre lo zero finale (es. 0.5 diventa 0.50).
 */
function limitToTwoDecimals(inputElement) {
  // Listener per la digitazione in tempo reale
  inputElement.addEventListener("input", function (e) {
    let value = this.value;
    // Rimuovi caratteri non validi
    let cleaned = value.replace(/[^\d.,]/g, "");

    // ... (Logica per la gestione di separatori multipli)

    const valueAsDot = cleaned.replace(",", ".");
    const num = parseFloat(valueAsDot);

    if (isNaN(num)) {
      this.value = "";
      return;
    }

    if (num > 0) {
      // PUNTO CHIAVE: Forzatura a 2 decimali.
      // Se 'num' è 1.5, .toFixed(2) lo converte in "1.50".
      this.value = num.toFixed(2).replace(".", getDecimalSeparator());
    } else {
      this.value = cleaned;
    }
  });

  // Listener per l'incolla da clipboard (stessa logica di forzatura)
  inputElement.addEventListener("paste", function (e) {
    e.preventDefault();
    const pastedText = (e.clipboardData || window.clipboardData).getData(
      "text"
    );
    const cleaned = pastedText.replace(/[^\d.,]/g, "").replace(",", ".");
    const num = parseFloat(cleaned);

    if (!isNaN(num) && num >= 0) {
      // Forzatura a 2 decimali anche all'atto di incollare.
      this.value = num.toFixed(2).replace(".", getDecimalSeparator());
    }
  });
}

// File: script.js

// Determina il separatore decimale locale (virgola o punto)
function getDecimalSeparator() {
  const numberWithDecimal = 1.1;
  const localeString = numberWithDecimal.toLocaleString(undefined, {
    minimumFractionDigits: 1,
  });
  return localeString.includes(".") ? "." : ",";
}

/**
 * Formatta numero con separatore corretto per l'utente,
 * garantendo sempre 2 decimali con toFixed(2).
 */
function formatNumber(num) {
  const n = parseFloat(num);
  if (isNaN(n)) return "0";
  const separator = getDecimalSeparator();
  // PUNTO CHIAVE: toFixed(2) garantisce lo zero finale per la visualizzazione.
  const parts = n.toFixed(2).split(".");

  // Aggiungi il punto ogni 3 cifre nella parte intera
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");

  // Usa il separatore decimale corretto
  if (separator === ",") {
    return parts.join(",");
  } else {
    return parts.join(".");
  }
}

// Formatta un numero come valuta (es. € 1.234,56)
function formatCurrency(num) {
  const n = parseFloat(num);
  if (isNaN(n)) return "€ 0,00";
  return `€ ${formatNumber(n)}`;
}

// ==================== FUNZIONI DI UTILITA (già presenti) ====================

// Determina il separatore decimale locale (virgola o punto)
function getDecimalSeparator() {
  const numberWithDecimal = 1.1;
  const localeString = numberWithDecimal.toLocaleString(undefined, {
    minimumFractionDigits: 1,
  });
  return localeString.includes(".") ? "." : ",";
}

/**
 * Converte il valore dell'input in numero float.
 * Gestisce sia punto che virgola, convertendo tutto in punto per il parseFloat.
 */
function parseDecimalInput(value) {
  if (!value || value === "") return 0;
  const cleaned = String(value).replace(",", ".");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

// ==================== NUOVE FUNZIONI CORRETTE ====================

/**
 * Limita l'input a massimo 2 cifre decimali, evitando di bloccare la digitazione.
 * La formattazione finale a .00 viene applicata solo al BLUR.
 *
 */
function limitToTwoDecimals(inputElement) {
  const separator = getDecimalSeparator();
  const separatorRegex = separator === "." ? /\./g : /,/g;

  // 1. Listener per la digitazione in tempo reale (solo pulizia)
  inputElement.addEventListener("input", function (e) {
    let value = this.value;

    // Rimuovi tutti i caratteri non numerici, punti e virgole
    let cleaned = value.replace(/[^\d.,]/g, "");

    // Assicurati che ci sia al massimo UN separatore decimale
    const parts = cleaned.split(separatorRegex);

    if (parts.length > 2) {
      // Se ci sono troppi separatori, mantiene solo il primo
      cleaned = parts[0] + separator + parts.slice(1).join("");
    } else if (parts.length === 2) {
      // Limita a 2 cifre dopo il separatore, ma non applica toFixed(2)
      parts[1] = parts[1].substring(0, 2);
      cleaned = parts[0] + separator + parts[1];
    }

    // Imposta il valore pulito (PERMETTE DI DIGITARE 1,2 E NON FORZA 1,20)
    this.value = cleaned;
  });

  // 2. Listener per il BLUR (quando l'utente esce dal campo) - Applica toFixed(2)
  inputElement.addEventListener("blur", function (e) {
    let value = this.value;
    const num = parseDecimalInput(value);

    if (!isNaN(num) && value !== "") {
      // PUNTO CHIAVE: Applica toFixed(2) solo quando si esce dal campo
      this.value = num.toFixed(2).replace(".", getDecimalSeparator());
    } else if (value === "") {
      // Se il campo è vuoto, lo imposta a 0.00
      this.value = `0${separator}00`;
    }
  });

  // Listener per l'incolla da clipboard (mantiene la formattazione forzata, è più sicuro)
  inputElement.addEventListener("paste", function (e) {
    e.preventDefault();
    const pastedText = (e.clipboardData || window.clipboardData).getData(
      "text"
    );

    const cleaned = pastedText.replace(/[^\d.,]/g, "").replace(",", ".");
    const num = parseFloat(cleaned);

    if (!isNaN(num) && num >= 0) {
      // Formatta a 2 decimali e usa il separatore decimale locale
      this.value = num.toFixed(2).replace(".", getDecimalSeparator());
    }
  });
}

// File: script.js

/**
 * Formatta numero con separatore corretto per l'utente,
 * garantendo sempre 2 decimali con toFixed(2).
 */
function formatNumber(num) {
  const n = parseFloat(num);
  if (isNaN(n)) return "0";
  const separator = getDecimalSeparator();
  // toFixed(2) forza 2 cifre decimali (es. 0.5 -> "0.50")
  const parts = n.toFixed(2).split(".");

  // ... logica separatore migliaia ...

  // Usa il separatore decimale corretto
  if (separator === ",") {
    return parts.join(",");
  } else {
    return parts.join(".");
  }
}

// Formatta un numero come valuta (es. € 1.234,56)
function formatCurrency(num) {
  const n = parseFloat(num);
  if (isNaN(n)) return "€ 0,00";
  return `€ ${formatNumber(n)}`;
}

// File: script.js

// Determina il separatore decimale locale (virgola o punto)
function getDecimalSeparator() {
  const numberWithDecimal = 1.1;
  const localeString = numberWithDecimal.toLocaleString(undefined, {
    minimumFractionDigits: 1,
  });
  return localeString.includes(".") ? "." : ",";
}

/**
 * Converte il valore dell'input in numero float.
 * Gestisce sia punto che virgola, convertendo tutto in punto per il parseFloat.
 */
function parseDecimalInput(value) {
  if (!value || value === "") return 0;
  const cleaned = String(value).replace(",", ".");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

// File: script.js

/**
 * Limita l'input a massimo 2 cifre decimali durante la digitazione
 * e forza la formattazione a due decimali (.00) all'uscita dal campo (blur).
 */
function limitToTwoDecimals(inputElement) {
  const separator = getDecimalSeparator();
  // Crea una regex per dividere in base al separatore locale
  const separatorRegex = separator === "." ? /\./g : /,/g;

  // 1. Listener per la digitazione in tempo reale (ENFORCES MAX 2 DECIMALI)
  inputElement.addEventListener("input", function (e) {
    let value = this.value;

    // Rimuovi tutti i caratteri non numerici, punti e virgole
    let cleaned = value.replace(/[^\d.,]/g, "");

    // Dividi la stringa in parte intera e parte decimale
    const parts = cleaned.split(separatorRegex);

    if (parts.length > 2) {
      // Gestione di separatori multipli inseriti per errore
      cleaned = parts[0] + separator + parts.slice(1).join("");
    } else if (parts.length === 2) {
      // PUNTO CHIAVE: Limita la parte decimale a 2 caratteri (cifre)
      parts[1] = parts[1].substring(0, 2);
      cleaned = parts[0] + separator + parts[1];
    }

    // Aggiorna il valore pulito (l'utente non vedrà mai più di due decimali)
    this.value = cleaned;
  });

  // 2. Listener per il BLUR (quando l'utente esce dal campo) - FORZA .00
  inputElement.addEventListener("blur", function (e) {
    let value = this.value;
    const num = parseDecimalInput(value);

    if (!isNaN(num) && value !== "") {
      // Applica toFixed(2) per formattare con due decimali (es. 0.5 -> 0.50)
      this.value = num.toFixed(2).replace(".", getDecimalSeparator());
    } else if (value === "") {
      // Se il campo è vuoto, lo imposta a 0.00
      this.value = `0${separator}00`;
    }
  });

  // 3. Listener per l'incolla da clipboard
  inputElement.addEventListener("paste", function (e) {
    e.preventDefault();
    const pastedText = (e.clipboardData || window.clipboardData).getData(
      "text"
    );

    const cleaned = pastedText.replace(/[^\d.,]/g, "").replace(",", ".");
    const num = parseFloat(cleaned);

    if (!isNaN(num) && num >= 0) {
      // Formatta a 2 decimali anche quando si incolla
      this.value = num.toFixed(2).replace(".", getDecimalSeparator());
    }
  });
}

/**
 * Applica la limitazione decimale agli input quantità e prezzo
 * Questa funzione dovrebbe essere chiamata all'apertura del modal Movimenti.
 */
function setupDecimalInputs() {
  const quantitaInput = document.getElementById("movimentoQuantita");
  const prezzoInput = document.getElementById("movimentoPrezzo");

  // Clonare e sostituire per rimuovere listener precedenti
  if (quantitaInput) {
    const newQuantitaInput = quantitaInput.cloneNode(true);
    quantitaInput.parentNode.replaceChild(newQuantitaInput, quantitaInput);
    limitToTwoDecimals(newQuantitaInput);
  }

  if (prezzoInput) {
    const newPrezzoInput = prezzoInput.cloneNode(true);
    prezzoInput.parentNode.replaceChild(newPrezzoInput, prezzoInput);
    limitToTwoDecimals(newPrezzoInput);
  }
}

// File: script.js

/**
 * Formatta numero con separatore corretto per l'utente,
 * garantendo sempre 2 decimali con toFixed(2).
 */
function formatNumber(num) {
  const n = parseFloat(num);
  if (isNaN(n)) return "0";
  const separator = getDecimalSeparator();
  // toFixed(2) forza 2 cifre decimali (es. 0.5 -> "0.50")
  const parts = n.toFixed(2).split(".");

  // Aggiungi il punto ogni 3 cifre nella parte intera
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");

  // Usa il separatore decimale corretto
  if (separator === ",") {
    return parts.join(",");
  } else {
    return parts.join(".");
  }
}

// Formatta un numero come valuta (es. € 1.234,56)
function formatCurrency(num) {
  const n = parseFloat(num);
  if (isNaN(n)) return "€ 0,00";
  return `€ ${formatNumber(n)}`;
}

// ==================== GESTIONE DECIMALI A 2 CIFRE ====================

/**
 * Determina il separatore decimale in base alle impostazioni locali
 * @returns {string} ',' o '.'
 */
function getDecimalSeparator() {
  const num = 1.1;
  const formatted = num.toLocaleString(undefined, { minimumFractionDigits: 1 });
  return formatted.includes(",") ? "," : ".";
}

/**
 * Converte stringa input in numero float
 * Accetta sia virgola che punto come separatore decimale
 * @param {string} value - Valore da convertire
 * @returns {number} - Numero convertito o 0 se non valido
 */
function parseDecimalInput(value) {
  if (!value || value === "") return 0;
  // Converte virgola in punto per parseFloat
  const cleaned = String(value).replace(",", ".");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/**
 * Applica limitazione decimali a 2 cifre su un input
 * Gestisce input in tempo reale e formattazione al blur
 * @param {HTMLElement} inputElement - Elemento input da limitare
 */
function limitToTwoDecimals(inputElement) {
  if (!inputElement) {
    console.error("Input element non trovato per limitToTwoDecimals");
    return;
  }

  const separator = getDecimalSeparator();

  // ========== EVENTO INPUT (durante la digitazione) ==========
  const handleInput = function (e) {
    let value = this.value;

    // Rimuovi tutti i caratteri non validi (solo numeri, punto e virgola)
    value = value.replace(/[^\d.,]/g, "");

    // Sostituisci virgola con punto per gestione interna
    value = value.replace(",", ".");

    // Gestisci separatori multipli (mantieni solo il primo)
    const parts = value.split(".");
    if (parts.length > 2) {
      value = parts[0] + "." + parts.slice(1).join("");
    }

    // Limita decimali a 2 cifre SENZA applicare toFixed
    if (parts.length === 2 && parts[1].length > 2) {
      parts[1] = parts[1].substring(0, 2);
      value = parts.join(".");
    }

    // Mostra con separatore locale
    this.value = value.replace(".", separator);
  };

  // ========== EVENTO BLUR (quando si esce dal campo) ==========
  const handleBlur = function (e) {
    let value = this.value;

    // Se vuoto, imposta a 0.00
    if (value === "" || value === separator) {
      this.value = `0${separator}00`;
      return;
    }

    // Converte in numero
    const num = parseDecimalInput(value);

    if (!isNaN(num)) {
      // APPLICA toFixed(2) per forzare 2 decimali
      this.value = num.toFixed(2).replace(".", separator);
    } else {
      this.value = `0${separator}00`;
    }
  };

  // ========== EVENTO PASTE (incolla) ==========
  const handlePaste = function (e) {
    e.preventDefault();
    const pastedText = (e.clipboardData || window.clipboardData).getData(
      "text"
    );
    const cleaned = pastedText.replace(/[^\d.,]/g, "").replace(",", ".");
    const num = parseFloat(cleaned);

    if (!isNaN(num) && num >= 0) {
      this.value = num.toFixed(2).replace(".", separator);
    }
  };

  // ========== EVENTO KEYDOWN (previeni caratteri non validi) ==========
  const handleKeydown = function (e) {
    const separator = getDecimalSeparator();
    const allowedKeys = [
      "Backspace",
      "Delete",
      "Tab",
      "Escape",
      "Enter",
      "ArrowLeft",
      "ArrowRight",
      "ArrowUp",
      "ArrowDown",
      "Home",
      "End",
    ];

    // Permetti tasti di controllo
    if (
      allowedKeys.includes(e.key) ||
      e.ctrlKey ||
      e.metaKey || // Ctrl/Cmd per copia/incolla
      e.key === "a" ||
      e.key === "A"
    ) {
      return;
    }

    // Permetti numeri
    if (/^\d$/.test(e.key)) {
      return;
    }

    // Permetti separatore decimale (solo uno)
    if (
      (e.key === separator || e.key === "." || e.key === ",") &&
      !this.value.includes(separator)
    ) {
      return;
    }

    // Blocca tutto il resto
    e.preventDefault();
  };

  // Rimuovi listener esistenti (clonando e sostituendo l'elemento)
  const newInput = inputElement.cloneNode(true);
  inputElement.parentNode.replaceChild(newInput, inputElement);

  // Aggiungi i nuovi listener
  newInput.addEventListener("input", handleInput);
  newInput.addEventListener("blur", handleBlur);
  newInput.addEventListener("paste", handlePaste);
  newInput.addEventListener("keydown", handleKeydown);

  return newInput;
}

/**
 * Applica limitazione decimali agli input Quantità e Prezzo
 * Chiamare questa funzione all'apertura del modal Movimento
 */
function setupDecimalInputs() {
  console.log("🔧 Setup decimal inputs chiamato");

  const quantitaInput = document.getElementById("movimentoQuantita");
  const prezzoInput = document.getElementById("movimentoPrezzo");

  if (quantitaInput) {
    console.log("✅ Applicando limitazione decimali a Quantità");
    limitToTwoDecimals(quantitaInput);
  } else {
    console.error("❌ Input movimentoQuantita non trovato");
  }

  if (prezzoInput) {
    console.log("✅ Applicando limitazione decimali a Prezzo");
    limitToTwoDecimals(prezzoInput);
  } else {
    console.error("❌ Input movimentoPrezzo non trovato");
  }
}

/**
 * Formatta numero con separatore locale e 2 decimali
 * @param {number} num - Numero da formattare
 * @returns {string} - Numero formattato (es. "1.234,56")
 */
function formatNumber(num) {
  const n = parseFloat(num);
  if (isNaN(n)) return "0,00";

  const separator = getDecimalSeparator();
  // toFixed(2) garantisce sempre 2 decimali
  const parts = n.toFixed(2).split(".");

  // Aggiungi punto ogni 3 cifre nella parte intera
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");

  // Unisci con separatore locale
  return separator === "," ? parts.join(",") : parts.join(".");
}

/**
 * Formatta numero come valuta con simbolo €
 * @param {number} num - Numero da formattare
 * @returns {string} - Valuta formattata (es. "€ 1.234,56")
 */
function formatCurrency(num) {
  const n = parseFloat(num);
  if (isNaN(n)) return "€ 0,00";
  return `€ ${formatNumber(n)}`;
}

// ==================== MODIFICA FUNZIONE openMovimentoModal ====================

/**
 * Apre il modal per inserire un nuovo movimento
 * IMPORTANTE: Chiama setupDecimalInputs() dopo un breve timeout
 */
async function openMovimentoModal(movimento = null) {
  console.log("📂 Apertura modal movimento...");

  // Carica prodotti se necessario
  if (prodotti.length === 0) {
    const res = await fetch(`${API_URL}/prodotti`);
    prodotti = await res.json();
  }

  const modal = document.getElementById("modalMovimento");
  const title = document.getElementById("modalMovimentoTitle");
  const form = document.getElementById("formMovimento");

  form.reset();
  title.textContent = "Nuovo Movimento";
  document.getElementById("movimentoId").value = "";

  if (!movimento) {
    document.getElementById("giacenzaInfo").style.display = "none";
  }

  // Resetta ricerca prodotto
  const searchInput = document.getElementById("movimentoProdottoSearch");
  const hiddenInput = document.getElementById("movimentoProdotto");
  const resultsContainer = document.getElementById("prodottoSearchResults");

  if (searchInput) searchInput.value = "";
  if (hiddenInput) hiddenInput.value = "";
  if (resultsContainer) resultsContainer.classList.remove("show");

  // Resetta campi prezzo/fornitore
  togglePrezzoField();

  // Mostra modal
  modal.classList.add("active");

  // ⭐ IMPORTANTE: Applica setup decimali dopo breve timeout
  setTimeout(() => {
    console.log("⏱️ Timeout scaduto, applico setup decimali...");
    setupDecimalInputs();
    setupProductSearch();
  }, 150); // 150ms di attesa per assicurarsi che il DOM sia pronto
}

// ==================== ESPORTA FUNZIONI (se usi moduli) ====================
// Se usi ES6 modules, decommenta:
// export {
//   getDecimalSeparator,
//   parseDecimalInput,
//   limitToTwoDecimals,
//   setupDecimalInputs,
//   formatNumber,
//   formatCurrency,
//   openMovimentoModal
// };

// ==================== RICERCA MARCHE NEL MODAL PRODOTTO ====================
// 🎯 GRAFICA IDENTICA ALLA RICERCA PRODOTTI NEI MOVIMENTI

let selectedMarcaId = null;

/**
 * Setup della ricerca marche nel modal prodotto
 * Chiamare questa funzione all'apertura del modal
 */
function setupMarcaSearch() {
  const searchInput = document.getElementById("prodottoMarcaSearch");
  const hiddenInput = document.getElementById("prodottoMarca");
  const resultsContainer = document.getElementById("marcaSearchResults");

  if (!searchInput || !resultsContainer) {
    console.error("❌ Elementi ricerca marca non trovati");
    return;
  }

  console.log("✅ Setup ricerca marca inizializzato");

  // Reset selezione
  selectedMarcaId = null;
  searchInput.classList.remove("has-selection");

  // Chiudi risultati cliccando fuori
  document.addEventListener("click", function (e) {
    if (
      !searchInput.contains(e.target) &&
      !resultsContainer.contains(e.target)
    ) {
      resultsContainer.classList.remove("show");
    }
  });

  // Focus apre i risultati
  searchInput.addEventListener("focus", function () {
    if (this.value.trim().length > 0 && resultsContainer.children.length > 0) {
      resultsContainer.classList.add("show");
    }
  });
}

/**
 * Funzione di ricerca marche (chiamata dall'evento oninput/onfocus)
 * 🎯 IDENTICA ALLA LOGICA DI searchProducts()
 */
function searchMarche() {
  const searchInput = document.getElementById("prodottoMarcaSearch");
  const resultsContainer = document.getElementById("marcaSearchResults");
  const hiddenInput = document.getElementById("prodottoMarca");

  if (!searchInput || !resultsContainer) {
    console.error("❌ Elementi search non trovati");
    return;
  }

  const searchTerm = searchInput.value.toLowerCase().trim();

  console.log("🔍 searchMarche chiamata - searchTerm:", searchTerm);
  console.log("📦 allMarche disponibili:", allMarche ? allMarche.length : 0);

  // Se l'utente modifica dopo aver selezionato, resetta la selezione
  if (
    selectedMarcaId !== null &&
    searchInput.classList.contains("has-selection")
  ) {
    const currentMarca = allMarche.find((m) => m.id == selectedMarcaId);
    if (currentMarca && searchInput.value !== currentMarca.nome.toUpperCase()) {
      selectedMarcaId = null;
      hiddenInput.value = "";
      searchInput.classList.remove("has-selection");
      console.log("🔄 Selezione resettata");
    }
  }

  // Verifica che allMarche sia definito e non vuoto
  if (!allMarche || allMarche.length === 0) {
    resultsContainer.innerHTML = `
      <div class="search-no-results">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/>
          <path d="M21 21l-4.35-4.35"/>
        </svg>
        Nessuna marca disponibile nel sistema
      </div>
    `;
    resultsContainer.classList.add("show");
    return;
  }

  // 🎯 Filtra le marche: se vuoto mostra TUTTE, altrimenti filtra
  const filteredMarche = allMarche.filter((m) => {
    // Se non c'è testo di ricerca, mostra tutte le marche
    if (!searchTerm || searchTerm === "") {
      return true;
    }

    // Altrimenti filtra in base al termine di ricerca
    const matchesNome = m.nome.toLowerCase().includes(searchTerm);
    return matchesNome;
  });

  console.log("📋 Marche filtrate:", filteredMarche.length);

  // Se nessuna marca trovata dopo il filtro
  if (filteredMarche.length === 0 && searchTerm) {
    resultsContainer.innerHTML = `
      <div class="search-no-results">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/>
          <path d="M21 21l-4.35-4.35"/>
        </svg>
        Nessuna marca trovata per "<strong>${searchTerm}</strong>"
      </div>
    `;
    resultsContainer.classList.add("show");
    return;
  }

  // Costruisci l'HTML per i risultati (🎯 IDENTICO AI PRODOTTI)
  resultsContainer.innerHTML = filteredMarche
    .map((m) => {
      const nomeHighlighted = highlightMatch(m.nome, searchTerm);

      return `
      <div 
        class="search-result-item marca-result-item" 
        data-id="${m.id}" 
        data-nome="${m.nome}"
      >
        <div class="search-result-name">${nomeHighlighted}</div>
      </div>
    `;
    })
    .join("");

  // Aggiungi event listener ai risultati
  resultsContainer.querySelectorAll(".marca-result-item").forEach((item) => {
    item.addEventListener("click", function () {
      selectMarca(this.dataset.id, this.dataset.nome);
    });
  });

  resultsContainer.classList.add("show");
  console.log("✅ Dropdown mostrato con", filteredMarche.length, "marche");
}

/**
 * Seleziona una marca dalla lista dei risultati
 * 🎯 IDENTICA ALLA LOGICA DI selectProduct()
 */
function selectMarca(id, nome) {
  const searchInput = document.getElementById("prodottoMarcaSearch");
  const hiddenInput = document.getElementById("prodottoMarca");
  const resultsContainer = document.getElementById("marcaSearchResults");

  selectedMarcaId = id;
  hiddenInput.value = id;

  // Mostra il nome selezionato nell'input
  searchInput.value = nome.toUpperCase();
  searchInput.classList.add("has-selection");

  // Chiudi risultati
  resultsContainer.classList.remove("show");

  console.log("✅ Marca selezionata:", { id, nome });
}

/**
 * Funzione di evidenziazione del testo cercato
 * 🎯 IDENTICA A highlightMatch() usata per i prodotti
 */
function highlightMatch(text, searchTerm) {
  if (!searchTerm) return text;

  const regex = new RegExp(`(${searchTerm})`, "gi");
  return text.replace(
    regex,
    '<mark style="background: #fef08a; padding: 2px 4px; border-radius: 3px; font-weight: 700;">$1</mark>'
  );
}

// ==================== MODIFICA FUNZIONE openProdottoModal ====================

/**
 * Apre il modal per inserire/modificare un prodotto
 * 🎯 IDENTICA ALLA LOGICA DI openMovimentoModal()
 */
async function openProdottoModal(prodotto = null) {
  console.log("📂 Apertura modal prodotto...");

  // Carica marche se necessario
  if (!allMarche || allMarche.length === 0) {
    try {
      const res = await fetch(`${API_URL}/marche`);
      allMarche = await res.json();
      console.log("📦 Marche caricate:", allMarche.length);
    } catch (error) {
      console.error("❌ Errore caricamento marche:", error);
      alert("Errore nel caricamento delle marche");
      return;
    }
  }

  const modal = document.getElementById("modalProdotto");
  const title = document.getElementById("modalProdottoTitle");
  const form = document.getElementById("formProdotto");

  form.reset();

  // Resetta ricerca marca
  const searchInput = document.getElementById("prodottoMarcaSearch");
  const hiddenInput = document.getElementById("prodottoMarca");
  const resultsContainer = document.getElementById("marcaSearchResults");

  if (searchInput) {
    searchInput.value = "";
    searchInput.classList.remove("has-selection");
  }
  if (hiddenInput) hiddenInput.value = "";
  if (resultsContainer) resultsContainer.classList.remove("show");
  selectedMarcaId = null;

  if (prodotto) {
    // Modalità modifica
    title.textContent = "Modifica Prodotto";
    document.getElementById("prodottoId").value = prodotto.id;
    document.getElementById("prodottoNome").value = prodotto.nome;
    document.getElementById("prodottoDescrizione").value =
      prodotto.descrizione || "";

    // Pre-seleziona la marca
    if (prodotto.marca_id) {
      const marca = allMarche.find((m) => m.id == prodotto.marca_id);
      if (marca) {
        selectedMarcaId = prodotto.marca_id;
        hiddenInput.value = prodotto.marca_id;
        searchInput.value = marca.nome.toUpperCase();
        searchInput.classList.add("has-selection");
        console.log("✅ Marca pre-selezionata:", marca.nome);
      }
    }
  } else {
    // Modalità creazione
    title.textContent = "Nuovo Prodotto";
    document.getElementById("prodottoId").value = "";
  }

  // Mostra modal
  modal.classList.add("active");

  // ⏱️ IMPORTANTE: Setup ricerca marca dopo breve timeout
  setTimeout(() => {
    console.log("⏱️ Timeout scaduto, applico setup ricerca marca...");
    setupMarcaSearch();
  }, 150);
}

/**
 * Chiude il modal prodotto
 */
function closeProdottoModal() {
  const modal = document.getElementById("modalProdotto");
  modal.classList.remove("active");
  selectedMarcaId = null;
  console.log("❌ Modal prodotto chiuso");
}

// ==================== SUBMIT FORM PRODOTTO ====================

/**
 * Submit del form prodotto con validazione marca
 */
document
  .getElementById("formProdotto")
  ?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const id = document.getElementById("prodottoId").value;
    const nome = document.getElementById("prodottoNome").value.trim();
    const marca_id = document.getElementById("prodottoMarca").value;
    const descrizione =
      document.getElementById("prodottoDescrizione").value.trim() || null;

    // Validazione nome
    if (!nome) {
      alert("⚠️ Il nome del prodotto è obbligatorio!");
      document.getElementById("prodottoNome").focus();
      return;
    }

    // Validazione marca
    if (!marca_id || marca_id === "") {
      alert("⚠️ Seleziona una marca dalla lista!");
      document.getElementById("prodottoMarcaSearch").focus();
      return;
    }

    const method = id ? "PUT" : "POST";
    const url = id ? `${API_URL}/prodotti/${id}` : `${API_URL}/prodotti`;

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, marca_id, descrizione }),
      });

      const data = await res.json();

      if (res.ok) {
        alert(id ? "✅ Prodotto aggiornato!" : "✅ Prodotto creato!");
        closeProdottoModal();
        loadProdotti(); // Ricarica la lista prodotti
      } else {
        alert(data.error || "❌ Errore durante il salvataggio");
      }
    } catch (error) {
      console.error("❌ Errore connessione:", error);
      alert("❌ Errore di connessione al server");
    }
  });

// ==================== ESPORTA FUNZIONI (opzionale) ====================
// export {
//   setupMarcaSearch,
//   searchMarche,
//   selectMarca,
//   openProdottoModal,
//   closeProdottoModal,
//   highlightMatch
// };
function openUserModal(user = null) {
  const modal = document.getElementById("modalUser");
  const title = document.getElementById("modalUserTitle");
  const form = document.getElementById("formUser");
  const passwordInput = document.getElementById("userPassword");
  const passwordLabel = passwordInput?.previousElementSibling;

  form.reset();

  if (user) {
    title.textContent = "Modifica Utente";
    document.getElementById("userId").value = user.id;
    document.getElementById("userUsername").value = user.username;
    if (passwordLabel) {
      passwordLabel.innerHTML =
        'Password <span style="opacity: 0.6;">(opzionale)</span>';
    }
    passwordInput.required = false;
  } else {
    title.textContent = "Nuovo Utente";
    document.getElementById("userId").value = "";
    if (passwordLabel) {
      passwordLabel.innerHTML = "Password *";
    }
    passwordInput.required = true;
  }

  modal.classList.add("active");
}

// ========== EVENTO KEYDOWN (previeni caratteri non validi) ==========
const handleKeydown = function (e) {
  const separator = getDecimalSeparator();
  const allowedKeys = [
    "Backspace",
    "Delete",
    "Tab",
    "Escape",
    "Enter",
    "ArrowLeft",
    "ArrowRight",
    "ArrowUp",
    "ArrowDown",
    "Home",
    "End",
  ];

  // Permetti tasti di controllo
  if (
    allowedKeys.includes(e.key) ||
    e.ctrlKey ||
    e.metaKey || // Ctrl/Cmd per copia/incolla
    e.key === "a" ||
    e.key === "A"
  ) {
    return;
  }

  // ⛔ BLOCCA SEGNO MENO (valori negativi non permessi)
  if (e.key === "-" || e.key === "_") {
    e.preventDefault();
    return;
  }

  // Permetti numeri
  if (/^\d$/.test(e.key)) {
    return;
  }

  // Permetti separatore decimale (solo uno)
  if (
    (e.key === separator || e.key === "." || e.key === ",") &&
    !this.value.includes(separator)
  ) {
    return;
  }

  // Blocca tutto il resto
  e.preventDefault();
};
