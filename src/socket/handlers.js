// DANS src/socket/handlers.js

import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Message from '../models/Message.js';
// AJOUT DE L'IMPORT MANQUANT CI-DESSOUS
import Conversation from '../models/Conversation.js';


let io;
export const userSockets = new Map();

export const setupSocket = (server) => {
  io = new Server(server, { cors: { origin: "*" } });

  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Token manquant'));
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) return next(new Error('Token invalide'));
      socket.user = decoded;
      next();
    });
  });


  io.on('connection', async (socket) => {
    const userId = socket.user.id;
    console.log(`✅ Utilisateur connecté: ${socket.id} (ID: ${userId})`);
    userSockets.set(userId, socket.id);

    // CETTE PARTIE FONCTIONNERA MAINTENANT
    try {
        const conversations = await Conversation.find({ participants: userId });
        conversations.forEach(conv => {
            socket.join(conv._id.toString());
            console.log(`Socket ${socket.id} a rejoint la room ${conv._id.toString()}`);
        });
    } catch (error) {
        console.error("Erreur pour rejoindre les rooms de conversation:", error);
    }

    await User.findByIdAndUpdate(userId, { isOnline: true });
    socket.broadcast.emit('user-status', { userId, isOnline: true, lastSeen: null });

    socket.on('typing', ({ conversationId, isTyping, userName }) => {
        socket.to(conversationId).emit('user-typing', {
            conversationId,
            senderId: userId,
            userName: userName,
            isTyping
        });
    });
    
    socket.on('mark-conversation-as-read', async ({ conversationId }) => {
        try {
            await Message.updateMany(
                { conversation: conversationId, sender: { $ne: userId }, status: { $ne: 'read' } },
                { $set: { status: 'read' } }
            );
            socket.to(conversationId).emit('messages-read', {
                conversationId: conversationId,
                readerId: userId
            });
        } catch (error) {
            console.error("Erreur lors du marquage des messages comme lus:", error);
        }
    });
    
    socket.on('disconnect', async () => {
      console.log(`❌ Utilisateur déconnecté: ${socket.id}`);
      userSockets.delete(userId);
      const lastSeen = new Date();
      await User.findByIdAndUpdate(userId, { isOnline: false, lastLogout: lastSeen });
      
      socket.broadcast.emit('user-status', { userId, isOnline: false, lastSeen });
    });
  });
};

export const getIo = () => {
  if (!io) throw new Error('Socket.io n\'est pas initialisé!');
  return io;
};