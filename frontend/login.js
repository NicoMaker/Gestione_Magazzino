// login.js

const loginForm = document.getElementById("login-form");
const loginBtn = document.getElementById("login-btn");
const btnText = document.getElementById("btn-text");
const alertContainer = document.getElementById("alert-container");

// Controlla se l'utente è già loggato (se è loggato, reindirizza a index.html)
if (localStorage.getItem("isLoggedIn") === "true") {
  window.location.href = "/index.html";
}

function showAlert(message) {
  alertContainer.innerHTML = `<div class="alert alert-error">${message}</div>`;
  setTimeout(() => {
    alertContainer.innerHTML = "";
  }, 5000);
}

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  // Disabilita il pulsante e mostra loading
  loginBtn.disabled = true;
  btnText.innerHTML =
    '<span class="loading-spinner"></span> Accesso in corso...';

  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();

    if (response.ok) {
      // Login riuscito
      localStorage.setItem("isLoggedIn", "true");
      localStorage.setItem("username", data.username);

      // Reindirizza alla pagina principale
      window.location.href = "/index.html";
    } else {
      // Login fallito
      showAlert(data.error || "Credenziali non valide");
      loginBtn.disabled = false;
      btnText.textContent = "Accedi";
    }
  } catch (error) {
    console.error("Errore durante il login:", error);
    showAlert("Errore di connessione al server");
    loginBtn.disabled = false;
    btnText.textContent = "Accedi";
  }
});

// Permetti l'invio con Enter
document.getElementById("password").addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    loginForm.dispatchEvent(new Event("submit"));
  }
});