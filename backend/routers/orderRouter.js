const express = require("express");
const router = express.Router();

const {
    createOrder,
    getOrders,
    cancelOrder
} = require("../controllers/orderController");

const authentication = require("../middleware/authentication");

// Logged-in users can create orders
router.post("/", authentication, createOrder);

// Admin can view all orders, users can view their own
router.get("/", authentication, getOrders);

// Users can cancel their own orders, Admin can cancel any order
router.delete("/:id", authentication, cancelOrder);

module.exports = router;