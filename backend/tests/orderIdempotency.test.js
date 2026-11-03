const test = require("node:test");
const assert = require("node:assert/strict");
const { createOrderRequestHash, isValidIdempotencyKey } = require("../utils/orderIdempotency");

test("accepts UUID v4 idempotency keys and rejects malformed keys", () => {
    assert.equal(isValidIdempotencyKey("4c9f5c2a-0b4e-4a1f-8f77-30a8edbfe7c2"), true);
    assert.equal(isValidIdempotencyKey("not-a-uuid"), false);
    assert.equal(isValidIdempotencyKey(undefined), false);
});

test("order fingerprints do not depend on item order", () => {
    const first = [
        { product: "64f000000000000000000001", quantity: 2 },
        { product: "64f000000000000000000002", quantity: 1 }
    ];
    const reordered = [...first].reverse();

    assert.equal(createOrderRequestHash(first), createOrderRequestHash(reordered));
});

test("order fingerprints distinguish changed quantities and delivery locations", () => {
    const items = [{ product: "64f000000000000000000001", quantity: 1 }];
    const base = createOrderRequestHash(items);

    assert.notEqual(createOrderRequestHash([{ ...items[0], quantity: 2 }]), base);
    assert.notEqual(createOrderRequestHash(items, { lat: 31, lng: 35 }), base);
});
