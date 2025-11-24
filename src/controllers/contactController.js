// src/controllers/contactController.js
import Contact from '../models/Contact.js';
import User from '../models/User.js';
import logger from '../config/logger.js';

// Helper : détecte un ObjectId invalide
const invalidId = (id) => !/^[0-9a-fA-F]{24}$/.test(id);

export const addContact = async (req, res) => {
  try {
    const userId = req.user.id;
    const { contactId } = req.body;

    if (invalidId(contactId)) {
      return res.status(400).json({ message: 'ID invalide' });
    }

    if (userId === contactId) {
      return res.status(400).json({ message: 'Vous ne pouvez pas vous ajouter comme contact' });
    }

    const contactUser = await User.findById(contactId);
    if (!contactUser) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    let contact = await Contact.findOne({ user: userId, contact: contactId });
    if (contact) {
      return res.status(400).json({ message: 'Contact déjà existant' });
    }

    contact = await Contact.create({ user: userId, contact: contactId });
    await contact.populate('contact', 'name avatar isOnline');

    logger.info('Contact ajouté', { userId, contactId });
    res.status(201).json(contact);
  } catch (err) {
    logger.error('Erreur lors de l\'ajout du contact', err);
    res.status(500).json({ message: err.message });
  }
};

export const getContacts = async (req, res) => {
  try {
    const userId = req.user.id;
    const status = req.query.status || 'accepted';

    const contacts = await Contact.find({ user: userId, status })
      .populate({
        path: 'contact',
        select: 'name avatar isOnline lastLogout',
        model: 'User'
      })
      .sort({ createdAt: -1 });

    res.json(contacts);
  } catch (err) {
    logger.error('Erreur lors de la récupération des contacts', err);
    res.status(500).json({ message: err.message });
  }
};

export const removeContact = async (req, res) => {
  try {
    const userId = req.user.id;
    const { contactId } = req.params;

    if (invalidId(contactId)) {
      return res.status(400).json({ message: 'ID invalide' });
    }

    const contact = await Contact.findOne({ user: userId, contact: contactId });
    if (!contact) {
      return res.status(404).json({ message: 'Contact non trouvé' });
    }

    await Contact.deleteOne({ user: userId, contact: contactId });
    logger.info('Contact supprimé', { userId, contactId });
    res.json({ message: 'Contact supprimé' });
  } catch (err) {
    logger.error('Erreur lors de la suppression du contact', err);
    res.status(500).json({ message: err.message });
  }
};

export const blockContact = async (req, res) => {
  try {
    const userId = req.user.id;
    const { contactId } = req.params;

    if (invalidId(contactId)) {
      return res.status(400).json({ message: 'ID invalide' });
    }

    let contact = await Contact.findOne({ user: userId, contact: contactId });

    if (!contact) {
      contact = await Contact.create({
        user: userId,
        contact: contactId,
        status: 'blocked',
        isBlocked: true,
        blockedAt: new Date(),
        blockedBy: userId
      });
    } else {
      contact.isBlocked = true;
      contact.status = 'blocked';
      contact.blockedAt = new Date();
      contact.blockedBy = userId;
      await contact.save();
    }

    logger.info('Contact bloqué', { userId, contactId });
    res.json({ message: 'Contact bloqué avec succès' });
  } catch (err) {
    logger.error('Erreur lors du blocage du contact', err);
    res.status(500).json({ message: err.message });
  }
};

export const unblockContact = async (req, res) => {
  try {
    const userId = req.user.id;
    const { contactId } = req.params;

    if (invalidId(contactId)) {
      return res.status(400).json({ message: 'ID invalide' });
    }

    const contact = await Contact.findOne({ user: userId, contact: contactId });

    if (!contact || !contact.isBlocked) {
      return res.status(404).json({ message: 'Contact bloqué non trouvé' });
    }

    contact.isBlocked = false;
    contact.status = 'accepted';
    contact.blockedAt = null;
    contact.blockedBy = null;
    await contact.save();

    logger.info('Contact débloqué', { userId, contactId });
    res.json({ message: 'Contact débloqué avec succès' });
  } catch (err) {
    logger.error('Erreur lors du déblocage du contact', err);
    res.status(500).json({ message: err.message });
  }
};

export const searchContacts = async (req, res) => {
  try {
    const userId = req.user.id;
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({ message: "Le paramètre 'q' est manquant" });
    }

    const contacts = await Contact.find({ user: userId, status: 'accepted' })
      .populate({
        path: 'contact',
        match: { name: { $regex: q, $options: 'i' } },
        select: 'name avatar isOnline'
      });

    const filtered = contacts.filter(c => c.contact);
    res.json(filtered);
  } catch (err) {
    logger.error('Erreur lors de la recherche de contacts', err);
    res.status(500).json({ message: err.message });
  }
};

export const getBlockedContacts = async (req, res) => {
  try {
    const userId = req.user.id;

    const blockedContacts = await Contact.find({ user: userId, isBlocked: true })
      .populate({
        path: 'contact',
        select: 'name avatar',
        model: 'User'
      });

    res.json(blockedContacts);
  } catch (err) {
    logger.error('Erreur lors de la récupération des contacts bloqués', err);
    res.status(500).json({ message: err.message });
  }
};
