import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import auth from "../middleware/auth.js";

const router = Router();

/**
 * GET CURRENT LOGGED-IN USER
 */
router.get("/me", auth, async (req, res) => {
  try {
    res.json(req.user);
  } catch (error) {
    console.error("AUTH ME ERROR:", error);
    res.status(500).json({ message: "Failed to fetch user" });
  }
});

/**
 * GET ALL USERS
 */
router.get("/users", auth, async (req, res) => {
  try {
    const users = await User.find({}, "username _id email isOnline avatar").sort({
      username: 1,
    });
    res.json(users);
  } catch (error) {
    console.error("FETCH USERS ERROR:", error);
    res.status(500).json({ message: "Failed to load users" });
  }
});

/**
 * REGISTER
 */
router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: normalizedEmail });
    
    if (existingUser) {
      return res.status(409).json({ message: "This email is already registered." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      username: username.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      isOnline: true 
    });

    const token = jwt.sign(
      { id: newUser._id },
      process.env.JWT_SECRET || "default_secret",
      { expiresIn: "1d" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production", 
    });

    // UPDATED: Sending token in JSON so React can save it to localStorage
    res.status(201).json({
      token, 
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
      },
    });
  } catch (error) {
    console.error("REGISTER ERROR:", error);
    res.status(500).json({ message: "Registration failed." });
  }
});

/**
 * LOGIN
 */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    user.isOnline = true;
    await user.save();

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET || "default_secret",
      { expiresIn: "1d" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    // UPDATED: Sending token in JSON so React can save it to localStorage
    res.json({
      token, 
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("LOGIN ERROR:", error);
    res.status(500).json({ message: "Login failed" });
  }
});

/**
 * LOGOUT
 */
router.post("/logout", auth, async (req, res) => {
  try {
    // req.user.id comes from your auth middleware
    await User.findByIdAndUpdate(req.user.id, { isOnline: false });
    res.clearCookie("token");
    res.json({ message: "Logged out successfully" });
  } catch (error) {
    res.status(500).json({ message: "Logout failed" });
  }
});

export default router;