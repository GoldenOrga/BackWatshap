// src/controllers/mediaController.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Attachment from '../models/Attachment.js';
import logger from '../config/logger.js';
import User from '../models/User.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, '../../uploads');

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

    // 2. Validation du type de fichier (Sécurité supplémentaire après Multer)
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
    // LOGIQUE DE DÉCISION : AVATAR OU MESSAGE ?
    // =================================================================
    
    // On considère que c'est pour une conversation si :
    // A. Un messageId ou conversationId est fourni
    // B. OU Ce n'est PAS une image (on ne peut pas mettre un PDF en avatar)
    const isConversationContext = messageId || conversationId || attachmentType !== 'image';

    if (isConversationContext) {
      // --- CAS 1 : Upload pour la conversation (Attachment) ---
      
      const attachmentData = {
        uploader: userId,
        originalName: req.file.originalname,
        filename: req.file.filename,
        mimetype: req.file.mimetype,
        size: req.file.size,
        url: fileUrl,
        type: attachmentType
      };

      // Si on a déjà l'ID du message, on le lie tout de suite
      if (messageId) {
        attachmentData.message = messageId;
      }
      // Si on a conversationId mais pas messageId, on crée l'attachment quand même
      // (Le frontend pourra lier ce fichier à un message qu'il va créer juste après)

      const attachment = await Attachment.create(attachmentData);

      logger.info('Fichier uploadé pour conversation', { 
        fileName: req.file.originalname, 
        userId,
        context: messageId ? 'message' : 'conversation' 
      });

      return res.status(201).json(attachment);

    } else {
      // --- CAS 2 : Mise à jour de l'Avatar ---
      // Si pas de contexte de conversation et que c'est une image

      const user = await User.findById(userId);
      if (!user) {
        fs.unlinkSync(req.file.path);
        return res.status(404).json({ message: 'Utilisateur introuvable' });
      }

      // Suppression de l'ancien avatar s'il existe (optionnel mais recommandé pour nettoyer)
      if (user.avatar && user.avatar.startsWith('/uploads/')) {
        const oldAvatarPath = path.join(uploadsDir, path.basename(user.avatar));
        if (fs.existsSync(oldAvatarPath)) {
            try { fs.unlinkSync(oldAvatarPath); } catch(e) { /* Ignorer erreur suppression */ }
        }
      }

      // Mise à jour
      user.avatar = fileUrl;
      await user.save();

      logger.info('Avatar utilisateur mis à jour via upload', { userId });
      
      return res.status(200).json({ 
        message: 'Avatar mis à jour avec succès', 
        avatar: fileUrl,
        user: {
            id: user._id,
            name: user.name,
            avatar: user.avatar
        }
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
