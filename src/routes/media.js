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
const uploadsDir = path.join(__dirname, '../../uploads');

// --- C'EST ICI QU'ON CHANGE LA CONFIGURATION ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // 1. Récupérer l'extension (ex: .png)
    const ext = path.extname(file.originalname);
    
    // 2. Récupérer le nom sans extension
    const name = path.basename(file.originalname, ext);

    // 3. Nettoyage (Sanitization)
    const cleanName = name
      .normalize("NFD")                // Décompose les accents (é -> e + accent)
      .replace(/[\u0300-\u036f]/g, "") // Supprime les accents
      .toLowerCase()                   // Tout en minuscule
      .replace(/[^a-z0-9]/g, "-")      // Remplace tout ce qui n'est pas lettre/chiffre par un tiret
      .replace(/-+/g, "-");            // Évite les tirets multiples (ex: --)

    // 4. Créer le nom final unique
    // Résultat : 176399828-a3g2d-capture-d-ecran-2025.png
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${cleanName}${ext}`;
    
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
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

// Le reste des routes ne change pas
router.post('/upload', auth, upload.single('file'), uploadFile);
router.get('/download/:fileId', auth, downloadFile);
router.delete('/:fileId', auth, deleteFile);
router.get('/:fileId', auth, getFileInfo);

export default router;