const express = require("express");
const reviewRouter = express.Router();
const authentication = require("../middleware/authentication");
const { getProductReviews, createProductReview } = require("../controllers/reviewController");

reviewRouter.get("/:productId", getProductReviews);
reviewRouter.post("/:productId", authentication, createProductReview);
module.exports = reviewRouter;
