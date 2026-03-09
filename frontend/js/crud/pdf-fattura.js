// ==================== CARICO DA FATTURA PDF ====================
// File: pdf-fattura.js
// Pattern IIFE per evitare inquinamento del namespace globale

(function () {
  "use strict";

  let _cfpFile     = null;
  let _cfpRighe    = [];
  let _cfpProdotti = [];

  // ---- PDF.js ----
  function _loadPDFjs() {
    return new Promise((resolve, reject) => {
      if (window.pdfjsLib) return resolve();
      const s   = document.createElement("script");
      s.src     = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
      s.onload  = () => {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc =
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
        resolve();
      };
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  async function _estraiTesto(file) {
    await _loadPDFjs();
    const buf  = await file.arrayBuffer();
    const pdf  = await window.pdfjsLib.getDocument({ data: buf }).promise;
    let testo  = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page    = await pdf.getPage(i);
      const content = await page.getTextContent();
      testo += "\n--- PAG " + i + " ---\n" + content.items.map((it) => it.str).join(" ");
    }
    return testo;
  }

  async function _analizzaConAI(testo) {
    const righe = testo.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);

    // ── 1. NUMERO DOCUMENTO ──────────────────────────────────────
    let numero_documento = null;
    const patternDoc = [
      /fattura\s+n[°.]?\s*([A-Z0-9\-\/]+)/i,
      /n[°.]?\s*fattura\s*:?\s*([A-Z0-9\-\/]+)/i,
      /ddt\s+n[°.]?\s*([A-Z0-9\-\/]+)/i,
      /documento\s+n[°.]?\s*([A-Z0-9\-\/]+)/i,
      /ordine\s+n[°.]?\s*([A-Z0-9\-\/]+)/i,
      /bolla\s+n[°.]?\s*([A-Z0-9\-\/]+)/i,
      /num(?:ero)?\s*[:\.]?\s*([A-Z0-9]{2,}[\/\-][A-Z0-9]+)/i,
      /^([A-Z]{2,}[\/\-]\d{4}[\/\-]\d+)$/i,
      /^(\d{4}[\/\-]\d+)$/,
    ];
    for (const riga of righe) {
      for (const pat of patternDoc) {
        const m = riga.match(pat);
        if (m && m[1] && m[1].length >= 2) { numero_documento = m[1].trim(); break; }
      }
      if (numero_documento) break;
    }

    // ── 2. DATA DOCUMENTO ────────────────────────────────────────
    let data_documento = null;
    const patternData = [
      /data\s*[:\-]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
      /del\s+(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
      /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})/,
    ];
    for (const riga of righe) {
      for (const pat of patternData) {
        const m = riga.match(pat);
        if (m && m[1]) { const norm = _normData(m[1]); if (norm) { data_documento = norm; break; } }
      }
      if (data_documento) break;
    }
    if (!data_documento) data_documento = new Date().toISOString().split("T")[0];

    // ── 3. FORNITORE ─────────────────────────────────────────────
    let fornitore = null;
    const stopW = ["fattura","ddt","bolla","ordine","data","numero","via","viale","corso","piazza","tel","fax","email","pec","p.iva","partita","cod","cf","rea","cap","comune","prov","intestat","spett","cliente","destinatar","pagament","scadenz","totale","imponibil","iva","importo","descrizione","quantit","prezzo","articolo","codice","riferimento","note","condizioni","banca","iban","swift"];
    for (let i = 0; i < Math.min(15, righe.length); i++) {
      const r = righe[i];
      if (r.length < 3 || r.length > 80) continue;
      const rl = r.toLowerCase();
      if (stopW.some((w) => rl.startsWith(w))) continue;
      if (/^\d/.test(r) || /^[^a-zA-Z]/.test(r)) continue;
      if (/[a-zA-Z]{3,}/.test(r)) { fornitore = r; break; }
    }

    // ── 4. RIGHE PRODOTTO ────────────────────────────────────────
    const righeOutput = [];
    const reQta    = /\b(\d{1,6}(?:[,\.]\d{1,3})?)\s*(l(?:t|itri?)?|pz|pcs|nr|n\.?|pezzi?)?\b/gi;
    const rePrezzo = /€?\s*(\d{1,8}[,\.]\d{2})\b/g;
    const skipL    = ["totale","subtotale","imponibile","iva","sconto","trasporto","spese","acconto","saldo","netto","lordo","descrizione","quantita","quantità","prezzo","importo","articolo","codice","um","u.m.","nr","note"];

    for (const r of righe) {
      if (r.length < 3) continue;
      const rl = r.toLowerCase().trim();
      if (skipL.some((w) => rl === w || rl.startsWith(w + " ") || rl.startsWith(w + ":"))) continue;
      if (/^[-=*_#]+$/.test(r)) continue;

      reQta.lastIndex = 0;
      const qtaMatches = [...r.matchAll(reQta)];
      if (!qtaMatches.length) continue;

      rePrezzo.lastIndex = 0;
      const prezzoMatches = [...r.matchAll(rePrezzo)];

      let quantita = null;
      for (const m of qtaMatches) {
        const v = parseFloat(m[1].replace(",", "."));
        if (v > 0 && v <= 9999) { quantita = v; break; }
      }
      if (!quantita) continue;

      let prezzo_unitario = null;
      if (prezzoMatches.length) {
        const prezzi = prezzoMatches.map((m) => parseFloat(m[1].replace(",", "."))).filter((v) => v > 0).sort((a, b) => a - b);
        if (prezzi.length) prezzo_unitario = prezzi[0];
      }

      let nome = r
        .replace(/€?\s*\d{1,8}[,\.]\d{2}/g, "")
        .replace(/\b\d{1,6}(?:[,\.]\d{1,3})?\s*(?:l(?:t|itri?)?|pz|pcs|nr|n\.?)?\b/gi, "")
        .replace(/\s{2,}/g, " ")
        .trim();

      if (nome.length < 2 || /^[\d\s\.\,\-\/\*]+$/.test(nome)) continue;
      righeOutput.push({ nome_prodotto: nome, quantita, prezzo_unitario });
    }

    return { numero_documento, fornitore, data_documento, righe: righeOutput };
  }

  function _normData(str) {
    if (!str) return null;
    str = str.trim();
    const sep = str.includes("/") ? "/" : str.includes("-") ? "-" : ".";
    const p   = str.split(sep);
    if (p.length !== 3) return null;
    if (p[0].length === 4) return `${p[0]}-${p[1].padStart(2, "0")}-${p[2].padStart(2, "0")}`;
    const y = p[2].length === 2 ? "20" + p[2] : p[2];
    return `${y}-${p[1].padStart(2, "0")}-${p[0].padStart(2, "0")}`;
  }

  async function _loadProdotti() {
    if (_cfpProdotti.length > 0) return _cfpProdotti;
    _cfpProdotti = await fetch(API_URL + "/prodotti").then((r) => r.json());
    return _cfpProdotti;
  }

  function _matchProdotto(nomePDF) {
    if (!nomePDF) return null;
    const q  = nomePDF.toLowerCase().trim();
    let m    = _cfpProdotti.find((p) => p.nome.toLowerCase() === q);
    if (m) return m;
    m = _cfpProdotti.find((p) => q.includes(p.nome.toLowerCase()) || p.nome.toLowerCase().includes(q));
    if (m) return m;
    const pw = q.split(/\s+/).filter((w) => w.length > 2);
    let best = 0, bestM = null;
    _cfpProdotti.forEach((p) => {
      const pp = p.nome.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
      const n  = pw.filter((w) => pp.includes(w)).length;
      if (n >= 2 && n > best) { best = n; bestM = p; }
    });
    return bestM;
  }

  // ---- UI helpers ----
  function _showErr(msg) {
    const el = document.getElementById("cfp-error");
    if (el) { el.innerHTML = msg; el.style.display = "block"; }
  }
  function _hideErr() {
    const el = document.getElementById("cfp-error");
    if (el) el.style.display = "none";
  }
  function _setStep(step) {
    ["upload","loading","risultati"].forEach((s) => {
      const el = document.getElementById("cfp-step-" + s);
      if (el) el.style.display = "none";
    });
    const t = document.getElementById("cfp-step-" + step);
    if (t) t.style.display = "block";
  }
  function _setMsg(msg) {
    const el = document.getElementById("cfp-loading-msg");
    if (el) el.textContent = msg;
  }

  // ---- render tabella ----
  function _renderRighe() {
    const tbody   = document.getElementById("cfp-tbody");
    const counter = document.getElementById("cfp-counter");
    if (!tbody) return;

    const trovati = _cfpRighe.filter((r) => r.prodotto_id).length;
    if (counter) {
      counter.textContent = trovati + " di " + _cfpRighe.length + " trovati nel DB";
      counter.style.color = trovati === _cfpRighe.length ? "#10b981" : "#f59e0b";
    }

    tbody.innerHTML = _cfpRighe.map((r, idx) => `
      <tr class="${r.prodotto_id ? "cfp-row-ok" : "cfp-row-warn"}" id="cfp-tr-${idx}">
        <td style="text-align:center;">
          <input type="checkbox" ${r.includi ? "checked" : ""}
            onchange="cfpToggle(${idx},this.checked)"
            style="width:16px;height:16px;cursor:pointer;" />
        </td>
        <td><div class="cfp-pdf-nome" title="${escapeHtml(r.nome_pdf || "")}">${escapeHtml(r.nome_pdf || "—")}</div></td>
        <td>
          <select class="cfp-select" onchange="cfpSetProdotto(${idx},this.value)">
            <option value="">— Non associare —</option>
            ${_cfpProdotti.map((p) =>
              `<option value="${p.id}" ${p.id === r.prodotto_id ? "selected" : ""}>
                ${escapeHtml(p.nome)}${p.marca_nome ? " — " + escapeHtml(p.marca_nome) : ""}
              </option>`
            ).join("")}
          </select>
          <span id="cfp-badge-${idx}" class="${r.prodotto_id ? "cfp-badge-ok" : "cfp-badge-warn"}">
            ${r.prodotto_id ? "✓ Trovato" : "⚠ Non trovato"}
          </span>
        </td>
        <td><input type="number" class="cfp-num-input" value="${r.quantita ?? ""}" min="0.01" step="0.01" onchange="cfpSetQta(${idx},this.value)" /></td>
        <td><input type="number" class="cfp-num-input" value="${r.prezzo_unitario ?? ""}" min="0.01" step="0.01" onchange="cfpSetPrezzo(${idx},this.value)" /></td>
        <td>
          <button class="btn btn-primary cfp-btn-usa" onclick="cfpUsaRiga(${idx})" title="Apri form carico pre-compilato">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:13px;height:13px;"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Carica
          </button>
        </td>
      </tr>
    `).join("");
  }

  // ---- funzioni globali tabella ----
  window.cfpToggle = function (idx, v) { _cfpRighe[idx].includi = v; };

  window.cfpSetProdotto = function (idx, val) {
    const p = _cfpProdotti.find((x) => x.id == val);
    _cfpRighe[idx].prodotto_id   = p ? p.id   : null;
    _cfpRighe[idx].prodotto_nome = p ? p.nome : null;
    if (p) {
      _cfpRighe[idx].includi = true;
      const cb = document.querySelector("#cfp-tr-" + idx + " input[type=checkbox]");
      if (cb) cb.checked = true;
    }
    const badge = document.getElementById("cfp-badge-" + idx);
    if (badge) { badge.className = p ? "cfp-badge-ok" : "cfp-badge-warn"; badge.textContent = p ? "✓ Trovato" : "⚠ Non trovato"; }
  };

  window.cfpSetQta    = function (idx, v) { _cfpRighe[idx].quantita        = parseFloat(v) || null; };
  window.cfpSetPrezzo = function (idx, v) { _cfpRighe[idx].prezzo_unitario = parseFloat(v) || null; };

  window.cfpUsaRiga = async function (idx) {
    const r    = _cfpRighe[idx];
    const errs = [];
    if (!r.prodotto_id)                        errs.push("Seleziona un prodotto dal DB per questa riga.");
    if (!r.quantita || r.quantita <= 0)        errs.push("Inserisci una quantità valida.");
    if (!r.prezzo_unitario || r.prezzo_unitario <= 0) errs.push("Inserisci un prezzo unitario valido.");
    if (errs.length) { _showErr(errs.join("<br>")); return; }
    _hideErr();

    const numDoc   = (document.getElementById("cfp-numero-doc")?.value || "").trim();
    const fornitore = (document.getElementById("cfp-fornitore")?.value || "").trim();
    const data     = (document.getElementById("cfp-data")?.value || "").trim() || new Date().toISOString().split("T")[0];

    if (!numDoc)    { _showErr("⚠ Inserisci il numero documento prima di caricare."); return; }
    if (!fornitore) { _showErr("⚠ Inserisci il fornitore prima di caricare."); return; }

    const btn = document.querySelector(`#cfp-tr-${idx} .cfp-btn-usa`);
    if (btn) { btn.disabled = true; btn.textContent = "⏳"; }

    try {
      const res = await fetch(`${API_URL}/dati`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prodotto_id:    r.prodotto_id,
          tipo:           "carico",
          quantita:       parseFloat(r.quantita.toFixed(2)),
          prezzo:         parseFloat(r.prezzo_unitario.toFixed(2)),
          data_movimento: data,
          fattura_doc:    numDoc    || null,
          fornitore:      fornitore || null,
        }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || e.message || "Errore salvataggio (" + res.status + ")");
      }
      const tr = document.getElementById("cfp-tr-" + idx);
      if (tr) tr.style.opacity = "0.55";
      if (btn) { btn.textContent = "✓ Caricato"; btn.style.background = "linear-gradient(135deg,#10b981,#059669)"; btn.disabled = true; }
      if (typeof ignoreNextSocketUpdate === "function") ignoreNextSocketUpdate();
      if (typeof loadMovimenti === "function") loadMovimenti().catch(() => {});
      if (typeof loadProdotti  === "function") loadProdotti().catch(() => {});
      if (typeof loadRiepilogo === "function") loadRiepilogo().catch(() => {});
    } catch (err) {
      _showErr("❌ " + err.message);
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:13px;height:13px;"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Carica';
      }
    }
  };

  // ---- open/close modal ----
  window.openCaricoFatturaPDFModal = function () {
    _cfpFile = null; _cfpRighe = [];
    const modal = document.getElementById("modalCaricoFatturaPDF");
    if (!modal) return;
    const fi = document.getElementById("cfp-file-input");
    if (fi) fi.value = "";
    const fl = document.getElementById("cfp-file-label");
    if (fl) fl.textContent = "Trascina il PDF qui o clicca per sfogliare";
    const ba = document.getElementById("cfp-btn-analizza");
    if (ba) ba.disabled = true;
    const tb = document.getElementById("cfp-tbody");
    if (tb) tb.innerHTML = "";
    _hideErr();
    _setStep("upload");
    _loadProdotti().catch(console.error);
    modal.classList.add("active");
  };

  window.closeCaricoFatturaPDFModal = function () {
    document.getElementById("modalCaricoFatturaPDF")?.classList.remove("active");
  };

  window.cfpOnFileSelected = function (input) {
    const file = input.files[0];
    if (!file) return;
    if (file.type !== "application/pdf") { _showErr("⚠ Seleziona un file PDF valido."); return; }
    _cfpFile = file;
    const lbl = document.getElementById("cfp-file-label");
    if (lbl) lbl.textContent = "📄 " + file.name;
    const btn = document.getElementById("cfp-btn-analizza");
    if (btn) btn.disabled = false;
    _hideErr();
  };

  window.cfpAnalizzaPDF = async function () {
    if (!_cfpFile) return;
    const btn = document.getElementById("cfp-btn-analizza");
    if (btn) btn.disabled = true;
    try {
      _setStep("loading");
      _setMsg("📖 Lettura PDF...");
      const testo = await _estraiTesto(_cfpFile);
      if (!testo.trim()) throw new Error("Il PDF non contiene testo leggibile (potrebbe essere scansionato).");

      _setMsg("🤖 Analisi in corso...");
      const dati = await _analizzaConAI(testo);

      _setMsg("🔍 Ricerca prodotti nel database...");
      await _loadProdotti();

      const numDocPulito = (dati.numero_documento || "").replace(/\.pdf$/i, "").replace(/^scaricato da /i, "").trim();
      const ndEl = document.getElementById("cfp-numero-doc");
      const frEl = document.getElementById("cfp-fornitore");
      const dtEl = document.getElementById("cfp-data");
      if (ndEl) ndEl.value = numDocPulito;
      if (frEl && dati.fornitore) frEl.value = dati.fornitore;
      if (dtEl) dtEl.value = dati.data_documento || new Date().toISOString().split("T")[0];

      _cfpRighe = (dati.righe || []).map((r, idx) => {
        const trovato = _matchProdotto(r.nome_prodotto);
        return { idx, nome_pdf: r.nome_prodotto, quantita: r.quantita, prezzo_unitario: r.prezzo_unitario, prodotto_id: trovato ? trovato.id : null, prodotto_nome: trovato ? trovato.nome : null, includi: trovato !== null };
      });

      _renderRighe();
      _setStep("risultati");
    } catch (err) {
      console.error("Errore analisi PDF:", err);
      _setStep("upload");
      _showErr("❌ " + err.message);
    } finally {
      if (btn) btn.disabled = false;
    }
  };

  // ---- drag & drop ----
  document.addEventListener("DOMContentLoaded", () => {
    const dz = document.getElementById("cfp-dropzone");
    if (!dz) return;
    dz.addEventListener("dragover",  (e) => { e.preventDefault(); dz.classList.add("cfp-drag-over"); });
    dz.addEventListener("dragleave", ()  => dz.classList.remove("cfp-drag-over"));
    dz.addEventListener("drop", (e) => {
      e.preventDefault();
      dz.classList.remove("cfp-drag-over");
      const f = e.dataTransfer.files[0];
      if (f && f.type === "application/pdf") {
        _cfpFile = f;
        const lbl = document.getElementById("cfp-file-label");
        if (lbl) lbl.textContent = "📄 " + f.name;
        const btn = document.getElementById("cfp-btn-analizza");
        if (btn) btn.disabled = false;
        _hideErr();
      } else {
        _showErr("⚠ Seleziona un file PDF valido.");
      }
    });
  });

  // ================================================================
  // 🧹 PULIZIA: elimina movimenti con fattura_doc = nome file .pdf
  // ================================================================
  window.pulisciMovimentiPDF = async function () {
    const sospetti = (allMovimenti || []).filter((m) => {
      const f = (m.fattura_doc || "").trim();
      return /\.pdf$/i.test(f) || /^scaricato da /i.test(f);
    });

    if (sospetti.length === 0) {
      showAlertModal("Nessun movimento con nome file .pdf trovato. ✅", "Pulizia completata", "success");
      return;
    }

    const lista = sospetti.map((m) => `• ${m.prodotto_nome || "?"} — ${m.tipo.toUpperCase()} — fattura: "${m.fattura_doc}"`).join("\n");
    const msg   = `Trovati <strong>${sospetti.length}</strong> movimento/i con documento = nome file PDF:<br><br>
      <div style="background:#f8fafc;border-radius:8px;padding:12px;font-family:monospace;font-size:12px;max-height:200px;overflow-y:auto;text-align:left;white-space:pre-wrap;">${escapeHtml(lista)}</div>
      <br>Vuoi eliminarli tutti?`;

    const confermato = await showConfirmModal(msg, "🧹 Elimina movimenti con nome file PDF");
    if (!confermato) return;

    let ok = 0, ko = 0;
    for (const m of sospetti) {
      try {
        const res = await fetch(`${API_URL}/dati/${m.id}`, { method: "DELETE" });
        if (res.ok) ok++; else ko++;
      } catch { ko++; }
    }

    if (typeof ignoreNextSocketUpdate === "function") ignoreNextSocketUpdate();
    showAlertModal(
      `Eliminati: ${ok} ✅${ko > 0 ? " — Errori: " + ko + " ❌" : ""}`,
      "Pulizia completata",
      ok > 0 ? "success" : "error"
    );

    await loadMovimenti();
    await loadProdotti();
  };
})();
