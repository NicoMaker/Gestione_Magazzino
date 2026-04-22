// ==================== NAVIGAZIONE E INIZIALIZZAZIONE ====================
// File: navigation.js
// Unico punto di bootstrap dell'applicazione

document.addEventListener("DOMContentLoaded", () => {
  // ── Username corrente ────────────────────────────────────────
  const username = localStorage.getItem("username");
  if (username) {
    const el = document.getElementById("currentUser");
    if (el) el.textContent = username;
  }

  // ── Hamburger / Sidebar mobile ───────────────────────────────
  const mobileMenuToggle = document.getElementById("mobileMenuToggle");
  const sidebar = document.getElementById("sidebar");

  if (mobileMenuToggle && sidebar) {
    mobileMenuToggle.addEventListener("click", (e) => {
      e.stopPropagation();
      sidebar.classList.toggle("mobile-open");
      mobileMenuToggle.classList.toggle("active");
    });

    document.addEventListener("click", (e) => {
      if (window.innerWidth <= 1024) {
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

  // ── Navigazione sezioni ──────────────────────────────────────
  const savedSection = localStorage.getItem("activeSection") || "marche";

  document.querySelectorAll(".nav-item").forEach((item) => {
    item.addEventListener("click", async (e) => {
      e.preventDefault();
      const section = item.dataset.section;
      if (!section) return;

      // Attiva voce menu
      document
        .querySelectorAll(".nav-item")
        .forEach((i) => i.classList.remove("active"));
      item.classList.add("active");

      // Attiva sezione contenuto
      document
        .querySelectorAll(".content-section")
        .forEach((s) => s.classList.remove("active"));
      const sectionEl = document.getElementById(`section-${section}`);
      if (sectionEl) sectionEl.classList.add("active");

      // Persiste sezione
      localStorage.setItem("activeSection", section);

      // Chiudi menu mobile/tablet
      if (window.innerWidth <= 1024 && sidebar && mobileMenuToggle) {
        sidebar.classList.remove("mobile-open");
        mobileMenuToggle.classList.remove("active");
      }

      // Carica dati sezione
      if (section === "marche") await loadMarche();
      if (section === "prodotti") await loadProdotti();
      if (section === "movimenti") await loadMovimenti();
      if (section === "riordino") await loadRiordinoSection();
      if (section === "riepilogo") await loadRiepilogo();
      if (section === "storico") await loadStorico();
      if (section === "utenti") await loadUtenti();

      // Ripristina filtro salvato per la sezione
      restoreSearchOnSectionChange(section);
    });
  });

  // ── Sezione iniziale ─────────────────────────────────────────
  const initialItem = document.querySelector(
    `.nav-item[data-section="${savedSection}"]`,
  );
  if (initialItem) initialItem.click();

  // ── Logout ───────────────────────────────────────────────────
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("username");
      localStorage.removeItem("activeSection");
      window.location.href = "index.html";
    });
  }

  // ── Sistema ricerca con memoria ──────────────────────────────
  initSearchSystem();

  // ── Storico: listener cambio data ────────────────────────────
  document
    .getElementById("storicoDate")
    ?.addEventListener("change", loadStorico);

  // ── Toggle carico/scarico ────────────────────────────────────
  const movimentoTipoSelect = document.getElementById("movimentoTipo");
  if (movimentoTipoSelect) {
    movimentoTipoSelect.addEventListener("change", togglePrezzoField);
  }
});
