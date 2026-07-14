// Controller movimenti (dati): traduce HTTP ⇄ movimentiService
const movimentiService = require("../services/movimentiService");

const datiController = {
  async lista(req, res) {
    res.json(await movimentiService.lista());
  },

  async crea(req, res) {
    res.json(await movimentiService.crea(req.body));
  },

  async bulkScarico(req, res) {
    res.json(await movimentiService.bulkScarico(req.body));
  },

  async modifica(req, res) {
    res.json(await movimentiService.modifica(req.params.id, req.body));
  },

  async elimina(req, res) {
    res.json(await movimentiService.elimina(req.params.id));
  },
};

module.exports = datiController;
