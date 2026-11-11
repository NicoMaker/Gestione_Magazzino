const express = require("express");
const c = require("../controllers/dashboardController");
const { catchErrors } = require("../middleware/errorHandler");
const router = express.Router();
router.get("/", catchErrors(c.panoramica));
module.exports = router;
