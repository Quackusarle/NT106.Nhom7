import { useState } from "react";
import { useThemeStore } from "../store/useThemeStore";
import { Send } from "lucide-react";

// Define available background textures
const TEXTURES = [
  { name: "Dirt", url: "https://minecraft.wiki/images/Dirt_%28texture%29_JE2_BE2.png" },
  { name: "Stone", url: "https://minecraft.wiki/images/Stone_%28texture%29_JE5_BE3.png" },
  { name: "Grass", url: "https://minecraft.wiki/images/Grass_Block_%28top_texture%29_JE5_BE2.png" },
  { name: "Wood", url: "https://minecraft.wiki/images/Oak_Planks_%28texture%29_JE6_BE3.png" },
];

const PREVIEW_MESSAGES = [
  { id: 1, content: "Hey! How's it going?", isSent: false },
  { id: 2, content: "I'm doing great! Just working on some new features.", isSent: true },
];

const SettingsPage = () => {
  const { texture, setTexture } = useThemeStore();
  const [previewTexture, setPreviewTexture] = useState(texture || TEXTURES[0].url);

  return (
    <>
      {/* Custom Minecraft-like font and styles */}
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=VT323&display=swap');
          .pixel-font {
            font-family: 'VT323', monospace;
          }
          .minecraft-bg {
            background-color: #d4c8a8;
            border: 2px solid #8b8b8b;
            box-shadow: inset 0 0 0 1px #00000030;
          }
          .minecraft-border {
            border: 4px solid #555555;
            box-shadow: 4px 4px 0 #00000050;
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

      <div className="h-screen flex flex-col items-center justify-start bg-gradient-to-b from-green-600 to-green-800 p-4 pt-24 overflow-hidden">
        <div className="w-full max-w-5xl space-y-8 flex-1 flex flex-col">
          <div className="flex flex-col gap-2 text-center">
            <h2 className="text-3xl font-semibold pixel-font text-gray-100">Settings</h2>
            <p className="text-lg text-gray-200 pixel-font">Choose a background texture for your chat interface</p>
          </div>

          {/* Texture Selection Section */}
          <div className="flex justify-center">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl">
              {TEXTURES.map((t) => (
                <button
                  key={t.name}
                  className={`
                    group flex flex-col items-center gap-2 p-3 rounded-lg minecraft-border transition-transform
                    bg-gray-300/90
                    ${texture === t.url ? "scale-105 border-green-700" : "hover:scale-105 hover:border-green-600"}
                  `}
                  onClick={() => {
                    setTexture(t.url);
                    setPreviewTexture(t.url);
                  }}
                >
                  <div
                    className="relative h-12 w-12 rounded-lg overflow-hidden minecraft-bg"
                    style={{ backgroundImage: `url('${t.url}')`, backgroundSize: "cover", imageRendering: "pixelated" }}
                  ></div>
                  <span className="text-lg pixel-font text-gray-800">
                    {t.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Preview Section */}
          <h3 className="text-2xl font-semibold pixel-font text-gray-100 mb-4 text-center">Preview</h3>
          <div className="rounded-lg minecraft-border overflow-hidden bg-gray-300/90 shadow-lg max-w-2xl mx-auto">
            <div className="p-6">
              {/* Mock Chat UI */}
              <div className="bg-gray-300/90 rounded-lg minecraft-border overflow-hidden">
                {/* Chat Header */}
                <div
                  className="px-4 py-3 border-b-2 border-gray-600"
                  style={{
                    backgroundImage: `url('https://minecraft.wiki/images/Stone_%28texture%29_JE5_BE3.png')`,
                    backgroundRepeat: "repeat",
                    imageRendering: "pixelated",
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center text-white pixel-font font-medium text-xl">
                      J
                    </div>
                    <div>
                      <h3 className="text-xl pixel-font text-gray-100">John Doe</h3>
                      <p className="text-sm text-gray-300 pixel-font">Online</p>
                    </div>
                  </div>
                </div>

                {/* Chat Messages */}
                <div
                  className="p-4 space-y-4 min-h-[200px] max-h-[200px] overflow-y-auto"
                  style={{ backgroundImage: `url('${previewTexture}')`, backgroundRepeat: "repeat", imageRendering: "pixelated" }}
                >
                  {PREVIEW_MESSAGES.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.isSent ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`
                          max-w-[70%] rounded-lg p-3 minecraft-border
                          ${message.isSent ? "bg-gray-800 text-white" : "bg-gray-300/90"}
                        `}
                      >
                        <p className="text-lg pixel-font">{message.content}</p>
                        <p
                          className={`
                            text-sm mt-1.5 pixel-font
                            ${message.isSent ? "text-gray-300" : "text-gray-700"}
                          `}
                        >
                          12:00 PM
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Chat Input */}
                <div
                  className="p-4 border-t-2 border-gray-600"
                  style={{
                    backgroundImage: `url('https://minecraft.wiki/images/Stone_%28texture%29_JE5_BE3.png')`,
                    backgroundRepeat: "repeat",
                    imageRendering: "pixelated",
                  }}
                >
                  <div className="flex gap-2">
                    <input
                      type="text"
                      className="minecraft-bg flex-1 text-lg h-12 rounded-lg pixel-font"
                      placeholder="Type a message..."
                      value="This is a preview"
                      readOnly
                    />
                    <button className="minecraft-btn h-12 min-h-0 px-4">
                      <Send size={20} className="text-white" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
export default SettingsPage;