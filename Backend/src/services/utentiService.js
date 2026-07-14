// Service utenti: validazione password, unicità, ultimo utente, flag "utente corrente"
const bcrypt = require("bcrypt");
const repo = require("../repositories/utentiRepository");
const realtime = require("../realtime/socket");
const { HttpError } = require("../middleware/errorHandler");

function isPasswordStrong(password) {
  if (typeof password !== "string") return false;
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(password);
}

const utentiService = {
  lista() {
    return repo.lista();
  },

  async crea({ username, password }) {
    if (!username || !password)
      throw new HttpError(400, "Username e password obbligatori");
    if (username.length < 3)
      throw new HttpError(400, "Username deve contenere almeno 3 caratteri.");
    if (!isPasswordStrong(password))
      throw new HttpError(
        400,
        "La password deve essere forte (min. 8 caratteri, maiuscola, minuscola, numero).",
      );

    const hashedPassword = await bcrypt.hash(password, 10);
    let result;
    try {
      result = await repo.crea(username.trim(), hashedPassword, new Date().toISOString());
    } catch (err) {
      if (String(err.message).includes("UNIQUE"))
        throw new HttpError(400, "Username già esistente");
      throw err;
    }
    realtime.emit("utente_aggiunto");
    realtime.emit("utenti_aggiornati");
    return { id: result.lastID, username: username.trim() };
  },

  async aggiorna(id, { username, password, current_user }) {
    if (!username && !password)
      throw new HttpError(
        400,
        "Almeno Username o Password sono obbligatori per l'aggiornamento",
      );

    const user = await repo.trovaPerId(id);
    if (!user) throw new HttpError(404, "Utente non trovato");

    const isCurrentUser = user.username === current_user;
    const newUsername = username ? username.trim() : user.username;
    let newPasswordHash = user.password;

    if (username && username.length < 3)
      throw new HttpError(400, "Username deve contenere almeno 3 caratteri.");

    if (password) {
      if (!isPasswordStrong(password))
        throw new HttpError(
          400,
          "La nuova password deve essere forte (min. 8 caratteri, maiuscola, minuscola, numero).",
        );
      newPasswordHash = await bcrypt.hash(password, 10);
    }

    const usernameCambiato = newUsername !== user.username;
    if (usernameCambiato) {
      const esistente = await repo.trovaPerUsernameEsclusoId(newUsername, id);
      if (esistente)
        throw new HttpError(400, "Username già in uso da un altro utente");
    }

    await repo.aggiorna(id, newUsername, newPasswordHash);

    realtime.emit("utente_modificato", {
      id,
      oldUsername: user.username,
      newUsername: usernameCambiato ? newUsername : user.username,
    });
    realtime.emit("utenti_aggiornati");

    // Mantiene la stessa forma di risposta dell'originale
    if (usernameCambiato) {
      return { id, username: newUsername, username_modificato: isCurrentUser };
    }
    return {
      id,
      username: newUsername,
      password_modificata: !!(isCurrentUser && password),
    };
  },

  async elimina(id, currentUser) {
    if ((await repo.conta()) <= 1)
      throw new HttpError(400, "Non puoi eliminare l'unico utente rimasto");

    const user = await repo.trovaPerId(id);
    if (!user) throw new HttpError(404, "Utente non trovato");

    const isCurrentUser = user.username === currentUser;
    const result = await repo.elimina(id);
    if (result.changes === 0) throw new HttpError(404, "Utente non trovato");

    realtime.emit("utente_eliminato", { id, username: user.username });
    realtime.emit("utenti_aggiornati");
    return { success: true, id, utente_eliminato: isCurrentUser };
  },
};

module.exports = utentiService;
