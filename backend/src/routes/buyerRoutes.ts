import express from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roleAuth';
import { UserRole } from '../types';
import {
  getBuyerDashboard,
  getMyBidHistory,
  getMyActiveBids,
  getWonAuctions
} from '../controllers/buyerController';

const router = express.Router();

router.use(authenticate, requireRole(UserRole.BUYER));

router.get('/dashboard', getBuyerDashboard);
router.get('/bid-history', getMyBidHistory);
router.get('/active-bids', getMyActiveBids);
router.get('/won-auctions', getWonAuctions);

export default router;
