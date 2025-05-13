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
    messages: [],
    users: [],
    selectedUser: null,
    isUsersLoading: false,
    isMessagesLoading: false,
    isSendingMessage: false,
    isFetchingMessages: false,
    hasNewMessages: false,

    getUsers: async () => {
        set({ isUsersLoading: true });
        try {

            const res = await axiosInstance.get("/messages/users");

            const usersWithUnread = res.data.map(user => ({ ...user, unreadCount: 0 }));
            set({ users: usersWithUnread, isUsersLoading: false });
        } catch (error) {
            console.error("Error fetching users:", error);
            toast.error(error.response?.data?.message || "Failed to fetch users");
            set({ isUsersLoading: false });
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

    subscribeToMessages: () => {
        const socket = useAuthStore.getState().socket;
        if (!socket) {
            console.warn("[subscribeToMessages] Socket not available.");
            return;
        }


        socket.off("newMessage");
        socket.on("newMessage", (newMessage) => {
            console.log('[SOCKET] Full newMessage received:', JSON.stringify(newMessage, null, 2)); // Log the entire received object
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

    },

    unsubscribeFromMessages: () => {
        const socket = useAuthStore.getState().socket;
        if (socket) {
            socket.off("newMessage");
            socket.off("messageDeleted");
        }
    },


    setSelectedUser: (user) => {

        get().unsubscribeFromMessages();

        const currentUserId = user?._id;


        if (currentUserId) {
            set((prevState) => ({
                users: prevState.users.map(u =>
                    u._id === currentUserId ? { ...u, unreadCount: 0 } : u
                )
            }));
        }

        set({ selectedUser: user, messages: [], isLoadingMessages: true });
        if (currentUserId) {
            get().fetchMessages(currentUserId);
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
        console.log("[setupMessageListeners] Listeners (excluding newMessage) are set up.")
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
}));