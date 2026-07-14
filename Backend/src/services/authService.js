// Service autenticazione: verifica credenziali
const bcrypt = require("bcrypt");
const repo = require("../repositories/utentiRepository");
const { HttpError } = require("../middleware/errorHandler");

const authService = {
  async login(username, password) {
    if (!username || !password)
      throw new HttpError(400, "Username e password obbligatori");

    const user = await repo.trovaPerUsername(username);
    if (!user) throw new HttpError(401, "Credenziali non valide");

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) throw new HttpError(401, "Credenziali non valide");

    return {
      success: true,
      message: "Login effettuato con successo",
      username: user.username,
    };
  },
};

module.exports = authService;
