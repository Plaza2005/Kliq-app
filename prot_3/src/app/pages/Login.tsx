import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import { Mail, Lock, Eye, EyeOff, ArrowRight, ArrowLeft, Calendar, CheckCircle, User, Phone, ChevronDown, Search } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import kliqLogo from "../../imports/Kliq_logo.jpeg";

const COUNTRIES = [
  // USA first
  { code: "US", name: "United States",       dial: "+1",    flag: "🇺🇸" },
  // Africa — sorted alphabetically
  { code: "DZ", name: "Algeria",             dial: "+213",  flag: "🇩🇿" },
  { code: "AO", name: "Angola",              dial: "+244",  flag: "🇦🇴" },
  { code: "BJ", name: "Benin",               dial: "+229",  flag: "🇧🇯" },
  { code: "BW", name: "Botswana",            dial: "+267",  flag: "🇧🇼" },
  { code: "BF", name: "Burkina Faso",        dial: "+226",  flag: "🇧🇫" },
  { code: "BI", name: "Burundi",             dial: "+257",  flag: "🇧🇮" },
  { code: "CM", name: "Cameroon",            dial: "+237",  flag: "🇨🇲" },
  { code: "CV", name: "Cape Verde",          dial: "+238",  flag: "🇨🇻" },
  { code: "CF", name: "Central African Rep", dial: "+236",  flag: "🇨🇫" },
  { code: "TD", name: "Chad",                dial: "+235",  flag: "🇹🇩" },
  { code: "KM", name: "Comoros",             dial: "+269",  flag: "🇰🇲" },
  { code: "CG", name: "Congo",               dial: "+242",  flag: "🇨🇬" },
  { code: "CD", name: "DR Congo",            dial: "+243",  flag: "🇨🇩" },
  { code: "DJ", name: "Djibouti",            dial: "+253",  flag: "🇩🇯" },
  { code: "EG", name: "Egypt",               dial: "+20",   flag: "🇪🇬" },
  { code: "GQ", name: "Equatorial Guinea",   dial: "+240",  flag: "🇬🇶" },
  { code: "ER", name: "Eritrea",             dial: "+291",  flag: "🇪🇷" },
  { code: "SZ", name: "Eswatini",            dial: "+268",  flag: "🇸🇿" },
  { code: "ET", name: "Ethiopia",            dial: "+251",  flag: "🇪🇹" },
  { code: "GA", name: "Gabon",               dial: "+241",  flag: "🇬🇦" },
  { code: "GM", name: "Gambia",              dial: "+220",  flag: "🇬🇲" },
  { code: "GH", name: "Ghana",               dial: "+233",  flag: "🇬🇭" },
  { code: "GN", name: "Guinea",              dial: "+224",  flag: "🇬🇳" },
  { code: "GW", name: "Guinea-Bissau",       dial: "+245",  flag: "🇬🇼" },
  { code: "CI", name: "Ivory Coast",         dial: "+225",  flag: "🇨🇮" },
  { code: "KE", name: "Kenya",               dial: "+254",  flag: "🇰🇪" },
  { code: "LS", name: "Lesotho",             dial: "+266",  flag: "🇱🇸" },
  { code: "LR", name: "Liberia",             dial: "+231",  flag: "🇱🇷" },
  { code: "LY", name: "Libya",               dial: "+218",  flag: "🇱🇾" },
  { code: "MG", name: "Madagascar",          dial: "+261",  flag: "🇲🇬" },
  { code: "MW", name: "Malawi",              dial: "+265",  flag: "🇲🇼" },
  { code: "ML", name: "Mali",                dial: "+223",  flag: "🇲🇱" },
  { code: "MR", name: "Mauritania",          dial: "+222",  flag: "🇲🇷" },
  { code: "MU", name: "Mauritius",           dial: "+230",  flag: "🇲🇺" },
  { code: "MA", name: "Morocco",             dial: "+212",  flag: "🇲🇦" },
  { code: "MZ", name: "Mozambique",          dial: "+258",  flag: "🇲🇿" },
  { code: "NA", name: "Namibia",             dial: "+264",  flag: "🇳🇦" },
  { code: "NE", name: "Niger",               dial: "+227",  flag: "🇳🇪" },
  { code: "NG", name: "Nigeria",             dial: "+234",  flag: "🇳🇬" },
  { code: "RW", name: "Rwanda",              dial: "+250",  flag: "🇷🇼" },
  { code: "ST", name: "São Tomé & Príncipe", dial: "+239",  flag: "🇸🇹" },
  { code: "SN", name: "Senegal",             dial: "+221",  flag: "🇸🇳" },
  { code: "SC", name: "Seychelles",          dial: "+248",  flag: "🇸🇨" },
  { code: "SL", name: "Sierra Leone",        dial: "+232",  flag: "🇸🇱" },
  { code: "SO", name: "Somalia",             dial: "+252",  flag: "🇸🇴" },
  { code: "ZA", name: "South Africa",        dial: "+27",   flag: "🇿🇦" },
  { code: "SS", name: "South Sudan",         dial: "+211",  flag: "🇸🇸" },
  { code: "SD", name: "Sudan",               dial: "+249",  flag: "🇸🇩" },
  { code: "TZ", name: "Tanzania",            dial: "+255",  flag: "🇹🇿" },
  { code: "TG", name: "Togo",                dial: "+228",  flag: "🇹🇬" },
  { code: "TN", name: "Tunisia",             dial: "+216",  flag: "🇹🇳" },
  { code: "UG", name: "Uganda",              dial: "+256",  flag: "🇺🇬" },
  { code: "ZM", name: "Zambia",              dial: "+260",  flag: "🇿🇲" },
  { code: "ZW", name: "Zimbabwe",            dial: "+263",  flag: "🇿🇼" },
];

