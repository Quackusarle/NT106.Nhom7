import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// POST /api/files/upload-chunk
export const uploadChunk = (req, res) => {
    const { fileId, chunkIndex, totalChunks, originalName, iv } = req.body;
    if (!fileId || chunkIndex === undefined || !totalChunks || !originalName || !iv) {
        return res.status(400).json({ message: 'Missing chunk metadata.' });
    }
    if (!req.file) {
        return res.status(400).json({ message: 'No chunk file uploaded.' });
    }
    const chunkDir = path.join(__dirname, '../../uploads/chunks', fileId);
    if (!fs.existsSync(chunkDir)) fs.mkdirSync(chunkDir, { recursive: true });
    // Save chunk
    const chunkPath = path.join(chunkDir, `${chunkIndex}`);
    fs.writeFileSync(chunkPath, req.file.buffer);
    // Save IV for this chunk
    fs.writeFileSync(path.join(chunkDir, `${chunkIndex}.iv`), iv);
    // Check if all chunks uploaded
    const uploadedChunks = fs.readdirSync(chunkDir).filter(f => !f.endsWith('.iv')).length;
    if (uploadedChunks == totalChunks) {
        // Optionally, mark as complete or trigger merge
    }
    res.status(201).json({ message: 'Chunk uploaded', chunkIndex });
};

// POST /api/files/merge-chunks
export const mergeChunks = (req, res) => {
    const { fileId, totalChunks, originalName } = req.body;
    if (!fileId || !totalChunks || !originalName) {
        return res.status(400).json({ message: 'Missing merge metadata.' });
    }
    const chunkDir = path.join(__dirname, '../../uploads/chunks', fileId);
    const outputPath = path.join(__dirname, '../../uploads', `${fileId}_${originalName}`);
    const writeStream = fs.createWriteStream(outputPath);
    for (let i = 0; i < totalChunks; i++) {
        const chunkPath = path.join(chunkDir, `${i}`);
        const data = fs.readFileSync(chunkPath);
        writeStream.write(data);
    }
    writeStream.end();
    writeStream.on('finish', () => {
        // Optionally, cleanup chunkDir
        res.status(200).json({ message: 'File merged', filePath: outputPath });
    });
};

// GET /api/files/download-chunk?fileId=...&chunkIndex=...
export const downloadChunk = (req, res) => {
    const { fileId, chunkIndex } = req.query;
    if (!fileId || chunkIndex === undefined) {
        return res.status(400).json({ message: 'Missing download metadata.' });
    }
    const chunkDir = path.join(__dirname, '../../uploads/chunks', fileId);
    const chunkPath = path.join(chunkDir, `${chunkIndex}`);
    const ivPath = path.join(chunkDir, `${chunkIndex}.iv`);
    if (!fs.existsSync(chunkPath) || !fs.existsSync(ivPath)) {
        return res.status(404).json({ message: 'Chunk not found.' });
    }
    const chunk = fs.readFileSync(chunkPath);
    const iv = fs.readFileSync(ivPath, 'utf8');
    res.status(200).json({ chunk: chunk.toString('base64'), iv });
};
