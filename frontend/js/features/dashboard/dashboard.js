// ==================== DASHBOARD ====================
// File: js/features/dashboard/dashboard.js
// Scopo: mostra a colpo d'occhio dove intervenire ("Da fare adesso"), i numeri
//        chiave, l'andamento carichi/scarichi e gli ultimi movimenti.
//        Ogni riquadro porta direttamente alla sezione giusta.

const _dash = { timer: null, caricamento: false };

const _euro = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
});
const _num = new Intl.NumberFormat("it-IT", { maximumFractionDigits: 2 });

async function loadDashboard() {
  const box = document.getElementById("dashboardContent");
  if (!box || _dash.caricamento) return;
  _dash.caricamento = true;
  try {
    const res = await fetch(`${API_URL}/dashboard`);
    if (!res.ok) throw new Error(`Errore HTTP ${res.status}`);
    renderDashboard(await res.json());
  } catch (err) {
    console.error("❌ Errore caricamento dashboard:", err);
    box.innerHTML = `<div class="dash-empty">Impossibile caricare la dashboard.
      <button type="button" class="dash-go" onclick="loadDashboard()">Riprova</button></div>`;
  } finally {
    _dash.caricamento = false;
  }
}

// Naviga a una sezione dell'app come se si cliccasse la voce di menu
function dashGoTo(sezione) {
  document.querySelector(`.nav-item[data-section="${sezione}"]`)?.click();
}

// Aggiorna la dashboard dopo modifiche in tempo reale (solo se visibile)
function refreshDashboardIfActive() {
  const sez = document.getElementById("section-dashboard");
  if (!sez || !sez.classList.contains("active")) return;
  clearTimeout(_dash.timer);
  _dash.timer = setTimeout(loadDashboard, 500);
}

function renderDashboard(d) {
  const box = document.getElementById("dashboardContent");
  if (!box) return;
  box.innerHTML = `
    ${_dashAzioni(d.azioni)}
    ${_dashKpi(d.kpi)}
    <div class="dash-grid">
      ${_dashGrafico(d.andamento)}
      ${_dashTop(d.top_valore)}
    </div>
    ${_dashUltimi(d.ultimi_movimenti)}
    <p class="dash-updated">Aggiornato alle ${new Date(d.generato_il).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}</p>`;

  box
    .querySelectorAll("[data-go]")
    .forEach((el) =>
      el.addEventListener("click", () => dashGoTo(el.dataset.go)),
    );
}

// ── Da fare adesso ───────────────────────────────────────────
function _dashAzioni(azioni = []) {
  if (azioni.length === 0) {
    return `<section class="dash-block">
      <h2>Da fare adesso</h2>
      <div class="dash-ok"><strong>Tutto in ordine.</strong> Nessun prodotto esaurito, nessuna merce ferma e nessun dato da sistemare.</div>
    </section>`;
  }
  const voci = azioni
    .map((a) => {
      const resto = a.conteggio - a.esempi.length;
      const chips =
        a.esempi.map((e) => `<li>${escapeHtml(e)}</li>`).join("") +
        (resto > 0 ? `<li class="dash-chip-more">+${resto}</li>` : "");
      return `
      <article class="dash-todo dash-sev-${escapeHtml(a.gravita)}">
        <div class="dash-todo-count" aria-label="${a.conteggio} elementi">${a.conteggio}</div>
        <div class="dash-todo-main">
          <h3>${escapeHtml(a.titolo)}</h3>
          <p>${escapeHtml(a.descrizione)}</p>
          <ul class="dash-chips">${chips}</ul>
        </div>
        <button type="button" class="dash-go" data-go="${escapeHtml(a.sezione)}">${escapeHtml(a.azione)}</button>
      </article>`;
    })
    .join("");
  return `<section class="dash-block">
    <h2>Da fare adesso <span class="dash-badge">${azioni.length}</span></h2>
    <div class="dash-todo-list">${voci}</div>
  </section>`;
}

// ── Numeri chiave ────────────────────────────────────────────
function _dashKpi(k) {
  const tile = (label, valore, sezione, evidenzia = false) => `
    <button type="button" class="dash-kpi${evidenzia ? " is-alert" : ""}" data-go="${sezione}">
      <span class="dash-kpi-value">${valore}</span>
      <span class="dash-kpi-label">${label}</span>
    </button>`;
  return `<section class="dash-block">
    <h2>In numeri</h2>
    <div class="dash-kpis">
      ${tile("Valore del magazzino", _euro.format(k.valore_magazzino), "riepilogo")}
      ${tile("Pezzi in giacenza", _num.format(k.pezzi_in_giacenza), "riepilogo")}
      ${tile("Prodotti", k.prodotti, "prodotti")}
      ${tile("Esauriti", k.prodotti_esauriti, "riordino", k.prodotti_esauriti > 0)}
      ${tile("Marche", k.marche, "marche")}
      ${tile("Movimenti negli ultimi 30 giorni", k.movimenti_30gg, "movimenti")}
    </div>
  </section>`;
}

