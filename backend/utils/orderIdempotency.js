const crypto = require("node:crypto");

const isValidIdempotencyKey = (key) =>
    typeof key === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(key);

function createOrderRequestHash(items, deliveryLocation) {
    const canonicalItems = items
        .map(({ product, quantity }) => ({
            product: product.toString(),
            quantity
        }))
        .sort((left, right) => left.product.localeCompare(right.product));
    const canonicalLocation = deliveryLocation
        ? { lat: deliveryLocation.lat, lng: deliveryLocation.lng }
        : null;

    return crypto
        .createHash("sha256")
        .update(JSON.stringify({ items: canonicalItems, deliveryLocation: canonicalLocation }))
        .digest("hex");
}

module.exports = { createOrderRequestHash, isValidIdempotencyKey };
