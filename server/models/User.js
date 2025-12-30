import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  username: { 
    type: String, 
    required: true, 
    unique: true, 
    trim: true 
  },
  email: { 
    type: String, 
    required: true, 
    unique: true, 
    lowercase: true, 
    trim: true 
  },
  password: { 
    type: String, 
    required: true 
  },
  // Add this for Individual 1-on-1 Chat UI (showing who is online)
  isOnline: {
    type: Boolean,
    default: false
  },
  // Add this to show a user's picture in the ChatBox or RoomList
  avatar: {
    type: String,
    default: "" 
  }
}, { timestamps: true });

// Check if the model already exists before creating it (prevents common HMR errors)
const User = mongoose.models.User || mongoose.model("User", userSchema);

export default User;