"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Eye, EyeOff, Shield } from "lucide-react";

export default function SpidermanPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        // Redirect to the full admin dashboard
        router.push("/");
        router.refresh();
      } else {
        setError("Incorrect password. Access denied.");
        setShake(true);
        setPassword("");
        setTimeout(() => setShake(false), 600);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="spiderman-container">
      <div className={`spiderman-card ${shake ? "shake" : ""}`}>
        {/* Header */}
        <div className="spiderman-header">
          <div className="shield-icon">
            <Shield size={32} />
          </div>
          <h1 className="spiderman-title">Admin Access</h1>
          <p className="spiderman-subtitle">
            Enter your credentials to access the review panel
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="spiderman-form">
          <div className="input-group">
            <label htmlFor="password" className="input-label">
              <Lock size={14} />
              Password
            </label>
            <div className="input-wrapper">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password"
                className="password-input"
                autoFocus
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="toggle-visibility"
                onClick={() => setShowPassword((v) => !v)}
                tabIndex={-1}
                aria-label="Toggle password visibility"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <p className="error-message" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="submit-btn"
            disabled={loading || !password}
          >
            {loading ? (
              <span className="loading-spinner" />
            ) : (
              <>
                <Lock size={16} />
                Authenticate
              </>
            )}
          </button>
        </form>

        <p className="spiderman-footer">
          Public leaderboard is available at{" "}
          <a href="/public/leaderboard" className="public-link">
            /public/leaderboard
          </a>
        </p>
      </div>

      <style jsx>{`
        .spiderman-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: radial-gradient(
              ellipse at 20% 50%,
              hsl(262 80% 8%) 0%,
              transparent 60%
            ),
            radial-gradient(
              ellipse at 80% 20%,
              hsl(220 80% 8%) 0%,
              transparent 50%
            ),
            hsl(240 10% 4%);
          padding: 1.5rem;
        }

        .spiderman-card {
          background: hsl(240 10% 8%);
          border: 1px solid hsl(240 6% 16%);
          border-radius: 1.25rem;
          padding: 2.5rem 2rem;
          width: 100%;
          max-width: 420px;
          box-shadow: 0 0 0 1px hsl(240 6% 12%), 0 24px 64px hsl(240 10% 2% / 0.8),
            0 0 80px hsl(262 70% 20% / 0.15);
          transition: transform 0.1s ease;
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-6px); }
          80% { transform: translateX(6px); }
        }

        .shake {
          animation: shake 0.5s ease;
        }

        .spiderman-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .shield-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: linear-gradient(
            135deg,
            hsl(262 70% 25%) 0%,
            hsl(220 70% 20%) 100%
          );
          border: 1px solid hsl(262 60% 35%);
          color: hsl(262 80% 75%);
          margin-bottom: 1.25rem;
          box-shadow: 0 0 24px hsl(262 70% 30% / 0.4);
        }

        .spiderman-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: hsl(0 0% 95%);
          margin: 0 0 0.5rem;
          letter-spacing: -0.025em;
        }

        .spiderman-subtitle {
          font-size: 0.875rem;
          color: hsl(240 5% 55%);
          margin: 0;
        }

        .spiderman-form {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .input-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .input-label {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          font-size: 0.8125rem;
          font-weight: 500;
          color: hsl(240 5% 65%);
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .input-wrapper {
          position: relative;
        }

        .password-input {
          width: 100%;
          padding: 0.75rem 2.75rem 0.75rem 1rem;
          background: hsl(240 10% 12%);
          border: 1px solid hsl(240 6% 20%);
          border-radius: 0.625rem;
          color: hsl(0 0% 93%);
          font-size: 0.9375rem;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
          box-sizing: border-box;
        }

        .password-input:focus {
          border-color: hsl(262 60% 45%);
          box-shadow: 0 0 0 3px hsl(262 60% 45% / 0.15);
        }

        .password-input::placeholder {
          color: hsl(240 5% 40%);
        }

        .toggle-visibility {
          position: absolute;
          right: 0.75rem;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: hsl(240 5% 50%);
          cursor: pointer;
          padding: 0.25rem;
          display: flex;
          align-items: center;
          transition: color 0.15s;
        }

        .toggle-visibility:hover {
          color: hsl(0 0% 80%);
        }

        .error-message {
          font-size: 0.8125rem;
          color: hsl(0 70% 65%);
          background: hsl(0 50% 10%);
          border: 1px solid hsl(0 50% 20%);
          border-radius: 0.5rem;
          padding: 0.625rem 0.875rem;
          margin: 0;
        }

        .submit-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.8125rem 1.5rem;
          background: linear-gradient(
            135deg,
            hsl(262 70% 45%) 0%,
            hsl(220 70% 40%) 100%
          );
          border: none;
          border-radius: 0.625rem;
          color: hsl(0 0% 98%);
          font-size: 0.9375rem;
          font-weight: 600;
          cursor: pointer;
          transition: opacity 0.2s, transform 0.15s, box-shadow 0.2s;
          box-shadow: 0 4px 16px hsl(262 70% 30% / 0.35);
          letter-spacing: 0.01em;
        }

        .submit-btn:hover:not(:disabled) {
          opacity: 0.92;
          transform: translateY(-1px);
          box-shadow: 0 6px 20px hsl(262 70% 30% / 0.45);
        }

        .submit-btn:active:not(:disabled) {
          transform: translateY(0);
        }

        .submit-btn:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .loading-spinner {
          width: 18px;
          height: 18px;
          border: 2px solid hsl(0 0% 100% / 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          display: inline-block;
        }

        .spiderman-footer {
          margin-top: 1.5rem;
          text-align: center;
          font-size: 0.8125rem;
          color: hsl(240 5% 45%);
        }

        .public-link {
          color: hsl(262 60% 65%);
          text-decoration: none;
          transition: color 0.15s;
        }

        .public-link:hover {
          color: hsl(262 60% 78%);
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}
