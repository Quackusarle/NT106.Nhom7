export function formatMessageTime(date) {
    return new Date(date).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    });
}


export function arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}


export function base64ToArrayBuffer(base64) {
    const binary_string = window.atob(base64);
    const len = binary_string.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes.buffer;
}

import { JSEncrypt } from "jsencrypt";
import toast from "react-hot-toast";
import { useAuthStore } from "../store/useAuthStore";
export const decryptMessage = async (messageData, privateKeyPem) => {

    console.log("[decryptMessage] Attempting decryption for message:", messageData?._id);

    console.log("[decryptMessage] Private Key PEM provided:", privateKeyPem ? privateKeyPem.substring(0, 50) + "..." : "MISSING");

    if (!privateKeyPem) {
        console.error("[decryptMessage] Decryption failed: Private key is missing.");
        throw new Error("Private key is missing.");
    }


    const currentAuthUserId = useAuthStore.getState().authUser?._id;
    if (!currentAuthUserId) {
        console.error("[decryptMessage] Decryption failed: Cannot determine current user ID.");
        throw new Error("Cannot determine current user ID for decryption context.");
    }

    const isSender = messageData.senderId === currentAuthUserId;
    console.log(`[decryptMessage] Message ID: ${messageData._id}, Is current user the sender? ${isSender}`);


    const keyToDecrypt = isSender ? messageData.encryptedKeySender : messageData.encryptedKey;
    const keyTypeUsed = isSender ? "encryptedKeySender" : "encryptedKey";

    if (!keyToDecrypt) {
        console.error(`[decryptMessage] Decryption failed: Missing key field '${keyTypeUsed}' in message data.`, messageData);
        throw new Error(`Missing required key field '${keyTypeUsed}'.`);
    }
    console.log(`[decryptMessage] Using key type: ${keyTypeUsed}`);


    const { encryptedContent, iv } = messageData;

    if (!encryptedContent || !iv) {
        console.error("[decryptMessage] Decryption failed: Missing encryptedContent or iv.", messageData);
        throw new Error("Incomplete encrypted data received (content or iv).");
    }

    try {

        const decryptor = new JSEncrypt();
        decryptor.setPrivateKey(privateKeyPem);

        let decryptedAesKeyBase64;
        try {

            decryptedAesKeyBase64 = decryptor.decrypt(keyToDecrypt);
            console.log(`[decryptMessage] RSA decryption using ${keyTypeUsed} attempted.`);
        } catch (rsaDecryptionError) {
            console.error(`[decryptMessage] RSA Decryption Error while using ${keyTypeUsed}:`, rsaDecryptionError);

            throw new Error(`Failed to decrypt AES key (${keyTypeUsed}). Check RSA keys or ensure the correct key is used.`);
        }

        if (!decryptedAesKeyBase64 || typeof decryptedAesKeyBase64 !== 'string' || decryptedAesKeyBase64.length === 0) {
            console.error(`[decryptMessage] RSA decryption of AES key (${keyTypeUsed}) failed (result: ${decryptedAesKeyBase64}).`);
            throw new Error(`RSA decryption of AES key (${keyTypeUsed}) returned invalid result.`);
        }
        console.log(`[decryptMessage] RSA decryption successful (${keyTypeUsed}). AES Key Base64 length: ${decryptedAesKeyBase64.length}`);


        const decryptedAesKeyBuffer = base64ToArrayBuffer(decryptedAesKeyBase64);


        let aesKey;
        try {
            aesKey = await window.crypto.subtle.importKey(
                "raw", decryptedAesKeyBuffer, { name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]
            );
            console.log("[decryptMessage] AES key imported successfully.");
        } catch (importError) {
            console.error("[decryptMessage] Failed to import AES key:", importError);
            throw new Error("Failed to import decrypted AES key.");
        }



        const decodedEncryptedContent = base64ToArrayBuffer(encryptedContent);
        const decodedIv = base64ToArrayBuffer(iv);

        let decryptedContentBuffer;
        try {
            decryptedContentBuffer = await window.crypto.subtle.decrypt(
                { name: "AES-GCM", iv: decodedIv }, aesKey, decodedEncryptedContent
            );
            console.log("[decryptMessage] AES-GCM decryption successful.");
        } catch (aesGcmDecryptionError) {
            console.error("[decryptMessage] AES-GCM Decryption Error:", aesGcmDecryptionError);
            console.error("[decryptMessage] AES-GCM Details:", { iv_length: decodedIv?.byteLength, content_length: decodedEncryptedContent?.byteLength });
            throw new Error("Failed to decrypt message content. Possible data corruption or incorrect IV.");
        }


        const decoder = new TextDecoder();
        const decryptedText = decoder.decode(decryptedContentBuffer);
        console.log("[decryptMessage] Message content decoded successfully:", decryptedText.substring(0, 50) + (decryptedText.length > 50 ? "..." : ""));
        return decryptedText;

    } catch (error) {

        console.error(`[decryptMessage] Final decryption error for message ${messageData._id}:`, error.message);

        if (error.message.startsWith("Failed to decrypt") || error.message.startsWith("RSA decryption") || error.message.startsWith("Missing") || error.message.startsWith("Private key") || error.message.startsWith("Cannot determine")) {
            throw error;
        } else {

            throw new Error(`Decryption failed unexpectedly: ${error.message}`);
        }
    }
};

