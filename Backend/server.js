// server.js

const express = require("express");
const cors = require("cors");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");
const { initDatabase } = require("./db/init");

const authRoutes = require("./routes/auth");
const marcheRoutes = require("./routes/marche");
const prodottiRoutes = require("./routes/prodotti");
const datiRoutes = require("./routes/dati");
const magazzinoRoutes = require("./routes/magazzino");
const utentiRoutes = require("./routes/utenti");

const PORT = 3000;
const app = express();

// Crea server HTTP per Socket.IO
const server = http.createServer(app);

// Configura Socket.IO con CORS
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Esporta io per usarlo nelle route
app.set("io", io);

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

// Gestione connessioni Socket.IO
io.on("connection", (socket) => {
  console.log(`✅ Client connesso: ${socket.id}`);
  
  socket.on("disconnect", () => {
    console.log(`❌ Client disconnesso: ${socket.id}`);
  });
});


const os = require("os");

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Salta IPv6 e localhost
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address;
      }
    }
  }
  return "localhost";
}

server.listen(PORT, "0.0.0.0", () => {
  const ip = getLocalIP();
  console.log(`✅ Backend avviato`);
  console.log(`📍 Localhost: http://localhost:${PORT}`);
  console.log(`🌐 Network: http://${ip}:${PORT}`);
  console.log(`🔌 Socket.IO abilitato per sincronizzazione real-time`);
});
