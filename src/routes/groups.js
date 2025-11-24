// src/routes/groups.js
import express from 'express';
import auth from '../middleware/auth.js';
import {
  createGroup,
  getGroupInfo,
  updateGroup,
  addMember,
  removeMember,
  setMemberRole,
  getGroupMembers,
  leaveGroup
} from '../controllers/groupController.js';

const router = express.Router();

// Routes
router.post('/', auth, createGroup);
router.get('/:groupId', auth, getGroupInfo);
router.put('/:groupId', auth, updateGroup);
router.post('/:groupId/members', auth, addMember);
router.delete('/:groupId/members/:memberId', auth, removeMember);
router.put('/:groupId/members/:memberId/role', auth, setMemberRole);
router.get('/:groupId/members', auth, getGroupMembers);
router.post('/:groupId/leave', auth, leaveGroup);

export default router;
