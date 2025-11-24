// src/routes/sessions.js
import express from 'express';
import auth from '../middleware/auth.js';
import {
  createSession,
  getSessions,
  getSessionHistory,
  terminateSession,
  terminateAllSessions,
  terminateOtherSessions,
  getActiveDevices
} from '../controllers/sessionController.js';

const router = express.Router();

router.post('/', auth, createSession);
router.get('/', auth, getSessions);
router.get('/history', auth, getSessionHistory);
router.get('/devices', auth, getActiveDevices);
router.delete('/:sessionId', auth, terminateSession);
router.post('/terminate-all', auth, terminateAllSessions);
router.post('/terminate-others', auth, terminateOtherSessions);

export default router;
