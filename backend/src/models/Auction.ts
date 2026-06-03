import mongoose, { Schema } from 'mongoose';
import { IAuction, AuctionStatus } from '../types';

const auctionSchema = new Schema<IAuction>({
  gem: {
    type: Schema.Types.ObjectId,
    ref: 'Gem',
    required: true
  },
  seller: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  startPrice: {
    type: Number,
    required: true,
    min: 0
  },
  currentBid: {
    type: Number,
    default: 0
  },
  minimumBidIncrement: {
    type: Number,
    required: true,
    min: 1
  },
  listingPlacementFeePercent: {
    type: Number,
    required: true,
    min: 0
  },
  listingPlacementFee: {
    type: Number,
    required: true,
    min: 0
  },
  paymentConfirmed: {
    type: Boolean,
    default: false
  },
  paymentMethod: {
    type: String,
    enum: ['payhere-sandbox'],
    default: 'payhere-sandbox'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending'
  },
  paymentOrderId: {
    type: String
  },
  paymentTransactionId: {
    type: String
  },
  paymentCurrency: {
    type: String,
    default: 'LKR'
  },
  paymentAmount: {
    type: Number,
    min: 0
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: Object.values(AuctionStatus),
    default: AuctionStatus.ACTIVE
  },
  bids: [{
    bidder: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  winner: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

export default mongoose.model<IAuction>('Auction', auctionSchema);