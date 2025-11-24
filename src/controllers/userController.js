// src/controllers/userController.js
import User from '../models/User.js';
import logger from '../config/logger.js';

export const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }
    res.json(user);
  } catch (err) {
    logger.error('Erreur lors de la récupération du profil', err);
    res.status(500).json({ message: err.message });
  }
};

export const updateUserProfile = async (req, res) => {
  try {
    const { name, avatar } = req.body;
    const updateFields = {};

    if (name) updateFields.name = name;
    if (avatar) updateFields.avatar = avatar;
    
    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({ message: 'Aucun champ à mettre à jour' });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updateFields },
      { new: true, runValidators: true }
    ).select('-password');

    logger.info('Profil utilisateur mis à jour', { userId: req.user.id });
    res.json(updatedUser);
  } catch (err) {
    logger.error('Erreur lors de la mise à jour du profil', err);
    res.status(500).json({ message: err.message });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id);

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ message: 'Mot de passe actuel incorrect' });
    }

    user.password = newPassword;
    await user.save();

    logger.info('Mot de passe changé', { userId: req.user.id });
    res.json({ message: 'Mot de passe changé avec succès' });
  } catch (err) {
    logger.error('Erreur lors du changement de mot de passe', err);
    res.status(500).json({ message: err.message });
  }
};

export const deleteAccount = async (req, res) => {
  try {
    const { password } = req.body;
    const user = await User.findById(req.user.id);

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Mot de passe incorrect' });
    }

    await User.findByIdAndDelete(req.user.id);
    logger.info('Compte supprimé', { userId: req.user.id });
    res.json({ message: 'Compte supprimé avec succès' });
  } catch (err) {
    logger.error('Erreur lors de la suppression du compte', err);
    res.status(500).json({ message: err.message });
  }
};

export const getUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const online = req.query.online;
    let filter = { _id: { $ne: req.user.id } }; // Exclure l'utilisateur actuel

    if (online !== undefined) {
      filter.isOnline = online === 'true';
    }

    const users = await User.find(filter)
      .select('name isOnline avatar lastLogout')
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await User.countDocuments(filter);

    res.json({
      users,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    });
  } catch (err) {
    logger.error('Erreur lors de la récupération des utilisateurs', err);
    res.status(500).json({ message: err.message });
  }
};

export const searchUsers = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({ message: "Le paramètre 'q' est manquant" });
    }

    const users = await User.find({
      name: { $regex: q, $options: 'i' },
      _id: { $ne: req.user.id }
    }).select('name isOnline avatar');

    res.json(users);
  } catch (err) {
    logger.error('Erreur lors de la recherche utilisateur', err);
    res.status(500).json({ message: err.message });
  }
};
