// src/controllers/groupController.js
import Group from '../models/Group.js';
import Conversation from '../models/Conversation.js';
import User from '../models/User.js';
import logger from '../config/logger.js';

export const createGroup = async (req, res) => {
  try {
    const { name, description, avatar, memberIds } = req.body;
    const userId = req.user.id;

    if (!name || !memberIds || memberIds.length === 0) {
      return res.status(400).json({ message: 'Nom et membres requis' });
    }

    // Vérifier que les membres existent
    const validMembers = await User.find({ _id: { $in: memberIds } }).select('_id');
    if (validMembers.length !== memberIds.length) {
      return res.status(400).json({ message: 'Un ou plusieurs membres invalides' });
    }

    // Ajouter le créateur si pas déjà dans la liste
    const allMemberIds = [...new Set([userId, ...memberIds])];

    // Créer la conversation
    const conversation = await Conversation.create({
      name,
      description,
      avatar,
      participants: allMemberIds,
      creator: userId,
      isGroup: true
    });

    // Créer le groupe
    const members = allMemberIds.map((memberId) => ({
      user: memberId,
      role: memberId === userId ? 'admin' : 'member',
      joinedAt: new Date(),
      lastActivityAt: new Date()
    }));

    const group = await Group.create({
      name,
      description,
      avatar,
      creator: userId,
      conversation: conversation._id,
      members,
      modificationHistory: [{
        action: 'created',
        modifiedBy: userId,
        timestamp: new Date(),
        details: `Groupe créé par ${req.user.name}`
      }]
    });

    logger.info('Groupe créé', { groupId: group._id, creator: userId, memberCount: members.length });

    res.status(201).json({
      group: await group.populate([
        { path: 'creator', select: 'name avatar' },
        { path: 'members.user', select: 'name avatar isOnline' },
        { path: 'conversation' }
      ])
    });
  } catch (err) {
    logger.error('Erreur lors de la création du groupe', err);
    res.status(500).json({ message: err.message });
  }
};

export const getGroupInfo = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;

    const group = await Group.findById(groupId)
      .populate('creator', 'name avatar')
      .populate('members.user', 'name avatar isOnline lastLogout')
      .populate('conversation');

    if (!group) {
      return res.status(404).json({ message: 'Groupe non trouvé' });
    }

    // Vérifier que l'utilisateur est membre
    const isMember = group.members.some(m => m.user._id.toString() === userId);
    if (!isMember) {
      return res.status(403).json({ message: 'Non autorisé' });
    }

    res.json(group);
  } catch (err) {
    logger.error('Erreur lors de la récupération du groupe', err);
    res.status(500).json({ message: err.message });
  }
};

export const updateGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { name, description, avatar } = req.body;
    const userId = req.user.id;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Groupe non trouvé' });
    }

    // Vérifier les permissions (admin seulement)
    const userMember = group.members.find(m => m.user.toString() === userId);
    if (!userMember || userMember.role !== 'admin') {
      return res.status(403).json({ message: 'Seuls les admins peuvent modifier le groupe' });
    }

    if (name) group.name = name;
    if (description !== undefined) group.description = description;
    if (avatar) group.avatar = avatar;

    group.modificationHistory.push({
      action: 'updated',
      modifiedBy: userId,
      timestamp: new Date(),
      details: `Groupe modifié : name=${name}, description=${description}`
    });

    await group.save();

    // Mettre à jour la conversation associée
    await Conversation.findByIdAndUpdate(group.conversation, {
      name,
      description,
      avatar
    });

    logger.info('Groupe modifié', { groupId, modifier: userId });

    res.json({
      group: await group.populate([
        { path: 'creator', select: 'name avatar' },
        { path: 'members.user', select: 'name avatar isOnline' }
      ])
    });
  } catch (err) {
    logger.error('Erreur lors de la modification du groupe', err);
    res.status(500).json({ message: err.message });
  }
};

export const addMember = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { userId: newMemberId, role = 'member' } = req.body;
    const currentUserId = req.user.id;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Groupe non trouvé' });
    }

    // Vérifier les permissions (admin seulement)
    const currentUserMember = group.members.find(m => m.user.toString() === currentUserId);
    if (!currentUserMember || currentUserMember.role !== 'admin') {
      return res.status(403).json({ message: 'Seuls les admins peuvent ajouter des membres' });
    }

    // Vérifier que le nouvel utilisateur existe
    const newUser = await User.findById(newMemberId);
    if (!newUser) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    // Vérifier que l'utilisateur n'est pas déjà membre
    if (group.members.some(m => m.user.toString() === newMemberId)) {
      return res.status(400).json({ message: 'Utilisateur déjà membre du groupe' });
    }

    group.members.push({
      user: newMemberId,
      role,
      joinedAt: new Date(),
      lastActivityAt: new Date()
    });

    group.modificationHistory.push({
      action: 'member_added',
      modifiedBy: currentUserId,
      timestamp: new Date(),
      details: `Membre ajouté: ${newUser.name} (${role})`
    });

    await group.save();

    // Ajouter à la conversation
    await Conversation.findByIdAndUpdate(group.conversation, {
      $addToSet: { participants: newMemberId }
    });

    logger.info('Membre ajouté au groupe', { groupId, newMemberId, addedBy: currentUserId });

    res.json({
      group: await group.populate('members.user', 'name avatar isOnline')
    });
  } catch (err) {
    logger.error('Erreur lors de l\'ajout du membre', err);
    res.status(500).json({ message: err.message });
  }
};

