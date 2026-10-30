
const Order = require("../models/Order");

// Create Order
const createOrder = async (req, res) => {
    try {
        const order = new Order(req.body);

        await order.save();

        res.status(201).json(order);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Get All Orders
const getOrders = async (req, res) => {
    try {
        const orders = await Order.find().populate("product");

        res.status(200).json(orders);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    createOrder,
    getOrders
};
