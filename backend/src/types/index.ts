import { Document, Types } from 'mongoose';

export enum UserRole {
  SELLER = 'seller',
  BUYER = 'buyer',
  ADMIN = 'admin'
}

export enum GemStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected'
}

export enum AuctionStatus {
  ACTIVE = 'active',
  PENDING_PAYMENT = 'pending_payment',
  ENDED = 'ended',
  CANCELLED = 'cancelled'
}

export enum PaymentMethod {
  SANDBOX = 'sandbox'
}

export interface IUser extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  isVerified: boolean;
  passwordResetToken?: string | null;
  passwordResetExpiry?: Date | null;
  createdAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

export interface IGem extends Document {
  _id: Types.ObjectId;
  seller: Types.ObjectId;
  type: string;
  carat: number;
  cut: string;
  clarity: string;
  color: string;
  origin: string;
  description: string;
  images: string[];
  certificate: {
    url: string;
    mimeType?: string;
    accessUrl?: string;
    authority: string;
    certificateNumber: string;
  };
  status: GemStatus;
  adminFeedback?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IBid {
  bidder: Types.ObjectId;
  amount: number;
  timestamp: Date;
}

export interface IAuction extends Document {
  _id: Types.ObjectId;
  gem: Types.ObjectId;
  seller: Types.ObjectId;
  startPrice: number;
  currentBid: number;
  minimumBidIncrement: number;
  listingPlacementFeePercent: number;
  listingPlacementFee: number;
  paymentConfirmed: boolean;
  paymentMethod: string;
  paymentStatus: 'pending' | 'completed' | 'failed';
  paymentOrderId?: string;
  paymentTransactionId?: string;
  paymentCurrency?: string;
  paymentAmount?: number;
  startTime: Date;
  endTime: Date;
  status: AuctionStatus;
  bids: IBid[];
  winner?: Types.ObjectId;
  createdAt: Date;
}

export interface JWTPayload {
  userId: string;
  role: UserRole;
}