// ==================== CONFIGURAZIONE ====================
const API_URL = "http://localhost:3000/api"

let marche = []
let prodotti = []
let movimenti = []
let utenti = []

// ==================== INIZIALIZZAZIONE ====================
document.addEventListener("DOMContentLoaded", () => {
  const username = localStorage.getItem("username")
  if (username) {
    document.getElementById("currentUser").textContent = username
  }

  // Setup navigation
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.addEventListener("click", (e) => {
      e.preventDefault()
      const section = item.dataset.section

      document.querySelectorAll(".nav-item").forEach((i) => i.classList.remove("active"))
      document.querySelectorAll(".content-section").forEach((s) => s.classList.remove("active"))

      item.classList.add("active")
      document.getElementById(`section-${section}`).classList.add("active")

      // Carica dati sezione
      if (section === "marche") loadMarche()
      if (section === "prodotti") loadProdotti()
      if (section === "movimenti") loadMovimenti()
      if (section === "riepilogo") loadRiepilogo()
      if (section === "utenti") loadUtenti()
    })
  })

  // Logout
  document.getElementById("logoutBtn").addEventListener("click", () => {
    localStorage.removeItem("username")
    window.location.href = "index.html"
  })

  // Carica sezione iniziale
  loadMarche()
})

// ==================== MARCHE ====================
async function loadMarche() {
  try {
    const res = await fetch(`${API_URL}/marche`)
    marche = await res.json()
    renderMarche()
  } catch (error) {
    console.error("Errore caricamento marche:", error)
  }
}

function renderMarche() {
  const tbody = document.getElementById("marcheTableBody")

  if (marche.length === 0) {
    tbody.innerHTML = '<tr><td colspan="3" class="text-center">Nessuna marca presente</td></tr>'
    return
  }

  tbody.innerHTML = marche
    .map(
      (m) => `
    <tr>
      <td><strong>${m.nome}</strong></td>
      <td>${new Date(m.data_creazione).toLocaleDateString("it-IT")}</td>
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
  `,
    )
    .join("")
}

function openMarcaModal(marca = null) {
  const modal = document.getElementById("modalMarca")
  const title = document.getElementById("modalMarcaTitle")
  const form = document.getElementById("formMarca")

  form.reset()

  if (marca) {
    title.textContent = "Modifica Marca"
    document.getElementById("marcaId").value = marca.id
    document.getElementById("marcaNome").value = marca.nome
  } else {
    title.textContent = "Nuova Marca"
    document.getElementById("marcaId").value = ""
  }

  modal.classList.add("active")
}

function closeMarcaModal() {
  document.getElementById("modalMarca").classList.remove("active")
}

function editMarca(id) {
  const marca = marche.find((m) => m.id === id)
  if (marca) openMarcaModal(marca)
}

async function deleteMarca(id) {
  if (!confirm("Sei sicuro di voler eliminare questa marca?")) return

  try {
    const res = await fetch(`${API_URL}/marche/${id}`, { method: "DELETE" })
    const data = await res.json()

    if (res.ok) {
      alert("Marca eliminata con successo!")
      loadMarche()
    } else {
      alert(data.error || "Errore durante l'eliminazione")
    }
  } catch (error) {
    alert("Errore di connessione")
  }
}

document.getElementById("formMarca").addEventListener("submit", async (e) => {
  e.preventDefault()

  const id = document.getElementById("marcaId").value
  const nome = document.getElementById("marcaNome").value.trim()

  const method = id ? "PUT" : "POST"
  const url = id ? `${API_URL}/marche/${id}` : `${API_URL}/marche`

  try {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome }),
    })

    const data = await res.json()

    if (res.ok) {
      alert(id ? "Marca aggiornata!" : "Marca creata!")
      closeMarcaModal()
      loadMarche()
    } else {
      alert(data.error || "Errore durante il salvataggio")
    }
  } catch (error) {
    alert("Errore di connessione")
  }
})

// ==================== PRODOTTI ====================
async function loadProdotti() {
  try {
    const res = await fetch(`${API_URL}/prodotti`)
    prodotti = await res.json()
    renderProdotti()
  } catch (error) {
    console.error("Errore caricamento prodotti:", error)
  }
}

