
const User = require("../models/User");
const jwt = require("jsonwebtoken");
// Register User
const createUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        const existingUser = await User.findOne({ email });

        if (existingUser) {
            return res.status(400).json({
                message: "Email already in use"
            });
        }

        const newUser = new User({
            name,
            email,
            password
        });

        await newUser.save();

        res.status(201).json({
            message: "User registered successfully",
            user: {
                _id: newUser._id,
                name: newUser.name,
                email: newUser.email,
                role: newUser.role
            }
        });

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
};
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // 1. Find user by email
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(401).json({
                message: "Email or password is incorrect"
            });
        }

        // 2. Compare password
        const isValid = await bcrypt.compare(password, user.password);

        if (!isValid) {
            return res.status(401).json({
                message: "Email or password is incorrect"
            });
        }

        // 3. Create JWT Payload
        const payload = {
            id: user._id,
            role: user.role
        };

        // 4. Token options
        const options = {
            expiresIn: "5h"
        };

        // 5. Generate Token
        const userToken = jwt.sign(
            payload,
            process.env.SECRET,
            options
        );

        // 6. Send response
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
module.exports = {
    createUser,
    login
};