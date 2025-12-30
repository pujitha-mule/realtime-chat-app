import axios from "axios";

/**
 * AXIOS INSTANCE
 * Points to your Node/Express server
 */
const api = axios.create({
  baseURL: "http://localhost:5000/api",
  withCredentials: true, 
});

/**
 * REQUEST INTERCEPTOR: Automatically attach JWT token
 * This ensures every request from Step 2 to Step 6 has the User Identity.
 */
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * RESPONSE INTERCEPTOR: Global Error Handling (Auto-Logout)
 * Fixes the issue where the app stays "stuck" if the token expires.
 */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.error("Unauthorized! Clearing session...");
      localStorage.clear();
      // Redirect using window.location to force a full app reset
      if (!window.location.pathname.includes("/login")) {
        window.location.replace("/login");
      }
    }
    return Promise.reject(error);
  }
);

/* ============================================================
    1️⃣ AUTHENTICATION (Step 1)
   ============================================================ */
export const login = (data) => api.post("/auth/login", data);
export const register = (data) => api.post("/auth/register", data);
export const getAllUsers = () => api.get("/auth/users");

/* ============================================================
    2️⃣ ROOMS / CHANNELS (Step 3 & 6)
   ============================================================ */
// Get only rooms the user is a member of
export const getMyRooms = () => api.get("/rooms");

// Create a new public or private room
export const createRoom = (data) => api.post("/rooms", data);

// Join a public room via its ID (Step 3)
export const joinRoomById = (roomId) => api.post(`/rooms/join/${roomId}`);

// Join a private room via Invite Code (Step 6)
export const joinRoomByCode = (inviteCode) => api.post(`/rooms/join-code/${inviteCode}`);

// Create/Fetch a 1-on-1 Direct Message room (Step 2)
export const startPrivateChat = (targetUserId) => api.post("/rooms/private", { targetUserId });

/* ============================================================
    3️⃣ MESSAGING & REAL-TIME (Step 4 & 5)
   ============================================================ */
// Load history when entering a room
export const getMessages = (roomId) => api.get(`/messages/${roomId}`);

// Standard text message
export const sendMessage = (data) => api.post("/messages", data);

// File/Image upload (Requires FormData)
export const uploadFile = (formData) => api.post("/messages/upload", formData, {
  headers: { "Content-Type": "multipart/form-data" }
});

/* ============================================================
    4️⃣ MESSAGE ACTIONS
   ============================================================ */
export const deleteMessage = (messageId) => api.delete(`/messages/${messageId}`);
export const editMessage = (messageId, content) => api.put(`/messages/${messageId}`, { content });

export default api;