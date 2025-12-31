import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

function RoomList({ 
  rooms, 
  users, 
  currentUser, 
  currentRoomId, 
  onSelectRoom, 
  onSelectUser, 
  onCreateRoom, 
  onLogout,
  onRefresh,
  onDeleteRoom 
}) {
  const [searchTerm, setSearchTerm] = useState(""); 
  const navigate = useNavigate();
  
  const myId = currentUser?.id || currentUser?._id;

  // 1. My Channels Filtering (Rooms I am already a member of)
  const myRooms = (rooms || []).filter(r => 
    r.isActive !== false && 
    !r.isDirectMessage && 
    r.members?.some(m => (m.user?._id || m.user || m).toString() === myId?.toString()) &&
    (r.name || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 2. Discover Filtering (Public rooms I haven't joined yet)
  const otherRooms = (rooms || []).filter(r => 
    r.isActive !== false &&
    r.isPrivate === false && 
    !r.isDirectMessage && 
    !r.members?.some(m => (m.user?._id || m.user || m).toString() === myId?.toString()) &&
    (r.name || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 3. Direct Messages Filtering
  const filteredUsers = (users || []).filter(u => 
    (u._id || u.id).toString() !== myId?.toString() &&
    (u.username || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  /**
   * ✅ Join public room and immediately update state
   */
  const handleFastJoin = async (room) => {
    try {
      await api.post(`/rooms/join-public/${room._id}`);
      if (onRefresh) await onRefresh(); // Refresh list to move room to "My Channels"
      onSelectRoom(room); // Switch to the room
      setSearchTerm("");
    } catch (err) {
      console.error("Background Join Error:", err);
      alert("Could not join room: " + (err.response?.data?.message || "Server Error"));
    }
  };

  const getRoomDisplayName = (room) => {
    if (!room.isDirectMessage) return room.name;
    const otherMember = room.members?.find(m => (m.user?._id || m.user || m).toString() !== myId?.toString());
    return otherMember?.user?.username || otherMember?.username || "Private Chat";
  };

  return (
    <div className="bg-light border-end d-flex flex-column shadow-sm" style={{ width: "300px", height: "100vh" }}>
      
      {/* HEADER SECTION */}
      <div className="p-3 border-bottom bg-white">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="mb-0 fw-bold text-primary">ChatBox</h5>
          <button onClick={onCreateRoom} className="btn btn-sm btn-primary rounded-pill px-3 shadow-sm">+ Create</button>
        </div>

        {/* JOIN PRIVATE ROOM BUTTON */}
        <div className="d-grid gap-2 mb-3">
           <button 
             className="btn btn-sm btn-outline-success fw-bold shadow-sm d-flex align-items-center justify-content-center gap-2" 
             onClick={() => navigate("/join")}
           >
             <span>🔒</span> Join Private Room
           </button>
        </div>

        <div className="input-group input-group-sm mb-1">
          <span className="input-group-text bg-white border-end-0 text-muted">🔍</span>
          <input 
            type="text" 
            className="form-control border-start-0 ps-0 shadow-none" 
            placeholder="Search channels..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-grow-1 overflow-auto custom-scrollbar p-2">
        
        {/* DISCOVER / PUBLIC SEARCH RESULTS */}
        {otherRooms.length > 0 && (
          <div className="mb-3">
            <div className="p-2 fw-bold text-success small text-uppercase" style={{ letterSpacing: "1px", fontSize: "0.7rem" }}>
              Public Channels (Joinable)
            </div>
            <div className="list-group list-group-flush">
              {otherRooms.map((room) => (
                <div key={room._id} className="list-group-item bg-white border rounded mb-1 d-flex align-items-center justify-content-between p-2 shadow-sm">
                  <span className="text-dark small text-truncate">🌐 {room.name}</span>
                  <button 
                    className="btn btn-xs btn-success py-0 px-2 fw-bold rounded-pill" 
                    onClick={() => handleFastJoin(room)} 
                  >
                    Join
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MY CHANNELS */}
        <div className="p-2 fw-bold text-muted small text-uppercase" style={{ letterSpacing: "1px", fontSize: "0.7rem" }}>My Channels</div>
        <div className="list-group list-group-flush mb-3">
          {myRooms.length > 0 ? (
            myRooms.map((room) => {
              const ownerId = room.owner?._id || room.owner;
              const isOwner = ownerId?.toString() === myId?.toString();
              
              return (
                <div key={room._id} className="position-relative d-flex align-items-center mb-1 group-item-container">
                  <button
                    onClick={() => onSelectRoom(room)}
                    className={`list-group-item list-group-item-action border-0 rounded px-3 py-2 flex-grow-1 d-flex align-items-center justify-content-between ${
                      room._id === currentRoomId ? "active shadow-sm text-white" : "bg-transparent text-dark"
                    }`}
                  >
                    <div className="text-truncate d-flex align-items-center">
                      <span className="me-2">{room.isPrivate ? "🔒" : "#"}</span>
                      <span className="fw-bold small">{getRoomDisplayName(room)}</span>
                      {isOwner && (
                        <span className="ms-2 badge bg-light text-primary x-small" style={{fontSize: '0.6rem'}}>Admin</span>
                      )}
                    </div>
                  </button>
                  
                  {isOwner && (
                    <button 
                      className={`btn btn-link text-danger p-0 px-2 position-absolute end-0 me-1 delete-btn ${room._id === currentRoomId ? 'text-white' : ''}`}
                      onClick={(e) => { e.stopPropagation(); onDeleteRoom(room._id); }}
                      title="Delete Room"
                    >🗑️</button>
                  )}
                </div>
              );
            })
          ) : (
            !searchTerm && <div className="small text-muted ps-2 fst-italic">No rooms joined</div>
          )}
        </div>

        {/* DIRECT MESSAGES */}
        <div className="p-2 fw-bold text-muted small text-uppercase" style={{ letterSpacing: "1px", fontSize: "0.7rem" }}>Direct Messages</div>
        <div className="list-group list-group-flush">
          {filteredUsers.map((u) => (
            <button key={u._id || u.id} onClick={() => onSelectUser(u)} className="list-group-item list-group-item-action border-0 rounded mb-1 d-flex align-items-center bg-transparent py-2 px-3">
              <div className="position-relative me-2">
                <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center border" style={{ width: "32px", height: "32px", fontSize: "12px", fontWeight: "bold" }}>
                  {u.username?.charAt(0).toUpperCase()}
                </div>
                {u.isOnline && <div className="position-absolute bottom-0 end-0 bg-success border border-white rounded-circle" style={{ width: "10px", height: "10px" }}></div>}
              </div>
              <span className="small fw-medium">{u.username}</span>
            </button>
          ))}
        </div>
      </div>

      {/* USER PROFILE FOOTER */}
      <div className="p-3 border-top bg-white mt-auto">
        <div className="d-flex align-items-center justify-content-between mb-3">
          <div className="d-flex align-items-center overflow-hidden">
            <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center fw-bold me-2 shadow-sm" style={{ width: "38px", height: "38px", flexShrink: 0 }}>
              {currentUser?.username?.charAt(0).toUpperCase()}
            </div>
            <div className="text-truncate">
              <div className="fw-bold small text-dark">{currentUser?.username || "Guest"}</div>
              <div className="text-success small d-flex align-items-center" style={{fontSize: '0.7rem'}}>
                <span className="bg-success rounded-circle me-1" style={{width: '6px', height: '6px'}}></span> Online
              </div>
            </div>
          </div>
        </div>
        <button onClick={onLogout} className="btn btn-sm btn-outline-danger w-100 py-1 fw-bold">Logout</button>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e0; border-radius: 10px; }
        .btn-xs { padding: 1px 5px; font-size: 10px; }
        .list-group-item.active { background-color: #0d6efd !important; border-color: #0d6efd !important; }
        .group-item-container .delete-btn { opacity: 0; transition: opacity 0.2s; }
        .group-item-container:hover .delete-btn { opacity: 1; }
        .x-small { font-size: 0.75rem; }
      `}</style>
    </div>
  );
}

export default RoomList;