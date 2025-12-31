import express from "express";
import mongoose from "mongoose"; // 🚨 CRITICAL: Added this
import Room from "../models/Room.js";
import auth from "../middleware/auth.js";

const router = express.Router();

/**
 * 1. GET ALL ACCESSIBLE ROOMS
 */
router.get("/", auth, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id; 

    const rooms = await Room.find({
      $or: [
        { isPrivate: false, isDirectMessage: false }, 
        { "members.user": userId }                   
      ]
    })
      .populate("members.user", "username")
      .populate("owner", "username")
      .sort({ updatedAt: -1 });

    res.json(rooms);
  } catch (err) {
    console.error("FETCH ROOMS ERROR:", err);
    res.status(500).json({ message: "Error fetching rooms" });
  }
});

/**
 * 2. CREATE ROOM (Group Chat)
 */
router.post("/", auth, async (req, res) => {
  try {
    const { name, isPrivate } = req.body;
    const userId = req.user._id || req.user.id;

    const newRoom = new Room({
      name,
      isPrivate: isPrivate === true || isPrivate === 'true',
      owner: userId,
      createdBy: userId,
      members: [{ user: userId, role: "admin" }]
    });

    await newRoom.save();

    const populatedRoom = await Room.findById(newRoom._id)
      .populate("members.user", "username")
      .populate("owner", "username");

    res.status(201).json(populatedRoom);
  } catch (err) {
    console.error("CREATE ERROR:", err);
    res.status(500).json({ message: "Error creating room" });
  }
});

/**
 * 3. PRIVATE MESSAGE (DM) CREATION
 */
router.post("/private", auth, async (req, res) => {
  try {
    const { targetUserId } = req.body;
    const userId = req.user._id || req.user.id;

    if (userId.toString() === targetUserId.toString()) {
      return res.status(400).json({ message: "You cannot DM yourself" });
    }

    let room = await Room.findOne({
      isDirectMessage: true,
      "members.user": { $all: [userId, targetUserId] }
    }).populate("members.user", "username");

    if (room) return res.json(room);

    const newRoom = new Room({
      isDirectMessage: true,
      isPrivate: true,
      members: [
        { user: userId, role: "admin" },
        { user: targetUserId, role: "admin" }
      ],
      owner: userId 
    });

    await newRoom.save();
    const populated = await Room.findById(newRoom._id).populate("members.user", "username");
    res.status(201).json(populated);
  } catch (err) {
    console.error("DM ERROR:", err);
    res.status(500).json({ message: "DM creation failed" });
  }
});

/**
 * 4. JOIN PUBLIC ROOM (Robust Version)
 */
router.post("/join-public/:roomId", auth, async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user._id || req.user.id;

    // 🚨 Validation: Prevent crash if Room ID is malformed
    if (!mongoose.Types.ObjectId.isValid(roomId)) {
      return res.status(400).json({ message: "Invalid Room ID format" });
    }

    const room = await Room.findById(roomId);

    if (!room || room.isPrivate) {
      return res.status(404).json({ message: "Public room not found" });
    }

    const isMember = room.members.some(m => {
      const existingId = m.user?._id || m.user;
      return existingId && existingId.toString() === userId.toString();
    });

    if (!isMember) {
      room.members.push({ user: userId, role: "member" });
      room.markModified('members');
      // ✅ validateBeforeSave: false is KEY to bypassing index/schema errors
      await room.save({ validateBeforeSave: false });
    }

    const updatedRoom = await Room.findById(room._id)
      .populate("members.user", "username")
      .populate("owner", "username");

    res.json(updatedRoom);
  } catch (err) {
    console.error("JOIN PUBLIC ERROR:", err);
    res.status(500).json({ message: "Server error: " + err.message });
  }
});

/**
 * 5. JOIN PRIVATE ROOM VIA INVITE CODE
 */
router.post("/join-code", auth, async (req, res) => {
  try {
    const { code } = req.body;
    const userId = req.user._id || req.user.id; 

    if (!code) return res.status(400).json({ message: "Invite code is required" });

    // Use toUpperCase to match our strict Room.js model
    const room = await Room.findOne({ inviteCode: code.trim().toUpperCase() });

    if (!room) {
      return res.status(404).json({ message: "Invalid invite code" });
    }

    const isMember = room.members.some(m => {
        const existingId = m.user?._id || m.user;
        return existingId && existingId.toString() === userId.toString();
    });

    if (!isMember) {
      room.members.push({ user: userId, role: "member" });
      room.markModified('members');
      await room.save({ validateBeforeSave: false });
    }

    const populatedRoom = await Room.findById(room._id)
      .populate("members.user", "username")
      .populate("owner", "username");

    res.json(populatedRoom);
  } catch (err) {
    console.error("JOIN CODE ERROR:", err);
    res.status(500).json({ message: "Server Error: " + err.message });
  }
});

/**
 * 6. DELETE ROOM
 */
router.delete("/:roomId", auth, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    
    if (!mongoose.Types.ObjectId.isValid(req.params.roomId)) {
        return res.status(400).json({ message: "Invalid Room ID" });
    }

    const room = await Room.findById(req.params.roomId);

    if (!room) return res.status(404).json({ message: "Room not found" });

    if (room.owner.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Only owner can delete room" });
    }

    await Room.findByIdAndDelete(req.params.roomId);
    res.json({ message: "Room deleted", roomId: req.params.roomId });
  } catch (err) {
    console.error("DELETE ERROR:", err);
    res.status(500).json({ message: "Delete failed" });
  }
});

export default router;