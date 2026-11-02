const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { sendWelcomeEmail } = require("../services/emailService");

// Register User
const createUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Check required fields
        if (!name || !email || !password) {
            return res.status(400).json({
                message: "Name, email and password are required"
            });
        }

        // Normalize email
        const normalizedEmail = email.trim().toLowerCase();

        // Check if email already exists
        const existingUser = await User.findOne({
            email: normalizedEmail
        });

        if (existingUser) {
            return res.status(400).json({
                message: "Email already in use"
            });
        }

        // Create new user
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
            console.error("Welcome email failed:", emailError.message);
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
        return res.status(500).json({
            message: error.message
        });
    }
};

// Login User
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Check required fields
        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required"
            });
        }

        // Normalize email
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
        const isValid = await bcrypt.compare(
            password,
            user.password
        );

        if (!isValid) {
            return res.status(401).json({
                message: "Email or password is incorrect"
            });
        }

        // JWT Payload
        const payload = {
            id: user._id,
            role: user.role
        };

        // Token options
        const options = {
            expiresIn: "5h"
        };

        // Generate JWT
        const userToken = jwt.sign(
            payload,
            process.env.SECRET,
            options
        );

        return res.status(200).json({
            message: "Login successful",
            token: userToken,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        return res.status(500).json({
            message: error.message
        });
    }
};

// Get All Users (Admin Only)
const getUsers = async (req, res) => {
    try {
        const users = await User.find().select("-password");

        return res.status(200).json(users);

    } catch (error) {
        return res.status(500).json({
            message: error.message
        });
    }
};
// Update User Role (Admin Only)
const updateUserRole = async (req, res) => {
    try {
        const { role } = req.body;
        const { id } = req.params;

        // Validate role
        if (!["user", "admin"].includes(role)) {
            return res.status(400).json({
                message: "Role must be either user or admin"
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
        return res.status(500).json({
            message: error.message
        });
    }
};
// Export Controllers
module.exports = {
    createUser,
    login,
    getUsers,
    updateUserRole
};