export const removeMember = async (req, res) => {
  try {
    const { groupId, memberId } = req.params;
    const currentUserId = req.user.id;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Groupe non trouvé' });
    }

    // Vérifier les permissions (admin ou auto-suppression)
    const currentUserMember = group.members.find(m => m.user.toString() === currentUserId);
    if (!currentUserMember) {
      return res.status(403).json({ message: 'Non autorisé' });
    }

    if (currentUserMember.role !== 'admin' && currentUserId !== memberId) {
      return res.status(403).json({ message: 'Vous pouvez seulement vous quitter' });
    }

    // Vérifier qu'il y a au moins un admin
    const remainingAdmins = group.members.filter(
      m => m.user.toString() !== memberId && m.role === 'admin'
    );
    if (remainingAdmins.length === 0 && group.members.find(m => m.user.toString() === memberId)?.role === 'admin') {
      return res.status(400).json({ message: 'Le dernier admin ne peut pas quitter le groupe' });
    }

    const user = await User.findById(memberId).select('name');
    group.members = group.members.filter(m => m.user.toString() !== memberId);

    group.modificationHistory.push({
      action: 'member_removed',
      modifiedBy: currentUserId,
      timestamp: new Date(),
      details: `Membre supprimé: ${user?.name}`
    });

    await group.save();

    // Supprimer de la conversation
    await Conversation.findByIdAndUpdate(group.conversation, {
      $pull: { participants: memberId }
    });

    logger.info('Membre supprimé du groupe', { groupId, memberId, removedBy: currentUserId });

    res.json({ message: 'Membre supprimé' });
  } catch (err) {
    logger.error('Erreur lors de la suppression du membre', err);
    res.status(500).json({ message: err.message });
  }
};

export const setMemberRole = async (req, res) => {
  try {
    const { groupId, memberId } = req.params;
    const { role } = req.body;
    const currentUserId = req.user.id;

    if (!['admin', 'moderator', 'member'].includes(role)) {
      return res.status(400).json({ message: 'Rôle invalide' });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Groupe non trouvé' });
    }

    // Vérifier les permissions (admin seulement)
    const currentUserMember = group.members.find(m => m.user.toString() === currentUserId);
    if (!currentUserMember || currentUserMember.role !== 'admin') {
      return res.status(403).json({ message: 'Seuls les admins peuvent modifier les rôles' });
    }

    const targetMember = group.members.find(m => m.user.toString() === memberId);
    if (!targetMember) {
      return res.status(404).json({ message: 'Membre non trouvé' });
    }

    const oldRole = targetMember.role;
    targetMember.role = role;

    group.modificationHistory.push({
      action: 'role_changed',
      modifiedBy: currentUserId,
      timestamp: new Date(),
      details: `Rôle changé: ${oldRole} → ${role}`
    });

    await group.save();

    logger.info('Rôle du membre modifié', { groupId, memberId, oldRole, newRole: role });

    res.json({
      group: await group.populate('members.user', 'name avatar')
    });
  } catch (err) {
    logger.error('Erreur lors de la modification du rôle', err);
    res.status(500).json({ message: err.message });
  }
};

export const getGroupMembers = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;

    const group = await Group.findById(groupId)
      .populate('members.user', 'name avatar isOnline lastLogout email');

    if (!group) {
      return res.status(404).json({ message: 'Groupe non trouvé' });
    }

    // Vérifier que l'utilisateur est membre
    const isMember = group.members.some(m => m.user._id.toString() === userId);
    if (!isMember) {
      return res.status(403).json({ message: 'Non autorisé' });
    }

    res.json(group.members);
  } catch (err) {
    logger.error('Erreur lors de la récupération des membres', err);
    res.status(500).json({ message: err.message });
  }
};

export const leaveGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Groupe non trouvé' });
    }

    const userMember = group.members.find(m => m.user.toString() === userId);
    if (!userMember) {
      return res.status(404).json({ message: 'Vous n\'êtes pas membre de ce groupe' });
    }

    // Vérifier qu'il y a au moins un autre admin
    if (userMember.role === 'admin') {
      const otherAdmins = group.members.filter(
        m => m.user.toString() !== userId && m.role === 'admin'
      );
      if (otherAdmins.length === 0) {
        return res.status(400).json({ message: 'Le dernier admin ne peut pas quitter le groupe' });
      }
    }

    group.members = group.members.filter(m => m.user.toString() !== userId);
    
    group.modificationHistory.push({
      action: 'member_left',
      modifiedBy: userId,
      timestamp: new Date(),
      details: `Membre a quitté le groupe`
    });

    await group.save();

    // Supprimer de la conversation
    await Conversation.findByIdAndUpdate(group.conversation, {
      $pull: { participants: userId }
    });

    logger.info('Utilisateur a quitté le groupe', { groupId, userId });

    res.json({ message: 'Vous avez quitté le groupe' });
  } catch (err) {
    logger.error('Erreur lors de la suppression de l\'utilisateur du groupe', err);
    res.status(500).json({ message: err.message });
  }
};
