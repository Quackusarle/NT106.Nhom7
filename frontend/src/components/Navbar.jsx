import { Link } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import { LogOut, MessageSquare, Settings, User } from "lucide-react";

const Navbar = () => {
  const { logout, authUser } = useAuthStore();

  return (
    <>
      {/* Custom Minecraft-like styles */}
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=VT323&display=swap');
          .pixel-font {
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
        `}
      </style>

      <header
        className="fixed w-full top-0 z-40 backdrop-blur-lg bg-gray-300/80 border-b-4 border-gray-600"
        style={{
          backgroundImage: "url('https://minecraft.wiki/images/Stone_%28texture%29_JE5_BE3.png')",
          backgroundRepeat: "repeat",
        }}
      >
        <div className="container mx-auto px-4 h-16">
          <div className="flex items-center justify-between h-full">
            {/* Logo */}
            <div className="flex items-center gap-8">
              <Link to="/" className="flex items-center gap-2.5 hover:opacity-80 transition-all">
                <div
                  className="size-12 rounded bg-gray-300/90 flex items-center justify-center border-2 border-gray-600 shadow-[2px_2px_0_#00000050]"
                  style={{ backgroundImage: "url('https://minecraft.wiki/images/Dirt_%28texture%29_JE2_BE2.png')", backgroundSize: "cover" }}
                >
                  <img
                    src="https://i.pinimg.com/736x/c2/0b/1f/c20b1fab73a2f0e86d113f1a711c71d3.jpg" // Replace with your image path
                    alt="Logo"
                    className="size-15"
                  />
                </div>
                <h1 className="text-lg font-bold pixel-font text-gray-800">MineZola</h1>
              </Link>
            </div>

            {/* Navigation Links */}
            <div className="flex items-center gap-2">
              <Link
                to="/settings"
                className="minecraft-btn btn btn-sm gap-2 rounded pixel-font"
              >
                <Settings className="w-4 h-4 text-white" />
                <span className="hidden sm:inline">Settings</span>
              </Link>

              {authUser && (
                <>
                  <Link
                    to="/profile"
                    className="minecraft-btn btn btn-sm gap-2 rounded pixel-font"
                  >
                    <User className="w-4 h-4 text-white" />
                    <span className="hidden sm:inline">Profile</span>
                  </Link>

                  <button
                    onClick={logout}
                    className="minecraft-btn btn btn-sm gap-2 rounded pixel-font"
                  >
                    <LogOut className="w-4 h-4 text-white" />
                    <span className="hidden sm:inline">Logout</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>
    </>
  );
};

export default Navbar;