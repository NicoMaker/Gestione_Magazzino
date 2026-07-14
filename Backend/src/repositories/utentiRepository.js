// Repository utenti
const { dbGet, dbAll, dbRun } = require("../config/database");

const utentiRepository = {
  lista() {
    return dbAll(
      "SELECT id, username FROM users ORDER BY username COLLATE NOCASE, username",
    );
  },

  trovaPerId(id) {
    return dbGet("SELECT * FROM users WHERE id = ?", [id]);
  },

  trovaPerUsername(username) {
    return dbGet("SELECT * FROM users WHERE username = ?", [username]);
  },

  trovaPerUsernameEsclusoId(username, id) {
    return dbGet("SELECT id FROM users WHERE username = ? AND id != ?", [
      username,
      id,
    ]);
  },

  crea(username, hashedPassword, createdAt) {
    return dbRun(
      "INSERT INTO users (username, password, createdat) VALUES (?, ?, ?)",
      [username, hashedPassword, createdAt],
    );
  },

  aggiorna(id, username, hashedPassword) {
    return dbRun("UPDATE users SET username = ?, password = ? WHERE id = ?", [
      username,
      hashedPassword,
      id,
    ]);
  },

  elimina(id) {
    return dbRun("DELETE FROM users WHERE id = ?", [id]);
  },

  async conta() {
    const row = await dbGet("SELECT COUNT(*) AS total FROM users");
    return row.total;
  },
};

module.exports = utentiRepository;
