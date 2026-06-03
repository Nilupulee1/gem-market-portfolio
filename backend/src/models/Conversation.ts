import mongoose, { Schema, Document } from 'mongoose';

export interface IConversation extends Document {
  participants: mongoose.Schema.Types.ObjectId[];
  lastMessage?: mongoose.Schema.Types.ObjectId;
  auction?: mongoose.Schema.Types.ObjectId;
  gem?: mongoose.Schema.Types.ObjectId;
  seller: mongoose.Schema.Types.ObjectId;
  buyer: mongoose.Schema.Types.ObjectId;
  unreadCount: {
    sellerUnread: number;
    buyerUnread: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const conversationSchema = new Schema<IConversation>({
  participants: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  lastMessage: {
    type: Schema.Types.ObjectId,
    ref: 'Message'
  },
  auction: {
    type: Schema.Types.ObjectId,
    ref: 'Auction'
  },
  gem: {
    type: Schema.Types.ObjectId,
    ref: 'Gem'
  },
  seller: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  buyer: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  unreadCount: {
    sellerUnread: { type: Number, default: 0 },
    buyerUnread: { type: Number, default: 0 }
  }
}, {
  timestamps: true
});

// Index for efficient queries
conversationSchema.index({ participants: 1 });
conversationSchema.index({ updatedAt: -1 });

export interface IConversationDocument extends IConversation {}

const Conversation = mongoose.model<IConversationDocument>('Conversation', conversationSchema);

export default Conversation;
