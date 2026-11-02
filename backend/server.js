
require("dotenv").config();

const express = require("express");
const cors = require("cors");

const categoryRouter = require("./routers/categoryRouter");
const productRouter = require("./routers/productRouter");
const orderRouter = require("./routers/orderRouter");
const userRouter = require("./routers/userRouter");
const reviewRouter = require("./routers/reviewRouter");
const adminRouter = require("./routers/adminRouter");
const chatRouter = require("./routers/chatRouter");

const { connectDB } = require("./models/db");

const app = express();
const PORT = Number(process.env.PORT) || 5000;
const configuredOrigins = (process.env.CLIENT_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedOrigins = configuredOrigins.length > 0
  ? configuredOrigins
  : process.env.NODE_ENV === "production"
    ? []
    : ["http://localhost:5173"];

// Middlewares
app.use(cors({
  origin(origin, callback) {
    const isLocalDevelopmentOrigin =
      process.env.NODE_ENV !== "production" &&
      /^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/.test(origin || "");

    if (!origin || allowedOrigins.includes(origin) || isLocalDevelopmentOrigin) {
      return callback(null, true);
    }

    return callback(new Error("Origin is not allowed by CORS"));
  }
}));
app.use(express.json());

// Routes
app.use("/categories", categoryRouter);
app.use("/products", productRouter);
app.use("/orders", orderRouter);
app.use("/reviews", reviewRouter);
app.use("/api/auth", userRouter);
app.use("/api/admin", adminRouter);
app.use("/api/chat", chatRouter);

// Start Server
const startServer = async () => {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

  } catch (error) {
    console.log("Server startup error:", error.message);
  }
};

startServer();
