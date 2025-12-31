import React, { useEffect, useRef } from 'react';
import { Button } from 'react-bootstrap';

const VideoCall = ({ currentRoom, user, type, onEnd }) => {
  const jitsiContainerRef = useRef(null);
  const jitsiApiRef = useRef(null);

  useEffect(() => {
    // Ensure the Jitsi script is loaded before trying to create the API
    if (!window.JitsiMeetExternalAPI) {
      alert("Jitsi Meet API script not loaded. Please add it to index.html");
      return;
    }

    const domain = "meet.jit.si";
    const options = {
      // ✅ This unique ID ensures Account A and B connect to the same call
      roomName: `MernChat_Room_${currentRoom._id}`, 
      width: "100%",
      height: "100%",
      parentNode: jitsiContainerRef.current,
      userInfo: { 
        displayName: user?.username || "Guest",
        email: user?.email || "" 
      },
      configOverwrite: {
        startWithAudioMuted: false,
        startWithVideoMuted: type === 'audio', // ✅ Only video if type is 'video'
        prejoinPageEnabled: false, // Skips the Jitsi "lobby" for faster connection
      },
      interfaceConfigOverwrite: {
        // Customize UI (optional)
        TILE_VIEW_MAX_COLUMNS: 2,
      },
    };

    jitsiApiRef.current = new window.JitsiMeetExternalAPI(domain, options);
    
    // Listen for when the user leaves via the Jitsi UI button
    jitsiApiRef.current.addEventListener("videoConferenceLeft", () => {
      onEnd();
    });

    return () => {
      if (jitsiApiRef.current) {
        jitsiApiRef.current.dispose();
      }
    };
  }, [currentRoom._id, user, type, onEnd]);

  return (
    <div 
      className="position-absolute top-0 start-0 w-100 h-100 bg-dark d-flex flex-column" 
      style={{ zIndex: 2000 }} // Higher z-index to stay above sidebar
    >
      <div className="p-2 d-flex justify-content-between align-items-center bg-black text-white shadow-sm">
        <h6 className="mb-0">
          <span className="badge bg-success me-2">{type.toUpperCase()} CALL</span>
          {currentRoom?.name}
        </h6>
        <Button variant="danger" size="sm" className="fw-bold" onClick={onEnd}>
          CLOSE CALL
        </Button>
      </div>
      
      {/* Jitsi loads the iframe here */}
      <div ref={jitsiContainerRef} className="flex-grow-1" />
    </div>
  );
};

export default VideoCall;