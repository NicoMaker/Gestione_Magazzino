// ==================== GESTIONE RIORDINI ====================
// File: riordino.js
// Scopo: Funzionalità di riordino basata su movimenti precedenti di carico

/**
 * Apre il modal di movimento precompilato per un riordino
 * @param {Object} movimento - Il movimento di carico su cui basare il riordino
 */
function openRiordinoModal(movimento) {
  // Verifica che sia un movimento di CARICO
  if (movimento.tipo !== "carico") {
    alert("❌ Puoi riordinare solo i carichi!");
    return;
  }

  // Apri il modal movimento
  openMovimentoModal(null); // Null = nuovo movimento

  // Attendi che il modal sia aperto (un frame)
  setTimeout(() => {
    // Cambia il titolo DOPO l'apertura del modal
    const modalTitle = document.getElementById("modalMovimentoTitle");
    if (modalTitle) {
      modalTitle.textContent = "Nuovo Movimento (Riordino)";
    }
    // Prepopola i dati dal movimento precedente
    precompileRiordino(movimento);
  }, 100);
}

/**
 * Prepopila il form movimento con i dati del carico precedente
 * @param {Object} movimento - Il movimento di carico precedente
 */
function precompileRiordino(movimento) {
  // Reset dell'ID (così sarà un nuovo movimento)
  document.getElementById("movimentoId").value = "";

  // Imposta il tipo a CARICO
  const tipoSelect = document.getElementById("movimentoTipo");
  tipoSelect.value = "carico";
  togglePrezzoField(); // Mostra i campi di prezzo

  // ========== PULIZIA FLAGS PRECEDENTI ==========
  const giacenzaInfo = document.getElementById("giacenzaInfo");
  if (giacenzaInfo && giacenzaInfo.parentNode) {
    const oldFlags = giacenzaInfo.parentNode.querySelectorAll('[data-riordino-flag="true"]');
    oldFlags.forEach((el) => el.remove());
  }

  // ========== RICERCA PRODOTTO ==========
  const searchInput = document.getElementById("movimentoProdottoSearch");
  const hiddenInput = document.getElementById("movimentoProdotto");
  // Usa allProdotti (lista COMPLETA)
  const prodotto = allProdotti.find((p) => p.id === movimento.prodotto_id);

  if (prodotto) {
    // ✅ PRODOTTO ESISTE: Seleziona il prodotto e mostra flag + giacenza
    selectedProdottoId = prodotto.id;
    hiddenInput.value = prodotto.id;
    const marcaLabel = prodotto.marca_nome ? ` (${prodotto.marca_nome.toUpperCase()})` : "";
    searchInput.value = `${prodotto.nome}${marcaLabel}`;
    searchInput.classList.add("has-selection");

    // Mostra info giacenza
    showGiacenzaInfo(prodotto.id);

    // Mostra FLAG GIALLO di riordino
    if (giacenzaInfo && giacenzaInfo.parentNode) {
      const flagRiordino = document.createElement("div");
      flagRiordino.setAttribute("data-riordino-flag", "true");
      flagRiordino.style.cssText = "background:#fef3c7;border-left:4px solid #f59e0b;padding:12px;border-radius:6px;margin-bottom:8px;box-shadow:0 2px 8px rgba(0,0,0,0.1);";
      flagRiordino.innerHTML = `
        <strong style="color:#92400e;">📋 RIORDINO BASATO SU CARICO PRECEDENTE</strong>
        <p style="font-size:13px;color:#b45309;margin-top:4px;">
          I dati sono precompilati. Modifica ciò che serve!
        </p>`;
      giacenzaInfo.parentNode.insertBefore(flagRiordino, giacenzaInfo);
      giacenzaInfo.style.display = "block";
    }

    // Focus sulla quantità (il dato da modificare di solito)
    document.getElementById("movimentoQuantita").focus();

  } else {
    // ❌ PRODOTTO ELIMINATO: Nessun avviso, semplicemente precompila i dati
    selectedProdottoId = null;
    hiddenInput.value = "";
    searchInput.value = "";
    searchInput.classList.remove("has-selection");
    
    // Non mostrare nessun avviso - semplicemente procedi con i dati del movimento
    if (giacenzaInfo) {
      giacenzaInfo.style.display = "none";
    }

    // Focus sulla ricerca prodotto per permettere di cercarne uno nuovo
    document.getElementById("movimentoProdottoSearch").focus();
  }

  // ========== PRECOMPILA CAMPI NUMERICI E DATI ==========
  // Imposta la data dal movimento precedente
  const dataInput = document.getElementById("movimentoData");
  const dataMovimento = movimento.data_movimento.split("T")[0];
  dataInput.value = dataMovimento;

  // Quantità: stessa del carico precedente
  const quantitaValue = parseFloat(movimento.quantita || 0).toFixed(2);
  document.getElementById("movimentoQuantita").value = quantitaValue;

  // Prezzo: stessa del carico precedente
  const prezzoValue = parseFloat(movimento.prezzo || 0).toFixed(2);
  document.getElementById("movimentoPrezzo").value = prezzoValue;

  // Fattura: stessa del carico precedente
  document.getElementById("movimentoFattura").value = movimento.fattura_doc || "";

  // Fornitore: stesso del carico precedente
  document.getElementById("movimentoFornitore").value = movimento.fornitore_cliente_id || "";

  // ========== LOG DI DEBUG ==========
  console.log("✅ Form riordino precompilato");
  console.log("📋 Dettagli:", {
    prodotto: prodotto?.nome || `[Prodotto ID: ${movimento.prodotto_id}]`,
    quantita: movimento.quantita,
    prezzo: movimento.prezzo,
    fornitore: movimento.fornitore_cliente_id,
    documento: movimento.fattura_doc,
  });
}

/**
 * Apre il modal movimento senza dati
 * Questa funzione viene chiamata da openMovimentoModal(null)
 */
function resetMovimentoForm() {
  document.getElementById("movimentoId").value = "";
  document.getElementById("movimentoProdotto").value = "";
  document.getElementById("movimentoProdottoSearch").value = "";
  document.getElementById("movimentoProdottoSearch").classList.remove("has-selection");
  document.getElementById("movimentoTipo").value = "carico";
  document.getElementById("movimentoQuantita").value = "";
  document.getElementById("movimentoPrezzo").value = "";
  document.getElementById("movimentoData").value = new Date()
    .toISOString()
    .split("T")[0];
  document.getElementById("movimentoFattura").value = "";
  document.getElementById("movimentoFornitore").value = "";
  document.getElementById("giacenzaInfo").style.display = "none";

  selectedProdottoId = null;
  togglePrezzoField();
}

/**
 * Gestisce il click sul bottone Riordina nella tabella
 * @param {number} movimentoId - ID del movimento di carico
 */
function handleRiordino(movimentoId) {
  const movimento = allMovimenti.find((m) => m.id === movimentoId);

  if (!movimento) {
    alert("❌ Movimento non trovato");
    return;
  }

  if (movimento.tipo !== "carico") {
    alert("❌ Puoi riordinare solo i carichi!");
    return;
  }

  // Apri il modal con i dati precompilati
  // NON bloccare se il prodotto è stato eliminato
  // I dati del movimento vengono comunque usati per il riordino
  openRiordinoModal(movimento);
}

// Esporta globalmente per uso negli onclick HTML
window.handleRiordino = handleRiordino;