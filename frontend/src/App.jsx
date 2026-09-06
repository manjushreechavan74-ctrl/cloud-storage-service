import { useState } from "react";
import apiClient from "./api/client";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import "./App.css";

function App() {
  const [showRegister, setShowRegister] = useState(false);

  const [isLoggedIn, setIsLoggedIn] = useState(
    !!localStorage.getItem("access_token")
  );

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // ================= LOGIN =================

  const handleLogin = async (event) => {
    event.preventDefault();

    setLoading(true);
    setMessage("");

    try {
      const response = await apiClient.post("/auth/login", {
        email,
        password,
      });

      const accessToken = response.data.access_token;

      localStorage.setItem("access_token", accessToken);

      setIsLoggedIn(true);
    } catch (error) {
      const detail =
        error.response?.data?.detail ||
        "Login failed. Please check your email and password.";

      setMessage(detail);
    } finally {
      setLoading(false);
    }
  };

  // ================= REGISTER =================

  if (showRegister) {
    return (
      <Register
        onBackToLogin={() => {
          setShowRegister(false);
          setMessage("");
        }}
      />
    );
  }

  // ================= DASHBOARD =================

  if (isLoggedIn) {
    return (
      <Dashboard
        onLogout={() => {
          localStorage.removeItem("access_token");
          setIsLoggedIn(false);
        }}
      />
    );
  }

  // ================= LOGIN PAGE =================

  return (
    <div className="login-page">

      <div className="decor decor-1"></div>
      <div className="decor decor-2"></div>
      <div className="decor decor-3"></div>

      {/* ================= LEFT LOGIN ================= */}

      <div className="login-section">

        <div className="login-card">

          {/* Logo */}

          <div className="cloud-logo">
            <div className="cloud-shape">
              ☁
              <span>↑</span>
            </div>
          </div>

          <h1>Cloud Storage</h1>

          <p className="login-subtitle">
            Sign in to your account
          </p>

          <form onSubmit={handleLogin}>

            {/* Email */}

            <div className="login-field">

              <label>
                <span className="input-icon">
                  ✉
                </span>
                Email
              </label>

              <div className="input-wrapper">

                <span className="inside-icon">
                  ✉
                </span>

                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(event) =>
                    setEmail(event.target.value)
                  }
                  required
                />

              </div>

            </div>

            {/* Password */}

            <div className="login-field">

              <label>
                <span className="input-icon">
                  🔒
                </span>
                Password
              </label>

              <div className="input-wrapper">

                <span className="inside-icon">
                  🔒
                </span>

                <input
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  placeholder="Enter your password"
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  required
                />

                <button
                  type="button"
                  className="eye-button"
                  onClick={() =>
                    setShowPassword(!showPassword)
                  }
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                >
                  {showPassword ? "◉" : "◌"}
                </button>

              </div>

            </div>

            {/* Login Button */}

            <button
              type="submit"
              className="login-button"
              disabled={loading}
            >

              <span className="button-icon">
                →
              </span>

              {loading
                ? "Signing in..."
                : "Login"}

            </button>

          </form>

          {/* Message */}

          {message && (
            <div className="login-message">
              {message}
            </div>
          )}

          {/* Divider */}

          <div className="divider">
            <span></span>
            <strong>or</strong>
            <span></span>
          </div>

          {/* Create Account */}

          <button
            type="button"
            className="create-account-button"
            onClick={() => {
              setShowRegister(true);
              setMessage("");
            }}
          >
            <span>♙</span>
            Create Account
          </button>

        </div>

      </div>

      {/* ================= RIGHT SIDE ================= */}

      <div className="info-section">

        <div className="cloud-illustration">

          <div className="floating-file file-one">
            📄
          </div>

          <div className="floating-file file-two">
            🖼️
          </div>

          <div className="floating-file file-three">
            ▶
          </div>

          <div className="big-cloud">
            ☁
            <span>↑</span>
          </div>

          <div className="folder">
            📁
          </div>

        </div>

        <h2>
          Store. Access. Share.
        </h2>

        <p>
          Securely store your files in the cloud
          and access them anytime, anywhere.
          Share with anyone, seamlessly.
        </p>

      </div>

    </div>
  );
}

export default App;