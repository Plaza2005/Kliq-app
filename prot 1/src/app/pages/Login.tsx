import { useNavigate } from "react-router";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import logo1 from "../../imports/Kliq_logo.jpeg";
import logo2 from "../../imports/kliq_logo_2.jpeg";

export function Login() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-purple-900 flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full space-y-8">
        {/* Logo */}
        <div className="flex flex-col items-center space-y-4">
          <ImageWithFallback
            src={logo1}
            alt="Kliq Logo"
            className="w-32 h-32 object-contain rounded-2xl"
          />
          <h1 className="text-5xl text-white tracking-wider">KLIQ</h1>
          <p className="text-gray-400 text-center">
            Create. Connect. Inspire.
          </p>
        </div>

        {/* Login Options */}
        <div className="space-y-4 mt-12">
          <button
            onClick={() => navigate("/home")}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-4 rounded-full transition transform hover:scale-105"
          >
            Sign in with Google
          </button>

          <button
            onClick={() => navigate("/home")}
            className="w-full bg-white/10 backdrop-blur-md hover:bg-white/20 text-white py-4 rounded-full border border-white/20 transition transform hover:scale-105"
          >
            Connect Wallet
          </button>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-gradient-to-br from-black via-gray-900 to-purple-900 text-gray-400">
                Or continue with
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <input
              type="email"
              placeholder="Email"
              className="w-full bg-white/10 backdrop-blur-md border border-white/20 text-white placeholder-gray-400 py-4 px-6 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <input
              type="password"
              placeholder="Password"
              className="w-full bg-white/10 backdrop-blur-md border border-white/20 text-white placeholder-gray-400 py-4 px-6 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <button
              onClick={() => navigate("/home")}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-4 rounded-full transition transform hover:scale-105"
            >
              Sign In
            </button>
          </div>

          <p className="text-center text-gray-400 text-sm mt-6">
            Don't have an account?{" "}
            <button
              onClick={() => navigate("/home")}
              className="text-purple-400 hover:text-purple-300"
            >
              Sign Up
            </button>
          </p>
        </div>

        {/* Footer */}
        <div className="text-center text-gray-500 text-xs mt-12 space-y-1">
          <p>By continuing, you agree to Kliq's</p>
          <p>
            <a href="#" className="hover:text-gray-400">Terms of Service</a>
            {" • "}
            <a href="#" className="hover:text-gray-400">Privacy Policy</a>
          </p>
        </div>
      </div>
    </div>
  );
}
