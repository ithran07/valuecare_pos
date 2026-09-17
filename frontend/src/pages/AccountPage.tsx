import { useMemo, useState } from "react";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  Mail,
  Phone,
  ShieldCheck,
  UserRound,
  XCircle,
} from "lucide-react";

import { useAuth } from "../auth/AuthContext";
import { useToast } from "../ToastContext";
import "./../style/account.css";

export default function AccountPage() {
  const { user } = useAuth();
  const { showToast } = useToast();

  /* =========================================================
     PASSWORD STATE
  ========================================================= */

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

  /* =========================================================
     USER INFORMATION
  ========================================================= */

  const fullName =
    `${user?.first_name || ""} ${user?.last_name || ""}`.trim() ||
    user?.employee_id ||
    "User";

  const role = user?.role
    ?.replaceAll("_", " ")
    ?.replace(/\b\w/g, (char) => char.toUpperCase()) || "User";

  const initials =
    `${user?.first_name?.[0] || ""}${user?.last_name?.[0] || ""}`
      .toUpperCase() ||
    user?.employee_id?.[0]?.toUpperCase() ||
    "U";

  /* =========================================================
     PASSWORD STRENGTH
  ========================================================= */

  const passwordStrength = useMemo(() => {
    if (!newPassword) {
      return {
        score: 0,
        label: "Not started",
      };
    }

    let score = 0;

    if (newPassword.length >= 8) score++;
    if (/[A-Z]/.test(newPassword)) score++;
    if (/[a-z]/.test(newPassword)) score++;
    if (/[0-9]/.test(newPassword)) score++;
    if (/[^A-Za-z0-9]/.test(newPassword)) score++;

    if (score <= 2) {
      return {
        score,
        label: "Weak",
      };
    }

    if (score === 3) {
      return {
        score,
        label: "Fair",
      };
    }

    if (score === 4) {
      return {
        score,
        label: "Good",
      };
    }

    return {
      score,
      label: "Strong",
    };
  }, [newPassword]);

  const passwordsMatch = confirmPassword.length > 0 &&
    newPassword === confirmPassword;

  /* =========================================================
     VERIFY CURRENT PASSWORD
  ========================================================= */

  const verifyCurrentPassword = async () => {
    setPasswordError("");
    setPasswordSuccess("");

    if (!currentPassword) {
      setPasswordError("Enter your current password first.");
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
        setPasswordError("The current password is incorrect.");
        return;
      }

      setCurrentPasswordVerified(true);
      setPasswordError("");
      setPasswordSuccess("Current password verified.");
    } catch {
      setCurrentPasswordVerified(false);
      setPasswordError(
        "Unable to verify your password. Please try again.",
      );
    } finally {
      setVerifyingPassword(false);
    }
  };

  /* =========================================================
     CHANGE PASSWORD
  ========================================================= */

  const handleChangePassword = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    setPasswordError("");
    setPasswordSuccess("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      showToast("Please complete all password fields.", "error");
      return;
    }

    if (!currentPasswordVerified) {
      showToast("Please verify your current password first.", "error");
      return;
    }

    if (newPassword.length < 8) {
      showToast(
        "New password must contain at least 8 characters.",
        "error",
      );
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
      setCurrentPasswordVerified(false);

      setPasswordSuccess(
        "Your password has been changed successfully.",
      );

      showToast(
        "Your password has been changed successfully.",
        "success",
      );
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Unable to change password.",
        "error",
      );
    } finally {
      setChangingPassword(false);
    }
  };

  /* =========================================================
     RESET VERIFICATION WHEN CURRENT PASSWORD CHANGES
  ========================================================= */

  const handleCurrentPasswordChange = (
    value: string,
  ) => {
    setCurrentPassword(value);
    setCurrentPasswordVerified(false);
    setPasswordError("");
    setPasswordSuccess("");
  };

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <div className="account-page">
      {
        /* =====================================================
          PAGE INTRO
      ===================================================== */
      }

      <header className="account-page-header">
        <div>
          <div className="account-breadcrumb">
            <span>Settings</span>
            <ArrowRight size={13} />
            <strong>My Account</strong>
          </div>

          <div className="account-title-row">
            <div>
              <span className="account-kicker">
                Account settings
              </span>

              <h1>My Account</h1>

              <p>
                Manage your profile information and keep your account security
                up to date.
              </p>
            </div>
          </div>
        </div>

        <div className="account-page-status">
          <span className="status-dot" />
          <span>Account active</span>
        </div>
      </header>

      {
        /* =====================================================
          MAIN LAYOUT
      ===================================================== */
      }

      <div className="account-layout">
        {
          /* ===================================================
            PROFILE COLUMN
        =================================================== */
        }

        <div className="account-profile-column">
          {/* PROFILE HERO */}

          <section className="account-card profile-hero-card">
            <div className="profile-cover" />

            <div className="profile-hero-content">
              <div className="profile-avatar-large">
                {initials}
                <span className="profile-avatar-status" />
              </div>

              <div className="profile-hero-identity">
                <div className="profile-name-row">
                  <h2>{fullName}</h2>

                  <span className="verified-badge">
                    <Check size={12} />
                    Verified
                  </span>
                </div>
              </div>
            </div>

            <div className="profile-summary">
              <div>
                <span>ACCOUNT STATUS</span>
                <strong className="summary-active">
                  <span />
                  Active
                </strong>
              </div>

              <div>
                <span>ACCOUNT TYPE</span>
                <strong>Employee Account</strong>
              </div>

              <div>
                <span>ACCESS ROLE</span>
                <strong>{role}</strong>
              </div>
            </div>
          </section>

          {/* PERSONAL INFORMATION */}

          <section className="account-card">
            <div className="account-card-header">
              <div>
                <span className="account-section-label">
                  Profile details
                </span>

                <h2>Personal Information</h2>

                <p className="account-card-description">
                  Information associated with your employee account.
                </p>
              </div>

              <div className="account-header-icon purple">
                <UserRound size={19} />
              </div>
            </div>

            <div className="account-info-grid">
              <div className="account-info-item">
                <div className="account-info-icon purple">
                  <UserRound size={17} />
                </div>

                <div>
                  <span>Employee ID</span>
                  <strong>
                    {user?.employee_id || "Not set"}
                  </strong>
                </div>
              </div>

              <div className="account-info-item">
                <div className="account-info-icon blue">
                  <Mail size={17} />
                </div>

                <div>
                  <span>Email Address</span>
                  <strong title={user?.email || "Not provided"}>
                    {user?.email || "Not provided"}
                  </strong>
                </div>
              </div>

              <div className="account-info-item">
                <div className="account-info-icon violet">
                  <ShieldCheck size={17} />
                </div>

                <div>
                  <span>Role</span>
                  <strong>{role}</strong>
                </div>
              </div>

              <div className="account-info-item">
                <div className="account-info-icon orange">
                  <Phone size={17} />
                </div>

                <div>
                  <span>Contact Number</span>
                  <strong>
                    {user?.phone || "Not provided"}
                  </strong>
                </div>
              </div>

              <div className="account-info-item">
                <div className="account-info-icon green">
                  <CheckCircle2 size={17} />
                </div>

                <div>
                  <span>Account Status</span>
                  <strong className="active-text">
                    Active
                  </strong>
                </div>
              </div>

              <div className="account-info-item">
                <div className="account-info-icon gray">
                  <KeyRound size={17} />
                </div>

                <div>
                  <span>Account Type</span>
                  <strong>
                    Employee Account
                  </strong>
                </div>
              </div>
            </div>
          </section>
        </div>

        {
          /* ===================================================
            SECURITY COLUMN
        =================================================== */
        }

        <div className="account-security-column">
          <section className="account-card security-card">
            <div className="security-heading">
              <div className="security-icon">
                <LockKeyhole size={21} />
              </div>

              <div>
                <span className="account-section-label">
                  Account security
                </span>

                <h2>Change Password</h2>

                <p className="account-card-description">
                  Protect your account with a strong, unique password.
                </p>
              </div>
            </div>

            {/* SECURITY NOTICE */}

            <div className="security-notice">
              <div className="security-notice-icon">
                <ShieldCheck size={16} />
              </div>

              <div>
                <strong>Keep your account secure</strong>
                <p>
                  Verify your current password before creating a new one.
                </p>
              </div>
            </div>

            {/* SUCCESS */}

            {passwordSuccess && (
              <div className="account-alert success">
                <CheckCircle2 size={17} />
                <span>{passwordSuccess}</span>
              </div>
            )}

            {/* ERROR */}

            {passwordError && (
              <div className="account-alert error">
                <XCircle size={17} />
                <span>{passwordError}</span>
              </div>
            )}

            <form
              className="password-form"
              onSubmit={handleChangePassword}
            >
              {/* CURRENT PASSWORD */}

              <div className="password-field">
                <div className="password-label-row">
                  <label htmlFor="current-password">
                    Current Password
                  </label>

                  {currentPasswordVerified && (
                    <span className="field-verified">
                      <Check size={11} />
                      Verified
                    </span>
                  )}
                </div>

                <div
                  className={`password-input-wrapper ${
                    currentPasswordVerified ? "verified-input" : ""
                  }`}
                >
                  <LockKeyhole size={16} />

                  <input
                    id="current-password"
                    name="current-password"
                    type={showCurrentPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(event) =>
                      handleCurrentPasswordChange(
                        event.target.value,
                      )}
                    placeholder="Enter current password"
                    autoComplete="current-password"
                  />

                  <button
                    type="button"
                    className="password-toggle"
                    aria-label={showCurrentPassword
                      ? "Hide current password"
                      : "Show current password"}
                    onClick={() =>
                      setShowCurrentPassword(
                        (previous) => !previous,
                      )}
                  >
                    {showCurrentPassword
                      ? <EyeOff size={17} />
                      : <Eye size={17} />}
                  </button>
                </div>

                {!currentPasswordVerified && (
                  <button
                    type="button"
                    className="verify-password-button"
                    onClick={verifyCurrentPassword}
                    disabled={verifyingPassword ||
                      !currentPassword}
                  >
                    {verifyingPassword
                      ? (
                        <>
                          <span className="button-spinner" />
                          Verifying password...
                        </>
                      )
                      : (
                        <>
                          <ShieldCheck size={14} />
                          Verify Current Password
                        </>
                      )}
                  </button>
                )}
              </div>

              {/* NEW PASSWORD */}

              {currentPasswordVerified && (
                <div className="password-transition">
                  <div className="password-step-divider">
                    <span />
                    <small>Set new password</small>
                    <span />
                  </div>

                  <div className="password-field">
                    <label htmlFor="new-password">
                      New Password
                    </label>

                    <div className="password-input-wrapper">
                      <KeyRound size={16} />

                      <input
                        id="new-password"
                        name="new-password"
                        type={showNewPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(event) => {
                          setNewPassword(
                            event.target.value,
                          );
                          setPasswordError("");
                        }}
                        placeholder="Create a new password"
                        autoComplete="new-password"
                      />

                      <button
                        type="button"
                        className="password-toggle"
                        aria-label={showNewPassword
                          ? "Hide new password"
                          : "Show new password"}
                        onClick={() =>
                          setShowNewPassword(
                            (previous) => !previous,
                          )}
                      >
                        {showNewPassword
                          ? <EyeOff size={17} />
                          : <Eye size={17} />}
                      </button>
                    </div>

                    {newPassword && (
                      <div className="password-strength">
                        <div className="strength-header">
                          <span>Password strength</span>

                          <strong
                            className={`strength-${passwordStrength.label.toLowerCase()}`}
                          >
                            {passwordStrength.label}
                          </strong>
                        </div>

                        <div className="strength-bars">
                          {[1, 2, 3, 4, 5].map((bar) => (
                            <span
                              key={bar}
                              className={bar <=
                                  passwordStrength.score
                                ? "filled"
                                : ""}
                            />
                          ))}
                        </div>

                        <p>
                          Use 8+ characters with a mix of uppercase, lowercase,
                          numbers and symbols.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* CONFIRM PASSWORD */}

                  <div className="password-field">
                    <div className="password-label-row">
                      <label htmlFor="confirm-password">
                        Confirm New Password
                      </label>

                      {passwordsMatch && (
                        <span className="field-verified">
                          <Check size={11} />
                          Matches
                        </span>
                      )}
                    </div>

                    <div
                      className={`password-input-wrapper ${
                        passwordsMatch ? "verified-input" : ""
                      }`}
                    >
                      <KeyRound size={16} />

                      <input
                        id="confirm-password"
                        name="confirm-password"
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(event) => {
                          setConfirmPassword(
                            event.target.value,
                          );
                          setPasswordError("");
                        }}
                        placeholder="Confirm your new password"
                        autoComplete="new-password"
                      />

                      <button
                        type="button"
                        className="password-toggle"
                        aria-label={showConfirmPassword
                          ? "Hide confirmation password"
                          : "Show confirmation password"}
                        onClick={() =>
                          setShowConfirmPassword(
                            (previous) => !previous,
                          )}
                      >
                        {showConfirmPassword
                          ? <EyeOff size={17} />
                          : <Eye size={17} />}
                      </button>
                    </div>

                    {confirmPassword &&
                      !passwordsMatch && (
                      <span className="password-error">
                        Passwords do not match.
                      </span>
                    )}
                  </div>

                  {/* FOOTER */}

                  <div className="password-form-footer">
                    <div className="password-footer-copy">
                      <div className="footer-security-icon">
                        <ShieldCheck size={15} />
                      </div>

                      <div>
                        <strong>
                          Your password stays private
                        </strong>

                        <p>
                          You will use the new password the next time you sign
                          in.
                        </p>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="change-password-button"
                      disabled={changingPassword ||
                        !newPassword ||
                        !confirmPassword ||
                        !passwordsMatch}
                    >
                      {changingPassword
                        ? (
                          <>
                            <span className="button-spinner" />
                            Updating...
                          </>
                        )
                        : (
                          <>
                            <KeyRound size={15} />
                            Update Password
                          </>
                        )}
                    </button>
                  </div>
                </div>
              )}
            </form>
          </section>

          {/* SECURITY STATUS CARD */}

          {/* <div className="security-status-card">
            <div className="security-status-icon">
              <ShieldCheck size={18} />
            </div>

            <div>
              <strong>Security check</strong>

              <p>
                {currentPasswordVerified
                  ? "Your current password has been verified. You can now create a new password."
                  : "Verify your current password to unlock password changes."}
              </p>
            </div>

            <span
              className={currentPasswordVerified
                ? "security-status verified"
                : "security-status pending"}
            >
              {currentPasswordVerified ? "Verified" : "Pending"}
            </span>
          </div> */}
        </div>
      </div>
    </div>
  );
}
