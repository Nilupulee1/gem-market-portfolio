import express from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/roleAuth';
import { upload } from '../middleware/upload';
import { UserRole } from '../types';
import {
  createGem,
  getMyGems,
  getApprovedGems,
  getGemById,
  updateGem,
  deleteGem
} from '../controllers/gemController';

const router = express.Router();

// Create gem with file uploads
router.post(
  '/',
  authenticate,
  requireRole(UserRole.SELLER),
  upload.fields([
    { name: 'images', maxCount: 5 },
    { name: 'certificate', maxCount: 1 }
  ]),
  createGem
);

// Get seller's own gems
router.get('/my-gems', authenticate, requireRole(UserRole.SELLER), getMyGems);

// Get all approved gems (accessible by all authenticated users)
router.get('/approved', authenticate, getApprovedGems);

// Get specific gem by ID
router.get('/:id', authenticate, getGemById);

// Update gem
router.patch(
  '/:id',
  authenticate,
  requireRole(UserRole.SELLER),
  upload.fields([
    { name: 'images', maxCount: 5 },
    { name: 'certificate', maxCount: 1 }
  ]),
  updateGem
);

// Delete gem
router.delete('/:id', authenticate, requireRole(UserRole.SELLER), deleteGem);

export default router;