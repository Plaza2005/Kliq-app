import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Lock, Eye, EyeOff, CheckCircle } from "lucide-react";
import { api } from "../api/client";
import kliqLogo from "../../imports/Kliq_logo.jpeg";

export function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) setError("Invalid or missing reset token.");
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { setError("Password must be at least 8 characters"); return; }
    if (password !== confirm) { setError("Passwords do not match"); return; }
    setLoading(true);
    setError("");
    try {
      await api.post("/auth/reset-password", { token, password });
      setDone(true);
    } catch (err: unknown) {
      setError((err as { message?: string })?.message ?? "Invalid or expired token.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <img src={kliqLogo} alt="KLIQ" className="w-14 h-14 rounded-2xl object-cover" />
        </div>

        {done ? (
          <div className="text-center">
            <div className="w-16 h-16 bg-green-900/40 border border-green-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={28} className="text-green-400" />
            </div>
            <h2 className="text-white font-bold text-xl mb-2">Password reset!</h2>
            <p className="text-gray-400 text-sm mb-6">Your password has been updated. You can now sign in.</p>
            <button
              onClick={() => navigate("/login")}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-3 rounded-xl hover:opacity-90 transition"
            >
              Sign in
            </button>
          </div>
        ) : (
          <>
            <h1 className="text-white font-bold text-2xl text-center mb-2">Set new password</h1>
            <p className="text-gray-400 text-sm text-center mb-8">Choose a strong password for your account.</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="New password"
                  className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 pl-10 pr-10 py-3 text-white text-sm outline-none focus:border-purple-500 transition placeholder:text-gray-600"
                />
                <button type="button" onClick={() => setShowPw(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type={showPw ? "text" : "password"}
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="Confirm new password"
                  className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 pl-10 py-3 text-white text-sm outline-none focus:border-purple-500 transition placeholder:text-gray-600"
                />
              </div>

              {error && <p className="text-red-400 text-xs">{error}</p>}

              <button
                type="submit"
                disabled={loading || !token}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-3 rounded-xl hover:opacity-90 transition disabled:opacity-50"
              >
                {loading ? "Resetting..." : "Reset password"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
