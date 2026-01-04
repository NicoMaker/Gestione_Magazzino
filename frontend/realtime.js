// realtime.js - Gestione Socket.IO e notifiche real-time

// Connessione Socket.IO
let socket = null;

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
    showNotification('Disconnesso dal server', 'warning');
  });

  socket.on('connect_error', (error) => {
    console.error('Errore connessione Socket.IO:', error);
  });

  // Eventi per aggiornamenti real-time
  
  // Marche
  socket.on('marca_aggiunta', () => {
    showNotification('Nuova marca aggiunta', 'info');
    if (typeof loadMarche === 'function') loadMarche();
  });

  socket.on('marca_modificata', () => {
    showNotification('Marca modificata', 'info');
    if (typeof loadMarche === 'function') loadMarche();
    if (typeof loadProdotti === 'function') loadProdotti();
  });

  socket.on('marca_eliminata', () => {
    showNotification('Marca eliminata', 'info');
    if (typeof loadMarche === 'function') loadMarche();
    if (typeof loadProdotti === 'function') loadProdotti();
  });

  socket.on('marche_aggiornate', () => {
    if (typeof loadMarche === 'function') loadMarche();
  });

  // Prodotti
  socket.on('prodotto_aggiunto', () => {
    showNotification('Nuovo prodotto aggiunto', 'success');
    if (typeof loadProdotti === 'function') loadProdotti();
  });

  socket.on('prodotto_modificato', () => {
    showNotification('Prodotto modificato', 'info');
    if (typeof loadProdotti === 'function') loadProdotti();
  });

  socket.on('prodotto_eliminato', () => {
    showNotification('Prodotto eliminato', 'warning');
    if (typeof loadProdotti === 'function') loadProdotti();
  });

  socket.on('prodotti_aggiornati', () => {
    if (typeof loadProdotti === 'function') loadProdotti();
  });

  // Movimenti
  socket.on('movimento_aggiunto', (data) => {
    const tipo = data.tipo === 'carico' ? 'Carico' : 'Scarico';
    showNotification(`${tipo} registrato con successo`, 'success');
    if (typeof loadMovimenti === 'function') loadMovimenti();
  });

  socket.on('movimento_eliminato', (data) => {
    const tipo = data.tipo === 'carico' ? 'Carico' : 'Scarico';
    showNotification(`${tipo} eliminato`, 'warning');
    if (typeof loadMovimenti === 'function') loadMovimenti();
  });

  socket.on('dati_aggiornati', () => {
    if (typeof loadMovimenti === 'function') loadMovimenti();
  });

  // Magazzino
  socket.on('magazzino_aggiornato', () => {
    if (typeof loadRiepilogo === 'function') loadRiepilogo();
    if (typeof loadMovimenti === 'function') loadMovimenti();
    if (typeof loadProdotti === 'function') loadProdotti();
  });

  // Utenti
  socket.on('utente_aggiunto', () => {
    showNotification('Nuovo utente aggiunto', 'success');
    if (typeof loadUtenti === 'function') loadUtenti();
  });

  socket.on('utente_modificato', () => {
    showNotification('Utente modificato', 'info');
    if (typeof loadUtenti === 'function') loadUtenti();
  });

  socket.on('utente_eliminato', () => {
    showNotification('Utente eliminato', 'warning');
    if (typeof loadUtenti === 'function') loadUtenti();
  });

  socket.on('utenti_aggiornati', () => {
    if (typeof loadUtenti === 'function') loadUtenti();
  });
}

// Sistema di notifiche moderne
function showNotification(message, type = 'info', duration = 4000) {
  const container = document.getElementById('notificationContainer');
  if (!container) return;

  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  
  // Icona in base al tipo
  let icon = '';
  switch(type) {
    case 'success':
      icon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>';
      break;
    case 'error':
      icon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';
      break;
    case 'warning':
      icon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>';
      break;
    default:
      icon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';
  }

  notification.innerHTML = `
    <div class="notification-icon">${icon}</div>
    <div class="notification-content">
      <div class="notification-message">${message}</div>
    </div>
    <button class="notification-close" onclick="this.parentElement.remove()">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    </button>
  `;

  container.appendChild(notification);

  // Animazione di entrata
  setTimeout(() => {
    notification.classList.add('show');
  }, 10);

  // Rimozione automatica
  if (duration > 0) {
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => {
        if (notification.parentElement) {
          notification.remove();
        }
      }, 300);
    }, duration);
  }
}

// Inizializza quando il DOM è pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSocket);
} else {
  initSocket();
}

// Esporta per uso globale
window.showNotification = showNotification;

