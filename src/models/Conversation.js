

import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema({
  name: { 
    type: String,
    trim: true
  },
  participants: [
    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
  ],
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  
  unreadCounts: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    count: { type: Number, default: 0 }
  }]
}, {
  timestamps: true 
});

export default mongoose.model('Conversation', conversationSchema);