function renderProdotti() {
  const tbody = document.getElementById("prodottiTableBody")

  if (prodotti.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="text-center">Nessun prodotto presente</td></tr>'
    return
  }

  tbody.innerHTML = prodotti
    .map(
      (p) => `
    <tr>
      <td><strong>#${p.id}</strong></td>
      <td><strong>${p.nome}</strong> ${p.marca_nome ? `<span style="color: #6366f1;">(${p.marca_nome})</span>` : ""} <span class="badge ${p.giacenza > 0 ? "badge-success" : "badge-danger"}">${p.giacenza}</span></td>
      <td>${p.descrizione ? `<small>${p.descrizione.substring(0, 50)}${p.descrizione.length > 50 ? "..." : ""}</small>` : '<span style="color: #999;">-</span>'}</td>
      <td class="text-right">
        <button class="btn-icon" onclick="editProdotto(${p.id})" title="Modifica">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
        <button class="btn-icon" onclick="deleteProdotto(${p.id})" title="Elimina">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
        </button>
      </td>
    </tr>
  `,
    )
    .join("")
}

async function openProdottoModal(prodotto = null) {
  if (marche.length === 0) {
    const res = await fetch(`${API_URL}/marche`)
    marche = await res.json()
  }

  const modal = document.getElementById("modalProdotto")
  const title = document.getElementById("modalProdottoTitle")
  const form = document.getElementById("formProdotto")
  const selectMarca = document.getElementById("prodottoMarca")

  form.reset()

  selectMarca.innerHTML = marche.map((m) => `<option value="${m.id}">${m.nome}</option>`).join("")

  if (prodotto) {
    title.textContent = "Modifica Prodotto"
    document.getElementById("prodottoId").value = prodotto.id
    document.getElementById("prodottoNome").value = prodotto.nome
    document.getElementById("prodottoMarca").value = prodotto.marca_id || ""
    document.getElementById("prodottoDescrizione").value = prodotto.descrizione || ""
  } else {
    title.textContent = "Nuovo Prodotto"
    document.getElementById("prodottoId").value = ""
  }

  modal.classList.add("active")
}

function closeProdottoModal() {
  document.getElementById("modalProdotto").classList.remove("active")
}

function editProdotto(id) {
  const prodotto = prodotti.find((p) => p.id === id)
  if (prodotto) openProdottoModal(prodotto)
}

async function deleteProdotto(id) {
  if (!confirm("Sei sicuro di voler eliminare questo prodotto?")) return

  try {
    const res = await fetch(`${API_URL}/prodotti/${id}`, { method: "DELETE" })
    const data = await res.json()

    if (res.ok) {
      alert("Prodotto eliminato con successo!")
      loadProdotti()
    } else {
      alert(data.error || "Errore durante l'eliminazione")
    }
  } catch (error) {
    alert("Errore di connessione")
  }
}

document.getElementById("formProdotto").addEventListener("submit", async (e) => {
  e.preventDefault()

  const id = document.getElementById("prodottoId").value
  const nome = document.getElementById("prodottoNome").value.trim()
  const marca_id = document.getElementById("prodottoMarca").value
  const descrizione = document.getElementById("prodottoDescrizione").value.trim() || null

  if (!marca_id) {
    alert("La marca è obbligatoria!")
    return
  }

  const method = id ? "PUT" : "POST"
  const url = id ? `${API_URL}/prodotti/${id}` : `${API_URL}/prodotti`

  try {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome, marca_id, descrizione }),
    })

    const data = await res.json()

    if (res.ok) {
      alert(id ? "Prodotto aggiornato!" : "Prodotto creato!")
      closeProdottoModal()
      loadProdotti()
    } else {
      alert(data.error || "Errore durante il salvataggio")
    }
  } catch (error) {
    alert("Errore di connessione")
  }
})

// ==================== MOVIMENTI ====================
async function loadMovimenti() {
  try {
    const res = await fetch(`${API_URL}/dati`)
    movimenti = await res.json()
    renderMovimenti()
  } catch (error) {
    console.error("Errore caricamento movimenti:", error)
  }
}

