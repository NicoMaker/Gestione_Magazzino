const API_URL = "api";

// Toggle password visibility
const passwordInput = document.getElementById("password");
const togglePassword = document.getElementById("togglePassword");

togglePassword.addEventListener("click", function () {
  const type =
    passwordInput.getAttribute("type") === "password" ? "text" : "password";
  passwordInput.setAttribute("type", type);

  if (type === "text") {
    togglePassword.innerHTML = `
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.08 2.58"/>
            <line x1="1" y1="1" x2="23" y2="23"/>
            <circle cx="12" cy="12" r="3"/>
          `;
  } else {
    togglePassword.innerHTML = `
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
          `;
  }
});

// Login form submission
document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;
  const errorMessage = document.getElementById("errorMessage");
  const btnLogin = document.querySelector(".btn-login");

  errorMessage.classList.remove("show");
  btnLogin.classList.add("loading");

  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();

    if (response.ok) {
      // 🟢 FIX APPLICATO: Salva lo username in localStorage per la home page
      localStorage.setItem("username", username);

      // Success animation
      btnLogin.style.background =
        "linear-gradient(135deg, #10b981 0%, #059669 100%)";
      btnLogin.querySelector(".btn-text").textContent = "✓ Accesso effettuato!";
      btnLogin.classList.remove("loading");

      setTimeout(() => {
        window.location.href = "home.html";
      }, 800);
    } else {
      errorMessage.textContent = data.error || "Errore durante il login";
      errorMessage.classList.add("show");
      // Error animation
      btnLogin.style.background =
        "linear-gradient(135deg, #f87171 0%, #ef4444 100%)";
      btnLogin.querySelector(".btn-text").textContent = "Accesso fallito";
      btnLogin.classList.remove("loading");

      setTimeout(() => {
        btnLogin.style.background = ""; // Reset background
        btnLogin.querySelector(".btn-text").textContent = "Accedi";
      }, 1500);
    }
  } catch (error) {
    console.error("Login Error:", error);
    errorMessage.textContent =
      "Impossibile connettersi al server. Riprova più tardi.";
    errorMessage.classList.add("show");
    btnLogin.style.background =
      "linear-gradient(135deg, #f87171 0%, #ef4444 100%)";
    btnLogin.querySelector(".btn-text").textContent = "Errore di rete";
    btnLogin.classList.remove("loading");

    setTimeout(() => {
      btnLogin.style.background = ""; // Reset background
      btnLogin.querySelector(".btn-text").textContent = "Accedi";
    }, 1500);
  }
});
