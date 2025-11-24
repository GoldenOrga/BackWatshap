// src/controllers/mediaController.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Attachment from '../models/Attachment.js';
import logger from '../config/logger.js';
// User n'est plus nécessaire pour l'upload simple, mais on le garde si besoin pour d'autres fcts
import User from '../models/User.js'; 

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, '../../public/uploads');

// Créer le dossier uploads s'il n'existe pas
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

export const uploadFile = async (req, res) => {
  try {
    // 1. Vérifier que le fichier existe
    if (!req.file) {
      return res.status(400).json({ message: 'Aucun fichier uploadé' });
    }

    const { messageId, conversationId } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      // Nettoyage si pas auth
      fs.unlinkSync(req.file.path);
      return res.status(401).json({ message: 'Utilisateur non authentifié' });
    }

    // 2. Validation du type de fichier
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

    // 3. Déterminer le type de média
    let attachmentType = 'file';
    if (req.file.mimetype.startsWith('image/')) attachmentType = 'image';
    else if (req.file.mimetype.startsWith('video/')) attachmentType = 'video';
    else if (req.file.mimetype.startsWith('audio/')) attachmentType = 'audio';

    const fileUrl = `/uploads/${req.file.filename}`;

    // =================================================================
    // LOGIQUE DE DÉCISION
    // =================================================================
    
    // On considère que c'est pour une conversation si :
    // A. Un messageId ou conversationId est fourni
    // B. OU Ce n'est PAS une image (on ne peut pas mettre un PDF en avatar)
    const isConversationContext = messageId || conversationId || attachmentType !== 'image';

    if (isConversationContext) {
      // --- CAS 1 : Upload pour la conversation (Sauvegarde en DB Attachment) ---
      
      const attachmentData = {
        uploader: userId,
        originalName: req.file.originalname,
        filename: req.file.filename,
        mimetype: req.file.mimetype,
        size: req.file.size,
        url: fileUrl,
        type: attachmentType
      };

      if (messageId) {
        attachmentData.message = messageId;
      }

      const attachment = await Attachment.create(attachmentData);

      logger.info('Fichier conversation uploadé', { fileName: req.file.originalname, userId });
      return res.status(201).json(attachment);

    } else {
      // --- CAS 2 : Upload simple (ex: pour prévisualisation avatar) ---
      // On ne touche PAS au User, on renvoie juste l'URL.
      
      logger.info('Image uploadée (sans liaison DB)', { fileName: req.file.originalname, userId });
      
      return res.status(200).json({ 
        message: 'Image uploadée avec succès', 
        url: fileUrl, // <--- C'est ce champ que le front utilisera
        filename: req.file.filename,
        originalName: req.file.originalname
      });
    }

  } catch (err) {
    // Nettoyage en cas d'erreur serveur
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    logger.error('Erreur lors de l\'upload du fichier', err);
    res.status(500).json({ message: 'Erreur serveur lors de l\'upload' });
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

    if (attachment.uploader.toString() !== userId) {
      return res.status(403).json({ message: 'Non autorisé' });
    }

    const filePath = path.join(uploadsDir, attachment.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

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