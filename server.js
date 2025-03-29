const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const { errorHandler } = require("./middleware/errorMiddleware");

dotenv.config();
const app = express();

// ✅ Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// ✅ Connect to MongoDB
connectDB();

// ✅ Routes
app.use("/auth", require("./routes/authRoutes"));
app.use("/chat", require("./routes/chatRoutes"));

app.use(errorHandler)

// ✅ Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));


process.on("unhandledRejection", (err, promise) => {
    console.log(`Error: ${err.message}`);
  server.close(() => process.exit(1));
})