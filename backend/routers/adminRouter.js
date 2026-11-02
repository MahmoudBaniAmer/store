const express = require("express");
const { getAnalytics } = require("../controllers/adminController");
const authentication = require("../middleware/authentication");
const authorization = require("../middleware/authorization");

const router = express.Router();

router.get("/analytics", authentication, authorization("admin"), getAnalytics);

module.exports = router;