function renderMovimenti() {
  const tbody = document.getElementById("movimentiTableBody")

  if (movimenti.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" class="text-center">Nessun movimento presente</td></tr>'
    return
  }

  tbody.innerHTML = movimenti
    .map(
      (m) => `
    <tr>
      <td><strong>${m.prodotto_nome}</strong></td>
      <td>${m.marca_nome || '<span style="color: #999;">-</span>'}</td>
      <td><span class="badge ${m.tipo === "carico" ? "badge-success" : "badge-danger"}">${m.tipo.toUpperCase()}</span></td>
      <td>${m.quantita}</td>
      <td>${m.tipo === "carico" ? `€ ${Number.parseFloat(m.prezzo).toFixed(2)}` : m.prezzo_unitario_scarico ? `€ ${Number.parseFloat(m.prezzo_unitario_scarico).toFixed(2)}` : "-"}</td>
      <td><strong>€ ${Number.parseFloat(m.prezzo_totale || 0).toFixed(2)}</strong></td>
      <td>${new Date(m.data_movimento).toLocaleDateString("it-IT")}</td>
      <td>${m.fattura_doc || '<span style="color: #999;">-</span>'}</td>
      <td class="text-right">
        <button class="btn-icon" onclick="deleteMovimento(${m.id})" title="Elimina">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
        </button>
      </td>
    </tr>
  `,
    )
    .join("")
}

async function openMovimentoModal() {
  if (prodotti.length === 0) {
    const res = await fetch(`${API_URL}/prodotti`)
    prodotti = await res.json()
  }

  const modal = document.getElementById("modalMovimento")
  const form = document.getElementById("formMovimento")
  const selectProdotto = document.getElementById("movimentoProdotto")

  form.reset()

  selectProdotto.innerHTML =
    '<option value="">Seleziona prodotto...</option>' +
    prodotti
      .map((p) => `<option value="${p.id}">#${p.id} - ${p.nome}${p.marca_nome ? ` (${p.marca_nome})` : ""}</option>`)
      .join("")

  document.getElementById("movimentoData").valueAsDate = new Date()
  document.getElementById("movimentoTipo").value = "carico"
  togglePrezzoField()

  selectProdotto.addEventListener("change", mostraGiacenzaProdotto)

  modal.classList.add("active")
}

function closeMovimentoModal() {
  document.getElementById("movimentoProdotto").removeEventListener("change", mostraGiacenzaProdotto)
  document.getElementById("modalMovimento").classList.remove("active")
}

async function mostraGiacenzaProdotto() {
  const prodottoId = document.getElementById("movimentoProdotto").value
  const giacenzaInfo = document.getElementById("giacenzaInfo")
  const giacenzaValue = document.getElementById("giacenzaValue")

  if (!prodottoId) {
    giacenzaInfo.style.display = "none"
    return
  }

  const prodotto = prodotti.find((p) => p.id === Number.parseInt(prodottoId))

  if (prodotto) {
    giacenzaValue.innerHTML = `
      <div style="margin-bottom: 5px;">
        <strong style="font-size: 14px; color: #0369a1;">#${prodotto.id} - ${prodotto.nome}</strong>
        ${prodotto.marca_nome ? `<span style="color: #6366f1; font-size: 13px;">(${prodotto.marca_nome})</span>` : ""}
      </div>
      <div style="font-size: 28px; font-weight: bold; color: #0284c7;">${prodotto.giacenza || 0} unità</div>
    `
    giacenzaInfo.style.display = "block"
  }
}

function togglePrezzoField() {
  const tipo = document.getElementById("movimentoTipo").value
  const prezzoGroup = document.getElementById("prezzoGroup")
  const prezzoInput = document.getElementById("movimentoPrezzo")
  const fornitoreGroup = document.getElementById("fornitoreGroup")
  const fatturaInput = document.getElementById("movimentoFattura")
  const fornitoreInput = document.getElementById("movimentoFornitore")
  const docOptional = document.getElementById("docOptional")
  const fornitoreOptional = document.getElementById("fornitoreOptional")

  if (tipo === "carico") {
    prezzoGroup.style.display = "block"
    prezzoInput.required = true
    fornitoreGroup.style.display = "block"
    fatturaInput.required = true
    fornitoreInput.required = true
    docOptional.textContent = "*"
    fornitoreOptional.textContent = "*"
  } else {
    prezzoGroup.style.display = "none"
    prezzoInput.required = false
    prezzoInput.value = ""
    fornitoreGroup.style.display = "none"
    fornitoreInput.value = ""
    fatturaInput.required = false
    fornitoreInput.required = false
    docOptional.textContent = ""
    fornitoreOptional.textContent = ""
  }
}

