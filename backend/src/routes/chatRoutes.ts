import express, { Router } from 'express';
import * as chatController from '../controllers/chatController';
import { authenticate } from '../middleware/auth';

const router: Router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// Message routes
router.post('/send', chatController.sendMessage);
router.get('/conversation/:conversationId', chatController.getConversationMessages);
router.get('/auction/:auctionId', chatController.getAuctionMessages);
router.get('/gem/:gemId', chatController.getGemMessages);
router.delete('/:messageId', chatController.deleteMessage);

// Conversation routes
router.get('/conversations', authenticate, chatController.getUserConversations);
router.post('/mark-read', chatController.markMessagesAsRead);

// Unread count
router.get('/unread/count', chatController.getUnreadCount);

export default router;
