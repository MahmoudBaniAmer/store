const express = require("express");
const router = express.Router();

const {
    createCategory,
    getCategories,
    updateCategory,
    deleteCategory
} = require("../controllers/categoryController");

const authentication = require("../middleware/authentication");
const authorization = require("../middleware/authorization");

// Public Route
router.get("/", getCategories);

// Admin Protected Routes
router.post("/", authentication, authorization("admin"), createCategory);
router.put("/:id", authentication, authorization("admin"), updateCategory);
router.delete("/:id", authentication, authorization("admin"), deleteCategory);

module.exports = router;