require("dotenv").config();

const mongoose = require("mongoose");
const { connectDB } = require("../models/db");
const Category = require("../models/Category");
const Product = require("../models/Product");

const LOCAL_MONGO_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

const sampleCategories = [
    { name: "Electronics", description: "Everyday technology and accessories." },
    { name: "Home & Living", description: "Practical essentials for your home." },
    { name: "Accessories", description: "Small details for daily life." }
];

const sampleProducts = [
    {
        name: "Wireless Headphones",
        description: "Comfortable over-ear headphones for daily listening.",
        price: 59.99,
        category: "Electronics",
        stock: 18
    },
    {
        name: "Portable Bluetooth Speaker",
        description: "A compact speaker for music at home or on the go.",
        price: 39.5,
        category: "Electronics",
        stock: 12
    },
    {
        name: "USB-C Charging Hub",
        description: "A multi-port hub for compatible USB-C devices.",
        price: 24.99,
        category: "Electronics",
        stock: 25
    },
    {
        name: "Ceramic Desk Planter",
        description: "A simple ceramic planter for desks and shelves.",
        price: 16,
        category: "Home & Living",
        stock: 9
    },
    {
        name: "Insulated Travel Mug",
        description: "A reusable insulated mug for hot and cold drinks.",
        price: 21.75,
        category: "Home & Living",
        stock: 14
    },
    {
        name: "Everyday Canvas Tote",
        description: "A lightweight canvas tote for everyday essentials.",
        price: 18.5,
        category: "Accessories",
        stock: 20
    }
];

async function seed() {
    if (process.env.NODE_ENV !== "development") {
        throw new Error("Seeding is allowed only when NODE_ENV=development");
    }

    const expectedDatabase = process.env.EXPECTED_SEED_DATABASE?.trim();
    if (!expectedDatabase) {
        throw new Error("Set EXPECTED_SEED_DATABASE to the exact disposable local database name");
    }

    await connectDB();
    if (
        mongoose.connection.name !== expectedDatabase ||
        !LOCAL_MONGO_HOSTS.has(mongoose.connection.host)
    ) {
        throw new Error("Seed is allowed only on the matching local development database");
    }

    const categories = new Map();
    let categoriesCreated = 0;
    for (const data of sampleCategories) {
        let category = await Category.findOne({ name: data.name });
        if (!category) {
            category = await Category.create(data);
            categoriesCreated += 1;
        }
        categories.set(category.name, category._id);
    }

    let productsCreated = 0;
    for (const data of sampleProducts) {
        const existingProduct = await Product.findOne({ name: data.name }).select("_id");
        if (existingProduct) continue;

        await Product.create({
            ...data,
            category: categories.get(data.category),
            image: `https://placehold.co/600x400?text=${encodeURIComponent(data.name)}`,
            inStock: data.stock > 0
        });
        productsCreated += 1;
    }

    console.log(`Seed complete: ${categoriesCreated} categories and ${productsCreated} products created.`);
}

seed()
    .catch((error) => {
        console.error("Seed failed:", error.name);
        process.exitCode = 1;
    })
    .finally(async () => {
        await mongoose.disconnect();
    });
