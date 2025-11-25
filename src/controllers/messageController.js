// src/controllers/messageController.js
import Message from '../models/Message.js';
import User from '../models/User.js';
import Conversation from '../models/Conversation.js';
import Attachment from '../models/Attachment.js';
import socketManager from '../socket/index.js';

export const createOrGetConversation = async (req, res) => {
    const { participantIds, name } = req.body;
    const allParticipants = [...new Set([req.user.id, ...(participantIds || [])])];

    if (allParticipants.length < 2) {
        return res.status(400).json({ message: "Une conversation nécessite au moins 2 participants." });
    }

    try {
        if (allParticipants.length === 2 && !name) {
            const conv = await Conversation.findOne({
                participants: { $all: allParticipants, $size: 2 }
            });
            if (conv) return res.status(200).json(conv);
        }

        const unreadCounts = allParticipants.map(id => ({ user: id, count: 0 }));
        const newConversation = await Conversation.create({
            name: name,
            participants: allParticipants,
            creator: req.user.id,
            isGroup: allParticipants.length > 2,
            unreadCounts
        });

        const io = socketManager.getIo();

        // joindre la room socket pour chaque participant déjà connecté
        allParticipants.forEach(participantId => {
            const socketId = socketManager.userSockets.get(participantId.toString());
            if (socketId) {
                const socket = io.sockets.sockets.get(socketId);
                if (socket) socket.join(newConversation._id.toString());
            }
        });

        const populatedConv = await Conversation.findById(newConversation._id)
            .populate({ path: 'participants', select: 'name avatar isOnline' });

        io.to(newConversation._id.toString()).emit('conversation-created', populatedConv);

        res.status(201).json(populatedConv);
    } catch (err) {
        console.error("ERREUR DANS createOrGetConversation:", err);
        res.status(500).json({ message: err.message });
    }
};


/**
 * Créer un message texte et/ou avec pièces jointes.
 * Body attendu:
 *  - conversation_id: string (obligatoire)
 *  - content?: string
 *  - attachments?: string | string[]  (ids d'Attachment)
 *  - replyTo?: string (id de Message)
 */
export const createMessage = async (req, res) => {
    try {
        const { conversation_id, content, replyTo } = req.body;
        const sender_id = req.user.id;

        // attachments peut être [] ou un seul id ou rien
        const rawAttachments = req.body.attachments;
        const attachmentIds = Array.isArray(rawAttachments)
            ? rawAttachments
            : rawAttachments
                ? [rawAttachments]
                : [];

        if (!conversation_id || (!content && attachmentIds.length === 0)) {
            return res.status(400).json({
                message: "ID de conversation et contenu ou pièce(s) jointe(s) sont requis"
            });
        }

        const conversation = await Conversation.findById(conversation_id);
        if (!conversation) {
            return res.status(404).json({ message: "Conversation non trouvée" });
        }

        // Vérifier que l'utilisateur est bien dans la conversation
        const isParticipant = conversation.participants.some(p =>
            p.toString() === sender_id.toString()
        );
        if (!isParticipant) {
            return res.status(403).json({ message: "Vous ne faites pas partie de cette conversation" });
        }

        // Récupération des attachments si fournis
        let attachmentsDocs = [];
        if (attachmentIds.length > 0) {
            attachmentsDocs = await Attachment.find({ _id: { $in: attachmentIds } });

            if (!attachmentsDocs.length) {
                return res.status(400).json({ message: "Pièces jointes introuvables" });
            }
        }

        // Détermination du type principal du message
        let mainType = 'text';
        if (attachmentsDocs.length > 0) {
            const first = attachmentsDocs[0];
            if (['image', 'video', 'audio', 'file'].includes(first.type)) {
                mainType = first.type;
            } else {
                mainType = 'file';
            }
        }

        const newMessage = await Message.create({
            sender: sender_id,
            conversation: conversation_id,
            content: content || '',
            type: mainType,
            attachments: attachmentIds,
            replyTo: replyTo || null,
            status: 'sent'
        });

        // Lier les attachments au message (si uploadés avant)
        if (attachmentsDocs.length > 0) {
            await Attachment.updateMany(
                { _id: { $in: attachmentIds } },
                { $set: { message: newMessage._id } }
            );
        }

        // Mise à jour de la conv (lastMessage + unreadCounts)
        conversation.lastMessage = newMessage._id;
        conversation.unreadCounts.forEach(uc => {
            if (!uc.user.equals(sender_id)) {
                uc.count++;
            } else {
                uc.count = 0;
            }
        });
        await conversation.save();

        // On renvoie un message peuplé
        const populatedMessage = await Message.findById(newMessage._id)
            .populate('sender', 'name avatar')
            .populate('attachments');

        const io = socketManager.getIo();
        io.to(conversation_id.toString()).emit('receive-message', populatedMessage);

        res.status(201).json(populatedMessage);
    } catch (err) {
        console.error("ERREUR DANS createMessage:", err);
        res.status(500).json({ message: err.message });
    }
};


