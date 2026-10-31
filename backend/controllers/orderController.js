
const Order = require("../models/Order");

// Create Order
const createOrder = async (req, res) => {
    try {
        const { product, quantity } = req.body;

        // 1. Check required fields
        if (!product || quantity === undefined) {
            return res.status(400).json({
                message: "Product and quantity are required"
            });
        }

        // 2. Check quantity
        if (!Number.isInteger(quantity) || quantity < 1) {
            return res.status(400).json({
                message: "Quantity must be a positive integer"
            });
        }

        // 3. Check if product exists
        const Product = require("../models/Product");
        const existingProduct = await Product.findById(product);

        if (!existingProduct) {
            return res.status(404).json({
                message: "Product not found"
            });
        }

        // 4. Create order
        const order = new Order({
            product,
            quantity,
            user: req.token.id
        });

        await order.save();

        res.status(201).json(order);
    } catch (error) {
        res.status(400).json({
            message: error.message
        });
    }
};
// Get Orders
const getOrders = async (req, res) => {
    try {
        let orders;

        // Admin can see all orders
        if (req.token.role === "admin") {
            orders = await Order.find()
                .populate("product")
                .populate("user", "name email");
        } else {
            // Normal user can see only their own orders
            orders = await Order.find({
                user: req.token.id
            })
                .populate("product")
                .populate("user", "name email");
        }

        res.status(200).json(orders);
    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
};
// Cancel Order
const cancelOrder = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);

        // Check if order exists
        if (!order) {
            return res.status(404).json({
                message: "Order not found"
            });
        }

        // User can cancel only their own order
        if (
            req.token.role !== "admin" &&
            order.user.toString() !== req.token.id
        ) {
            return res.status(403).json({
                message: "You are not allowed to cancel this order"
            });
        }

        await Order.findByIdAndDelete(req.params.id);

        res.status(200).json({
            message: "Order cancelled successfully"
        });
    } catch (error) {
        res.status(400).json({
            message: error.message
        });
    }
};
module.exports = { createOrder, getOrders, cancelOrder };