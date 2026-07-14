// routes/dati.js — movimenti con vincoli su lotti (FIFO). Solo mapping URL → controller.
const express = require("express");
const router = express.Router();
const datiController = require("../controllers/datiController");

router.get("/", datiController.lista);
router.post("/", datiController.crea);
router.post("/bulk-scarico", datiController.bulkScarico);
router.put("/:id", datiController.modifica);
router.delete("/:id", datiController.elimina);

module.exports = router;
