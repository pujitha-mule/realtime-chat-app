import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";
import cookieParser from "cookie-parser";

// Import Routes
import roomRoutes from "./routes/roomRoutes.js"; 
import authRoutes from "./routes/authRoutes.js"; 
import messageRoutes from "./routes/messageRoutes.js";

dotenv.config();

const app = express();
const server = http.createServer(app);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- 1. MIDDLEWARE ---
app.use(cors({
  origin: ["http://localhost:3000", "http://localhost:3001", process.env.CLIENT_URL].filter(Boolean), 
  credentials: true,                
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());
app.use(cookieParser()); 

// 2. SERVE STATIC FILES
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// --- 3. MONGODB CONNECTION ---
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => console.error("❌ MongoDB CONNECTION ERROR:", err.message));

// --- 4. SOCKET.IO ---
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000", "http://localhost:3001", process.env.CLIENT_URL].filter(Boolean), 
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

app.set("socketio", io);



io.on("connection", (socket) => {
  console.log(`📡 User Connected: ${socket.id}`);

  // Setup private room for user notifications
  socket.on("setup", (userId) => {
    socket.join(userId);
    console.log(`🔔 User ${userId} joined personal notification room`);
  });

  // --- JOIN ROOM LOGIC ---
  socket.on("join_room", ({ roomId, username }) => {
    socket.join(roomId);
    console.log(`👤 ${username} joined room: ${roomId}`);
    
    // 1. Existing Message Logic
    socket.to(roomId).emit("receive_message", {
      roomId,
      content: `${username} has joined the room`,
      isSystem: true,
      type: "text",
      createdAt: new Date()
    });

    // 2. Your specific requested notification
    socket.to(roomId).emit("user_joined_notify", `${username} joined the chat`);
  });

  // Message Handling
  socket.on("send_message", (data) => {
    io.to(data.roomId).emit("receive_message", data);
  });

  // --- TYPING INDICATORS ---
  socket.on("typing", ({ roomId, username }) => {
    // Sends to everyone in the room except the sender
    socket.to(roomId).emit("user_typing", { username });
  });

  socket.on("stop_typing", (data) => {
    // Supports both formats: "roomId" or { roomId: "id" }
    const roomId = typeof data === 'string' ? data : data.roomId;
    socket.to(roomId).emit("user_stop_typing");
    socket.to(roomId).emit("user_stopped"); // Matches your join/typing block
  });

  socket.on("disconnect", () => {
    console.log("❌ User Disconnected");
  });
});

// --- 5. API ROUTES ---
app.use("/api/auth", authRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/messages", messageRoutes);

// --- 6. LISTEN ---
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));