// Modulo Socket.IO isolato: init + emissione eventi magazzino.
// I service chiamano emit() senza conoscere i dettagli del trasporto.
const { Server } = require("socket.io");

let io = null;

function init(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"], credentials: true },
    transports: ["websocket", "polling"],
    allowEIO3: true,
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  io.on("connection", (socket) => {
    console.log(
      `✅ Client connesso: ${socket.id} da ${socket.handshake.address}`,
    );
    socket.emit("connected", {
      message: "Connesso al server",
      timestamp: new Date().toISOString(),
    });
    socket.on("disconnect", (reason) =>
      console.log(`❌ Client disconnesso: ${socket.id} - Motivo: ${reason}`),
    );
    socket.on("error", (error) =>
      console.error(`⚠️ Errore Socket.IO (${socket.id}):`, error),
    );
    socket.on("ping", () =>
      socket.emit("pong", { timestamp: new Date().toISOString() }),
    );
  });

  return io;
}

function emit(event, data) {
  if (io) io.emit(event, data);
}

// Notifica standard dopo una variazione di movimenti/magazzino
function notificaMovimento(evento, payload) {
  if (!io) return;
  if (evento) io.emit(evento, payload);
  io.emit("magazzino_aggiornato");
  io.emit("dati_aggiornati");
}

function clientsCount() {
  return io ? io.engine.clientsCount : 0;
}

module.exports = { init, emit, notificaMovimento, clientsCount };
