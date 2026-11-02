const jwt = require("jsonwebtoken");

const authentication = (req, res, next) => {
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

    req.token = decoded;
    next();
};

module.exports = authentication;