export const getMessagesForConversation = async (req, res) => {
    try {
        const loggedInUserId = req.user.id;
        const conversationId = req.params.conversation_id;
        const page = parseInt(req.query.page) || 1;
        const limit = 30;

        const conversation = await Conversation.findById(conversationId);
        const isParticipant = conversation &&
            conversation.participants.some(p => p.toString() === loggedInUserId.toString());

        if (!conversation || !isParticipant) {
            return res.status(403).json({ message: 'Accès non autorisé à cette conversation.' });
        }

        const messages = await Message.find({ conversation: conversationId, deleted: false })
            .populate('sender', 'name avatar')
            .populate('attachments')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        await Conversation.updateOne(
            { _id: conversationId, 'unreadCounts.user': loggedInUserId },
            { $set: { 'unreadCounts.$.count': 0 } }
        );

        res.json(messages.reverse());
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};


export const getConversations = async (req, res) => {
    try {
        const conversations = await Conversation.find({ participants: req.user.id })
            .populate({ path: 'participants', select: 'name avatar isOnline' })
            .populate({ path: 'lastMessage', populate: { path: 'sender', select: 'name' } })
            .sort({ updatedAt: -1 });

        const formattedConversations = conversations.map(conv => {
            const unreadCount = conv.unreadCounts.find(uc => uc.user.equals(req.user.id))?.count || 0;
            const otherParticipants = conv.participants.filter(p => !p._id.equals(req.user.id));

            let conversationName = conv.name;
            if (!conversationName && otherParticipants.length === 1) {
                conversationName = otherParticipants[0].name;
            } else if (!conversationName) {
                conversationName = otherParticipants.map(p => p.name).join(', ');
            }

            return {
                ...conv.toObject(),
                unreadCount,
                conversationName,
                isGroup: conv.participants.length > 2 || !!conv.name
            };
        });

        res.json(formattedConversations);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};


export const editMessage = async (req, res) => {
    try {
        const message = await Message.findById(req.params.id);
        if (!message) return res.status(404).json({ message: "Message non trouvé" });

        if (message.sender.toString() !== req.user.id) {
            return res.status(403).json({ message: "Action non autorisée" });
        }

        message.editHistory = message.editHistory || [];
        if (message.content) {
            message.editHistory.push({
                content: message.content,
                editedAt: new Date()
            });
        }

        message.content = req.body.content;
        message.edited = true;
        message.editedAt = new Date();

        await message.save();
        res.json(message);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};


export const deleteMessage = async (req, res) => {
    try {
        const message = await Message.findById(req.params.id);
        if (!message) return res.status(404).json({ message: "Message non trouvé" });

        if (message.sender.toString() !== req.user.id) {
            return res.status(403).json({ message: "Action non autorisée" });
        }

        message.deleted = true;
        message.deletedAt = new Date();
        message.content = "Ce message a été supprimé.";

        await message.save();
        res.status(200).json({ message: "Message supprimé" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};


export const markMessageAsRead = async (req, res) => {
    try {
        const message = await Message.findById(req.params.id);
        if (!message) return res.status(404).json({ message: "Message non trouvé" });

        // Pour les convos/groupes, tu peux basculer sur readBy plutôt que receiver
        if (message.receiver && message.receiver.toString() !== req.user.id) {
            return res.status(403).json({ message: "Action non autorisée" });
        }

        message.status = 'read';
        message.readBy = message.readBy || [];
        message.readBy.push({
            user: req.user.id,
            readAt: new Date()
        });

        await message.save();
        res.json(message);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};


export const leaveConversation = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const userId = req.user.id;

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
            return res.status(404).json({ message: "Conversation non trouvée." });
        }

        const originalParticipantCount = conversation.participants.length;
        conversation.participants = conversation.participants.filter(p => !p.equals(userId));

        if (conversation.participants.length === originalParticipantCount) {
            return res.status(403).json({ message: "Vous ne faites pas partie de cette conversation." });
        }

        conversation.unreadCounts = conversation.unreadCounts.filter(uc => !uc.user.equals(userId));

        if (conversation.participants.length === 0) {
            await Conversation.findByIdAndDelete(conversationId);
            return res.status(200).json({ message: "Conversation quittée et supprimée car elle est maintenant vide." });
        } else {
            await conversation.save();
            return res.status(200).json({ message: "Vous avez quitté la conversation." });
        }
    } catch (err) {
        console.error("ERREUR DANS leaveConversation:", err);
        res.status(500).json({ message: "Erreur serveur lors de la tentative de quitter la conversation." });
    }
};
