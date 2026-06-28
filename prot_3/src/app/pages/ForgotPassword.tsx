import { useState } from "react";
import { useNavigate } from "react-router";
import { Mail, ArrowLeft, CheckCircle } from "lucide-react";
import { api } from "../api/client";
import kliqLogo from "../../imports/Kliq_logo.jpeg";

export function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { setError("Please enter your email address"); return; }
    setLoading(true);
    setError("");
    try {
      await api.post("/auth/forgot-password", { email: email.trim().toLowerCase() });
      setSent(true);
    } catch {
      setError("Something went wrong. Please try again.");
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

        {sent ? (
          <div className="text-center">
            <div className="w-16 h-16 bg-green-900/40 border border-green-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={28} className="text-green-400" />
            </div>
            <h2 className="text-white font-bold text-xl mb-2">Check your email</h2>
            <p className="text-gray-400 text-sm mb-6">
              We sent a password reset link to <strong className="text-white">{email}</strong>.
              The link expires in 1 hour.
            </p>
            <button
              onClick={() => navigate("/login")}
              className="text-purple-400 hover:text-purple-300 text-sm font-semibold transition"
            >
              Back to login
            </button>
          </div>
        ) : (
          <>
            <h1 className="text-white font-bold text-2xl text-center mb-2">Forgot password?</h1>
            <p className="text-gray-400 text-sm text-center mb-8">
              Enter your email and we'll send you a reset link.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Email address"
                  className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 pl-10 py-3 text-white text-sm outline-none focus:border-purple-500 transition placeholder:text-gray-600"
                />
              </div>

              {error && <p className="text-red-400 text-xs">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-3 rounded-xl hover:opacity-90 transition disabled:opacity-50"
              >
                {loading ? "Sending..." : "Send reset link"}
              </button>
            </form>

            <button
              onClick={() => navigate("/login")}
              className="mt-6 flex items-center gap-2 text-gray-500 hover:text-white text-sm transition mx-auto"
            >
              <ArrowLeft size={14} /> Back to login
            </button>
          </>
        )}
      </div>
    </div>
  );
}
