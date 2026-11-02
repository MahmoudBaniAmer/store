const mongoose = require("mongoose");
const Review = require("../models/Review");
const Product = require("../models/Product");

const getProductReviews = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.productId)) return res.status(400).json({ message: "Invalid product ID" });
        const reviews = await Review.find({ product: req.params.productId }).populate("user", "name").sort({ createdAt: -1 });
        const averageRating = reviews.length ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : 0;
        return res.status(200).json({ reviews, averageRating: Number(averageRating.toFixed(1)), reviewCount: reviews.length });
    } catch (error) { return res.status(500).json({ message: error.message }); }
};

const createProductReview = async (req, res) => {
    try {
        const { rating, comment } = req.body;
        const productId = req.params.productId;
        const userId = req.token?.id || req.token?._id || req.token?.userId;
        if (!userId) return res.status(401).json({ message: "Please log in to write a review" });
        if (!mongoose.Types.ObjectId.isValid(productId)) return res.status(400).json({ message: "Invalid product ID" });
        const numericRating = Number(rating);
        if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) return res.status(400).json({ message: "Rating must be between 1 and 5" });
        if (typeof comment !== "string" || !comment.trim() || comment.trim().length > 1000) return res.status(400).json({ message: "Comment is required (maximum 1000 characters)" });
        if (!await Product.exists({ _id: productId })) return res.status(404).json({ message: "Product not found" });
        const review = await Review.create({ product: productId, user: userId, rating: numericRating, comment: comment.trim() });
        await review.populate("user", "name");
        return res.status(201).json({ message: "Review added", review });
    } catch (error) {
        if (error.code === 11000) return res.status(409).json({ message: "You have already reviewed this product" });
        if (error.name === "ValidationError") return res.status(400).json({ message: error.message });
        return res.status(500).json({ message: error.message });
    }
};
module.exports = { getProductReviews, createProductReview };
