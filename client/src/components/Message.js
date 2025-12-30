// routes/message.js
router.get("/:roomId", auth, async (req, res) => {
  try {
    const room = await Room.findById(req.params.roomId);
    if (!room) return res.status(404).json({ message: "Room not found" });

    let query = { roomId: req.params.roomId };

    // --- ENHANCED HISTORY LOGIC ---
    
    // 1. Owners always see everything.
    // 2. Direct Messages (1-on-1) usually always show history.
    // 3. If history is disabled, filter for normal members.
    const isOwner = room.owner.toString() === req.user.id;

    if (!isOwner && !room.isDirectMessage && !room.showHistoryToNewMembers) {
      const memberInfo = room.members.find(
        (m) => m.user.toString() === req.user.id
      );

      if (memberInfo) {
        // Only show messages from the moment they joined
        query.createdAt = { $gte: memberInfo.joinedAt };
      }
    }

    const messages = await Message.find(query)
      .populate("sender", "username avatar") // Included avatar for your UI
      .sort({ createdAt: 1 });
      
    res.json(messages);
  } catch (err) {
    console.error("Fetch Messages Error:", err);
    res.status(500).json({ message: "Error fetching messages" });
  }
});