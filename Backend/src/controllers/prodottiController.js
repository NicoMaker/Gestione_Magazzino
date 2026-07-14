const prodottiService = require("../services/prodottiService");

module.exports = {
  async lista(req, res) { res.json(await prodottiService.lista()); },
  async crea(req, res) { res.json(await prodottiService.crea(req.body)); },
  async aggiorna(req, res) { res.json(await prodottiService.aggiorna(req.params.id, req.body)); },
  async elimina(req, res) { res.json(await prodottiService.elimina(req.params.id)); },
};
