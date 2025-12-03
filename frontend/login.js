const API_URL = "http://localhost:3000/api"

document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault()

  const username = document.getElementById("username").value.trim()
  const password = document.getElementById("password").value
  const errorMessage = document.getElementById("errorMessage")
  const btnLogin = document.querySelector(".btn-login")

  errorMessage.classList.remove("show")
  btnLogin.classList.add("loading")

  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    })

    const data = await response.json()

    if (response.ok) {
      localStorage.setItem("loggedUser", username)
      window.location.href = "home.html"
    } else {
      errorMessage.textContent = data.error || "Errore durante il login"
      errorMessage.classList.add("show")
    }
  } catch (error) {
    errorMessage.textContent = "Errore di connessione al server"
    errorMessage.classList.add("show")
  } finally {
    btnLogin.classList.remove("loading")
  }
})
