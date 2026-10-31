const express = require("express");
const userRouter = express.Router();

const {
    createUser,
    login,
    getUsers
} = require("../controllers/userController");

const authentication = require("../middleware/authentication");
const authorization = require("../middleware/authorization");

userRouter.post("/register", createUser);
userRouter.post("/login", login);

userRouter.get(
    "/users",
    authentication,
    authorization("admin"),
    getUsers
);

module.exports = userRouter;