import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, LockKeyhole, UserRound } from "lucide-react";

import { useAuth } from "../auth/AuthContext";
import "../style/login.css";
import { useToast } from "../ToastContext";

// Change this path to your actual logo
import ValueCareLogo from "../assets/ValueCareLogo.png";

export default function LoginPage() {
  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [employeeId, setEmployeeId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();

    if (!employeeId.trim() || !password.trim()) {
      showToast("Please enter your employee ID and password.", "error");
      return;
    }

    try {
      await login(employeeId, password);
      navigate("/");
    } catch {
      showToast("Invalid employee ID or password.", "error");
    }
  }

  return (
    <div className="login-page">
      {/* Decorative background shapes */}
      <div className="login-decoration login-decoration-one" />
      <div className="login-decoration login-decoration-two" />

      <main className="login-wrapper">
        <div className="login-card">
          {/* BRAND */}
          <div className="login-brand">
            <div className="login-logo">
              <img src={ValueCareLogo} alt="ValueCare" />
            </div>

            <span className="login-brand-name">
              Value<span>Care</span>
            </span>
          </div>

          {/* HEADING */}
          <div className="login-heading">
            <h1>Welcome back</h1>
            <p>Sign in to continue to your workspace.</p>
          </div>

          {/* FORM */}
          <form onSubmit={submit} className="login-form">
            <div className="login-field">
              <label htmlFor="employeeId">Employee ID</label>

              <div className="login-input-wrapper">
                <UserRound size={18} />

                <input
                  id="employeeId"
                  type="text"
                  placeholder="Enter your employee ID"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="login-field">
              <div className="login-label-row">
                <label htmlFor="password">Password</label>
              </div>

              <div className="login-input-wrapper">
                <LockKeyhole size={18} />

                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={
                    showPassword ? "Hide password" : "Show password"
                  }
                >
                  {showPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>
            </div>

            <button type="submit" className="login-button">
              Sign in
            </button>
          </form>

          {/* FOOTER */}
          <div className="login-footer">
            <span>ValueCare</span>
            <span className="login-footer-dot">•</span>
            <span>Business Management System</span>
          </div>
        </div>

        {/* SIDE BRANDING */}
        <div className="login-side">
          <div className="login-side-content">
            <span className="login-side-label">VALUECARE</span>

            <h2>
              Supporting better healthcare,
              <br />
              <strong>every day.</strong>
            </h2>

            <p>
              Providing reliable medical supplies to help healthcare professionals, businesses, and communities get the products they need.
            </p>

            <div className="login-side-line">
              <span />
              <span />
              <span />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
