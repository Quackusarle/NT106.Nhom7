import { useEffect, useState, useMemo, useCallback } from 'react'; // Import useCallback
import { useAuthStore } from '../store/useAuthStore';
import { useChatStore } from '../store/useChatStore';
import { arrayBufferToBase64, base64ToArrayBuffer, formatMessageTime } from '../lib/utils';
import JSEncrypt from 'jsencrypt';
import toast from 'react-hot-toast';
import { Loader, Download, FileText, FileWarning, Trash2, MoreVertical, Smile } from 'lucide-react';
import DecryptedMessageContent from './DecryptedMessageContent';
import ReactionPicker from './ReactionPicker';
import ReactionDisplay from './ReactionDisplay';
import { axiosInstance } from '../lib/axios';

const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '😡'];

const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const Message = ({ message }) => {

    const authUser = useAuthStore((state) => state.authUser);
    const privateKey = useAuthStore((state) => state.privateKey);
    const selectedUser = useChatStore((state) => state.selectedUser);

    const selectedMessageId = useChatStore((state) => state.selectedMessageId);
    const setSelectedMessageId = useChatStore((state) => state.setSelectedMessageId);
    const deleteMessage = useChatStore((state) => state.deleteMessage);
    const updateMessageReaction = useChatStore((state) => state.updateMessageReaction);

    const [isDownloading, setIsDownloading] = useState(false);
    const [isReactionPickerOpen, setIsReactionPickerOpen] = useState(false);
    const [isReacting, setIsReacting] = useState(false);
    const [showOptions, setShowOptions] = useState(false);
    const [showReactionPicker, setShowReactionPicker] = useState(false);

    const isSender = message.senderId === authUser?._id;
    const chatClassName = isSender ? "chat-end" : "chat-start";
    const bubbleBgColor = isSender ? "bg-sky-500" : "bg-gray-600";

    const profilePic = isSender ? authUser?.profilePic : selectedUser?.profilePic;
    const formattedTime = formatMessageTime(message.createdAt);

    const isSelected = selectedMessageId === message._id;

    console.log(`[Message ${message._id}] Render. isSender: ${isSender}, selectedMessageId: ${selectedMessageId}, isSelected: ${isSelected}`);

    const handleMessageClick = useCallback(() => {
        console.log(`[Message ${message._id}] handleMessageClick fired. isSender: ${isSender}`);
        if (isSender) {
            setSelectedMessageId(message._id);
        } else {
            setSelectedMessageId(null);
            console.log(`[Message ${message._id}] Clicked received message, clearing selection.`);
        }
    }, [message._id, isSender, setSelectedMessageId]);

    const handleDeleteClick = useCallback((e) => {
        e.stopPropagation();
        console.log(`[Message ${message._id}] handleDeleteClick fired.`);
        if (window.confirm("Bạn có chắc chắn muốn xóa tin nhắn này?")) {
            deleteMessage(message._id);
        }
    }, [message._id, deleteMessage]);

    // Chunked file download and decryption
    const handleDownloadFile = useCallback(async () => {
        setSelectedMessageId(null);
        if (!message.is_file || !privateKey) {
            toast.error("Cannot download file: Information missing or no private key.");
            return;
        }
        setIsDownloading(true);
        const loadingToastId = toast.loading("Starting download...");
        let encryptedAesKeyBase64 = null;
        let decryptedAesKeyBase64 = null;
        let fileAesKey = null;
        // --- DEBUG LOG: message object ---
        console.log('[DownloadFile] message object:', JSON.stringify(message, null, 2));
        try {
            encryptedAesKeyBase64 = isSender ? message.file_encrypted_key_sender : message.file_encrypted_key;
            if (!encryptedAesKeyBase64) throw new Error("Missing encrypted AES key for the file.");
            const decryptor = new JSEncrypt();
            decryptor.setPrivateKey(privateKey);
            decryptedAesKeyBase64 = decryptor.decrypt(encryptedAesKeyBase64);
            if (decryptedAesKeyBase64 === false || decryptedAesKeyBase64 === null) throw new Error("RSA Decryption Failed. Cannot retrieve AES key.");
            const aesKeyBuffer = base64ToArrayBuffer(decryptedAesKeyBase64);
            fileAesKey = await crypto.subtle.importKey("raw", aesKeyBuffer, { name: "AES-GCM" }, true, ["decrypt"]);
            // --- CHUNKED FILE LOGIC ---
            if (message.chunked === true || message.chunked === 'true') {
                if (!message.fileId || !message.totalChunks) {
                    toast.error("Download failed: Missing chunked file metadata (fileId/totalChunks) in message data.", { id: loadingToastId });
                    setIsDownloading(false);
                    return;
                }
                let decryptedBuffers = [];
                for (let i = 0; i < message.totalChunks; i++) {
                    toast.loading(`Downloading chunk ${i + 1}/${message.totalChunks}...`, { id: loadingToastId });
                    const res = await fetch(`https://192.168.1.70:5001/api/files/download-chunk?fileId=${message.fileId}&chunkIndex=${i}`, { credentials: 'include' });
                    if (!res.ok) throw new Error(`Failed to download chunk ${i}: ${res.status} ${res.statusText}`);
                    const { chunk: chunkBase64, iv: ivBase64 } = await res.json();
                    if (!chunkBase64 || !ivBase64) throw new Error(`Missing chunk or IV for chunk ${i}`);
                    const encryptedChunk = base64ToArrayBuffer(chunkBase64);
                    const ivBuffer = base64ToArrayBuffer(ivBase64);
                    toast.loading(`Decrypting chunk ${i + 1}/${message.totalChunks}...`, { id: loadingToastId });
                    const decryptedChunk = await crypto.subtle.decrypt(
                        { name: "AES-GCM", iv: ivBuffer },
                        fileAesKey,
                        encryptedChunk
                    );
                    decryptedBuffers.push(new Uint8Array(decryptedChunk));
                }
                // Merge all decrypted chunks
                const totalLength = decryptedBuffers.reduce((acc, curr) => acc + curr.length, 0);
                const merged = new Uint8Array(totalLength);
                let offset = 0;
                for (const buf of decryptedBuffers) {
                    merged.set(buf, offset);
                    offset += buf.length;
                }
                const blob = new Blob([merged], { type: message.file_type || 'application/octet-stream' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = message.original_file_name || 'downloaded_file';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                toast.success("File downloaded and decrypted! (chunked)", { id: loadingToastId });
                setIsDownloading(false);
                setSelectedMessageId(null);
                return;
            }
            // --- Fallback: old single-file logic ---
            if (!message.file_iv) {
                toast.error("Download failed: Error - Missing file IV in message data.", { id: loadingToastId });
                setIsDownloading(false);
                return;
            }
            const fileIv = base64ToArrayBuffer(message.file_iv);
            toast.loading("Downloading encrypted file...", { id: loadingToastId });
            const response = await fetch(`https://192.168.1.70:5001/api/files/download/${message.file_path}`, {
                credentials: 'include'
            });
            if (!response.ok) {
                throw new Error(`Server returned error: ${response.status} ${response.statusText}`);
            }
            const encryptedFileBuffer = await response.arrayBuffer();
            const decryptedFileBuffer = await crypto.subtle.decrypt(
                { name: "AES-GCM", iv: fileIv },
                fileAesKey,
                encryptedFileBuffer
            );
            const blob = new Blob([decryptedFileBuffer], { type: message.file_type || 'application/octet-stream' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = message.original_file_name || 'downloaded_file';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            toast.success("File downloaded and decrypted!", { id: loadingToastId });
            setIsDownloading(false);
            setSelectedMessageId(null);
        } catch (err) {
            console.error("--- Error downloading/decrypting file ---", err);
            toast.error(`Download failed: ${err.message}`, { id: loadingToastId });
            setIsDownloading(false);
        } finally {
            setIsDownloading(false);
            setSelectedMessageId(null);
        }
    }, [message, privateKey, isSender, setSelectedMessageId]);

    // Helper: Get reaction summary (emoji -> [userIds])
    const reactionSummary = useMemo(() => {
        const summary = {};
        if (Array.isArray(message.reactions)) {
            message.reactions.forEach(r => {
                if (!summary[r.emoji]) summary[r.emoji] = [];
                summary[r.emoji].push(r.userId);
            });
        }
        return summary;
    }, [message.reactions]);

    // Helper: Has current user reacted with this emoji?
    const hasReacted = (emoji) => {
        return reactionSummary[emoji]?.includes(authUser?._id);
    };

    // Handle reaction click
    const handleReaction = async (emoji) => {
        if (isReacting) return;
        setIsReacting(true);
        try {
            const alreadyReacted = hasReacted(emoji);
            const url = `/messages/${message._id}/reactions`;
            if (alreadyReacted) {
                await axiosInstance.delete(url, { data: { emoji } });
            } else {
                await axiosInstance.post(url, { emoji });
            }
            // Optimistic UI: update local state (socket will sync)
            updateMessageReaction(message._id, emoji, authUser._id, !alreadyReacted);
        } catch (err) {
            toast.error('Failed to update reaction');
        } finally {
            setIsReacting(false);
            setIsReactionPickerOpen(false);
        }
    };

    // Reaction picker UI
    const renderReactionPicker = () => (
        <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 bg-white shadow-lg rounded-full flex z-20 border border-gray-200 p-1">
            {REACTION_EMOJIS.map((emoji) => (
                <button
                    key={emoji}
                    className={`text-xl px-2 py-1 hover:bg-gray-100 rounded-full transition ${hasReacted(emoji) ? 'ring-2 ring-sky-400' : ''}`}
                    onClick={(e) => { e.stopPropagation(); handleReaction(emoji); }}
                    disabled={isReacting}
                >
                    {emoji}
                </button>
            ))}
        </div>
    );

    // Render reactions under message
    const renderReactions = () => {
        if (!message.reactions || message.reactions.length === 0) return null;
        // Group by emoji, show count, highlight if user reacted
        return (
            <div className="flex gap-1 mt-1 flex-wrap">
                {Object.entries(reactionSummary).map(([emoji, userIds]) => (
                    <span
                        key={emoji}
                        className={`px-2 py-0.5 rounded-full text-sm bg-white/80 border border-gray-300 flex items-center gap-1 select-none ${userIds.includes(authUser?._id) ? 'ring-2 ring-sky-400' : ''}`}
                    >
                        {emoji} <span className="text-xs font-semibold">{userIds.length}</span>
                    </span>
                ))}
            </div>
        );
    };

    return (
        <div
            id={`msg-${message._id}`}
            className={`chat ${chatClassName} relative group ${isSender ? 'cursor-pointer' : ''}`}
            onClick={handleMessageClick}
            onMouseEnter={() => setIsReactionPickerOpen(true)}
            onMouseLeave={() => setIsReactionPickerOpen(false)}
        >
            {/* Delete Button - Show only for sender's messages when selected + hovered */}
            {isSender && isSelected && (
                <button
                    onClick={handleDeleteClick}
                    className={`absolute ${isSender ? 'right-[calc(2.5rem+0.5rem)]' : 'left-[calc(2.5rem+0.5rem)]'} top-1/2 transform -translate-y-1/2
                               p-1.5 rounded-full bg-red-500 hover:bg-red-600 text-white
                               opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10`}
                    title="Delete Message"
                >
                    <Trash2 size={18} />
                </button>
            )}

            {/* Reaction Picker Popup (show on hover/click) */}
            {isReactionPickerOpen && renderReactionPicker()}

            <div className="chat-image avatar">
                <div className="w-10 rounded-full">
                    <img alt="User avatar" src={profilePic || "/avatar.png"} />
                </div>
            </div>
            <div className={`chat-bubble ${bubbleBgColor} text-white pb-2 px-3 break-words`}>
                {/* --- Prioritize File Message Rendering --- */}
                {message.is_file === true ? (
                    <div className="flex items-center gap-3 p-2">
                        <button onClick={!isDownloading ? handleDownloadFile : undefined} disabled={isDownloading} className="flex-shrink-0 p-1 rounded hover:bg-black/20">
                            {isDownloading ? (
                                <Loader className="size-6 animate-spin" />
                            ) : (
                                <Download className="size-6 text-sky-300" />
                            )}
                        </button>
                        <div className="flex flex-col overflow-hidden">
                            <span className="text-sm font-medium truncate" title={message.original_file_name}>
                                {message.original_file_name || "Attached File"}
                            </span>
                            <span className="text-xs opacity-70">
                                {formatFileSize(message.file_size || 0)}
                            </span>
                        </div>
                    </div>
                ) : (
                    <DecryptedMessageContent
                        message={message}
                        privateKey={privateKey}
                        isSender={isSender}
                    />
                )}
                {/* Reactions under message */}
                {renderReactions()}
            </div>
            <div className="chat-footer opacity-50 text-xs flex gap-1 items-center mt-1" style={{ color: 'black' }}>
                {formattedTime}
            </div>
        </div>
    );
};

export default Message;