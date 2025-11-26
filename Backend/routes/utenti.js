// routes/utenti.js

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

  if (username.length < 3) {
    return res
      .status(400)
      .json({ error: "Username deve contenere almeno 3 caratteri." });
  }

  if (!isPasswordStrong(password)) {
    return res.status(400).json({
      error: "La password deve essere forte (min. 8 caratteri, maiuscola, minuscola, numero).",
    });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const createdAt = new Date().toISOString();

    db.run(
      "INSERT INTO users (username, password, createdat) VALUES (?, ?, ?)",
      [username.trim(), hashedPassword, createdAt],
      function (err) {
        if (err) {
          if (err.message.includes("UNIQUE")) {
            return res
              .status(400)
              .json({ error: "Username già esistente" });
          }
          console.error("Errore inserimento utente:", err);
          return res
            .status(500)
            .json({ error: "Errore durante la creazione utente" });
        }
        res.json({ id: this.lastID, username: username.trim() });
      }
    );
  } catch (error) {
    console.error("Errore hashing password:", error);
    res.status(500).json({ error: "Errore di sicurezza nella gestione password" });
  }
});

// PUT /api/utenti/:id - modifica utente
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { username, password } = req.body;

  if (!username && !password) {
    return res
      .status(400)
      .json({ error: "Almeno Username o Password sono obbligatori per l'aggiornamento" });
  }

  db.get("SELECT * FROM users WHERE id = ?", [id], async (err1, user) => {
    if (err1) {
      console.error("Errore recupero utente per modifica:", err1);
      return res
        .status(500)
        .json({ error: "Errore durante il recupero utente" });
    }
    if (!user) {
      return res.status(404).json({ error: "Utente non trovato" });
    }

    let newUsername = username ? username.trim() : user.username;
    let newPasswordHash = user.password;

    if (username && username.length < 3) {
      return res.status(400).json({ error: "Username deve contenere almeno 3 caratteri." });
    }

    if (password) {
      if (!isPasswordStrong(password)) {
        return res.status(400).json({
          error: "La nuova password deve essere forte (min. 8 caratteri, maiuscola, minuscola, numero).",
        });
      }
      try {
        newPasswordHash = await bcrypt.hash(password, 10);
      } catch (error) {
        console.error("Errore hashing nuova password:", error);
        return res.status(500).json({ error: "Errore di sicurezza nella gestione password" });
      }
    }

    // Verifica unicità username, se è stato cambiato
    if (newUsername !== user.username) {
      db.get(
        "SELECT id FROM users WHERE username = ? AND id != ?",
        [newUsername, id],
        (err2, existingUser) => {
          if (err2) {
            console.error("Errore verifica unicità username:", err2);
            return res
              .status(500)
              .json({ error: "Errore durante la verifica username" });
          }
          if (existingUser) {
            return res
              .status(400)
              .json({ error: "Username già in uso da un altro utente" });
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
    } else {
      // Aggiornamento solo se l'username non è cambiato o solo la password
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
      res.json({ success: true, id });
    });
  });
});

module.exports = router;