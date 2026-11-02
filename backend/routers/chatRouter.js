const express = require("express");
const { rateLimit } = require("express-rate-limit");
const { chat } = require("../controllers/chatController");

const router = express.Router();
const chatRateLimit = rateLimit({
    windowMs: 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many assistant requests. Please try again in a minute." }
});

router.post("/", chatRateLimit, chat);

module.exports = router;
