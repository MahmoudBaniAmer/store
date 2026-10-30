
const express = require("express");
const categoryRouter = require("./routers/categoryRouter");
const cors = require("cors");
const connectDB = require("./models/db");
const productRouter = require("./routers/productRouter");
const app = express();
const orderRouter = require("./routers/orderRouter");

app.use(cors());
app.use(express.json());
app.use("/categories", categoryRouter);
app.use("/products", productRouter);
app.use("/orders", orderRouter);
const PORT = 5000;

const startServer = async () => {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.log("Server could not start because MongoDB connection failed.");
  }
};

startServer();
