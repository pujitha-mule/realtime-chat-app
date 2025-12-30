import React from 'react';
import JoinRoom from './JoinRoom'; // Import the component you just created

const RoomList = ({ rooms }) => {
  return (
    <div className="sidebar bg-light border-end vh-100">
      <div className="p-3">
        <h5 className="mb-3">Channels</h5>
        
        {/* --- ADD THE JOIN COMPONENT HERE --- */}
        <div className="mb-4 border rounded bg-white shadow-sm">
          <JoinRoom />
        </div>

        <div className="list-group">
          {rooms.map(room => (
            <button key={room._id} className="list-group-item list-group-item-action">
              # {room.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RoomList;