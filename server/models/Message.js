import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      // System messages (like "User joined") don't need a sender
      required: function() { return !this.isSystem; }, 
    },
    content: {
      type: String,
      trim: true,
      // Only required if it's a standard text message
      required: function() { return this.type === "text"; } 
    },
    type: {
      type: String,
      enum: ["text", "image", "file"],
      default: "text",
    },
    fileUrl: {
      type: String,
      default: "",
      // Required only if the message is an image or a file
      required: function() { return this.type !== "text" && !this.isSystem; }
    },
    fileName: {
      type: String,
      default: "",
    },
    isSystem: {
      type: Boolean,
      default: false,
    },
    isEdited: {
      type: Boolean,
      default: false,
    }
  },
  {
    timestamps: true, // Automatically manages createdAt and updatedAt
  }
);

/**
 * 🚀 PERFORMANCE OPTIMIZATION
 * This compound index is critical. It allows MongoDB to instantly find 
 * messages for a specific room sorted by time, rather than scanning 
 * the entire collection.
 */
messageSchema.index({ roomId: 1, createdAt: 1 });

const Message = mongoose.model("Message", messageSchema);
export default Message;