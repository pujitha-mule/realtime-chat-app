import mongoose from "mongoose";
import crypto from "crypto";

const roomSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: function () {
        return !this.isDirectMessage;
      },
      trim: true,
    },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    members: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
        role: { 
          type: String, 
          enum: ['member', 'admin'], 
          default: 'member' 
        }
      },
    ],

    joinRequests: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        requestedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    isPrivate: {
      type: Boolean,
      default: false,
    },

    isDirectMessage: {
      type: Boolean,
      default: false,
    },

    /**
     * ✅ 6-DIGIT INVITE CODE
     * Added 'sparse: true' to prevent crashes with old data.
     */
    inviteCode: {
      type: String,
      unique: true,
      uppercase: true,
      index: true,
      sparse: true, 
    },

    showHistoryToNewMembers: {
      type: Boolean,
      default: false,
    },

    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
    },
  },
  { timestamps: true }
);

/**
 * ✅ MIDDLEWARE: GENERATE 6-CHARACTER CODE
 */
roomSchema.pre("save", function (next) {
  if (!this.isDirectMessage && !this.inviteCode) {
    this.inviteCode = crypto
      .randomBytes(3)
      .toString("hex")
      .toUpperCase();
  }
  next();
});

// Optimized Indexes
roomSchema.index({ "members.user": 1 });
roomSchema.index({ inviteCode: 1 });
roomSchema.index({ isDirectMessage: 1 });

export default mongoose.model("Room", roomSchema);