require("dotenv").config();

const mongoose = require("mongoose");
const { connectDB } = require("../models/db");
const Category = require("../models/Category");
const Product = require("../models/Product");
const {
    SOURCE_CATEGORY_MAP,
    TARGET_CATEGORIES
} = require("./catalogConfig");

const MAX_SOURCE_PRODUCTS = 194;
const LOCAL_MONGO_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

async function fetchProducts() {
    const response = await fetch(
        `https://dummyjson.com/products?limit=${MAX_SOURCE_PRODUCTS}`,
        { signal: AbortSignal.timeout(15000) }
    );

    if (!response.ok) {
        throw new Error(`DummyJSON returned HTTP ${response.status}`);
    }

    const data = await response.json();
    if (!Array.isArray(data.products)) {
        throw new Error("DummyJSON returned an unexpected product response");
    }

    return data.products;
}

async function assertSafeDatabase() {
    if (process.env.NODE_ENV !== "development") {
        throw new Error("Sample import is allowed only when NODE_ENV=development");
    }
    if (process.env.ALLOW_DUMMYJSON_IMPORT !== "true") {
        throw new Error("Set ALLOW_DUMMYJSON_IMPORT=true to confirm this sample import");
    }
    if (!process.env.EXPECTED_SAMPLE_DATABASE) {
        throw new Error("Set EXPECTED_SAMPLE_DATABASE to the exact disposable database name");
    }

    await connectDB();
    if (mongoose.connection.name !== process.env.EXPECTED_SAMPLE_DATABASE) {
        throw new Error("Connected database does not match EXPECTED_SAMPLE_DATABASE");
    }
    if (!LOCAL_MONGO_HOSTS.has(mongoose.connection.host)) {
        throw new Error("Sample import is allowed only on a local MongoDB host");
    }
}

async function ensureTargetCategories() {
    const categories = new Map();
    let created = 0;

    for (const data of TARGET_CATEGORIES) {
        let category = await Category.findOne({ name: data.name });
        if (!category) {
            category = await Category.create(data);
            created += 1;
        }
        categories.set(data.name, category);
    }

    return { categories, created };
}

function getProductImage(product) {
    const candidates = [
        product.thumbnail,
        ...(Array.isArray(product.images) ? product.images : [])
    ];

    return candidates.find((candidate) => {
        try {
            const imageUrl = new URL(candidate);
            return ["http:", "https:"].includes(imageUrl.protocol);
        } catch {
            return false;
        }
    });
}

async function importMappedProducts(products, categories) {
    let added = 0;
    let skipped = 0;

    for (const product of products) {
        const categoryName = SOURCE_CATEGORY_MAP[product.category];
        if (!categoryName) continue;

        if (
            typeof product.title !== "string" ||
            !product.title.trim() ||
            typeof product.description !== "string" ||
            !product.description.trim() ||
            !Number.isFinite(Number(product.price)) ||
            Number(product.price) < 0
        ) {
            skipped += 1;
            continue;
        }

        const name = product.title.trim();
        if (await Product.exists({ name })) {
            skipped += 1;
            continue;
        }

        const stock = Number.isInteger(product.stock) && product.stock >= 0
            ? product.stock
            : 0;
        await Product.create({
            name,
            brand: typeof product.brand === "string" ? product.brand.trim() : "",
            description: product.description.trim(),
            price: Number(product.price),
            category: categories.get(categoryName)._id,
            image: getProductImage(product),
            stock,
            inStock: stock > 0,
            isActive: true
        });
        added += 1;
    }

    return { added, skipped };
}

async function importCatalog(products) {
    await assertSafeDatabase();
    const { categories, created } = await ensureTargetCategories();
    const result = await importMappedProducts(products, categories);
    console.log(
        `DummyJSON catalog import complete for ${mongoose.connection.name}: ` +
        `${result.added} products added, ${result.skipped} skipped, ${created} categories created.`
    );
}

if (require.main === module) {
    fetchProducts()
        .then(importCatalog)
        .catch((error) => {
            console.error("DummyJSON import failed:", error.message);
            process.exitCode = 1;
        })
        .finally(async () => {
            await mongoose.disconnect();
        });
}

module.exports = {
    assertSafeDatabase,
    ensureTargetCategories,
    fetchProducts,
    importMappedProducts
};
