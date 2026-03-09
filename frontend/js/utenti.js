// ==================== GESTIONE UTENTI ====================
// File: utenti.js

async function loadUtenti() {
  try {
    const res = await fetch(`${API_URL}/utenti`);
    allUtenti = await res.json();
    utenti = allUtenti;
    renderUtenti();
    reapplyFilter("filterUtenti");
  } catch (error) {
    console.error("Errore caricamento utenti:", error);
  }
}

function renderUtenti() {
  const tbody = document.getElementById("utentiTableBody");
  if (!tbody) return;

  if (utenti.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="2" class="text-center">
          <div style="padding:40px 20px;color:var(--text-secondary);">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                 style="width:48px;height:48px;margin:0 auto 16px;opacity:0.5;">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            <p style="font-size:16px;font-weight:600;margin-bottom:8px;">Nessun utente trovato</p>
            <p style="font-size:14px;">${
              document.getElementById("filterUtenti")?.value
                ? "Prova a modificare il termine di ricerca"
                : "Clicca su Nuovo Utente per iniziare"
            }</p>
          </div>
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = utenti.map((u) => `
    <tr>
      <td><strong>${escapeHtml(u.username)}</strong></td>
      <td class="text-right">
        <button class="btn-icon btn-icononclickmodifica"
                onclick="editUser(${u.id})"
                title="Modifica utente" aria-label="Modifica ${escapeHtml(u.username)}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
        <button class="btn-icon btn-icononclickelimina"
                onclick="deleteUser(${u.id}, '${escapeHtml(u.username)}')"
                title="Elimina utente" aria-label="Elimina ${escapeHtml(u.username)}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 6h18"/>
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
          </svg>
        </button>
      </td>
    </tr>
  `).join("");
}

function openUserModal(utente = null) {
  const modal         = document.getElementById("modalUser");
  const title         = document.getElementById("modalUserTitle");
  const form          = document.getElementById("formUser");
  const passwordInput = document.getElementById("userPassword");
  const passwordOpt   = document.getElementById("passwordOptional");
  const togglePwd     = document.getElementById("toggleUserPassword");

  form.reset();

  if (togglePwd) {
    togglePwd.innerHTML = `
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>`;
  }

  if (utente) {
    title.textContent = "Modifica Utente";
    document.getElementById("userId").value       = utente.id;
    document.getElementById("userUsername").value = utente.username;
    passwordInput.placeholder = "Lascia vuoto per non modificare";
    passwordInput.required    = false;
    if (passwordOpt) passwordOpt.textContent = "(Opzionale)";
  } else {
    title.textContent = "Nuovo Utente";
    document.getElementById("userId").value = "";
    passwordInput.placeholder = "Inserisci password";
    passwordInput.required    = true;
    if (passwordOpt) passwordOpt.textContent = "*";
  }

  modal.classList.add("active");
  setupPasswordToggle("userPassword", "toggleUserPassword");
}

function closeUserModal() {
  document.getElementById("modalUser").classList.remove("active");
}

function editUser(id) {
  const user = utenti.find((u) => u.id === id);
  if (user) openUserModal(user);
}

async function deleteUser(id) {
  if (!(await confirm("Sei sicuro di voler eliminare questo utente?"))) return;

  try {
    const currentUser = localStorage.getItem("username") || "";
    const res = await fetch(
      `${API_URL}/utenti/${id}?current_user=${encodeURIComponent(currentUser)}`,
      { method: "DELETE" }
    );
    const data = await res.json();

    if (res.ok) {
      if (data.utente_eliminato) {
        forceLogout("Hai eliminato il tuo account. Verrai disconnesso e dovrai effettuare di nuovo il login.");
      } else {
        if (typeof ignoreNextSocketUpdate === "function") ignoreNextSocketUpdate();
        alert("Utente eliminato con successo!");
        loadUtenti();
      }
    } else {
      alert(data.error || "Errore durante l'eliminazione");
    }
  } catch (error) {
    alert("Errore di connessione");
  }
}

function setupPasswordToggle(inputId, toggleId) {
  const passwordInput  = document.getElementById(inputId);
  const togglePassword = document.getElementById(toggleId);
  if (!passwordInput || !togglePassword) return;

  const iconVisible = `
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>`;
  const iconHidden = `
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.08 2.58"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
    <circle cx="12" cy="12" r="3"/>`;

  // Rimuovi listener precedenti clonando il nodo
  const newToggle = togglePassword.cloneNode(true);
  togglePassword.parentNode.replaceChild(newToggle, togglePassword);

  newToggle.addEventListener("click", () => {
    const type = passwordInput.getAttribute("type") === "password" ? "text" : "password";
    passwordInput.setAttribute("type", type);
    newToggle.innerHTML = type === "text" ? iconHidden : iconVisible;
  });
}

document.getElementById("formUser")?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const id       = document.getElementById("userId").value;
  const username = document.getElementById("userUsername").value.trim();
  const password = document.getElementById("userPassword").value;

  const method = id ? "PUT" : "POST";
  const url    = id ? `${API_URL}/utenti/${id}` : `${API_URL}/utenti`;
  const body   = { username };
  if (password) body.password = password;
  if (id) body.current_user = localStorage.getItem("username") || null;

  try {
    const res  = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();

    if (res.ok) {
      const mustLogout = data.username_modificato || data.password_modificata || false;
      if (typeof ignoreNextSocketUpdate === "function") ignoreNextSocketUpdate();
      alert(id ? "Utente aggiornato!" : "Utente creato!");
      closeUserModal();
      if (mustLogout) {
        forceLogout("Le tue credenziali sono cambiate. Effettua di nuovo l'accesso.");
      } else {
        loadUtenti();
      }
    } else {
      alert(data.error || "Errore durante il salvataggio");
    }
  } catch (error) {
    alert("Errore di connessione");
  }
});
