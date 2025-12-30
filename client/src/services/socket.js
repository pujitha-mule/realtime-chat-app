import { io } from "socket.io-client";

const URL = "http://localhost:5000";

// We initialize the socket but don't connect immediately
// This allows us to send the token during the handshake
const socket = io(URL, {
  autoConnect: false,
  auth: (cb) => {
    // This function runs every time the socket tries to connect
    cb({
      token: localStorage.getItem("token")
    });
  }
});

// For debugging in development
socket.on("connect_error", (err) => {
  console.error("Socket Connection Error:", err.message);
});

export default socket;