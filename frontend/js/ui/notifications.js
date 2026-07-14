// ==================== UI: NOTIFICHE E DIALOG ====================
// File: js/ui/notifications.js
// Scopo: sistema di notifiche toast + modali confirm/alert che sostituiscono
//        window.confirm / window.alert nativi.
// Dipendenze (caricare PRIMA): utils.js (escapeHtml)

// ── 1. NOTIFICHE TOAST ────────────────────────────────────────
function showNotification(message, type = "info", duration = 4000) {
  const container = document.getElementById("notificationContainer");
  if (!container) return;

  const icons = {
    success:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
    error:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
    warning:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
  };

  const notification = document.createElement("div");
  notification.className = `notification notification-${type}`;
  notification.innerHTML = `
    <div class="notification-icon">${icons[type] || icons.info}</div>
    <div class="notification-content">
      <div class="notification-message">${message}</div>
    </div>
    <button class="notification-close" onclick="this.parentElement.remove()">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="18" y1="6" x2="6" y2="18"/>
        <line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
    </button>`;

  container.appendChild(notification);
  setTimeout(() => notification.classList.add("show"), 10);

  if (duration > 0) {
    setTimeout(() => {
      notification.classList.remove("show");
      setTimeout(
        () => notification.parentElement && notification.remove(),
        300,
      );
    }, duration);
  }
}

// ── 2. MODAL CONFIRM (sostituisce window.confirm) ─────────────
function showConfirmModal(message, title = "Conferma") {
  return new Promise((resolve) => {
    const modal = document.getElementById("confirmModal");
    const msgElem = document.getElementById("confirmMessage");
    const titleElem = modal.querySelector(".modal-header h2");
    const confirmBtn = document.getElementById("confirmButton");
    const cancelBtn = modal.querySelector(".btn-secondary");
    const closeBtn = modal.querySelector(".modal-close");
    const iconEl = document.getElementById("confirmIcon");

    msgElem.innerHTML = message;
    titleElem.textContent = title;

    const isDanger = title.toLowerCase().includes("elimina");
    confirmBtn.style.background = isDanger ? "var(--danger)" : "var(--primary)";
    iconEl.innerHTML = isDanger ? "🗑️" : "❓";
    iconEl.style.background = isDanger
      ? "rgba(239,68,68,0.1)"
      : "rgba(99,102,241,0.1)";
    iconEl.style.color = isDanger ? "var(--danger)" : "var(--primary)";

    modal.classList.add("show");

    const cleanup = () => {
      modal.classList.remove("show");
      confirmBtn.removeEventListener("click", handleConfirm);
      cancelBtn.removeEventListener("click", handleCancel);
      closeBtn.removeEventListener("click", handleCancel);
    };
    const handleConfirm = () => {
      cleanup();
      resolve(true);
    };
    const handleCancel = () => {
      cleanup();
      resolve(false);
    };

    confirmBtn.addEventListener("click", handleConfirm);
    cancelBtn.addEventListener("click", handleCancel);
    closeBtn.addEventListener("click", handleCancel);
  });
}

function closeConfirmModal() {
  document.getElementById("confirmModal")?.classList.remove("active", "show");
}

// ── 3. MODAL ALERT (sostituisce window.alert) ─────────────────
function showAlertModal(message, title = "Informazione", type = "info") {
  const modal = document.getElementById("alertModal");
  const titleEl = document.getElementById("alertModalTitle");
  const messageEl = document.getElementById("alertMessage");
  const iconEl = document.getElementById("alertIcon");

  titleEl.textContent = title;

  const iconsSvg = {
    success: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
    error: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
    warning: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    info: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
  };
  iconEl.className = `alert-icon ${type}`;
  iconEl.innerHTML = iconsSvg[type] || iconsSvg.info;

  // Formattazione messaggio (multilinea / lungo)
  if (message.includes("\n") || message.length > 200) {
    const lines = message.split("\n");
    let fmt = "";
    lines.forEach((line) => {
      if (line.trim().startsWith("━━")) {
        fmt += `<hr style="margin:8px 0;border:none;border-top:1px solid var(--border);">`;
      } else if (/^[✅⚠️❌]/.test(line.trim())) {
        fmt += `<div style="margin:8px 0;font-weight:600;">${escapeHtml(line)}</div>`;
      } else if (/^[•\-]/.test(line.trim())) {
        fmt += `<div style="margin:4px 0;padding-left:16px;">${escapeHtml(line)}</div>`;
      } else if (line.trim() === "") {
        fmt += "<br>";
      } else {
        fmt += `<div style="margin:4px 0;">${escapeHtml(line)}</div>`;
      }
    });
    messageEl.innerHTML = fmt;
  } else {
    messageEl.textContent = message;
  }

  modal.classList.add("active", "show");

  const okBtn = document.getElementById("alertModalOkBtn");
  const closeBtn = modal.querySelector(".modal-close");
  const dismiss = (e) => {
    e && e.stopPropagation();
    closeAlertModal();
  };

  if (okBtn) okBtn.onclick = dismiss;
  if (closeBtn) closeBtn.onclick = dismiss;

  const backdropHandler = (e) => {
    if (e.target === modal) closeAlertModal();
  };
  modal.addEventListener("click", backdropHandler);
  window._alertBackdropHandler = backdropHandler;

  modal
    .querySelector(".modal-content")
    ?.addEventListener("click", (e) => e.stopPropagation());
}

function closeAlertModal() {
  const modal = document.getElementById("alertModal");
  modal.classList.remove("active", "show");
  if (window._alertBackdropHandler) {
    modal.removeEventListener("click", window._alertBackdropHandler);
    delete window._alertBackdropHandler;
  }
}

// ── 4. OVERRIDE window.alert / window.confirm ─────────────────
window.alert = function (message) {
  const m = String(message).toLowerCase();
  let type = "info";
  let title = "Informazione";
  if (
    message.includes("✅") ||
    m.includes("successo") ||
    m.includes("creato") ||
    m.includes("aggiornato") ||
    m.includes("registrato") ||
    m.includes("salvato")
  ) {
    type = "success";
    title = "Successo";
  } else if (
    message.includes("❌") ||
    m.includes("errore") ||
    m.includes("error")
  ) {
    type = "error";
    title = "Errore";
  } else if (
    message.includes("⚠️") ||
    m.includes("attenzione") ||
    m.includes("warning") ||
    m.includes("compila") ||
    m.includes("obbligatorio") ||
    m.includes("seleziona")
  ) {
    type = "warning";
    title = "Attenzione";
  }
  showAlertModal(message, title, type);
};

window.confirm = function (message) {
  return showConfirmModal(message, "Conferma eliminazione");
};

// ── Esposizione globale ───────────────────────────────────────
window.showNotification = showNotification;
window.showConfirmModal = showConfirmModal;
window.closeConfirmModal = closeConfirmModal;
window.showAlertModal = showAlertModal;
window.closeAlertModal = closeAlertModal;
