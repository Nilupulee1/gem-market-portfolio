import express from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roleAuth';
import { UserRole } from '../types';
import {
  createAuction,
  createPayHereCheckout,
  retryPayHereCheckout,
  payHereNotify,
  placeBid,
  getActiveAuctions,
  getMyAuctions,
  getAuctionById,
  deleteAuction,
  updateAuctionStatus
} from '../controllers/auctionController';

const router = express.Router();

// PayHere sandbox callback
router.post('/payhere/notify', payHereNotify);

// Create PayHere checkout session (seller only)
router.post('/payhere/initiate', authenticate, requireRole(UserRole.SELLER), createPayHereCheckout);

// Retry PayHere checkout for an existing pending auction (seller only)
router.post('/:id/payhere/retry', authenticate, requireRole(UserRole.SELLER), retryPayHereCheckout);

// Create auction (seller only)
router.post('/', authenticate, requireRole(UserRole.SELLER), createAuction);

// Place bid (buyer only)
router.post('/bid', authenticate, requireRole(UserRole.BUYER), placeBid);

// Get all active auctions (all authenticated users)
router.get('/active', authenticate, getActiveAuctions);

// Get my auctions (seller only)
router.get('/my-auctions', authenticate, requireRole(UserRole.SELLER), getMyAuctions);

// Get specific auction by ID
router.get('/:id', authenticate, getAuctionById);

// Delete auction (seller only)
router.delete('/:id', authenticate, requireRole(UserRole.SELLER), deleteAuction);

// Update auction status (seller or admin)
router.patch('/:id/status', authenticate, updateAuctionStatus);

export default router;