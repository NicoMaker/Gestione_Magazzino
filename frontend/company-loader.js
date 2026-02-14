// ==================== CARICAMENTO INFORMAZIONI AZIENDALI ====================
// File: company-loader.js

let companyInfo = null;

/**
 * Formatta un numero di telefono per la visualizzazione
 * Rimuove caratteri non numerici (eccetto +) e aggiunge spazi per leggibilità
 */
function formatPhoneNumber(phone) {
  if (!phone || phone === "-") return phone;
  
  // Rimuovi tutti gli spazi esistenti
  let cleaned = phone.replace(/\s+/g, '');
  
  // Se inizia con +39 (Italia)
  if (cleaned.startsWith('+39')) {
    // +39 XXX XXX XXXX
    return cleaned.replace(/(\+39)(\d{3})(\d{3})(\d{4})/, '$1 $2 $3 $4');
  }
  // Se inizia con +
  else if (cleaned.startsWith('+')) {
    // Formato generico internazionale: +XX XXX XXX XXXX
    return cleaned.replace(/(\+\d{1,3})(\d{3})(\d{3})(\d{4})/, '$1 $2 $3 $4');
  }
  // Se è un numero italiano senza prefisso (10 cifre)
  else if (cleaned.length === 10) {
    // XXX XXX XXXX
    return cleaned.replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3');
  }
  // Formato generico per altri numeri
  else if (cleaned.length > 6) {
    // Dividi in gruppi di 3 cifre
    return cleaned.replace(/(\d{3})(?=\d)/g, '$1 ');
  }
  
  return phone;
}

/**
 * Carica le informazioni aziendali dal file JSON
 * @returns {Promise<Object>} - Oggetto con i dati aziendali
 */
async function loadCompanyInfo() {
  try {
    const response = await fetch('company-info.json');
    
    if (!response.ok) {
      throw new Error(`Errore caricamento: ${response.status}`);
    }
    
    companyInfo = await response.json();
    console.log('✅ Informazioni aziendali caricate:', companyInfo);
    
    return companyInfo;
    
  } catch (error) {
    console.error('❌ Errore caricamento company-info.json:', error);
    
    // Fallback con dati di default
    companyInfo = {
      company: {
        name: "Magazzino Moto",
        address: "Via prova 123",
        city: "Milano",
        cap: "20100",
        province: "MI",
        country: "Italia",
        piva: "1234567890",
        phone: "+39 02 1234567",
        email: "info@magazzinomoto.it",
        website: "www.magazzinomoto.it",
        logo: "img/Logo.png"
      },
      settings: {
        currency: "EUR",
        currencySymbol: "€",
        dateFormat: "DD/MM/YYYY",
        decimalSeparator: ",",
        thousandsSeparator: "."
      }
    };
    
    console.warn('⚠️ Uso dati di fallback');
    return companyInfo;
  }
}

/**
 * Inserisce le informazioni aziendali nella sidebar (home.html)
 */
function insertCompanyInfoSidebar() {
  if (!companyInfo) {
    console.error('❌ companyInfo non caricato');
    return;
  }
  
  const { company } = companyInfo;
  
  // 🎯 INDIRIZZO
  const addressElements = document.querySelectorAll('.company-address-sidebar');
  addressElements.forEach(el => {
    el.textContent = `${company.address}, ${company.cap} ${company.city} (${company.province})`;
  });
  
  // 🎯 PARTITA IVA
  const pivaElements = document.querySelectorAll('.piva-number');
  pivaElements.forEach(el => {
    el.textContent = company.piva;
  });
  
  console.log('✅ Info aziendali inserite nella sidebar');
}

/**
 * Inserisce le informazioni aziendali nel login (index.html)
 */
