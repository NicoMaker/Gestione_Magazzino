// ==================== CONFIGURAZIONE GLOBALE ====================
// File: config.js
// Scopo: Costanti di configurazione e variabili di stato globali

const API_URL = "api";

// ==================== DOWNLOAD DATABASE ====================
function downloadDatabase(event) {
  event.preventDefault();

  const downloadUrl = "/api/admin/download-db";

  const link = document.createElement("a");
  link.href = downloadUrl;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);


}

// ==================== STATO GLOBALE ====================
let marche = [];
let prodotti = [];
let movimenti = [];
let utenti = [];

let allMarche = [];
let allProdotti = [];
let allMovimenti = [];
let allRiepilogo = [];
let riepilogo = [];
let allStorico = [];
let storico = [];
let allUtenti = [];