const mongoose = require("mongoose");
const Order = require("../models/Order");
const Product = require("../models/Product");
const User = require("../models/User");
const { sendOrderConfirmation } = require("../services/emailService");
const { createOrderRequestHash, isValidIdempotencyKey } = require("../utils/orderIdempotency");

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

function getPublicOrder(order) {
    const publicOrder = order.toObject();
    delete publicOrder.idempotencyKey;
    delete publicOrder.idempotencyHash;
    return publicOrder;
}

// Create Order
const createOrder = async (req, res) => {
    let userId;
    let idempotencyKey;
    let idempotencyHash;
    try {
        idempotencyKey = req.get("Idempotency-Key");
        if (idempotencyKey !== undefined && !isValidIdempotencyKey(idempotencyKey)) {
            return res.status(400).json({
                message: "Idempotency-Key must be a UUID v4 value"
            });
        }

        const deliveryLocation = req.body.deliveryLocation;
        if (deliveryLocation !== undefined && deliveryLocation !== null) {
            const { lat, lng } = deliveryLocation;
            if (
                typeof lat !== "number" ||
                !Number.isFinite(lat) ||
                lat < -90 ||
                lat > 90 ||
                typeof lng !== "number" ||
                !Number.isFinite(lng) ||
                lng < -180 ||
                lng > 180
            ) {
                return res.status(400).json({
                    message: "Delivery coordinates are invalid"
                });
            }
        }

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

        userId = req.token?.id;
        if (!userId || !isValidId(userId)) {
            return res.status(401).json({
                message: "Invalid user authentication"
            });
        }

        const normalizedItems = Array.from(aggregatedItems, ([product, quantity]) => ({
            product,
            quantity
        }));
        if (idempotencyKey) {
            idempotencyHash = createOrderRequestHash(normalizedItems, deliveryLocation);
            const existingOrder = await Order.findOne({ user: userId, idempotencyKey })
                .select("+idempotencyHash");
            if (existingOrder) {
                if (existingOrder.idempotencyHash !== idempotencyHash) {
                    return res.status(409).json({
                        message: "This checkout key was already used for a different order"
                    });
                }

                return res.status(200).json({
                    message: "Order was already processed",
                    replayed: true,
                    order: getPublicOrder(existingOrder)
                });
            }
        }

        const session = await mongoose.startSession();
        let order;
        let productsById = new Map();

        try {
            await session.withTransaction(async () => {
                const products = await Product.find({
                    _id: { $in: normalizedItems.map((item) => item.product) },
                    isActive: { $ne: false }
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
                        items: normalizedItems.map((item) => {
                            const product = productsById.get(item.product);
                            return {
                                ...item,
                                productName: product.name,
                                unitPrice: product.price
                            };
                        }),
                        ...(normalizedItems.length === 1 ? normalizedItems[0] : {}),
                        user: userId,
                        ...(idempotencyKey ? { idempotencyKey, idempotencyHash } : {}),
                        ...(deliveryLocation ? { deliveryLocation } : {})
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
            console.error("ORDER CONFIRMATION EMAIL ERROR:", emailError.name);
        }

        return res.status(201).json({
            message: "Order created successfully",
            emailSent,
            replayed: false,
            order: getPublicOrder(order)
        });
    } catch (error) {
        if (error.code === 11000 && idempotencyKey && userId) {
            const existingOrder = await Order.findOne({ user: userId, idempotencyKey })
                .select("+idempotencyHash");
            if (existingOrder) {
                if (existingOrder.idempotencyHash !== idempotencyHash) {
                    return res.status(409).json({
                        message: "This checkout key was already used for a different order"
                    });
                }

                return res.status(200).json({
                    message: "Order was already processed",
                    replayed: true,
                    order: getPublicOrder(existingOrder)
                });
            }
        }

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

        console.error("CREATE ORDER ERROR:", error.name);
        return res.status(500).json({
            message: "Failed to create order"
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
        console.error("GET ORDERS ERROR:", error.name);

        return res.status(500).json({
            message: "Failed to get orders"
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

                if (["shipped", "delivered"].includes(order.status)) {
                    responseStatus = 409;
                    throw new Error("Shipped or delivered orders cannot be cancelled");
                }

                if (order.status === "cancelled") {
                    responseStatus = 409;
                    throw new Error("This order has already been cancelled");
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

                order.status = "cancelled";
                await order.save({ session });
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

        if (responseStatus === 500) console.error("CANCEL ORDER ERROR:", error.name);

        return res.status(responseStatus).json({
            message: responseStatus === 500 ? "Failed to cancel order" : error.message
        });
    }
};

const updateOrderStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!isValidId(id)) {
            return res.status(400).json({ message: "Invalid order ID" });
        }

        if (!Order.schema.path("status").enumValues.includes(status)) {
            return res.status(400).json({
                message: "Status must be pending, processing, shipped, or delivered"
            });
        }

        if (status === "cancelled") {
            return res.status(400).json({
                message: "Use the cancellation action to cancel an order"
            });
        }

        const existingOrder = await Order.findById(id).select("status");
        if (!existingOrder) {
            return res.status(404).json({ message: "Order not found" });
        }
        if (existingOrder.status === "cancelled") {
            return res.status(409).json({ message: "Cancelled orders cannot be updated" });
        }

        const order = await Order.findByIdAndUpdate(
            id,
            { status },
            { new: true, runValidators: true }
        )
            .populate("product")
            .populate("items.product")
            .populate("user", "name email");

        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        return res.status(200).json({
            message: "Order status updated successfully",
            order
        });
    } catch (error) {
        console.error("UPDATE ORDER STATUS ERROR:", error.name);
        return res.status(500).json({ message: "Failed to update order status" });
    }
};

module.exports = {
    createOrder,
    getOrders,
    cancelOrder,
    updateOrderStatus
};