// ==================== CONFIGURAZIONE E STORE GLOBALE ====================
// File: js/config.js
// Scopo: costante API + stato applicativo condiviso tra tutti i moduli.
//        Le variabili restano globali (a livello di script) perché i moduli
//        sono caricati come script classici e vi accedono per nome.
//        La funzione di download DB è stata spostata in utils.js.

// Endpoint base delle API
const API_URL = "api";

// ── STATO APPLICATIVO ────────────────────────────────────────
// Liste correnti (filtrate/visualizzate) e liste complete ("all*").
// Ogni modulo CRUD aggiorna la propria porzione.
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
