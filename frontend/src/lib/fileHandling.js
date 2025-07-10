import JSEncrypt from 'jsencrypt';
import { arrayBufferToBase64, base64ToArrayBuffer } from './utils';

// Constants for parallel downloads
const MAX_CONCURRENT_DOWNLOADS = 4; // Giới hạn 4 downloads đồng thời
const MAX_RETRIES = 3;

// Semaphore for controlling concurrent downloads
class DownloadSemaphore {
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

// ✅ IMPROVED: Unified decryption with proper parallel control
export async function decryptFile(encryptedData, privateKey, isSender) {
    try {
        console.log('[decryptFile] Starting decryption process');

        // Always use parallel decryption for chunked files
        if (encryptedData.chunked && encryptedData.totalChunks) {
            return await decryptChunkedFileWithConcurrencyControl(encryptedData, privateKey, isSender);
        }
        
        // Legacy single-file decryption (for backward compatibility)
        return await decryptSingleFile(encryptedData, privateKey, isSender);
    } catch (error) {
        console.error('[decryptFile] Error:', error);
        throw error;
    }
}

// ✅ NEW: Controlled parallel chunked file decryption
async function decryptChunkedFileWithConcurrencyControl(encryptedData, privateKey, isSender) {
    const { fileId, totalChunks, original_file_name, file_type } = encryptedData;
    
    console.log(`🔽 Starting parallel download: ${totalChunks} chunks, max ${MAX_CONCURRENT_DOWNLOADS} concurrent`);
    
    // Decrypt AES key
    const encryptedKey = isSender ? 
        encryptedData.file_encrypted_key_sender : 
        encryptedData.file_encrypted_key;
    
    const jsEncrypt = new JSEncrypt();
    jsEncrypt.setPrivateKey(privateKey);
    const decryptedAesKeyBase64 = jsEncrypt.decrypt(encryptedKey);
    
    if (!decryptedAesKeyBase64) {
        throw new Error('Failed to decrypt AES key');
    }
    
    const aesKeyBuffer = base64ToArrayBuffer(decryptedAesKeyBase64);
    const aesKey = await window.crypto.subtle.importKey(
        "raw", aesKeyBuffer, { name: "AES-GCM", length: 256 }, false, ["decrypt"]
    );

    // ✅ IMPROVED: Download chunks with concurrency control
    const semaphore = new DownloadSemaphore(MAX_CONCURRENT_DOWNLOADS);
    const chunks = new Array(totalChunks);
    let completedChunks = 0;
    
    const downloadWithSemaphore = async (chunkIndex) => {
        await semaphore.acquire();
        try {
            const chunk = await downloadChunkWithRetry(fileId, chunkIndex, aesKey);
            chunks[chunkIndex] = chunk;
            completedChunks++;
            
            const progress = ((completedChunks / totalChunks) * 100).toFixed(1);
            console.log(`📥 Downloaded chunk ${chunkIndex + 1}/${totalChunks} (${progress}%)`);
            
            return chunk;
        } finally {
            semaphore.release();
        }
    };

    // Start all downloads with concurrency control
    const downloadPromises = Array.from({ length: totalChunks }, (_, i) => 
        downloadWithSemaphore(i)
    );

    await Promise.all(downloadPromises);
    
    // Merge chunks in correct order
    const totalSize = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
    const mergedBuffer = new Uint8Array(totalSize);
    let offset = 0;
    
    for (const chunk of chunks) {
        mergedBuffer.set(new Uint8Array(chunk), offset);
        offset += chunk.byteLength;
    }
    
    console.log(`✅ File download completed: ${original_file_name} (${(totalSize / 1024 / 1024).toFixed(2)}MB)`);
    
    return {
        content: mergedBuffer.buffer,
        name: original_file_name,
        type: file_type
    };
}

// ✅ NEW: Download single chunk with retry mechanism
async function downloadChunkWithRetry(fileId, chunkIndex, aesKey, retryCount = 0) {
    try {
        const response = await fetch(
            `/api/files/download-chunk?fileId=${fileId}&chunkIndex=${chunkIndex}`, 
            { 
                credentials: 'include',
                timeout: 30000 // 30 second timeout
            }
        );
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const chunkData = await response.json();
        const encryptedChunk = base64ToArrayBuffer(chunkData.encryptedChunk);
        const iv = base64ToArrayBuffer(chunkData.iv);
        
        // Decrypt chunk
        const decryptedChunk = await window.crypto.subtle.decrypt(
            { name: "AES-GCM", iv: new Uint8Array(iv) },
            aesKey,
            encryptedChunk
        );
        
        return decryptedChunk;
    } catch (error) {
        if (retryCount < MAX_RETRIES) {
            const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff
            console.warn(`⚠️ Chunk ${chunkIndex} failed, retrying in ${delay}ms... (${retryCount + 1}/${MAX_RETRIES})`);
            
            await new Promise(resolve => setTimeout(resolve, delay));
            return downloadChunkWithRetry(fileId, chunkIndex, aesKey, retryCount + 1);
        }
        
        console.error(`❌ Chunk ${chunkIndex} failed after ${MAX_RETRIES} retries:`, error);
        throw new Error(`Failed to download chunk ${chunkIndex}: ${error.message}`);
    }
}

// ✅ LEGACY: Single file decryption (for backward compatibility)
async function decryptSingleFile(encryptedData, privateKey, isSender) {
    console.log('[decryptSingleFile] Using legacy single-file decryption');
    
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
}

export async function decryptFileParallel(encryptedData, privateKey, isSender) {
    try {
        console.log('[decryptFileParallel] Starting parallel decryption process');

        // Nếu file được upload bằng chunks
        if (encryptedData.chunked && encryptedData.totalChunks) {
            return await decryptChunkedFile(encryptedData, privateKey, isSender);
        }
        
        // Fallback cho file không chia chunks
        return await decryptFile(encryptedData, privateKey, isSender);
    } catch (error) {
        console.error('[decryptFileParallel] Error:', error);
        throw error;
    }
}

async function decryptChunkedFile(encryptedData, privateKey, isSender) {
    const { fileId, totalChunks, original_file_name, file_type } = encryptedData;
    
    // Decrypt AES key
    const encryptedKey = isSender ? 
        encryptedData.file_encrypted_key_sender : 
        encryptedData.file_encrypted_key;
    
    const jsEncrypt = new JSEncrypt();
    jsEncrypt.setPrivateKey(privateKey);
    const decryptedAesKeyBase64 = jsEncrypt.decrypt(encryptedKey);
    
    if (!decryptedAesKeyBase64) {
        throw new Error('Failed to decrypt AES key');
    }
    
    const aesKeyBuffer = base64ToArrayBuffer(decryptedAesKeyBase64);
    const aesKey = await window.crypto.subtle.importKey(
        "raw", aesKeyBuffer, { name: "AES-GCM", length: 256 }, false, ["decrypt"]
    );

    // Download chunks in parallel
    const MAX_CONCURRENT_DOWNLOADS = 6;
    const downloadPromises = [];
    
    for (let i = 0; i < totalChunks; i++) {
        downloadPromises.push(downloadChunk(fileId, i, aesKey));
    }
    
    // Control concurrency
    const chunks = await Promise.all(downloadPromises);
    
    // Merge chunks in correct order
    const totalSize = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
    const mergedBuffer = new Uint8Array(totalSize);
    let offset = 0;
    
    for (const chunk of chunks) {
        mergedBuffer.set(new Uint8Array(chunk), offset);
        offset += chunk.byteLength;
    }
    
    return {
        content: mergedBuffer.buffer,
        name: original_file_name,
        type: file_type
    };
}

async function downloadChunk(fileId, chunkIndex, aesKey) {
    const response = await fetch(
        `/api/files/download-chunk?fileId=${fileId}&chunkIndex=${chunkIndex}`, 
        { credentials: 'include' }
    );
    
    if (!response.ok) {
        throw new Error(`Failed to download chunk ${chunkIndex}`);
    }
    
    const chunkData = await response.json();
    const encryptedChunk = base64ToArrayBuffer(chunkData.encryptedChunk);
    const iv = base64ToArrayBuffer(chunkData.iv);
    
    // Decrypt chunk
    const decryptedChunk = await window.crypto.subtle.decrypt(
        { name: "AES-GCM", iv: new Uint8Array(iv) },
        aesKey,
        encryptedChunk
    );
    
    return decryptedChunk;
}