const mongoose = require("mongoose");
const Order = require("../models/Order");
const Product = require("../models/Product");
const User = require("../models/User");
const { sendOrderConfirmation } = require("../services/emailService");

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

// Create Order
const createOrder = async (req, res) => {
    let reservedProductId = null;
    let reservedQuantity = 0;

    try {
        const { product, quantity } = req.body;

        // Validate request body
        if (!product || quantity === undefined) {
            return res.status(400).json({
                message: "Product and quantity are required"
            });
        }

        if (!isValidId(product)) {
            return res.status(400).json({
                message: "Invalid product ID"
            });
        }

        if (!Number.isInteger(quantity) || quantity < 1) {
            return res.status(400).json({
                message: "Quantity must be a positive integer"
            });
        }

        // Make sure the authenticated user ID exists
        const userId = req.token?.id;

        if (!userId || !isValidId(userId)) {
            return res.status(401).json({
                message: "Invalid user authentication"
            });
        }

        // Check product existence
        const productExists = await Product.findById(product);

        if (!productExists) {
            return res.status(404).json({
                message: "Product not found"
            });
        }

        // Check available stock
        if (productExists.stock < quantity) {
            return res.status(409).json({
                message: `Insufficient stock. Available quantity: ${productExists.stock}`
            });
        }

        // Reserve stock using a simple atomic update
        const updatedProduct = await Product.findOneAndUpdate(
            {
                _id: product,
                stock: { $gte: quantity }
            },
            {
                $inc: { stock: -quantity }
            },
            {
                new: true,
                runValidators: true
            }
        );

        if (!updatedProduct) {
            return res.status(409).json({
                message: "Insufficient stock"
            });
        }

        // Update inStock according to the remaining stock
        updatedProduct.inStock = updatedProduct.stock > 0;
        await updatedProduct.save();

        reservedProductId = product;
        reservedQuantity = quantity;

        // Create order
        const order = await Order.create({
            product,
            quantity,
            user: userId
        });

        // Send confirmation email, but do not fail the order if email fails
        let emailSent = false;

        try {
            const user = await User.findById(userId).select("name email");

            if (user && user.email) {
                await sendOrderConfirmation({
                    user,
                    order,
                    product: updatedProduct
                });

                emailSent = true;
            }
        } catch (emailError) {
            console.error(
                "ORDER CONFIRMATION EMAIL ERROR:",
                emailError.message
            );
        }

        return res.status(201).json({
            message: "Order created successfully",
            emailSent,
            order
        });

    } catch (error) {
        console.error("CREATE ORDER ERROR:", error);

        // Restore reserved stock if order creation failed
        if (reservedProductId && reservedQuantity > 0) {
            try {
                const restoredProduct = await Product.findByIdAndUpdate(
                    reservedProductId,
                    {
                        $inc: { stock: reservedQuantity }
                    },
                    { new: true }
                );

                if (restoredProduct) {
                    restoredProduct.inStock = restoredProduct.stock > 0;
                    await restoredProduct.save();
                }
            } catch (restoreError) {
                console.error(
                    "STOCK RESTORE ERROR:",
                    restoreError.message
                );
            }
        }

        return res.status(500).json({
            message: "Failed to create order",
            error: error.message
        });
    }
};

// Get orders
// Admin sees all orders; customers see only their own.
const getOrders = async (req, res) => {
    try {
        const userId = req.token?.id;

        if (!userId) {
            return res.status(401).json({
                message: "Invalid user authentication"
            });
        }

        const filter =
            req.token.role === "admin"
                ? {}
                : { user: userId };

        const orders = await Order.find(filter)
            .populate("product")
            .populate("user", "name email")
            .sort({ createdAt: -1 });

        return res.status(200).json(orders);

    } catch (error) {
        console.error("GET ORDERS ERROR:", error);

        return res.status(500).json({
            message: "Failed to get orders",
            error: error.message
        });
    }
};

// Cancel order
// Customers can cancel their own orders; admins can cancel any order.
const cancelOrder = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidId(id)) {
            return res.status(400).json({
                message: "Invalid order ID"
            });
        }

        const order = await Order.findById(id);

        if (!order) {
            return res.status(404).json({
                message: "Order not found"
            });
        }

        const userId = req.token?.id;
        const isAdmin = req.token.role === "admin";
        const isOwner = order.user.toString() === userId;

        if (!isAdmin && !isOwner) {
            return res.status(403).json({
                message: "You are not allowed to cancel this order"
            });
        }

        // Restore product stock before deleting the order
        const product = await Product.findByIdAndUpdate(
            order.product,
            {
                $inc: { stock: order.quantity }
            },
            { new: true }
        );

        if (product) {
            product.inStock = product.stock > 0;
            await product.save();
        }

        await Order.findByIdAndDelete(id);

        return res.status(200).json({
            message: "Order cancelled successfully"
        });

    } catch (error) {
        console.error("CANCEL ORDER ERROR:", error);

        return res.status(500).json({
            message: "Failed to cancel order",
            error: error.message
        });
    }
};

module.exports = {
    createOrder,
    getOrders,
    cancelOrder
};