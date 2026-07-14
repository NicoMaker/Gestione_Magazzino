const authService = require("../services/authService");

module.exports = {
  async login(req, res) {
    const { username, password } = req.body;
    res.json(await authService.login(username, password));
  },
};
