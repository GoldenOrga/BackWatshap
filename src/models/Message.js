

import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, 
  conversation: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Conversation', 
    required: true 
  },
  content: { type: String, required: true, maxlength: 5000 },
  status: { type: String, enum: ['sent', 'received', 'read'], default: 'sent' },
  edited: { type: Boolean, default: false },
  deleted: { type: Boolean, default: false }
}, {
  timestamps: true
});

export default mongoose.model('Message', messageSchema);