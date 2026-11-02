const Product = require("../models/Product");

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
        res.status(400).json({
            message: error.message,
        });
    }
};

// Get All Products
const getProducts = async (req, res) => {
    try {
        const products = await Product.find().populate("category");

        res.status(200).json(products);
    } catch (error) {
        res.status(500).json({
            message: error.message,
        });
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
        res.status(400).json({
            message: error.message,
        });
    }
};

// Update Product
const updateProduct = async (req, res) => {
    try {
        const updates = { ...req.body };

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
        res.status(400).json({
            message: error.message,
        });
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
        res.status(400).json({
            message: error.message,
        });
    }
};

module.exports = {
    createProduct,
    getProducts,
    getProductById,
    updateProduct,
    deleteProduct,
};