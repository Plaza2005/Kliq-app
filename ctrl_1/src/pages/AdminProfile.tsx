import { useState } from "react";
import { Camera, Save, KeyRound, Shield, LogOut } from "lucide-react";
import { useNavigate } from "react-router";
import { adminApi } from "../api/client";

function loadAdminUser() {
  try {
    const raw = localStorage.getItem("kliq_admin_user");
    if (raw) return JSON.parse(raw) as { id: string; username: string; email: string };
  } catch { /* ignore */ }
  return { id: "", username: "Admin", email: "admin@kliq.app" };
}

export function AdminProfile() {
  const navigate = useNavigate();
  const stored = loadAdminUser();
  const [name, setName] = useState(stored.username);
  const [email, setEmail] = useState(stored.email);
  const [role] = useState("Super Administrator");
  const [bio, setBio] = useState("Platform administrator for KLIQ — managing users, content and system health.");
  const [twoFA, setTwoFA] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [showLogout, setShowLogout] = useState(false);
  const [saving, setSaving] = useState(false);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await adminApi.patch("/auth/me", { displayName: name });
      const updated = { ...stored, username: name, email };
      localStorage.setItem("kliq_admin_user", JSON.stringify(updated));
      showToast("Profile saved successfully.");
    } catch {
      showToast("Failed to save — check connection.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-gray-800 border border-gray-700 text-white px-5 py-3 rounded-xl shadow-2xl text-sm font-medium">
          {toast}
        </div>
      )}

      {showLogout && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-sm">
            <LogOut size={24} className="text-red-400 mb-3" />
            <h3 className="text-white font-bold text-lg mb-2">Sign Out?</h3>
            <p className="text-gray-400 text-sm mb-6">You'll be redirected to the admin login screen.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowLogout(false)}
                className="flex-1 border border-gray-700 text-gray-300 hover:bg-gray-800 py-2.5 rounded-xl text-sm font-medium transition">
                Cancel
              </button>
              <button onClick={() => { localStorage.removeItem("kliq_admin_token"); localStorage.removeItem("kliq_admin_user"); navigate("/login"); }}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl text-sm font-bold transition">
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-white">Admin Profile</h1>
        <p className="text-gray-500 text-sm mt-0.5">Manage your admin account details and security</p>
      </div>

      {/* Avatar */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <div className="flex items-center gap-5">
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500 to-pink-500 flex items-center justify-center">
              <span className="text-white text-3xl font-black">{(name?.[0] ?? "A").toUpperCase()}</span>
            </div>
            <button className="absolute -bottom-1 -right-1 w-7 h-7 bg-gray-700 border border-gray-600 rounded-lg flex items-center justify-center hover:bg-gray-600 transition">
              <Camera size={12} className="text-gray-300" />
            </button>
          </div>
          <div>
            <p className="text-white font-bold text-lg">{name}</p>
            <p className="text-cyan-400 text-sm">{role}</p>
            <p className="text-gray-500 text-xs mt-0.5">{email}</p>
          </div>
        </div>
      </div>

      {/* Edit form */}
      <form onSubmit={save} className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
        <h2 className="text-white font-semibold mb-2">Account Details</h2>
        {[
          { label: "Full Name",   value: name,  set: setName,  type: "text" },
          { label: "Email",       value: email, set: setEmail, type: "email" },
        ].map(f => (
          <div key={f.label}>
            <label className="block text-xs font-semibold text-gray-400 uppercase mb-1.5">{f.label}</label>
            <input type={f.type} value={f.value} onChange={e => f.set(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-cyan-500 transition" />
          </div>
        ))}
        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase mb-1.5">Role</label>
          <input value={role} readOnly className="w-full bg-gray-800/50 border border-gray-800 text-gray-500 text-sm rounded-xl px-3 py-2.5 cursor-not-allowed" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase mb-1.5">Bio</label>
          <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3}
            className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:border-cyan-500 transition resize-none" />
        </div>
        <button type="submit" disabled={saving}
          className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-60 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition">
          <Save size={14} /> {saving ? "Saving…" : "Save Changes"}
        </button>
      </form>

      {/* Security */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
        <h2 className="text-white font-semibold">Security</h2>
        <div className="flex items-center justify-between p-4 bg-gray-800 rounded-xl">
          <div className="flex items-center gap-3">
            <Shield size={16} className="text-cyan-400" />
            <div>
              <p className="text-white text-sm font-medium">Two-Factor Authentication</p>
              <p className="text-gray-500 text-xs">Authenticator app (TOTP)</p>
            </div>
          </div>
          <button onClick={() => { setTwoFA(v => !v); showToast(`2FA ${twoFA ? "disabled" : "enabled"}.`); }}
            className={`relative w-11 h-6 rounded-full transition-colors ${twoFA ? "bg-cyan-600" : "bg-gray-700"}`}>
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${twoFA ? "translate-x-5" : ""}`} />
          </button>
        </div>
        <button onClick={() => showToast("Password reset email sent to admin@kliq.app")}
          className="flex items-center gap-2 w-full border border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white px-4 py-3 rounded-xl text-sm font-medium transition">
          <KeyRound size={15} className="text-gray-500" /> Change Password
        </button>
      </div>

      {/* Sign out */}
      <div className="bg-red-900/10 border border-red-800/30 rounded-2xl p-6">
        <h2 className="text-white font-semibold mb-1">Danger Zone</h2>
        <p className="text-gray-500 text-xs mb-4">Actions here affect your admin session.</p>
        <button onClick={() => setShowLogout(true)}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition">
          <LogOut size={14} /> Sign Out
        </button>
      </div>
    </div>
  );
}
