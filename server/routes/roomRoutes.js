import { Router } from "express";
import Room from "../models/Room.js";
import auth from "../middleware/auth.js";
import Message from "../models/Message.js"; 

const router = Router();

/**
 * 1. GET ALL RELEVANT CHANNELS
 */
router.get("/", auth, async (req, res) => {
  try {
    const rooms = await Room.find({
      isActive: true, 
      $or: [
        { isPrivate: false }, 
        { "members.user": req.user.id } 
      ],
    })
      .sort({ updatedAt: -1 })
      .populate("members.user", "username email avatar") 
      .populate("joinRequests.user", "username email avatar")
      .populate("lastMessage");

    res.json(rooms);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch rooms", error: error.message });
  }
});

/**
 * 2. JOIN BY 6-DIGIT INVITE CODE
 */
router.post("/join-code/:inviteCode", auth, async (req, res) => {
  try {
    const { inviteCode } = req.params;
    const cleanCode = inviteCode.toUpperCase().trim();

    const room = await Room.findOneAndUpdate(
      { inviteCode: cleanCode, isActive: true },
      { 
        $addToSet: { members: { user: req.user.id, role: 'member', joinedAt: new Date() } },
        $pull: { joinRequests: { user: req.user.id } } 
      },
      { new: true } 
    ).populate("members.user", "username email avatar");

    if (!room) return res.status(404).json({ message: "Invalid code or Room not found." });
    
    if (room.owner.toString() === req.user.id) return res.status(400).json({ message: "You are already the owner." });

    await Message.create({
      room: room._id,
      sender: req.user.id,
      text: `${req.user.username} joined via invite code`,
      isSystemMessage: true, 
    });

    res.json({ message: "Joined successfully!", room });
  } catch (error) {
    res.status(500).json({ message: "Server error during code join" });
  }
});

/**
 * 3. JOIN BY ROOM ID (UPDATED VERSION)
 */
router.post("/join-id/:roomId", auth, async (req, res) => {
  try {
    const roomId = req.params.roomId.trim(); // Cleans the ID from the URL
    
    // Find the room first
    const room = await Room.findOne({ _id: roomId, isActive: true });

    if (!room) {
      return res.status(404).json({ message: "Room not found. It may have been deleted." });
    }

    // Check if user is already a member
    const isMember = room.members.some(m => m.user.toString() === req.user.id);
    if (isMember) {
      return res.status(400).json({ message: "You are already a member of this room." });
    }

    // Add user to members list
    room.members.push({ user: req.user.id, role: 'member', joinedAt: new Date() });
    
    // Clear any pending join requests
    room.joinRequests = room.joinRequests.filter(r => r.user.toString() !== req.user.id);
    
    await room.save();

    // Create the system message
    await Message.create({
      room: room._id,
      sender: req.user.id,
      text: `${req.user.username} joined the chat`,
      isSystemMessage: true, 
    });

    const populatedRoom = await room.populate("members.user", "username email avatar");
    res.json({ message: "Joined successfully", room: populatedRoom });
  } catch (error) {
    console.error("Join ID Error:", error);
    res.status(400).json({ message: "Invalid Room ID format." });
  }
});

/**
 * 4. CREATE ROOM
 */
router.post("/", auth, async (req, res) => {
  try {
    const { name, isPrivate, showHistoryToNewMembers } = req.body;
    const room = await Room.create({
      name: name?.trim() || (isPrivate ? "Private Group" : "Unnamed Room"),
      isPrivate: !!isPrivate,
      isActive: true,
      owner: req.user.id,
      createdBy: req.user.id,
      members: [{ user: req.user.id, role: 'admin', joinedAt: new Date() }],
      showHistoryToNewMembers: !!showHistoryToNewMembers
    });
    res.status(201).json(room);
  } catch (error) {
    res.status(500).json({ message: "Room creation failed" });
  }
});

/**
 * 5. DELETE ROOM
 */
router.delete("/:roomId", auth, async (req, res) => {
  try {
    const room = await Room.findById(req.params.roomId);
    if (!room) return res.status(404).json({ message: "Room not found" });

    if (room.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: "Only owners can delete rooms" });
    }

    await Room.findByIdAndDelete(req.params.roomId);
    await Message.deleteMany({ room: req.params.roomId }); 

    res.json({ message: "Room deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Delete failed" });
  }
});

/**
 * 6. DIRECT MESSAGES
 */
router.post("/private", auth, async (req, res) => {
  try {
    const { targetUserId } = req.body;
    let room = await Room.findOne({
      isDirectMessage: true,
      "members.user": { $all: [req.user.id, targetUserId] }
    });

    if (!room) {
      room = await Room.create({
        name: "Direct Message",
        isPrivate: true,
        isDirectMessage: true,
        isActive: true,
        owner: req.user.id,
        createdBy: req.user.id,
        members: [
          { user: req.user.id, role: 'member', joinedAt: new Date() },
          { user: targetUserId, role: 'member', joinedAt: new Date() }
        ],
      });
    }
    res.json(await room.populate("members.user", "username email avatar"));
  } catch (error) {
    res.status(500).json({ message: "Error starting chat" });
  }
});

/**
 * 7. APPROVE REQUESTS
 */
router.put("/:roomId/requests", auth, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { requestId, status } = req.body;
    const room = await Room.findById(roomId);

    if (room.owner.toString() !== req.user.id) return res.status(403).json({ message: "Forbidden" });

    if (status === 'approved') {
      room.members.push({ user: requestId, joinedAt: new Date(), role: 'member' });
    }
    room.joinRequests = room.joinRequests.filter(r => r.user.toString() !== requestId);
    await room.save();
    res.json(await room.populate("members.user joinRequests.user", "username email avatar"));
  } catch (error) {
    res.status(500).json({ message: "Action failed" });
  }
});

export default router;