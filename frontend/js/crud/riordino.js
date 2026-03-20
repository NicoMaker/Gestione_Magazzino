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
    // Prepopola i dati dal movimento precedente
    // Passa true per indicare che è un riordino vero (non una modifica)
    precompileRiordino(movimento, true);
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

  // Mostra info di riordino
  const giacenzaInfo = document.getElementById("giacenzaInfo");
  if (giacenzaInfo) {
    giacenzaInfo.innerHTML = `
      <div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:12px;border-radius:6px;margin-bottom:16px;position:sticky;top:0;z-index:10;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
        <strong style="color:#92400e;">📋 RIORDINO BASATO SU CARICO PRECEDENTE</strong>
        <p style="font-size:13px;color:#b45309;margin-top:4px;">
          Tutti i dati sono precompilati. Modifica ciò che serve!
        </p>
      </div>`;
    giacenzaInfo.style.display = "block";
  }

  // Ricerca e selezione prodotto
  const searchInput = document.getElementById("movimentoProdottoSearch");
  const hiddenInput = document.getElementById("movimentoProdotto");
  const prodotto = prodotti.find((p) => p.id === movimento.prodotto_id);

  if (prodotto) {
    selectedProdottoId = prodotto.id;
    hiddenInput.value = prodotto.id;
    const marcaLabel = prodotto.marca_nome ? ` (${prodotto.marca_nome.toUpperCase()})` : "";
    searchInput.value = `${prodotto.nome}${marcaLabel}`;
    searchInput.classList.add("has-selection");

    // Mostra info giacenza
    showGiacenzaInfo(prodotto.id);
  } else {
    // Prodotto è stato eliminato - Mostra un avviso ma permetti comunque il riordino
    selectedProdottoId = null;
    hiddenInput.value = "";
    searchInput.value = `[PRODOTTO ELIMINATO - ID: ${movimento.prodotto_id}]`;
    searchInput.classList.add("has-selection");
    
    // Mostra avviso
    const avviso = document.createElement("div");
    avviso.style.cssText = "background:#fee2e2;border-left:4px solid #ef4444;padding:12px;border-radius:6px;margin-bottom:16px;position:sticky;top:0;z-index:10;box-shadow:0 2px 8px rgba(0,0,0,0.1);";
    avviso.innerHTML = `
      <strong style="color:#991b1b;">⚠️ PRODOTTO ELIMINATO</strong>
      <p style="font-size:13px;color:#b45309;margin-top:4px;">
        Il prodotto di questo carico è stato eliminato dal sistema.
        Seleziona un nuovo prodotto prima di salvare.
      </p>`;
    
    const giacenzaParent = giacenzaInfo.parentNode;
    giacenzaParent.insertBefore(avviso, giacenzaInfo);
  }

  // Imposta la data dal movimento precedente
  const dataInput = document.getElementById("movimentoData");
  // Prendi la data dal movimento precedente (es: "2024-03-20")
  const dataMovimento = movimento.data_movimento.split("T")[0]; // Se contiene datetime
  dataInput.value = dataMovimento;

  // Quantità: stessa del carico precedente (sempre con 2 decimali)
  const quantitaValue = parseFloat(movimento.quantita || 0).toFixed(2);
  document.getElementById("movimentoQuantita").value = quantitaValue;

  // Prezzo: stessa del carico precedente (sempre con 2 decimali)
  const prezzoValue = parseFloat(movimento.prezzo || 0).toFixed(2);
  document.getElementById("movimentoPrezzo").value = prezzoValue;

  // Fattura: stessa del carico precedente (opzionale, può essere modificata)
  document.getElementById("movimentoFattura").value = movimento.fattura_doc || "";

  // Fornitore: stesso del carico precedente
  document.getElementById("movimentoFornitore").value = movimento.fornitore_cliente_id || "";

  // Focus sul primo campo modificabile
  // Se il prodotto non esiste, permetti di cercarne uno nuovo
  if (prodotto) {
    document.getElementById("movimentoQuantita").focus();
  } else {
    document.getElementById("movimentoProdottoSearch").focus();
  }

  // Mostra un messaggio di conferma
  console.log("✅ Form riordino precompilato");
  console.log("📋 Dettagli riordino:", {
    prodotto: prodotto?.nome || `[ELIMINATO - ID: ${movimento.prodotto_id}]`,
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