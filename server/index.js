import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";
import cookieParser from "cookie-parser";

// Import Room model
import Room from "./models/Room.js";

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

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// --- 3. MONGODB CONNECTION ---
mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("✅ MongoDB Connected Successfully");
    try {
      await Room.collection.dropIndex("inviteCode_1");
      console.log("✨ Room Index Fix: Old inviteCode index dropped.");
    } catch (e) {
      console.log("ℹ️ Room Index Fix: No cleanup needed.");
    }
  })
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

  socket.on("setup", (userId) => {
    socket.join(userId);
    console.log(`🔔 User ${userId} joined personal notification room`);
  });

  socket.on("join_room", ({ roomId, username }) => {
    socket.join(roomId);
    console.log(`👤 ${username} joined room: ${roomId}`);
    
    socket.to(roomId).emit("receive_message", {
      roomId,
      content: `${username} has joined the room`,
      isSystem: true,
      type: "text",
      createdAt: new Date()
    });
  });

  // --- 🎥 AUDIO & VIDEO CALL EVENTS ---
  
  // 1. Account A starts a call
  socket.on("start_call", (data) => {
    // data: { roomId, callerName, type: 'video'|'audio' }
    console.log(`📞 Call initiated in ${data.roomId} by ${data.callerName}`);
    socket.to(data.roomId).emit("incoming_call", data);
  });

  // 2. Account B accepts or A cancels
  socket.on("end_call", (data) => {
    // data: { roomId }
    console.log(`🚫 Call ended in ${data.roomId}`);
    socket.to(data.roomId).emit("call_ended_signal");
  });

  // --- 💬 MESSAGE & TYPING ---

  socket.on("send_message", (data) => {
    io.to(data.roomId).emit("receive_message", data);
  });

  socket.on("typing", ({ roomId, username }) => {
    socket.to(roomId).emit("user_typing", { username });
  });

  socket.on("stop_typing", (data) => {
    const roomId = typeof data === 'string' ? data : data.roomId;
    socket.to(roomId).emit("user_stop_typing");
  });

  socket.on("disconnect", () => {
    console.log("❌ User Disconnected");
  });
});

// --- 5. API ROUTES ---
app.use("/api/auth", authRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/messages", messageRoutes);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));