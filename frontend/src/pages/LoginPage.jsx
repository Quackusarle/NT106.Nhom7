import { useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import AuthImagePattern from "../components/AuthImagePattern";
import { Link } from "react-router-dom";
import { Eye, EyeOff, Loader2, Lock, Mail, MessageSquare } from "lucide-react";

const LoginPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const { login, isLoggingIn } = useAuthStore();

  const handleSubmit = async (e) => {
    e.preventDefault();
    login(formData);
  };

  return (
    <>
      {/* Custom Minecraft-like font and styles */}
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=VT323&display=swap');
          .pixel-font {
            font-family: 'VT323', monospace;
          }
          .minecraft-input {
            background-color: #d4c8a8;
            border: 2px solid #8b8b8b;
            box-shadow: inset 0 0 0 1px #00000030;
            transition: border-color 0.2s;
          }
          .minecraft-input:focus {
            border-color: #3c763d;
            box-shadow: inset 0 0 0 1px #3c763d, 0 0 0 3px rgba(60, 118, 61, 0.3);
            outline: none;
          }
          .minecraft-input::placeholder {
            font-size: 1.125rem;
            font-family: 'VT323', monospace;
          }
          .minecraft-btn {
            background-color: #a0a0a0;
            border: 2px solid #555555;
            color: #ffffff;
            text-shadow: 1px 1px 0 #00000050;
            transition: background-color 0.2s, transform 0.1s;
          }
          .minecraft-btn:hover {
            background-color: #b0b0b0;
            transform: translateY(-1px);
          }
          .minecraft-btn:active {
            background-color: #909090;
            transform: translateY(0);
          }
          .minecraft-btn:disabled {
            background-color: #707070;
            cursor: not-allowed;
          }
          @keyframes float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-8px); }
          }
          .animate-float {
            animation: float 3s ease-in-out infinite;
          }
        `}
      </style>

      <div className="min-h-screen grid lg:grid-cols-2 bg-gray-200">
        {/* Left Side - Form */}
        <div className="flex flex-col justify-center items-center p-6 sm:p-12 bg-[url('https://minecraft.wiki/images/Dirt_%28texture%29_JE2_BE2.png')] bg-repeat">
          <div className="w-full max-w-md space-y-8 bg-gray-300/90 p-8 rounded-lg border-4 border-gray-600 shadow-[8px_8px_0_#00000050]">
            {/* Logo */}
            <div className="text-center mb-8">
              <div className="flex flex-col items-center gap-2">
                <div
                  className="size-18 rounded bg-gray-300/90 flex items-center justify-center border-2 border-gray-600 shadow-[2px_2px_0_#00000050] animate-float"
                  style={{ backgroundImage: "url('https://minecraft.wiki/images/Dirt_%28texture%29_JE2_BE2.png')", backgroundSize: "cover" }}
                >
                  <img
                    src="https://i.pinimg.com/736x/c2/0b/1f/c20b1fab73a2f0e86d113f1a711c71d3.jpg"
                    alt="Grass Block Logo"
                    className="size-20"
                    style={{ imageRendering: "pixelated" }}
                  />
                </div>
                <h1 className="text-3xl font-bold pixel-font mt-2">Welcome Back</h1>
                <p className="text-lg text-gray-700 pixel-font">Sign in to your account</p>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium pixel-font text-lg">Email</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="size-5 text-gray-800" />
                  </div>
                  <input
                    type="email"
                    className="minecraft-input w-full pl-10 py-2 rounded pixel-font text-lg"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium pixel-font text-lg">Password</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="size-5 text-gray-800" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    className="minecraft-input w-full pl-10 py-2 rounded pixel-font text-lg"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="size-5 text-gray-800" />
                    ) : (
                      <Eye className="size-5 text-gray-800" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="minecraft-btn w-full py-2 rounded pixel-font text-lg"
                disabled={isLoggingIn}
              >
                {isLoggingIn ? (
                  <>
                    <Loader2 className="size-5 animate-spin inline-block mr-2" />
                    Loading...
                  </>
                ) : (
                  "Sign in"
                )}
              </button>
            </form>

            <div className="text-center">
              <p className="text-lg text-gray-700 pixel-font">
                Don't have an account?{" "}
                <Link to="/signup" className="text-green-700 hover:underline pixel-font">
                  Create account
                </Link>
              </p>
            </div>
          </div>
        </div>

        {/* Right Side - Image/Pattern */}
        <AuthImagePattern
          title="Welcome back!"
          subtitle="Sign in to continue your conversations and catch up with your messages."
        />
      </div>
    </>
  );
};

export default LoginPage;