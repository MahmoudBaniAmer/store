const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
    {
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            required: true
        },

        productName: {
            type: String,
            trim: true
        },

        unitPrice: {
            type: Number,
            min: 0
        },

        quantity: {
            type: Number,
            required: true,
            min: 1
        }
    },
    { _id: false }
);

const deliveryLocationSchema = new mongoose.Schema(
    {
        lat: { type: Number, required: true, min: -90, max: 90 },
        lng: { type: Number, required: true, min: -180, max: 180 }
    },
    { _id: false }
);

const orderSchema = new mongoose.Schema(
    {
        items: {
            type: [orderItemSchema],
            default: undefined
        },

        // Retained for orders created before checkout supported multiple items.
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product"
        },

        quantity: {
            type: Number,
            min: 1
        },

        status: {
            type: String,
            enum: ["pending", "processing", "shipped", "delivered", "cancelled"],
            default: "pending"
        },

        cancellationPending: {
            type: Boolean,
            default: false,
            select: false
        },

        deliveryLocation: {
            type: deliveryLocationSchema,
            default: undefined
        },

        idempotencyKey: {
            type: String,
            select: false
        },

        idempotencyHash: {
            type: String,
            select: false
        },

        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        }
    },
    {
        timestamps: true
    }
);

orderSchema.index(
    { user: 1, idempotencyKey: 1 },
    {
        unique: true,
        partialFilterExpression: { idempotencyKey: { $type: "string" } }
    }
);

orderSchema.pre("validate", function () {
    const hasItems = Array.isArray(this.items) && this.items.length > 0;
    const hasLegacyItem = Boolean(this.product && this.quantity);

    if (!hasItems && !hasLegacyItem) {
        this.invalidate("items", "An order must contain at least one product");
    }
});

module.exports = mongoose.model("Order", orderSchema);