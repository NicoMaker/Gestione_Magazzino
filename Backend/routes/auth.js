// routes/auth.js

const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const { db } = require("../db/init");

// POST - Login
router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Username e password obbligatori" });
  }

  db.get(
    "SELECT * FROM users WHERE username = ?",
    [username],
    async (err, user) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (!user) {
        return res.status(401).json({ error: "Credenziali non valide" });
      }

      try {
        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
          return res.status(401).json({ error: "Credenziali non valide" });
        }

        // Login riuscito
        res.json({
          success: true,
          message: "Login effettuato con successo",
          username: user.username,
        });
      } catch (error) {
        res
          .status(500)
          .json({ error: "Errore durante la verifica della password" });
      }
    }
  );
});

module.exports = router;
