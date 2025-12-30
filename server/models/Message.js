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
      // If it's a system message, there is no sender.
      required: function() { return !this.isSystem; }, 
    },
    content: {
      type: String,
      trim: true,
      // Required only for text messages; not required if it's just a file/image
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
    },
    fileName: {
      type: String,
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
    timestamps: true, // This provides the 'createdAt' needed for history filtering
  }
);

// Indexes improve speed for chat history and finding the most recent message
messageSchema.index({ roomId: 1, createdAt: 1 });

export default mongoose.model("Message", messageSchema);