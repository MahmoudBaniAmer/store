const mongoose = require("mongoose");
const Order = require("../models/Order");
const Product = require("../models/Product");
const User = require("../models/User");
const { sendOrderConfirmation } = require("../services/emailService");

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

// Create Order
const createOrder = async (req, res) => {
    try {
        const requestedItems = Array.isArray(req.body.items)
            ? req.body.items
            : req.body.product !== undefined || req.body.quantity !== undefined
                ? [{ product: req.body.product, quantity: req.body.quantity }]
                : null;

        if (!requestedItems || requestedItems.length === 0) {
            return res.status(400).json({
                message: "At least one product and quantity are required"
            });
        }

        const aggregatedItems = new Map();
        for (const item of requestedItems) {
            if (!item?.product || !isValidId(item.product)) {
                return res.status(400).json({
                    message: "Every item must have a valid product ID"
                });
            }

            if (!Number.isInteger(item.quantity) || item.quantity < 1) {
                return res.status(400).json({
                    message: "Every item quantity must be a positive integer"
                });
            }

            const productId = item.product.toString();
            aggregatedItems.set(
                productId,
                (aggregatedItems.get(productId) || 0) + item.quantity
            );
        }

        const userId = req.token?.id;
        if (!userId || !isValidId(userId)) {
            return res.status(401).json({
                message: "Invalid user authentication"
            });
        }

        const normalizedItems = Array.from(aggregatedItems, ([product, quantity]) => ({
            product,
            quantity
        }));
        const session = await mongoose.startSession();
        let order;
        let productsById = new Map();

        try {
            await session.withTransaction(async () => {
                const products = await Product.find({
                    _id: { $in: normalizedItems.map((item) => item.product) }
                }).session(session);
                productsById = new Map(products.map((product) => [product._id.toString(), product]));

                for (const item of normalizedItems) {
                    const product = productsById.get(item.product);
                    if (!product) {
                        const error = new Error("One or more products were not found");
                        error.statusCode = 404;
                        throw error;
                    }

                    if (product.stock < item.quantity) {
                        const error = new Error(
                            `Insufficient stock for ${product.name}. Available quantity: ${product.stock}`
                        );
                        error.statusCode = 409;
                        throw error;
                    }
                }

                const updatedProducts = new Map();
                for (const item of normalizedItems) {
                    const product = await Product.findOneAndUpdate(
                        {
                            _id: item.product,
                            stock: { $gte: item.quantity }
                        },
                        {
                            $inc: { stock: -item.quantity }
                        },
                        {
                            new: true,
                            runValidators: true,
                            session
                        }
                    );

                    if (!product) {
                        const error = new Error("Insufficient stock for one or more products");
                        error.statusCode = 409;
                        throw error;
                    }

                    product.inStock = product.stock > 0;
                    await product.save({ session });
                    updatedProducts.set(product._id.toString(), product);
                }

                productsById = updatedProducts;
                [order] = await Order.create(
                    [{
                        items: normalizedItems,
                        ...(normalizedItems.length === 1 ? normalizedItems[0] : {}),
                        user: userId
                    }],
                    { session }
                );
            });
        } finally {
            await session.endSession();
        }

        let emailSent = false;
        try {
            const user = await User.findById(userId).select("name email");
            if (user && user.email) {
                await sendOrderConfirmation({
                    user,
                    order,
                    items: order.items.map((item) => ({
                        product: productsById.get(item.product.toString()),
                        quantity: item.quantity
                    }))
                });
                emailSent = true;
            }
        } catch (emailError) {
            console.error("ORDER CONFIRMATION EMAIL ERROR:", emailError.message);
        }

        return res.status(201).json({
            message: "Order created successfully",
            emailSent,
            order
        });
    } catch (error) {
        const transactionUnavailable =
            error.code === 20 ||
            /transaction numbers are only allowed|replica set|mongos/i.test(error.message);

        if (transactionUnavailable) {
            return res.status(503).json({
                message: "Atomic checkout requires MongoDB transaction support (replica set or sharded cluster)"
            });
        }

        if (error.statusCode) {
            return res.status(error.statusCode).json({
                message: error.message
            });
        }

        console.error("CREATE ORDER ERROR:", error);
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
            .populate("items.product")
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
    let responseStatus = 500;
    try {
        const { id } = req.params;

        if (!isValidId(id)) {
            return res.status(400).json({
                message: "Invalid order ID"
            });
        }

        const session = await mongoose.startSession();
        try {
            await session.withTransaction(async () => {
                const order = await Order.findById(id).session(session);

                if (!order) {
                    responseStatus = 404;
                    throw new Error("Order not found");
                }

                const userId = req.token?.id;
                const isAdmin = req.token?.role === "admin";
                const isOwner = order.user.toString() === userId;

                if (!isAdmin && !isOwner) {
                    responseStatus = 403;
                    throw new Error("You are not allowed to cancel this order");
                }

                const items = order.items?.length
                    ? order.items
                    : [{ product: order.product, quantity: order.quantity }];

                for (const item of items) {
                    const product = await Product.findById(item.product).session(session);
                    if (!product) continue;

                    product.stock += item.quantity;
                    product.inStock = product.stock > 0;
                    await product.save({ session });
                }

                await Order.deleteOne({ _id: order._id }, { session });
            });
        } finally {
            await session.endSession();
        }

        return res.status(200).json({
            message: "Order cancelled successfully"
        });
    } catch (error) {
        const transactionUnavailable =
            error.code === 20 ||
            /transaction numbers are only allowed|replica set|mongos/i.test(error.message);

        if (transactionUnavailable) {
            return res.status(503).json({
                message: "Atomic order cancellation requires MongoDB transaction support (replica set or sharded cluster)"
            });
        }

        if (responseStatus === 500) console.error("CANCEL ORDER ERROR:", error);

        return res.status(responseStatus).json({
            message: responseStatus === 500 ? "Failed to cancel order" : error.message,
            ...(responseStatus === 500 ? { error: error.message } : {})
        });
    }
};

module.exports = {
    createOrder,
    getOrders,
    cancelOrder
};