async function deleteMovimento(id) {
  if (!confirm("Sei sicuro di voler eliminare questo movimento?")) return

  try {
    const res = await fetch(`${API_URL}/dati/${id}`, { method: "DELETE" })
    const data = await res.json()

    if (res.ok) {
      alert(data.message || "Movimento eliminato!")
      loadMovimenti()
      loadProdotti()
    } else {
      alert(data.error || "Errore durante l'eliminazione")
    }
  } catch (error) {
    alert("Errore di connessione")
  }
}

document.getElementById("formMovimento").addEventListener("submit", async (e) => {
  e.preventDefault()

  const prodotto_id = document.getElementById("movimentoProdotto").value
  const tipo = document.getElementById("movimentoTipo").value
  const quantita = document.getElementById("movimentoQuantita").value
  const prezzo = document.getElementById("movimentoPrezzo").value || null
  const data_movimento = document.getElementById("movimentoData").value
  const fattura_doc = document.getElementById("movimentoFattura").value.trim() || null
  const fornitore = document.getElementById("movimentoFornitore").value.trim() || null

  try {
    const res = await fetch(`${API_URL}/dati`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prodotto_id,
        tipo,
        quantita,
        prezzo,
        data_movimento,
        fattura_doc,
        fornitore,
      }),
    })

    const data = await res.json()

    if (res.ok) {
      alert("Movimento registrato!")
      closeMovimentoModal()
      loadMovimenti()
      loadProdotti()
    } else {
      alert(data.error || "Errore durante il salvataggio")
    }
  } catch (error) {
    alert("Errore di connessione")
  }
})

// ==================== RIEPILOGO ====================
async function loadRiepilogo() {
  try {
    const resRiepilogo = fetch(`${API_URL}/magazzino/riepilogo`)
    const resValore = fetch(`${API_URL}/magazzino/valore-magazzino`)

    const [riepilogoRes, valoreRes] = await Promise.all([resRiepilogo, resValore])

    const riepilogo = await riepilogoRes.json()
    const { valore_totale } = await valoreRes.json()

    document.getElementById("valoreTotale").textContent = `€ ${Number.parseFloat(valore_totale).toFixed(2)}`
    renderRiepilogo(riepilogo)
  } catch (error) {
    console.error("Errore caricamento riepilogo:", error)
  }
}

