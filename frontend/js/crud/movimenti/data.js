// ==================== MOVIMENTI: DATA / CRUD ====================
// File: js/crud/movimenti/data.js
// Scopo: caricamento dalla API, eliminazione, submit del form (create/update).
//        Il rendering è in render.js, la ricerca prodotto in search.js.
// Stato condiviso: allMovimenti, movimenti, prodotti (config.js)

// ── Caricamento ──────────────────────────────────────────────
async function loadMovimenti() {
  try {
    const res = await fetch(`${API_URL}/dati/`);
    if (!res.ok) {
      movimenti = [];
      allMovimenti = [];
      renderMovimenti();
      renderAlertRiordino();
      return;
    }
    const data = await res.json();
    allMovimenti = Array.isArray(data) ? data : [];
    movimenti = allMovimenti;
    renderMovimenti();
    renderAlertRiordino();
    injectDateFilters();
    reapplyFilter("filterMovimenti");

    // Applica il filtro per tipo salvato in localStorage
    const savedTipo = localStorage.getItem("movimenti_tipo_filter");
    if (savedTipo) {
      const tipoFilterElement = document.getElementById("movimentiTipoFilter");
      if (tipoFilterElement) tipoFilterElement.value = savedTipo;
    }
    filterMovimenti();
  } catch (error) {
    console.error("Errore caricamento movimenti", error);
  }
}

// ── Modifica (apre il modal) ─────────────────────────────────
function editMovimento(id) {
  const movimento = movimenti.find((m) => m.id === id);
  if (movimento) openMovimentoModal(movimento);
}

// ── Giacenza info nel modal ──────────────────────────────────
async function showGiacenzaInfo(prodottoId) {
  const prodotto = prodotti.find((p) => p.id == prodottoId);
  if (prodotto) {
    const el = document.getElementById("giacenzaValue");
    const gi = document.getElementById("giacenzaInfo");
    if (el)
      el.textContent = `${prodotto.nome}${prodotto.marca_nome ? ` (${prodotto.marca_nome})` : ""} - Giacenza: ${formatQuantity(prodotto.giacenza || 0)} PZ/L`;
    if (gi) gi.style.display = "block";
  }
}

// ── Eliminazione ─────────────────────────────────────────────
async function deleteMovimento(id, prodottoNome, tipo) {
  const tipoLabel = tipo === "carico" ? "CARICO" : "SCARICO";
  const messaggio = `
    Sei sicuro di voler eliminare questo movimento di <strong>${tipoLabel}</strong>?
    <div style="margin-top:12px;padding:10px;background:rgba(99,102,241,0.1);border-radius:6px;">
      <strong>Prodotto:</strong> ${escapeHtml(prodottoNome)}
    </div>`;
  const confermato = await showConfirmModal(messaggio, "Elimina Movimento");
  if (!confermato) return;

  try {
    const res = await fetch(`${API_URL}/dati/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (res.ok) {
      if (typeof ignoreNextSocketUpdate === "function")
        ignoreNextSocketUpdate();
      showAlertModal(
        "Movimento eliminato con successo!",
        "Operazione Completata",
        "success",
      );
      await loadMovimenti();
      await loadProdotti();
    } else {
      throw new Error(data.error || "Errore eliminazione");
    }
  } catch (error) {
    showAlertModal(`Errore: ${error.message}`, "Errore", "error");
  }
}

// ── Submit form movimento (create / update) ──────────────────
document
  .getElementById("formMovimento")
  .addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("movimentoId").value;
    const prodotto_id = document.getElementById("movimentoProdotto").value;
    const tipo = document.getElementById("movimentoTipo").value;
    const quantita = parseDecimalInput(
      document.getElementById("movimentoQuantita").value,
    );
    const data_mov = document.getElementById("movimentoData").value;

    let prezzo = null;
    if (tipo === "carico")
      prezzo = parseDecimalInput(
        document.getElementById("movimentoPrezzo").value,
      );

    const fattura_doc =
      tipo === "carico"
        ? document.getElementById("movimentoFattura").value.trim() || null
        : null;
    const fornitore =
      tipo === "carico"
        ? document.getElementById("movimentoFornitore").value.trim() || null
        : null;

    if (!prodotto_id || !tipo || !quantita || !data_mov) {
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
          quantita: parseFloat(quantita.toFixed(2)),
          prezzo: prezzo ? parseFloat(prezzo.toFixed(2)) : null,
          data_movimento: data_mov,
          fattura_doc,
          fornitore,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        if (typeof skipNextSocketUpdate === "function") skipNextSocketUpdate();
        alert(id ? "Movimento aggiornato!" : "Movimento registrato!");
        closeMovimentoModal();
        loadMovimenti();
        loadProdotti();
      } else {
        alert(data.error || "Errore durante il salvataggio");
      }
    } catch {
      alert("Errore di connessione");
    }
  });

// ── Esposizione globale (chiamate da onclick inline) ─────────
window.editMovimento = editMovimento;
window.deleteMovimento = deleteMovimento;
