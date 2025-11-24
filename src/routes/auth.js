import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../models/User.js'; 
import auth from '../middleware/auth.js'; 

const router = express.Router();


router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ message: "Champs manquants" });
    }

    const emailExists = await User.findOne({ email });
    if (emailExists) {
      return res.status(400).json({ message: "Email déjà utilisé" });
    }

    
    const newUser = await User.create({ name, email, password });

    const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    res.status(201).json({ token });
  } catch (err) {
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

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    res.json({ token, userId: user._id, name: user.name });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


router.post('/logout', auth, async (req, res) => {
  try {
    
    await User.findByIdAndUpdate(req.user.id, {
      isOnline: false,
      lastLogout: new Date(),
    });

    res.json({ message: "Déconnexion réussie ✅" });
  } catch (err) {
    res.status(500).json({ message: "Erreur lors de la déconnexion" });
  }
});

export default router;