const magazzinoService = require("../services/magazzinoService");

module.exports = {
  async valore(req, res) { res.json(await magazzinoService.valoreMagazzino()); },
  async riepilogo(req, res) { res.json(await magazzinoService.riepilogo()); },
  async riepilogoProdotto(req, res) { res.json(await magazzinoService.lottiProdotto(req.params.prodottoId)); },
  async storico(req, res) { res.json(await magazzinoService.storicoGiacenza(req.params.date)); },
};
