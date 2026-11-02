
const Category = require("../models/Category");
const Product = require("../models/Product");

const createCategory = async (req, res) => {
    try {
        const category = new Category(req.body);
        await category.save();

        res.status(201).json(category);
    } catch (error) {
        if (["ValidationError", "CastError"].includes(error.name)) {
            return res.status(400).json({ message: error.message });
        }
        console.error("CREATE CATEGORY ERROR:", error.name);
        return res.status(500).json({ message: "Failed to create category" });
    }
};

const getCategories = async (req, res) => {
    try {
        const categories = await Category.find();

        res.status(200).json(categories);
    } catch (error) {
        console.error("GET CATEGORIES ERROR:", error.name);
        res.status(500).json({ message: "Failed to get categories" });
    }
};

const updateCategory = async (req, res) => {
    try {
        const category = await Category.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!category) {
            return res.status(404).json({ message: "Category not found" });
        }

        res.status(200).json(category);
    } catch (error) {
        if (["ValidationError", "CastError"].includes(error.name)) {
            return res.status(400).json({ message: error.message });
        }
        console.error("UPDATE CATEGORY ERROR:", error.name);
        return res.status(500).json({ message: "Failed to update category" });
    }
};
const deleteCategory = async (req, res) => {
    try {
        const categoryHasProducts = await Product.exists({
            category: req.params.id
        });

        if (categoryHasProducts) {
            return res.status(409).json({
                message: "Category cannot be deleted while products still use it"
            });
        }

        const category = await Category.findByIdAndDelete(req.params.id);

        if (!category) {
            return res.status(404).json({
                message: "Category not found"
            });
        }

        res.status(200).json({
            message: "Category deleted successfully",
            category
        });
    } catch (error) {
        if (["ValidationError", "CastError"].includes(error.name)) {
            return res.status(400).json({ message: error.message });
        }
        console.error("DELETE CATEGORY ERROR:", error.name);
        return res.status(500).json({ message: "Failed to delete category" });
    }
};

module.exports = {
    createCategory,
    getCategories,
    updateCategory,
    deleteCategory
};
