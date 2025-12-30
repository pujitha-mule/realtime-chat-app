import { useEffect, useState, useCallback } from "react";
import api from "../services/api";
import ChatBox from "../components/ChatBox";
import RoomList from "../components/RoomList";
import socket from "../services/socket";
import { useNavigate } from "react-router-dom";

export default function Chat({ setAuth }) { 
  const [rooms, setRooms] = useState([]);
  const [users, setUsers] = useState([]);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const [isCreating, setIsCreating] = useState(false);
  const [newRoomData, setNewRoomData] = useState({
    name: "",
    isPrivate: false,
    showHistoryToNewMembers: true,
  });

  const navigate = useNavigate();

  /* ================= FETCH DATA HELPER ================= */
  const fetchData = useCallback(async () => {
    try {
      const [roomsRes, usersRes] = await Promise.all([
        api.get("/rooms"),
        api.get("/auth/users"),
      ]);
      setRooms(roomsRes.data);
      setUsers(usersRes.data);
    } catch (err) {
      console.error("Chat fetch error:", err);
      if (err.response?.status === 401) handleLogout();
    } finally {
      setLoading(false);
    }
  }, []);

  /* ================= LOGOUT ================= */
  const handleLogout = useCallback(() => {
    if (setAuth) {
      setAuth(null); 
    } else {
      localStorage.clear();
      window.location.href = "/login";
    }
    socket.disconnect();
  }, [setAuth]);

  /* ================= INITIAL LOAD ================= */
  useEffect(() => {
    const storedUser = localStorage.getItem("user");

    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
        socket.connect();
      } catch (e) {
        handleLogout();
      }
    }

    fetchData();

    return () => {
      socket.off("receive_message");
      socket.disconnect();
    };
  }, [handleLogout, fetchData]);

  /* ================= ROOM SYNC ================= */
  useEffect(() => {
    if (!currentRoom || !user) return;

    const roomId = currentRoom._id;

    socket.emit("join_room", {
      roomId,
      username: user.username,
    });

    api
      .get(`/messages/${roomId}`)
      .then((res) => setMessages(res.data))
      .catch((err) => console.error("Message fetch error:", err));

    const handleReceive = (msg) => {
      if (msg.roomId === roomId || msg.room === roomId) {
        setMessages((prev) => [...prev, msg]);
      }
    };

    socket.on("receive_message", handleReceive);

    return () => {
      socket.off("receive_message", handleReceive);
    };
  }, [currentRoom, user]);

  /* ================= SEND MESSAGE (Text & Files) ================= */
  const onSendMessage = async (content, file = null) => {
    if (!currentRoom) return;

    try {
      let res;
      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("roomId", currentRoom._id);
        res = await api.post("/messages/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" }
        });
      } else {
        res = await api.post("/messages", {
          roomId: currentRoom._id,
          content,
        });
      }
      socket.emit("send_message", res.data);
    } catch (err) {
      console.error("Send error:", err);
      alert("Failed to send message/file");
    }
  };

  /* ================= ROOM MANAGEMENT ================= */
  const handleDeleteRoom = async () => {
    if (window.confirm("Are you sure you want to delete this room for everyone?")) {
      try {
        await api.delete(`/rooms/${currentRoom._id}`);
        setRooms(rooms.filter(r => r._id !== currentRoom._id));
        setCurrentRoom(null);
      } catch (err) {
        alert("Failed to delete room");
      }
    }
  };

  const onJoinRoom = async (room) => {
    try {
      const res = await api.post(`/rooms/join-id/${room._id}`);
      alert(res.data.message || "Joined successfully!");
      
      // ✅ Refresh data so the room appears in "My Channels"
      await fetchData(); 
      
      if (res.data.room) setCurrentRoom(res.data.room);
    } catch (err) {
      if (err.response?.data?.message.includes("already")) {
        await fetchData(); // Refresh anyway to show it
        alert("You are already a member! Opening room...");
      } else {
        alert(err.response?.data?.message || "Failed to join room");
      }
    }
  };

  const downloadChatHistory = () => {
    if (!messages.length) return alert("No history to download");
    const fileContent = messages.map(msg => {
      const time = new Date(msg.createdAt).toLocaleTimeString();
      const sender = msg.sender?.username || "System";
      return `[${time}] ${sender}: ${msg.text || msg.content}`;
    }).join("\n");

    const blob = new Blob([fileContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${currentRoom.name}_History.txt`;
    link.click();
  };

  /* ================= CREATE & PRIVATE CHAT ================= */
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post("/rooms", newRoomData);
      setRooms((prev) => [res.data, ...prev]);
      setCurrentRoom(res.data);
      setIsCreating(false);
      setNewRoomData({ name: "", isPrivate: false, showHistoryToNewMembers: true });
      alert(`Room Created! Share this ID: ${res.data._id}`);
    } catch (err) {
      alert(err.response?.data?.message || "Room creation failed");
    }
  };

  const handleSelectUser = async (targetUser) => {
    try {
      const res = await api.post("/rooms/private", {
        targetUserId: targetUser._id,
      });
      setRooms((prev) =>
        prev.find((r) => r._id === res.data._id) ? prev : [res.data, ...prev]
      );
      setCurrentRoom(res.data);
      setIsCreating(false);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="vh-100 d-flex justify-content-center align-items-center">Loading…</div>;

  return (
    <div className="container-fluid p-0 bg-light" style={{ height: "100vh" }}>
      <div className="d-flex h-100 overflow-hidden">
        <RoomList
          rooms={rooms}
          users={users}
          currentUser={user}
          currentRoomId={currentRoom?._id}
          onSelectRoom={(room) => { setCurrentRoom(room); setIsCreating(false); }}
          onSelectUser={handleSelectUser}
          onJoinRoom={onJoinRoom}
          onRefresh={fetchData}
          onCreateRoom={() => setIsCreating(true)}
          onLogout={handleLogout}
        />

        <div className="flex-grow-1 bg-white d-flex flex-column">
          {isCreating ? (
            <div className="p-5 d-flex justify-content-center">
              <div className="card shadow-sm p-4" style={{ maxWidth: "500px", width: "100%" }}>
                <h3 className="mb-4 text-primary fw-bold">Create New Room</h3>
                <form onSubmit={handleCreateSubmit}>
                  <div className="mb-3">
                    <label className="form-label small fw-bold">Room Name</label>
                    <input className="form-control" value={newRoomData.name} onChange={(e) => setNewRoomData({ ...newRoomData, name: e.target.value })} required />
                  </div>
                  <div className="form-check form-switch mb-3">
                    <input className="form-check-input" type="checkbox" id="privateSwitch" checked={newRoomData.isPrivate} onChange={(e) => setNewRoomData({...newRoomData, isPrivate: e.target.checked})} />
                    <label className="form-check-label small" htmlFor="privateSwitch">Make Room Private</label>
                  </div>
                  <button type="submit" className="btn btn-primary w-100 py-2">Create Room</button>
                  <button type="button" className="btn btn-link w-100 mt-2 text-muted" onClick={() => setIsCreating(false)}>Cancel</button>
                </form>
              </div>
            </div>
          ) : currentRoom ? (
            <div className="d-flex flex-column h-100">
              <div className="d-flex justify-content-between align-items-center p-3 border-bottom bg-light">
                <div>
                  <h5 className="mb-0 fw-bold text-dark">{currentRoom.name}</h5>
                  <div className="d-flex align-items-center">
                    <code className="text-muted small bg-white px-2 border rounded">ID: {currentRoom._id}</code>
                    <button className="btn btn-link btn-sm p-0 ms-2" onClick={() => { navigator.clipboard.writeText(currentRoom._id); alert("Copied!"); }}>Copy</button>
                  </div>
                </div>
                <div className="d-flex gap-2">
                   <button onClick={downloadChatHistory} className="btn btn-outline-secondary btn-sm">Download</button>
                   {currentRoom.owner === (user?._id || user?.id) && (
                     <button onClick={handleDeleteRoom} className="btn btn-danger btn-sm">Delete Room</button>
                   )}
                </div>
              </div>

              <div className="flex-grow-1 overflow-hidden">
                <ChatBox
                  messages={messages}
                  currentUserId={user?._id || user?.id}
                  onSendText={(txt) => onSendMessage(txt)}
                  onSendFile={(file) => onSendMessage(null, file)}
                />
              </div>
            </div>
          ) : (
            <div className="h-100 d-flex flex-column justify-content-center align-items-center text-muted bg-light">
              <div className="display-1">💬</div>
              <h4 className="mt-3">Welcome to ChatBox</h4>
              <p>Select a channel or join via ID to start.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}