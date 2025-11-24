// src/controllers/mediaController.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Attachment from '../models/Attachment.js';
import logger from '../config/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, '../../uploads');

// Créer le dossier uploads s'il n'existe pas
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}


export const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Aucun fichier uploadé' });
    }

    const { messageId } = req.body;
    const userId = req.user.id;

    // Validation du type de fichier
    const allowedMimes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/webm',
      'audio/mpeg', 'audio/wav', 'audio/ogg',
      'application/pdf', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (!allowedMimes.includes(req.file.mimetype)) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: 'Type de fichier non autorisé' });
    }

    // Limite de taille : 50MB
    const maxSize = 50 * 1024 * 1024;
    if (req.file.size > maxSize) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: 'Fichier trop volumineux (max 50MB)' });
    }

    // Déterminer le type d'attachment
    let attachmentType = 'file';
    if (req.file.mimetype.startsWith('image/')) attachmentType = 'image';
    else if (req.file.mimetype.startsWith('video/')) attachmentType = 'video';
    else if (req.file.mimetype.startsWith('audio/')) attachmentType = 'audio';

    if (messageId) {
      // --- Upload pour message ---
      const attachment = await Attachment.create({
        message: messageId,
        uploader: userId,
        originalName: req.file.originalname,
        filename: req.file.filename,
        mimetype: req.file.mimetype,
        size: req.file.size,
        url: `/uploads/${req.file.filename}`,
        type: attachmentType
      });

      logger.info('Fichier uploadé pour message', { fileName: req.file.originalname, userId });
      return res.status(201).json(attachment);
    } else {
      // --- Upload pour avatar ---
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { avatar: `/uploads/${req.file.filename}` },
        { new: true }
      ).select('-password');

      logger.info('Avatar utilisateur mis à jour', { userId });
      return res.status(200).json(updatedUser);
    }
  } catch (err) {
    logger.error('Erreur lors de l\'upload du fichier', err);
    res.status(500).json({ message: err.message });
  }
};
export const downloadFile = async (req, res) => {
  try {
    const { fileId } = req.params;
    const attachment = await Attachment.findById(fileId);

    if (!attachment) {
      return res.status(404).json({ message: 'Fichier non trouvé' });
    }

    const filePath = path.join(uploadsDir, attachment.filename);
    
    // Vérifier que le fichier existe
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Fichier non trouvé sur le serveur' });
    }

    res.download(filePath, attachment.originalName);
  } catch (err) {
    logger.error('Erreur lors du téléchargement du fichier', err);
    res.status(500).json({ message: err.message });
  }
};

export const deleteFile = async (req, res) => {
  try {
    const { fileId } = req.params;
    const userId = req.user.id;

    const attachment = await Attachment.findById(fileId);
    if (!attachment) {
      return res.status(404).json({ message: 'Fichier non trouvé' });
    }

    // Vérifier que c'est l'uploader qui supprime
    if (attachment.uploader.toString() !== userId) {
      return res.status(403).json({ message: 'Non autorisé' });
    }

    // Supprimer le fichier physique
    const filePath = path.join(uploadsDir, attachment.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Supprimer le document Attachment
    await Attachment.findByIdAndDelete(fileId);

    logger.info('Fichier supprimé', { fileName: attachment.originalName, userId });
    res.json({ message: 'Fichier supprimé avec succès' });
  } catch (err) {
    logger.error('Erreur lors de la suppression du fichier', err);
    res.status(500).json({ message: err.message });
  }
};

export const getFileInfo = async (req, res) => {
  try {
    const { fileId } = req.params;
    const attachment = await Attachment.findById(fileId).populate('uploader', 'name avatar');

    if (!attachment) {
      return res.status(404).json({ message: 'Fichier non trouvé' });
    }

    res.json(attachment);
  } catch (err) {
    logger.error('Erreur lors de la récupération des infos du fichier', err);
    res.status(500).json({ message: err.message });
  }
};
