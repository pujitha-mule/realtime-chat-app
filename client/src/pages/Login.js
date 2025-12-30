import { useState } from "react";
import api from "../services/api";
import { useNavigate, Link, useLocation } from "react-router-dom";

function Login({ setAuth }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const successMessage = location.state?.message;

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await api.post("/auth/login", {
        email: email.toLowerCase().trim(),
        password,
      });

      // 🔥 SINGLE SOURCE OF TRUTH
      setAuth(res.data.token, res.data.user);

      // Navigate AFTER state update
      navigate("/chat", { replace: true });
    } catch (err) {
      console.error("Login error:", err.response || err);
      setError(
        err.response?.data?.message ||
          "Invalid email or password. Is the server running?"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mt-5">
      <div className="row justify-content-center">
        <div className="col-md-4">
          <div className="card shadow border-0 p-4">
            <h3 className="text-center mb-4 fw-bold text-primary">Login</h3>

            {successMessage && !error && (
              <div className="alert alert-success py-2 small text-center">
                {successMessage}
              </div>
            )}

            {error && (
              <div className="alert alert-danger py-2 small text-center">
                {error}
              </div>
            )}

            <form onSubmit={handleLogin}>
              <div className="mb-3">
                <label className="form-label small fw-bold text-muted">
                  Email Address
                </label>
                <input
                  type="email"
                  className="form-control"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="mb-4">
                <label className="form-label small fw-bold text-muted">
                  Password
                </label>
                <input
                  type="password"
                  className="form-control"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary w-100 fw-bold"
                disabled={loading}
              >
                {loading ? (
                  <span className="spinner-border spinner-border-sm me-2" />
                ) : (
                  "Login"
                )}
              </button>
            </form>

            <div className="text-center mt-4">
              <p className="small text-muted mb-0">
                Don’t have an account?{" "}
                <Link to="/register" className="text-decoration-none">
                  Register
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
