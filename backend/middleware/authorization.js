
const authorization = (requiredRole) => {

    return (req, res, next) => {

        // Check user role
        if (req.token.role !== requiredRole) {
            return res.status(403).json({
                message: "You do not have permission to perform this action"
            });
        }

        // User has permission
        next();
    };
};

module.exports = authorization;