async function renderRiepilogo(riepilogo) {
  const tbody = document.getElementById("riepilogoTableBody")

  if (riepilogo.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center">Nessun dato disponibile</td></tr>'
    return
  }

  let html = ""

  for (const r of riepilogo) {
    html += `
    <tr>
      <td><strong>${r.nome}</strong></td>
      <td>${r.marca_nome || '<span style="color: #999;">-</span>'}</td>
      <td>${r.descrizione ? `<small>${r.descrizione.substring(0, 40)}${r.descrizione.length > 40 ? "..." : ""}</small>` : '<span style="color: #999;">-</span>'}</td>
      <td><span class="badge ${r.giacenza > 0 ? "badge-success" : "badge-danger"}">${r.giacenza}</span></td>
      <td><strong>€ ${Number.parseFloat(r.valore_totale).toFixed(2)}</strong></td>
    </tr>
    `

    if (r.giacenza > 0) {
      try {
        const lottiRes = await fetch(`${API_URL}/magazzino/riepilogo/${r.id}`)
        const lotti = await lottiRes.json()

        if (lotti && lotti.length > 0) {
          html += `
          <tr>
            <td colspan="5" style="padding: 0; background-color: #f9fafb;">
              <table style="width: 100%; margin: 0; border: none;">
                <thead>
                  <tr style="background-color: #e0e7ff;">
                    <th style="padding: 6px 12px; font-size: 11px; border: 1px solid #ddd;">ID Lotto</th>
                    <th style="padding: 6px 12px; font-size: 11px; border: 1px solid #ddd;">Quantità</th>
                    <th style="padding: 6px 12px; font-size: 11px; border: 1px solid #ddd;">Prezzo Unit.</th>
                    <th style="padding: 6px 12px; font-size: 11px; border: 1px solid #ddd;">Valore</th>
                    <th style="padding: 6px 12px; font-size: 11px; border: 1px solid #ddd;">Data Carico</th>
                    <th style="padding: 6px 12px; font-size: 11px; border: 1px solid #ddd;">Documento</th>
                    <th style="padding: 6px 12px; font-size: 11px; border: 1px solid #ddd;">Fornitore</th>
                  </tr>
                </thead>
                <tbody>
          `

          lotti.forEach((lotto) => {
            html += `
                  <tr>
                    <td style="padding: 6px 12px; font-size: 11px; border: 1px solid #ddd;">${lotto.id}</td>
                    <td style="padding: 6px 12px; font-size: 11px; border: 1px solid #ddd;">${lotto.quantita_rimanente}</td>
                    <td style="padding: 6px 12px; font-size: 11px; border: 1px solid #ddd;">€ ${Number.parseFloat(lotto.prezzo).toFixed(2)}</td>
                    <td style="padding: 6px 12px; font-size: 11px; border: 1px solid #ddd;"><strong>€ ${(lotto.quantita_rimanente * lotto.prezzo).toFixed(2)}</strong></td>
                    <td style="padding: 6px 12px; font-size: 11px; border: 1px solid #ddd;">${new Date(lotto.data_carico).toLocaleDateString("it-IT")}</td>
                    <td style="padding: 6px 12px; font-size: 11px; border: 1px solid #ddd;">${lotto.fattura_doc || '<span style="color: #999;">-</span>'}</td>
                    <td style="padding: 6px 12px; font-size: 11px; border: 1px solid #ddd;">${lotto.fornitore || '<span style="color: #999;">-</span>'}</td>
                  </tr>
            `
          })

          html += `
                </tbody>
              </table>
            </td>
          </tr>
          `
        }
      } catch (error) {
        console.error("Errore caricamento lotti:", error)
      }
    }
  }

  tbody.innerHTML = html
}

