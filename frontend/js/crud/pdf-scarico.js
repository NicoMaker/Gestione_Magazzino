// ==================== PDF IMPORT SCARICHI ====================
// File: pdf-scarico.js

async function loadPDFJS() {
  return new Promise((resolve, reject) => {
    if (window.pdfjsLib) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    script.onload = () => {
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      resolve();
    };
    script.onerror = () =>
      reject(new Error("Impossibile caricare la libreria PDF.js"));
    document.head.appendChild(script);
  });
}

async function extractTextFromPDF(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const typedarray = new Uint8Array(e.target.result);
        if (!window.pdfjsLib) await loadPDFJS();
        const pdf = await pdfjsLib.getDocument(typedarray).promise;
        let fullText = "";
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          const page = await pdf.getPage(pageNum);
          const textContent = await page.getTextContent();
          let lastY = null,
            pageText = "";
          textContent.items.forEach((item, index) => {
            const currentY = item.transform[5];
            if (lastY !== null && Math.abs(currentY - lastY) > 5)
              pageText += "\n";
            if (index > 0 && lastY === currentY) {
              const prevItem = textContent.items[index - 1];
              if (
                item.transform[4] - (prevItem.transform[4] + prevItem.width) >
                2
              )
                pageText += " ";
            }
            pageText += item.str;
            lastY = currentY;
          });
          fullText += pageText + "\n\n";
        }
        resolve(fullText);
      } catch (error) {
        reject(
          new Error("Errore durante la lettura del PDF: " + error.message),
        );
      }
    };
    reader.onerror = () => reject(new Error("Impossibile leggere il file PDF"));
    reader.readAsArrayBuffer(file);
  });
}

function extractDateFromPDF(text) {
  const lines = text.split("\n");
  const datePatterns = [
    /DATA[_\s]{3,}(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
    /DATA\s*:\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
    /DATA\s+(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
  ];
  for (let i = 0; i < Math.min(20, lines.length); i++) {
    const line = lines[i].trim();
    for (const pattern of datePatterns) {
      const match = line.match(pattern);
      if (match && match[1]) return normalizeDate(match[1]);
    }
  }
  for (let i = 0; i < Math.min(20, lines.length); i++) {
    const match = lines[i].match(/(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/);
    if (match && match[1]) return normalizeDate(match[1]);
  }
  return new Date().toISOString().split("T")[0];
}

function extractScarichiFromPDF(text, date) {
  const scarichi = [];
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  let ricambiStartIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].toUpperCase().includes("RICAMBI")) {
      ricambiStartIndex = i;
      break;
    }
  }
  if (ricambiStartIndex === -1) return scarichi;

  const headerKeywords = [
    "CODICE",
    "RICAMBIO",
    "DESCRIZIONE",
    "QUANTITA",
    "PREZZO",
    "IVA",
    "ESCLUSA",
    "QUANTITÀ",
  ];
  let dataStartIndex = ricambiStartIndex + 1;
  for (
    let i = ricambiStartIndex + 1;
    i < Math.min(ricambiStartIndex + 10, lines.length);
    i++
  ) {
    if (headerKeywords.some((kw) => lines[i].toUpperCase().includes(kw)))
      dataStartIndex = i + 1;
    else break;
  }

  const stopKeywords = [
    "MANODOPERA",
    "TOTALE",
    "IVA COMPRESA",
    "DESCRIZIONE LAVORAZIONI",
    "LAVORAZIONI",
  ];
  for (let i = dataStartIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    if (stopKeywords.some((kw) => line.toUpperCase().includes(kw))) break;
    const parsed = parseRicamboLine(line);
    if (parsed)
      scarichi.push({ code: parsed.code, quantity: parsed.quantity, date });
  }
  return scarichi;
}

function parseRicamboLine(line) {
  const cleanLine = line.replace(/\s+/g, " ").trim();
  const pattern1 = /^(.+)\s+(\d+)\s+(\d+(?:[,\.]\d{1,2})?)$/;
  const match1 = cleanLine.match(pattern1);
  if (match1) {
    const qty = parseFloat(match1[3].replace(",", "."));
    if (isValidCode(match1[2]) && isValidQuantity(qty))
      return { code: match1[2], quantity: qty };
  }
  const pattern2 = /^(\d+)\s+(\d+(?:[,\.]\d{1,2})?)$/;
  const match2 = cleanLine.match(pattern2);
  if (match2) {
    const qty = parseFloat(match2[2].replace(",", "."));
    if (isValidCode(match2[1]) && isValidQuantity(qty))
      return { code: match2[1], quantity: qty };
  }
  const words = cleanLine.split(/\s+/);
  if (words.length >= 2) {
    const qty = parseFloat(words[words.length - 1].replace(",", "."));
    if (isValidCode(words[0]) && isValidQuantity(qty))
      return { code: words[0], quantity: qty };
  }
  return null;
}

