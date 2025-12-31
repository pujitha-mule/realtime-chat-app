import React, { useState, useRef, useEffect } from "react";
// Add the Dropdown import
import { Dropdown } from "react-bootstrap"; 

function ChatBox({ 
  messages, 
  onSendText, 
  onSendFile, 
  currentUserId, 
  socket, 
  currentRoom,
  onSaveMessage, // Add these props from Chat.js
  onShareMessage,
  onDeleteMessage 
}) {
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [typingStatus, setTypingStatus] = useState("");
  const scrollRef = useRef();
  let typingTimer = useRef(null);
  
  const API_BASE = "http://localhost:5000";

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!socket) return;
    socket.on("user_typing", ({ username }) => setTypingStatus(`${username} is typing...`));
    socket.on("user_stopped", () => setTypingStatus(""));
    return () => {
      socket.off("user_typing");
      socket.off("user_stopped");
    };
  }, [socket]);

  const handleInputChange = (e) => {
    setText(e.target.value);
    if (socket && currentRoom) {
      socket.emit("typing", { roomId: currentRoom._id, username: "Someone" });
      clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => {
        socket.emit("stop_typing", currentRoom._id);
      }, 2000);
    }
  };

  const handleSendText = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSendText(text);
    setText("");
    if (socket) socket.emit("stop_typing", currentRoom?._id);
  };

  const handleSendFile = () => {
    if (!file) return;
    onSendFile(file);
    setFile(null);
  };

  return (
    <div className="card d-flex flex-column border-0 shadow-sm" style={{ height: "100%" }}>
      <div className="card-body overflow-auto bg-light p-4" style={{ flex: "1" }}>
        {messages.map((msg, index) => {
          if (msg.isSystem) {
            return (
              <div key={msg._id || index} className="text-center my-3">
                <span className="badge bg-secondary-subtle text-secondary px-3 py-2 rounded-pill shadow-sm" style={{ fontSize: '0.7rem' }}>
                  {msg.content}
                </span>
              </div>
            );
          }

          const isMe = msg.sender?._id === currentUserId || msg.sender === currentUserId;

          return (
            <div 
              key={msg._id || index} 
              className={`mb-3 d-flex flex-column ${isMe ? "align-items-end" : "align-items-start"}`}
            >
              {/* Outer Container for Dropdown + Bubble */}
              <div className={`d-flex align-items-center w-100 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                
                {/* --- THREE DOT DROPDOWN (LEFT OF BUBBLE) --- */}
                <Dropdown align={isMe ? "end" : "start"} className="mx-1">
                  <Dropdown.Toggle variant="link" className="text-muted p-0 border-0 no-caret shadow-none" style={{ fontSize: '1.2rem', textDecoration: 'none' }}>
                    ⋮
                  </Dropdown.Toggle>

                  <Dropdown.Menu style={{ borderRadius: '10px', fontSize: '0.85rem' }}>
                    <Dropdown.Item onClick={() => onSaveMessage(msg)}>💾 Save</Dropdown.Item>
                    <Dropdown.Item onClick={() => onShareMessage(msg)}>🔗 Share</Dropdown.Item>
                    {isMe && (
                      <>
                        <Dropdown.Divider />
                        <Dropdown.Item className="text-danger" onClick={() => onDeleteMessage(msg._id)}>🗑 Delete</Dropdown.Item>
                      </>
                    )}
                  </Dropdown.Menu>
                </Dropdown>

                {/* --- MESSAGE BUBBLE --- */}
                <div 
                  className={`p-2 px-3 rounded shadow-sm ${isMe ? "bg-primary text-white" : "bg-white border"}`} 
                  style={{ maxWidth: "75%", width: "fit-content" }}
                >
                  {!isMe && (
                    <small className="text-primary fw-bold d-block mb-1" style={{ fontSize: '0.75rem' }}>
                      {msg.sender?.username || "User"}
                    </small>
                  )}
                  
                  {msg.type === "text" && <p className="mb-0">{msg.content}</p>}

                  {msg.type === "image" && (
                    <div className="mt-1 position-relative group">
                      <img
                        src={`${API_BASE}${msg.fileUrl}`} 
                        alt="uploaded"
                        className="img-fluid rounded border shadow-sm"
                        style={{ maxHeight: "200px", cursor: "pointer" }}
                        onClick={() => window.open(`${API_BASE}${msg.fileUrl}`, '_blank')}
                      />
                    </div>
                  )}

                  {msg.type === "file" && (
                    <div className={`mt-1 p-2 rounded border d-flex align-items-center ${isMe ? "bg-white text-dark" : "bg-light"}`}>
                      <span className="me-2">📎</span>
                      <div className="text-truncate" style={{maxWidth: '120px'}}>
                          <a href={`${API_BASE}${msg.fileUrl}`} target="_blank" rel="noreferrer" className="text-decoration-none fw-bold small">
                            {msg.fileName || "Attachment"}
                          </a>
                      </div>
                    </div>
                  )}

                  <small className={`d-block text-end mt-1 ${isMe ? "text-white-50" : "text-muted"}`} style={{ fontSize: '0.65rem' }}>
                    {new Date(msg.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </small>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={scrollRef} />
      </div>

      {/* Footer code remains exactly the same as yours... */}
      <div className="card-footer bg-white border-top p-3">
        <div className="text-muted small mb-1 ms-1" style={{ height: '15px', fontSize: '0.7rem' }}>
          {typingStatus}
        </div>

        {file && (
          <div className="alert alert-primary py-2 px-3 mb-2 d-flex justify-content-between align-items-center shadow-sm">
            <small className="text-truncate" style={{ maxWidth: "70%" }}>
                <strong>File:</strong> {file.name}
            </small>
            <div>
               <button className="btn btn-sm btn-link text-danger me-2" onClick={() => setFile(null)}>Cancel</button>
               <button className="btn btn-sm btn-primary px-3" onClick={handleSendFile}>Upload</button>
            </div>
          </div>
        )}

        <form onSubmit={handleSendText}>
          <div className="input-group shadow-sm rounded">
            <input type="file" id="file-input" hidden onChange={(e) => setFile(e.target.files[0])} />
            <button className="btn btn-light border" type="button" onClick={() => document.getElementById('file-input').click()}>📎</button>
            <input type="text" className="form-control border-start-0" placeholder="Type your message..." value={text} onChange={handleInputChange} />
            <button className="btn btn-primary px-4" type="submit" disabled={!text.trim() && !file}>Send</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ChatBox;