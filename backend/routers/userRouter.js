
const express = require("express");

const userRouter = express.Router();

const {
    createUser,
    login
} = require("../controllers/userController");

// Register
userRouter.post("/register", createUser);

// Login
userRouter.post("/login", login);

module.exports = userRouter;
