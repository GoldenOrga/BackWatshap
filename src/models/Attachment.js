// src/models/Attachment.js
import mongoose from 'mongoose';

const attachmentSchema = new mongoose.Schema({
  message: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    required: false
  },
  uploader: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  filename: {
    type: String,
    required: true
  },
  mimetype: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true
  },
  url: {
    type: String,
    required: true
  },
  thumbnailUrl: String,
  type: {
    type: String,
    enum: ['image', 'video', 'audio', 'file'],
    required: true
  },
  metadata: {
    width: Number,
    height: Number,
    duration: Number,
    resolution: String
  }
}, {
  timestamps: true
});

export default mongoose.model('Attachment', attachmentSchema);
