const User = require("../models/User");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { sendWelcomeEmail } = require("../services/emailService");

function createAuthToken(user) {
    return jwt.sign(
        { id: user._id, role: user.role },
        process.env.SECRET,
        { expiresIn: "5h" }
    );
}

function getAuthUser(user) {
    return {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
    };
}

// Register User
const createUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (
            typeof name !== "string" ||
            typeof email !== "string" ||
            typeof password !== "string" ||
            !name.trim() ||
            !email.trim() ||
            password.length < 6
        ) {
            return res.status(400).json({
                message: "A name, valid email, and password of at least 6 characters are required"
            });
        }

        const normalizedEmail = email.trim().toLowerCase();
        if (
            normalizedEmail.length > 320 ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
        ) {
            return res.status(400).json({
                message: "A valid email address is required"
            });
        }

        const existingUser = await User.findOne({
            email: normalizedEmail
        });

        if (existingUser) {
            return res.status(400).json({
                message: "Email already in use"
            });
        }

        const newUser = new User({
            name: name.trim(),
            email: normalizedEmail,
            password
        });

        await newUser.save();

        // Email failure should not undo a successful registration.
        let emailSent = false;
        try {
            await sendWelcomeEmail(newUser);
            emailSent = true;
        } catch (emailError) {
            console.error("Welcome email failed:", emailError.name);
        }

        return res.status(201).json({
            message: "User registered successfully",
            emailSent,
            user: {
                _id: newUser._id,
                name: newUser.name,
                email: newUser.email,
                role: newUser.role
            }
        });

    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                message: "Email already in use"
            });
        }

        console.error("REGISTER USER ERROR:", error.name);
        return res.status(500).json({ message: "Registration failed" });
    }
};

// Login User
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (
            typeof email !== "string" ||
            typeof password !== "string" ||
            !email.trim() ||
            !password
        ) {
            return res.status(400).json({
                message: "Email and password are required"
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        // Find user
        const user = await User.findOne({
            email: normalizedEmail
        });

        if (!user) {
            return res.status(401).json({
                message: "Email or password is incorrect"
            });
        }

        // Compare password
        const isValid = user.password
            ? await bcrypt.compare(password, user.password)
            : false;

        if (!isValid) {
            return res.status(401).json({
                message: "Email or password is incorrect"
            });
        }

        return res.status(200).json({
            message: "Login successful",
            token: createAuthToken(user),
            user: getAuthUser(user)
        });

    } catch (error) {
        console.error("LOGIN ERROR:", error.name);
        return res.status(500).json({ message: "Login failed" });
    }
};

// Get All Users (Admin Only)
const getUsers = async (req, res) => {
    try {
        const users = await User.find().select("-password -googleId");

        return res.status(200).json(users);

    } catch (error) {
        console.error("GET USERS ERROR:", error.name);
        return res.status(500).json({ message: "Failed to get users" });
    }
};
// Update User Role (Admin Only)
const updateUserRole = async (req, res) => {
    try {
        const { role } = req.body;
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                message: "Invalid user ID"
            });
        }

        // Validate role
        if (!["user", "admin"].includes(role)) {
            return res.status(400).json({
                message: "Role must be either user or admin"
            });
        }

        if (id === req.token?.id && role !== "admin") {
            return res.status(400).json({
                message: "You cannot remove your own administrator role"
            });
        }

        // Find user
        const user = await User.findById(id);

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        // Update role
        user.role = role;
        await user.save();

        return res.status(200).json({
            message: "User role updated successfully",
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.error("UPDATE USER ROLE ERROR:", error.name);
        return res.status(500).json({ message: "Failed to update user role" });
    }
};
// Export Controllers
module.exports = {
    createUser,
    login,
    getUsers,
    updateUserRole
};