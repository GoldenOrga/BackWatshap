import Message from '../models/Message.js';
import User from '../models/User.js';
import Conversation from '../models/Conversation.js';
import socketManager from '../socket/index.js';


export const createOrGetConversation = async (req, res) => {
    const { participantIds, name } = req.body;
    const allParticipants = [...new Set([req.user.id, ...participantIds])]; 

    if (allParticipants.length < 2) {
        return res.status(400).json({ message: "Une conversation nécessite au moins 2 participants." });
    }

    try {
        
        if (allParticipants.length === 2 && !name) {
            let conv = await Conversation.findOne({
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
        allParticipants.forEach(participantId => {
            const socketId = socketManager.userSockets.get(participantId.toString());
            if (socketId) {
                const socket = io.sockets.sockets.get(socketId);
                if (socket) socket.join(newConversation._id.toString());
            }
        });
        
        const populatedConv = await Conversation.findById(newConversation._id)
          .populate({ path: 'participants', select: 'name avatar isOnline' });

        io.to(newConversation._id.toString()).emit('conversation-created', populatedConv)

        res.status(201).json(populatedConv);
    } catch (err) {
        console.error("ERREUR DANS createOrGetConversation:", err);
        res.status(500).json({ message: err.message });
    }
};



export const createMessage = async (req, res) => {
  try {
    const { conversation_id, content } = req.body;
    const sender_id = req.user.id;

    if (!conversation_id || !content) {
      return res.status(400).json({ message: "ID de conversation et contenu sont requis" });
    }

    const conversation = await Conversation.findById(conversation_id);
    if (!conversation) {
      return res.status(404).json({ message: "Conversation non trouvée" });
    }

    if (!conversation.participants.includes(sender_id)) {
        return res.status(403).json({ message: "Vous ne faites pas partie de cette conversation" });
    }

    const newMessage = await Message.create({ 
        sender: sender_id, 
        conversation: conversation_id, 
        content 
    });

    
    conversation.lastMessage = newMessage._id;
    conversation.unreadCounts.forEach(uc => {
        
        if (!uc.user.equals(sender_id)) {
            uc.count++;
        } else {
          
          uc.count = 0;
        }
    });
    await conversation.save();

    const populatedMessage = await Message.findById(newMessage._id).populate('sender', 'name avatar');

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
        if (!conversation || !conversation.participants.includes(loggedInUserId)) {
            return res.status(403).json({ message: 'Accès non autorisé à cette conversation.' });
        }

        const messages = await Message.find({ conversation: conversationId, deleted: false })
        .populate('sender', 'name avatar')
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

        message.content = req.body.content;
        message.edited = true;
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

        if (message.receiver.toString() !== req.user.id) {
            return res.status(403).json({ message: "Action non autorisée" });
        }

        message.status = 'read';
        await message.save();
        res.json(message);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

/**
 * Permet à un utilisateur de quitter une conversation.
 */
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