type Mode       = "login" | "register";
type RegStep    = 1 | 2;
type Gender     = "" | "male" | "female" | "nonbinary" | "prefer_not";
type ForgotStage = "idle" | "input" | "sent";

function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  const checks = [password.length >= 8, /[A-Z]/.test(password), /[0-9!@#$%^&*]/.test(password)];
  const strength = checks.filter(Boolean).length;
  const colors = ["bg-red-500", "bg-yellow-500", "bg-green-500"];
  const labels = ["Weak", "Fair", "Strong"];
  return (
    <div className="mt-2">
      <div className="flex gap-1 mb-1">
        {[0, 1, 2].map(i => (
          <div key={i} className={`flex-1 h-1 rounded-full transition ${i < strength ? colors[strength - 1] : "bg-gray-700"}`} />
        ))}
      </div>
      <p className={`text-xs ${strength === 3 ? "text-green-400" : strength === 2 ? "text-yellow-400" : "text-red-400"}`}>
        {labels[strength - 1] || "Too short"}
      </p>
    </div>
  );
}

function ErrorBox({ msg }: { msg: string }) {
  return (
    <div className="bg-red-900/20 border border-red-800/40 text-red-400 text-sm rounded-xl px-4 py-3">
      {msg}
    </div>
  );
}

export function Login() {
  const navigate = useNavigate();
  const { login, register } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [regStep, setRegStep] = useState<RegStep>(1);
  const [submitting, setSubmitting] = useState(false);

  // Shared fields
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);

  // Step 2 — personal details
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const countryPickerRef = useRef<HTMLDivElement>(null);
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState<Gender>("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showGender, setShowGender] = useState(false);

  // Forgot password
  const [forgotStage, setForgotStage] = useState<ForgotStage>("idle");
  const [forgotEmail, setForgotEmail] = useState("");

  const [error, setError] = useState("");
  const clearError = () => setError("");

  const GENDER_OPTIONS: { value: Gender; label: string }[] = [
    { value: "male",        label: "Male" },
    { value: "female",      label: "Female" },
    { value: "nonbinary",   label: "Non-binary" },
    { value: "prefer_not",  label: "Prefer not to say" },
  ];

  const genderLabel = GENDER_OPTIONS.find(g => g.value === gender)?.label ?? "Select gender (optional)";

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (countryPickerRef.current && !countryPickerRef.current.contains(e.target as Node)) {
        setShowCountryPicker(false);
        setCountrySearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filteredCountries = COUNTRIES.filter(c =>
    c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
    c.dial.includes(countrySearch)
  );

  const switchMode = (m: Mode) => {
    setMode(m);
    setRegStep(1);
    setError("");
    setIdentifier(""); setPassword(""); setConfirmPassword("");
    setShowPassword(false); setShowConfirm(false);
    setFullName(""); setUsername(""); setPhone(""); setDob(""); setGender(""); setTermsAccepted(false);
    setShowGender(false);
    setSelectedCountry(COUNTRIES[0]); setShowCountryPicker(false); setCountrySearch("");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password) { setError("Please fill in all fields."); return; }
    setSubmitting(true);
    try {
      await login(identifier.trim(), password);
      navigate("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed. Check your credentials.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) { setError("Email is required."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (password !== confirmPassword) { setError("Passwords do not match."); return; }
    setError("");
    setRegStep(2);
  };

  const handleRegStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) { setError("Full name is required."); return; }
    if (!username.trim()) { setError("Username is required."); return; }
    const uname = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
    if (uname.length < 3) { setError("Username must be at least 3 characters."); return; }
    if (!dob) { setError("Date of birth is required."); return; }
    const ageMs = Date.now() - new Date(dob).getTime();
    if (ageMs < 13 * 365.25 * 24 * 60 * 60 * 1000) {
      setError("You must be at least 13 years old to join Kliq.");
      return;
    }
    if (!termsAccepted) { setError("You must accept the Terms of Service to continue."); return; }
    setSubmitting(true);
    try {
      const digits = phone.replace(/\D/g, "");
      const fullPhone = digits ? `${selectedCountry.dial}${digits}` : undefined;
      await register(identifier.trim(), password, fullName.trim(), uname, fullPhone);
      navigate("/onboarding");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) { setError("Please enter your email address."); return; }
    setError("");
    setSubmitting(true);
    try {
      await fetch("/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail.trim().toLowerCase() }),
      });
      setForgotStage("sent");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };


  if (forgotStage !== "idle") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-purple-950 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm">
          {forgotStage === "sent" ? (
            <div className="text-center">
              <div className="w-20 h-20 bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-green-700/50">
                <CheckCircle size={36} className="text-green-400" />
              </div>
              <h2 className="text-white font-bold text-2xl mb-2">Check your email</h2>
              <p className="text-gray-400 text-sm mb-8">
                We sent a reset link to{" "}
                <span className="text-white font-medium">{forgotEmail}</span>
              </p>
              <button
                onClick={() => { setForgotStage("idle"); setForgotEmail(""); setError(""); }}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-3.5 rounded-xl hover:opacity-90 transition"
              >
                Back to Sign In
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={() => { setForgotStage("idle"); setForgotEmail(""); setError(""); }}
                className="flex items-center gap-2 text-gray-400 hover:text-white transition mb-8 text-sm"
              >
                <ArrowLeft size={16} /> Back to Sign In
              </button>
              <h2 className="text-white font-bold text-2xl mb-1">Forgot password?</h2>
              <p className="text-gray-500 text-sm mb-6">Enter your email and we'll send you a reset link.</p>
              <form onSubmit={handleForgot} className="space-y-4">
                {error && <ErrorBox msg={error} />}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">Email</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600" />
                    <input
                      type="email"
                      value={forgotEmail}
                      onChange={e => { setForgotEmail(e.target.value); clearError(); }}
                      placeholder="you@example.com"
                      className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-10 pr-4 py-3 text-white text-sm placeholder-gray-700 focus:outline-none focus:border-purple-600 transition"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-3.5 rounded-xl hover:opacity-90 transition flex items-center justify-center gap-2"
                >
                  Send Reset Link <ArrowRight size={18} />
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-purple-950 flex flex-col items-center justify-center p-4">
      <div className="mb-8 text-center">
        <div className="w-20 h-20 rounded-2xl overflow-hidden mx-auto mb-4 shadow-lg shadow-purple-900/50">
          <img src={kliqLogo} alt="KLIQ" className="w-full h-full object-cover" />
        </div>
        <h1 className="text-4xl font-black text-white tracking-widest">KLIQ</h1>
        <p className="text-gray-500 mt-2 text-sm">Your world. Your content. Your audience.</p>
      </div>

      <div className="w-full max-w-sm">

        {/* ── LOGIN ── */}
        {mode === "login" && (
          <>
            <form onSubmit={handleLogin} className="space-y-4">
              {error && <ErrorBox msg={error} />}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">Email or username</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600" />
                  <input type="text" value={identifier} onChange={e => { setIdentifier(e.target.value); clearError(); }}
                    placeholder="Email or username" autoComplete="username"
                    className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-10 pr-4 py-3 text-white text-sm placeholder-gray-700 focus:outline-none focus:border-purple-600 transition" />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-medium text-gray-400">Password</label>
                  <button type="button" onClick={() => setForgotStage("input")}
                    className="text-purple-400 text-xs hover:text-purple-300 transition">
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600" />
                  <input type={showPassword ? "text" : "password"} value={password}
                    onChange={e => { setPassword(e.target.value); clearError(); }}
                    placeholder="••••••••" autoComplete="current-password"
                    className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-10 pr-10 py-3 text-white text-sm placeholder-gray-700 focus:outline-none focus:border-purple-600 transition" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400 transition">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={submitting}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-3.5 rounded-xl hover:opacity-90 transition flex items-center justify-center gap-2 disabled:opacity-60">
                {submitting ? "Signing in..." : <><span>Sign In</span><ArrowRight size={18} /></>}
              </button>
            </form>

            <p className="text-center text-gray-700 text-xs mt-5">
              By signing in you agree to our{" "}
              <span className="text-gray-500 hover:text-gray-400 cursor-pointer">Terms</span> &amp;{" "}
              <span className="text-gray-500 hover:text-gray-400 cursor-pointer">Privacy Policy</span>
            </p>
          </>
        )}

        {/* ── REGISTER STEP 1: Credentials ── */}
        {mode === "register" && regStep === 1 && (
          <>
            <div className="flex gap-1.5 mb-5">
              <div className="h-1 flex-1 rounded-full bg-white" />
              <div className="h-1 flex-1 rounded-full bg-gray-700" />
            </div>
            <h2 className="text-white font-bold text-xl mb-0.5">Create your account</h2>
            <p className="text-gray-500 text-sm mb-5">Step 1 of 2 — Set your credentials</p>

            <form onSubmit={handleRegStep1} className="space-y-4">
              {error && <ErrorBox msg={error} />}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">Email address</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600" />
                  <input type="email" value={identifier} onChange={e => { setIdentifier(e.target.value); clearError(); }}
                    placeholder="you@example.com"
                    className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-10 pr-4 py-3 text-white text-sm placeholder-gray-700 focus:outline-none focus:border-purple-600 transition" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">Password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600" />
                  <input type={showPassword ? "text" : "password"} value={password}
                    onChange={e => { setPassword(e.target.value); clearError(); }}
                    placeholder="At least 8 characters"
                    className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-10 pr-10 py-3 text-white text-sm placeholder-gray-700 focus:outline-none focus:border-purple-600 transition" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400 transition">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <PasswordStrength password={password} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">Confirm password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600" />
                  <input type={showConfirm ? "text" : "password"} value={confirmPassword}
                    onChange={e => { setConfirmPassword(e.target.value); clearError(); }}
                    placeholder="••••••••"
                    className={`w-full bg-gray-900 border rounded-xl pl-10 pr-10 py-3 text-white text-sm placeholder-gray-700 focus:outline-none transition ${
                      confirmPassword && confirmPassword !== password
                        ? "border-red-600 focus:border-red-500"
                        : "border-gray-800 focus:border-purple-600"
                    }`} />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400 transition">
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {confirmPassword && confirmPassword !== password && (
                  <p className="text-red-400 text-xs mt-1">Passwords don't match</p>
                )}
              </div>
              <button type="submit"
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-3.5 rounded-xl hover:opacity-90 transition flex items-center justify-center gap-2">
                Continue <ArrowRight size={18} />
              </button>
            </form>
          </>
        )}

        {/* ── REGISTER STEP 2: Personal details ── */}
        {mode === "register" && regStep === 2 && (
          <>
            <div className="flex items-center gap-3 mb-5">
              <button onClick={() => { setRegStep(1); setError(""); }}
                className="p-1.5 hover:bg-gray-900 rounded-full transition text-gray-400 hover:text-white">
                <ArrowLeft size={18} />
              </button>
              <div className="flex gap-1.5 flex-1">
                <div className="h-1 flex-1 rounded-full bg-purple-500" />
                <div className="h-1 flex-1 rounded-full bg-white" />
              </div>
            </div>
            <h2 className="text-white font-bold text-xl mb-0.5">About you</h2>
            <p className="text-gray-500 text-sm mb-5">Step 2 of 2 — Tell us a bit more</p>

            <form onSubmit={handleRegStep2} className="space-y-4">
              {error && <ErrorBox msg={error} />}

              {/* Full name */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">Full name <span className="text-red-500">*</span></label>
                <div className="relative">
                  <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={e => { setFullName(e.target.value); clearError(); }}
                    placeholder="Your real name"
                    maxLength={60}
                    className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-10 pr-4 py-3 text-white text-sm placeholder-gray-700 focus:outline-none focus:border-purple-600 transition"
                  />
                </div>
              </div>

              {/* Username */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">Username <span className="text-red-500">*</span></label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 text-sm">@</span>
                  <input
                    type="text"
                    value={username}
                    onChange={e => { setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "")); clearError(); }}
                    placeholder="your_username"
                    maxLength={30}
                    className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-8 pr-4 py-3 text-white text-sm placeholder-gray-700 focus:outline-none focus:border-purple-600 transition"
                  />
                </div>
                <p className="text-gray-600 text-xs mt-1">Only letters, numbers and underscores. Cannot be changed easily.</p>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">
                  Phone number <span className="text-gray-600 font-normal">(optional)</span>
                </label>
                <div className="flex gap-2">
                  {/* Country code picker */}
                  <div className="relative flex-shrink-0" ref={countryPickerRef}>
                    <button
                      type="button"
                      onClick={() => { setShowCountryPicker(!showCountryPicker); setCountrySearch(""); }}
                      className="flex items-center gap-1.5 bg-gray-900 border border-gray-800 rounded-xl px-3 py-3 text-white text-sm hover:border-gray-700 transition focus:outline-none focus:border-purple-600"
                    >
                      <span>{selectedCountry.flag}</span>
                      <span className="text-gray-400 text-xs">{selectedCountry.dial}</span>
                      <ChevronDown size={12} className={`text-gray-600 transition-transform ${showCountryPicker ? "rotate-180" : ""}`} />
                    </button>
                    {showCountryPicker && (
                      <div className="absolute top-full left-0 mt-1 w-64 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden">
                        <div className="p-2 border-b border-gray-800">
                          <div className="relative">
                            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
                            <input
                              type="text"
                              value={countrySearch}
                              onChange={e => setCountrySearch(e.target.value)}
                              placeholder="Search country or code..."
                              autoFocus
                              className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-8 pr-3 py-2 text-white text-xs placeholder-gray-600 focus:outline-none focus:border-purple-600 transition"
                            />
                          </div>
                        </div>
                        <div className="max-h-48 overflow-y-auto">
                          {filteredCountries.length === 0 ? (
                            <p className="text-gray-500 text-xs text-center py-4">No results</p>
                          ) : filteredCountries.map(c => (
                            <button
                              key={c.code}
                              type="button"
                              onClick={() => { setSelectedCountry(c); setShowCountryPicker(false); setCountrySearch(""); }}
                              className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left hover:bg-gray-800 transition ${selectedCountry.code === c.code ? "text-purple-400 bg-gray-800/50" : "text-white"}`}
                            >
                              <span className="text-base">{c.flag}</span>
                              <span className="flex-1 text-xs truncate">{c.name}</span>
                              <span className="text-gray-500 text-xs flex-shrink-0">{c.dial}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  {/* Phone number input */}
                  <div className="relative flex-1">
                    <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={e => { setPhone(e.target.value.replace(/[^\d\s\-()]/g, "")); clearError(); }}
                      placeholder="Phone number"
                      className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-10 pr-4 py-3 text-white text-sm placeholder-gray-700 focus:outline-none focus:border-purple-600 transition"
                    />
                  </div>
                </div>
                <p className="text-gray-600 text-xs mt-1">Used for account recovery only. Never shown publicly.</p>
              </div>

              {/* Date of birth */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">Date of birth <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Calendar size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" />
                  <input
                    type="date"
                    value={dob}
                    onChange={e => { setDob(e.target.value); clearError(); }}
                    max={new Date(Date.now() - 13 * 365.25 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]}
                    className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-10 pr-4 py-3 text-white text-sm focus:outline-none focus:border-purple-600 transition [color-scheme:dark]"
                  />
                </div>
                <p className="text-gray-600 text-xs mt-1">Must be 13+ to join · Your DOB won't appear on your profile</p>
              </div>

              {/* Gender */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">
                  Gender <span className="text-gray-600 font-normal">(optional)</span>
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowGender(!showGender)}
                    className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-sm text-left flex items-center justify-between focus:outline-none focus:border-purple-600 transition hover:border-gray-700"
                  >
                    <span className={gender ? "text-white" : "text-gray-700"}>{genderLabel}</span>
                    <ChevronDown size={16} className={`text-gray-600 transition-transform ${showGender ? "rotate-180" : ""}`} />
                  </button>
                  {showGender && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-gray-900 border border-gray-700 rounded-xl overflow-hidden z-10 shadow-2xl">
                      {GENDER_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => { setGender(opt.value); setShowGender(false); }}
                          className={`w-full text-left px-4 py-3 text-sm transition hover:bg-gray-800 flex items-center justify-between ${gender === opt.value ? "text-purple-400" : "text-white"}`}
                        >
                          {opt.label}
                          {gender === opt.value && <CheckCircle size={14} className="text-purple-400" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Terms */}
              <button
                type="button"
                onClick={() => { setTermsAccepted(!termsAccepted); clearError(); }}
                className="flex items-start gap-3 text-left w-full pt-1"
              >
                <div className={`w-5 h-5 rounded flex items-center justify-center mt-0.5 flex-shrink-0 border-2 transition ${
                  termsAccepted ? "bg-purple-600 border-purple-600" : "border-gray-600 bg-transparent"
                }`}>
                  {termsAccepted && <CheckCircle size={11} className="text-white" />}
                </div>
                <span className="text-gray-400 text-sm leading-snug">
                  I agree to Kliq's{" "}
                  <span className="text-purple-400 hover:underline">Terms of Service</span>,{" "}
                  <span className="text-purple-400 hover:underline">Privacy Policy</span>, and{" "}
                  <span className="text-purple-400 hover:underline">Community Guidelines</span>
                </span>
              </button>

              <button type="submit"
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-3.5 rounded-xl hover:opacity-90 transition flex items-center justify-center gap-2">
                Create Account <ArrowRight size={18} />
              </button>
            </form>
          </>
        )}

        <p className="text-center text-gray-600 text-sm mt-6">
          {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
          <button onClick={() => switchMode(mode === "login" ? "register" : "login")}
            className="text-purple-400 font-medium hover:text-purple-300 transition">
            {mode === "login" ? "Sign Up" : "Sign In"}
          </button>
        </p>
      </div>
    </div>
  );
}
