import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { User, Lock, Eye, EyeOff, ArrowRight, ShieldCheck } from "lucide-react";
import loginBg from "../assets/login.jpg";
import fmrcLogo from "../assets/FMRClogo.png";
import { resetPassword } from "../api/auth";
import { getErrorMessage } from "../api/client";
import { PASSWORD_PATTERN, PASSWORD_REQUIREMENTS_MESSAGE } from "../utils/password";

export default function ForgotPassword() {
  const [username, setUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!username || !newPassword || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }
    if (!PASSWORD_PATTERN.test(newPassword)) {
      setError(PASSWORD_REQUIREMENTS_MESSAGE);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await resetPassword(username, newPassword);
      setSuccess(true);
    } catch (err) {
      if (!err.response) {
        setError("Unable to connect to the server. Check your internet connection.");
      } else if (err.response.status === 404) {
        setError("No account found with that username.");
      } else {
        setError(getErrorMessage(err));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#eef1ee] p-4 font-sans">
      <div className="w-full max-w-5xl bg-white rounded-none shadow-sm overflow-hidden grid grid-cols-1 md:grid-cols-2">
        <div
          className="relative hidden md:flex flex-col justify-end min-h-[640px] overflow-hidden bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${loginBg})` }}
        >
          <div className="absolute inset-0 bg-black/20" />
          <div className="relative bg-white/95 px-4 py-3 flex justify-center items-center">
            <img src={fmrcLogo} alt="FMRC Logo" className="h-12 object-contain" />
          </div>
        </div>

        <div className="flex flex-col justify-center px-8 sm:px-14 py-16 bg-[#fafbfa]">
          <h1 className="text-2xl font-bold text-[#1a6b3c]">Forgot Password</h1>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-500">
            <ShieldCheck size={13} /> Enter your username and set a new password
          </p>

          {success ? (
            <div className="mt-8 space-y-5">
              <div className="rounded-md border border-green-200 bg-green-50 px-3.5 py-3 text-sm text-green-800">
                Your password has been reset successfully.
              </div>
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="w-full flex items-center justify-center gap-2 rounded-md bg-[#1a6b3c] hover:bg-[#155530] text-white font-semibold py-2.5 text-sm transition"
              >
                Sign In
                <ArrowRight size={16} />
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              {error && (
                <div className="rounded-md border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700 font-medium">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="username" className="block text-sm text-gray-600 mb-1.5">
                  Username
                </label>
                <div className="relative">
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. FMRCCE22"
                    className="w-full rounded-md border border-gray-300 bg-white px-3.5 py-2.5 pr-10 text-sm text-gray-700 placeholder-gray-400 outline-none focus:border-[#1a6b3c] focus:ring-2 focus:ring-[#1a6b3c]/20 transition"
                  />
                  <User size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>
              </div>

              <div>
                <label htmlFor="newPassword" className="block text-sm text-gray-600 mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <input
                    id="newPassword"
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-md border border-gray-300 bg-white px-3.5 py-2.5 pr-16 text-sm text-gray-700 placeholder-gray-400 outline-none focus:border-[#1a6b3c] focus:ring-2 focus:ring-[#1a6b3c]/20 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs font-medium text-[#1a6b3c] hover:text-[#134f2c]"
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
                <p className="mt-1.5 text-[11px] text-gray-400">{PASSWORD_REQUIREMENTS_MESSAGE}</p>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm text-gray-600 mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-md border border-gray-300 bg-white px-3.5 py-2.5 pr-10 text-sm text-gray-700 placeholder-gray-400 outline-none focus:border-[#1a6b3c] focus:ring-2 focus:ring-[#1a6b3c]/20 transition"
                  />
                  <Lock size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-md bg-[#1a6b3c] hover:bg-[#155530] text-white font-semibold py-2.5 text-sm transition disabled:opacity-70"
              >
                {loading ? "Saving..." : "Reset Password"}
                {!loading && <ArrowRight size={16} />}
              </button>
            </form>
          )}

          <Link
            to="/login"
            className="mt-6 pt-5 border-t border-gray-200 block text-xs text-[#1a6b3c] font-medium hover:underline"
          >
            Back to Sign In
          </Link>

          <p className="mt-10 text-center text-[11px] text-gray-300 tracking-wide">
            © 2026 FARM MECHANIZATION RESEARCH CENTER
          </p>
        </div>
      </div>
    </div>
  );
}
