const express = require("express");
const datiController = require("../controllers/datiController");
const { catchErrors } = require("../middleware/errorHandler");

const router = express.Router();

router.get("/", catchErrors(datiController.lista));
router.post("/", catchErrors(datiController.crea));
router.post("/bulk-scarico", catchErrors(datiController.bulkScarico));
router.put("/:id", catchErrors(datiController.modifica));
router.delete("/:id", catchErrors(datiController.elimina));

module.exports = router;
