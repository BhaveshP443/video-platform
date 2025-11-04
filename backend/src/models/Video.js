import mongoose from 'mongoose';

const videoSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },

  // ✅ Cloudinary-compatible fields
  path: {
    type: String, // Cloudinary URL or local file path
    required: true
  },
  cloudinaryId: {
    type: String, // Cloudinary public ID (for deleting)
  },
  thumbnail: {
    type: String, // Thumbnail URL
  },

  // ✅ Keep local fields optional for backward compatibility
  filename: {
    type: String,
    required: false // was required before
  },
  originalName: {
    type: String,
    required: false // was required before
  },

  size: {
    type: Number,
    required: false // Cloudinary sometimes doesn't return exact file size
  },
  duration: {
    type: Number,
    default: 0
  },
  mimeType: {
    type: String,
    required: true
  },

  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  tenantId: {
    type: String,
    required: true
  },

  status: {
    type: String,
    enum: ['uploading', 'processing', 'completed', 'failed'],
    default: 'uploading'
  },
  sensitivityStatus: {
    type: String,
    enum: ['pending', 'safe', 'flagged'],
    default: 'pending'
  },
  processingProgress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  flagReason: {
    type: String,
    default: ''
  }
}, { timestamps: true });

// ✅ Helpful indexes for performance
videoSchema.index({ userId: 1, tenantId: 1 });
videoSchema.index({ status: 1 });
videoSchema.index({ sensitivityStatus: 1 });

export default mongoose.model('Video', videoSchema);
