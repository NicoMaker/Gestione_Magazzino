// ==================== GESTIONE MARCHE ====================
// File: marche.js
// Scopo: Caricamento, rendering, creazione, modifica ed eliminazione marche

async function loadMarche() {
  try {
    const res = await fetch(`${API_URL}/marche`);
    if (!res.ok) throw new Error(`Errore HTTP: ${res.status}`);
    allMarche = await res.json();
    marche = allMarche;
    renderMarche();
    reapplyFilter("filterMarche");
  } catch (error) {
    console.error("❌ Errore caricamento marche:", error);
  }
}

function renderMarche() {
  const tbody = document.getElementById("marcheTableBody");
  if (!tbody) return;

  if (marche.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="3" class="text-center">
          <div style="padding:40px 20px;color:var(--text-secondary);">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                 style="width:48px;height:48px;margin:0 auto 16px;opacity:0.5;">
              <path d="M20 7h-9M14 17H5M3 7h2M21 17h-4M15 12h6M9 12H3M15 6v12M9 6v12"/>
            </svg>
            <p style="font-size:16px;font-weight:600;margin-bottom:8px;">Nessuna marca presente</p>
            <p style="font-size:14px;">Clicca su "Nuova Marca" per iniziare</p>
          </div>
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = marche
    .map((m) => {
      const prodottiCount = parseInt(m.prodotti_count) || 0;
      const badgeClass = prodottiCount > 0 ? "has-products" : "empty";
      return `
      <tr>
        <td><strong style="font-size:15px;">${escapeHtml(m.nome)}</strong></td>
        <td class="text-center-badge">
          <span class="prodotti-badge ${badgeClass}">${prodottiCount}</span>
        </td>
        <td class="text-right">
          <button class="btn-icon btn-modifica" onclick="editMarca(${m.id})" title="Modifica">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button class="btn-icon btn-elimina" onclick="deleteMarca(${m.id},'${escapeHtml(m.nome)}')" title="Elimina">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
          </button>
        </td>
      </tr>`;
    })
    .join("");
}

function editMarca(id) {
  const marca = marche.find((m) => m.id === id);
  if (marca) openMarcaModal(marca);
}

async function deleteMarca(id, nome) {
  const prodottiCount = allProdotti.filter((p) => p.marca_id === id).length;
  let messaggio = `Sei sicuro di voler eliminare la marca "<strong>${escapeHtml(nome)}</strong>"?`;
  if (prodottiCount > 0) {
    messaggio += `
      <div style="margin-top:15px;padding:12px;background:rgba(239,68,68,0.1);border-radius:8px;">
        <span style="color:var(--danger);font-weight:700;display:block;">⚠️ ATTENZIONE</span>
        Ci sono <strong>${prodottiCount}</strong> prodotti collegati. non ti lascia eliminare!
      </div>`;
  }
  const confermato = await showConfirmModal(messaggio, "Elimina Marca");
  if (!confermato) return;

  try {
    const res = await fetch(`${API_URL}/marche/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (res.ok) {
      showAlertModal(
        `Marca "${nome}" eliminata.`,
        "Operazione Completata",
        "success",
      );
      await loadMarche();
      if (prodottiCount > 0) await loadProdotti();
    } else {
      throw new Error(data.error || "Errore eliminazione");
    }
  } catch (error) {
    showAlertModal(`Errore: ${error.message}`, "Errore", "error");
  }
}

// ── Submit form marca ────────────────────────────────────────
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
      if (typeof ignoreNextSocketUpdate === "function")
        ignoreNextSocketUpdate();
      alert(id ? "Marca aggiornata!" : "Marca creata!");
      closeMarcaModal();
      loadMarche();
    } else {
      alert(data.error || "Errore durante il salvataggio");
    }
  } catch {
    alert("Errore di connessione");
  }
});