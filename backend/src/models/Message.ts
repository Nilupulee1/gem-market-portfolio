import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage extends Document {
  sender: mongoose.Schema.Types.ObjectId;
  content: string;
  conversation: mongoose.Schema.Types.ObjectId;
  auction?: mongoose.Schema.Types.ObjectId;
  gem?: mongoose.Schema.Types.ObjectId;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<IMessage>({
  sender: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000
  },
  conversation: {
    type: Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true
  },
  auction: {
    type: Schema.Types.ObjectId,
    ref: 'Auction'
  },
  gem: {
    type: Schema.Types.ObjectId,
    ref: 'Gem'
  },
  isRead: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for efficient queries
messageSchema.index({ conversation: 1, createdAt: -1 });

export interface IMessageDocument extends IMessage {}

const Message = mongoose.model<IMessageDocument>('Message', messageSchema);

export default Message;
