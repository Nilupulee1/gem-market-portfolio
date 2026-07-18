export const UserRole = {
  SELLER: 'seller',
  BUYER: 'buyer',
  ADMIN: 'admin',
  OPERATIONAL_MANAGER: 'operational_manager',
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const GemStatus = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  SOLD: 'sold',
  REMOVED: 'removed',
} as const;

export type GemStatus = (typeof GemStatus)[keyof typeof GemStatus];

export const AuctionStatus = {
  ACTIVE: 'active',
  PENDING_PAYMENT: 'pending_payment',
  ENDED: 'ended',
  CANCELLED: 'cancelled',
} as const;

export type AuctionStatus = (typeof AuctionStatus)[keyof typeof AuctionStatus];

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface AuthResponse {
  message: string;
  token: string;
  user: User;
}

export interface Gem {
  _id: string;
  seller: {
    _id: string;
    name: string;
    email: string;
  };
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
  fixedPrice?: number;
  listingDurationDays?: number;
  fixedPriceEndsAt?: string;
  status: GemStatus;
  adminFeedback?: string;
  listingMode?: 'portfolio' | 'direct_sale';
  portfolioVisibility?: 'public' | 'private';
  createdAt: string;
  updatedAt: string;
}

export interface Bid {
  bidder: {
    _id: string;
    name: string;
    email: string;
  };
  amount: number;
  timestamp: string;
}

export interface Auction {
  _id: string;
  gem: Gem;
  seller: {
    _id: string;
    name: string;
    email: string;
  };
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
  startTime: string;
  endTime: string;
  status: AuctionStatus;
  bids: Bid[];
  winner?: {
    _id: string;
    name: string;
    email: string;
  };
  createdAt: string;
}