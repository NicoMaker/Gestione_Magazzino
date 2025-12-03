const { initDatabase } = require("./init");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcrypt");
const path = require("path");
const fs = require("fs");
const readline = require("readline");

const dbPath = path.join(__dirname, "magazzino.db");
const db = new sqlite3.Database(dbPath);

// Configurazione da readline
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Funzione per chiedere input
function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

// Funzione helper per promisificare db.run con supporto batch
function runQuery(query, params = []) {
  return new Promise((resolve, reject) => {
    db.run(query, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

// Funzione per batch insert (più veloce per grandi volumi)
async function batchInsert(query, dataArray, batchSize = 500) {
  const batches = [];
  for (let i = 0; i < dataArray.length; i += batchSize) {
    batches.push(dataArray.slice(i, i + batchSize));
  }

  let completed = 0;
  for (const batch of batches) {
    await new Promise((resolve, reject) => {
      db.serialize(() => {
        db.run("BEGIN TRANSACTION");
        for (const params of batch) {
          db.run(query, params, (err) => {
            if (err) reject(err);
          });
        }
        db.run("COMMIT", (err) => {
          if (err) reject(err);
          else {
            completed += batch.length;
            process.stdout.write(
              `\r  Progress: ${completed}/${dataArray.length}`
            );
            resolve();
          }
        });
      });
    });
  }
  console.log(); // Newline dopo progress
}

// Funzione helper per promisificare db.get
function getQuery(query, params = []) {
  return new Promise((resolve, reject) => {
    db.get(query, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

// Funzione helper per promisificare db.all
function getAllQuery(query, params = []) {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

// Funzioni di utilità random
function randomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min, max, decimals = 2) {
  const value = Math.random() * (max - min) + min;
  return parseFloat(value.toFixed(decimals));
}

function randomDate(daysBack) {
  const today = new Date();
  const randomDays = Math.floor(Math.random() * daysBack);
  const date = new Date(today);
  date.setDate(date.getDate() - randomDays);
  return date.toISOString().split("T")[0];
}

// Genera nome utente univoco
function generateUsername(index, baseNames) {
  if (index < baseNames.length) {
    return baseNames[index];
  }
  return `User${index + 1}`;
}

// Genera nome marca univoco
function generateMarcaName(index, baseMarche) {
  if (index < baseMarche.length) {
    return baseMarche[index];
  }
  const suffissi = [
    "Tech",
    "Group",
    "Industries",
    "Corporation",
    "International",
    "Global",
    "Solutions",
    "Systems",
  ];
  const prefissi = [
    "Alpha",
    "Beta",
    "Omega",
    "Prime",
    "Elite",
    "Pro",
    "Max",
    "Ultra",
    "Super",
    "Mega",
  ];
  return `${randomElement(prefissi)} ${randomElement(suffissi)} ${Math.floor(
    index / 100
  )}`;
}

async function seedDatabase() {
  console.log(
    "🌱 Inizio popolamento database con dati casuali su larga scala...\n"
  );
  const startTime = Date.now();

  try {
    // Carica configurazione da JSON
    const configPath = path.join(__dirname, "config.json");
    if (!fs.existsSync(configPath)) {
      console.log("❌ File seed-config.json non trovato!");
      console.log("📝 Creazione file di configurazione completo...");

      const exampleConfig = require("./seed-config-template.json");
      fs.writeFileSync(configPath, JSON.stringify(exampleConfig, null, 2));
      console.log("✅ File seed-config.json creato!\n");
    }

    const config = JSON.parse(fs.readFileSync(configPath, "utf8"));

    // Chiedi configurazione da tastiera
    console.log("📊 CONFIGURAZIONE GENERAZIONE DATI (MAX 10000 per tipo)\n");

    const numUtenti = Math.min(
      10000,
      parseInt(
        (await askQuestion("Numero di utenti da creare (1-10000): ")) || "10"
      )
    );
    const numMarche = Math.min(
      10000,
      parseInt(
        (await askQuestion("Numero di marche da creare (1-10000): ")) || "50"
      )
    );
    const numProdotti = Math.min(
      10000,
      parseInt(
        (await askQuestion("Numero di prodotti da creare (1-10000): ")) || "100"
      )
    );
    const numCarichi = Math.min(
      10000,
      parseInt(
        (await askQuestion("Numero di movimenti di carico (1-10000): ")) ||
          "200"
      )
    );
    const numScarichi = Math.min(
      10000,
      parseInt(
        (await askQuestion("Numero di movimenti di scarico (1-10000): ")) ||
          "150"
      )
    );
    const giorniStorico = parseInt(
      (await askQuestion("Giorni di storico (default 180): ")) || "180"
    );

    console.log("\n⚙️  Configurazione:");
    console.log(`   • Utenti: ${numUtenti}`);
    console.log(`   • Marche: ${numMarche}`);
    console.log(`   • Prodotti: ${numProdotti}`);
    console.log(`   • Carichi: ${numCarichi}`);
    console.log(`   • Scarichi: ${numScarichi}`);
    console.log(`   • Storico: ${giorniStorico} giorni`);
    console.log("\n🚀 Avvio elaborazione...\n");

    console.log("🏗️  Verifica e creazione tabelle...");
    await new Promise((resolve) => {
      initDatabase();
      setTimeout(resolve, 1000);
    });
    console.log("✅ Tabelle verificate!\n");

    // 1. CREAZIONE UTENTI IN BATCH
    console.log("👤 Creazione utenti in batch...");
    const usersToInsert = [];
    for (let i = 0; i < numUtenti; i++) {
      const username = generateUsername(i, config.nomi_utenti);
      const password = `${username}123!`;
      const hashedPassword = await bcrypt.hash(password, 10);
      const createdAt = new Date().toISOString();

      usersToInsert.push([username, hashedPassword, createdAt]);
    }

    await batchInsert(
      "INSERT OR IGNORE INTO users (username, password, createdat) VALUES (?, ?, ?)",
      usersToInsert
    );
    console.log(`✅ ${numUtenti} utenti creati!\n`);

    // 2. CREAZIONE MARCHE IN BATCH
    console.log("🏷️  Creazione marche in batch...");
    const marcheToInsert = [];
    const marcheIds = {};

    for (let i = 0; i < numMarche; i++) {
      const nomeMarca = generateMarcaName(i, config.marche);
      const dataCreazione = new Date().toISOString();
      marcheToInsert.push([nomeMarca, dataCreazione]);
    }

    await batchInsert(
      "INSERT OR IGNORE INTO marche (nome, data_creazione) VALUES (?, ?)",
      marcheToInsert
    );

    // Recupera gli ID delle marche create
    const marcheRows = await getAllQuery("SELECT id, nome FROM marche");
    marcheRows.forEach((row) => {
      marcheIds[row.nome] = row.id;
    });
    console.log(`✅ ${Object.keys(marcheIds).length} marche create!\n`);

    // 3. CREAZIONE PRODOTTI IN BATCH
    console.log("📦 Creazione prodotti in batch...");
    const prodottiToInsert = [];
    const prodottiInfo = [];
    const marcheNomi = Object.keys(marcheIds);

    for (let i = 0; i < numProdotti; i++) {
      const categoria = randomElement(config.categorie_prodotti);
      const marcaNome = randomElement(marcheNomi);
      const prefisso = randomElement(categoria.prefissi);
      const specifica = randomElement(config.specifiche);
      const dimensione = randomElement(config.dimensioni);

      const nome = `${prefisso} ${specifica} ${dimensione} #${i}`;
      const descrizione = `${categoria.categoria} - ${marcaNome} ${randomInt(
        2020,
        2024
      )}`;
      const dataCreazione = new Date().toISOString();

      prodottiToInsert.push([
        nome,
        marcheIds[marcaNome],
        descrizione,
        dataCreazione,
      ]);
      prodottiInfo.push({
        nome,
        categoria,
        marcaNome,
        prezzoMin: categoria.prezzoMin,
        prezzoMax: categoria.prezzoMax,
      });
    }

    await batchInsert(
      "INSERT OR IGNORE INTO prodotti (nome, marca_id, descrizione, data_creazione) VALUES (?, ?, ?, ?)",
      prodottiToInsert
    );

    // Recupera gli ID dei prodotti creati
    const prodottiRows = await getAllQuery("SELECT id, nome FROM prodotti");
    const prodottiIds = {};
    prodottiRows.forEach((row) => {
      prodottiIds[row.nome] = row.id;
    });
    console.log(`✅ ${Object.keys(prodottiIds).length} prodotti creati!\n`);

    // 4. CREAZIONE CARICHI IN BATCH
    console.log("📥 Creazione carichi in batch...");
    const carichiMovimenti = [];
    const carichiLotti = [];
    let movimentoId = 1;

    for (let i = 0; i < numCarichi; i++) {
      const prodotto = randomElement(prodottiInfo);
      const quantita = randomInt(10, 200);
      const prezzo = randomFloat(prodotto.prezzoMin, prodotto.prezzoMax);
      const fornitore = randomElement(config.fornitori);
      const anno = new Date().getFullYear();
      const fattura = `FT-${anno}-${String(i + 1).padStart(6, "0")}`;
      const dataMovimento = randomDate(giorniStorico);
      const dataRegistrazione = new Date().toISOString();
      const prezzoTotale = quantita * prezzo;

      carichiMovimenti.push([
        prodottiIds[prodotto.nome],
        quantita,
        prezzo,
        prezzoTotale,
        dataMovimento,
        dataRegistrazione,
        fattura,
        fornitore,
      ]);

      carichiLotti.push([
        prodottiIds[prodotto.nome],
        quantita,
        quantita,
        prezzo,
        dataMovimento,
        dataRegistrazione,
        fattura,
        fornitore,
        movimentoId,
      ]);

      movimentoId++;
    }

    // CORREZIONE APPLICATA QUI: aggiunta la colonna 'tipo' con il valore fisso 'carico'
    await batchInsert(
      `INSERT INTO dati (prodotto_id, tipo, quantita, prezzo, prezzo_totale_movimento, 
       data_movimento, data_registrazione, fattura_doc, fornitore_cliente_id) 
       VALUES (?, 'carico', ?, ?, ?, ?, ?, ?, ?)`,
      carichiMovimenti
    );

    await batchInsert(
      `INSERT INTO lotti (prodotto_id, quantita_iniziale, quantita_rimanente, 
       prezzo, data_carico, data_registrazione, fattura_doc, fornitore, dati_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      carichiLotti
    );
    console.log(`✅ ${numCarichi} carichi creati!\n`);

    // 5. CREAZIONE SCARICHI (con controllo disponibilità)
    console.log("📤 Creazione scarichi...");
    const scarichiMovimenti = [];
    let scarichiCreati = 0;
    let scarichiSaltati = 0;

    for (let i = 0; i < numScarichi; i++) {
      const prodotto = randomElement(prodottiInfo);
      const prodottoId = prodottiIds[prodotto.nome];

      // Verifica disponibilità
      const disponibilita = await getQuery(
        `SELECT SUM(quantita_rimanente) as totale FROM lotti WHERE prodotto_id = ?`,
        [prodottoId]
      );

      if (!disponibilita || disponibilita.totale <= 0) {
        scarichiSaltati++;
        continue;
      }

      const quantita = Math.min(randomInt(1, 30), disponibilita.totale);
      const tipoCliente = randomElement(config.clienti);
      const numeroCliente = String(randomInt(1, 999)).padStart(3, "0");
      const cliente = `${tipoCliente} ${numeroCliente}`;
      const anno = new Date().getFullYear();
      const fattura = `FS-${anno}-${String(i + 1).padStart(6, "0")}`;
      const dataMovimento = randomDate(Math.floor(giorniStorico / 2));
      const dataRegistrazione = new Date().toISOString();

      // Prendi prezzo FIFO
      const lotto = await getQuery(
        `SELECT prezzo FROM lotti 
         WHERE prodotto_id = ? AND quantita_rimanente > 0 
         ORDER BY data_carico ASC LIMIT 1`,
        [prodottoId]
      );

      const prezzo = lotto ? lotto.prezzo : 0;
      const prezzoTotale = quantita * prezzo;

      // Inserisci scarico (il tipo è già specificato qui come 'scarico')
      await runQuery(
        `INSERT INTO dati (prodotto_id, tipo, quantita, prezzo, prezzo_totale_movimento, 
         data_movimento, data_registrazione, fattura_doc, fornitore_cliente_id) 
         VALUES (?, 'scarico', ?, ?, ?, ?, ?, ?, ?)`,
        [
          prodottoId,
          quantita,
          prezzo,
          prezzoTotale,
          dataMovimento,
          dataRegistrazione,
          fattura,
          cliente,
        ]
      );

      // Aggiorna lotti FIFO
      let quantitaDaScaricare = quantita;
      while (quantitaDaScaricare > 0) {
        const lottoFifo = await getQuery(
          `SELECT id, quantita_rimanente FROM lotti 
           WHERE prodotto_id = ? AND quantita_rimanente > 0 
           ORDER BY data_carico ASC LIMIT 1`,
          [prodottoId]
        );

        if (!lottoFifo) break;

        const quantitaDaPrelevare = Math.min(
          quantitaDaScaricare,
          lottoFifo.quantita_rimanente
        );
        const nuovaQuantita =
          lottoFifo.quantita_rimanente - quantitaDaPrelevare;

        await runQuery("UPDATE lotti SET quantita_rimanente = ? WHERE id = ?", [
          nuovaQuantita,
          lottoFifo.id,
        ]);

        quantitaDaScaricare -= quantitaDaPrelevare;
      }

      scarichiCreati++;
      if (scarichiCreati % 50 === 0) {
        process.stdout.write(`\r  Progress: ${scarichiCreati}/${numScarichi}`);
      }
    }
    console.log(
      `\n✅ ${scarichiCreati} scarichi creati (${scarichiSaltati} saltati per mancanza giacenza)!\n`
    );

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log("✅ Database popolato con successo!");
    console.log("\n📊 Riepilogo Finale:");
    console.log(`   • ${numUtenti} utenti`);
    console.log(`   • ${Object.keys(marcheIds).length} marche`);
    console.log(`   • ${Object.keys(prodottiIds).length} prodotti`);
    console.log(`   • ${numCarichi} carichi`);
    console.log(`   • ${scarichiCreati} scarichi`);
    console.log(`   • Periodo storico: ${giorniStorico} giorni`);
    console.log(`   • Tempo di esecuzione: ${duration} secondi`);
  } catch (error) {
    console.error("❌ Errore durante il popolamento:", error);
  } finally {
    rl.close();
    db.close(() => {
      console.log("\n🔒 Connessione al database chiusa.");
    });
  }
}

// Esegui il seeding
seedDatabase();
