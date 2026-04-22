// realtime.js - Gestione Socket.IO e notifiche real-time

// Flag globale per ignorare aggiornamenti
window.ignoreNextSocketUpdate = false;

// Connessione Socket.IO
let socket = null;

// Inizializza Socket.IO
function initSocket() {
  // Ottieni l'URL del server (stesso host e porta del frontend)
  // Il server Express serve il frontend e Socket.IO sulla stessa porta
  const socketUrl = window.location.origin;

  socket = io(socketUrl, {
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
  });

  socket.on("connect", () => {
    console.log("✅ Connesso al server real-time");
    // Notifica rimossa - connessione silenziosa
  });

  socket.on("disconnect", () => {
    console.log("❌ Disconnesso dal server real-time");
  });

  socket.on("connect_error", (error) => {
    console.error("Errore connessione Socket.IO:", error);
  });

  // Eventi per aggiornamenti real-time

  // Marche - Aggiorna solo se l'operazione viene da altri dispositivi
  socket.on("marca_aggiunta", () => {
    if (!window.ignoreNextSocketUpdate && typeof loadMarche === "function") {
      loadMarche();
    }
    window.ignoreNextSocketUpdate = false;
  });

  socket.on("marca_modificata", () => {
    if (!window.ignoreNextSocketUpdate) {
      if (typeof loadMarche === "function") loadMarche();
      if (typeof loadProdotti === "function") loadProdotti();
    }
    window.ignoreNextSocketUpdate = false;
  });

  socket.on("marca_eliminata", () => {
    if (!window.ignoreNextSocketUpdate) {
      if (typeof loadMarche === "function") loadMarche();
      if (typeof loadProdotti === "function") loadProdotti();
    }
    window.ignoreNextSocketUpdate = false;
  });

  socket.on("marche_aggiornate", () => {
    if (!window.ignoreNextSocketUpdate && typeof loadMarche === "function") {
      loadMarche();
    }
    window.ignoreNextSocketUpdate = false;
  });

  // Prodotti - Aggiorna solo se l'operazione viene da altri dispositivi
  socket.on("prodotto_aggiunto", () => {
    if (!window.ignoreNextSocketUpdate && typeof loadProdotti === "function") {
      loadProdotti();
    }
    window.ignoreNextSocketUpdate = false;
  });

  socket.on("prodotto_modificato", () => {
    if (!window.ignoreNextSocketUpdate && typeof loadProdotti === "function") {
      loadProdotti();
    }
    window.ignoreNextSocketUpdate = false;
  });

  socket.on("prodotto_eliminato", () => {
    if (!window.ignoreNextSocketUpdate && typeof loadProdotti === "function") {
      loadProdotti();
    }
    window.ignoreNextSocketUpdate = false;
  });

  socket.on("prodotti_aggiornati", () => {
    if (!window.ignoreNextSocketUpdate && typeof loadProdotti === "function") {
      loadProdotti();
    }
    window.ignoreNextSocketUpdate = false;
  });

  // Movimenti - Aggiorna solo se l'operazione viene da altri dispositivi
  socket.on("movimento_aggiunto", () => {
    if (!window.ignoreNextSocketUpdate && typeof loadMovimenti === "function") {
      loadMovimenti();
    }
    window.ignoreNextSocketUpdate = false;
  });

  socket.on("movimento_eliminato", () => {
    if (!window.ignoreNextSocketUpdate && typeof loadMovimenti === "function") {
      loadMovimenti();
    }
    window.ignoreNextSocketUpdate = false;
  });

  socket.on("dati_aggiornati", () => {
    if (!window.ignoreNextSocketUpdate && typeof loadMovimenti === "function") {
      loadMovimenti();
    }
    window.ignoreNextSocketUpdate = false;
  });

  // Magazzino - Aggiorna solo se l'operazione viene da altri dispositivi
  socket.on("magazzino_aggiornato", () => {
    if (!window.ignoreNextSocketUpdate) {
      if (typeof loadRiepilogo === "function") loadRiepilogo();
      if (typeof loadMovimenti === "function") loadMovimenti();
      if (typeof loadProdotti === "function") loadProdotti();
    }
    window.ignoreNextSocketUpdate = false;
  });

  // Utenti - Aggiorna solo se l'operazione viene da altri dispositivi
  socket.on("utente_aggiunto", () => {
    if (!window.ignoreNextSocketUpdate && typeof loadUtenti === "function") {
      loadUtenti();
    }
    window.ignoreNextSocketUpdate = false;
  });

  socket.on("utente_modificato", (data) => {
    const currentUsername = localStorage.getItem("username");

    // Se l'utente modificato è quello loggato, fai logout
    if (data.oldUsername && currentUsername === data.oldUsername) {
      if (typeof forceLogout === "function") {
        forceLogout(
          "Il tuo account è stato modificato da un altro dispositivo. Effettua di nuovo il login.",
        );
      } else {
        // Fallback se forceLogout non è disponibile
        localStorage.removeItem("username");
        localStorage.removeItem("activeSection");
        window.location.href = "index.html";
      }
      return;
    }

    if (!window.ignoreNextSocketUpdate && typeof loadUtenti === "function") {
      loadUtenti();
    }
    window.ignoreNextSocketUpdate = false;
  });

  socket.on("utente_eliminato", (data) => {
    const currentUsername = localStorage.getItem("username");

    // Se l'utente eliminato è quello loggato, fai logout
    if (data.username && currentUsername === data.username) {
      if (typeof forceLogout === "function") {
        forceLogout("Il tuo account è stato eliminato. Verrai disconnesso.");
      } else {
        // Fallback se forceLogout non è disponibile
        localStorage.removeItem("username");
        localStorage.removeItem("activeSection");
        window.location.href = "index.html";
      }
      return;
    }

    if (!window.ignoreNextSocketUpdate && typeof loadUtenti === "function") {
      loadUtenti();
    }
    window.ignoreNextSocketUpdate = false;
  });

  socket.on("utenti_aggiornati", () => {
    if (!window.ignoreNextSocketUpdate && typeof loadUtenti === "function") {
      loadUtenti();
    }
    window.ignoreNextSocketUpdate = false;
  });
}

// Funzione per ignorare il prossimo aggiornamento
function skipNextSocketUpdate() {
  window.ignoreNextSocketUpdate = true;
}

// Export per uso globale
window.skipNextSocketUpdate = skipNextSocketUpdate;
