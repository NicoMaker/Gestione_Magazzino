const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const { db } = require("../db/init");

// Controllo forza password:
// - minimo 8 caratteri
// - almeno una minuscola
// - almeno una maiuscola
// - almeno un numero
function isPasswordStrong(password) {
  if (typeof password !== "string") return false;
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  return regex.test(password);
}

// GET /api/utenti - lista utenti (senza password)
router.get("/", (req, res) => {
  db.all(
    "SELECT id, username FROM users ORDER BY username ASC",
    [],
    (err, rows) => {
      if (err) {
        console.error("Errore nel recupero utenti:", err);
        return res
          .status(500)
          .json({ error: "Errore nel recupero utenti" });
      }
      res.json(rows);
    }
  );
});

// POST /api/utenti - crea nuovo utente
router.post("/", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res
      .status(400)
      .json({ error: "Username e password obbligatori" });
  }

  if (!isPasswordStrong(password)) {
    return res.status(400).json({
      error:
        "Password troppo debole. Deve avere almeno 8 caratteri, una maiuscola, una minuscola e un numero",
    });
  }

  db.get(
    "SELECT id FROM users WHERE username = ?",
    [username],
    async (err, existing) => {
      if (err) {
        console.error("Errore controllo utente:", err);
        return res
          .status(500)
          .json({ error: "Errore nel controllo utente" });
      }
      if (existing) {
        return res
          .status(400)
          .json({ error: "Username già esistente, scegline un altro" });
      }

      try {
        const hash = await bcrypt.hash(password, 10);
        const createdAt = new Date().toISOString();

        db.run(
          "INSERT INTO users (username, password, createdat) VALUES (?, ?, ?)",
          [username, hash, createdAt],
          function (err2) {
            if (err2) {
              console.error("Errore creazione utente:", err2);
              return res
                .status(500)
                .json({ error: "Errore durante la creazione utente" });
            }
            res.status(201).json({
              id: this.lastID,
              username,
            });
          }
        );
      } catch (e) {
        console.error("Errore hash password:", e);
        return res
          .status(500)
          .json({ error: "Errore durante l'hash della password" });
      }
    }
  );
});

// PUT /api/utenti/:id - modifica username e/o password
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { username, password } = req.body;

  if (!username && !password) {
    return res.status(400).json({ error: "Nessun dato da aggiornare" });
  }

  db.get("SELECT * FROM users WHERE id = ?", [id], async (err, user) => {
    if (err) {
      console.error("Errore recupero utente:", err);
      return res.status(500).json({ error: "Errore nel recupero utente" });
    }
    if (!user) {
      return res.status(404).json({ error: "Utente non trovato" });
    }

    const newUsername = username || user.username;

    // blocca username duplicato
    db.get(
      "SELECT id FROM users WHERE username = ? AND id <> ?",
      [newUsername, id],
      async (err2, existing) => {
        if (err2) {
          console.error("Errore controllo username:", err2);
          return res
            .status(500)
            .json({ error: "Errore nel controllo username" });
        }
        if (existing) {
          return res
            .status(400)
            .json({ error: "Username già usato da un altro utente" });
        }

        let newPasswordHash = user.password;
        if (password && password.trim() !== "") {
          if (!isPasswordStrong(password)) {
            return res.status(400).json({
              error:
                "Password troppo debole. Deve avere almeno 8 caratteri, una maiuscola, una minuscola e un numero",
            });
          }

          try {
            newPasswordHash = await bcrypt.hash(password, 10);
          } catch (e) {
            console.error("Errore hash password:", e);
            return res
              .status(500)
              .json({ error: "Errore durante l'hash della password" });
          }
        }

        db.run(
          "UPDATE users SET username = ?, password = ? WHERE id = ?",
          [newUsername, newPasswordHash, id],
          function (err3) {
            if (err3) {
              console.error("Errore aggiornamento utente:", err3);
              return res
                .status(500)
                .json({ error: "Errore durante l'aggiornamento utente" });
            }
            res.json({ id, username: newUsername });
          }
        );
      }
    );
  });
});

// DELETE /api/utenti/:id - elimina utente (ma non se è l'unico)
router.delete("/:id", (req, res) => {
  const { id } = req.params;

  db.get("SELECT COUNT(*) AS total FROM users", [], (err, row) => {
    if (err) {
      console.error("Errore conteggio utenti:", err);
      return res
        .status(500)
        .json({ error: "Errore nel conteggio utenti" });
    }

    if (row.total <= 1) {
      return res.status(400).json({
        error: "Non puoi eliminare l'unico utente rimasto",
      });
    }

    db.run("DELETE FROM users WHERE id = ?", [id], function (err2) {
      if (err2) {
        console.error("Errore eliminazione utente:", err2);
        return res
          .status(500)
          .json({ error: "Errore durante l'eliminazione utente" });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: "Utente non trovato" });
      }
      res.json({ success: true, message: "Utente eliminato con successo" });
    });
  });
});

module.exports = router;