const isValidCode = (code) => /^[A-Z0-9\-_\/]{1,50}$/i.test(code);
const isValidQuantity = (qty) => !isNaN(qty) && qty > 0 && qty <= 9999;

function normalizeDate(dateStr) {
  dateStr = dateStr.trim();
  const sep = dateStr.includes("/") ? "/" : dateStr.includes("-") ? "-" : ".";
  const parts = dateStr.split(sep);
  if (parts.length === 3) {
    if (parts[0].length === 4)
      return dateStr.replace(/\./g, "-").replace(/\//g, "-");
    const day = parts[0].padStart(2, "0");
    const month = parts[1].padStart(2, "0");
    const year = parts[2].length === 2 ? "20" + parts[2] : parts[2];
    return `${year}-${month}-${day}`;
  }
  return new Date().toISOString().split("T")[0];
}

async function checkProductExists(code) {
  try {
    const prodotti = await fetch(`${API_URL}/prodotti`).then((r) => r.json());
    return (
      prodotti.find((p) => p.nome.toUpperCase() === code.toUpperCase()) || null
    );
  } catch {
    return null;
  }
}

async function processScarichi(scarichi, nomeFilePdf) {
  const results = {
    success: [],
    failed: [],
    notFound: [],
    insufficientStock: [],
  };
  let prodottiDB = [];
  try {
    prodottiDB = await fetch(`${API_URL}/prodotti`).then((r) => r.json());
  } catch (e) {
    results.failed.push({
      code: "–",
      reason: "Errore caricamento prodotti dal server",
    });
    return results;
  }

  const aggregati = {};
  for (const s of scarichi) {
    const codice = String(s.code).trim().toUpperCase();
    if (!codice) continue;
    if (!aggregati[codice])
      aggregati[codice] = { code: codice, quantity: 0, date: s.date };
    aggregati[codice].quantity += s.quantity;
  }

  const scarichiDaInviare = [];
  for (const [codice, agg] of Object.entries(aggregati)) {
    const prodotto = prodottiDB.find(
      (p) => p.nome.trim().toUpperCase() === codice,
    );
    if (!prodotto) {
      results.notFound.push({
        code: codice,
        quantity: agg.quantity,
        date: agg.date,
        reason: "Prodotto non trovato nel database",
      });
      continue;
    }
    scarichiDaInviare.push({
      codice,
      prodotto_id: prodotto.id,
      quantita: parseFloat(agg.quantity.toFixed(2)),
      data_movimento: agg.date,
    });
  }

  if (scarichiDaInviare.length === 0) return results;

  try {
    const res = await fetch(`${API_URL}/dati/bulk-scarico`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scarichi: scarichiDaInviare,
        nome_documento: (nomeFilePdf || "")
          .replace(/\.pdf$/i, "")
          .replace(/^scaricato da /i, "")
          .trim(),
        forza_reimport: true,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      results.failed.push({
        code: "–",
        reason: data.error || "Errore sconosciuto",
      });
      return results;
    }
    for (const s of data.risultati.success)
      results.success.push({
        code: s.codice,
        nome: s.codice,
        quantity: s.quantita,
        date: s.data_movimento,
      });
    for (const s of data.risultati.insufficientStock)
      results.insufficientStock.push({
        code: s.codice,
        nome: s.codice,
        quantity: s.quantita,
        available: s.disponibile,
        date: s.data_movimento,
        reason: s.reason,
      });
    for (const s of data.risultati.failed)
      results.failed.push({ code: s.codice || "–", reason: s.reason });
  } catch (e) {
    results.failed.push({ code: "–", reason: e.message });
  }
  return results;
}

async function handlePDFImport(file) {
  try {
    showImportLoading();
    const text = await extractTextFromPDF(file);
    const date = extractDateFromPDF(text);
    const scarichi = extractScarichiFromPDF(text, date);

    if (scarichi.length === 0) {
      throw new Error(
        '❌ Nessun prodotto trovato nel PDF.\n\nVerifica che il PDF contenga:\n• Sezione "RICAMBI"\n• CODICE RICAMBIO (es. 101)\n• QUANTITÀ (es. 2)\n\nFormato atteso:\nRICAMBI\nCODICE RICAMBIO   DESCRIZIONE   QUANTITA\'\n101               Filtro Olio    2',
      );
    }

    const results = await processScarichi(scarichi, file.name);
    showImportResults(results);
    if (results.success.length > 0) {
      await loadMovimenti();
      await loadProdotti();
    }
    return results;
  } catch (error) {
    alert("❌ Errore durante l'importazione:\n\n" + error.message);
    hideImportLoading();
    throw error;
  }
}

function showImportLoading() {
  const modal = document.getElementById("modalImportPDF");
  const importBtn =
    modal.querySelector(".btn-import-confirm") ||
    modal.querySelector('[type="submit"]') ||
    modal.querySelector(".btn-primary");
  if (!importBtn) return;
  importBtn.disabled = true;
  importBtn.dataset.originalHTML = importBtn.innerHTML;
  importBtn.innerHTML = `<span>⏳ Elaborazione in corso...</span>`;
}

function hideImportLoading() {
  const modal = document.getElementById("modalImportPDF");
  const importBtn =
    modal.querySelector(".btn-import-confirm") ||
    modal.querySelector('[type="submit"]') ||
    modal.querySelector(".btn-primary");
  if (!importBtn) return;
  if (importBtn.dataset.originalHTML) {
    importBtn.innerHTML = importBtn.dataset.originalHTML;
    importBtn.disabled = false;
    delete importBtn.dataset.originalHTML;
  }
}

function showImportResults(results) {
  hideImportLoading();

  const duplicato = results.failed.find((f) => f.duplicato);
  if (
    duplicato &&
    results.success.length === 0 &&
    results.insufficientStock.length === 0
  ) {
    alert(`⚠️ IMPORTAZIONE ANNULLATA\n\n${duplicato.reason}`);
    return;
  }

  const total =
    results.success.length +
    results.failed.length +
    results.notFound.length +
    results.insufficientStock.length;
  let msg = `📊 IMPORT COMPLETATO\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n✅ Scarichi importati: ${results.success.length}/${total}\n\n`;

  if (results.success.length > 0) {
    msg += `✅ SCARICHI CREATI CON SUCCESSO:\n`;
    results.success.forEach((r) => {
      msg += `  • ${r.code} (${r.nome})\n    Quantità: ${formatQuantity(r.quantity)} pz | Data: ${new Date(r.date).toLocaleDateString("it-IT")}\n`;
    });
    msg += "\n";
  }
  if (results.notFound.length > 0) {
    msg += `⚠️ PRODOTTI NON TROVATI (${results.notFound.length}):\n`;
    results.notFound.forEach((r) => {
      msg += `  • ${r.code} - ${formatQuantity(r.quantity)} pz (${new Date(r.date).toLocaleDateString("it-IT")})\n    → Crea prima il prodotto nella sezione "Prodotti"\n`;
    });
    msg += "\n";
  }
  if (results.insufficientStock.length > 0) {
    msg += `❌ GIACENZA INSUFFICIENTE (${results.insufficientStock.length}):\n`;
    results.insufficientStock.forEach((r) => {
      msg += `  • ${r.code} (${r.nome})\n    Richiesto: ${formatQuantity(r.quantity)} pz | Data: ${new Date(r.date).toLocaleDateString("it-IT")}\n`;
      if (r.reason) msg += `    Motivo: ${r.reason}\n`;
    });
    msg += "\n";
  }
  if (results.failed.length > 0) {
    msg += `❌ ERRORI (${results.failed.length}):\n`;
    results.failed.forEach((r) => {
      msg += `  • ${r.code}: ${r.reason}\n`;
    });
  }

  alert(msg);
  if (
    results.failed.length === 0 &&
    results.notFound.length === 0 &&
    results.insufficientStock.length === 0
  ) {
    closeImportPDFModal();
  }
}

async function importaOrdineDaPdf(righePdf, dataOrdine, nomeFilePdf) {
  const aggregati = {};
  righePdf.forEach((r) => {
    const codice = String(r.codice).trim();
    if (!codice) return;
    const qta = Number(String(r.quantita).replace(",", ".")) || 0;
    if (qta <= 0) return;
    if (!aggregati[codice]) aggregati[codice] = { codice, quantita: 0 };
    aggregati[codice].quantita += qta;
  });

  for (const mov of Object.values(aggregati)) {
    const prodotto = allProdotti.find(
      (p) => String(p.codice) === String(mov.codice),
    );
    if (!prodotto) {
      console.warn("Prodotto non trovato per codice", mov.codice);
      continue;
    }
    await fetch(`${API_URL}/dati`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prodotto_id: prodotto.id,
        tipo: "scarico",
        quantita: mov.quantita,
        prezzo: null,
        data_movimento: dataOrdine,
        fattura_doc: (nomeFilePdf || "")
          .replace(/\.pdf$/i, "")
          .replace(/^scaricato da /i, "")
          .trim(),
        fornitore: null,
      }),
    });
  }
}

// Event listeners
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("formImportPDF");
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const file = document.getElementById("importPDFFile").files[0];
      if (!file) {
        alert("⚠️ Seleziona un file PDF");
        return;
      }
      if (file.type !== "application/pdf") {
        alert("⚠️ Il file deve essere un PDF");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        alert("⚠️ Il file è troppo grande (max 10MB)");
        return;
      }
      try {
        await handlePDFImport(file);
      } catch (error) {
        console.error("Errore import:", error);
      }
    });
  }

  const fileInput = document.getElementById("importPDFFile");
  if (fileInput) {
    fileInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      const preview =
        document.getElementById("filePreview") ||
        document.getElementById("filePreviewBox");
      if (file && preview) {
        preview.textContent = `📄 ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
        preview.style.display = "block";
      }
    });
  }
});

window.handlePDFImport = handlePDFImport;
window.loadPDFJS = loadPDFJS;
