const marcheService = require("../services/marcheService");

module.exports = {
  async lista(req, res) { res.json(await marcheService.lista()); },
  async crea(req, res) { res.json(await marcheService.crea(req.body.nome)); },
  async aggiorna(req, res) { res.json(await marcheService.aggiorna(req.params.id, req.body.nome)); },
  async elimina(req, res) { res.json(await marcheService.elimina(req.params.id)); },
};
