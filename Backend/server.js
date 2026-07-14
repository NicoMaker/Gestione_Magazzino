// Entry point: inizializza DB e Socket.IO, avvia il server HTTP
const http = require("http");
const creaApp = require("./src/app");
const { initDatabase } = require("./src/config/schema");
const realtime = require("./src/realtime/socket");
const { getLocalIP, getPublicIP } = require("./src/utils/network");

const PORT = process.env.PORT || 3000;

async function avvia() {
  await initDatabase();

  const app = creaApp({ port: PORT });
  const server = http.createServer(app);
  realtime.init(server);

  server.listen(PORT, "0.0.0.0", async () => {
    const localIP = getLocalIP();
    const publicIP = await getPublicIP();
    console.log(`\n✅ Server magazzino avviato con Socket.IO`);
    console.log(`🌐 IP Pubblico: http://${publicIP}:${PORT}`);
    console.log(`🏠 IP Locale:   http://${localIP}:${PORT}`);
    console.log(`📍 Localhost:   http://localhost:${PORT}\n`);
  });
}

avvia();
