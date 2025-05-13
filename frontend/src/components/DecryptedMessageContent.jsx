import { useEffect, useState, useMemo } from 'react';
import { JSEncrypt } from 'jsencrypt';
import { Loader, FileWarning } from 'lucide-react';
import { arrayBufferToBase64, base64ToArrayBuffer } from '../lib/utils';


const decryptMessageInternal = async (message, privateKeyPem, isSender) => {

    if (!privateKeyPem) {
        console.error("[DecryptedContent] Decryption failed: Private key is missing.");
        return { data: null, error: 'Missing private key.', isLoading: false };
    }

    try {
        const keyToUse = isSender ? message.encryptedKeySender : message.encryptedKey;
        if (!keyToUse) {
            throw new Error(`Missing ${isSender ? 'sender' : 'recipient'} encrypted key`);
        }

        const decryptor = new JSEncrypt();
        decryptor.setPrivateKey(privateKeyPem);
        const decryptedAesKeyBase64 = decryptor.decrypt(keyToUse);
        if (!decryptedAesKeyBase64) {
            throw new Error(`Failed to decrypt AES key using ${isSender ? 'sender' : 'recipient'} key`);
        }

        const aesKeyBuffer = base64ToArrayBuffer(decryptedAesKeyBase64);
        const aesKey = await crypto.subtle.importKey("raw", aesKeyBuffer, { name: "AES-GCM", length: 256 }, true, ["decrypt"]);


        if (typeof message.iv !== 'string' || message.iv.length < 5) {
            console.error(`[DecryptedContent ${message._id}] Invalid IV received. Type: ${typeof message.iv}, Value:`, message.iv);
            throw new Error('Invalid IV format received.');
        }
        const ivBuffer = base64ToArrayBuffer(message.iv);


        if (typeof message.encryptedContent !== 'string' || message.encryptedContent.length < 5) {
            console.error(`[DecryptedContent ${message._id}] Invalid encryptedContent received. Type: ${typeof message.encryptedContent}, Value:`, message.encryptedContent);
            throw new Error('Invalid encrypted content format received.');
        }
        const encryptedContentBuffer = base64ToArrayBuffer(message.encryptedContent);

        const decryptedContentBuffer = await crypto.subtle.decrypt({ name: "AES-GCM", iv: ivBuffer }, aesKey, encryptedContentBuffer);
        const decoder = new TextDecoder();
        const decryptedText = decoder.decode(decryptedContentBuffer);
        return { data: decryptedText, error: null, isLoading: false };

    } catch (error) {
        console.error(`[DecryptedContent ${message._id}] Decryption failed:`, error);

        const errorMessage = error instanceof DOMException && error.message.includes("ciphertext")
            ? "Decryption failed (likely incorrect key or corrupted data)."
            : `Decryption failed: ${error.message}`;
        return { data: '[Decryption Error]', error: errorMessage, isLoading: false };
    }
};


const DecryptedMessageContent = ({ message, privateKey, isSender }) => {
    const [decryptionState, setDecryptionState] = useState({
        data: null,
        isLoading: true,
        error: null,
    });

    useEffect(() => {
        let isMounted = true;

        setDecryptionState({ data: null, isLoading: true, error: null });

        decryptMessageInternal(message, privateKey, isSender)
            .then(result => {
                if (isMounted) {
                    setDecryptionState(result);
                }
            })
            .catch(error => {
                console.error("[DecryptedContent] Error during decryption process:", error);
                if (isMounted) {
                    setDecryptionState({ data: '[Error]', isLoading: false, error: 'Decryption process failed.' });
                }
            });

        return () => { isMounted = false; };
    }, [message, privateKey, isSender]);


    const isImage = useMemo(() => {
        return typeof decryptionState.data === 'string' && decryptionState.data.startsWith('data:image');
    }, [decryptionState.data]);

    if (decryptionState.isLoading) {
        return <Loader className="size-4 animate-spin my-1" />;
    }

    if (decryptionState.error) {
        return (
            <div className="flex items-center gap-2 text-red-300">
                <FileWarning className="size-4 flex-shrink-0" />
                <span className="text-xs italic" title={decryptionState.error}>
                    {decryptionState.data} ({decryptionState.error})
                </span>
            </div>
        );
    }

    if (isImage) {
        return <img src={decryptionState.data} alt="Sent image" className="max-w-xs rounded-md mt-2" />;
    }

    return decryptionState.data;
};

export default DecryptedMessageContent; 