
const express = require("express");
const router = express.Router();

const {
    createCategory,
    getCategories,
    updateCategory

} = require("../controllers/categoryController");

router.post("/", createCategory);
router.get("/", getCategories);
router.put("/:id", updateCategory);

module.exports = router;
