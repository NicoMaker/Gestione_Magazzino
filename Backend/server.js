// server.js

const express = require("express");
const cors = require("cors");
const path = require("path");
const { initDatabase } = require("./db/init");

const authRoutes = require("./routes/auth");
const marcheRoutes = require("./routes/marche");
const prodottiRoutes = require("./routes/prodotti");
const datiRoutes = require("./routes/dati");
const magazzinoRoutes = require("./routes/magazzino");
const utentiRoutes = require("./routes/utenti");

const PORT = 3000;
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../frontend")));

// Inizializza database
initDatabase();

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/marche", marcheRoutes);
app.use("/api/prodotti", prodottiRoutes);
app.use("/api/dati", datiRoutes);
app.use("/api/magazzino", magazzinoRoutes); // Fixed magazzino routes path from /api to /api/magazzino
app.use("/api/utenti", utentiRoutes);

// Avvio server e apertura browser
app.listen(PORT, () => {
  console.log(`✅ Backend avviato su http://localhost:${PORT}`);

  const url = `http://localhost:${PORT}/index.html`;
});
