import { useState } from "react";
import apiClient from "../api/client";

function Register({ onBackToLogin }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // ================= REGISTER =================

  const handleRegister = async (event) => {
    event.preventDefault();

    setLoading(true);
    setMessage("");

    try {
      await apiClient.post("/auth/register", {
        name,
        email,
        password,
      });

      setMessage(
        "Registration successful! Please login."
      );

      setName("");
      setEmail("");
      setPassword("");

    } catch (error) {
      const detail =
        error.response?.data?.detail ||
        "Registration failed. Please try again.";

      setMessage(detail);

    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">

      {/* ================= BACKGROUND ================= */}

      <div className="decor decor-1"></div>
      <div className="decor decor-2"></div>
      <div className="decor decor-3"></div>


      {/* ================= LEFT REGISTER ================= */}

      <div className="login-section">

        <div className="login-card">

          {/* Cloud Logo */}

          <div className="cloud-logo">

            <div className="cloud-shape">
              ☁
              <span>↑</span>
            </div>

          </div>


          {/* Heading */}

          <h1>
            Create Account
          </h1>

          <p className="login-subtitle">
            Create your Cloud Storage account
          </p>


          {/* ================= FORM ================= */}

          <form onSubmit={handleRegister}>

            {/* Name */}

            <div className="login-field">

              <label>
                <span className="input-icon">
                  ●
                </span>

                Name
              </label>

              <div className="input-wrapper">

                <span className="inside-icon">
                  ●
                </span>

                <input
                  type="text"
                  placeholder="Enter your name"
                  value={name}
                  onChange={(event) =>
                    setName(event.target.value)
                  }
                  autoComplete="name"
                  required
                />

              </div>

            </div>


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
                  autoComplete="email"
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
                  placeholder="Create a password"
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  autoComplete="new-password"
                  required
                  minLength={6}
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

              <div className="password-hint">
                Password must be at least 6 characters
              </div>

            </div>


            {/* Register Button */}

            <button
              type="submit"
              className="login-button"
              disabled={loading}
            >

              <span className="button-icon">
                +
              </span>

              {loading
                ? "Creating account..."
                : "Register"}

            </button>

          </form>


          {/* ================= MESSAGE ================= */}

          {message && (
            <div className="login-message">
              {message}
            </div>
          )}


          {/* ================= DIVIDER ================= */}

          <div className="divider">

            <span></span>

            <strong>or</strong>

            <span></span>

          </div>


          {/* ================= BACK TO LOGIN ================= */}

          <button
            type="button"
            className="create-account-button"
            onClick={onBackToLogin}
          >

            <span>
              ←
            </span>

            Back to Login

          </button>


          {/* Security */}

          <div className="register-security">
            🛡 Your information is securely protected
          </div>

        </div>

      </div>


      {/* ================= RIGHT INFORMATION ================= */}

      <div className="info-section">

        <div className="cloud-illustration">

          {/* File cards */}

          <div className="floating-file file-one">
            📄
          </div>

          <div className="floating-file file-two">
            🖼️
          </div>

          <div className="floating-file file-three">
            ▶
          </div>


          {/* Cloud */}

          <div className="big-cloud">
            ☁
            <span>↑</span>
          </div>


          {/* Folder */}

          <div className="folder">
            📁
          </div>

        </div>


        <h2>
          Your files. Your cloud.
        </h2>

        <p>
          Create your account and securely
          store, access and share your files
          from anywhere.
        </p>


        {/* Features */}

        <div className="register-features">

          <div className="register-feature">

            <span>
              🛡
            </span>

            <div>
              <strong>Secure</strong>
              <small>
                Your data stays protected
              </small>
            </div>

          </div>


          <div className="register-feature">

            <span>
              ☁
            </span>

            <div>
              <strong>Cloud Access</strong>
              <small>
                Access files anywhere
              </small>
            </div>

          </div>


          <div className="register-feature">

            <span>
              👥
            </span>

            <div>
              <strong>Easy Sharing</strong>
              <small>
                Share files seamlessly
              </small>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}

export default Register;