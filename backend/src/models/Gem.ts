import mongoose, { Schema } from 'mongoose';
import { IGem, GemStatus } from '../types';

const gemSchema = new Schema<IGem>({
  seller: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    required: true
  },
  carat: {
    type: Number,
    required: true,
    min: 0
  },
  cut: {
    type: String,
    required: true
  },
  clarity: {
    type: String,
    required: true
  },
  color: {
    type: String,
    required: true
  },
  origin: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  images: [{
    type: String,
    required: true
  }],
  certificate: {
    url: {
      type: String,
      required: true
    },
    mimeType: {
      type: String
    },
    authority: {
      type: String,
      required: true
    },
    certificateNumber: {
      type: String,
      required: true
    }
  },
  status: {
    type: String,
    enum: Object.values(GemStatus),
    default: GemStatus.PENDING
  },
  adminFeedback: String
}, {
  timestamps: true
});

export default mongoose.model<IGem>('Gem', gemSchema);