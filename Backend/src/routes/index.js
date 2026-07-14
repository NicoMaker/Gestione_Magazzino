// Aggregatore delle route API
const express = require("express");
const router = express.Router();

router.use("/admin", require("./downloadRoutes"));
router.use("/auth", require("./authRoutes"));
router.use("/marche", require("./marcheRoutes"));
router.use("/prodotti", require("./prodottiRoutes"));
router.use("/dati", require("./datiRoutes"));
router.use("/magazzino", require("./magazzinoRoutes"));
router.use("/utenti", require("./utentiRoutes"));

module.exports = router;
