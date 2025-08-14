// Import required packages
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config(); // Load the .env file

// Import User model
const User = require("./models/User");

// Create express app
const app = express();
app.use(cors());
app.use(express.json()); // Allows your app to accept JSON

// Connect to MongoDB using the URI from .env
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log("✅ MongoDB connected successfully");
})
.catch((err) => {
  console.error("❌ MongoDB connection error:", err);
});

// Example route
app.get("/", (req, res) => {
  res.send("🎉 Hello from Sujal's backend server!");
});

// Products route
app.get("/products", (req, res) => {
  res.json([
    { name: "Handmade Soap", price: 12.5 },
    { name: "Wooden Bowl", price: 30 }
  ]);
});

// Contact form route (POST)
app.post("/contact", (req, res) => {
  res.send("📩 Contact form submitted");
});

// Users route (GET)
app.get("/users", async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Error fetching users" });
  }
});

// Create a new user (POST)
app.post("/users", async (req, res) => {
  try {
    const { name, email, password, phone, role } = req.body;

    if (!name || !email || !password || !phone || !role) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const newUser = new User({
      name,
      email,
      password, // Later: hash this
      phone,
      role,
      isVerified: false
    });

    await newUser.save();
    res.status(201).json({ message: "User created successfully", user: newUser });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

console.log("Hello GitHub!");
