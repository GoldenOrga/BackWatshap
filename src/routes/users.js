import express from "express";
import User from "../models/User.js";
import auth from "../middleware/auth.js";

const router = express.Router();

router.get("/", auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const online = req.query.online;
    let filter = {};

    if (online !== undefined) {
      filter.isOnline = online === "true";
    }

    const users = await User.find(filter)
      .select("name isOnline avatar")
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await User.countDocuments(filter);

    res.json({
      users,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/search", auth, async (req, res) => {
  const { q } = req.query;

  if (!q) {
    return res
      .status(400)
      .json({ message: "Le paramètre de recherche 'q' est manquant" });
  }

  try {
    const users = await User.find({
      name: { $regex: q, $options: "i" },
    }).select("name isOnline avatar");

    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put("/profile", auth, async (req, res) => {
  try {
    const { name, avatar } = req.body;
    const userId = req.user.id;
    const updateFields = {};

    if (name) updateFields.name = name;
    if (avatar) updateFields.avatar = avatar;
    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({ message: "Aucun champ à mettre à jour" });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateFields },
      { new: true, runValidators: true }
    ).select("-password");

    if (!updatedUser) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    res.json(updatedUser);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/:id", auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select(
      "name isOnline avatar"
    );

    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/change-password", auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    // 1. Vérifier que les champs sont présents
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "L'ancien et le nouveau mot de passe sont requis" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "Le nouveau mot de passe doit contenir au moins 6 caractères" });
    }

    // 2. Récupérer l'utilisateur
    const user = await User.findById(userId).select("+password");
    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    // 3. Vérifier l'ancien mot de passe
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: "Le mot de passe actuel est incorrect" });
    }

    // 4. Changer le mot de passe (bcrypt via pre-save hook)
    user.password = newPassword;
    await user.save();

    logger.info("Mot de passe modifié", { userId });
    res.json({ message: "Mot de passe modifié avec succès ✅" });
  } catch (err) {
    logger.error("Erreur lors du changement de mot de passe", err);
    res.status(500).json({ message: "Erreur serveur lors du changement de mot de passe" });
  }
});
export default router;
