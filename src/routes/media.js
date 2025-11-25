// src/routes/media.js
import express from 'express';
import auth from '../middleware/auth.js';
import upload from '../uploaders/mediaUploader.js';
import {
  uploadFile,
  downloadFile,
  deleteFile,
  getFileInfo
} from '../controllers/mediaController.js';

const router = express.Router();

router.post('/upload', auth, upload.single('file'), uploadFile);
router.get('/download/:fileId', auth, downloadFile);
router.get('/:fileId', auth, getFileInfo);
router.delete('/:fileId', auth, deleteFile);

export default router;
