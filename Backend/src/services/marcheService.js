// Service marche: validazione, blocco eliminazione con prodotti collegati, eventi
const repo = require("../repositories/marcheRepository");
const realtime = require("../realtime/socket");
const { HttpError } = require("../middleware/errorHandler");

const marcheService = {
  lista() {
    return repo.listaConConteggio();
  },

  async crea(nome) {
    if (!nome || !nome.trim()) throw new HttpError(400, "Nome marca obbligatorio");
    const data_creazione = new Date().toISOString();
    let result;
    try {
      result = await repo.crea(nome.trim(), data_creazione);
    } catch (err) {
      if (String(err.message).includes("UNIQUE"))
        throw new HttpError(400, "Marca già esistente");
      throw err;
    }
    realtime.emit("marca_aggiunta");
    realtime.emit("marche_aggiornate");
    return { id: result.lastID, nome: nome.trim(), data_creazione, prodotti_count: 0 };
  },

  async aggiorna(id, nome) {
    if (!nome || !nome.trim()) throw new HttpError(400, "Nome marca obbligatorio");
    let result;
    try {
      result = await repo.aggiorna(id, nome.trim());
    } catch (err) {
      if (String(err.message).includes("UNIQUE"))
        throw new HttpError(400, "Marca già esistente");
      throw err;
    }
    if (result.changes === 0) throw new HttpError(404, "Marca non trovata");
    realtime.emit("marca_modificata", { id });
    realtime.emit("marche_aggiornate");
    realtime.emit("prodotti_aggiornati");
    return { success: true, nome: nome.trim() };
  },

  async elimina(id) {
    const prodottiCount = await repo.contaProdotti(id);
    if (prodottiCount > 0) {
      throw new HttpError(
        400,
        prodottiCount === 1
          ? "Impossibile eliminare: c'è 1 prodotto collegato a questa marca."
          : `Impossibile eliminare: ci sono ${prodottiCount} prodotti collegati a questa marca.`,
      );
    }
    const result = await repo.elimina(id);
    if (result.changes === 0) throw new HttpError(404, "Marca non trovata");
    realtime.emit("marca_eliminata", { id });
    realtime.emit("marche_aggiornate");
    return { success: true, message: "Marca eliminata con successo" };
  },
};

module.exports = marcheService;