// ==================== MODALI MODERNI ====================

/**
 * Mostra un modale di conferma moderno (sostituisce confirm())
 * @param {string} message - Messaggio da mostrare
 * @param {string} title - Titolo del modale (opzionale)
 * @returns {Promise<boolean>} - true se confermato, false se annullato
 */
function showConfirmModal(message, title = 'Conferma') {
  return new Promise((resolve) => {
    const modal = document.getElementById('confirmModal');
    const titleEl = document.getElementById('confirmModalTitle');
    const messageEl = document.getElementById('confirmMessage');
    const iconEl = document.getElementById('confirmIcon');
    const confirmBtn = document.getElementById('confirmButton');

    // Imposta titolo e messaggio
    titleEl.textContent = title;
    messageEl.textContent = message;

    // Icona di avviso
    iconEl.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
        <line x1="12" y1="9" x2="12" y2="13"></line>
        <line x1="12" y1="17" x2="12.01" y2="17"></line>
      </svg>
    `;

    // Pulisci stato precedente
    if (window.confirmModalResolve) {
      window.confirmModalResolve(false);
      window.confirmModalResolve = null;
    }

    // Rimuovi listener precedenti e clona il pulsante
    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

    // Salva resolve
    window.confirmModalResolve = resolve;

    // Handler conferma
    newConfirmBtn.onclick = (e) => {
      e.stopPropagation();
      const res = window.confirmModalResolve;
      window.confirmModalResolve = null;
      closeConfirmModal(true);
      if (res) res(true);
    };

    // Handler per chiudere (X e Annulla)
    const closeHandler = (e) => {
      e.stopPropagation();
      const res = window.confirmModalResolve;
      window.confirmModalResolve = null;
      closeConfirmModal(true);
      if (res) res(false);
    };
    
    // Pulsante chiudi (X)
    const closeBtn = modal.querySelector('.modal-close');
    if (closeBtn) {
      closeBtn.onclick = closeHandler;
    }
    
    // Pulsante Annulla
    const cancelBtn = modal.querySelector('.btn-secondary');
    if (cancelBtn) {
      cancelBtn.onclick = closeHandler;
    }
    
    window.confirmModalCloseHandler = closeHandler;

    // Handler backdrop click
    const handleBackdropClick = (e) => {
      if (e.target === modal) {
        const res = window.confirmModalResolve;
        window.confirmModalResolve = null;
        closeConfirmModal(true);
        if (res) res(false);
      }
    };
    
    modal.addEventListener('click', handleBackdropClick);
    window.confirmModalBackdropHandler = handleBackdropClick;
    
    // Previeni la chiusura quando si clicca sul contenuto del modale
    const modalContent = modal.querySelector('.modal-content');
    if (modalContent) {
      modalContent.addEventListener('click', (e) => {
        e.stopPropagation();
      });
    }

    // Mostra modale
    modal.classList.add('active', 'show');
  });
}

/**
 * Chiude il modale di conferma
 */
function closeConfirmModal(alreadyResolved = false) {
  const modal = document.getElementById('confirmModal');
  modal.classList.remove('active', 'show');
  
  // Rimuovi listener
  if (window.confirmModalBackdropHandler) {
    modal.removeEventListener('click', window.confirmModalBackdropHandler);
    delete window.confirmModalBackdropHandler;
  }
  
  if (window.confirmModalCloseHandler) {
    const closeBtn = modal.querySelector('.modal-close');
    if (closeBtn) {
      closeBtn.onclick = null;
    }
    delete window.confirmModalCloseHandler;
  }
  
  // Resolve non chiamato qui - viene chiamato dagli handler specifici
}

/**
 * Mostra un modale di alert moderno (sostituisce alert())
 * @param {string} message - Messaggio da mostrare
 * @param {string} title - Titolo del modale (opzionale)
 * @param {string} type - Tipo: 'success', 'error', 'warning', 'info' (default: 'info')
 */
function showAlertModal(message, title = 'Informazione', type = 'info') {
  const modal = document.getElementById('alertModal');
  const titleEl = document.getElementById('alertModalTitle');
  const messageEl = document.getElementById('alertMessage');
  const iconEl = document.getElementById('alertIcon');

  // Imposta titolo
  titleEl.textContent = title;

  // Icona in base al tipo
  let iconSvg = '';
  switch(type) {
    case 'success':
      iconSvg = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
          <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>
      `;
      iconEl.className = 'alert-icon success';
      break;
    case 'error':
      iconSvg = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="15" y1="9" x2="9" y2="15"></line>
          <line x1="9" y1="9" x2="15" y2="15"></line>
        </svg>
      `;
      iconEl.className = 'alert-icon error';
      break;
    case 'warning':
      iconSvg = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
          <line x1="12" y1="9" x2="12" y2="13"></line>
          <line x1="12" y1="17" x2="12.01" y2="17"></line>
        </svg>
      `;
      iconEl.className = 'alert-icon warning';
      break;
    default:
      iconSvg = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="16" x2="12" y2="12"></line>
          <line x1="12" y1="8" x2="12.01" y2="8"></line>
        </svg>
      `;
      iconEl.className = 'alert-icon info';
  }

  iconEl.innerHTML = iconSvg;

  // Messaggio - supporta HTML e newline
  if (message.includes('\n') || message.length > 200) {
    // Messaggio lungo o multilinea - formatta meglio
    const lines = message.split('\n');
    let formattedMessage = '';
    
    lines.forEach(line => {
      if (line.trim().startsWith('━━')) {
        formattedMessage += `<hr style="margin: 8px 0; border: none; border-top: 1px solid var(--border);">`;
      } else if (line.trim().startsWith('✅') || line.trim().startsWith('⚠️') || line.trim().startsWith('❌')) {
        formattedMessage += `<div style="margin: 8px 0; font-weight: 600;">${escapeHtml(line)}</div>`;
      } else if (line.trim().startsWith('•') || line.trim().startsWith('-')) {
        formattedMessage += `<div style="margin: 4px 0; padding-left: 16px;">${escapeHtml(line)}</div>`;
      } else if (line.trim() === '') {
        formattedMessage += '<br>';
      } else {
        formattedMessage += `<div style="margin: 4px 0;">${escapeHtml(line)}</div>`;
      }
    });
    
    messageEl.innerHTML = formattedMessage;
  } else {
    messageEl.textContent = message;
  }

  // Mostra modale
  modal.classList.add('active', 'show');
  
  // Handler pulsante OK
  const okBtn = document.getElementById('alertModalOkBtn');
  if (okBtn) {
    okBtn.onclick = (e) => {
      e.stopPropagation();
      closeAlertModal();
    };
  }
  
  // Handler pulsante chiudi (X)
  const closeBtn = modal.querySelector('.modal-close');
  if (closeBtn) {
    closeBtn.onclick = (e) => {
      e.stopPropagation();
      closeAlertModal();
    };
  }
  
  // Handler backdrop click
  const handleBackdropClick = (e) => {
    if (e.target === modal) {
      closeAlertModal();
    }
  };
  modal.addEventListener('click', handleBackdropClick);
  window.alertModalBackdropHandler = handleBackdropClick;
  
  // Previeni chiusura quando si clicca sul contenuto
  const modalContent = modal.querySelector('.modal-content');
  if (modalContent) {
    modalContent.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }
}

/**
 * Chiude il modale di alert
 */
function closeAlertModal() {
  const modal = document.getElementById('alertModal');
  modal.classList.remove('active', 'show');
  
  // Rimuovi listener backdrop
  if (window.alertModalBackdropHandler) {
    modal.removeEventListener('click', window.alertModalBackdropHandler);
    delete window.alertModalBackdropHandler;
  }
}

/**
 * Funzione helper per escape HTML
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Salva le funzioni originali (se necessario)
const originalAlert = window.alert;
const originalConfirm = window.confirm;

// Sostituisce window.alert e window.confirm
window.alert = function(message) {
  // Determina tipo dal messaggio
  let type = 'info';
  let title = 'Informazione';
  
  const msgLower = message.toLowerCase();
  
  if (message.includes('✅') || msgLower.includes('successo') || msgLower.includes('creato') || 
      msgLower.includes('aggiornato') || msgLower.includes('registrato') || msgLower.includes('salvato')) {
    type = 'success';
    title = 'Successo';
  } else if (message.includes('❌') || msgLower.includes('errore') || msgLower.includes('error')) {
    type = 'error';
    title = 'Errore';
  } else if (message.includes('⚠️') || msgLower.includes('attenzione') || msgLower.includes('warning') ||
             msgLower.includes('compila') || msgLower.includes('obbligatorio') || msgLower.includes('seleziona')) {
    type = 'warning';
    title = 'Attenzione';
  }
  
  showAlertModal(message, title, type);
};

window.confirm = function(message) {
  return showConfirmModal(message, 'Conferma eliminazione');
};

// Esporta funzioni globali
window.showConfirmModal = showConfirmModal;
window.closeConfirmModal = closeConfirmModal;
window.showAlertModal = showAlertModal;
window.closeAlertModal = closeAlertModal;

