// ==================== SELEZIONE MULTIPLA + ELIMINAZIONE ====================
// File: js/shared/bulk-selection.js
// Scopo: aggiunge a qualsiasi tabella la selezione con checkbox e il pulsante
//        "Elimina selezionati". Elimina in blocco ciò che è eliminabile, salta
//        gli elementi collegati ad altri dati e mostra un riepilogo finale con
//        cosa è stato eliminato e cosa no (con il motivo).
//
// Uso (una volta per tabella):
//   BulkSelection.register({
//     key: "marche",
//     tbody: "marcheTableBody",          // id del <tbody>
//     endpoint: "marche/bulk-delete",    // relativo ad API_URL
//     singolare: "marca", plurale: "marche", femminile: true,
//     onDone: () => loadMarche(),        // ricarica dopo l'eliminazione
//   });
//
// Nelle righe della tabella serve una cella con:
//   <td class="col-select"><input type="checkbox" class="bulk-check"
//        data-id="12" data-label="Nome leggibile"></td>
// e nell'intestazione: <th class="col-select"><input type="checkbox" class="bulk-check-all"></th>
(function () {
  "use strict";

  const istanze = new Map();

  const esc = (t) =>
    String(t ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );

  const apiBase = () => (typeof API_URL !== "undefined" ? API_URL : "api");

  // Accordo di genere/numero: selezionat-o/a/i/e, eliminat-o/a/i/e
  function suffisso(n, femminile) {
    if (n === 1) return femminile ? "a" : "o";
    return femminile ? "e" : "i";
  }

  class Istanza {
    constructor(cfg) {
      this.cfg = { femminile: false, ...cfg };
      this.selezionati = new Map(); // id -> etichetta
      this.tbody = document.getElementById(cfg.tbody);
      if (!this.tbody) return;
      this.tabella = this.tbody.closest("table");
      this.card = this.tbody.closest(".card") || this.tabella;
      this.creaToolbar();
      this.collegaEventi();
      this.sincronizza();
    }

    // ── Toolbar sopra la tabella ──
    creaToolbar() {
      const bar = document.createElement("div");
      bar.className = "bulk-toolbar";
      bar.hidden = true;
      bar.setAttribute("role", "region");
      bar.setAttribute("aria-live", "polite");
      bar.innerHTML = `
        <span class="bulk-toolbar-count"></span>
        <span class="bulk-toolbar-actions">
          <button type="button" class="bulk-btn bulk-btn-ghost" data-act="clear">Deseleziona</button>
          <button type="button" class="bulk-btn bulk-btn-danger" data-act="delete">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
            <span>Elimina selezionati</span>
          </button>
        </span>`;
      this.card.parentNode.insertBefore(bar, this.card);
      this.toolbar = bar;
      bar.addEventListener("click", (e) => {
        const act = e.target.closest("[data-act]")?.dataset.act;
        if (act === "clear") this.svuota();
        if (act === "delete") this.chiediConferma();
      });
    }

    collegaEventi() {
      this.tbody.addEventListener("change", (e) => {
        const cb = e.target.closest(".bulk-check");
        if (!cb) return;
        const id = Number(cb.dataset.id);
        if (cb.checked) this.selezionati.set(id, cb.dataset.label || `#${id}`);
        else this.selezionati.delete(id);
        this.sincronizza(false);
      });

      const tutti = this.tabella?.querySelector(".bulk-check-all");
      if (tutti) {
        tutti.addEventListener("change", () => {
          this.checkboxRighe().forEach((cb) => {
            const id = Number(cb.dataset.id);
            if (tutti.checked)
              this.selezionati.set(id, cb.dataset.label || `#${id}`);
            else this.selezionati.delete(id);
          });
          this.sincronizza();
        });
      }

      // Dopo ogni render della tabella (filtri, realtime, ricarica) riallinea le spunte
      new MutationObserver(() => this.sincronizza()).observe(this.tbody, {
        childList: true,
      });
    }

    checkboxRighe() {
      return [...this.tbody.querySelectorAll(".bulk-check")];
    }

    // Riallinea checkbox, evidenziazione righe, select-all e toolbar con lo stato
    sincronizza(aggiornaRighe = true) {
      const righe = this.checkboxRighe();
      const presenti = new Set(righe.map((cb) => Number(cb.dataset.id)));
      // Toglie dalla selezione ciò che non è più in tabella (filtrato o eliminato)
      for (const id of [...this.selezionati.keys()]) {
        if (!presenti.has(id)) this.selezionati.delete(id);
      }
      righe.forEach((cb) => {
        const sel = this.selezionati.has(Number(cb.dataset.id));
        if (aggiornaRighe) cb.checked = sel;
        cb.closest("tr")?.classList.toggle("is-selected", sel);
      });

      const tutti = this.tabella?.querySelector(".bulk-check-all");
      if (tutti) {
        const n = righe.filter((cb) => cb.checked).length;
        tutti.disabled = righe.length === 0;
        tutti.checked = righe.length > 0 && n === righe.length;
        tutti.indeterminate = n > 0 && n < righe.length;
      }

      const n = this.selezionati.size;
      this.toolbar.hidden = n === 0;
      const { singolare, plurale, femminile } = this.cfg;
      this.toolbar.querySelector(".bulk-toolbar-count").textContent =
        `${n} ${n === 1 ? singolare : plurale} selezionat${suffisso(n, femminile)}`;
    }

    svuota() {
      this.selezionati.clear();
      this.sincronizza();
    }

    // ── Conferma ──
    async chiediConferma() {
      const n = this.selezionati.size;
      if (n === 0) return;
      const { singolare, plurale } = this.cfg;
      const nomi = [...this.selezionati.values()];
      const mostrati = nomi
        .slice(0, 8)
        .map((x) => `<li>${esc(x)}</li>`)
        .join("");
      const altri =
        nomi.length > 8
          ? `<li class="bulk-more">…e altri ${nomi.length - 8}</li>`
          : "";

      const ok = await Dialogo.apri({
        titolo: `Eliminare ${n} ${n === 1 ? singolare : plurale}?`,
        corpo: `
          <ul class="bulk-list">${mostrati}${altri}</ul>
          <p class="bulk-note">Quelli collegati ad altri dati <strong>non verranno eliminati</strong>:
          elimino solo ciò che è possibile e alla fine ti mostro il riepilogo.</p>`,
        conferma: "Elimina",
        annulla: "Annulla",
        pericolo: true,
      });
      if (ok) await this.elimina();
    }

    // ── Chiamata API + riepilogo ──
    async elimina() {
      const ids = [...this.selezionati.keys()];
      const btn = this.toolbar.querySelector('[data-act="delete"]');
      btn.disabled = true;
      btn.querySelector("span").textContent = "Eliminazione…";
      let risultato = null;
      let errore = null;

      try {
        const extra =
          typeof this.cfg.extraBody === "function" ? this.cfg.extraBody() : {};
        const res = await fetch(`${apiBase()}/${this.cfg.endpoint}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids, ...extra }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || `Errore ${res.status}`);
        risultato = data;
      } catch (err) {
        errore = err.message || "Errore di connessione";
      }

      btn.disabled = false;
      btn.querySelector("span").textContent = "Elimina selezionati";

      if (errore) {
        await Dialogo.apri({
          titolo: "Eliminazione non riuscita",
          corpo: `<p class="bulk-note">${esc(errore)}</p>`,
          conferma: "Chiudi",
          tipo: "errore",
        });
        return;
      }

      this.selezionati.clear();
      try {
        if (typeof this.cfg.onDone === "function")
          await this.cfg.onDone(risultato);
      } catch (e) {
        console.error("BulkSelection onDone:", e);
      }
      this.sincronizza();
      await Dialogo.apri({
        titolo: "Riepilogo eliminazione",
        corpo: this.htmlRiepilogo(risultato),
        conferma: "Ok",
        tipo: risultato.non_eliminati_count ? "avviso" : "successo",
      });
      if (typeof this.cfg.afterSummary === "function")
        this.cfg.afterSummary(risultato);
    }

    htmlRiepilogo(r) {
      const { singolare, plurale } = this.cfg;
      const el = r.eliminati || [];
      const ne = r.non_eliminati || [];
      const lista = (arr, cls, mostraMotivo) =>
        `<ul class="bulk-result-list ${cls}">${arr
          .map(
            (x) =>
              `<li><span class="bulk-result-name">${esc(x.etichetta)}</span>${
                mostraMotivo
                  ? `<span class="bulk-result-reason">${esc(x.motivo)}</span>`
                  : ""
              }</li>`,
          )
          .join("")}</ul>`;

      let html = `<p class="bulk-summary">${esc(r.message || "")}</p>`;
      if (el.length) {
        html += `<h4 class="bulk-result-title ok">Eliminati (${el.length})</h4>${lista(el, "ok", false)}`;
      }
      if (ne.length) {
        html += `<h4 class="bulk-result-title skip">Non eliminati perché collegati (${ne.length})</h4>${lista(ne, "skip", true)}
          <p class="bulk-note">Per eliminarli devi prima rimuovere i dati collegati.</p>`;
      }
      if (!el.length && !ne.length) {
        html += `<p class="bulk-note">Nessun ${esc(singolare)} da eliminare.</p>`;
      }
      return html;
    }
  }

  // ── Dialogo modale minimale (indipendente dai modali dell'app) ──
  const Dialogo = {
    apri({
      titolo,
      corpo,
      conferma = "Ok",
      annulla = null,
      pericolo = false,
      tipo = "info",
    }) {
      return new Promise((resolve) => {
        const precedente = document.activeElement;
        const overlay = document.createElement("div");
        overlay.className = "bulk-overlay";
        overlay.innerHTML = `
          <div class="bulk-dialog bulk-${tipo}" role="dialog" aria-modal="true" aria-labelledby="bulkDlgTitle">
            <h3 id="bulkDlgTitle">${esc(titolo)}</h3>
            <div class="bulk-dialog-body">${corpo}</div>
            <div class="bulk-dialog-actions">
              ${annulla ? `<button type="button" class="bulk-btn bulk-btn-ghost" data-r="0">${esc(annulla)}</button>` : ""}
              <button type="button" class="bulk-btn ${pericolo ? "bulk-btn-danger" : "bulk-btn-primary"}" data-r="1">${esc(conferma)}</button>
            </div>
          </div>`;
        const chiudi = (esito) => {
          document.removeEventListener("keydown", tasti);
          overlay.remove();
          precedente?.focus?.();
          resolve(esito);
        };
        const tasti = (e) => {
          if (e.key === "Escape") chiudi(false);
        };
        overlay.addEventListener("click", (e) => {
          if (e.target === overlay) chiudi(false);
          const r = e.target.closest("[data-r]")?.dataset.r;
          if (r !== undefined) chiudi(r === "1");
        });
        document.addEventListener("keydown", tasti);
        document.body.appendChild(overlay);
        overlay.querySelector('[data-r="1"]').focus();
      });
    },
  };

  window.BulkSelection = {
    register(cfg) {
      const i = new Istanza(cfg);
      istanze.set(cfg.key, i);
      return i;
    },
    esc, // escape HTML per costruire data-label nelle righe
    get: (key) => istanze.get(key),
    clear: (key) => istanze.get(key)?.svuota(),
  };
})();
