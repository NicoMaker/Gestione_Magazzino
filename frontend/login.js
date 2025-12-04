const API_URL = "api";

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
      localStorage.setItem("username", username);

      // Success animation before redirect
      btnLogin.style.background =
        "linear-gradient(135deg, #10b981 0%, #059669 100%)";
      btnLogin.innerHTML = "<span>✓ Accesso effettuato!</span>";

      setTimeout(() => {
        window.location.href = "home.html";
      }, 800);
    } else {
      errorMessage.textContent = data.error || "Errore durante il login";
      errorMessage.classList.add("show");
    }
  } catch (error) {
    errorMessage.textContent = "Errore di connessione al server";
    errorMessage.classList.add("show");
  } finally {
    setTimeout(() => {
      btnLogin.classList.remove("loading");
    }, 500);
  }
});

// Add enter key support
document.querySelectorAll("input").forEach((input) => {
  input.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      document.getElementById("loginForm").dispatchEvent(new Event("submit"));
    }
  });
});
