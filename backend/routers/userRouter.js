const express = require("express");
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

userRouter.post("/register", createUser);
userRouter.post("/login", login);
userRouter.post("/google", googleLogin);

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