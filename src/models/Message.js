

import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  sender: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  receiver: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  conversation: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Conversation', 
    required: true 
  },
  content: { 
    type: String, 
    maxlength: 5000 
  },
  type: {
    type: String,
    enum: ['text', 'image', 'video', 'audio', 'file', 'system'],
    default: 'text'
  },
  attachments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Attachment'
  }],
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    default: null
  },
  reactions: [{
    emoji: String,
    users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
  }],
  status: { 
    type: String, 
    enum: ['pending', 'sent', 'delivered', 'read'], 
    default: 'pending' 
  },
  readBy: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    readAt: { type: Date, default: Date.now }
  }],
  deliveredBy: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deliveredAt: { type: Date, default: Date.now }
  }],
  edited: { type: Boolean, default: false },
  editedAt: { type: Date, default: null },
  editHistory: [{
    content: String,
    editedAt: { type: Date, default: Date.now }
  }],
  deleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },
  isPinned: { type: Boolean, default: false },
  isTemporary: { type: Boolean, default: false },
  expiresAt: { type: Date, default: null }
}, {
  timestamps: true
});

// Indexes pour performance
messageSchema.index({ conversation: 1, createdAt: -1 });
messageSchema.index({ sender: 1 });
messageSchema.index({ status: 1 });
messageSchema.index({ createdAt: -1 });
messageSchema.index({ expiresAt: 1 }, { sparse: true });

export default mongoose.model('Message', messageSchema);