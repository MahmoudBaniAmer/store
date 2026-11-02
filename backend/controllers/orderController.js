const mongoose = require("mongoose");
const Order = require("../models/Order");
const Product = require("../models/Product");
const User = require("../models/User");
const { sendOrderConfirmation } = require("../services/emailService");

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

// Create Order
const createOrder = async (req, res) => {
    try {
        const { product, quantity } = req.body;

        if (!product || quantity === undefined) {
            return res.status(400).json({ message: "Product and quantity are required" });
        }
        if (!isValidId(product)) {
            return res.status(400).json({ message: "Invalid product ID" });
        }
        if (!Number.isInteger(quantity) || quantity < 1) {
            return res.status(400).json({ message: "Quantity must be a positive integer" });
        }

        // Atomically reserve stock to prevent ordering more than available.
        const existingProduct = await Product.findOneAndUpdate(
            { _id: product, stock: { $gte: quantity } },
            [
                { $set: { stock: { $subtract: ["$stock", quantity] } } },
                { $set: { inStock: { $gt: ["$stock", 0] } } }
            ],
            { new: true }
        );

        if (!existingProduct) {
            const productExists = await Product.exists({ _id: product });
            return res.status(productExists ? 409 : 404).json({
                message: productExists ? "Insufficient stock" : "Product not found"
            });
        }

        try {
            const order = await Order.create({
                product,
                quantity,
                user: req.token.id
            });

            // Email failure should not cancel a successfully created order.
            let emailSent = false;
            try {
                const user = await User.findById(req.token.id).select("name email");
                if (user) {
                    await sendOrderConfirmation({ user, order, product: existingProduct });
                    emailSent = true;
                }
            } catch (emailError) {
                console.error("Order confirmation email failed:", emailError.message);
            }

            return res.status(201).json({
                message: "Order created successfully",
                emailSent,
                order
            });
        } catch (error) {
            // Restore reserved stock if order creation fails.
            await Product.findByIdAndUpdate(product, {
                $inc: { stock: quantity },
                $set: { inStock: true }
            });
            throw error;
        }
    } catch (error) {
        return res.status(500).json({ message: "Failed to create order", error: error.message });
    }
};

// Admin sees all orders; customers see only their own.
const getOrders = async (req, res) => {
    try {
        const filter = req.token.role === "admin" ? {} : { user: req.token.id };
        const orders = await Order.find(filter)
            .populate("product")
            .populate("user", "name email")
            .sort({ createdAt: -1 });

        return res.status(200).json(orders);
    } catch (error) {
        return res.status(500).json({ message: "Failed to get orders", error: error.message });
    }
};

// Customer may cancel own order; admin may cancel any order.
// Restore stock when cancellation succeeds.
const cancelOrder = async (req, res) => {
    try {
        const { id } = req.params;
        if (!isValidId(id)) {
            return res.status(400).json({ message: "Invalid order ID" });
        }

        const order = await Order.findById(id);
        if (!order) return res.status(404).json({ message: "Order not found" });

        const isAdmin = req.token.role === "admin";
        const isOwner = order.user.toString() === req.token.id;
        if (!isAdmin && !isOwner) {
            return res.status(403).json({ message: "You are not allowed to cancel this order" });
        }

        await Order.findByIdAndDelete(id);
        await Product.findByIdAndUpdate(order.product, {
            $inc: { stock: order.quantity },
            $set: { inStock: true }
        });

        return res.status(200).json({ message: "Order cancelled successfully" });
    } catch (error) {
        return res.status(500).json({ message: "Failed to cancel order", error: error.message });
    }
};

module.exports = { createOrder, getOrders, cancelOrder };
