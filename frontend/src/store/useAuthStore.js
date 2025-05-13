import { create } from "zustand";
import { axiosInstance } from "../lib/axios.js";
import toast from "react-hot-toast";
import { io } from "socket.io-client";
import { JSEncrypt } from "jsencrypt";
import { useChatStore } from "./useChatStore.js";

const BASE_URL = import.meta.env.MODE === "development" ? "http://localhost:5001" : "/";


const generateKeys = () => {
    const crypt = new JSEncrypt({ default_key_size: 2048 });
    const privateKey = crypt.getPrivateKey();
    const publicKey = crypt.getPublicKey();
    console.log("New RSA keys generated.");
    return { privateKey, publicKey };
};


const storeKeys = (privateKey, publicKey, userId) => {
    try {
        if (!userId || !privateKey || !publicKey) {
            console.error("Missing required data for key storage");
            return false;
        }

        const keyPrefix = `chatty_${userId}_`;
        localStorage.setItem(`${keyPrefix}private_key`, privateKey);
        localStorage.setItem(`${keyPrefix}public_key`, publicKey);
        console.log("Keys stored successfully for user:", userId);
        return true;
    } catch (error) {
        console.error("Failed to store keys:", error);
        return false;
    }
};


const retrieveKeys = (userId) => {
    try {
        if (!userId) {
            console.log("No userId provided for key retrieval");
            return null;
        }

        const keyPrefix = `chatty_${userId}_`;
        const privateKey = localStorage.getItem(`${keyPrefix}private_key`);
        const publicKey = localStorage.getItem(`${keyPrefix}public_key`);

        if (!privateKey || !publicKey) {
            console.log("No stored keys found for user:", userId);
            return null;
        }

        console.log("Retrieved stored keys for user:", userId);
        return { privateKey, publicKey };
    } catch (error) {
        console.error("Failed to retrieve keys:", error);
        return null;
    }
};


const clearStoredKeys = (userId) => {
    try {
        if (!userId) return;
        const keyPrefix = `chatty_${userId}_`;
        localStorage.removeItem(`${keyPrefix}private_key`);
        localStorage.removeItem(`${keyPrefix}public_key`);
        console.log("Cleared stored keys for user:", userId);
    } catch (error) {
        console.error("Failed to clear keys:", error);
    }
};


const validateKeys = async (privateKey, publicKey) => {
    try {
        const testMessage = "test";
        const encryptor = new JSEncrypt();
        encryptor.setPublicKey(publicKey);
        const encrypted = encryptor.encrypt(testMessage);

        const decryptor = new JSEncrypt();
        decryptor.setPrivateKey(privateKey);
        const decrypted = decryptor.decrypt(encrypted);

        return decrypted === testMessage;
    } catch (error) {
        console.error("Key validation failed:", error);
        return false;
    }
};

