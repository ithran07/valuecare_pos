import { useState } from "react";
import {
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Mail,
  Phone,
  ShieldCheck,
  UserRound,
  XCircle,
} from "lucide-react";

import { useAuth } from "../auth/AuthContext";
import "./../style/account.css";
import { useToast } from "../ToastContext";

export default function AccountPage() {
  const { user } = useAuth();
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [currentPasswordVerified, setCurrentPasswordVerified] = useState(false);
  const [verifyingPassword, setVerifyingPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const fullName =
    `${user?.first_name || ""} ${user?.last_name || ""}`.trim() ||
    user?.employee_id ||
    "User";
  const { showToast } = useToast();
  const role = user?.role
    ?.replaceAll("_", " ")
    ?.replace(/\b\w/g, (char) => char.toUpperCase()) || "User";

  const initials = `${user?.first_name?.[0] || ""}${user?.last_name?.[0] || ""}`
    .toUpperCase() ||
    user?.employee_id?.[0]?.toUpperCase() ||
    "U";

  const verifyCurrentPassword = async () => {
    setPasswordError("");
    setPasswordSuccess("");

    if (!currentPassword) {
      setPasswordError("Please enter your current password.");
      return;
    }

    try {
      setVerifyingPassword(true);

      const response = await fetch(
        `${
          import.meta.env.VITE_API_URL ||
          "http://127.0.0.1:8000/api"
        }/auth/login/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            employee_id: user?.employee_id,
            password: currentPassword,
          }),
        },
      );

      if (!response.ok) {
        setCurrentPasswordVerified(false);
        setPasswordError("Current password is incorrect.");
        return;
      }

      setCurrentPasswordVerified(true);
      setPasswordError("");
    } catch {
      setCurrentPasswordVerified(false);
      setPasswordError(
        "Unable to verify your password. Please try again.",
      );
    } finally {
      setVerifyingPassword(false);
    }
  };

  const handleChangePassword = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!currentPassword || !newPassword || !confirmPassword) {
      showToast("Please complete all password fields.", "error");
      return;
    }

    if (newPassword.length < 8) {
      showToast("New password must contain at least 8 characters.", "error");
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast(
        "New password and confirmation password do not match.",
        "error",
      );
      return;
    }

    if (currentPassword === newPassword) {
      showToast(
        "Your new password must be different from your current password.",
        "error",
      );
      return;
    }

    try {
      setChangingPassword(true);

      const token = localStorage.getItem("access_token");

      const response = await fetch(
        `${
          import.meta.env.VITE_API_URL ||
          "http://127.0.0.1:8000/api"
        }/auth/change-password/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            current_password: currentPassword,
            new_password: newPassword,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.detail ||
            data?.current_password?.[0] ||
            data?.new_password?.[0] ||
            "Unable to change password.",
        );
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      showToast("Your password has been changed successfully.", "success");
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Unable to change password.",
        "error",
      );
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="account-page">
      {/* PAGE HEADER */}
      <div className="account-page-header">
        <div>
          <span className="account-kicker">
            Account Settings
          </span>

          <h1>My Account</h1>

          <p>
            Manage your employee profile and account security.
          </p>
        </div>
      </div>

      {/* PROFILE CARD */}
      <section className="account-card profile-card">
        <div className="account-card-header">
          <div>
            <span className="account-section-label">
              Profile
            </span>

            <h2>Personal Information</h2>
          </div>

          <div className="account-header-icon">
            <UserRound size={20} />
          </div>
        </div>

        {/* PROFILE INTRO */}
        <div className="profile-intro">
          <div className="profile-avatar">
            {initials}
          </div>

          <div className="profile-identity">
            <h3>{fullName}</h3>

            <span className="profile-status">
              <span className="status-dot" />
              Active account
            </span>
          </div>
        </div>

        {/* INFORMATION GRID */}
        <div className="account-info-grid">
          {/* EMPLOYEE ID */}
          <div className="account-info-item">
            <div className="account-info-icon purple">
              <UserRound size={18} />
            </div>

            <div>
              <span>Employee ID</span>

              <strong>
                {user?.employee_id || "Not set"}
              </strong>
            </div>
          </div>

          {/* EMAIL */}
          <div className="account-info-item">
            <div className="account-info-icon blue">
              <Mail size={18} />
            </div>

            <div>
              <span>Email Address</span>

              <strong>
                {user?.email || "Not provided"}
              </strong>
            </div>
          </div>

          {/* ROLE */}
          <div className="account-info-item">
            <div className="account-info-icon violet">
              <ShieldCheck size={18} />
            </div>

            <div>
              <span>Role</span>

              <strong>{role}</strong>
            </div>
          </div>

          {/* CONTACT */}
          <div className="account-info-item">
            <div className="account-info-icon orange">
              <Phone size={18} />
            </div>

            <div>
              <span>Contact Number</span>
              <strong>
                {user?.phone || "0"}
              </strong>
            </div>
          </div>

          {/* ACCOUNT STATUS */}
          <div className="account-info-item">
            <div className="account-info-icon green">
              <CheckCircle2 size={18} />
            </div>

            <div>
              <span>Account Status</span>

              <strong className="active-text">
                Active
              </strong>
            </div>
          </div>

          {/* ACCOUNT TYPE */}
          <div className="account-info-item">
            <div className="account-info-icon gray">
              <KeyRound size={18} />
            </div>

            <div>
              <span>Account Type</span>

              <strong>Employee Account</strong>
            </div>
          </div>
        </div>
      </section>

      {/* SECURITY CARD */}
      <section className="account-card security-card">
        <div className="account-card-header">
          <div>
            <span className="account-section-label">
              Security
            </span>

            <h2>Change Password</h2>

            <p className="account-card-description">
              Update your password regularly to help keep your account secure.
            </p>
          </div>

          <div className="account-header-icon security">
            <KeyRound size={20} />
          </div>
        </div>

        {/* SUCCESS MESSAGE */}
        {successMessage && (
          <div className="account-alert success">
            <CheckCircle2 size={18} />

            <span>{successMessage}</span>
          </div>
        )}

        {/* ERROR MESSAGE */}
        {errorMessage && (
          <div className="account-alert error">
            <XCircle size={18} />

            <span>{errorMessage}</span>
          </div>
        )}

        <form
          className="password-form"
          onSubmit={handleChangePassword}
        >
          {/* CURRENT PASSWORD */}
          <div className="password-field">
            <label htmlFor="current-password">
              Current Password
            </label>

            <div className="password-input-wrapper">
              <input
                id="current-password"
                type={showCurrentPassword ? "text" : "password"}
                value={currentPassword}
                onChange={(event) => {
                  setCurrentPassword(event.target.value);
                  setCurrentPasswordVerified(false);
                  setPasswordError("");
                }}
                placeholder="Enter your current password"
                autoComplete="current-password"
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() =>
                  setShowCurrentPassword(
                    (previous) => !previous,
                  )}
              >
                {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {!currentPasswordVerified && (
              <button
                type="button"
                className="verify-password-button"
                onClick={verifyCurrentPassword}
                disabled={verifyingPassword}
              >
                {verifyingPassword ? "Verifying..." : "Verify Current Password"}
              </button>
            )}

            {passwordError && (
              <span className="password-error">
                {passwordError}
              </span>
            )}

            {currentPasswordVerified && (
              <>
                {/* NEW PASSWORD */}

                <div className="password-field">
                  <label htmlFor="new-password">
                    New Password
                  </label>

                  <div className="password-input-wrapper">
                    <input
                      id="new-password"
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      placeholder="Enter your new password"
                      autoComplete="new-password"
                    />

                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() =>
                        setShowNewPassword(
                          (previous) => !previous,
                        )}
                    >
                      {showNewPassword
                        ? <EyeOff size={18} />
                        : <Eye size={18} />}
                    </button>
                  </div>

                  <span className="password-hint">
                    Use at least 8 characters.
                  </span>
                </div>

                {/* CONFIRM PASSWORD */}

                <div className="password-field">
                  <label htmlFor="confirm-password">
                    Confirm New Password
                  </label>

                  <div className="password-input-wrapper">
                    <input
                      id="confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(event) =>
                        setConfirmPassword(
                          event.target.value,
                        )}
                      placeholder="Confirm your new password"
                      autoComplete="new-password"
                    />

                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() =>
                        setShowConfirmPassword(
                          (previous) => !previous,
                        )}
                    >
                      {showConfirmPassword
                        ? <EyeOff size={18} />
                        : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* CHANGE PASSWORD BUTTON */}

                <div className="password-form-footer">
                  <p>
                    You will need to use your new password the next time you
                    sign in.
                  </p>

                  <button
                    type="submit"
                    className="change-password-button"
                    disabled={changingPassword}
                  >
                    <KeyRound size={17} />

                    {changingPassword ? "Changing..." : "Change Password"}
                  </button>
                </div>
              </>
            )}
          </div>
        </form>
      </section>
    </div>
  );
}
