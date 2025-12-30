import React, { useState, useRef, useEffect } from "react";

function ChatBox({ messages, onSendText, onSendFile, currentUserId, socket, currentRoom }) {
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [typingStatus, setTypingStatus] = useState("");
  const scrollRef = useRef();
  let typingTimer = useRef(null);
  
  const API_BASE = "http://localhost:5000";

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Listen for Typing Indicators
  useEffect(() => {
    if (!socket) return;

    socket.on("user_typing", ({ username }) => {
      setTypingStatus(`${username} is typing...`);
    });

    socket.on("user_stopped", () => {
      setTypingStatus("");
    });

    return () => {
      socket.off("user_typing");
      socket.off("user_stopped");
    };
  }, [socket]);

  // Handle Typing Logic
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
      {/* Messages Body */}
      <div className="card-body overflow-auto bg-light p-4" style={{ flex: "1" }}>
        {messages.map((msg, index) => {
          // 1. Handle System Messages
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
              <div 
                className={`p-2 px-3 rounded shadow-sm ${isMe ? "bg-primary text-white" : "bg-white border"}`} 
                style={{ maxWidth: "75%", width: "fit-content" }}
              >
                {!isMe && (
                  <small className="text-primary fw-bold d-block mb-1" style={{ fontSize: '0.75rem' }}>
                    {msg.sender?.username || "User"}
                  </small>
                )}
                
                {/* Text Content */}
                {msg.type === "text" && <p className="mb-0">{msg.content}</p>}

                {/* Image Content */}
                {msg.type === "image" && (
                  <div className="mt-1 position-relative group">
                    <img
                      src={`${API_BASE}${msg.fileUrl}`} 
                      alt="uploaded"
                      className="img-fluid rounded border shadow-sm"
                      style={{ maxHeight: "250px", cursor: "pointer" }}
                      onClick={() => window.open(`${API_BASE}${msg.fileUrl}`, '_blank')}
                    />
                    <div className="mt-2">
                      <a 
                        href={`${API_BASE}${msg.fileUrl}`} 
                        download 
                        target="_blank" 
                        rel="noreferrer"
                        className={`btn btn-sm w-100 ${isMe ? "btn-light" : "btn-outline-primary"}`}
                        style={{ fontSize: '0.7rem' }}
                      >
                        ⬇ Download Image
                      </a>
                    </div>
                  </div>
                )}

                {/* General File Attachment */}
                {msg.type === "file" && (
                  <div className={`mt-1 p-2 rounded border d-flex align-items-center ${isMe ? "bg-white text-dark" : "bg-light"}`}>
                    <span className="me-2">📎</span>
                    <div className="text-truncate" style={{maxWidth: '150px'}}>
                        <a href={`${API_BASE}${msg.fileUrl}`} target="_blank" rel="noreferrer" className="text-decoration-none fw-bold small">
                          {msg.fileName || "View Attachment"}
                        </a>
                    </div>
                    <a href={`${API_BASE}${msg.fileUrl}`} download className="ms-2 text-dark">⬇</a>
                  </div>
                )}

                <small className={`d-block text-end mt-1 ${isMe ? "text-white-50" : "text-muted"}`} style={{ fontSize: '0.65rem' }}>
                  {new Date(msg.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </small>
              </div>
            </div>
          );
        })}
        <div ref={scrollRef} />
      </div>

      {/* Input Footer */}
      <div className="card-footer bg-white border-top p-3">
        {/* Typing Indicator Label */}
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
            <input
              type="file"
              id="file-input"
              hidden
              onChange={(e) => setFile(e.target.files[0])}
            />
            <button 
              className="btn btn-light border" 
              type="button" 
              title="Attach File"
              onClick={() => document.getElementById('file-input').click()}
            >
              📎
            </button>
            
            <input
              type="text"
              className="form-control border-start-0"
              placeholder="Type your message..."
              value={text}
              onChange={handleInputChange}
            />
            <button className="btn btn-primary px-4" type="submit" disabled={!text.trim() && !file}>
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ChatBox;