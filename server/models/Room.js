import mongoose from "mongoose";

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
      required: false,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
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
          enum: ["member", "admin"],
          default: "member",
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
    inviteCode: {
      type: String,
      unique: true,
      index: true,
      sparse: true,
      uppercase: true, // 🚨 CRITICAL: Forces any string saved here to be Uppercase in DB
      trim: true
    },
    showHistoryToNewMembers: {
      type: Boolean,
      default: true,
    },
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
    },
  },
  { timestamps: true }
);

/**
 * --- PRE-SAVE MIDDLEWARE ---
 * Strict management of invite codes to ensure matches
 */
roomSchema.pre("save", async function (next) {
  // 1. Clean up codes for rooms that shouldn't have them
  if (this.isDirectMessage || !this.isPrivate) {
    this.inviteCode = undefined;
    return next();
  }

  // 2. Generate Uppercase Alphanumeric code ONLY if it doesn't exist
  if (this.isPrivate && !this.inviteCode) {
    let code;
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 20;

    while (!isUnique && attempts < maxAttempts) {
      // Generate 6 chars, uppercase them immediately
      code = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      const existing = await this.constructor.findOne({ inviteCode: code });
      if (!existing) {
        isUnique = true;
      }
      attempts++;
    }
    
    if (isUnique) {
      this.inviteCode = code;
      console.log(`✨ Generated Invite Code: ${this.inviteCode} for room: ${this.name}`);
    } else {
      return next(new Error("Failed to generate a unique invite code."));
    }
  } else if (this.inviteCode) {
    // 3. If a code exists (from manual entry or previous save), ensure it's Uppercase
    this.inviteCode = this.inviteCode.toUpperCase();
  }
  
  next();
});

const Room = mongoose.models.Room || mongoose.model("Room", roomSchema);

export default Room;