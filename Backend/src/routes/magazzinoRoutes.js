const express = require("express");
const c = require("../controllers/magazzinoController");
const { catchErrors } = require("../middleware/errorHandler");
const router = express.Router();
router.get("/valore-magazzino", catchErrors(c.valore));
router.get("/riepilogo", catchErrors(c.riepilogo));
router.get("/riepilogo/:prodottoId", catchErrors(c.riepilogoProdotto));
router.get("/storico-giacenza/:date", catchErrors(c.storico));
module.exports = router;
