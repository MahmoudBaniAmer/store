const mongoose = require("mongoose");
const Order = require("../models/Order");
const Product = require("../models/Product");
const User = require("../models/User");
const { sendOrderConfirmation } = require("../services/emailService");
const { createOrderRequestHash, isValidIdempotencyKey } = require("../utils/orderIdempotency");
const {
    adjustProductStock,
    reserveOrderStock,
    rollbackReservedStock,
    restockCancelledItems
} = require("../utils/standaloneInventory");

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

        const products = await Product.find({
            _id: { $in: normalizedItems.map((item) => item.product) },
            isActive: { $ne: false }
        });
        const availableProducts = new Map(products.map((product) => [product._id.toString(), product]));

        for (const item of normalizedItems) {
            const product = availableProducts.get(item.product);
            if (!product) {
                return res.status(404).json({
                    message: "One or more products were not found"
                });
            }
            if (product.stock < item.quantity) {
                return res.status(409).json({
                    message: `Insufficient stock for ${product.name}. Available quantity: ${product.stock}`
                });
            }
        }

        const { productsById, reservedItems } = await reserveOrderStock(normalizedItems, Product);
        let order;
        try {
            [order] = await Order.create([{
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
            }]);
        } catch (error) {
            const rollbackFailures = await rollbackReservedStock(
                reservedItems,
                (productId, quantity) => adjustProductStock(Product, productId, quantity)
            );
            if (rollbackFailures.length > 0) {
                error.inventoryRollbackFailed = true;
            }
            throw error;
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
        if (error.inventoryRollbackFailed) {
            return res.status(503).json({
                message: "Checkout could not finish and inventory restoration needs attention. Do not retry this order; contact store support."
            });
        }

        if (error.code === 11000 && idempotencyKey && userId) {
            let existingOrder;
            try {
                existingOrder = await Order.findOne({ user: userId, idempotencyKey })
                    .select("+idempotencyHash");
            } catch (lookupError) {
                console.error("CHECKOUT RETRY LOOKUP ERROR:", lookupError.name);
            }
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
    try {
        const { id } = req.params;

        if (!isValidId(id)) {
            return res.status(400).json({
                message: "Invalid order ID"
            });
        }

        let order = await Order.findById(id).select("+cancellationPending");
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        const userId = req.token?.id;
        const isAdmin = req.token?.role === "admin";
        const isOwner = order.user.toString() === userId;

        if (!isAdmin && !isOwner) {
            return res.status(403).json({
                message: "You are not allowed to cancel this order"
            });
        }

        if (["shipped", "delivered"].includes(order.status)) {
            return res.status(409).json({
                message: "Shipped or delivered orders cannot be cancelled"
            });
        }

        if (order.status === "cancelled") {
            return res.status(409).json({
                message: "This order has already been cancelled"
            });
        }

        if (!order.cancellationPending) {
            order = await Order.findOneAndUpdate(
                {
                    _id: id,
                    status: order.status,
                    cancellationPending: { $ne: true }
                },
                { $set: { cancellationPending: true } },
                { new: true }
            ).select("+cancellationPending");

            if (!order) {
                order = await Order.findById(id).select("+cancellationPending");
                if (!order || !order.cancellationPending) {
                    return res.status(409).json({
                        message: "Order status changed. Refresh and try again."
                    });
                }
            }
        }

        const items = order.items?.length
            ? order.items
            : [{ product: order.product, quantity: order.quantity }];

        await restockCancelledItems(items, order._id, Product);

        const cancelledOrder = await Order.findOneAndUpdate(
            { _id: order._id, cancellationPending: true },
            { $set: { status: "cancelled", cancellationPending: false } },
            { new: true }
        );
        if (!cancelledOrder) {
            const currentOrder = await Order.findById(order._id).select("status");
            if (currentOrder?.status !== "cancelled") {
                return res.status(503).json({
                    message: "Cancellation is incomplete. Retry the cancellation to safely finish restoring stock."
                });
            }
        }

        return res.status(200).json({
            message: "Order cancelled successfully"
        });
    } catch (error) {
        console.error("CANCEL ORDER ERROR:", error.name);

        if (error.name === "MongoServerError" || error.name === "MongoNetworkError") {
            return res.status(503).json({
                message: "Cancellation could not finish. Retry the cancellation to safely continue restoring stock."
            });
        }

        return res.status(500).json({
            message: "Cancellation could not finish. Retry the cancellation to safely continue restoring stock."
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

        const existingOrder = await Order.findById(id).select("status +cancellationPending");
        if (!existingOrder) {
            return res.status(404).json({ message: "Order not found" });
        }
        if (existingOrder.status === "cancelled") {
            return res.status(409).json({ message: "Cancelled orders cannot be updated" });
        }
        if (existingOrder.cancellationPending) {
            return res.status(409).json({ message: "Order cancellation is in progress" });
        }

        const order = await Order.findOneAndUpdate(
            {
                _id: id,
                status: existingOrder.status,
                cancellationPending: { $ne: true }
            },
            { $set: { status } },
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