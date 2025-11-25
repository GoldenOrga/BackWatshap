import User from "../models/User.js";
import logger from "../config/logger.js";

export default {
  // 📌 Récupérer la liste des utilisateurs (pagination + filtre en ligne)
  async getUsers(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const online = req.query.online;

      const filter = { _id: { $ne: req.user.id } }; // Exclure l'utilisateur connecté

      if (online !== undefined) {
        filter.isOnline = online === "true";
      }

      const users = await User.find(filter)
        .select("name avatar isOnline lastLogout")
        .skip((page - 1) * limit)
        .limit(limit);

      const total = await User.countDocuments(filter);

      res.json({
        users,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
      });
    } catch (err) {
      logger.error("Erreur lors de la récupération des utilisateurs", err);
      res.status(500).json({ message: err.message });
    }
  },

  // 📌 Recherche utilisateur par nom
  async searchUsers(req, res) {
    try {
      const { q } = req.query;

      if (!q) {
        return res
          .status(400)
          .json({ message: "Le paramètre 'q' est manquant" });
      }

      const users = await User.find({
        name: { $regex: q, $options: "i" },
        _id: { $ne: req.user.id },
      }).select("name avatar isOnline");

      res.json(users);
    } catch (err) {
      logger.error("Erreur lors de la recherche utilisateur", err);
      res.status(500).json({ message: err.message });
    }
  },

  // 📌 Récupérer un utilisateur par son ID
  async getUserById(req, res) {
    try {
      const user = await User.findById(req.params.id).select(
        "name avatar isOnline lastLogout"
      );

      if (!user) {
        return res.status(404).json({ message: "Utilisateur non trouvé" });
      }

      res.json(user);
    } catch (err) {
      logger.error("Erreur getUserById", err);
      res.status(500).json({ message: err.message });
    }
  },

  // 📌 Récupérer le profil de l’utilisateur connecté
  async getUserProfile(req, res) {
    try {
      const user = await User.findById(req.user.id).select("-password");
      if (!user) {
        return res.status(404).json({ message: "Utilisateur non trouvé" });
      }
      res.json(user);
    } catch (err) {
      logger.error("Erreur lors de la récupération du profil", err);
      res.status(500).json({ message: err.message });
    }
  },

  // 📌 Modifier le profil
  async updateUserProfile(req, res) {
    try {
      const { name, avatar } = req.body;

      const updateFields = {};
      if (name) updateFields.name = name;
      if (avatar) updateFields.avatar = avatar;

      if (Object.keys(updateFields).length === 0) {
        return res.status(400).json({ message: "Aucun champ à mettre à jour" });
      }

      const updatedUser = await User.findByIdAndUpdate(
        req.user.id,
        { $set: updateFields },
        { new: true, runValidators: true }
      ).select("-password");

      logger.info("Profil mis à jour", { userId: req.user.id });
      res.json(updatedUser);
    } catch (err) {
      logger.error("Erreur updateUserProfile", err);
      res.status(500).json({ message: err.message });
    }
  },
  // 📌 Changer le mot de passe (avec option email)
async changePasswordWithToken(req, res) {
    try {
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          message: "Les champs 'currentPassword' et 'newPassword' sont requis",
        });
      }

      // Récupération du user via le token
      const user = await User.findById(req.user.id).select("+password");

      if (!user) {
        return res.status(404).json({ message: "Utilisateur introuvable" });
      }

      // Vérification ancien mot de passe
      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        return res.status(401).json({ message: "Mot de passe actuel incorrect" });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          message: "Le nouveau mot de passe doit faire au moins 6 caractères",
        });
      }

      user.password = newPassword;
      await user.save();

      logger.info("Mot de passe modifié via token", { userId: user._id });
      res.json({ message: "Mot de passe modifié avec succès" });

    } catch (err) {
      logger.error("Erreur changePasswordWithToken", err);
      res.status(500).json({ message: err.message });
    }
  },


  // =======================
  // ✉ 2. Changer MDP via EMAIL (sans auth)
  // =======================
  async changePasswordByEmail(req, res) {
    try {
      const { email, newPassword } = req.body;

      if (!email  || !newPassword) {
        return res.status(400).json({
          message: "Les champs 'email' et 'newPassword' sont requis",
        });
      }

      // Vérifier l'utilisateur
      const user = await User.findOne({ email }).select("+password");

      if (!user) {
        return res.status(404).json({ message: "Email introuvable" });
      }

      // Vérifier ancien mot de passe
      

      if (newPassword.length < 6) {
        return res.status(400).json({
          message: "Le nouveau mot de passe doit faire au moins 6 caractères",
        });
      }

      user.password = newPassword;
      await user.save();

      logger.info("Mot de passe modifié via email", { email });
      res.json({ message: "Mot de passe modifié avec succès" });

    } catch (err) {
      logger.error("Erreur changePasswordByEmail", err);
      res.status(500).json({ message: err.message });
    }
  },
  // 📌 Supprimer le compte
  async deleteAccount(req, res) {
    try {
      const { password } = req.body;

      const user = await User.findById(req.user.id).select("+password");
      const isMatch = await user.comparePassword(password);

      if (!isMatch) {
        return res.status(401).json({ message: "Mot de passe incorrect" });
      }

      await User.findByIdAndDelete(req.user.id);

      logger.info("Compte supprimé", { userId: req.user.id });

      res.json({ message: "Compte supprimé avec succès" });
    } catch (err) {
      logger.error("Erreur deleteAccount", err);
      res.status(500).json({ message: err.message });
    }
  },
};