function insertCompanyInfoLogin() {
  if (!companyInfo) {
    console.error('❌ companyInfo non caricato');
    return;
  }
  
  const { company } = companyInfo;
  
  // 🎯 INDIRIZZO
  const addressElements = document.querySelectorAll('.company-address');
  addressElements.forEach(el => {
    el.textContent = `${company.address}, ${company.cap} ${company.city} (${company.province})`;
  });
  
  // 🎯 PARTITA IVA
  const pivaElements = document.querySelectorAll('.piva-value');
  pivaElements.forEach(el => {
    el.textContent = company.piva;
  });
  
  console.log('✅ Info aziendali inserite nel login');
}

/**
 * Inserisce le informazioni aziendali nelle stampe
 * @param {string} html - HTML della stampa
 * @returns {string} - HTML con i dati aziendali inseriti
 */
function insertCompanyInfoPrint(html) {
  if (!companyInfo) {
    console.error('❌ companyInfo non caricato');
    return html;
  }
  
  const { company } = companyInfo;
  
  // Sostituisci i placeholder
  let updatedHtml = html
    .replace(/{{company\.address}}/g, company.address)
    .replace(/{{company\.city}}/g, company.city)
    .replace(/{{company\.cap}}/g, company.cap)
    .replace(/{{company\.province}}/g, company.province)
    .replace(/{{company\.piva}}/g, company.piva)
    .replace(/{{company\.name}}/g, company.name)
    .replace(/{{company\.phone}}/g, formatPhoneNumber(company.phone))
    .replace(/{{company\.email}}/g, company.email)
    .replace(/{{company\.logo}}/g, company.logo);
  
  console.log('✅ Info aziendali inserite nella stampa');
  
  return updatedHtml;
}

/**
 * Restituisce l'indirizzo completo formattato
 * @returns {string} - Indirizzo completo
 */
function getFullAddress() {
  if (!companyInfo) return 'Indirizzo non disponibile';
  
  const { company } = companyInfo;
  return `${company.address}, ${company.cap} ${company.city} (${company.province}), ${company.country}`;
}

/**
 * Restituisce la Partita IVA
 * @returns {string} - Partita IVA
 */
function getPartitaIVA() {
  if (!companyInfo) return 'P.IVA non disponibile';
  
  return companyInfo.company.piva;
}

/**
 * Restituisce il nome azienda
 * @returns {string} - Nome azienda
 */
function getCompanyName() {
  if (!companyInfo) return 'Nome azienda non disponibile';
  
  return companyInfo.company.name;
}

/**
 * Restituisce il path del logo
 * @returns {string} - Path del logo
 */
function getLogoPath() {
  if (!companyInfo) return 'img/Logo.png';
  
  return companyInfo.company.logo;
}

/**
 * Restituisce il telefono formattato
 * @returns {string} - Telefono formattato
 */
function getPhoneNumber() {
  if (!companyInfo) return 'Telefono non disponibile';
  
  return formatPhoneNumber(companyInfo.company.phone);
}

/**
 * Inizializza il caricamento delle info aziendali
 * Chiamare questa funzione all'avvio dell'applicazione
 */
async function initCompanyInfo() {
  console.log('🚀 Inizializzazione informazioni aziendali...');
  
  await loadCompanyInfo();
  
  // Determina in quale pagina siamo
  const isLoginPage = document.getElementById('loginForm') !== null;
  const isHomePage = document.getElementById('currentUser') !== null;
  
  if (isLoginPage) {
    insertCompanyInfoLogin();
  } else if (isHomePage) {
    insertCompanyInfoSidebar();
  }
  
  console.log('✅ Inizializzazione completata');
}

// 🎯 AUTO-INIZIALIZZAZIONE AL CARICAMENTO PAGINA
document.addEventListener('DOMContentLoaded', initCompanyInfo);

// Export delle funzioni (se usi moduli ES6)
// export {
//   loadCompanyInfo,
//   insertCompanyInfoSidebar,
//   insertCompanyInfoLogin,
//   insertCompanyInfoPrint,
//   getFullAddress,
//   getPartitaIVA,
//   getCompanyName,
//   getLogoPath,
//   initCompanyInfo
// };