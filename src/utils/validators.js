// src/utils/validators.js
import Joi from 'joi';

// Schéma pour l'inscription
export const registerSchema = Joi.object({
  name: Joi.string().min(3).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).max(100).required(),
  avatar: Joi.string().uri().optional()
});

// Schéma pour la connexion
export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

// Schéma pour la mise à jour du profil
export const updateProfileSchema = Joi.object({
  name: Joi.string().min(3).max(50).optional(),
  avatar: Joi.string().uri().optional()
});

// Schéma pour l'ajout de contact
export const addContactSchema = Joi.object({
  contactId: Joi.string().length(24).hex().required()
});

// Schéma pour la création de conversation
export const createConversationSchema = Joi.object({
  participantIds: Joi.array().items(Joi.string().length(24).hex()).required(),
  name: Joi.string().max(100).optional()
});

// Schéma pour la création de message
export const createMessageSchema = Joi.object({
  conversation_id: Joi.string().length(24).hex().required(),
  content: Joi.string().min(1).max(5000).required()
});

// Schéma pour le changement de mot de passe
export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(6).max(100).required()
});

// Fonction de validation middleware
export const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, { abortEarly: false });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      return res.status(400).json({ message: 'Validation échouée', errors });
    }
    
    req.validatedData = value;
    next();
  };
};