// ── Grafico carichi / scarichi (SVG, nessuna libreria) ───────
function _dashGrafico(serie = []) {
  const max = Math.max(0, ...serie.flatMap((s) => [s.carichi, s.scarichi]));
  const titolo = `<h2>Carichi e scarichi, ultimi 6 mesi <small>(pezzi)</small></h2>`;
  if (max === 0) {
    return `<section class="dash-block">${titolo}
      <div class="dash-empty">Ancora nessun movimento negli ultimi 6 mesi.</div></section>`;
  }
  const passo = Math.pow(10, Math.floor(Math.log10(max)));
  const tetto = Math.ceil(max / passo) * passo;
  const W = 560,
    H = 230,
    L = 44,
    B = 28,
    T = 10,
    R = 8;
  const area = { w: W - L - R, h: H - T - B };
  const gruppo = area.w / serie.length;
  const barra = Math.min(26, gruppo / 3);
  const y = (v) => T + area.h - (v / tetto) * area.h;

  let svg = "";
  for (let i = 0; i <= 4; i++) {
    const v = (tetto / 4) * i;
    svg += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" class="dash-grid-line"/>
            <text x="${L - 6}" y="${y(v) + 4}" text-anchor="end">${_num.format(v)}</text>`;
  }
  serie.forEach((s, i) => {
    const cx = L + gruppo * i + gruppo / 2;
    svg += `
      <rect x="${cx - barra - 1}" y="${y(s.carichi)}" width="${barra}" height="${T + area.h - y(s.carichi)}" rx="3" class="dash-bar-in"><title>${escapeHtml(s.etichetta)}: carichi ${_num.format(s.carichi)}</title></rect>
      <rect x="${cx + 1}" y="${y(s.scarichi)}" width="${barra}" height="${T + area.h - y(s.scarichi)}" rx="3" class="dash-bar-out"><title>${escapeHtml(s.etichetta)}: scarichi ${_num.format(s.scarichi)}</title></rect>
      <text x="${cx}" y="${H - 8}" text-anchor="middle">${escapeHtml(s.etichetta)}</text>`;
  });
  return `<section class="dash-block">${titolo}
    <div class="dash-chart-wrap">
      <svg viewBox="0 0 ${W} ${H}" class="dash-chart" role="img" aria-label="Carichi e scarichi per mese">${svg}</svg>
    </div>
    <p class="dash-legend"><span class="dash-dot dash-dot-in"></span>Carichi <span class="dash-dot dash-dot-out"></span>Scarichi</p>
  </section>`;
}

// ── Prodotti di maggior valore ───────────────────────────────
function _dashTop(top = []) {
  const titolo = `<h2>Dove è fermo più valore</h2>`;
  if (top.length === 0) {
    return `<section class="dash-block">${titolo}<div class="dash-empty">Nessun prodotto in giacenza.</div></section>`;
  }
  const max = Math.max(...top.map((t) => t.valore));
  const righe = top
    .map(
      (t) => `<li>
        <div class="dash-top-row"><span class="dash-top-name" title="${escapeHtml(t.nome)}">${escapeHtml(t.nome)}</span>
        <span class="dash-top-val">${_euro.format(t.valore)}</span></div>
        <div class="dash-top-bar"><span style="width:${Math.max(4, (t.valore / max) * 100)}%"></span></div>
        <small>${_num.format(t.pezzi)} pz in giacenza</small>
      </li>`,
    )
    .join("");
  return `<section class="dash-block">${titolo}<ol class="dash-top">${righe}</ol></section>`;
}

// ── Ultimi movimenti ─────────────────────────────────────────
function _dashUltimi(movimenti = []) {
  const titolo = `<h2>Ultimi movimenti
    <button type="button" class="dash-link" data-go="movimenti">Vedi tutti</button></h2>`;
  if (movimenti.length === 0) {
    return `<section class="dash-block">${titolo}<div class="dash-empty">Nessun movimento registrato. Parti da un carico.
      <button type="button" class="dash-go" data-go="movimenti">Registra un carico</button></div></section>`;
  }
  const righe = movimenti
    .map((m) => {
      const scarico = m.tipo === "scarico";
      return `<li>
        <span class="badge ${scarico ? "badge-danger" : "badge-success"}">${scarico ? "SCARICO" : "CARICO"}</span>
        <span class="dash-mov-name">${escapeHtml(m.prodotto_nome || "—")}</span>
        <span class="dash-mov-qty">${_num.format(m.quantita)} pz</span>
        <span class="dash-mov-date">${new Date(m.data_movimento).toLocaleDateString("it-IT")}</span>
      </li>`;
    })
    .join("");
  return `<section class="dash-block">${titolo}<ul class="dash-mov">${righe}</ul></section>`;
}

window.loadDashboard = loadDashboard;
window.refreshDashboardIfActive = refreshDashboardIfActive;
