
const express = require("express");

const productRouter = express.Router();

const {
    createProduct,
    getProducts,
    getProductById,
    updateProduct,
    deleteProduct
} = require("../controllers/productController");

const authentication = require("../middleware/authentication");
const authorization = require("../middleware/authorization");

// Public Routes
productRouter.get("/", getProducts);
productRouter.get("/:id", getProductById);

// Admin Protected Routes
productRouter.post(
    "/",
    authentication,
    authorization("admin"),
    createProduct
);

productRouter.put(
    "/:id",
    authentication,
    authorization("admin"),
    updateProduct
);

productRouter.delete(
    "/:id",
    authentication,
    authorization("admin"),
    deleteProduct
);

module.exports = productRouter;
