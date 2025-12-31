import { useEffect, useState, useCallback, useRef } from "react";
import api from "../services/api";
import ChatBox from "../components/ChatBox";
import RoomList from "../components/RoomList";
import socket from "../services/socket";
import { useNavigate, useLocation } from "react-router-dom";
import { Dropdown, Modal, Button, FormControl, ListGroup, Badge, Form } from "react-bootstrap";

/* --- Video Call Component (Preserved) --- */
const VideoCallOverlay = ({ currentRoom, user, type, onEnd }) => {
  const jitsiContainerRef = useRef(null);
  const jitsiApiRef = useRef(null);

  useEffect(() => {
    const domain = "meet.jit.si";
    const options = {
      roomName: `MernChat_Room_${currentRoom._id}`,
      width: "100%",
      height: "100%",
      parentNode: jitsiContainerRef.current,
      userInfo: { displayName: user?.username || "User" },
      configOverwrite: {
        startWithAudioMuted: false,
        startWithVideoMuted: type === 'audio',
        disableInviteFunctions: true
      },
    };
    jitsiApiRef.current = new window.JitsiMeetExternalAPI(domain, options);
    jitsiApiRef.current.addEventListener("videoConferenceLeft", onEnd);

    return () => {
      if (jitsiApiRef.current) jitsiApiRef.current.dispose();
    };
  }, [currentRoom._id, user, type, onEnd]);

  return (
    <div className="position-absolute top-0 start-0 w-100 h-100 bg-dark d-flex flex-column" style={{ zIndex: 1050 }}>
      <div className="p-2 d-flex justify-content-between align-items-center bg-black text-white border-bottom border-secondary">
        <span className="fw-bold px-2">{type === 'video' ? '📹 Video Call' : '📞 Audio Call'}: {currentRoom.name}</span>
        <Button variant="danger" size="sm" onClick={onEnd}>End Call</Button>
      </div>
      <div ref={jitsiContainerRef} className="flex-grow-1" />
    </div>
  );
};

