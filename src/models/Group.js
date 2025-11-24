// src/models/Group.js
import mongoose from 'mongoose';

const groupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  avatar: String,
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: {
      type: String,
      enum: ['admin', 'moderator', 'member'],
      default: 'member'
    },
    joinedAt: { type: Date, default: Date.now }
  }],
  conversation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true
  },
  settings: {
    allowMessagesFromNonMembers: { type: Boolean, default: false },
    requireApprovalForJoin: { type: Boolean, default: false },
    allowMembersToInvite: { type: Boolean, default: true },
    maxMembers: { type: Number, default: null }
  },
  modificationHistory: [{
    action: String,
    modifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    modifiedAt: { type: Date, default: Date.now },
    details: mongoose.Schema.Types.Mixed
  }]
}, {
  timestamps: true
});

// Indexes
groupSchema.index({ conversation: 1 });
groupSchema.index({ creator: 1 });
groupSchema.index({ 'members.user': 1 });

export default mongoose.model('Group', groupSchema);
