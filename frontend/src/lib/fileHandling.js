import { arrayBufferToBase64, base64ToArrayBuffer } from './utils';

export async function encryptFile(file, recipientPublicKey, senderPublicKey) {
    try {

        const aesKey = await window.crypto.subtle.generateKey(
            { name: "AES-GCM", length: 256 },
            true,
            ["encrypt", "decrypt"]
        );


        const exportedKey = await window.crypto.subtle.exportKey("raw", aesKey);
        const aesKeyBase64 = arrayBufferToBase64(exportedKey);


        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        const ivBase64 = arrayBufferToBase64(iv);


        const fileBuffer = await file.arrayBuffer();


        const encryptedContent = await window.crypto.subtle.encrypt(
            { name: "AES-GCM", iv: iv },
            aesKey,
            fileBuffer
        );


        const jsEncrypt = new JSEncrypt();


        jsEncrypt.setPublicKey(recipientPublicKey);
        const encryptedKeyRecipient = jsEncrypt.encrypt(aesKeyBase64);


        jsEncrypt.setPublicKey(senderPublicKey);
        const encryptedKeySender = jsEncrypt.encrypt(aesKeyBase64);

        return {
            encryptedContent: encryptedContent,
            encryptedKeyRecipient,
            encryptedKeySender,
            iv: ivBase64,
            originalName: file.name,
            type: file.type,
            size: file.size
        };
    } catch (error) {
        console.error('[encryptFile] Encryption error:', error);
        throw new Error(`File encryption failed: ${error.message}`);
    }
}

export async function decryptFile(encryptedData, privateKey, isSender) {
    try {
        console.log('[decryptFile] Starting decryption process');


        const encryptedKey = isSender ?
            encryptedData.file_encrypted_key_sender :
            encryptedData.file_encrypted_key;

        if (!encryptedKey) {
            throw new Error('Encrypted key not found');
        }


        const jsEncrypt = new JSEncrypt();
        jsEncrypt.setPrivateKey(privateKey);

        const decryptedAesKeyBase64 = jsEncrypt.decrypt(encryptedKey);
        if (!decryptedAesKeyBase64) {
            throw new Error('Failed to decrypt AES key');
        }

        const aesKeyBuffer = base64ToArrayBuffer(decryptedAesKeyBase64);


        const aesKey = await window.crypto.subtle.importKey(
            "raw",
            aesKeyBuffer,
            { name: "AES-GCM", length: 256 },
            false,
            ["decrypt"]
        );


        const iv = base64ToArrayBuffer(encryptedData.file_iv);


        const response = await fetch(`/api/files/download/${encryptedData.file_path}`, {
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error(`File download failed: ${response.status}`);
        }

        const encryptedContent = await response.arrayBuffer();


        const decryptedContent = await window.crypto.subtle.decrypt(
            { name: "AES-GCM", iv: new Uint8Array(iv) },
            aesKey,
            encryptedContent
        );

        return {
            content: decryptedContent,
            name: encryptedData.original_file_name,
            type: encryptedData.file_type
        };
    } catch (error) {
        console.error('[decryptFile] Decryption error:', error);
        throw error;
    }
}