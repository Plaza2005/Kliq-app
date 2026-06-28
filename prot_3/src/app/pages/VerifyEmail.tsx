import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { api } from "../api/client";
import kliqLogo from "../../imports/Kliq_logo.jpeg";

export function VerifyEmail() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    if (!token) { setStatus("error"); return; }
    api.get(`/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then(() => setStatus("success"))
      .catch(() => setStatus("error"));
  }, [token]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <div className="flex justify-center mb-8">
          <img src={kliqLogo} alt="KLIQ" className="w-14 h-14 rounded-2xl object-cover" />
        </div>

        {status === "loading" && (
          <>
            <Loader2 size={32} className="animate-spin text-purple-400 mx-auto mb-4" />
            <p className="text-gray-400 text-sm">Verifying your email…</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="w-16 h-16 bg-green-900/40 border border-green-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={28} className="text-green-400" />
            </div>
            <h2 className="text-white font-bold text-xl mb-2">Email verified!</h2>
            <p className="text-gray-400 text-sm mb-6">Your email address has been confirmed.</p>
            <button
              onClick={() => navigate("/")}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-3 rounded-xl hover:opacity-90 transition"
            >
              Go to KLIQ
            </button>
          </>
        )}

        {status === "error" && (
          <>
            <div className="w-16 h-16 bg-red-900/40 border border-red-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle size={28} className="text-red-400" />
            </div>
            <h2 className="text-white font-bold text-xl mb-2">Verification failed</h2>
            <p className="text-gray-400 text-sm mb-6">The link is invalid or has expired. Request a new one from Settings.</p>
            <button
              onClick={() => navigate("/")}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-3 rounded-xl hover:opacity-90 transition"
            >
              Go to KLIQ
            </button>
          </>
        )}
      </div>
    </div>
  );
}
