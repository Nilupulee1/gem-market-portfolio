import express from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roleAuth';
import { UserRole } from '../types';
import {
  getPendingGems,
  reviewGem,
  getAllUsers,
  getStatistics,
  getAllAuctions
} from '../controllers/adminController';

const router = express.Router();

router.use(authenticate, requireRole(UserRole.ADMIN));

router.get('/gems/pending', getPendingGems);
router.post('/gems/review', reviewGem);
router.get('/users', getAllUsers);
router.get('/statistics', getStatistics);
router.get('/auctions', getAllAuctions);

export default router;