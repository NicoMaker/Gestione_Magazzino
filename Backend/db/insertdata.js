// seed_fifo.js

const { db, initDatabase } = require("./init");
const bcrypt = require("bcrypt");

// =========================================
// 🔥 CREA 100 PRODOTTI
// =========================================
function insertProducts() {
    return new Promise((resolve, reject) => {
        const stmt = db.prepare("INSERT OR IGNORE INTO prodotti (nome) VALUES (?)");
        for (let i = 1; i <= 100; i++) stmt.run(`Prodotto_${i}`);
        stmt.finalize(err => err ? reject(err) : resolve(console.log("📦 Prodotti generati")));
    });
}

// =========================================
// 🔥 CREA UTENTI RANDOM + ADMIN
// =========================================
async function createUsers() {
    const adminPass = await bcrypt.hash("Admin123!", 10);

    await new Promise(res =>
        db.run(
            "INSERT OR IGNORE INTO users (username,password,createdat) VALUES (?,?,?)",
            ["Admin", adminPass, new Date().toISOString()],
            () => res()
        )
    );

    const stmt = db.prepare("INSERT OR IGNORE INTO users(username,password,createdat) VALUES (?,?,?)");

    for (let i = 1; i <= 50; i++) {
        const pass = await bcrypt.hash(`Password${i}@2025`, 10);
        stmt.run(`user${i}`, pass, new Date().toISOString());
    }

    return new Promise(res => stmt.finalize(() => {
        console.log("👤 Utenti creati (Admin + 50 utenti)");
        res();
    }));
}

// =========================================
// 🔥 FIFO SCARICO
// =========================================
function scaricoFIFO(prodotto_id, quantita_scarico) {
    return new Promise((resolve, reject) => {
        db.all(
            "SELECT * FROM lotti WHERE prodotto_id = ? AND quantita_rimanente > 0 ORDER BY data_carico ASC",
            [prodotto_id],
            async (err, lotti) => {
                if (err) return reject(err);
                let q = quantita_scarico;

                for (let lotto of lotti) {
                    if (q <= 0) break;
                    let preleva = Math.min(q, lotto.quantita_rimanente);
                    q -= preleva;

                    await new Promise((res, rej) =>
                        db.run(
                            "UPDATE lotti SET quantita_rimanente = quantita_rimanente - ? WHERE id = ?",
                            [preleva, lotto.id],
                            err => err ? rej(err) : res()
                        )
                    );
                }

                resolve();
            }
        );
    });
}

// =========================================
// 🔥 GENERA MOVIMENTI REALI (30 per prodotto)
// =========================================
async function generaMovimentiFIFO() {
    return new Promise((resolve, reject) => {
        db.all("SELECT id FROM prodotti", async (err, prodotti) => {
            if (err) return reject(err);

            for (const p of prodotti) {
                for (let i = 1; i <= 30; i++) {

                    let isCarico = Math.random() < 0.55; 
                    let quantita = Math.floor(Math.random() * 30) + 5; 
                    let prezzo = (Math.random() * 30 + 1).toFixed(2);

                    // 🔥 Data random nel passato fino ad oggi
                    let daysRange = 120; // puoi aumentare a piacere
                    let randomMs = Math.random() * 86400000 * daysRange;
                    let now = new Date(Date.now() - randomMs).toISOString();

                    // Controllo stock attuale
                    const stock = await new Promise(res =>
                        db.get("SELECT SUM(quantita_rimanente) AS tot FROM lotti WHERE prodotto_id = ?", [p.id], (e,r) => res(r?.tot || 0))
                    );

                    // Se scarico ma stock 0 → salta
                    if (!isCarico) {
                        if (stock <= 0) continue;
                        if (quantita > stock) quantita = stock;
                    }

                    let totale = quantita * prezzo;

                    await new Promise((res, rej) =>
                        db.run(
                            `INSERT INTO dati (prodotto_id,tipo,quantita,prezzo,prezzo_totale_movimento,data_movimento,data_registrazione,fattura_doc,fornitore_cliente_id)
                             VALUES (?,?,?,?,?,?,?,?,?)`,
                            [
                                p.id,
                                isCarico ? "carico" : "scarico",
                                quantita,
                                prezzo,
                                totale,
                                now,
                                new Date().toISOString(),
                                isCarico ? "FATT-" + Math.floor(Math.random()*90000) : "SCAR-" + Math.floor(Math.random()*90000),
                                isCarico ? "Fornt_" + p.id : "Cliente_" + p.id
                            ],
                            async function (err) {
                                if (err) return rej(err);

                                // CARICO → crea lotto
                                if (isCarico) {
                                    await new Promise((res2, rej2) =>
                                        db.run(
                                            `INSERT INTO lotti (prodotto_id,quantita_iniziale,quantita_rimanente,prezzo,data_carico,data_registrazione,fattura_doc,fornitore_cliente_id,dati_id)
                                             VALUES (?,?,?,?,?,?,?,?,?)`,
                                            [
                                                p.id,
                                                quantita,
                                                quantita,
                                                prezzo,
                                                now,
                                                new Date().toISOString(),
                                                "LOTT-" + p.id,
                                                "FORN_" + p.id,
                                                this.lastID
                                            ],
                                            err2 => err2 ? rej2(err2) : res2()
                                        )
                                    );
                                } else {
                                    await scaricoFIFO(p.id, quantita);
                                }

                                res();
                            }
                        )
                    );
                }
            }

            resolve(console.log("📊 MOVIMENTI FIFO GENERATI"));
        });
    });
}

// =========================================
// 🚀 RUN
// =========================================
async function seed() {
    console.log("🔄 Inizializzo DB...");
    await initDatabase();
    await insertProducts();
    await createUsers();
    await generaMovimentiFIFO();
    console.log("\n🎉 SEED COMPLETATO — MAGAZZINO RIEMPITO CON FIFO 🔥\n");
    db.close();
}

seed();
