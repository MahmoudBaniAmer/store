const express = require("express");
const reviewRouter = express.Router();
const authentication = require("../middleware/authentication");
const {
    getProductReviews,
    createProductReview,
    updateProductReview,
    deleteProductReview
} = require("../controllers/reviewController");

reviewRouter.get("/:productId", getProductReviews);
reviewRouter.post("/:productId", authentication, createProductReview);
reviewRouter.patch("/:productId/:reviewId", authentication, updateProductReview);
reviewRouter.delete("/:productId/:reviewId", authentication, deleteProductReview);
module.exports = reviewRouter;
