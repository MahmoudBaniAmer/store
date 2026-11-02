const express = require("express");
const { rateLimit } = require("express-rate-limit");
const userRouter = express.Router();

const {
    createUser,
    login,
    googleLogin,
    getUsers,
    updateUserRole

} = require("../controllers/userController");

const authentication = require("../middleware/authentication");
const authorization = require("../middleware/authorization");

const registrationRateLimit = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many registration attempts. Please try again later." }
});
const authenticationRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many sign-in attempts. Please try again later." }
});

userRouter.post("/register", registrationRateLimit, createUser);
userRouter.post("/login", authenticationRateLimit, login);
userRouter.post("/google", authenticationRateLimit, googleLogin);

userRouter.get(
    "/users",
    authentication,
    authorization("admin"),
    getUsers
);
userRouter.patch(
    "/users/:id/role",
    authentication,
    authorization("admin"),
    updateUserRole
);

module.exports = userRouter;