export const useAuthStore = create((set, get) => ({
    authUser: null,
    privateKey: null,
    isSigningUp: false,
    isLoggingIn: false,
    isUpdatingProfile: false,
    isCheckingAuth: true,
    onlineUsers: [],
    socket: null,

    checkAuth: async () => {
        set({ isCheckingAuth: true });
        try {
            const res = await axiosInstance.get("/auth/check");
            const userId = res.data._id;


            const storedKeys = retrieveKeys(userId);
            if (storedKeys && await validateKeys(storedKeys.privateKey, storedKeys.publicKey)) {
                console.log("Retrieved and validated stored keys successfully");


                await axiosInstance.put("/auth/update-public-key", {
                    publicKey: storedKeys.publicKey
                });

                set({
                    authUser: res.data,
                    privateKey: storedKeys.privateKey
                });
            } else {
                console.warn("[checkAuth] Keys not found or failed validation. Generating new keys.");
                console.log("No valid stored keys found during checkAuth, generating new ones");
                const { privateKey, publicKey } = generateKeys();


                await axiosInstance.put("/auth/update-public-key", { publicKey });


                if (storeKeys(privateKey, publicKey, userId)) {
                    set({
                        authUser: res.data,
                        privateKey: privateKey
                    });
                } else {
                    throw new Error("Failed to store newly generated keys");
                }
            }

            get().connectSocket();
        } catch (error) {
            console.log("Auth check failed:", error);
            set({ authUser: null, privateKey: null });
            if (error.response?.status === 401) {
                clearStoredKeys(get().authUser?._id);
            }
        } finally {
            set({ isCheckingAuth: false });
        }
    },

    signup: async (data) => {
        set({ isSigningUp: true });
        try {
            const { privateKey, publicKey } = generateKeys();
            const res = await axiosInstance.post("/auth/signup", { ...data, publicKey });
            const userId = res.data._id;

            if (storeKeys(privateKey, publicKey, userId)) {
                set({
                    authUser: res.data,
                    privateKey: privateKey
                });
                toast.success("Account created successfully");
                get().connectSocket();
            } else {
                throw new Error("Failed to store keys after signup");
            }
        } catch (error) {
            console.error("Signup failed:", error);
            toast.error(error.response?.data?.message || "Signup failed");
            set({ authUser: null, privateKey: null });
        } finally {
            set({ isSigningUp: false });
        }
    },

    login: async (data) => {
        set({ isLoggingIn: true });
        try {
            const loginRes = await axiosInstance.post("/auth/login", data);
            const userId = loginRes.data._id;

            let privateKey, publicKey;
            const storedKeys = retrieveKeys(userId);

            if (storedKeys && await validateKeys(storedKeys.privateKey, storedKeys.publicKey)) {
                privateKey = storedKeys.privateKey;
                publicKey = storedKeys.publicKey;
                console.log("Using existing validated keys");
            } else {
                console.warn("[login] Keys not found or failed validation. Generating new keys.");
                console.log("Generating new keys");
                const newKeys = generateKeys();
                privateKey = newKeys.privateKey;
                publicKey = newKeys.publicKey;

                if (!storeKeys(privateKey, publicKey, userId)) {
                    throw new Error("Failed to store new keys");
                }
            }


            await axiosInstance.put("/auth/update-public-key", { publicKey });


            const checkRes = await axiosInstance.get("/auth/check");

            set({
                authUser: checkRes.data,
                privateKey: privateKey
            });

            toast.success("Logged in successfully");
            get().connectSocket();
        } catch (error) {
            console.error("Login failed:", error);
            toast.error(error.response?.data?.message || "Login failed");
            set({ authUser: null, privateKey: null });
        } finally {
            set({ isLoggingIn: false });
        }
    },

    logout: async () => {
        const userId = get().authUser?._id;
        try {
            await axiosInstance.post("/auth/logout");

        } catch (error) {
            console.error("Logout error:", error);
        } finally {
            get().disconnectSocket();
            set({ authUser: null, privateKey: null, onlineUsers: [] });
            toast.success("Logged out successfully");
        }
    },

    updateProfile: async (data) => {
        const { authUser } = get();
        if (!authUser) return toast.error("User not authenticated");

        set({ isUpdatingProfile: true });
        const toastId = toast.loading("Updating profile...");

        try {

            const res = await axiosInstance.put(`/auth/update-profile`, data);

            set({ authUser: res.data });
            toast.success("Profile updated successfully", { id: toastId });

        } catch (error) {
            console.error("Profile update failed:", error);
            toast.error(error.response?.data?.message || "Profile update failed", { id: toastId });
        } finally {
            set({ isUpdatingProfile: false });
        }
    },

    connectSocket: () => {
        const { authUser, socket } = get();
        if (!authUser || socket?.connected) return;

        console.log(`[Socket] Connecting for user ${authUser._id}`);
        const newSocket = io(BASE_URL, {
            query: { userId: authUser._id },
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
            timeout: 10000
        });

        newSocket.on("connect", () => {
            console.log("[Socket] Connected:", newSocket.id);
            set({ socket: newSocket });

            newSocket.emit("getOnlineUsers");

            const selectedUser = useChatStore.getState().selectedUser;
            if (selectedUser?._id) {
                newSocket.emit("getNewMessages", {
                    userId: selectedUser._id
                });
            }
        });


        newSocket.on("disconnect", (reason) => {
            console.log("[Socket] Disconnected:", reason);

            if (reason === "io server disconnect") {

                newSocket.connect();
            }
        });


        newSocket.on("connect_error", (error) => {
            console.error("[Socket] Connection error:", error.message);
            toast.error(`Socket connection failed: ${error.message}`);
        });


        newSocket.on("reconnect", (attemptNumber) => {
            console.log("[Socket] Reconnected after", attemptNumber, "attempts");

            newSocket.emit("getOnlineUsers");
        });


        newSocket.on("getOnlineUsers", (userIds) => {
            console.log("[Socket] Received online users:", userIds);
            set({ onlineUsers: userIds });
        });
    },

    disconnectSocket: () => {
        const currentSocket = get().socket;
        if (currentSocket) {
            console.log("[Socket] Disconnecting socket explicitly.");
            currentSocket.disconnect();
            set({ socket: null, onlineUsers: [] });
        }
    },
}));
