
const express = require("express");
const router = express.Router();

const {
    createOrder,
    getOrders
} = require("../controllers/orderController");

const authentication = require("../middleware/authentication");
const authorization = require("../middleware/authorization");

// Protected Routes
router.post("/", authentication, createOrder);
router.get("/", authentication, authorization("admin"), getOrders);

module.exports = router;
