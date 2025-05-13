import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { useThemeStore } from "../store/useThemeStore";
import { useEffect, useRef, useCallback } from "react";

import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import Message from "./Message";

const ChatContainer = () => {
    const messages = useChatStore((state) => state.messages);
    const isMessagesLoading = useChatStore((state) => state.isMessagesLoading);
    const selectedUser = useChatStore((state) => state.selectedUser);
    const setupMessageListeners = useChatStore((state) => state.setupMessageListeners);
    const hasNewMessages = useChatStore((state) => state.hasNewMessages);

    const socket = useAuthStore((state) => state.socket);
    const { texture } = useThemeStore();

    const messageEndRef = useRef(null);
    const containerRef = useRef(null);

    useEffect(() => {
        if (socket) {
            setupMessageListeners();
        }
    }, [socket, setupMessageListeners]);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (messageEndRef.current) {
                messageEndRef.current.scrollIntoView({ behavior: hasNewMessages ? "smooth" : "auto" });
            }
        }, 0);

        return () => clearTimeout(timer);
    }, [messages, hasNewMessages]);

    return (
        <div className="flex-1 flex flex-col overflow-auto">
            <style>
                {`
          .minecraft-border {
            border: 4px solid #555555;
            box-shadow: 4px 4px 0 #00000050;
          }
        `}
            </style>
            <ChatHeader />

            {/* Message display area */}
            <div
                ref={containerRef}
                className="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-300/90 minecraft-border"
                style={{
                    backgroundImage: `url('${texture}')`,
                    backgroundRepeat: "repeat",
                    imageRendering: "pixelated",
                }}
            >
                {/* Show loading skeleton while messages are loading */}
                {isMessagesLoading && (
                    <>
                        <MessageSkeleton />
                        <MessageSkeleton />
                        <MessageSkeleton />
                    </>
                )}

                {/* Hiển thị tin nhắn */}
                {!isMessagesLoading && messages.length === 0 && selectedUser && (
                    <div className="text-center text-gray-600 py-8 drop-shadow-[1px_1px_0_#00000080] pixel-font text-2xl">
                        Không có tin nhắn. Hãy bắt đầu cuộc trò chuyện!
                    </div>
                )}

                {/* Render decrypted messages using the Message component */}
                {!isMessagesLoading &&
                    messages.map((message, index) => {
                        console.log(
                            `[ChatContainer rendering Message ${message._id || index}] is_file: ${message.is_file}, Type: ${typeof message.is_file}, Full Message Prop:`,
                            JSON.parse(JSON.stringify(message))
                        );
                        return (
                            <Message
                                key={message._id || `msg-${index}`} // Use index as fallback key
                                message={message}
                            />
                        );
                    })}

                {/* Empty div to scroll to */}
                <div ref={messageEndRef} />
            </div>

            {/* Message Input area with stone texture */}
            <div
                className="border-t border-gray-600 bg-gray-300/90 minecraft-border"
                style={{
                    backgroundImage: "url('https://minecraft.wiki/images/Stone_%28texture%29_JE5_BE3.png')",
                    backgroundRepeat: "repeat",
                    imageRendering: "pixelated",
                }}
            >
                <MessageInput />
            </div>
        </div>
    );
};
export default ChatContainer;