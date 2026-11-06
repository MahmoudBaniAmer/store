const test = require("node:test");
const assert = require("node:assert/strict");
const {
    adjustProductStock,
    reserveOrderStock,
    restockCancelledItems
} = require("../utils/standaloneInventory");

function createProductModel(initialProducts, beforeUpdate) {
    const products = new Map(
        initialProducts.map((product) => [product._id, { ...product }])
    );

    return {
        products,
        findById(id) {
            return {
                select: async () => products.get(id) || null
            };
        },
        async findOneAndUpdate(filter, update) {
            if (beforeUpdate) await beforeUpdate(filter, update);
            const product = products.get(filter._id);
            if (!product) return null;
            if (
                filter.stock !== undefined &&
                typeof filter.stock === "number" &&
                product.stock !== filter.stock
            ) {
                return null;
            }
            if (filter.stock?.$exists === false && product.stock !== undefined) {
                return null;
            }
            if (filter.isActive?.$ne === false && product.isActive === false) {
                return null;
            }

            Object.assign(product, update.$set);
            return { ...product };
        },
        async updateOne(filter, update) {
            const product = products.get(filter._id);
            if (!product) return { matchedCount: 0 };
            const existingIds = product.restockedOrderIds || [];
            if (
                filter.restockedOrderIds?.$ne &&
                existingIds.includes(filter.restockedOrderIds.$ne)
            ) {
                return { matchedCount: 0 };
            }

            if (update.$inc) product.stock += update.$inc.stock;
            if (update.$addToSet?.restockedOrderIds) {
                product.restockedOrderIds = [
                    ...existingIds,
                    update.$addToSet.restockedOrderIds
                ];
            }
            return { matchedCount: 1 };
        }
    };
}

test("reserves each cart item with standalone-compatible conditional stock updates", async () => {
    const Product = createProductModel([
        { _id: "product-a", name: "One", price: 4, stock: 5, isActive: true },
        { _id: "product-b", name: "Two", price: 7, stock: 3, isActive: true }
    ]);

    const result = await reserveOrderStock([
        { product: "product-a", quantity: 2 },
        { product: "product-b", quantity: 1 }
    ], Product);

    assert.equal(Product.products.get("product-a").stock, 3);
    assert.equal(Product.products.get("product-b").stock, 2);
    assert.equal(Product.products.get("product-a").inStock, true);
    assert.equal(result.productsById.get("product-a").price, 4);
    assert.equal(result.reservedItems.length, 2);
});

test("rolls back earlier reservations when a later item runs out of stock", async () => {
    const Product = createProductModel([
        { _id: "product-a", stock: 5, isActive: true },
        { _id: "product-b", stock: 0, isActive: true }
    ]);

    await assert.rejects(
        reserveOrderStock([
            { product: "product-a", quantity: 2 },
            { product: "product-b", quantity: 1 }
        ], Product),
        { statusCode: 409 }
    );

    assert.equal(Product.products.get("product-a").stock, 5);
    assert.equal(Product.products.get("product-a").inStock, true);
});

test("restocking the same cancelled order repeatedly does not add stock twice", async () => {
    const Product = createProductModel([
        { _id: "product-a", stock: 2, isActive: true, restockedOrderIds: [] }
    ]);
    const items = [{ product: "product-a", quantity: 3 }];

    await restockCancelledItems(items, "order-a", Product);
    await restockCancelledItems(items, "order-a", Product);

    assert.equal(Product.products.get("product-a").stock, 5);
    assert.equal(Product.products.get("product-a").inStock, true);
    assert.deepEqual(Product.products.get("product-a").restockedOrderIds, ["order-a"]);
});

test("conditional stock adjustment retries when another checkout changes stock", async () => {
    let raced = false;
    const Product = createProductModel(
        [{ _id: "product-a", stock: 4, isActive: true }],
        async (filter) => {
            if (!raced && filter.stock === 4) {
                raced = true;
                Product.products.get("product-a").stock = 3;
            }
        }
    );

    const updated = await adjustProductStock(Product, "product-a", -2);
    assert.equal(updated.stock, 1);
    assert.equal(updated.inStock, true);
});
