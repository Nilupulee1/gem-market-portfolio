import express from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roleAuth';
import { UserRole } from '../types';
import {
  getPendingGems,
  reviewGem,
  getAllUsers,
  createAdminOrManager,
  getStatistics,
  getAllAuctions,
  getRecentActivity,
  getChatPartners
} from '../controllers/adminController';

const router = express.Router();

// All admin routes require authentication
router.use(authenticate);

// ── Governance (System Admin only) ──────────────────────────────────────────
router.get('/users',          requireRole(UserRole.ADMIN), getAllUsers);
router.post('/users/create',  requireRole(UserRole.ADMIN), createAdminOrManager);

// ── Operations (Admin + Operational Manager) ─────────────────────────────────
const opRoles = requireRole(UserRole.ADMIN, UserRole.OPERATIONAL_MANAGER);

router.get('/gems/pending',   opRoles, getPendingGems);
router.post('/gems/review',   opRoles, reviewGem);
router.get('/statistics',     opRoles, getStatistics);
router.get('/auctions',       opRoles, getAllAuctions);
router.get('/activity',       opRoles, getRecentActivity);
router.get('/chat-partners',  opRoles, getChatPartners);

export default router;