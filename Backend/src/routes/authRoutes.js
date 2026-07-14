const express = require("express");
const authController = require("../controllers/authController");
const { catchErrors } = require("../middleware/errorHandler");
const router = express.Router();
router.post("/login", catchErrors(authController.login));
module.exports = router;
