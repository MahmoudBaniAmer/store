const Product = require("../models/Product");
const Review = require("../models/Review");

// Create Product
const createProduct = async (req, res) => {
    try {
        const { name, description, price, category, image, stock } = req.body;

        if (!name || !description || price === undefined || !category) {
            return res.status(400).json({
                message: "Name, description, price, and category are required",
            });
        }

        if (Number(price) < 0) {
            return res.status(400).json({
                message: "Price cannot be negative",
            });
        }

        if (stock !== undefined && (!Number.isInteger(Number(stock)) || Number(stock) < 0)) {
            return res.status(400).json({
                message: "Stock must be a non-negative integer",
            });
        }

        const product = new Product({
            name,
            description,
            price: Number(price),
            category,
            image,
            stock: stock === undefined ? 0 : Number(stock),
            inStock: Number(stock) > 0,
        });

        await product.save();

        res.status(201).json(product);
    } catch (error) {
        if (["ValidationError", "CastError"].includes(error.name)) {
            return res.status(400).json({ message: error.message });
        }
        console.error("CREATE PRODUCT ERROR:", error.name);
        return res.status(500).json({ message: "Failed to create product" });
    }
};

// Get All Products
const getProducts = async (req, res) => {
    try {
        const [products, reviewSummaries] = await Promise.all([
            Product.find().populate("category"),
            Review.aggregate([
                {
                    $group: {
                        _id: "$product",
                        averageRating: { $avg: "$rating" },
                        reviewCount: { $sum: 1 }
                    }
                }
            ])
        ]);
        const reviewsByProduct = new Map(
            reviewSummaries.map((summary) => [summary._id.toString(), summary])
        );
        const productsWithRatings = products.map((product) => {
            const summary = reviewsByProduct.get(product._id.toString());
            return {
                ...product.toObject(),
                rating: summary ? Number(summary.averageRating.toFixed(1)) : 0,
                reviewCount: summary?.reviewCount || 0
            };
        });

        res.status(200).json(productsWithRatings);
    } catch (error) {
        console.error("GET PRODUCTS ERROR:", error.name);
        res.status(500).json({ message: "Failed to get products" });
    }
};

// Get Product By ID
const getProductById = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id).populate("category");

        if (!product) {
            return res.status(404).json({
                message: "Product not found",
            });
        }

        res.status(200).json(product);
    } catch (error) {
        if (error.name === "CastError") {
            return res.status(400).json({ message: "Invalid product ID" });
        }
        console.error("GET PRODUCT ERROR:", error.name);
        return res.status(500).json({ message: "Failed to get product" });
    }
};

// Update Product
const updateProduct = async (req, res) => {
    try {
        if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
            return res.status(400).json({
                message: "Product updates must be provided as an object"
            });
        }

        const allowedFields = ["name", "description", "price", "category", "image", "stock"];
        const updates = Object.fromEntries(
            allowedFields
                .filter((field) => req.body[field] !== undefined)
                .map((field) => [field, req.body[field]])
        );

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({
                message: "At least one supported product field must be provided"
            });
        }

        if (updates.price !== undefined) {
            updates.price = Number(updates.price);

            if (updates.price < 0) {
                return res.status(400).json({
                    message: "Price cannot be negative",
                });
            }
        }

        if (updates.stock !== undefined) {
            updates.stock = Number(updates.stock);

            if (!Number.isInteger(updates.stock) || updates.stock < 0) {
                return res.status(400).json({
                    message: "Stock must be a non-negative integer",
                });
            }

            updates.inStock = updates.stock > 0;
        }

        const product = await Product.findByIdAndUpdate(
            req.params.id,
            updates,
            {
                new: true,
                runValidators: true,
            }
        ).populate("category");

        if (!product) {
            return res.status(404).json({
                message: "Product not found",
            });
        }

        res.status(200).json(product);
    } catch (error) {
        if (["ValidationError", "CastError"].includes(error.name)) {
            return res.status(400).json({ message: error.message });
        }
        console.error("UPDATE PRODUCT ERROR:", error.name);
        return res.status(500).json({ message: "Failed to update product" });
    }
};

// Delete Product
const deleteProduct = async (req, res) => {
    try {
        const product = await Product.findByIdAndDelete(req.params.id);

        if (!product) {
            return res.status(404).json({
                message: "Product not found",
            });
        }

        res.status(200).json({
            message: "Product deleted successfully",
        });
    } catch (error) {
        if (error.name === "CastError") {
            return res.status(400).json({ message: "Invalid product ID" });
        }
        console.error("DELETE PRODUCT ERROR:", error.name);
        return res.status(500).json({ message: "Failed to delete product" });
    }
};

module.exports = {
    createProduct,
    getProducts,
    getProductById,
    updateProduct,
    deleteProduct,
};