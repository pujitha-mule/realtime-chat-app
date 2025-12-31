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
 */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.error("Unauthorized! Clearing session...");
      localStorage.clear();
      if (!window.location.pathname.includes("/login")) {
        window.location.replace("/login");
      }
    }
    return Promise.reject(error);
  }
);

/* ============================================================
    1️⃣ AUTHENTICATION
   ============================================================ */
export const login = (data) => api.post("/auth/login", data);
export const register = (data) => api.post("/auth/register", data);
export const getAllUsers = () => api.get("/auth/users");

/* ============================================================
    2️⃣ ROOMS / CHANNELS 
   ============================================================ */
// Get all rooms (public + those user is a member of)
export const getMyRooms = () => api.get("/rooms");

// Create a new public or private room
export const createRoom = (data) => api.post("/rooms", data);

// ✅ FIXED: Matches router.post("/join-public/:roomId")
export const joinRoomById = (roomId) => api.post(`/rooms/join-public/${roomId}`);

// ✅ FIXED: Matches router.post("/join-code") and sends code in the BODY
// This was likely the reason second accounts couldn't join.
export const joinRoomByCode = (inviteCode) => api.post("/rooms/join-code", { 
  code: inviteCode 
});

// Create/Fetch a 1-on-1 Direct Message room
export const startPrivateChat = (targetUserId) => api.post("/rooms/private", { targetUserId });

/* ============================================================
    3️⃣ MESSAGING & REAL-TIME
   ============================================================ */
export const getMessages = (roomId) => api.get(`/messages/${roomId}`);
export const sendMessage = (data) => api.post("/messages", data);
export const uploadFile = (formData) => api.post("/messages/upload", formData, {
  headers: { "Content-Type": "multipart/form-data" }
});

/* ============================================================
    4️⃣ MESSAGE ACTIONS
   ============================================================ */
export const deleteMessage = (messageId) => api.delete(`/messages/${messageId}`);
export const editMessage = (messageId, content) => api.put(`/messages/${messageId}`, { content });

export default api;