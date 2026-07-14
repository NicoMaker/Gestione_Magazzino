const utentiService = require("../services/utentiService");

module.exports = {
  async lista(req, res) { res.json(await utentiService.lista()); },
  async crea(req, res) { res.json(await utentiService.crea(req.body)); },
  async aggiorna(req, res) { res.json(await utentiService.aggiorna(req.params.id, req.body)); },
  async elimina(req, res) { res.json(await utentiService.elimina(req.params.id, req.query.current_user)); },
};
