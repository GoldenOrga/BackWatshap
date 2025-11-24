// src/routes/contacts.js
import express from 'express';
import auth from '../middleware/auth.js';
import {
  addContact,
  getContacts,
  removeContact,
  blockContact,
  unblockContact,
  searchContacts,
  getBlockedContacts
} from '../controllers/contactController.js';

const router = express.Router();

router.post('/', auth, addContact);
router.get('/', auth, getContacts);
router.get('/blocked', auth, getBlockedContacts);
router.get('/search', auth, searchContacts);

// 🔥 Support des deux syntaxes
router.post('/:contactId/block', auth, blockContact);
router.post('/block/:contactId', auth, blockContact);

router.post('/:contactId/unblock', auth, unblockContact);
router.post('/unblock/:contactId', auth, unblockContact);

router.delete('/:contactId', auth, removeContact);

export default router;
