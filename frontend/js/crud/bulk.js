// ==================== ELIMINAZIONE MULTIPLA ====================
// File: js/crud/bulk.js
// Scopo: selezione con checkbox + "Elimina selezionati" per Marche, Prodotti,
//        Movimenti e Utenti. Vengono eliminati solo gli elementi eliminabili,
//        gli altri vengono saltati e mostrati con il motivo (stesso
//        comportamento del bulk clienti del Gestionale-Fiscale).

const BULK_CONFIG = {
  marche: {
    endpoint: "marche",
    singolare: "marca",
    plurale: "marche",
    lista: () => allMarche,
    nome: (x) => x.nome,
    ricarica: async () => {
      await loadMarche();
      if (typeof loadProdotti === "function") await loadProdotti();
    },
  },
  prodotti: {
    endpoint: "prodotti",
    singolare: "prodotto",
    plurale: "prodotti",
    lista: () => allProdotti,
    nome: (x) => x.nome,
    ricarica: async () => {
      await loadProdotti();
      if (typeof loadMarche === "function") await loadMarche();
      if (typeof loadMovimenti === "function") await loadMovimenti();
    },
  },
  movimenti: {
    endpoint: "dati",
    singolare: "movimento",
    plurale: "movimenti",
    lista: () => allMovimenti,
    nome: (x) => `${x.tipo} ${x.prodotto_nome}`,
    ricarica: async () => {
      await loadMovimenti();
      if (typeof loadProdotti === "function") await loadProdotti();
    },
  },
  utenti: {
    endpoint: "utenti",
    singolare: "utente",
    plurale: "utenti",
    lista: () => allUtenti,
    nome: (x) => x.username,
    ricarica: async () => {
      await loadUtenti();
    },
  },
};

function bulkChecked(entity) {
  return Array.from(
    document.querySelectorAll(`.bulk-cb[data-entity="${entity}"]:checked`),
  ).map((cb) => parseInt(cb.dataset.id));
}

// Checkbox da inserire nella riga della tabella
function bulkCheckboxCell(entity, id) {
  return `<td class="bulk-col"><input type="checkbox" class="bulk-cb" data-entity="${entity}" data-id="${id}" onchange="bulkUpdateToolbar('${entity}')" title="Seleziona"></td>`;
}

function bulkUpdateToolbar(entity) {
  const toolbar = document.getElementById(`bulkToolbar-${entity}`);
  const countEl = document.getElementById(`bulkCount-${entity}`);
  const selAll = document.getElementById(`bulkAll-${entity}`);
  const all = document.querySelectorAll(`.bulk-cb[data-entity="${entity}"]`);
  const n = bulkChecked(entity).length;
  if (toolbar) toolbar.style.display = n > 0 ? "flex" : "none";
  if (countEl) countEl.textContent = n + (n === 1 ? " selezionato" : " selezionati");
  if (selAll) {
    selAll.checked = n > 0 && n === all.length;
    selAll.indeterminate = n > 0 && n < all.length;
  }
}

function bulkToggleAll(entity, source) {
  document
    .querySelectorAll(`.bulk-cb[data-entity="${entity}"]`)
    .forEach((cb) => (cb.checked = source.checked));
  bulkUpdateToolbar(entity);
}

function bulkClear(entity) {
  document
    .querySelectorAll(`.bulk-cb[data-entity="${entity}"]`)
    .forEach((cb) => (cb.checked = false));
  bulkUpdateToolbar(entity);
}

async function bulkDelete(entity) {
  const cfg = BULK_CONFIG[entity];
  const ids = bulkChecked(entity);
  if (ids.length === 0) return;

  const plurale = ids.length === 1 ? cfg.singolare : cfg.plurale;
  const confermato = await showConfirmModal(
    `<div style="text-align:center;">Stai per eliminare <strong>${ids.length}</strong> ${plurale}.<br><br>` +
      `Verranno eliminati solo quelli eliminabili: gli altri verranno saltati.<br>Confermi?</div>`,
    `Elimina ${cfg.plurale}`,
  );
  if (!confermato) return;

  try {
    const body = { ids };
    if (entity === "utenti")
      body.current_user = localStorage.getItem("username") || "";

    const res = await fetch(`${API_URL}/${cfg.endpoint}/elimina-multiple`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Errore eliminazione multipla");

    if (typeof ignoreNextSocketUpdate === "function") ignoreNextSocketUpdate();

    // nomi per il riepilogo degli elementi saltati
    const nomi = {};
    cfg.lista().forEach((x) => (nomi[x.id] = cfg.nome(x)));

    const ok = data.eliminati.length;
    const ko = data.saltati.length;
    let msg = "";
    if (ok > 0)
      msg += `<div style="text-align:center;margin-bottom:10px;">🗑️ Eliminati <strong>${ok}</strong> ${ok === 1 ? cfg.singolare : cfg.plurale}.</div>`;
    if (ko > 0) {
      msg += `<div style="margin-top:6px;">⚠️ <strong>${ko}</strong> non eliminabil${ko === 1 ? "e" : "i"}:</div><ul style="margin:8px 0 0 18px;text-align:left;max-height:200px;overflow:auto;">`;
      msg += data.saltati
        .map(
          (s) =>
            `<li><strong>${escapeHtml(nomi[s.id] || s.nome)}</strong> — ${escapeHtml(s.motivo)}</li>`,
        )
        .join("");
      msg += "</ul>";
    }
    showAlertModal(
      msg,
      "Eliminazione multipla",
      ok > 0 ? (ko > 0 ? "info" : "success") : "error",
    );

    bulkClear(entity);
    await cfg.ricarica();
  } catch (error) {
    showAlertModal(`Errore: ${error.message}`, "Errore", "error");
  }
}

// Dopo ogni render della tabella la selezione si azzera: aggiorna la toolbar
function bulkAfterRender(entity) {
  bulkUpdateToolbar(entity);
}
