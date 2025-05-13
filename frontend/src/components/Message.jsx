import { useEffect, useState, useMemo, useCallback } from 'react'; // Import useCallback
import { useAuthStore } from '../store/useAuthStore';
import { useChatStore } from '../store/useChatStore';
import { arrayBufferToBase64, base64ToArrayBuffer, formatMessageTime } from '../lib/utils';
import JSEncrypt from 'jsencrypt';
import toast from 'react-hot-toast';
import { Loader, Download, FileText, FileWarning, Trash2 } from 'lucide-react';
import DecryptedMessageContent from './DecryptedMessageContent';


const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const Message = ({ message }) => {

    const authUser = useAuthStore((state) => state.authUser);
    const privateKey = useAuthStore((state) => state.privateKey);
    const selectedUser = useChatStore((state) => state.selectedUser);

    const selectedMessageId = useChatStore((state) => state.selectedMessageId);
    const setSelectedMessageId = useChatStore((state) => state.setSelectedMessageId);
    const deleteMessage = useChatStore((state) => state.deleteMessage);

    const [isDownloading, setIsDownloading] = useState(false);

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
        if (window.confirm("Are you sure you want to delete this message?")) {
            deleteMessage(message._id);
        }
    }, [message._id, deleteMessage]);


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
        try {

            console.log(`[handleDownloadFile] Checking keys for message ${message._id}:`);
            console.log(`  -> isSender: ${isSender} (authUser: ${authUser?._id}, msgSender: ${message.senderId})`);
            console.log(`  -> message.file_encrypted_key (for receiver):`, message.file_encrypted_key ? message.file_encrypted_key.substring(0, 30) + '...' : 'MISSING/NULL');
            console.log(`  -> message.file_encrypted_key_sender (for sender):`, message.file_encrypted_key_sender ? message.file_encrypted_key_sender.substring(0, 30) + '...' : 'MISSING/NULL');

            encryptedAesKeyBase64 = isSender ? message.file_encrypted_key_sender : message.file_encrypted_key;
            console.log(`[handleDownloadFile] Assigned encryptedAesKeyBase64 = ${encryptedAesKeyBase64 ? encryptedAesKeyBase64.substring(0, 30) + '...' : 'FALSY'}`);

            if (!encryptedAesKeyBase64) {
                throw new Error("Missing encrypted AES key for the file.");
            }


            const decryptor = new JSEncrypt();
            decryptor.setPrivateKey(privateKey);
            decryptedAesKeyBase64 = decryptor.decrypt(encryptedAesKeyBase64);

            if (decryptedAesKeyBase64 === false || decryptedAesKeyBase64 === null) {
                console.error(`[handleDownloadFile] RSA Decryption FAILED! decrypt() returned: ${decryptedAesKeyBase64}`);
                throw new Error("RSA Decryption Failed. Cannot retrieve AES key.");
            }

            const aesKeyBuffer = base64ToArrayBuffer(decryptedAesKeyBase64);
            fileAesKey = await crypto.subtle.importKey(
                "raw", aesKeyBuffer, { name: "AES-GCM" }, true, ["decrypt"]
            );

            console.log("[handleDownloadFile] Imported fileAesKey object:", fileAesKey);
            console.log("[handleDownloadFile] Decrypted AES Key (Base64 for import):", decryptedAesKeyBase64);


            if (!message.file_iv) {
                throw new Error("Missing file IV in message data.");
            }
            console.log("[handleDownloadFile] File IV (Base64 from message.file_iv):");
            console.log(message.file_iv);
            const fileIv = base64ToArrayBuffer(message.file_iv);
            console.log("[handleDownloadFile] File IV ArrayBuffer length:", fileIv.byteLength);


            toast.loading("Downloading encrypted file...", { id: loadingToastId });
            const response = await fetch(`/api/files/download/${message.file_path}`, {
                credentials: 'include'
            });


            const contentType = response.headers.get('content-type');
            console.log("[handleDownloadFile] Response headers:", {
                status: response.status,
                statusText: response.statusText,
                contentType: contentType,
                contentLength: response.headers.get('content-length')
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error("[handleDownloadFile] Server error response:", {
                    status: response.status,
                    statusText: response.statusText,
                    responseText: errorText.substring(0, 200) + '...'
                });
                throw new Error(`Server returned error: ${response.status} ${response.statusText}`);
            }


            if (!contentType) {
                console.warn("[handleDownloadFile] Missing content-type header");
            } else if (!contentType.includes('application/octet-stream')) {
                console.warn(`[handleDownloadFile] Unexpected content-type: ${contentType}, but proceeding anyway`);
            }

            const encryptedFileBuffer = await response.arrayBuffer();
            console.log("[handleDownloadFile] Encrypted file buffer size:", encryptedFileBuffer.byteLength);


            const downloadedBytes = new Uint8Array(encryptedFileBuffer);
            console.log(`[handleDownloadFile] Downloaded Buffer (${downloadedBytes.length} bytes) Start:`, downloadedBytes.slice(0, 16));
            console.log(`[handleDownloadFile] Downloaded Buffer End:`, downloadedBytes.slice(-16));


            const firstBytesStr = String.fromCharCode.apply(null, downloadedBytes.slice(0, 20));
            if (firstBytesStr.includes('<!DOCTYPE') || firstBytesStr.includes('<html')) {
                console.error('[handleDownloadFile] Received HTML instead of binary data:', firstBytesStr);
                throw new Error('Server returned HTML instead of file data. Please check server logs.');
            }


            toast.loading("Decrypting file...", { id: loadingToastId });
            console.log("[handleDownloadFile] Attempting crypto.subtle.decrypt...");
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

        } catch (error) {
            console.error("--- Error downloading/decrypting file ---");
            if (error instanceof Error) {
                console.error("Error Name:", error.name);
                console.error("Error Message:", error.message);
                console.error("Message ID:", message._id);
                console.error("Used Decrypted AES Key (Base64):", decryptedAesKeyBase64);
                console.error("Imported fileAesKey object (at time of error):", fileAesKey);
                console.error("Used IV (Base64 from msg.file_iv):", message.file_iv);
                console.error("Error Stack:", error.stack);
                toast.error(`Download failed: ${error.name} - ${error.message}`, { id: loadingToastId });
            } else {
                console.error("Caught non-Error object:", error);
                toast.error(`Download failed due to an unexpected error. Check console.`, { id: loadingToastId });
            }
            console.error("--- End Error Details ---");
        } finally {
            setIsDownloading(false);
            setSelectedMessageId(null);
        }
    }, [message, privateKey, isSender, setSelectedMessageId]);

    return (
        <div
            className={`chat ${chatClassName} relative group ${isSender ? 'cursor-pointer' : ''}`}
            onClick={handleMessageClick}
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
            </div>
            <div className="chat-footer opacity-50 text-xs flex gap-1 items-center mt-1">
                {formattedTime}
            </div>
        </div>
    );
};

export default Message;