import "bootstrap/dist/css/bootstrap.min.css";

import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

// Toastify Imports
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import Login from "./pages/Login";
import Register from "./pages/Register";
import Chat from "./pages/Chat";
import JoinRoom from "./pages/JoinRoom";

function App() {
  const [auth, setAuth] = useState(() => {
    const token = localStorage.getItem("token");
    const user = localStorage.getItem("user");
    try {
      return token && user ? { token, user: JSON.parse(user) } : null;
    } catch (e) {
      return null;
    }
  });

  useEffect(() => {
    const syncAuth = () => {
      const token = localStorage.getItem("token");
      const user = localStorage.getItem("user");
      if (!token || !user) {
        setAuth(null);
      } else {
        try {
          setAuth({ token, user: JSON.parse(user) });
        } catch (e) {
          setAuth(null);
        }
      }
    };
    window.addEventListener("storage", syncAuth);
    return () => window.removeEventListener("storage", syncAuth);
  }, []);

  const handleSetAuth = (token, user) => {
    if (token && user) {
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      setAuth({ token, user });
    } else {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      setAuth(null);
    }
  };

  const isAuthenticated = Boolean(auth);

  return (
    <Router 
      future={{ 
        v7_startTransition: true, 
        v7_relativeSplatPath: true 
      }}
    >
      <div className="bg-light" style={{ minHeight: "100vh" }}>
        <Routes>
          {/* PUBLIC ROUTES */}
          <Route
            path="/login"
            element={!isAuthenticated ? <Login setAuth={handleSetAuth} /> : <Navigate to="/chat" replace />}
          />
          <Route
            path="/register"
            element={!isAuthenticated ? <Register /> : <Navigate to="/chat" replace />}
          />

          {/* PROTECTED ROUTES */}
          <Route
            path="/chat"
            element={isAuthenticated ? <Chat setAuth={handleSetAuth} auth={auth} /> : <Navigate to="/login" replace />}
          />

          <Route
            path="/join"
            element={isAuthenticated ? <JoinRoom /> : <Navigate to="/login" replace />}
          />

          {/* FALLBACK */}
          <Route
            path="*"
            element={<Navigate to={isAuthenticated ? "/chat" : "/login"} replace />}
          />
        </Routes>

        {/* --- GLOBAL TOAST CONTAINER --- */}
        {/* Set to top-center as requested */}
        <ToastContainer 
          position="top-center" 
          autoClose={4000} 
          hideProgressBar={false} 
          newestOnTop={false} 
          closeOnClick 
          rtl={false} 
          pauseOnFocusLoss 
          draggable 
          pauseOnHover 
          theme="colored" 
        />
      </div>
    </Router>
  );
}

export default App;