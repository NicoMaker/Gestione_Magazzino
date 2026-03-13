// realtime.js - Gestione Socket.IO e notifiche real-time

// Connessione Socket.IO
let socket = null;
let ignoreNextUpdate = false; // Flag per ignorare aggiornamenti dopo operazioni locali

// Inizializza Socket.IO
function initSocket() {
  // Ottieni l'URL del server (stesso host e porta del frontend)
  // Il server Express serve il frontend e Socket.IO sulla stessa porta
  const socketUrl = window.location.origin;

  socket = io(socketUrl, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5
  });

  socket.on('connect', () => {
    console.log('✅ Connesso al server real-time');
    // Notifica rimossa - connessione silenziosa
  });

  socket.on('disconnect', () => {
    console.log('❌ Disconnesso dal server real-time');
  });

  socket.on('connect_error', (error) => {
    console.error('Errore connessione Socket.IO:', error);
  });

  // Eventi per aggiornamenti real-time
  
  // Marche - Aggiorna solo se l'operazione viene da altri dispositivi
  socket.on('marca_aggiunta', () => {
    if (!ignoreNextUpdate && typeof loadMarche === 'function') {
      loadMarche();
    }
  });

  socket.on('marca_modificata', () => {
    if (!ignoreNextUpdate) {
      if (typeof loadMarche === 'function') loadMarche();
      if (typeof loadProdotti === 'function') loadProdotti();
    }
  });

  socket.on('marca_eliminata', () => {
    if (!ignoreNextUpdate) {
      if (typeof loadMarche === 'function') loadMarche();
      if (typeof loadProdotti === 'function') loadProdotti();
    }
  });

  socket.on('marche_aggiornate', () => {
    if (!ignoreNextUpdate && typeof loadMarche === 'function') {
      loadMarche();
    }
  });

  // Prodotti - Aggiorna solo se l'operazione viene da altri dispositivi
  socket.on('prodotto_aggiunto', () => {
    if (!ignoreNextUpdate && typeof loadProdotti === 'function') {
      loadProdotti();
    }
  });

  socket.on('prodotto_modificato', () => {
    if (!ignoreNextUpdate && typeof loadProdotti === 'function') {
      loadProdotti();
    }
  });

  socket.on('prodotto_eliminato', () => {
    if (!ignoreNextUpdate && typeof loadProdotti === 'function') {
      loadProdotti();
    }
  });

  socket.on('prodotti_aggiornati', () => {
    if (!ignoreNextUpdate && typeof loadProdotti === 'function') {
      loadProdotti();
    }
  });

  // Movimenti - Aggiorna solo se l'operazione viene da altri dispositivi
  socket.on('movimento_aggiunto', () => {
    if (!ignoreNextUpdate && typeof loadMovimenti === 'function') {
      loadMovimenti();
    }
  });

  socket.on('movimento_eliminato', () => {
    if (!ignoreNextUpdate && typeof loadMovimenti === 'function') {
      loadMovimenti();
    }
  });

  socket.on('dati_aggiornati', () => {
    if (!ignoreNextUpdate && typeof loadMovimenti === 'function') {
      loadMovimenti();
    }
  });

  // Magazzino - Aggiorna solo se l'operazione viene da altri dispositivi
  socket.on('magazzino_aggiornato', () => {
    if (!ignoreNextUpdate) {
      if (typeof loadRiepilogo === 'function') loadRiepilogo();
      if (typeof loadMovimenti === 'function') loadMovimenti();
      if (typeof loadProdotti === 'function') loadProdotti();
    }
  });

  // Utenti - Aggiorna solo se l'operazione viene da altri dispositivi
  socket.on('utente_aggiunto', () => {
    if (!ignoreNextUpdate && typeof loadUtenti === 'function') {
      loadUtenti();
    }
  });

  socket.on('utente_modificato', (data) => {
    const currentUsername = localStorage.getItem('username');
    
    // Se l'utente modificato è quello loggato, fai logout
    if (data.oldUsername && currentUsername === data.oldUsername) {
      if (typeof forceLogout === 'function') {
        forceLogout('Il tuo account è stato modificato da un altro dispositivo. Effettua di nuovo il login.');
      } else {
        // Fallback se forceLogout non è disponibile
        localStorage.removeItem('username');
        localStorage.removeItem('activeSection');
        window.location.href = 'index.html';
      }
      return;
    }
    
    if (!ignoreNextUpdate && typeof loadUtenti === 'function') {
      loadUtenti();
    }
  });

  socket.on('utente_eliminato', (data) => {
    const currentUsername = localStorage.getItem('username');
    
    // Se l'utente eliminato è quello loggato, fai logout
    if (data.username && currentUsername === data.username) {
      if (typeof forceLogout === 'function') {
        forceLogout('Il tuo account è stato eliminato. Verrai disconnesso.');
      } else {
        // Fallback se forceLogout non è disponibile
        localStorage.removeItem('username');
        localStorage.removeItem('activeSection');
        window.location.href = 'index.html';
      }
      return;
    }
    
    if (!ignoreNextUpdate && typeof loadUtenti === 'function') {
      loadUtenti();
    }
  });

  socket.on('utenti_aggiornati', () => {
    if (!ignoreNextUpdate && typeof loadUtenti === 'function') {
      loadUtenti();
    }
  });
}

// Esporta per uso globale
window.ignoreNextSocketUpdate = ignoreNextSocketUpdate;