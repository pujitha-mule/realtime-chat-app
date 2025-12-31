import React, { useState, useEffect } from 'react';
import { joinRoomByCode, joinRoomById, getMyRooms } from '../services/api'; 

const JoinRoom = ({ rooms, onSelectRoom, fetchRooms, activeRoomId }) => {
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [publicRooms, setPublicRooms] = useState([]);

  // Load available public rooms that the user hasn't joined yet
  useEffect(() => {
    const loadPublicOptions = async () => {
      try {
        const { data } = await getMyRooms();
        // Filter for rooms that are public and user is NOT a member of
        // This helps Account #2 discover rooms Account #1 made public
        setPublicRooms(data.filter(r => !r.isPrivate));
      } catch (err) {
        console.error("Error loading public rooms");
      }
    };
    loadPublicOptions();
  }, [rooms]); // Refresh when the user's joined rooms change

  const handleJoinByCode = async (e) => {
    e.preventDefault();
    const cleanCode = inviteCode.trim().toUpperCase();
    if (!cleanCode) return setError("Please enter a code");

    setLoading(true);
    setError('');

    try {
      await joinRoomByCode(cleanCode);
      setInviteCode('');
      if (fetchRooms) await fetchRooms(); // ✅ This refreshes the sidebar for Account #2
      alert("Successfully joined!");
    } catch (err) {
      setError(err.response?.data?.message || "Server Error: Check Connection");
    } finally {
      setLoading(false);
    }
  };

  const handleJoinPublic = async (roomId) => {
    try {
      await joinRoomById(roomId);
      if (fetchRooms) await fetchRooms();
    } catch (err) {
      alert("Could not join public room");
    }
  };

  return (
    <div className="sidebar bg-light border-end vh-100 d-flex flex-column" style={{ width: '280px' }}>
      <div className="p-3">
        <h5 className="mb-3 fw-bold text-primary">Chat Explorer</h5>
        
        {/* --- SECTION 1: JOIN BY CODE --- */}
        <div className="mb-4 p-3 border rounded bg-white shadow-sm">
          <form onSubmit={handleJoinByCode}>
            <div className="mb-2">
              <label className="form-label small fw-bold">Private Invite Code</label>
              <input
                type="text"
                className="form-control form-control-sm text-center fw-bold text-uppercase"
                placeholder="ABCXYZ"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-success btn-sm w-100 fw-bold" disabled={loading}>
              {loading ? '...' : 'JOIN PRIVATE'}
            </button>
          </form>
          {error && <div className="text-danger small mt-2 text-center" style={{fontSize: '10px'}}>{error}</div>}
        </div>

        {/* --- SECTION 2: JOINED CHANNELS --- */}
        <div className="flex-grow-1 overflow-auto">
          <h6 className="text-muted small text-uppercase mb-2 ps-2 fw-bold">Your Conversations</h6>
          <div className="list-group list-group-flush mb-4">
            {rooms && rooms.length > 0 ? (
              rooms.map((room) => (
                <button 
                  key={room._id} 
                  onClick={() => onSelectRoom(room)} 
                  className={`list-group-item list-group-item-action border-0 rounded mb-1 d-flex align-items-center ${
                    activeRoomId === room._id ? 'active bg-primary text-white shadow' : ''
                  }`}
                >
                  <span className="me-2">{room.isPrivate ? '🔒' : '#'}</span>
                  <span className="text-truncate">{room.name}</span>
                </button>
              ))
            ) : (
              <div className="text-muted small ps-2 italic">Not in any rooms yet.</div>
            )}
          </div>

          {/* --- SECTION 3: DISCOVER PUBLIC --- */}
          <h6 className="text-muted small text-uppercase mb-2 ps-2 fw-bold">Discover</h6>
          <div className="list-group list-group-flush">
            {publicRooms.map(room => (
              <button 
                key={room._id}
                onClick={() => handleJoinPublic(room._id)}
                className="list-group-item list-group-item-action border-0 small py-1"
              >
                + Join # {room.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default JoinRoom;