require("dotenv").config();

const mongoose = require("mongoose");
const { connectDB } = require("../models/db");
const Category = require("../models/Category");
const Order = require("../models/Order");
const Product = require("../models/Product");
const {
    EXISTING_CATEGORY_MAP,
    TARGET_CATEGORIES
} = require("./catalogConfig");
const {
    ensureTargetCategories,
    fetchProducts,
    importMappedProducts
} = require("./importDummyJson");

const LOCAL_MONGO_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
const FOOD_CATEGORY = "Groceries";

async function assertSafeRefresh() {
    if (process.env.NODE_ENV !== "development") {
        throw new Error("Catalog refresh is allowed only when NODE_ENV=development");
    }
    if (process.env.ALLOW_SAMPLE_CATALOG_REFRESH !== "true") {
        throw new Error("Set ALLOW_SAMPLE_CATALOG_REFRESH=true to confirm catalog cleanup");
    }
    if (!process.env.EXPECTED_SAMPLE_DATABASE) {
        throw new Error("Set EXPECTED_SAMPLE_DATABASE to the exact disposable database name");
    }

    await connectDB();
    if (mongoose.connection.name !== process.env.EXPECTED_SAMPLE_DATABASE) {
        throw new Error("Connected database does not match EXPECTED_SAMPLE_DATABASE");
    }
    if (!LOCAL_MONGO_HOSTS.has(mongoose.connection.host)) {
        throw new Error("Catalog refresh is allowed only on a local MongoDB host");
    }
}

async function findOrderReferences(productIds) {
    if (productIds.length === 0) return new Set();

    const idSet = new Set(productIds.map(String));
    const orders = await Order.find({
        $or: [
            { product: { $in: productIds } },
            { "items.product": { $in: productIds } }
        ]
    }, "product items.product").lean();
    const referenced = new Set();

    for (const order of orders) {
        if (order.product && idSet.has(String(order.product))) {
            referenced.add(String(order.product));
        }
        for (const item of order.items || []) {
            if (item.product && idSet.has(String(item.product))) {
                referenced.add(String(item.product));
            }
        }
    }

    return referenced;
}

async function refreshCatalog(products) {
    if (!Array.isArray(products) || products.length === 0) {
        throw new Error("Catalog refresh requires a non-empty product catalog");
    }

    await assertSafeRefresh();

    const existingCategories = await Category.find({
        name: {
            $in: [
                ...Object.keys(EXISTING_CATEGORY_MAP),
                FOOD_CATEGORY
            ]
        }
    }).lean();
    const categoryIds = new Map(existingCategories.map(({ name, _id }) => [name, _id]));
    const phoneProducts = [];
    const groceryProducts = categoryIds.has(FOOD_CATEGORY)
        ? await Product.find({ category: categoryIds.get(FOOD_CATEGORY) }, "_id name").lean()
        : [];

    const electronicsId = categoryIds.get("Electronics & Gadgets");
    const samsungCategoryId = categoryIds.get("Samsung Galaxy");
    if (electronicsId || samsungCategoryId) {
        const phoneFilter = [];
        if (electronicsId) {
            phoneFilter.push({ name: "Samsung Galaxy", category: electronicsId });
        }
        if (samsungCategoryId) {
            phoneFilter.push({ name: "Samsung Galaxy S24", category: samsungCategoryId });
        }
        if (phoneFilter.length > 0) {
            phoneProducts.push(...await Product.find({ $or: phoneFilter }, "_id name category").lean());
        }
    }

    const groceryReferences = await findOrderReferences(groceryProducts.map(({ _id }) => _id));
    if (groceryReferences.size > 0) {
        throw new Error("Grocery products are referenced by saved orders; refusing to remove them");
    }
    const phoneReferences = await findOrderReferences(phoneProducts.map(({ _id }) => _id));

    const { categories, created } = await ensureTargetCategories();
    let archivedPhones = 0;
    let deletedPhones = 0;

    for (const product of phoneProducts) {
        if (phoneReferences.has(String(product._id))) {
            await Product.updateOne(
                { _id: product._id },
                {
                    $set: {
                        isActive: false,
                        brand: "Samsung",
                        category: categories.get("Mobile Phones & Accessories")._id
                    }
                }
            );
            archivedPhones += 1;
        } else {
            await Product.deleteOne({ _id: product._id });
            deletedPhones += 1;
        }
    }

    if (groceryProducts.length > 0) {
        await Product.deleteMany({ _id: { $in: groceryProducts.map(({ _id }) => _id) } });
    }

    let remappedProducts = 0;
    for (const [oldName, newName] of Object.entries(EXISTING_CATEGORY_MAP)) {
        const oldCategoryId = categoryIds.get(oldName);
        const newCategoryId = categories.get(newName)._id;
        if (!oldCategoryId || String(oldCategoryId) === String(newCategoryId)) continue;

        const result = await Product.updateMany(
            { category: oldCategoryId },
            { $set: { category: newCategoryId } }
        );
        remappedProducts += result.modifiedCount;
    }

    for (const product of await Product.find({
        category: { $in: Array.from(categories.values(), ({ _id }) => _id) },
        brand: { $in: ["", null] }
    }, "_id name").lean()) {
        const inferredBrand = product.name.startsWith("HyperX ")
            ? "HyperX"
            : product.name.startsWith("Logitech ")
                ? "Logitech"
                : product.name === "Samsung Galaxy Buds FE"
                    ? "Samsung"
                    : "";
        if (inferredBrand) {
            await Product.updateOne({ _id: product._id }, { $set: { brand: inferredBrand } });
        }
    }

    for (const oldName of [...Object.keys(EXISTING_CATEGORY_MAP), FOOD_CATEGORY]) {
        const oldId = categoryIds.get(oldName);
        const targetId = categories.get(oldName)?._id;
        if (!oldId || (targetId && String(oldId) === String(targetId))) continue;

        if (await Product.exists({ category: oldId })) {
            throw new Error(`Cannot remove obsolete category ${oldName}: products still reference it`);
        }
        await Category.deleteOne({ _id: oldId });
    }

    const importResult = await importMappedProducts(products, categories);
    console.log(
        `Catalog refresh complete for ${mongoose.connection.name}: ` +
        `${importResult.added} products added, ${importResult.skipped} skipped; ` +
        `${groceryProducts.length} grocery products removed; ` +
        `${deletedPhones} unreferenced Samsung phones removed; ` +
        `${archivedPhones} order-linked Samsung phones hidden; ` +
        `${remappedProducts} existing products recategorized; ` +
        `${created} target categories created.`
    );
    const emptySourceCategories = TARGET_CATEGORIES
        .filter(({ name }) => ["Toys & Games", "Books & Stationery"].includes(name))
        .map(({ name }) => name);
    console.log(`No matching products are available in DummyJSON for: ${emptySourceCategories.join(", ")}.`);
}

fetchProducts()
    .then(refreshCatalog)
    .catch((error) => {
        console.error("Catalog refresh failed:", error.message);
        process.exitCode = 1;
    })
    .finally(async () => {
        await mongoose.disconnect();
    });
