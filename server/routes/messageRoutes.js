import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import Message from "../models/Message.js";
import auth from "../middleware/auth.js";
import Room from "../models/Room.js";

const router = Router();

// Ensure upload directory exists
const uploadDir = "uploads/";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer Config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, uniqueName);
  },
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// --------------------
// 1. POST Message (Normal Text)
// --------------------
router.post("/", auth, async (req, res) => {
  try {
    const { roomId, content } = req.body;
    
    const message = await Message.create({
      roomId,
      sender: req.user.id,
      content,
      type: "text"
    });

    await Room.findByIdAndUpdate(roomId, { lastMessage: message._id });

    const populatedMessage = await message.populate("sender", "username email avatar");
    res.status(201).json(populatedMessage);
  } catch (error) {
    console.error("Text Msg Error:", error);
    res.status(500).json({ message: "Failed to send message" });
  }
});

// --------------------
// 2. GET Messages (With History Filtering)
// --------------------
router.get("/:roomId", auth, async (req, res) => {
  try {
    const room = await Room.findById(req.params.roomId);
    if (!room) return res.status(404).json({ message: "Room not found" });

    const membership = room.members.find(m => m.user.toString() === req.user.id);
    const isOwner = room.owner?.toString() === req.user.id;
    
    if (!membership && !isOwner) {
      return res.status(403).json({ message: "Access denied. Not a member." });
    }

    let query = { roomId: req.params.roomId };

    // History Logic: Filter messages if room setting is enabled
    if (!isOwner && !room.isDirectMessage && !room.showHistoryToNewMembers && membership) {
      query.createdAt = { $gte: membership.joinedAt };
    }

    const messages = await Message.find(query)
      .sort({ createdAt: 1 }) 
      .populate("sender", "username email avatar");

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch messages" });
  }
});

// --------------------
// 3. UPLOAD file / image (Refined for your Schema)
// --------------------
router.post("/upload", auth, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const { roomId, type } = req.body; 

    // Uses your schema's fileUrl and fileName fields
    const message = await Message.create({
      roomId,
      sender: req.user.id,
      content: req.file.originalname, // Keep original name as text content
      fileName: req.file.originalname, 
      fileUrl: `/uploads/${req.file.filename}`, 
      type: type || (req.file.mimetype.startsWith("image/") ? "image" : "file"), 
    });

    await Room.findByIdAndUpdate(roomId, { lastMessage: message._id });

    const populatedMessage = await message.populate("sender", "username email avatar");
    res.status(201).json(populatedMessage);
  } catch (error) {
    res.status(500).json({ message: "File upload failed" });
  }
});

// --------------------
// 4. DELETE Message (With lastMessage Cleanup)
// --------------------
router.delete("/:messageId", auth, async (req, res) => {
  try {
    const message = await Message.findById(req.params.messageId);
    if (!message) return res.status(404).json({ message: "Message not found" });

    const room = await Room.findById(message.roomId);
    const isSender = message.sender.toString() === req.user.id;
    const isOwner = room?.owner?.toString() === req.user.id;

    if (!isSender && !isOwner) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    await Message.findByIdAndDelete(req.params.messageId);

    // If we deleted the 'lastMessage', find the next most recent one
    if (room && room.lastMessage?.toString() === req.params.messageId) {
      const prevMessage = await Message.findOne({ roomId: room._id }).sort({ createdAt: -1 });
      await Room.findByIdAndUpdate(room._id, { lastMessage: prevMessage ? prevMessage._id : null });
    }

    res.json({ message: "Deleted", messageId: req.params.messageId });
  } catch (error) {
    res.status(500).json({ message: "Delete failed" });
  }
});

export default router;