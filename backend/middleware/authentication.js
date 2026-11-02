const jwt = require("jsonwebtoken");
const User = require("../models/User");

const authentication = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({
            message: "Authorization header is required"
        });
    }

    const bearerMatch = authHeader.match(/^Bearer\s+(\S+)$/i);

    if (!bearerMatch) {
        return res.status(401).json({
            message: "Authorization header must use Bearer <token> format"
        });
    }

    const token = bearerMatch[1];
    let decoded;

    try {
        decoded = jwt.verify(token, process.env.SECRET);
    } catch (error) {
        return res.status(401).json({
            message: error.name === "TokenExpiredError"
                ? "Token has expired"
                : "Invalid token"
        });
    }

    if (!decoded.id) {
        return res.status(401).json({
            message: "Invalid token"
        });
    }

    try {
        const user = await User.findById(decoded.id).select("role").lean();
        if (!user) {
            return res.status(401).json({
                message: "Account no longer exists"
            });
        }

        req.token = { ...decoded, role: user.role };
        return next();
    } catch (error) {
        console.error("AUTHENTICATION ACCOUNT LOOKUP ERROR:", error.name);
        return res.status(503).json({
            message: "Unable to verify account permissions"
        });
    }
};

module.exports = authentication;
