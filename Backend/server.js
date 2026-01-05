// server.js

const express = require("express");
const cors = require("cors");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");
const os = require("os");
const { initDatabase } = require("./db/init");

const authRoutes = require("./routes/auth");
const marcheRoutes = require("./routes/marche");
const prodottiRoutes = require("./routes/prodotti");
const datiRoutes = require("./routes/dati");
const magazzinoRoutes = require("./routes/magazzino");
const utentiRoutes = require("./routes/utenti");

const PORT = process.env.PORT || 3000;
const app = express();

// ========================================
// 🔧 CREA SERVER HTTP PER SOCKET.IO
// ========================================
const server = http.createServer(app);

// ========================================
// 🔌 CONFIGURA SOCKET.IO CON CORS
// ========================================
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Esporta io per usarlo nelle route
app.set("io", io);

// ========================================
// 📦 MIDDLEWARE
// ========================================
app.use(
  cors({
    origin: "*",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  })
);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Serve static files dalla cartella frontend
app.use(express.static(path.join(__dirname, "../frontend")));

// Log delle richieste (utile per debug)
app.use((req, res, next) => {
  if (req.path.startsWith("/api")) {
    console.log(
      `${new Date().toISOString()} - ${req.method} ${req.path} da ${req.ip}`
    );
  }
  next();
});

// ========================================
// 💾 INIZIALIZZA DATABASE
// ========================================
initDatabase();

// ========================================
// 🛣️ API ROUTES
// ========================================
app.use("/api/auth", authRoutes);
app.use("/api/marche", marcheRoutes);
app.use("/api/prodotti", prodottiRoutes);
app.use("/api/dati", datiRoutes);
app.use("/api/magazzino", magazzinoRoutes);
app.use("/api/utenti", utentiRoutes);

// ========================================
// 🏥 HEALTH CHECK
// ========================================
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    socketConnections: io.engine.clientsCount,
  });
});

// ========================================
// 🔌 GESTIONE CONNESSIONI SOCKET.IO
// ========================================
io.on("connection", (socket) => {
  console.log(
    `✅ Client connesso: ${socket.id} da ${socket.handshake.address}`
  );

  // Invia conferma di connessione
  socket.emit("connected", {
    message: "Connesso al server",
    timestamp: new Date().toISOString(),
  });

  socket.on("disconnect", (reason) => {
    console.log(`❌ Client disconnesso: ${socket.id} - Motivo: ${reason}`);
  });

  socket.on("error", (error) => {
    console.error(`⚠️ Errore Socket.IO (${socket.id}):`, error);
  });

  // Listener custom per test connessione
  socket.on("ping", () => {
    socket.emit("pong", { timestamp: new Date().toISOString() });
  });
});

// ========================================
// 🌐 FUNZIONE PER OTTENERE IP LOCALE
// ========================================
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

// ========================================
// 🏠 SERVE INDEX.HTML PER TUTTE LE ROUTE NON-API (SPA)
// ========================================
app.get("*", (req, res) => {
  // Non interferire con le route API
  if (req.path.startsWith("/api")) {
    return res.status(404).json({ error: "Endpoint API non trovato" });
  }

  // Serve index.html per tutte le altre route (SPA routing)
  res.sendFile(path.join(__dirname, "../frontend", "index.html"));
});

// ========================================
// ⚠️ GESTIONE ERRORI
// ========================================
app.use((err, req, res, next) => {
  console.error("❌ Errore server:", err.stack);
  res.status(err.status || 500).json({
    error: err.message || "Errore interno del server",
    timestamp: new Date().toISOString(),
  });
});

process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught Exception:", error);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled Rejection:", reason);
});

// ========================================
// 🚀 AVVIO SERVER SU 0.0.0.0 (RETE LOCALE)
// ========================================
server.listen(PORT, "0.0.0.0", () => {
  const ip = getLocalIP();
  console.log(`✅ Backend avviato`);
  console.log(`📍 Localhost: http://localhost:${PORT}`);
  console.log(`🌐 Network: http://${ip}:${PORT}`);
  console.log(`🔌 Socket.IO abilitato per sincronizzazione real-time`);
  console.log(`📱 Da telefono usa: http://${ip}:${PORT}`);
  console.log(`📂 Frontend servito da: ../frontend/index.html`);
});

// ========================================
// 🛑 CHIUSURA GRACEFUL
// ========================================
const gracefulShutdown = (signal) => {
  console.log(`\n⏹️ ${signal} ricevuto. Chiusura in corso...`);

  server.close(() => {
    console.log("✅ Server chiuso");
    io.close(() => {
      console.log("✅ Socket.IO chiuso");
      process.exit(0);
    });
  });

  setTimeout(() => {
    console.error("⚠️ Timeout chiusura. Forzatura uscita...");
    process.exit(1);
  }, 10000);
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

module.exports = { app, server, io };
