// routes/avvioHtml.js

const express = require("express");
const path = require("path");
const router = express.Router();

// ========================================
// 🏠 SERVE INDEX.HTML PER TUTTE LE ROUTE NON-API (SPA)
// ========================================
router.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../../frontend", "index.html"));
});

module.exports = router;
