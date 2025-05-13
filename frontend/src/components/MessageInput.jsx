import { useRef, useState, useCallback } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { Image, Send, X, Paperclip } from "lucide-react";
import toast from "react-hot-toast";
import JSEncrypt from "jsencrypt";
import { arrayBufferToBase64, base64ToArrayBuffer } from "../lib/utils";

const MessageInput = () => {
    const [text, setText] = useState("");
    const [imagePreview, setImagePreview] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const fileInputRef = useRef(null);
    const fileAttachmentInputRef = useRef(null);


    const authUser = useAuthStore(state => state.authUser);


    const selectedUser = useChatStore(state => state.selectedUser);
    const sendMessage = useChatStore(state => state.sendMessage);
    const isSendingMessage = useChatStore(state => state.isSendingMessage);

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


    const handleSendFile = useCallback(async () => {
        if (!selectedFile || !selectedUser || !authUser) {
            toast.error("Cannot send file: Missing file, recipient, or sender info.");
            return;
        }
        if (!selectedUser.publicKey || !authUser.publicKey) {
            toast.error("Cannot send file: Missing public keys.");
            return;
        }

        const loadingToastId = toast.loading("Encrypting and uploading file...");
        let fileAesKey = null;

        try {

            fileAesKey = await crypto.subtle.generateKey(
                { name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]
            );
            const exportedAesKeyBuffer = await crypto.subtle.exportKey("raw", fileAesKey);
            const exportedAesKeyBase64 = arrayBufferToBase64(exportedAesKeyBuffer);


            const encryptedAesKeyRecipient = encryptAesKeyWithRsa(exportedAesKeyBase64, selectedUser.publicKey);
            const encryptedAesKeySender = encryptAesKeyWithRsa(exportedAesKeyBase64, authUser.publicKey);


            const fileBuffer = await selectedFile.arrayBuffer();


            const { encryptedContent: encryptedFileBuffer, iv: fileIv } = await encryptBuffer(fileBuffer, fileAesKey);


            const encryptedBytesToSend = new Uint8Array(encryptedFileBuffer);
            console.log(`[handleSendFile] Encrypted Buffer To Send (${encryptedBytesToSend.length} bytes) Start:`, encryptedBytesToSend.slice(0, 16));
            console.log(`[handleSendFile] Encrypted Buffer To Send End:`, encryptedBytesToSend.slice(-16));


            const formData = new FormData();

            formData.append('file', new Blob([encryptedFileBuffer]), selectedFile.name); // Keep original name for potential server-side use, though backend uses UUID


            const uploadResponse = await fetch('http://localhost:5001/api/files/upload', {
                method: 'POST',
                body: formData,
                credentials: 'include',
            });

            if (!uploadResponse.ok) {
                const errorData = await uploadResponse.json();
                throw new Error(`File upload failed: ${errorData.message || uploadResponse.statusText}`);
            }

            const uploadResult = await uploadResponse.json();
            const serverFilename = uploadResult.filename;


            const fileIvBase64 = arrayBufferToBase64(fileIv);
            console.log("[handleSendFile] Storing File IV (Base64):", fileIvBase64); // Log the IV being stored


            const fileMessageData = {
                is_file: true,
                original_file_name: selectedFile.name,
                file_type: selectedFile.type,
                file_size: selectedFile.size,
                file_path: serverFilename,

                file_iv: fileIvBase64,
                file_encrypted_key: encryptedAesKeyRecipient,
                file_encrypted_key_sender: encryptedAesKeySender,


                encryptedContent: null,
                encryptedKey: null,
                encryptedKeySender: null,
                iv: null
            };



            await sendMessage(fileMessageData);
            toast.success("File sent successfully!", { id: loadingToastId });
            removeSelectedFile();

        } catch (error) {
            console.error("Error sending file:", error);
            toast.error(`Failed to send file: ${error.message}`, { id: loadingToastId });

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
    }, [
        imagePreview, text, selectedUser, authUser, sendMessage, removeImage,
        selectedFile, handleSendFile
    ]);

    return (
        <div className="p-4 w-full">
            {selectedFile && !imagePreview && (
                <div className="mb-3 flex items-center gap-2 p-2 rounded-lg bg-base-200 border border-zinc-700">
                    <Paperclip className="size-5 text-zinc-400" />
                    <span className="text-sm text-zinc-300 truncate flex-1">
                        {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                    </span>
                    <button
                        onClick={removeSelectedFile}
                        className="w-5 h-5 rounded-full bg-base-300 flex items-center justify-center text-zinc-400 hover:text-red-500"
                        type="button"
                        aria-label="Remove selected file"
                    >
                        <X className="size-3" />
                    </button>
                </div>
            )}

            {imagePreview && (
                <div className="mb-3 flex items-center gap-2">
                    <div className="relative">
                        <img
                            src={imagePreview}
                            alt="Preview"
                            className="w-20 h-20 object-cover rounded-lg border border-zinc-700"
                        />
                        <button
                            onClick={removeImage}
                            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-base-300
              flex items-center justify-center"
                            type="button"
                            aria-label="Remove image preview"
                        >
                            <X className="size-3" />
                        </button>
                    </div>
                </div>
            )}

            <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                <div className="flex-1 flex gap-2">
                    <input
                        type="text"
                        className="w-full input input-bordered rounded-lg input-sm sm:input-md"
                        placeholder="Type an encrypted message..."
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        disabled={!!imagePreview || !!selectedFile || isSendingMessage}
                    />
                    <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        ref={fileInputRef}
                        onChange={handleImageChange}
                        disabled={isSendingMessage}
                        aria-label="Select image"
                    />
                    <input
                        type="file"
                        className="hidden"
                        ref={fileAttachmentInputRef}
                        onChange={handleFileSelect}
                        disabled={isSendingMessage}
                        aria-label="Attach file"
                    />

                    <button
                        type="button"
                        title="Select image"
                        className={`hidden sm:flex btn btn-circle btn-sm sm:btn-md
                     ${imagePreview ? "text-emerald-500" : "text-zinc-400"} ${isSendingMessage || selectedFile ? 'btn-disabled opacity-50' : ''}`}
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isSendingMessage || !!selectedFile}
                    >
                        <Image size={20} />
                    </button>

                    <button
                        type="button"
                        title="Attach file"
                        className={`hidden sm:flex btn btn-circle btn-sm sm:btn-md text-zinc-400 ${isSendingMessage || imagePreview ? 'btn-disabled opacity-50' : ''}`}
                        onClick={() => fileAttachmentInputRef.current?.click()}
                        disabled={isSendingMessage || !!imagePreview}
                    >
                        <Paperclip size={20} />
                    </button>
                </div>
                <button
                    type="submit"
                    title="Send message"
                    className={`btn btn-sm sm:btn-md btn-circle ${isSendingMessage ? 'loading btn-disabled' : ''}`}
                    disabled={(!text.trim() && !imagePreview && !selectedFile) || isSendingMessage}
                >
                    {!isSendingMessage && <Send size={22} />}
                </button>
            </form>
        </div>
    );
};
export default MessageInput;
