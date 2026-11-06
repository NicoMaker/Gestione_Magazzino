const express = require("express");
const c = require("../controllers/utentiController");
const { catchErrors } = require("../middleware/errorHandler");
const router = express.Router();
router.get("/", catchErrors(c.lista));
router.post("/", catchErrors(c.crea));
router.put("/:id", catchErrors(c.aggiorna));
router.delete("/:id", catchErrors(c.elimina));
module.exports = router;
