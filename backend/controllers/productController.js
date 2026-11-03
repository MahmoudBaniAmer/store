const Product = require("../models/Product");
const Review = require("../models/Review");
const Category = require("../models/Category");

// Create Product
const createProduct = async (req, res) => {
    try {
        const { name, brand, description, price, category, image, stock } = req.body;

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

        if (!await Category.exists({ _id: category })) {
            return res.status(400).json({
                message: "A valid existing category is required",
            });
        }

        const product = new Product({
            name,
            brand,
            description,
            price: Number(price),
            category,
            image,
            stock: stock === undefined ? 0 : Number(stock),
            inStock: Number(stock) > 0,
            isActive: true,
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

const listProducts = async (res, includeInactive) => {
    try {
        const [products, reviewSummaries] = await Promise.all([
            Product.find(includeInactive ? {} : { isActive: { $ne: false } }).populate("category"),
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

// Public catalog hides products retained only for historical orders.
const getProducts = async (req, res) => listProducts(res, false);

// Archived products remain available to administrators for restoration.
const getAdminProducts = async (req, res) => listProducts(res, true);

// Get Product By ID
const getProductById = async (req, res) => {
    try {
        const product = await Product.findOne({
            _id: req.params.id,
            isActive: { $ne: false }
        }).populate("category");

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

        const allowedFields = ["name", "brand", "description", "price", "category", "image", "stock", "isActive"];
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

        if (updates.brand !== undefined) {
            if (typeof updates.brand !== "string") {
                return res.status(400).json({ message: "Brand must be text" });
            }
            updates.brand = updates.brand.trim();
        }

        if (updates.category !== undefined && !await Category.exists({ _id: updates.category })) {
            return res.status(400).json({
                message: "A valid existing category is required",
            });
        }

        if (updates.isActive !== undefined && typeof updates.isActive !== "boolean") {
            return res.status(400).json({ message: "Product visibility must be true or false" });
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
    getAdminProducts,
    getProductById,
    updateProduct,
    deleteProduct,
};