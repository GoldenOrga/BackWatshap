// src/routes/media.js
import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import auth from '../middleware/auth.js';
import {
  uploadFile,
  downloadFile,
  deleteFile,
  getFileInfo
} from '../controllers/mediaController.js';

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configurer multer
const uploadsDir = path.join(__dirname, '../../uploads');
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    // Types autorisés
    const allowedMimes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/webm',
      'audio/mpeg', 'audio/wav', 'audio/ogg',
      'application/pdf', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Type de fichier non autorisé'));
    }
  }
});

// Routes
router.post('/upload', auth, upload.single('file'), uploadFile);
router.get('/download/:fileId', auth, downloadFile);
router.delete('/:fileId', auth, deleteFile);
router.get('/:fileId', auth, getFileInfo);

export default router;
