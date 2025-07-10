import { X, Video } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import { useVideoCallStore } from "../store/useVideoCallStore.js";
import toast from "react-hot-toast";
import { useState } from "react";
import SearchBox from "./SearchBox";


const ChatHeader = () => {
    const { selectedUser, setSelectedUser } = useChatStore();
    const { onlineUsers } = useAuthStore();
    const { initiateCall, setLocalStream } = useVideoCallStore();
    const [showSearch, setShowSearch] = useState(false);

    const handleVideoCall = async () => {
        if (!selectedUser || !onlineUsers.includes(selectedUser._id)) {
            toast.error("User is not online");
            return;
        }
        // Prevent self-call
        const { authUser } = useAuthStore.getState();
        if (selectedUser._id === authUser._id) {
            toast.error("Cannot call yourself");
            return;
        }
        try {
            console.log("[CHAT HEADER] Starting video call, requesting media access...");
            // Request media access first
            const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true
            });
            console.log("[CHAT HEADER] Media access granted, initiating call...");
            setLocalStream(stream);
            initiateCall(selectedUser);
        } catch (error) {
            console.error("[CHAT HEADER] Error accessing media:", error);
            if (error.name === 'NotAllowedError') {
                toast.error("Camera/microphone access denied. Please allow permissions and try again.");
            } else if (error.name === 'NotFoundError') {
                toast.error("No camera/microphone found on this device.");
            } else if (error.name === 'NotSupportedError') {
                toast.error("Camera/microphone not supported on this browser.");
            } else {
                toast.error("Could not access camera/microphone: " + error.message);
            }
        }
    };

    return (
        <>
            {showSearch && <SearchBox onClose={() => setShowSearch(false)} />}
            <div
                className="p-2.5 border-b border-gray-600 bg-gray-300/90 minecraft-border"
                style={{
                    backgroundImage: "url('https://minecraft.wiki/images/Stone_%28texture%29_JE5_BE3.png')",
                    backgroundRepeat: "repeat",
                    imageRendering: "pixelated",
                }}
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {/* Avatar */}
                        <div className="avatar">
                            <div className="size-16 rounded-full relative drop-shadow-[2px_2px_0_#00000080] border-2 border-gray-600">
                                <img
                                    src={selectedUser.profilePic || "/avatar.png"}
                                    alt={selectedUser.fullName}
                                    style={{ imageRendering: "pixelated" }}
                                />
                            </div>
                        </div>

                        {/* User info */}
                        <div>
                            <h3 className="font-medium pixel-font text-gray-100 drop-shadow-[1px_1px_0_#00000080] text-2xl">
                                {selectedUser.fullName}
                            </h3>
                            <p className="pixel-font text-2xl text-gray-300 drop-shadow-[1px_1px_0_#00000080]">
                                {onlineUsers.includes(selectedUser._id) ? "Online" : "Offline"}
                            </p>
                        </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2">
                        {/* Search button */}
                        <button
                            onClick={() => setShowSearch(true)}
                            className="text-gray-100 drop-shadow-[1px_1px_0_#00000080] mr-2"
                            title="Tìm kiếm tin nhắn"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 104.5 4.5a7.5 7.5 0 0012.15 12.15z" />
                            </svg>
                        </button>
                        {/* Video Call Button */}
                        <button
                            onClick={handleVideoCall}
                            disabled={!onlineUsers.includes(selectedUser._id)}
                            className={`p-2 rounded minecraft-border transition-all ${
                                onlineUsers.includes(selectedUser._id)
                                    ? "bg-green-500 hover:bg-green-600 text-white hover:scale-105"
                                    : "bg-gray-400 text-gray-600 cursor-not-allowed"
                            }`}
                            title="Start Video Call"
                        >
                            <Video size={20} />
                        </button>
                        {/* Close chat button */}
                        <button
                            onClick={() => setSelectedUser(null)}
                            className="p-2 text-gray-300 hover:text-white transition-colors minecraft-border bg-gray-600 hover:bg-gray-700 rounded"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default ChatHeader;