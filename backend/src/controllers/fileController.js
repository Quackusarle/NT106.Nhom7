import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url'; 


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


export const uploadFile = (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded.' });
    }

   
    res.status(201).json({
        message: 'File uploaded successfully',
        filename: req.file.filename 
    });
};


export const downloadFile = async (req, res) => {
    try {
        const filename = req.params.filename;
       
        const filePath = path.join(__dirname, '../../uploads', filename);
        console.log(`[DownloadFile] Attempting to access file for download. Filename: ${filename}, Resolved Path: ${filePath}`);

        
        const uploadsDir = path.resolve(__dirname, '../../uploads');
        const resolvedPath = path.resolve(filePath);
        if (!resolvedPath.startsWith(uploadsDir)) {
            console.error('[DownloadFile] Attempted path traversal:', filename);
            return res.status(403).json({ message: 'Forbidden' });
        }

        
        if (!fs.existsSync(resolvedPath)) {
            console.error(`[DownloadFile] File not found at path: ${resolvedPath}`);
            return res.status(404).json({ message: 'File not found.' });
        }

       
        const stats = fs.statSync(resolvedPath);
        console.log(`[DownloadFile] File stats: Size=${stats.size} bytes`);

        
        const fileBuffer = await fs.promises.readFile(resolvedPath);
        console.log(`[DownloadFile] Successfully read file into buffer: ${filename} (${fileBuffer.length} bytes)`);

        
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Length', fileBuffer.length);
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        
        res.send(fileBuffer);
        console.log(`[DownloadFile] Successfully sent file buffer: ${filename}`);

    } catch (error) {
        console.error(`[DownloadFile] Error processing file download:`, error);
        if (!res.headersSent) {
            res.status(500).json({ message: 'Error downloading file' });
        }
    }
};