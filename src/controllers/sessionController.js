// src/controllers/sessionController.js
import Session from '../models/Session.js';
import logger from '../config/logger.js';

export const createSession = async (req, res) => {
  try {
    const userId = req.user.id;
    const { deviceName, ipAddress, userAgent, socketId } = req.body;

    // Créer une session qui expire dans 30 jours
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const session = await Session.create({
      user: userId,
      deviceName: deviceName || 'Unknown Device',
      ipAddress: ipAddress || req.ip,
      userAgent: userAgent || req.get('user-agent'),
      expiresAt,
      socketId
    });

    logger.info('Nouvelle session créée', { userId, deviceName });
    res.status(201).json(session);
  } catch (err) {
    logger.error('Erreur lors de la création de la session', err);
    res.status(500).json({ message: err.message });
  }
};

export const getSessions = async (req, res) => {
  try {
    const userId = req.user.id;
    const sessions = await Session.find({ user: userId, isActive: true })
      .sort({ createdAt: -1 });

    res.json(sessions);
  } catch (err) {
    logger.error('Erreur lors de la récupération des sessions', err);
    res.status(500).json({ message: err.message });
  }
};

export const getSessionHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = 20;

    const sessions = await Session.find({ user: userId })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Session.countDocuments({ user: userId });

    res.json({
      sessions,
      totalPages: Math.ceil(total / limit),
      currentPage: page
    });
  } catch (err) {
    logger.error('Erreur lors de la récupération de l\'historique des sessions', err);
    res.status(500).json({ message: err.message });
  }
};

export const terminateSession = async (req, res) => {
  try {
    const userId = req.user.id;
    const { sessionId } = req.params;

    const session = await Session.findById(sessionId);
    if (!session || session.user.toString() !== userId) {
      return res.status(404).json({ message: 'Session non trouvée' });
    }

    session.isActive = false;
    await session.save();

    logger.info('Session terminée', { userId, sessionId });
    res.json({ message: 'Session terminée avec succès' });
  } catch (err) {
    logger.error('Erreur lors de la fermeture de la session', err);
    res.status(500).json({ message: err.message });
  }
};

export const terminateAllSessions = async (req, res) => {
  try {
    const userId = req.user.id;

    await Session.updateMany(
      { user: userId },
      { isActive: false }
    );

    logger.info('Toutes les sessions terminées', { userId });
    res.json({ message: 'Toutes les sessions ont été terminées' });
  } catch (err) {
    logger.error('Erreur lors de la fermeture de toutes les sessions', err);
    res.status(500).json({ message: err.message });
  }
};

export const terminateOtherSessions = async (req, res) => {
  try {
    const userId = req.user.id;
    const currentSessionId = req.body.currentSessionId;

    if (!currentSessionId) {
      return res.status(400).json({ message: 'currentSessionId est requis' });
    }

    await Session.updateMany(
      { user: userId, _id: { $ne: currentSessionId } },
      { isActive: false }
    );

    logger.info('Toutes les autres sessions terminées', { userId });
    res.json({ message: 'Toutes les autres sessions ont été terminées' });
  } catch (err) {
    logger.error('Erreur lors de la fermeture des autres sessions', err);
    res.status(500).json({ message: err.message });
  }
};

export const getActiveDevices = async (req, res) => {
  try {
    const userId = req.user.id;
    const devices = await Session.find({ user: userId, isActive: true })
      .select('deviceName ipAddress userAgent lastActivity')
      .sort({ lastActivity: -1 });

    res.json(devices);
  } catch (err) {
    logger.error('Erreur lors de la récupération des appareils actifs', err);
    res.status(500).json({ message: err.message });
  }
};

export const updateLastActivity = async (sessionId) => {
  try {
    await Session.findByIdAndUpdate(sessionId, { lastActivity: new Date() });
  } catch (err) {
    logger.error('Erreur lors de la mise à jour de l\'activité', err);
  }
};
