
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },

    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },

    password: {
        type: String,
        required: function () {
            return !this.googleId;
        }
    },

    googleId: {
        type: String,
        unique: true,
        sparse: true
    },

    role: {
        type: String,
        enum: ["user", "admin"],
        default: "user"
    },

    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Hash password before saving
userSchema.pre("save", async function () {
    this.email = this.email.toLowerCase().trim();

    if (this.isModified("password")) {
        this.password = await bcrypt.hash(this.password, 10);
    }
});

module.exports = mongoose.model("User", userSchema);
