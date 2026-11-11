// Modulo Socket.IO isolato: init + emissione eventi magazzino.
// I service chiamano emit() senza conoscere i dettagli del trasporto.
const { Server } = require("socket.io");

let io = null;

// ── Buffer eventi per operazioni multiple ─────────────────────
// Durante un'eliminazione multipla i service emettono molti eventi identici:
// con batch() vengono raccolti, deduplicati e inviati una sola volta alla fine.
// Gli eventi "utente_*" restano distinti per payload (servono per il force-logout).
let buffer = null;

function spedisci(event, data) {
  if (!io) return;
  if (buffer) {
    const chiave = event.startsWith("utente_")
      ? `${event}:${JSON.stringify(data ?? null)}`
      : event;
    buffer.set(chiave, [event, data]);
    return;
  }
  io.emit(event, data);
}

async function batch(work) {
  if (buffer) return work(); // già dentro un batch
  buffer = new Map();
  try {
    return await work();
  } finally {
    const raccolti = buffer;
    buffer = null;
    if (io) raccolti.forEach(([event, data]) => io.emit(event, data));
  }
}

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
  spedisci(event, data);
}

// Notifica standard dopo una variazione di movimenti/magazzino
function notificaMovimento(evento, payload) {
  if (!io) return;
  if (evento) spedisci(evento, payload);
  spedisci("magazzino_aggiornato");
  spedisci("dati_aggiornati");
}

function clientsCount() {
  return io ? io.engine.clientsCount : 0;
}

module.exports = { init, emit, batch, notificaMovimento, clientsCount };
