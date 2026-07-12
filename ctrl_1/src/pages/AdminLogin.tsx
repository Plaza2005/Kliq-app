import { useState } from "react";
import { useNavigate } from "react-router";
import { Lock, Mail, Eye, EyeOff, Shield } from "lucide-react";
import { adminApi, setAdminToken } from "../api/client";

interface LoginResp {
  token: string;
  user: { id: string; username: string; email: string; isAdmin: boolean };
}

export function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@kliq.app");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) { setError("Please enter your email and password."); return; }
    setSubmitting(true);
    try {
      const resp = await adminApi.post<LoginResp>("/auth/login", { identifier: email, password });
      if (!resp.user.isAdmin) { setError("This account does not have admin access."); return; }
      setAdminToken(resp.token);
      localStorage.setItem("kliq_admin_user", JSON.stringify(resp.user));
      navigate("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <img src="/kliq_logo.jpeg" alt="KLIQ" className="w-14 h-14 rounded-2xl object-cover shadow-xl shadow-cyan-500/20" />
          <div>
            <p className="font-black text-2xl leading-none bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">KLIQ</p>
            <p className="text-gray-500 text-xs mt-0.5">Control System</p>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <Shield size={16} className="text-cyan-400" />
            <h1 className="text-white font-bold">Admin Sign In</h1>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase mb-1.5">Email</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-xl pl-9 pr-3 py-2.5 focus:outline-none focus:border-cyan-500" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase mb-1.5">Password</label>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input type={showPw ? "text" : "password"} value={password} onChange={e => { setPassword(e.target.value); setError(""); }}
                  placeholder="Enter password..."
                  className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-xl pl-9 pr-10 py-2.5 focus:outline-none focus:border-cyan-500 placeholder-gray-600" />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-900/20 border border-red-800/40 text-red-400 text-xs rounded-xl px-3 py-2.5">
                {error}
              </div>
            )}

            <button type="submit" disabled={submitting}
              className="w-full bg-cyan-600 hover:bg-cyan-700 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition text-sm mt-2">
              {submitting ? "Signing in…" : "Sign In"}
            </button>
          </form>

          <p className="text-gray-600 text-xs text-center mt-4">Admin: <code className="text-gray-400">admin@kliq.app</code> / <code className="text-gray-400">Admin1234!</code></p>
        </div>

        <p className="text-center text-gray-700 text-xs mt-6">KLIQ Control System · Restricted Access</p>
      </div>
    </div>
  );
}
