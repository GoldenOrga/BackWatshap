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
router.delete('/:contactId', auth, removeContact);
router.post('/:contactId/block', auth, blockContact);
router.post('/:contactId/unblock', auth, unblockContact);

export default router;
