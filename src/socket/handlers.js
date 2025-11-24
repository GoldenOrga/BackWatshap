// DANS src/socket/handlers.js

import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Message from '../models/Message.js';
import Conversation from '../models/Conversation.js';

let io;
export const userSockets = new Map();
export const userPresence = new Map(); // Suivi de la présence par conversation

/**
 * Initialise Socket.io avec CORS et authentification
 */
export const setupSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || '*',
      credentials: true,
      methods: ['GET', 'POST']
    },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5
  });

  // ========== AUTHENTIFICATION ==========
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Token manquant'));
    
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) return next(new Error('Token invalide'));
      socket.user = decoded;
      next();
    });
  });

  // ========== GESTION DE LA CONNEXION ==========
  io.on('connection', async (socket) => {
    const userId = socket.user.id;
    console.log(`✅ Utilisateur connecté: ${socket.id} (ID: ${userId})`);
    
    userSockets.set(userId, socket.id);

    // L'utilisateur rejoint les rooms de ses conversations
    try {
      const conversations = await Conversation.find({ participants: userId });
      conversations.forEach(conv => {
        socket.join(conv._id.toString());
      });
    } catch (error) {
      console.error("Erreur pour rejoindre les rooms:", error);
    }

    // Marquer comme en ligne
    try {
      await User.findByIdAndUpdate(userId, { 
        isOnline: true,
        lastSeen: new Date()
      });
    } catch (error) {
      console.error("Erreur lors de la mise à jour du statut:", error);
    }

    // Annoncer que l'utilisateur est en ligne
    io.emit('user-status', {
      userId,
      isOnline: true,
      lastSeen: new Date(),
      timestamp: new Date()
    });

    // ========== ÉVÉNEMENTS DE PRÉSENCE ==========
    
    /**
     * Événement: Utilisateur rejoint une conversation
     * Utilisé pour l'indicateur "typing" et la présence
     */
    socket.on('join-conversation', async ({ conversationId }) => {
      try {
        socket.join(conversationId);
        
        // Initialiser le suivi de présence
        if (!userPresence.has(conversationId)) {
          userPresence.set(conversationId, new Map());
        }
        userPresence.get(conversationId).set(userId, {
          joinedAt: new Date(),
          lastActivity: new Date()
        });

        io.to(conversationId).emit('user-joined-conversation', {
          conversationId,
          userId,
          userName: (await User.findById(userId))?.name,
          timestamp: new Date()
        });
      } catch (error) {
        console.error("Erreur join-conversation:", error);
      }
    });

    /**
     * Événement: Utilisateur quitte une conversation
     */
    socket.on('leave-conversation', async ({ conversationId }) => {
      try {
        socket.leave(conversationId);
        
        if (userPresence.has(conversationId)) {
          userPresence.get(conversationId).delete(userId);
        }

        io.to(conversationId).emit('user-left-conversation', {
          conversationId,
          userId,
          timestamp: new Date()
        });
      } catch (error) {
        console.error("Erreur leave-conversation:", error);
      }
    });

    /**
     * Événement: Indicateur de saisie
     */
    socket.on('typing', ({ conversationId, isTyping }) => {
      socket.to(conversationId).emit('user-typing', {
        conversationId,
        senderId: userId,
        isTyping,
        timestamp: new Date()
      });
    });

    // ========== ÉVÉNEMENTS DE MESSAGES ==========

    /**
     * Événement: Envoyer un message
     */
    socket.on('send-message', async (data, ack) => {
      try {
        const { conversationId, content, receiverId, attachments } = data;

        // Créer le message
        const message = new Message({
          sender: userId,
          conversation: conversationId || null,
          content,
          type: attachments ? 'file' : 'text',
          status: 'sent',
          createdAt: new Date()
        });

        await message.save();

        // Popule les infos du sender
        await message.populate('sender', 'name avatar');

        // Confirmation d'envoi au client
        if (ack) {
          ack({
            success: true,
            messageId: message._id,
            status: 'sent',
            timestamp: new Date()
          });
        }

        // Envoyer le message au destinataire/conversation
        if (conversationId) {
          io.to(conversationId).emit('receive-message', {
            _id: message._id,
            conversationId,
            sender: message.sender,
            content,
            type: message.type,
            status: 'sent',
            createdAt: message.createdAt,
            timestamp: new Date()
          });
        } else if (receiverId) {
          // Message privé
          const receiverSocketId = userSockets.get(receiverId);
          if (receiverSocketId) {
            io.to(receiverSocketId).emit('receive-message', {
              _id: message._id,
              sender: message.sender,
              content,
              type: message.type,
              status: 'sent',
              createdAt: message.createdAt,
              timestamp: new Date()
            });
          }
        }

        // Notification de livraison
        setTimeout(() => {
          socket.emit('message-delivered', {
            messageId: message._id,
            status: 'delivered',
            timestamp: new Date()
          });
        }, 500);

      } catch (error) {
        console.error("Erreur send-message:", error);
        if (ack) {
          ack({
            success: false,
            error: error.message
          });
        }
      }
    });

    /**
     * Événement: Marquer les messages comme lus
     */
    socket.on('mark-conversation-as-read', async ({ conversationId }) => {
      try {
        // Mettre à jour les messages
        await Message.updateMany(
          {
            conversation: conversationId,
            sender: { $ne: userId },
            status: { $ne: 'read' }
          },
          { $set: { status: 'read', readAt: new Date() } }
        );

        // Notifier les autres utilisateurs
        socket.to(conversationId).emit('messages-read', {
          conversationId,
          readerId: userId,
          timestamp: new Date()
        });

        // Mettre à jour la dernière vue
        if (userPresence.has(conversationId)) {
          userPresence.get(conversationId).set(userId, {
            ...userPresence.get(conversationId).get(userId),
            lastActivity: new Date()
          });
        }

      } catch (error) {
        console.error("Erreur mark-conversation-as-read:", error);
      }
    });

    /**
     * Événement: Éditer un message
     */
    socket.on('edit-message', async ({ messageId, conversationId, content }) => {
      try {
        const message = await Message.findByIdAndUpdate(
          messageId,
          {
            content,
            edited: true,
            editedAt: new Date()
          },
          { new: true }
        ).populate('sender', 'name avatar');

        io.to(conversationId).emit('message-edited', {
          messageId,
          conversationId,
          content,
          editedAt: new Date(),
          sender: message.sender
        });

      } catch (error) {
        console.error("Erreur edit-message:", error);
      }
    });

    /**
     * Événement: Supprimer un message
     */
    socket.on('delete-message', async ({ messageId, conversationId }) => {
      try {
        await Message.findByIdAndUpdate(
          messageId,
          {
            deleted: true,
            deletedAt: new Date(),
            content: 'Ce message a été supprimé.'
          },
          { new: true }
        );

        io.to(conversationId).emit('message-deleted', {
          messageId,
          conversationId,
          timestamp: new Date()
        });

      } catch (error) {
        console.error("Erreur delete-message:", error);
      }
    });

    /**
     * Événement: Réaction au message
     */
    socket.on('add-reaction', async ({ messageId, conversationId, emoji }) => {
      try {
        const message = await Message.findByIdAndUpdate(
          messageId,
          {
            $push: {
              reactions: {
                userId,
                emoji,
                createdAt: new Date()
              }
            }
          },
          { new: true }
        ).populate('sender', 'name avatar');

        io.to(conversationId).emit('reaction-added', {
          messageId,
          conversationId,
          userId,
          emoji,
          timestamp: new Date()
        });

      } catch (error) {
        console.error("Erreur add-reaction:", error);
      }
    });

    /**
     * Événement: Supprimer une réaction
     */
    socket.on('remove-reaction', async ({ messageId, conversationId, emoji }) => {
      try {
        await Message.findByIdAndUpdate(
          messageId,
          {
            $pull: {
              reactions: { userId, emoji }
            }
          },
          { new: true }
        );

        io.to(conversationId).emit('reaction-removed', {
          messageId,
          conversationId,
          userId,
          emoji,
          timestamp: new Date()
        });

      } catch (error) {
        console.error("Erreur remove-reaction:", error);
      }
    });

    // ========== ÉVÉNEMENTS DE GROUPE ==========

    /**
     * Événement: Ajouter un utilisateur à un groupe
     */
    socket.on('user-added-to-group', async ({ conversationId, newUserId }) => {
      try {
        const conversation = await Conversation.findById(conversationId)
          .populate('participants', 'name avatar');

        io.to(conversationId).emit('group-user-added', {
          conversationId,
          newUserId,
          conversationName: conversation.name,
          timestamp: new Date()
        });

      } catch (error) {
        console.error("Erreur user-added-to-group:", error);
      }
    });

    /**
     * Événement: Retirer un utilisateur d'un groupe
     */
    socket.on('user-removed-from-group', async ({ conversationId, removedUserId }) => {
      try {
        io.to(conversationId).emit('group-user-removed', {
          conversationId,
          removedUserId,
          timestamp: new Date()
        });

        const removedUserSocketId = userSockets.get(removedUserId);
        if (removedUserSocketId) {
          io.to(removedUserSocketId).emit('removed-from-group', {
            conversationId,
            timestamp: new Date()
          });
        }

      } catch (error) {
        console.error("Erreur user-removed-from-group:", error);
      }
    });

    /**
     * Événement: Mise à jour des infos du groupe
     */
    socket.on('group-info-updated', async ({ conversationId, updates }) => {
      try {
        const conversation = await Conversation.findByIdAndUpdate(
          conversationId,
          updates,
          { new: true }
        );

        io.to(conversationId).emit('group-updated', {
          conversationId,
          updates,
          timestamp: new Date()
        });

      } catch (error) {
        console.error("Erreur group-info-updated:", error);
      }
    });

    // ========== GESTION DE LA DÉCONNEXION ==========

    /**
     * Événement: Déconnexion
     */
    socket.on('disconnect', async () => {
      try {
        console.log(`❌ Utilisateur déconnecté: ${socket.id}`);
        userSockets.delete(userId);

        // Nettoyer la présence
        for (const [convId, presenceMap] of userPresence) {
          presenceMap.delete(userId);
        }

        // Marquer comme hors ligne
        const user = await User.findByIdAndUpdate(
          userId,
          {
            isOnline: false,
            lastSeen: new Date()
          },
          { new: true }
        );

        // Annoncer la déconnexion
        io.emit('user-status', {
          userId,
          isOnline: false,
          lastSeen: new Date(),
          timestamp: new Date()
        });

      } catch (error) {
        console.error("Erreur lors de la déconnexion:", error);
      }
    });

    /**
     * Événement: Reconnexion
     * Récupère les messages manqués
     */
    socket.on('reconnect', async () => {
      try {
        console.log(`🔄 Utilisateur reconnecté: ${socket.id}`);

        // Récupérer les conversations
        const conversations = await Conversation.find({ participants: userId });

        // Récupérer les messages non lus depuis la dernière déconnexion
        const unreadMessages = await Message.find({
          conversation: { $in: conversations.map(c => c._id) },
          status: { $ne: 'read' },
          sender: { $ne: userId }
        }).populate('sender', 'name avatar').populate('conversation');

        socket.emit('missed-messages', {
          messages: unreadMessages,
          count: unreadMessages.length,
          timestamp: new Date()
        });

      } catch (error) {
        console.error("Erreur lors de la reconnexion:", error);
      }
    });

    /**
     * Événement: Demander les messages manqués
     */
    socket.on('request-missed-messages', async ({ lastMessageTimestamp }) => {
      try {
        const conversations = await Conversation.find({ participants: userId });

        const missedMessages = await Message.find({
          conversation: { $in: conversations.map(c => c._id) },
          createdAt: { $gt: new Date(lastMessageTimestamp) }
        }).populate('sender', 'name avatar').populate('conversation');

        socket.emit('missed-messages', {
          messages: missedMessages,
          count: missedMessages.length,
          timestamp: new Date()
        });

      } catch (error) {
        console.error("Erreur request-missed-messages:", error);
      }
    });
  });
};

/**
 * Obtenir l'instance Socket.io
 */
export const getIo = () => {
  if (!io) throw new Error('Socket.io n\'est pas initialisé!');
  return io;
};