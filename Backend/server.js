// server.js

// Installazione: npm install express sqlite3 cors bcrypt
const express = require("express");
const cors = require("cors");
const path = require("path");
const os = require("os");
const { exec } = require("child_process");
const { initDatabase } = require("./db/init");
const authRoutes = require("./routes/auth");
const prodottiRoutes = require("./routes/prodotti");
const datiRoutes = require("./routes/dati");
const magazzinoRoutes = require("./routes/magazzino");

const PORT = 3000;
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../frontend")));

// Inizializza database
initDatabase();

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/prodotti", prodottiRoutes);
app.use("/api/dati", datiRoutes);
app.use("/api", magazzinoRoutes);

// Avvio server e apertura browser
app.listen(PORT, () => {
  console.log(`Backend avviato su http://localhost:${PORT}`);
  
  // *** CORREZIONE: Apre direttamente la pagina di login ***
  const url = `http://localhost:${PORT}/login.html`; 

  let cmd;
  switch (os.platform()) {
    case "win32":
      cmd = `start ${url}`;
      break;
    case "darwin":
      cmd = `open ${url}`;
      break;
    default:
      cmd = `xdg-open ${url}`;
  }
  exec(cmd, (err) => {
    if (err)
      console.warn(
        "Non è stato possibile aprire automaticamente il browser:",
        err
      );
  });
});