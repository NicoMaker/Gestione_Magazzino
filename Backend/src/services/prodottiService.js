// Service prodotti: validazione, giacenza, blocco eliminazione, eventi
const repo = require("../repositories/prodottiRepository");
const { transaction } = require("../config/database");
const realtime = require("../realtime/socket");
const { HttpError } = require("../middleware/errorHandler");
const { formatDecimal, formatQtaIT } = require("../utils/decimal");

const prodottiService = {
  async lista() {
    const rows = await repo.listaConGiacenza();
    return rows.map((row) => ({ ...row, giacenza: formatDecimal(row.giacenza) }));
  },

  async crea({ nome, marca_id, descrizione }) {
    if (!nome || !nome.trim()) throw new HttpError(400, "Nome prodotto obbligatorio");
    const data_creazione = new Date().toISOString();
    let result;
    try {
      result = await repo.crea(nome.trim(), marca_id || null, descrizione || null, data_creazione);
    } catch (err) {
      if (String(err.message).includes("UNIQUE"))
        throw new HttpError(400, "Prodotto già esistente");
      throw err;
    }
    const row = await repo.trovaConMarca(result.lastID);
    realtime.emit("prodotto_aggiunto");
    realtime.emit("prodotti_aggiornati");
    return { ...row, giacenza: formatDecimal(0) };
  },

  async aggiorna(id, { nome, marca_id, descrizione }) {
    if (!nome || !nome.trim()) throw new HttpError(400, "Nome prodotto obbligatorio");
    let result;
    try {
      result = await repo.aggiorna(id, nome.trim(), marca_id || null, descrizione || null);
    } catch (err) {
      if (String(err.message).includes("UNIQUE"))
        throw new HttpError(400, "Prodotto già esistente");
      throw err;
    }
    if (result.changes === 0) throw new HttpError(404, "Prodotto non trovato");
    realtime.emit("prodotto_modificato", { id });
    realtime.emit("prodotti_aggiornati");
    realtime.emit("magazzino_aggiornato");
    return { success: true };
  },

  async elimina(id) {
    const result = await transaction(async () => {
      const giacenza = formatDecimal(await repo.giacenza(id));
      if (giacenza > 0) {
        const pezzoLabel = giacenza === 1 ? "pezzo" : "pezzi";
        throw new HttpError(
          400,
          `Impossibile eliminare: giacenza residua di ${formatQtaIT(giacenza)} ${pezzoLabel}.`,
        );
      }
      const movimenti = await repo.contaMovimenti(id);
      if (movimenti > 0) {
        throw new HttpError(
          400,
          `Impossibile eliminare: esistono ${movimenti} movimenti collegati a questo prodotto.`,
        );
      }
      await repo.eliminaLottiVuoti(id);
      const del = await repo.elimina(id);
      if (del.changes === 0) throw new HttpError(404, "Prodotto non trovato");
      return { success: true, message: "Prodotto eliminato con successo" };
    });

    realtime.emit("prodotto_eliminato", { id });
    realtime.emit("prodotti_aggiornati");
    return result;
  },
};

module.exports = prodottiService;