export default function Chat({ setAuth }) {
  const [rooms, setRooms] = useState([]);
  const [users, setUsers] = useState([]);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [callConfig, setCallConfig] = useState({ active: false, type: 'video' });
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  // --- UNREAD MESSAGES & CALL SIGNALING STATE ---
  const [unreadRooms, setUnreadRooms] = useState([]);
  const [incomingCall, setIncomingCall] = useState(null); // { callerName, type, roomId }
  const currentRoomRef = useRef(null);

  const [newRoomData, setNewRoomData] = useState({
    name: "",
    isPrivate: false,
    showHistoryToNewMembers: true,
  });

  const navigate = useNavigate();
  const location = useLocation();

  // --- 1. Fetch Data ---
  const fetchData = useCallback(async () => {
    try {
      const [roomsRes, usersRes] = await Promise.all([
        api.get("/rooms"),
        api.get("/auth/users"),
      ]);
      setRooms(roomsRes.data || []);
      setUsers(usersRes.data || []);

      setCurrentRoom(prev => {
        if (!prev) return null;
        return (roomsRes.data || []).find(r => r._id === prev._id) || prev;
      });
    } catch (err) {
      if (err.response?.status === 401) handleLogout();
    } finally {
      setLoading(false);
    }
  }, []);

  const handleLogout = useCallback(() => {
    if (setAuth) { setAuth(null); }
    else { localStorage.clear(); window.location.href = "/login"; }
    socket.disconnect();
  }, [setAuth]);

  // --- 2. Initial Setup & Global Socket Listeners ---
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        socket.connect();
      } catch (e) { handleLogout(); }
    }
    fetchData();

    socket.on("room_deleted", ({ roomId }) => {
      setRooms((prev) => prev.filter((r) => r._id !== roomId));
      setCurrentRoom((prev) => (prev?._id === roomId ? null : prev));
    });

    // LISTEN FOR CALLS (GLOBAL)
    socket.on("incoming_call", (data) => {
      // Show modal only if it's not our own call
      setIncomingCall(data);
    });

    socket.on("call_ended", () => {
      setCallConfig({ active: false });
      setIncomingCall(null);
    });

    return () => {
      socket.off("room_deleted");
      socket.off("incoming_call");
      socket.off("call_ended");
      socket.disconnect();
    };
  }, [fetchData, handleLogout]);

  // --- 3. Auto-Selection Logic ---
  useEffect(() => {
    if (location.state?.autoSelectRoom) {
      setCurrentRoom(location.state.autoSelectRoom);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // --- 4. Room-Specific Messages & Sockets & Unread Logic ---
  useEffect(() => {
    if (!user) return;
    currentRoomRef.current = currentRoom?._id;

    if (!currentRoom) {
        const handleGlobalReceive = (msg) => {
            const incomingRoomId = msg.roomId || msg.room;
            const senderId = msg.sender?._id || msg.sender;
            if (senderId !== user._id) {
                setUnreadRooms(prev => !prev.includes(incomingRoomId) ? [...prev, incomingRoomId] : prev);
            }
        };
        socket.on("receive_message", handleGlobalReceive);
        return () => socket.off("receive_message", handleGlobalReceive);
    }

    const roomId = currentRoom._id;
    setUnreadRooms(prev => prev.filter(id => id !== roomId));

    socket.emit("join_room", { roomId, username: user.username });

    api.get(`/messages/${roomId}`)
      .then((res) => setMessages(res.data))
      .catch((err) => console.error(err));

    const handleReceive = (msg) => {
      const incomingRoomId = msg.roomId || msg.room;
      const senderId = msg.sender?._id || msg.sender;

      if (incomingRoomId === currentRoomRef.current) {
        setMessages((prev) => [...prev, msg]);
      } else if (senderId !== user._id) {
        setUnreadRooms((prev) => !prev.includes(incomingRoomId) ? [...prev, incomingRoomId] : prev);
      }
    };

    socket.on("receive_message", handleReceive);
    socket.on("message_deleted", ({ messageId }) => {
      setMessages((prev) => prev.filter((m) => m._id !== messageId));
    });

    return () => {
      socket.off("receive_message", handleReceive);
      socket.off("message_deleted");
    };
  }, [currentRoom?._id, user]);

  /* ================= CALL HANDLERS ================= */

  const startCall = (type) => {
    if (!currentRoom) return;
    const callData = {
      roomId: currentRoom._id,
      roomName: currentRoom.name,
      callerName: user.username,
      callerId: user._id || user.id,
      type: type
    };
    socket.emit("start_call", callData);
    setCallConfig({ active: true, type: type });
  };

  const joinCall = () => {
    // Find the room in our room list based on the incoming call
    const roomToJoin = rooms.find(r => r._id === incomingCall.roomId);
    if (roomToJoin) {
      setCurrentRoom(roomToJoin);
      setCallConfig({ active: true, type: incomingCall.type });
    }
    setIncomingCall(null);
  };

  const endCall = () => {
    socket.emit("end_call", { roomId: currentRoom?._id });
    setCallConfig({ active: false });
  };

  /* ================= CHAT HANDLERS ================= */

  const handleSelectRoom = async (room) => {
    const userId = user?._id || user?.id;
    const isMember = room.members?.some(m => (m.user?._id || m.user || m)?.toString() === userId?.toString());

    if (isMember) {
      setCurrentRoom(room);
    } else if (!room.isPrivate) {
      try {
        const res = await api.post(`/rooms/join-public/${room._id}`);
        await fetchData(); 
        setCurrentRoom(res.data);
      } catch (err) { alert("Failed to join."); }
    } else { navigate("/join"); }

    setIsCreating(false);
    setCallConfig({ active: false });
    setShowSearchBar(false);
    setSearchTerm("");
  };

  const handleJoinRoom = async (code) => {
    if (!code) return;
    try {
      const res = await api.post(`/rooms/join-code`, { code: code.trim().toUpperCase() });
      await fetchData(); 
      setCurrentRoom(res.data);
      setIsCreating(false);
    } catch (err) { alert("Invalid code."); }
  };

  const onSendMessage = async (content, file = null) => {
    if (!currentRoom) return;
    try {
      let res;
      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("roomId", currentRoom._id);
        res = await api.post("/messages/upload", formData);
      } else {
        res = await api.post("/messages", { roomId: currentRoom._id, content });
      }
      socket.emit("send_message", res.data);
    } catch (err) { console.error(err); }
  };

  const handleDeleteMessage = async (messageId) => {
    try {
      await api.delete(`/messages/${messageId}`);
      setMessages((prev) => prev.filter((m) => m._id !== messageId));
      socket.emit("delete_message", { messageId, roomId: currentRoom._id });
    } catch (err) { alert("Delete failed."); }
  };

  const handleClearChat = async () => {
    if (window.confirm("Clear all messages?")) {
      try {
        await api.delete(`/messages/clear/${currentRoom._id}`);
        setMessages([]);
      } catch (err) { alert("Failed to clear chat"); }
    }
  };

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post("/rooms", { name: newRoomData.name, isPrivate: newRoomData.isPrivate });
      await fetchData();
      setCurrentRoom(res.data);
      setIsCreating(false);
      setNewRoomData({ name: "", isPrivate: false });
    } catch (err) { alert("Error creating room"); }
  };

  const handleSelectUser = async (targetUser) => {
    try {
      const existingDm = rooms.find(r => r.isDirectMessage && r.members?.some(m => (m.user?._id || m.user || m).toString() === targetUser._id.toString()));
      if (existingDm) { setCurrentRoom(existingDm); }
      else {
        const res = await api.post("/rooms/private", { targetUserId: targetUser._id });
        await fetchData();
        setCurrentRoom(res.data);
      }
    } catch (err) { console.error("DM Error:", err); }
  };

  const handleDeleteRoomById = async (roomId) => {
    if (window.confirm("Permanently delete this room?")) {
      try {
        await api.delete(`/rooms/${roomId}`);
        socket.emit("delete_room", { roomId });
        setRooms((prev) => prev.filter((r) => r._id !== roomId));
        if (currentRoom?._id === roomId) setCurrentRoom(null);
        setShowInfoModal(false);
      } catch (err) { alert("Delete failed."); }
    }
  };

  /* ================= HELPERS ================= */
  const currentUserRealId = user?._id || user?.id;
  const roomOwnerId = currentRoom?.owner?._id || currentRoom?.owner;
  const isOwner = roomOwnerId && currentUserRealId && roomOwnerId.toString() === currentUserRealId.toString();

  const getUniqueMembers = (members) => {
    const seen = new Set();
    return (members || []).filter(member => {
      const id = member.user?._id || member.user || member._id;
      if (!id || seen.has(id.toString())) return false;
      seen.add(id.toString());
      return true;
    });
  };

  const getDMName = () => {
    const otherMember = currentRoom.members?.find(m => (m.user?._id || m.user || m).toString() !== currentUserRealId?.toString());
    const memberData = otherMember?.user || otherMember;
    return memberData?.username || "Private Chat";
  };

  if (loading) return <div className="vh-100 d-flex justify-content-center align-items-center">Loading…</div>;

  return (
    <div className="container-fluid p-0 bg-light" style={{ height: "100vh" }}>
      
      {/* INCOMING CALL MODAL */}
      <Modal show={!!incomingCall} centered backdrop="static">
        <Modal.Body className="text-center p-4">
          <div className="display-4 mb-3">{incomingCall?.type === 'video' ? '📹' : '📞'}</div>
          <h5>Incoming Call</h5>
          <p>{incomingCall?.callerName} is calling in <strong>{incomingCall?.roomName}</strong></p>
          <div className="d-flex gap-2 justify-content-center">
            <Button variant="success" onClick={joinCall}>Join</Button>
            <Button variant="danger" onClick={() => setIncomingCall(null)}>Ignore</Button>
          </div>
        </Modal.Body>
      </Modal>

      <div className="d-flex h-100 overflow-hidden">
        <RoomList
          rooms={rooms}
          users={users}
          currentUser={user}
          currentRoomId={currentRoom?._id}
          unreadRooms={unreadRooms}
          onSelectRoom={handleSelectRoom}
          onSelectUser={handleSelectUser}
          onJoinRoom={handleJoinRoom}
          onCreateRoom={() => setIsCreating(true)}
          onLogout={handleLogout}
          onRefresh={fetchData}
          onDeleteRoom={handleDeleteRoomById}
        />

        <div className="flex-grow-1 bg-white d-flex flex-column position-relative">
          {callConfig.active && (
            <VideoCallOverlay currentRoom={currentRoom} user={user} type={callConfig.type} onEnd={endCall} />
          )}

          {isCreating ? (
            <div className="p-5 d-flex justify-content-center">
              <div className="card shadow-sm p-4 w-100" style={{ maxWidth: '500px' }}>
                <h3>Create New Room</h3>
                <Form onSubmit={handleCreateRoom}>
                  <Form.Group className="mb-3">
                    <Form.Label>Room Name</Form.Label>
                    <Form.Control type="text" required onChange={(e) => setNewRoomData({ ...newRoomData, name: e.target.value })} />
                  </Form.Group>
                  <Form.Check type="switch" label="Private Room (Requires Code)" className="mb-4" checked={newRoomData.isPrivate} onChange={(e) => setNewRoomData({ ...newRoomData, isPrivate: e.target.checked })} />
                  <div className="d-flex gap-2">
                    <Button variant="primary" type="submit">Create</Button>
                    <Button variant="secondary" onClick={() => setIsCreating(false)}>Cancel</Button>
                  </div>
                </Form>
              </div>
            </div>
          ) : currentRoom ? (
            <div className="d-flex flex-column h-100">
              <div className="d-flex justify-content-between align-items-center p-3 border-bottom bg-light">
                <div className="d-flex align-items-center gap-3" style={{ cursor: "pointer" }} onClick={() => setShowInfoModal(true)}>
                  <div className="bg-secondary rounded-circle d-flex align-items-center justify-content-center text-white" style={{ width: "40px", height: "40px" }}>
                    {currentRoom.isDirectMessage ? "👤" : "👥"}
                  </div>
                  <h5 className="mb-0 fw-bold">{currentRoom.isDirectMessage ? getDMName() : (currentRoom.isPrivate ? `🔒 ${currentRoom.name}` : `🌐 ${currentRoom.name}`)}</h5>
                </div>
                <div className="d-flex align-items-center gap-3">
                  <span className="text-secondary" style={{ cursor: "pointer", fontSize: "1.3rem" }} onClick={() => setShowSearchBar(!showSearchBar)}>🔍</span>
                  <span className="text-secondary" style={{ cursor: "pointer", fontSize: "1.3rem" }} onClick={() => startCall('video')}>📹</span>
                  <span className="text-secondary" style={{ cursor: "pointer", fontSize: "1.3rem" }} onClick={() => startCall('audio')}>📞</span>
                  <Dropdown align="end">
                    <Dropdown.Toggle variant="link" className="text-secondary p-0 border-0 no-caret shadow-none"><span style={{ fontSize: "1.6rem" }}>⋮</span></Dropdown.Toggle>
                    <Dropdown.Menu>
                      <Dropdown.Item onClick={() => setShowInfoModal(true)}>ⓘ Info</Dropdown.Item>
                      <Dropdown.Item onClick={handleClearChat}>➖ Clear messages</Dropdown.Item>
                      {isOwner && !currentRoom.isDirectMessage && (
                        <Dropdown.Item onClick={() => handleDeleteRoomById(currentRoom._id)} className="text-danger">🗑️ Delete</Dropdown.Item>
                      )}
                    </Dropdown.Menu>
                  </Dropdown>
                </div>
              </div>
              {showSearchBar && (
                <div className="p-2 border-bottom bg-light">
                  <FormControl type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} autoFocus />
                </div>
              )}
              <div className="flex-grow-1 overflow-hidden">
                <ChatBox
                  messages={searchTerm ? messages.filter(m => m.content?.toLowerCase().includes(searchTerm.toLowerCase())) : messages}
                  currentUserId={currentUserRealId}
                  onSendText={(txt) => onSendMessage(txt)}
                  onSendFile={(f) => onSendMessage(null, f)}
                  onDeleteMessage={handleDeleteMessage}
                />
              </div>
            </div>
          ) : (
            <div className="h-100 d-flex flex-column justify-content-center align-items-center text-muted">
              <h4>Welcome to Chat</h4>
              <p>Select a room to start talking!</p>
            </div>
          )}
        </div>
      </div>

      <Modal show={showInfoModal} onHide={() => setShowInfoModal(false)} centered scrollable>
        <Modal.Header closeButton><Modal.Title>Info</Modal.Title></Modal.Header>
        <Modal.Body className="text-center py-4">
          <div className="bg-light rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style={{ width: '80px', height: '80px', fontSize: '2.5rem' }}>
            {currentRoom?.isDirectMessage ? "👤" : "👥"}
          </div>
          <h4>{currentRoom?.isDirectMessage ? getDMName() : currentRoom?.name}</h4>
          <hr />
          {!currentRoom?.isDirectMessage && (
            <>
              <div className="text-start mb-4">
                {currentRoom?.isPrivate ? (
                  <>
                    <label className="fw-bold small text-muted mb-1">🔑 PRIVATE INVITE CODE</label>
                    <div className="d-flex gap-2">
                      <FormControl readOnly className="bg-light fw-bold text-center" value={currentRoom?.inviteCode || "No Code"} />
                      <Button variant="primary" onClick={() => { navigator.clipboard.writeText(currentRoom.inviteCode); alert("Copied!"); }}>Copy</Button>
                    </div>
                  </>
                ) : (
                  <div className="text-center text-muted small">🌐 This is a Public Room. Anyone can join.</div>
                )}
              </div>
              <div className="text-start mb-3">
                <label className="small text-muted fw-bold d-block mb-2">MEMBERS ({getUniqueMembers(currentRoom?.members).length})</label>
                <ListGroup variant="flush" className="border rounded bg-light" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {getUniqueMembers(currentRoom?.members).map((member, idx) => {
                    const mUser = member.user || member;
                    return (
                      <ListGroup.Item key={idx} className="bg-transparent d-flex justify-content-between align-items-center">
                        <span>👤 {mUser.username || "User"}</span>
                        {(mUser._id?.toString() === roomOwnerId?.toString()) && <Badge bg="warning" text="dark">Admin</Badge>}
                      </ListGroup.Item>
                    );
                  })}
                </ListGroup>
              </div>
            </>
          )}
        </Modal.Body>
      </Modal>
    </div>
  );
}