async function printRiepilogo() {
  const valoreTotale = document.getElementById("valoreTotale").textContent

  try {
    const riepilogoRes = await fetch(`${API_URL}/magazzino/riepilogo`)
    const riepilogo = await riepilogoRes.json()

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
          .no-lotti { text-align: center; color: #999; padding: 15px; font-style: italic; }
        </style>
      </head>
      <body>
        <h1>Riepilogo Magazzino</h1>
        <div class="info">
          <p><strong>Valore Totale:</strong> ${valoreTotale}</p>
          <p><strong>Data Stampa:</strong> ${new Date().toLocaleDateString("it-IT")} ${new Date().toLocaleTimeString("it-IT")}</p>
        </div>
    `

    for (const prodotto of riepilogo) {
      printContent += `
        <div class="prodotto-block">
          <div class="prodotto-header">
            <div class="prodotto-info">
              <span><strong>Prodotto:</strong> ${prodotto.nome}</span>
              <span><strong>Giacenza Totale:</strong> ${prodotto.giacenza}</span>
            </div>
            <div class="prodotto-info">
              <span><strong>Marca:</strong> ${prodotto.marca_nome || "-"}</span>
              <span><strong>Valore Totale:</strong> € ${Number.parseFloat(prodotto.valore_totale).toFixed(2)}</span>
            </div>
            ${prodotto.descrizione ? `<div class="prodotto-info"><span><strong>Descrizione:</strong> ${prodotto.descrizione}</span></div>` : ""}
          </div>
      `

      if (prodotto.giacenza > 0) {
        const lottiRes = await fetch(`${API_URL}/magazzino/riepilogo/${prodotto.id}`)
        const lotti = await lottiRes.json()

        if (lotti && lotti.length > 0) {
          printContent += `
            <table>
              <thead>
                <tr>
                  <th>ID Lotto</th>
                  <th>Quantità</th>
                  <th>Prezzo Unit.</th>
                  <th>Valore</th>
                  <th>Data Carico</th>
                  <th>Documento</th>
                  <th>Fornitore</th>
                </tr>
              </thead>
              <tbody>
          `

          lotti.forEach((lotto) => {
            printContent += `
              <tr class="lotto-row">
                <td>${lotto.id}</td>
                <td>${lotto.quantita_rimanente}</td>
                <td>€ ${Number.parseFloat(lotto.prezzo).toFixed(2)}</td>
                <td><strong>€ ${(lotto.quantita_rimanente * lotto.prezzo).toFixed(2)}</strong></td>
                <td>${new Date(lotto.data_carico).toLocaleDateString("it-IT")}</td>
                <td>${lotto.fattura_doc || "-"}</td>
                <td>${lotto.fornitore || "-"}</td>
              </tr>
            `
          })

          printContent += `
              </tbody>
            </table>
          `
        } else {
          printContent += '<p class="no-lotti">Nessun lotto disponibile</p>'
        }
      } else {
        printContent += '<p class="no-lotti">Prodotto non disponibile in magazzino</p>'
      }

      printContent += `</div>`
    }

    printContent += `
      </body>
      </html>
    `

    const printWindow = window.open("", "", "width=900,height=700")
    printWindow.document.write(printContent)
    printWindow.document.close()
    printWindow.print()
  } catch (error) {
    console.error("Errore nella stampa:", error)
    alert("Errore durante la stampa del riepilogo")
  }
}

// ==================== STORICO ====================
async function loadStorico() {
  const data = document.getElementById("storicoDate").value
  if (!data) {
    alert("Seleziona una data")
    return
  }

  try {
    const res = await fetch(`${API_URL}/magazzino/storico-giacenza/${data}`)
    const result = await res.json()

    document.getElementById("valoreStorico").textContent =
      `€ ${Number.parseFloat(result.valore_totale || 0).toFixed(2)}`
    renderStorico(result.riepilogo || [])
  } catch (error) {
    console.error("Errore caricamento storico:", error)
    alert("Errore nel caricamento dello storico")
  }
}

function renderStorico(storico) {
  const tbody = document.getElementById("storicoTableBody")

  if (storico.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center">Nessun dato disponibile per questa data</td></tr>'
    return
  }

  let html = ""

  storico.forEach((s) => {
    html += `
    <tr>
      <td><strong>#${s.id}</strong></td>
      <td><strong>${s.nome}</strong> ${s.marca_nome ? `<span style="color: #6366f1;">(${s.marca_nome})</span>` : ""} <span class="badge ${s.giacenza > 0 ? "badge-success" : "badge-danger"}">${s.giacenza}</span></td>
      <td>${s.descrizione ? `<small>${s.descrizione.substring(0, 40)}${s.descrizione.length > 40 ? "..." : ""}</small>` : '<span style="color: #999;">-</span>'}</td>
      <td><span class="badge ${s.giacenza > 0 ? "badge-success" : "badge-danger"}">${s.giacenza}</span></td>
      <td><strong>€ ${Number.parseFloat(s.valore_totale).toFixed(2)}</strong></td>
      <td></td>
    </tr>
    `

    if (s.giacenza > 0 && s.lotti_storici && s.lotti_storici.length > 0) {
      html += `
      <tr>
        <td colspan="6" style="padding: 0; background-color: #f9fafb;">
          <table style="width: 100%; margin: 0; border: none;">
            <thead>
              <tr style="background-color: #e0e7ff;">
                <th style="padding: 6px 12px; font-size: 11px; border: 1px solid #ddd;">ID Lotto</th>
                <th style="padding: 6px 12px; font-size: 11px; border: 1px solid #ddd;">Quantità</th>
                <th style="padding: 6px 12px; font-size: 11px; border: 1px solid #ddd;">Prezzo Unit.</th>
                <th style="padding: 6px 12px; font-size: 11px; border: 1px solid #ddd;">Valore</th>
                <th style="padding: 6px 12px; font-size: 11px; border: 1px solid #ddd;">Data Carico</th>
                <th style="padding: 6px 12px; font-size: 11px; border: 1px solid #ddd;">Documento</th>
                <th style="padding: 6px 12px; font-size: 11px; border: 1px solid #ddd;">Fornitore</th>
              </tr>
            </thead>
            <tbody>
      `

      s.lotti_storici.forEach((lotto) => {
        html += `
              <tr>
                <td style="padding: 6px 12px; font-size: 11px; border: 1px solid #ddd;">${lotto.id}</td>
                <td style="padding: 6px 12px; font-size: 11px; border: 1px solid #ddd;">${lotto.quantita_rimanente}</td>
                <td style="padding: 6px 12px; font-size: 11px; border: 1px solid #ddd;">€ ${Number.parseFloat(lotto.prezzo).toFixed(2)}</td>
                <td style="padding: 6px 12px; font-size: 11px; border: 1px solid #ddd;"><strong>€ ${(lotto.quantita_rimanente * lotto.prezzo).toFixed(2)}</strong></td>
                <td style="padding: 6px 12px; font-size: 11px; border: 1px solid #ddd;">${new Date(lotto.data_carico).toLocaleDateString("it-IT")}</td>
                <td style="padding: 6px 12px; font-size: 11px; border: 1px solid #ddd;">${lotto.fattura_doc || '<span style="color: #999;">-</span>'}</td>
                <td style="padding: 6px 12px; font-size: 11px; border: 1px solid #ddd;">${lotto.fornitore || '<span style="color: #999;">-</span>'}</td>
              </tr>
        `
      })

      html += `
            </tbody>
          </table>
        </td>
      </tr>
      `
    }
  })

  tbody.innerHTML = html
}

function printStorico() {
  const date = document.getElementById("storicoDate").value
  if (!date) {
    alert("Seleziona una data prima di stampare!")
    return
  }

  const valoreTotale = document.getElementById("valoreStorico").textContent

  let printContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Storico Magazzino - ${new Date(date).toLocaleDateString("it-IT")}</title>
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
        .no-data { text-align: center; color: #999; padding: 20px; }
      </style>
    </head>
    <body>
      <h1>Storico Giacenze Magazzino</h1>
      <div class="info">
        <p><strong>Data Storico:</strong> ${new Date(date).toLocaleDateString("it-IT")}</p>
        <p><strong>Valore Totale:</strong> ${valoreTotale}</p>
        <p><strong>Data Stampa:</strong> ${new Date().toLocaleDateString("it-IT")} ${new Date().toLocaleTimeString("it-IT")}</p>
      </div>
  `

  fetch(`${API_URL}/magazzino/storico-giacenza/${date}`)
    .then((res) => res.json())
    .then((data) => {
      if (!data.riepilogo || data.riepilogo.length === 0) {
        printContent += '<div class="no-data">Nessun dato disponibile per questa data</div>'
      } else {
        data.riepilogo.forEach((prodotto) => {
          if (prodotto.giacenza > 0) {
            printContent += `
              <div class="prodotto-block">
                <div class="prodotto-header">
                  <div class="prodotto-info">
                    <span><strong>Prodotto:</strong> ${prodotto.nome}</span>
                    <span><strong>Giacenza Totale:</strong> ${prodotto.giacenza}</span>
                  </div>
                  <div class="prodotto-info">
                    <span><strong>Marca:</strong> ${prodotto.marca_nome || "-"}</span>
                    <span><strong>Valore Totale:</strong> € ${Number.parseFloat(prodotto.valore_totale).toFixed(2)}</span>
                  </div>
                  ${prodotto.descrizione ? `<div class="prodotto-info"><span><strong>Descrizione:</strong> ${prodotto.descrizione}</span></div>` : ""}
                </div>
            `

            if (prodotto.lotti_storici && prodotto.lotti_storici.length > 0) {
              printContent += `
                <table>
                  <thead>
                    <tr>
                      <th>ID Lotto</th>
                      <th>Quantità</th>
                      <th>Prezzo Unit.</th>
                      <th>Valore</th>
                      <th>Data Carico</th>
                      <th>Documento</th>
                      <th>Fornitore</th>
                    </tr>
                  </thead>
                  <tbody>
              `

              prodotto.lotti_storici.forEach((lotto) => {
                printContent += `
                  <tr class="lotto-row">
                    <td>${lotto.id}</td>
                    <td>${lotto.quantita_rimanente}</td>
                    <td>€ ${Number.parseFloat(lotto.prezzo).toFixed(2)}</td>
                    <td><strong>€ ${(lotto.quantita_rimanente * lotto.prezzo).toFixed(2)}</strong></td>
                    <td>${new Date(lotto.data_carico).toLocaleDateString("it-IT")}</td>
                    <td>${lotto.fattura_doc || "-"}</td>
                    <td>${lotto.fornitore || "-"}</td>
                  </tr>
                `
              })

              printContent += `
                  </tbody>
                </table>
              `
            } else {
              printContent += '<p style="margin: 10px 0; color: #999;">Nessun lotto disponibile</p>'
            }

            printContent += `</div>`
          }
        })
      }

      printContent += `
      </body>
      </html>
      `

      const printWindow = window.open("", "", "width=900,height=700")
      printWindow.document.write(printContent)
      printWindow.document.close()
      printWindow.print()
    })
    .catch((error) => {
      console.error("Errore nella stampa:", error)
      alert("Errore durante la stampa dello storico")
    })
}

// ==================== UTENTI ====================
async function loadUtenti() {
  try {
    const res = await fetch(`${API_URL}/utenti`)
    utenti = await res.json()
    renderUtenti()
  } catch (error) {
    console.error("Errore caricamento utenti:", error)
  }
}

function renderUtenti() {
  const tbody = document.getElementById("utentiTableBody")

  if (utenti.length === 0) {
    tbody.innerHTML = '<tr><td colspan="2" class="text-center">Nessun utente presente</td></tr>'
    return
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
  `,
    )
    .join("")
}

function openUserModal(user = null) {
  const modal = document.getElementById("modalUser")
  const title = document.getElementById("modalUserTitle")
  const form = document.getElementById("formUser")
  const passwordOptional = document.getElementById("passwordOptional")
  const passwordInput = document.getElementById("userPassword")

  form.reset()

  if (user) {
    title.textContent = "Modifica Utente"
    document.getElementById("userId").value = user.id
    document.getElementById("userUsername").value = user.username
    passwordOptional.textContent = "(opzionale)"
    passwordInput.required = false
  } else {
    title.textContent = "Nuovo Utente"
    document.getElementById("userId").value = ""
    passwordOptional.textContent = "*"
    passwordInput.required = true
  }

  modal.classList.add("active")
}

function closeUserModal() {
  document.getElementById("modalUser").classList.remove("active")
}

function editUser(id) {
  const user = utenti.find((u) => u.id === id)
  if (user) openUserModal(user)
}

async function deleteUser(id) {
  if (!confirm("Sei sicuro di voler eliminare questo utente?")) return

  try {
    const res = await fetch(`${API_URL}/utenti/${id}`, { method: "DELETE" })
    const data = await res.json()

    if (res.ok) {
      alert("Utente eliminato con successo!")
      loadUtenti()
    } else {
      alert(data.error || "Errore durante l'eliminazione")
    }
  } catch (error) {
    alert("Errore di connessione")
  }
}

document.getElementById("formUser").addEventListener("submit", async (e) => {
  e.preventDefault()

  const id = document.getElementById("userId").value
  const username = document.getElementById("userUsername").value.trim()
  const password = document.getElementById("userPassword").value

  const method = id ? "PUT" : "POST"
  const url = id ? `${API_URL}/utenti/${id}` : `${API_URL}/utenti`

  const body = { username }
  if (password) body.password = password

  try {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })

    const data = await res.json()

    if (res.ok) {
      alert(id ? "Utente aggiornato!" : "Utente creato!")
      closeUserModal()
      loadUtenti()
    } else {
      alert(data.error || "Errore durante il salvataggio")
    }
  } catch (error) {
    alert("Errore di connessione")
  }
})
