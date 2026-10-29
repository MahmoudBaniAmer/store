
const express = require("express");
const cors = require("cors");
const connectDB = require("./models/db");

const app = express();

app.use(cors());
app.use(express.json());

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
