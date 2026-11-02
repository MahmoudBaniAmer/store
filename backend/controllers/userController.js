const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const { sendWelcomeEmail } = require("../services/emailService");
const googleClient = new OAuth2Client();

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
        return res.status(500).json({
            message: error.message
        });
    }
};

const googleLogin = async (req, res) => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const credential = req.body?.credential;

    if (!clientId) {
        return res.status(503).json({
            message: "Google sign-in is not configured"
        });
    }

    if (typeof credential !== "string" || credential.length === 0) {
        return res.status(400).json({
            message: "A Google ID token is required"
        });
    }

    try {
        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: clientId
        });
        const payload = ticket.getPayload();

        if (
            !payload?.sub ||
            !payload.email ||
            payload.email_verified !== true
        ) {
            return res.status(401).json({
                message: "Google account email must be verified"
            });
        }

        const email = payload.email.trim().toLowerCase();
        let user = await User.findOne({ email });
        let isNewUser = false;

        if (user) {
            if (user.googleId && user.googleId !== payload.sub) {
                return res.status(409).json({
                    message: "This email is already linked to another Google account"
                });
            }

            if (!user.googleId) {
                user.googleId = payload.sub;
                await user.save();
            }
        } else {
            user = await User.create({
                name: payload.name?.trim() || email.split("@")[0],
                email,
                googleId: payload.sub
            });
            isNewUser = true;
        }

        let emailSent = false;
        if (isNewUser) {
            try {
                await sendWelcomeEmail(user);
                emailSent = true;
            } catch (emailError) {
                console.error("Welcome email failed:", emailError.message);
            }
        }

        return res.status(200).json({
            message: isNewUser ? "Google account created successfully" : "Login successful",
            token: createAuthToken(user),
            user: getAuthUser(user),
            emailSent
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                message: "This Google account is already linked to another user"
            });
        }

        console.error("GOOGLE AUTHENTICATION ERROR:", error.message);
        return res.status(401).json({
            message: "Google sign-in could not be verified"
        });
    }
};

// Get All Users (Admin Only)
const getUsers = async (req, res) => {
    try {
        const users = await User.find().select("-password -googleId");

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
    googleLogin,
    getUsers,
    updateUserRole
};