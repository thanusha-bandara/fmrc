import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { User, Lock, Eye, EyeOff, ArrowRight, ShieldCheck, Phone } from "lucide-react";
import loginBg from "../assets/login.jpg";
import fmrcLogo from "../assets/FMRClogo.png";
import { login } from "../api/auth";
import { toShortRole } from "../api/roles";
import { getErrorMessage } from "../api/client";

export default function FMRCLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!username || !password) {
      setError("Username and password are required.");
      return;
    }

    setLoading(true);
    try {
      const { token, user } = await login(username, password);

      localStorage.setItem("token", token);
      localStorage.setItem("userRole", toShortRole(user.role));
      localStorage.setItem("userName", user.full_name);
      localStorage.setItem("userId", user.user_id);

      navigate("/dashboard");
    } catch (err) {
      if (!err.response) {
        setError("Unable to connect to the server. Check your internet connection.");
      } else if (err.response.status === 401) {
        setError("Invalid username or password. Please try again.");
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
        {/* Left panel - visual with image background */}
<div 
  className="relative hidden md:flex flex-col justify-end min-h-[640px] overflow-hidden bg-cover bg-center bg-no-repeat"
  style={{ backgroundImage: `url(${loginBg})` }}
>
          {/* Subtle dark overlay for contrast */}
          <div className="absolute inset-0 bg-black/20" />

          {/* Footer brand strip */}
          <div className="relative bg-white/95 px-4 py-3 flex justify-center items-center">
            <img src={fmrcLogo} alt="FMRC Logo" className="h-12 object-contain" />
          </div>
        </div>

        {/* Right panel - form */}
        <div className="flex flex-col justify-center px-8 sm:px-14 py-16 bg-[#fafbfa]">
          <h1 className="text-2xl font-bold text-[#1a6b3c]">System Login</h1>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-500">
            <Lock size={13} /> Authorized Personnel Only
          </p>

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
              <label htmlFor="password" className="block text-sm text-gray-600 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-md bg-[#1a6b3c] hover:bg-[#155530] text-white font-semibold py-2.5 text-sm transition disabled:opacity-70"
            >
              {loading ? "Signing In..." : "Sign In"}
              {!loading && <ArrowRight size={16} />}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-gray-200 flex items-center justify-between text-xs">
            <Link to="/forgot-password" className="text-[#1a6b3c] font-medium hover:underline">
              Forgot Password?
            </Link>
            <a href="#" className="flex items-center gap-1 text-gray-500 hover:text-gray-700">
              <Phone size={12} /> System Administrator Contact
            </a>
          </div>

          <p className="mt-10 text-center text-[11px] text-gray-300 tracking-wide">
            © 2026 FARM MECHANIZATION RESEARCH CENTER
          </p>
        </div>
      </div>
    </div>
  );
}