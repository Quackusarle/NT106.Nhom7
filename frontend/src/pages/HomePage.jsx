import { useChatStore } from "../store/useChatStore";

import Sidebar from "../components/Sidebar";
import NoChatSelected from "../components/NoChatSelected";
import ChatContainer from "../components/ChatContainer";
import VideoCall from "../components/VideoCall";

const HomePage = () => {
  const { selectedUser } = useChatStore();

  return (
    <div className="h-screen flex flex-col items-center justify-start bg-gradient-to-b from-green-600 to-green-800 p-4 pt-24 overflow-hidden">
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
        `}
      </style>
      <div className="w-full max-w-6xl h-[calc(100vh-6rem)] rounded-lg minecraft-border overflow-hidden">
        <div className="flex h-full">
          <Sidebar />
          {!selectedUser ? <NoChatSelected /> : <ChatContainer />}
        </div>
      </div>
      {/* Video Call Component - renders globally when active */}
      <VideoCall />
    </div>
  );
};
export default HomePage;