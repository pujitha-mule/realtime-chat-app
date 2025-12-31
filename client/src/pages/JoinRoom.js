import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { joinRoomByCode } from '../services/api'; // Ensure this matches your api service export

const JoinRoom = () => {
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  /**
   * ✅ INTEGRATED HANDLER
   * Joins a private room via code and redirects to chat
   */
  const handleJoinByCode = async (e) => {
    e.preventDefault();
    const cleanCode = inviteCode.trim().toUpperCase();
    console.log("Attempting to join with code:", cleanCode); 
    
    setLoading(true);
    setError('');

    try {
      // Calls api.post('/rooms/join-code', { code })
      const { data } = await joinRoomByCode(cleanCode);
      
      // Redirect to chat and pass the room data in state
      // Chat.js will detect this in useEffect and setCurrentRoom(data)
      navigate('/chat', { state: { autoSelectRoom: data } }); 
    } catch (err) {
      console.error("Join Room Error:", err);
      setError(err.response?.data?.message || "Invalid code or server error.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="d-flex align-items-center justify-content-center" style={{ minHeight: '80vh' }}>
      <Card className="shadow-sm border-0" style={{ maxWidth: '400px', width: '100%' }}>
        <Card.Body className="p-4">
          <div className="text-center mb-4">
            <div className="bg-light rounded-circle d-inline-flex align-items-center justify-content-center mb-2" style={{ width: '60px', height: '60px' }}>
              <span style={{ fontSize: '1.5rem' }}>🔐</span>
            </div>
            <h3 className="fw-bold">Join Private Room</h3>
            <p className="text-muted small">Enter the 6-character invite code provided by the room owner.</p>
          </div>

          {error && <Alert variant="danger" className="py-2 small">{error}</Alert>}

          <Form onSubmit={handleJoinByCode}>
            <Form.Group className="mb-3">
              <Form.Label className="small fw-bold">Invite Code</Form.Label>
              <Form.Control
                type="text"
                placeholder="e.g. XJ72KL"
                className="text-center fw-bold text-uppercase"
                style={{ letterSpacing: '2px', fontSize: '1.2rem' }}
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                maxLength={6}
                required
                autoFocus
              />
            </Form.Group>

            <div className="d-grid gap-2">
              <Button 
                variant="primary" 
                type="submit" 
                disabled={loading || inviteCode.length < 3}
                className="fw-bold py-2"
              >
                {loading ? <Spinner animation="border" size="sm" /> : "Join Room"}
              </Button>
              <Button 
                variant="link" 
                className="text-decoration-none text-secondary small"
                onClick={() => navigate('/chat')}
              >
                Back to Chat
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default JoinRoom;