
const jwt = require("jsonwebtoken");

const authentication = (req, res, next) => {
    // Get Authorization header
    const authHeader = req.headers.authorization;

    // Check if token exists
    if (!authHeader) {
        return res.status(401).json({
            message: "Please login first"
        });
    }

    // Extract token from Bearer
    const token = authHeader.split(" ")[1];

    if (!token) {
        return res.status(401).json({
            message: "Token is missing"
        });
    }

    try {
        // Verify token
        const decoded = jwt.verify(token, process.env.SECRET);

        // Attach decoded data to request
        req.token = decoded;

        // Continue to next middleware or controller
        next();

    } catch (error) {
        return res.status(403).json({
            message: "Invalid or expired token"
        });
    }
};

module.exports = authentication;
