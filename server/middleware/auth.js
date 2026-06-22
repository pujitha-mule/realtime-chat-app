import jwt from "jsonwebtoken";
import User from "../models/User.js";

const auth = async (req, res, next) => {
  try {
    let token;

    // 1️⃣ Prefer HTTP-only cookie (Best for security)
    if (req.cookies?.token) {
      token = req.cookies.token;
    }

    // 2️⃣ Fallback: Authorization header (Standard for JWT/Mobile)
    if (!token && req.headers.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }

    // 3️⃣ No token → unauthenticated
    if (!token) {
      return res.status(401).json({ message: "Not authenticated. Please login." });
    }

    // 4️⃣ Verify token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "default_secret"
    );

    // 5️⃣ Fetch user from MongoDB
    // Removed .lean() to ensure req.user is a full Mongoose document 
    // so that req.user._id is always available as an ObjectId.
    const user = await User.findById(decoded.id).select("-password");
    
    if (!user) {
      return res.status(401).json({ message: "User no longer exists" });
    }

    // 6️⃣ Attach user to request
    // req.user will be the Mongoose document
    // req.user.id will be the string version for easy comparison
    req.user = user;
    req.user.id = user._id.toString(); 

    next();
  } catch (error) {
    console.error("AUTH MIDDLEWARE ERROR:", error.message);

    // Specific error handling for better UX
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Session expired. Please login again." });
    }

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ message: "Invalid token structure." });
    }

    return res.status(401).json({ message: "Authentication failed" });
  }
};

export default auth;
