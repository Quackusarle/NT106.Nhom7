import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

const fetchPublicKey = async (userId) => {
    try {
        const res = await axiosInstance.get(`/auth/public-key/${userId}`);
        return res.data.publicKey;
    } catch (error) {
        console.error("Error fetching public key:", error);
        toast.error(error.response?.data?.message || "Failed to fetch recipient's public key.");
        return null;
    }
};

export const useChatStore = create((set, get) => ({
    // Lắng nghe realtime khi có bạn mới được chấp nhận
    subscribeToFriendAccepted: () => {
        const socket = useAuthStore.getState().socket;
        if (!socket) return;
        socket.off("friendAccepted");
        socket.on("friendAccepted", ({ user }) => {
            if (!user) return;
            set(state => {
                // Nếu user đã có trong danh sách thì không thêm lại
                if (state.users.some(u => u._id === user._id)) return {};
                return { users: [...state.users, user] };
            });
        });
    },

    messages: [],
    users: [],
    selectedUser: null,
    isUsersLoading: false,
    isMessagesLoading: false,
    isSendingMessage: false,
    isFetchingMessages: false,
    hasNewMessages: false,
    selectedMessageId: null,

    // Lấy danh sách bạn bè
    getUsers: async () => {
        set({ isUsersLoading: true });
        try {
            const res = await axiosInstance.get("/users/friends");
            // Giữ lại unreadCount cũ nếu có
            const prevUsers = get().users;
            const usersWithUnread = res.data.map(user => {
                const prev = prevUsers.find(u => u._id === user._id);
                return { ...user, unreadCount: prev ? prev.unreadCount : 0 };
            });
            set({ users: usersWithUnread, isUsersLoading: false });
        } catch (error) {
            console.error("Error fetching friends:", error);
            toast.error(error.response?.data?.message || "Failed to fetch friends");
            set({ isUsersLoading: false });
        }
    },

    // Gửi lời mời kết bạn
    sendFriendRequest: async (email) => {
        try {
            await axiosInstance.post("/users/send-friend-request", { email });
            toast.success("Đã gửi lời mời kết bạn!");
        } catch (error) {
            toast.error(error.response?.data?.message || "Gửi lời mời thất bại");
        }
    },

    // Lấy danh sách lời mời kết bạn
    getFriendRequests: async () => {
        try {
            const res = await axiosInstance.get("/users/friend-requests");
            set({ friendRequests: res.data });
        } catch (error) {
            toast.error("Không thể lấy danh sách lời mời");
        }
    },

    // Đồng ý kết bạn
    acceptFriendRequest: async (userId) => {
        try {
            await axiosInstance.post("/users/accept-friend-request", { userId });
            toast.success("Đã chấp nhận kết bạn!");
            await get().getUsers();
            await get().getFriendRequests();
            // Đảm bảo lắng nghe event realtime
            get().subscribeToFriendAccepted();
        } catch (error) {
            toast.error("Không thể chấp nhận kết bạn");
        }
    },

    // Từ chối kết bạn
    declineFriendRequest: async (userId) => {
        try {
            await axiosInstance.post("/users/decline-friend-request", { userId });
            toast.success("Đã từ chối lời mời!");
            await get().getFriendRequests();
        } catch (error) {
            toast.error("Không thể từ chối lời mời");
        }
    },

    getMessages: async (userId) => {
        set({ isMessagesLoading: true, messages: [] });
        try {
            // Get userID to know which users is giving the messages...
            const res = await axiosInstance.get(`/messages/${userId}`);
            set({ messages: res.data, isMessagesLoading: false });
        } catch (error) {
            console.error("Error fetching messages:", error);
            toast.error(error.response?.data?.message || "Failed to fetch messages");
            set({ messages: [], isMessagesLoading: false });
        }
    },

    fetchMessages: async (userId) => {
        set({ isMessagesLoading: true });
        try {
            const res = await axiosInstance.get(`/messages/${userId}`);
            set({ messages: res.data, isMessagesLoading: false });
        } catch (error) {
            set({ isMessagesLoading: false });
            toast.error(error.response?.data?.message || "Error fetching messages");
        }
    },

    fetchNewMessages: async (userId) => {
        const state = get();
        if (!userId || state.isFetchingMessages) return;

        set({ isFetchingMessages: true });
        try {
            const lastMessageId = state.messages.length > 0
                ? state.messages[state.messages.length - 1]._id
                : null;

            const res = await axiosInstance.get(`/messages/${userId}`, {
                params: { after: lastMessageId }
            });

            const newMessages = res.data;
            if (newMessages.length > 0) {
                console.log(`[Chat] Fetched ${newMessages.length} new messages`);
                set({
                    messages: [...state.messages, ...newMessages],
                    hasNewMessages: true
                });
            }
        } catch (error) {
            console.error("Error fetching new messages:", error);
        } finally {
            set({ isFetchingMessages: false });
        }
    },

    sendMessage: async (encryptedBundle) => {
        set({ isSendingMessage: true });
        const { selectedUser } = get();
        if (!selectedUser) {
            set({ isSendingMessage: false });
            return toast.error("No user selected");
        }

        try {
            console.log("useChatStore sendMessage: Sending bundle:", JSON.stringify(encryptedBundle).substring(0, 200) + "...");
            const response = await axiosInstance.post(`/messages/send/${selectedUser._id}`, encryptedBundle);
            console.log("useChatStore sendMessage: Received successful response (201):", response.data);

            set({ isSendingMessage: false });
            return response.data;

        } catch (error) {
            console.error("useChatStore sendMessage: Error sending message:", error);
            if (error.response) {
                console.error("useChatStore sendMessage: Error response data:", error.response.data);
                console.error("useChatStore sendMessage: Error response status:", error.response.status);
            }
            const errorMsg = error.response?.data?.error || error.message || "Failed to send message";
            toast.error(`Send Error: ${errorMsg}`);
            set({ isSendingMessage: false });
            throw error;
        }
    },

    // Xóa bạn bè
    removeFriend: async (userId) => {
        try {
            await axiosInstance.post("/users/remove-friend", { userId });
            toast.success("Đã xóa bạn bè!");
            await get().getUsers();
        } catch (error) {
            toast.error(error.response?.data?.message || "Xóa bạn bè thất bại");
        }
    },

    // Lắng nghe realtime khi bị xóa bạn bè
    subscribeToFriendRemoved: () => {
        const socket = useAuthStore.getState().socket;
        if (!socket) return;
        socket.off("friendRemoved");
        socket.on("friendRemoved", async (removedUserId) => {
            await get().getUsers();
            // Nếu đang chat với người vừa bị hủy kết bạn thì thoát khỏi đoạn chat đó
            const state = get();
            if (state.selectedUser && state.selectedUser._id === removedUserId) {
                set({ selectedUser: null, messages: [] });
            }
        });
    },

    subscribeToMessages: () => {
        const socket = useAuthStore.getState().socket;
        if (!socket) {
            console.warn("[subscribeToMessages] Socket not available.");
            return;
        }
        // Đảm bảo lắng nghe realtime bạn bè
        get().subscribeToFriendAccepted();
        get().subscribeToFriendRemoved();

        socket.off("newMessage");
        socket.on("newMessage", (newMessage) => {
            console.log('[SOCKET] Full newMessage received:', JSON.stringify(newMessage, null, 2));
            const state = get();
            const selectedUser = state.selectedUser;
            const currentAuthUser = useAuthStore.getState().authUser;

            if (!currentAuthUser || !newMessage?._id) {
                console.warn("[SOCKET] Cannot process new message: Auth user or message ID missing.");
                return;
            }

            const senderId = newMessage.senderId;
            const receiverId = newMessage.receiverId;

            const isRelevantToAuthUser = senderId === currentAuthUser._id || receiverId === currentAuthUser._id;
            if (!isRelevantToAuthUser) {
                console.log("[SOCKET] Message not relevant to current user.");
                return;
            }

            const isChatOpen =
                (senderId === selectedUser?._id && receiverId === currentAuthUser._id) ||
                (receiverId === selectedUser?._id && senderId === currentAuthUser._id);

            if (isChatOpen) {
                const messageExists = state.messages.some(msg => msg._id === newMessage._id);
                if (!messageExists) {
                    console.log("[SOCKET] Adding new message to OPEN chat state:", newMessage._id);
                    console.log("[SOCKET] Message data being added:", JSON.parse(JSON.stringify(newMessage)));
                    set((prevState) => ({ messages: [...prevState.messages, newMessage] }));

                    if (senderId === selectedUser?._id) {
                        axiosInstance.post(`/messages/read/${selectedUser._id}`).catch(err => {
                            console.error("[SOCKET] Failed to auto-mark message as read:", err);
                        });
                    }
                } else {
                    console.log("[SOCKET] Skipping duplicate message in OPEN chat:", newMessage._id);
                }
            } else {
                if (receiverId === currentAuthUser._id) {
                    console.log("[SOCKET] Received message for a CLOSED chat from sender:", senderId);

                    const senderUser = state.users.find(user => user._id === senderId);
                    if (senderUser) {
                        toast(`New message from ${senderUser.fullName}`);

                        set((prevState) => ({
                            users: prevState.users.map(user =>
                                user._id === senderId
                                    ? { ...user, unreadCount: (user.unreadCount || 0) + 1 }
                                    : user
                            )
                        }));
                    } else {
                        toast("New message received");
                        console.warn(`[SOCKET] Sender user ${senderId} not found in the user list for notification.`);
                    }
                }
            }
        });
        console.log("[subscribeToMessages] 'newMessage' listener is set up.");

        socket.off("messageDeleted");
        socket.on("messageDeleted", (data) => {
            console.log(`[SOCKET] Received 'messageDeleted' event. Data:`, data);

            if (!data || !data.messageId) {
                console.warn("[SOCKET messageDeleted] Received invalid data format (missing data or messageId).");
                return;
            }

            const { messageId, conversationId } = data;
            const state = get();
            const authUser = useAuthStore.getState().authUser;
            const currentSelectedUserId = state.selectedUser?._id;

            console.log(`[SOCKET messageDeleted] State Check: authUser=${authUser?._id}, selectedUser=${currentSelectedUserId}, received conversationId=${conversationId}`);

            const isChatRelevant = true;

            console.log(`[SOCKET messageDeleted] Condition Check: isChatRelevant=${isChatRelevant}`);

            if (isChatRelevant) {
                console.log(`[SOCKET messageDeleted] Removing deleted message ${messageId} from state.`);
                set((prevState) => {
                    const messagesBefore = prevState.messages.length;
                    const messageExists = prevState.messages.some(msg => msg._id === messageId);

                    if (!messageExists) {
                        console.log(`[SOCKET messageDeleted] Message ${messageId} not found in current state. Skipping removal.`);
                        return {};
                    }

                    const newMessages = prevState.messages.filter((msg) => msg._id !== messageId);
                    const messagesAfter = newMessages.length;
                    console.log(`[SOCKET messageDeleted] Messages before: ${messagesBefore}, after: ${messagesAfter}. Filtered for ID: ${messageId}`);

                    return {
                        messages: newMessages,
                        selectedMessageId: prevState.selectedMessageId === messageId ? null : prevState.selectedMessageId,
                    };
                });
            }
        });
        console.log("[subscribeToMessages] 'messageDeleted' listener is set up.");

        // Cải thiện listener cho messageReaction
        socket.off("messageReaction");
        socket.on("messageReaction", (data) => {
            console.log("[SOCKET] Received messageReaction:", data);
            
            if (!data || !data.messageId) {
                console.warn("[SOCKET] Invalid messageReaction data:", data);
                return;
            }

            const { messageId, reactions } = data;
            
            set((state) => ({
                messages: state.messages.map(msg =>
                    msg._id === messageId 
                        ? { ...msg, reactions: reactions || [] }
                        : msg
                )
            }));
        });
        console.log("[subscribeToMessages] 'messageReaction' listener is set up.");
    },

    unsubscribeFromMessages: () => {
        const socket = useAuthStore.getState().socket;
        if (socket) {
            socket.off("newMessage");
            socket.off("messageDeleted");
            socket.off("messageReaction");
        }
    },

    setSelectedUser: (user) => {
        get().unsubscribeFromMessages();
        const currentUserId = user?._id;
        // Reset unread count cho user được chọn
        if (currentUserId) {
            set((prevState) => ({
                users: prevState.users.map(u =>
                    u._id === currentUserId ? { ...u, unreadCount: 0 } : u
                )
            }));
        }
        // Chỉ set selectedUser và loading, KHÔNG xóa messages ngay lập tức
        set({ selectedUser: user, isLoadingMessages: true });
        if (currentUserId) {
            get().fetchMessages(currentUserId); // fetchMessages sẽ tự cập nhật messages khi thành công
            get().subscribeToMessages();
            axiosInstance.post(`/messages/read/${currentUserId}`).catch(err => {
                console.error("Failed to mark messages as read on user selection:", err);
            });
        } else {
            set({ isLoadingMessages: false });
        }
    },

    setupMessageListeners: () => {
        const socket = useAuthStore.getState().socket;
        if (!socket) {
            console.warn("[setupMessageListeners] Socket not available.");
            return;
        }

        socket.off("receiveNewMessages");
        socket.on("receiveNewMessages", (messages) => {
            console.log("[SOCKET] Received receiveNewMessages event:", messages);
            if (messages.length > 0) {
                const state = get();

                const filteredMessages = messages.filter(msg => {
                    const isRelevant = state.selectedUser?._id &&
                        (msg.senderId === state.selectedUser._id || msg.receiverId === state.selectedUser._id);
                    const isDuplicate = state.messages.some(existing => existing._id === msg._id);
                    return isRelevant && !isDuplicate;
                });

                if (filteredMessages.length > 0) {
                    console.log("[SOCKET] Adding new messages from receiveNewMessages:", filteredMessages);
                    set((prevState) => ({ messages: [...prevState.messages, ...filteredMessages] }));
                } else {
                    console.log("[SOCKET] No relevant/new messages from receiveNewMessages event.");
                }
            } else {
                console.log("[SOCKET] receivedNewMessages event had empty messages array.");
            }
        });
        console.log("[setupMessageListeners] Listeners (excluding newMessage) are set up.");

        // Lắng nghe reaction updates
        socket.off("messageReaction");
        socket.on("messageReaction", (data) => {
            console.log("[SOCKET] Received messageReaction:", data);
            
            if (!data || !data.messageId) {
                console.warn("[SOCKET] Invalid messageReaction data:", data);
                return;
            }

            const { messageId, reactions } = data;
            
            set((state) => ({
                messages: state.messages.map(msg =>
                    msg._id === messageId 
                        ? { ...msg, reactions: reactions || [] }
                        : msg
                )
            }));
        });
        console.log("[setupMessageListeners] 'messageReaction' listener is set up.");
    },

    setSelectedMessageId: (messageId) => {
        console.log(`[ChatStore] setSelectedMessageId called with: ${messageId}`);
        set((state) => {
            const newSelectedId = state.selectedMessageId === messageId ? null : messageId;
            console.log(`[ChatStore] Updating selectedMessageId from ${state.selectedMessageId} to ${newSelectedId}`);
            return {
                selectedMessageId: newSelectedId,
            };
        });
    },

    clearSelectedMessageId: () => {
        console.log("[ChatStore] clearSelectedMessageId called.");
        set({ selectedMessageId: null });
    },

    deleteMessage: async (messageId) => {
        console.log(`[ChatStore] Attempting to delete message: ${messageId}`);

        set((state) => ({
            messages: state.messages.filter((msg) => msg._id !== messageId),
            selectedMessageId: null,
        }));

        try {
            const response = await axiosInstance.delete(`/messages/delete/${messageId}`);
            console.log(`[ChatStore] Successfully deleted message ${messageId} on server.`);
        } catch (error) {
            console.error(`[ChatStore] Error calling delete API for message ${messageId}:`, error);
            if (error.response) {
                console.error("[ChatStore] Delete Error Response Status:", error.response.status);
                console.error("[ChatStore] Delete Error Response Data:", error.response.data);
            }
            alert("Failed to delete message on the server. Message remains deleted locally.");
            set({ selectedMessageId: null });
        }
    },

    updateMessageReaction: (messageId, emoji, userId, add) => {
        set((state) => ({
            messages: state.messages.map(msg => {
                if (msg._id !== messageId) return msg;
                
                let newReactions = Array.isArray(msg.reactions) ? [...msg.reactions] : [];
                
                if (add) {
                    // Thêm reaction nếu chưa có
                    const existingReaction = newReactions.find(r => r.userId === userId && r.emoji === emoji);
                    if (!existingReaction) {
                        newReactions.push({ userId, emoji, createdAt: new Date() });
                    }
                } else {
                    // Xóa reaction
                    newReactions = newReactions.filter(r => !(r.userId === userId && r.emoji === emoji));
                }
                
                return { ...msg, reactions: newReactions };
            })
        }));
    },

    // Tìm kiếm tin nhắn trong cuộc trò chuyện hiện tại (tìm trên client, giải mã từng message)
    searchMessages: async (query) => {
        const { selectedUser } = get();
        const authUser = useAuthStore.getState().authUser;
        const privateKey = useAuthStore.getState().privateKey;

        if (!query.trim() || !privateKey || !authUser || !selectedUser) {
            return [];
        }

        try {
            // ✅ SỬA: Gọi đúng endpoint có sẵn trong backend
            const res = await axiosInstance.get(`/messages/search/${selectedUser._id}`, {
                params: { query: query.trim() }
            });

            const allMessages = res.data;

            // Import các thư viện cần thiết
            const JSEncrypt = (await import('jsencrypt')).default;
            const { base64ToArrayBuffer } = await import('../lib/utils');

            // Duyệt và giải mã từng message để tìm kiếm
            const results = [];
            const searchTerm = query.toLowerCase().trim();

            for (const msg of allMessages) {
                try {
                    // Bỏ qua tin nhắn file
                    if (msg.is_file) continue;

                    const isSender = msg.senderId === authUser._id;
                    const keyToUse = isSender ? msg.encryptedKeySender : msg.encryptedKey;

                    if (!keyToUse || !msg.iv || !msg.encryptedContent) {
                        console.warn(`Message ${msg._id} missing encryption data`);
                        continue;
                    }

                    // Giải mã AES key bằng RSA private key
                    const decryptor = new JSEncrypt();
                    decryptor.setPrivateKey(privateKey);
                    const decryptedAesKeyBase64 = decryptor.decrypt(keyToUse);

                    if (!decryptedAesKeyBase64) {
                        console.warn(`Cannot decrypt AES key for message ${msg._id}`);
                        continue;
                    }

                    // Import AES key
                    const aesKeyBuffer = base64ToArrayBuffer(decryptedAesKeyBase64);
                    const aesKey = await window.crypto.subtle.importKey(
                        "raw",
                        aesKeyBuffer,
                        { name: "AES-GCM", length: 256 },
                        true,
                        ["decrypt"]
                    );

                    // Giải mã nội dung tin nhắn
                    const ivBuffer = base64ToArrayBuffer(msg.iv);
                    const encryptedContentBuffer = base64ToArrayBuffer(msg.encryptedContent);

                    const decrypted = await window.crypto.subtle.decrypt(
                        { name: "AES-GCM", iv: ivBuffer },
                        aesKey,
                        encryptedContentBuffer
                    );

                    const decoder = new TextDecoder();
                    const plainContent = decoder.decode(decrypted);

                    // Kiểm tra xem có phải là hình ảnh base64 không
                    const isImage = plainContent.startsWith('data:image/');

                    // Chỉ tìm kiếm trong tin nhắn text, bỏ qua hình ảnh
                    if (!isImage && plainContent && plainContent.toLowerCase().includes(searchTerm)) {
                        results.push({ ...msg, plainContent });
                    }

                } catch (e) {
                    // Bỏ qua tin nhắn không giải mã được
                    console.warn(`Cannot decrypt message ${msg._id}:`, e.message);
                    continue;
                }
            }

            console.log(`Search completed: Found ${results.length} text messages containing "${query}"`);
            return results;

        } catch (error) {
            console.error("Error in searchMessages:", error);
            toast.error("Lỗi khi tìm kiếm tin nhắn");
            return [];
        }
    }
}));
