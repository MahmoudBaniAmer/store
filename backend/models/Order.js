const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
    {
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            required: true
        },

        quantity: {
            type: Number,
            required: true,
            min: 1
        }
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

orderSchema.pre("validate", function () {
    const hasItems = Array.isArray(this.items) && this.items.length > 0;
    const hasLegacyItem = Boolean(this.product && this.quantity);

    if (!hasItems && !hasLegacyItem) {
        this.invalidate("items", "An order must contain at least one product");
    }
});

module.exports = mongoose.model("Order", orderSchema);