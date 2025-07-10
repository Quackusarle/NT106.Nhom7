import { useRef, useState, useCallback } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { Image, Send, X, Paperclip, FileText, Video } from "lucide-react";
import { useVideoCallStore } from "../store/useVideoCallStore.js";
import toast from "react-hot-toast";
import JSEncrypt from "jsencrypt";
import { arrayBufferToBase64, base64ToArrayBuffer } from "../lib/utils";

const MessageInput = () => {
    const [text, setText] = useState("");
    const [imagePreview, setImagePreview] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const fileInputRef = useRef(null);
    const fileAttachmentInputRef = useRef(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadStats, setUploadStats] = useState(null);
    const [isUploading, setIsUploading] = useState(false);

    const authUser = useAuthStore(state => state.authUser);
    const selectedUser = useChatStore(state => state.selectedUser);
    const sendMessage = useChatStore(state => state.sendMessage);
    const isSendingMessage = useChatStore(state => state.isSendingMessage);
    const { initiateCall, setLocalStream } = useVideoCallStore();
    // Video call handler
    const handleVideoCall = async () => {
        if (!selectedUser || !authUser) {
            toast.error("No user selected");
            return;
        }
        if (selectedUser._id === authUser._id) {
            toast.error("Cannot call yourself");
            return;
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            setLocalStream(stream);
            initiateCall(selectedUser);
        } catch (error) {
            toast.error("Could not access camera/microphone: " + error.message);
        }
    };

    const handleImageChange = useCallback((e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (!file.type.startsWith("image/")) {
            toast.error("Please select an image file");
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            setImagePreview(reader.result);
        };
        reader.readAsDataURL(file);
    }, []);

    const removeImage = useCallback(() => {
        setImagePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    }, []);

    const handleFileSelect = useCallback((e) => {
        const file = e.target.files[0];
        if (!file) return;

        setSelectedFile(file);
        removeImage();
        setText("");
    }, [removeImage]);

    const removeSelectedFile = useCallback(() => {
        setSelectedFile(null);
        if (fileAttachmentInputRef.current) fileAttachmentInputRef.current.value = "";
    }, []);

    const encryptMessage = async (plainText, recipientPublicKeyPem, senderPublicKeyPem) => {

        console.log("EncryptMessage: Recipient Key PEM:", recipientPublicKeyPem ? recipientPublicKeyPem.substring(0, 50) + "..." : "MISSING/INVALID");
        console.log("EncryptMessage: Sender Key PEM:", senderPublicKeyPem ? senderPublicKeyPem.substring(0, 50) + "..." : "MISSING/INVALID");

        if (!senderPublicKeyPem || typeof senderPublicKeyPem !== 'string' || senderPublicKeyPem.length < 100) { // Basic check
            const errorMsg = "Sender public key is invalid or missing.";
            console.error("EncryptMessage:", errorMsg, senderPublicKeyPem);
            toast.error(errorMsg);
            return null;
        }
        if (!recipientPublicKeyPem || typeof recipientPublicKeyPem !== 'string' || recipientPublicKeyPem.length < 100) { // Basic check for recipient too
            const errorMsg = "Recipient public key is invalid or missing.";
            console.error("EncryptMessage:", errorMsg, recipientPublicKeyPem);
            toast.error(errorMsg);
            return null;
        }

        try {

            const aesKey = await crypto.subtle.generateKey(
                { name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]
            );
            const iv = crypto.getRandomValues(new Uint8Array(12));
            const exportedAesKeyBuffer = await crypto.subtle.exportKey("raw", aesKey);
            const exportedAesKeyBase64 = arrayBufferToBase64(exportedAesKeyBuffer);

            const encoder = new TextEncoder();
            const encodedPlainText = encoder.encode(plainText);
            const encryptedContentBuffer = await crypto.subtle.encrypt(
                { name: "AES-GCM", iv: iv }, aesKey, encodedPlainText
            );

            const encryptor = new JSEncrypt();
            encryptor.setPublicKey(recipientPublicKeyPem);
            const encryptedAesKeyBase64Recipient = encryptor.encrypt(exportedAesKeyBase64);
            if (!encryptedAesKeyBase64Recipient || typeof encryptedAesKeyBase64Recipient !== 'string' || encryptedAesKeyBase64Recipient.length === 0) {
                console.error("EncryptMessage: RSA encryption for RECIPIENT failed. Result:", encryptedAesKeyBase64Recipient);
                throw new Error("RSA encryption of AES key failed for recipient.");
            }
            console.log("EncryptMessage: Recipient encrypted key length:", encryptedAesKeyBase64Recipient.length);

            encryptor.setPublicKey(senderPublicKeyPem);
            const encryptedAesKeyBase64Sender = encryptor.encrypt(exportedAesKeyBase64);

            if (!encryptedAesKeyBase64Sender || typeof encryptedAesKeyBase64Sender !== 'string' || encryptedAesKeyBase64Sender.length === 0) {
                console.error("EncryptMessage: RSA encryption for SENDER failed. Result:", encryptedAesKeyBase64Sender);

                console.error("EncryptMessage: Sender public key used:", senderPublicKeyPem ? senderPublicKeyPem.substring(0, 50) + "..." : "MISSING/INVALID");
                throw new Error("RSA encryption of AES key failed for sender. Check sender's public key.");
            }
            console.log("EncryptMessage: Sender encrypted key length:", encryptedAesKeyBase64Sender.length);

            const bundle = {
                encryptedContent: arrayBufferToBase64(encryptedContentBuffer),
                encryptedKey: encryptedAesKeyBase64Recipient,
                encryptedKeySender: encryptedAesKeyBase64Sender,
                iv: arrayBufferToBase64(iv),
            };

            console.log("EncryptMessage: Successfully created bundle:", JSON.stringify(bundle).substring(0, 200) + "...");
            return bundle;

        } catch (error) {
            const errorMessage = `Encryption process failed: ${error.message}`;
            console.error("EncryptMessage Error:", errorMessage, error);
            toast.error(errorMessage);
            return null;
        }
    };

    const encryptBuffer = async (buffer, aesKey) => {
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const encryptedContent = await crypto.subtle.encrypt(
            { name: "AES-GCM", iv: iv },
            aesKey,
            buffer
        );
        return { encryptedContent, iv };
    };

    const encryptAesKeyWithRsa = (aesKeyBase64, publicKeyPem) => {
        try {
            const encryptor = new JSEncrypt();
            encryptor.setPublicKey(publicKeyPem);
            const encryptedKey = encryptor.encrypt(aesKeyBase64);
            if (!encryptedKey || typeof encryptedKey !== 'string' || encryptedKey.length === 0) {
                throw new Error("RSA encryption returned invalid result.");
            }
            return encryptedKey;
        } catch (error) {
            console.error("Error encrypting AES key with RSA:", error);
            throw error;
        }
    };

    // ✅ CONSTANTS for parallel processing
    const CHUNK_SIZE = 2 * 1024 * 1024; // 2MB chunks
    const MAX_CONCURRENT_UPLOADS = 4; // Upload 4 chunks simultaneously
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 1000; // 1 second

    // ✅ Upload single chunk with retry mechanism
    const uploadChunkWithRetry = async (formData, chunkIndex, retryCount = 0) => {
        const MAX_RETRIES = 3;
        
        try {
            const uploadRes = await fetch('https://192.168.194.169:5001/api/files/upload-chunk', {
                method: 'POST',
                body: formData,
                credentials: 'include',
            });
            
            if (!uploadRes.ok) {
                throw new Error(`HTTP ${uploadRes.status}: ${uploadRes.statusText}`);
            }
            
            return uploadRes;
        } catch (error) {
            if (retryCount < MAX_RETRIES) {
                const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff
                console.warn(`⚠️ Upload chunk ${chunkIndex} failed, retrying in ${delay}ms... (${retryCount + 1}/${MAX_RETRIES})`);
                
                await new Promise(resolve => setTimeout(resolve, delay));
                return uploadChunkWithRetry(formData, chunkIndex, retryCount + 1);
            }
            
            throw new Error(`Failed to upload chunk ${chunkIndex}: ${error.message}`);
        }
    };

    // ✅ COMPLETELY REWRITTEN: Parallel chunked file upload
    const handleSendFile = useCallback(async () => {
        if (!selectedFile || !selectedUser || !authUser) {
            toast.error("Cannot send file: Missing file, recipient, or sender info.");
            return;
        }
        if (!selectedUser.publicKey || !authUser.publicKey) {
            toast.error("Cannot send file: Missing public keys.");
            return;
        }
        
        const loadingToastId = toast.loading("Encrypting and uploading file (chunked)...");
        
        try {
            // 1. Generate AES key for the file
            const fileAesKey = await crypto.subtle.generateKey(
                { name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]
            );
            const exportedAesKeyBuffer = await crypto.subtle.exportKey("raw", fileAesKey);
            const exportedAesKeyBase64 = arrayBufferToBase64(exportedAesKeyBuffer);
            
            // 2. Encrypt AES key with RSA for both recipient and sender
            const encryptedAesKeyRecipient = encryptAesKeyWithRsa(exportedAesKeyBase64, selectedUser.publicKey);
            const encryptedAesKeySender = encryptAesKeyWithRsa(exportedAesKeyBase64, authUser.publicKey);
            
            // 3. Read file as ArrayBuffer
            const fileBuffer = await selectedFile.arrayBuffer();
            const totalChunks = Math.ceil(fileBuffer.byteLength / CHUNK_SIZE);
            const fileId = crypto.randomUUID();
            
            // 4. ✅ IMPROVED: Upload chunks in parallel with concurrency control
            const MAX_CONCURRENT_UPLOADS = 3; // Giới hạn uploads đồng thời
            const uploadSemaphore = new UploadSemaphore(MAX_CONCURRENT_UPLOADS);
            
            const uploadChunkWithSemaphore = async (chunkIndex) => {
                await uploadSemaphore.acquire();
                try {
                    const start = chunkIndex * CHUNK_SIZE;
                    const end = Math.min(start + CHUNK_SIZE, fileBuffer.byteLength);
                    const chunkBuffer = fileBuffer.slice(start, end);
                    
                    // Encrypt chunk
                    const iv = crypto.getRandomValues(new Uint8Array(12));
                    const encryptedChunk = await crypto.subtle.encrypt(
                        { name: "AES-GCM", iv }, fileAesKey, chunkBuffer
                    );
                    
                    // Prepare FormData
                    const formData = new FormData();
                    formData.append('chunk', new Blob([encryptedChunk]), `chunk_${chunkIndex}`);
                    formData.append('fileId', fileId);
                    formData.append('chunkIndex', chunkIndex);
                    formData.append('totalChunks', totalChunks);
                    formData.append('originalName', selectedFile.name);
                    formData.append('iv', arrayBufferToBase64(iv));
                    
                    // Upload chunk with retry
                    const uploadRes = await uploadChunkWithRetry(formData, chunkIndex);
                    
                    const progress = ((chunkIndex + 1) / totalChunks * 100).toFixed(1);
                    console.log(`📤 Uploaded chunk ${chunkIndex + 1}/${totalChunks} (${progress}%)`);
                    
                    return uploadRes;
                } finally {
                    uploadSemaphore.release();
                }
            };
            
            // Start all uploads with concurrency control
            const uploadPromises = Array.from({ length: totalChunks }, (_, i) => 
                uploadChunkWithSemaphore(i)
            );
            
            await Promise.all(uploadPromises);
            
            // 5. Merge chunks
            const mergeRes = await fetch('https://192.168.194.169:5001/api/files/merge-chunks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileId, totalChunks, originalName: selectedFile.name }),
                credentials: 'include',
            });
            
            if (!mergeRes.ok) {
                throw new Error('Failed to merge file chunks');
            }
            
            // 6. Send message with file metadata
            const fileMessageData = {
                is_file: true,
                original_file_name: selectedFile.name,
                file_type: selectedFile.type,
                file_size: selectedFile.size,
                file_path: `${fileId}_${selectedFile.name}`,
                file_encrypted_key: encryptedAesKeyRecipient,
                file_encrypted_key_sender: encryptedAesKeySender,
                chunked: true,
                totalChunks,
                fileId,
            };
            
            await sendMessage(fileMessageData);
            toast.success("File sent successfully! (chunked)", { id: loadingToastId });
            removeSelectedFile();
            
        } catch (error) {
            console.error("Error sending file (chunked):", error);
            toast.error(`Failed to send file: ${error.message}`);
        }
    }, [selectedFile, selectedUser, authUser, sendMessage, removeSelectedFile]);

    const handleSendMessage = useCallback(async (e) => {
        e.preventDefault();

        if (selectedFile) {
            await handleSendFile();
            return;
        }

        const messageContent = imagePreview || text.trim();

        if (!messageContent || !selectedUser || !authUser) {

            const missingData = !selectedUser ? "Recipient not selected" : !authUser ? "Sender data not available" : "Message content is empty";
            toast.error(`Cannot send message: ${missingData}.`);
            return;
        }

        if (!selectedUser._id || !authUser._id) {
            toast.error("Cannot send message: User ID missing.");
            return;
        }

        const encryptedBundle = await encryptMessage(
            messageContent,
            selectedUser.publicKey,
            authUser.publicKey
        );

        if (encryptedBundle) {
            try {
                await sendMessage(encryptedBundle);
                setText("");
                removeImage();
            } catch (error) {
                console.error("handleSendMessage: Error returned from store sendMessage:", error);
            }
        }
    }, [text, imagePreview, selectedUser, authUser, sendMessage, handleSendFile, removeImage]);

    return (
        <div className="message-input w-full px-2 py-2 bg-gray-800 border-t border-gray-700">
            <div className="input-area flex items-end gap-2">
                {/* Hidden file inputs */}
                <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    ref={fileInputRef}
                    style={{ display: "none" }}
                />
                <input
                    type="file"
                    onChange={handleFileSelect}
                    ref={fileAttachmentInputRef}
                    style={{ display: "none" }}
                />
                {/* Image preview */}
                {imagePreview && (
                    <div className="preview-wrapper relative mr-2">
                        <img src={imagePreview} alt="Preview" className="max-h-16 rounded shadow" />
                        <button type="button" className="remove-image absolute top-0 right-0 bg-black/60 rounded-full p-1 text-white" onClick={removeImage}>
                            <X size={16} />
                        </button>
                    </div>
                )}
                {/* File preview */}
                {selectedFile && (
                    <div className="file-preview flex items-center gap-2 bg-gray-700 rounded px-2 py-1 mr-2 text-white text-xs max-w-xs overflow-hidden">
                        <FileText className="text-sky-400" size={18} />
                        <span className="truncate max-w-[120px]" title={selectedFile.name}>{selectedFile.name}</span>
                        <span className="opacity-70">{(selectedFile.size / 1024 / 1024) >= 1 ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB` : `${(selectedFile.size / 1024).toFixed(1)} KB`}</span>
                        <button type="button" className="remove-file ml-1 text-gray-300 hover:text-red-400" onClick={removeSelectedFile} title="Remove file">
                            <X size={14} />
                        </button>
                    </div>
                )}
                {/* Textarea */}
                <textarea
                    className="flex-1 resize-none rounded-lg bg-gray-700 text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500 min-h-[40px] max-h-32"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Type your message..."
                    disabled={isSendingMessage}
                    rows={1}
                />
                {/* Actions */}
                <div className="actions flex items-end gap-1 pb-1">
                    <button
                        type="button"
                        className="attach-image p-2 rounded bg-gray-700 hover:bg-gray-600 transition"
                        onClick={() => fileInputRef.current && fileInputRef.current.click()}
                        disabled={isSendingMessage}
                        title="Send image"
                        style={{ opacity: 1, visibility: 'visible' }}
                    >
                        <Image size={20} />
                    </button>
                    <button
                        type="button"
                        className="attach-file p-2 rounded bg-gray-700 hover:bg-gray-600 transition"
                        onClick={() => fileAttachmentInputRef.current && fileAttachmentInputRef.current.click()}
                        disabled={isSendingMessage}
                        title="Attach file"
                        style={{ opacity: 1, visibility: 'visible' }}
                    >
                        <Paperclip size={20} />
                    </button>
                    {/* Video Call Button */}
                    <button
                        type="button"
                        className="attach-video p-2 rounded bg-gray-700 hover:bg-gray-600 transition"
                        onClick={handleVideoCall}
                        disabled={isSendingMessage}
                        title="Start Video Call"
                        style={{ opacity: 1, visibility: 'visible' }}
                    >
                        <Video size={20} />
                    </button>
                    <button
                        type="button"
                        className="send-message p-2 rounded bg-sky-500 hover:bg-sky-600 text-white transition flex items-center justify-center"
                        onClick={handleSendMessage}
                        disabled={isSendingMessage}
                        title="Send message"
                    >
                        {isSendingMessage ? "Sending..." : <Send size={20} />}
                    </button>
                </div>
            </div>
            {/* ✅ Cải thiện hiển thị upload progress */}
            {uploadProgress > 0 && (
                <div className="upload-status">
                    <div className="progress-bar">
                        <div 
                            className="progress-fill" 
                            style={{ width: `${uploadProgress}%` }}
                        ></div>
                    </div>
                    <span>Uploading: {uploadProgress}%</span>
                    {uploadStats && (
                        <div className="upload-stats">
                            <span>Chunks: {uploadStats.successfulChunks}/{uploadStats.totalChunks}</span>
                            <span>Time: {((uploadStats.endTime - uploadStats.startTime) / 1000).toFixed(1)}s</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// ✅ NEW: Upload semaphore class
class UploadSemaphore {
    constructor(maxConcurrent) {
        this.count = maxConcurrent;
        this.waiters = [];
    }

    async acquire() {
        if (this.count > 0) {
            this.count--;
            return;
        }

        return new Promise(resolve => {
            this.waiters.push(resolve);
        });
    }

    release() {
        this.count++;
        if (this.waiters.length > 0) {
            const waiter = this.waiters.shift();
            this.count--;
            waiter();
        }
    }
}

export default MessageInput;