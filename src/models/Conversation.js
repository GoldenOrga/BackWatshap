

import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema({
  name: { 
    type: String,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  avatar: {
    type: String,
    default: null
  },
  participants: [
    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
  ],
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isGroup: {
    type: Boolean,
    default: false
  },
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  unreadCounts: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    count: { type: Number, default: 0 }
  }],
  archivedBy: [
    { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  ],
  mutedBy: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    until: { type: Date, default: null }
  }],
  pinnedMessages: [
    { type: mongoose.Schema.Types.ObjectId, ref: 'Message' }
  ],
  settings: {
    allowNotifications: { type: Boolean, default: true },
    allowMessagesFromUnknown: { type: Boolean, default: false },
    lastReadAt: { type: Date }
  }
}, {
  timestamps: true 
});

// Indexes pour performance
conversationSchema.index({ participants: 1 });
conversationSchema.index({ creator: 1 });
conversationSchema.index({ updatedAt: -1 });

export default mongoose.model('Conversation', conversationSchema);