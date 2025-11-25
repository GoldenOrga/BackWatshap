// src/controllers/mediaController.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Attachment from '../models/Attachment.js';
import logger from '../config/logger.js';
import User from '../models/User.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, '../../public/uploads');

export const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Aucun fichier uploadé' });
    }

    const { messageId, conversationId } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      fs.unlinkSync(req.file.path);
      return res.status(401).json({ message: 'Utilisateur non authentifié' });
    }

    let attachmentType = 'file';
    if (req.file.mimetype.startsWith('image/')) attachmentType = 'image';
    else if (req.file.mimetype.startsWith('video/')) attachmentType = 'video';
    else if (req.file.mimetype.startsWith('audio/')) attachmentType = 'audio';

    const fileUrl = `/uploads/${req.file.filename}`;

    const isConversationContext =
      messageId || conversationId || attachmentType !== 'image';

    if (isConversationContext) {
      const attachment = await Attachment.create({
        uploader: userId,
        originalName: req.file.originalname,
        filename: req.file.filename,
        mimetype: req.file.mimetype,
        size: req.file.size,
        url: fileUrl,
        type: attachmentType,
        message: messageId || undefined
      });

      logger.info("Fichier conversation uploadé", {
        fileName: req.file.originalname,
        userId
      });

      return res.status(201).json(attachment);
    }

    logger.info("Image uploadée (simple)", {
      fileName: req.file.originalname,
      userId
    });

    return res.status(200).json({
      message: "Image uploadée avec succès",
      url: fileUrl,
      filename: req.file.filename,
      originalName: req.file.originalname
    });

  } catch (err) {

    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    logger.error("Erreur lors de l'upload du fichier", err);
    res.status(500).json({ message: 'Erreur serveur lors de l’upload' });
  }
};

export const downloadFile = async (req, res) => {
  try {
    const attachment = await Attachment.findById(req.params.fileId);

    if (!attachment) {
      return res.status(404).json({ message: 'Fichier non trouvé' });
    }

    const filePath = path.join(uploadsDir, attachment.filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Fichier introuvable sur le serveur' });
    }

    res.download(filePath, attachment.originalName);

  } catch (err) {
    logger.error("Erreur download", err);
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

    if (attachment.uploader.toString() !== userId) {
      return res.status(403).json({ message: 'Non autorisé' });
    }

    const filePath = path.join(uploadsDir, attachment.filename);

    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await Attachment.findByIdAndDelete(fileId);

    res.json({ message: "Fichier supprimé avec succès" });

  } catch (err) {
    logger.error("Erreur suppression fichier", err);
    res.status(500).json({ message: err.message });
  }
};

export const getFileInfo = async (req, res) => {
  try {
    const attachment = await Attachment.findById(req.params.fileId)
                                       .populate("uploader", "name avatar");

    if (!attachment) {
      return res.status(404).json({ message: "Fichier non trouvé" });
    }

    res.json(attachment);

  } catch (err) {
    logger.error("Erreur récupération info fichier", err);
    res.status(500).json({ message: err.message });
  }
};
