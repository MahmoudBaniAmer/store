function createStockError(message) {
    const error = new Error(message);
    error.statusCode = 409;
    return error;
}

async function adjustProductStock(Product, productId, quantityChange) {
    for (let attempt = 0; attempt < 5; attempt += 1) {
        const currentProduct = await Product.findById(productId).select("stock isActive");
        if (!currentProduct || (quantityChange < 0 && currentProduct.isActive === false)) {
            return null;
        }

        const currentStock = Number.isFinite(currentProduct.stock)
            ? currentProduct.stock
            : 0;
        const nextStock = currentStock + quantityChange;
        if (nextStock < 0) return null;

        const filter = {
            _id: productId,
            stock: currentProduct.stock === undefined
                ? { $exists: false }
                : currentProduct.stock
        };
        if (quantityChange < 0) filter.isActive = { $ne: false };

        const updatedProduct = await Product.findOneAndUpdate(
            filter,
            {
                $set: {
                    stock: nextStock,
                    inStock: nextStock > 0
                }
            },
            { new: true }
        );
        if (updatedProduct) return updatedProduct;
    }

    return null;
}

async function rollbackReservedStock(reservedItems, adjustStock) {
    const failures = [];
    for (const item of [...reservedItems].reverse()) {
        try {
            const product = await adjustStock(item.product, item.quantity);
            if (!product) {
                throw new Error("Reserved product was not found during inventory restoration");
            }
        } catch (error) {
            failures.push(error);
        }
    }
    return failures;
}

async function reserveOrderStock(items, Product) {
    const reservedItems = [];
    const productsById = new Map();
    const adjustStock = (productId, quantityChange) =>
        adjustProductStock(Product, productId, quantityChange);

    try {
        for (const item of items) {
            const product = await adjustStock(item.product, -item.quantity);
            if (!product) {
                throw createStockError("Stock changed during checkout. Review your cart and try again.");
            }
            reservedItems.push(item);
            productsById.set(product._id.toString(), product);
        }
        return { productsById, reservedItems };
    } catch (error) {
        const rollbackFailures = await rollbackReservedStock(reservedItems, adjustStock);
        if (rollbackFailures.length > 0) {
            error.inventoryRollbackFailed = true;
        }
        throw error;
    }
}

async function restockCancelledItems(items, orderId, Product) {
    for (const item of items) {
        if (!item.product || !item.quantity) continue;

        await Product.updateOne(
            {
                _id: item.product,
                restockedOrderIds: { $ne: orderId }
            },
            {
                $inc: { stock: item.quantity },
                $addToSet: { restockedOrderIds: orderId }
            }
        );
        await adjustProductStock(Product, item.product, 0);
    }
}

module.exports = {
    adjustProductStock,
    reserveOrderStock,
    rollbackReservedStock,
    restockCancelledItems
};
