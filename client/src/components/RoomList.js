import React, { useState } from "react";
import api from "../services/api";

function RoomList({ 
  rooms, 
  users, 
  currentUser, 
  currentRoomId, 
  onSelectRoom, 
  onSelectUser, 
  onJoinRoom, 
  onCreateRoom, 
  onLogout,
  onRefresh // Assuming you pass a refresh function to reload rooms after joining
}) {
  const [joinIdInput, setJoinIdInput] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const myId = currentUser?.id || currentUser?._id;

  // 1. My Channels: Filter for ACTIVE rooms I am a member of
  const myRooms = rooms.filter(r => 
    r.isActive !== false && 
    r.members?.some(m => (m.user?._id || m.user || m) === myId)
  );

  // 2. Discover: Filter for ACTIVE Public rooms I haven't joined yet
  const otherRooms = rooms.filter(r => 
    r.isActive !== false &&
    r.isPrivate === false && 
    !r.members?.some(m => (m.user?._id || m.user || m) === myId)
  );

  // Function to join via pasted Room ID
  const handleJoinById = async (e) => {
    e.preventDefault();
    if (!joinIdInput.trim()) return;
    
    setIsJoining(true);
    try {
      const res = await api.post(`/rooms/join-id/${joinIdInput.trim()}`);
      alert(res.data.message);
      setJoinIdInput("");
      if (onRefresh) onRefresh(); 
    } catch (err) {
      alert(err.response?.data?.message || "Invalid Room ID");
    } finally {
      setIsJoining(false);
    }
  };

  const getRoomDisplayName = (room) => {
    if (!room.isDirectMessage) return room.name;
    const otherMember = room.members?.find(m => (m.user?._id || m.user || m) !== myId);
    return otherMember?.user?.username || "Private Chat";
  };

  return (
    <div className="bg-light border-end d-flex flex-column shadow-sm" style={{ width: "300px", height: "100vh" }}>
      
      {/* 1. HEADER & CREATE */}
      <div className="p-3 border-bottom bg-white">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="mb-0 fw-bold text-primary">ChatBox</h5>
          <button onClick={onCreateRoom} className="btn btn-sm btn-primary rounded-pill px-3 shadow-sm">
            + Create
          </button>
        </div>

        {/* JOIN BY ID INPUT */}
        <form onSubmit={handleJoinById} className="input-group input-group-sm">
          <input 
            type="text" 
            className="form-control" 
            placeholder="Paste Room ID to join..." 
            value={joinIdInput}
            onChange={(e) => setJoinIdInput(e.target.value)}
          />
          <button className="btn btn-outline-primary" type="submit" disabled={isJoining}>
            {isJoining ? "..." : "Join"}
          </button>
        </form>
      </div>

      <div className="flex-grow-1 overflow-auto custom-scrollbar p-2">
        
        {/* 2. MY CHANNELS */}
        <div className="p-2 fw-bold text-muted small text-uppercase" style={{ letterSpacing: "1px", fontSize: "0.7rem" }}>My Channels</div>
        <div className="list-group list-group-flush mb-3">
          {myRooms.length > 0 ? (
            myRooms.map((room) => (
              <button
                key={room._id}
                onClick={() => onSelectRoom(room)}
                className={`list-group-item list-group-item-action border-0 rounded mb-1 px-3 py-2 ${
                  room._id === currentRoomId ? "active shadow-sm" : "bg-transparent"
                }`}
              >
                <div className="d-flex align-items-center">
                  <span className="me-2">{room.isDirectMessage ? "👤" : room.isPrivate ? "🔒" : "#"}</span>
                  <div className="text-truncate">
                    <div className="fw-bold small">{getRoomDisplayName(room)}</div>
                    {room.lastMessage && (
                      <div className={`smaller text-truncate ${room._id === currentRoomId ? "text-white-50" : "text-muted"}`} style={{fontSize: "0.65rem"}}>
                         {room.lastMessage.content}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))
          ) : (
            <div className="small text-muted ps-2 fst-italic">No channels active</div>
          )}
        </div>

        {/* 3. DISCOVER CHANNELS */}
        {otherRooms.length > 0 && (
          <>
            <div className="p-2 fw-bold text-muted small text-uppercase" style={{ letterSpacing: "1px", fontSize: "0.7rem" }}>Discover</div>
            <div className="list-group list-group-flush mb-3">
              {otherRooms.map((room) => (
                <div key={room._id} className="list-group-item bg-transparent border-0 d-flex align-items-center justify-content-between p-2">
                  <span className="text-muted small text-truncate"># {room.name}</span>
                  <button className="btn btn-xs btn-outline-success py-0 px-2" style={{fontSize: "0.7rem"}} onClick={() => onJoinRoom(room)}>
                    Join
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {/* 4. DIRECT MESSAGES */}
        <div className="p-2 fw-bold text-muted small text-uppercase" style={{ letterSpacing: "1px", fontSize: "0.7rem" }}>Direct Messages</div>
        <div className="list-group list-group-flush">
          {users.filter(u => (u._id || u.id) !== myId).map((u) => (
            <button key={u._id || u.id} onClick={() => onSelectUser(u)} className="list-group-item list-group-item-action border-0 rounded mb-1 d-flex align-items-center bg-transparent py-2 px-3">
              <div className="position-relative me-2">
                <div className="bg-secondary-subtle rounded-circle d-flex align-items-center justify-content-center border" style={{ width: "32px", height: "32px", fontSize: "12px" }}>
                  {u.avatar ? <img src={u.avatar} className="rounded-circle w-100 h-100" alt="avatar" /> : u.username?.charAt(0).toUpperCase()}
                </div>
                {u.isOnline && <div className="position-absolute bottom-0 end-0 bg-success border border-white rounded-circle" style={{ width: "10px", height: "10px" }}></div>}
              </div>
              <span className="small fw-medium">{u.username}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 5. FOOTER */}
      <div className="p-3 border-top bg-white mt-auto">
        <div className="d-flex align-items-center mb-3">
          <div className="bg-primary text-white rounded-circle d-flex justify-content-center align-items-center me-2 shadow-sm" style={{ width: "38px", height: "38px", fontSize: "14px" }}>
            {currentUser?.username?.charAt(0).toUpperCase()}
          </div>
          <div className="text-truncate">
            <div className="fw-bold small">{currentUser?.username}</div>
            <div className="text-success fw-bold" style={{ fontSize: "9px" }}>● ONLINE</div>
          </div>
        </div>
        <button onClick={onLogout} className="btn btn-sm btn-outline-danger w-100 py-1" style={{fontSize: "0.8rem"}}>Logout</button>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e0; border-radius: 10px; }
        .smaller { font-size: 0.75rem; }
      `}</style>
    </div>
  );
}

export default RoomList;