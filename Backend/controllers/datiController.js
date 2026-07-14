// controllers/datiController.js — traduce HTTP ⇄ datiService ed emette eventi realtime
const datiService = require("../services/datiService");

// Emette gli eventi realtime restituiti dal service, più i due broadcast standard
function emitEvents(req, events) {
  const io = req.app.get("io");
  if (!io || !events || events.length === 0) return;
  for (const ev of events) {
    io.emit(ev.name, ev.payload);
  }
  // I movimenti aggiornano sempre magazzino e lista dati
  io.emit("magazzino_aggiornato");
  io.emit("dati_aggiornati");
}

// Esegue un'azione del service, gestendo errori DatiError → status corretto
async function handle(req, res, azione) {
  try {
    const { events, response } = await azione();
    emitEvents(req, events);
    res.json(response);
  } catch (err) {
    if (err instanceof datiService.DatiError) {
      return res.status(err.status).json({ error: err.message });
    }
    console.error("Errore movimenti:", err);
    res.status(500).json({ error: err.message });
  }
}

const datiController = {
  async lista(req, res) {
    try {
      res.json(await datiService.lista());
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  crea(req, res) {
    handle(req, res, () => datiService.creaMovimento(req.body));
  },

  bulkScarico(req, res) {
    handle(req, res, () => datiService.bulkScarico(req.body));
  },

  modifica(req, res) {
    handle(req, res, () => datiService.modificaMovimento(req.params.id, req.body));
  },

  elimina(req, res) {
    handle(req, res, () => datiService.eliminaMovimento(req.params.id));
  },
};

module.exports = datiController;
