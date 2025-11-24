import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../models/User.js'; 
import auth from '../middleware/auth.js';
import logger from '../config/logger.js';

const router = express.Router();

const generateTokens = (userId) => {
  const accessToken = jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: "1d",
  });

  const refreshToken = jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET, {
    expiresIn: "7d",
  });

  return { accessToken, refreshToken };
};

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, avatar } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ message: "Champs manquants" });
    }

    const emailExists = await User.findOne({ email });
    if (emailExists) {
      return res.status(400).json({ message: "Email déjà utilisé" });
    }

    const newUser = await User.create({ name, email, password, avatar });
    const { accessToken, refreshToken } = generateTokens(newUser._id);

    logger.info('Nouvel utilisateur inscrit', { email });
    res.status(201).json({ 
      accessToken, 
      refreshToken,
      user: { id: newUser._id, name: newUser.name, email: newUser.email, avatar: newUser.avatar }
    });
  } catch (err) {
    logger.error('Erreur lors de l\'inscription', err);
    res.status(500).json({ message: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Email ou mot de passe incorrect" });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Email ou mot de passe incorrect" });
    }

    user.isOnline = true;
    await user.save();

    const { accessToken, refreshToken } = generateTokens(user._id);

    logger.info('Utilisateur connecté', { email });
    res.json({ 
      accessToken, 
      refreshToken,
      user: { id: user._id, name: user.name, email: user.email, avatar: user.avatar, isOnline: true }
    });
  } catch (err) {
    logger.error('Erreur lors de la connexion', err);
    res.status(500).json({ message: err.message });
  }
});

router.post('/refresh-token', (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({ message: "Refresh token requis" });
    }

    const verified = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(verified.id);

    res.json({ accessToken, refreshToken: newRefreshToken });
  } catch (err) {
    logger.error('Erreur lors du rafraîchissement du token', err);
    res.status(401).json({ message: "Token invalide" });
  }
});

router.post('/logout', auth, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user.id, {
      isOnline: false,
      lastLogout: new Date(),
    });

    logger.info('Utilisateur déconnecté', { userId: req.user.id });
    res.json({ message: "Déconnexion réussie ✅" });
  } catch (err) {
    logger.error('Erreur lors de la déconnexion', err);
    res.status(500).json({ message: "Erreur lors de la déconnexion" });
  }
});

export default router;