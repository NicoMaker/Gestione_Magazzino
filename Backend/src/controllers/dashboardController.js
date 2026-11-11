const dashboardService = require("../services/dashboardService");

module.exports = {
  async panoramica(req, res) {
    res.json(await dashboardService.panoramica());
  },
};
