import { Request, Response } from 'express';
import Message from '../models/Message';
import Conversation from '../models/Conversation';
import Auction from '../models/Auction';
import Gem from '../models/Gem';
import User from '../models/User';
import mongoose from 'mongoose';
import { AuthRequest } from '../middleware/auth';

// Send a message
export const sendMessage = async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  try {
    const { auctionId, gemId, recipientId, content } = authReq.body;
    const senderId = authReq.user?.userId;

    if ((!auctionId && !gemId) || !recipientId || !content || !senderId) {
      return res.status(400).json({ error: 'Missing required fields (requires either auctionId or gemId)' });
    }

    let isSellerOrBuyer = false;
    let sellerId = '';
    let buyerId: string | null = null;
    let messageGemId: string | null = null;

    if (auctionId) {
      // Verify auction exists and user is involved
      const auction = await Auction.findById(auctionId).populate('seller winner gem');
      if (!auction) {
        return res.status(404).json({ error: 'Auction not found' });
      }
      
      sellerId = auction.seller._id ? auction.seller._id.toString() : auction.seller.toString();
      const winnerId = auction.winner ? (auction.winner._id ? auction.winner._id.toString() : auction.winner.toString()) : null;
      buyerId = winnerId || (senderId === sellerId ? recipientId : senderId);
      messageGemId = auction.gem?._id ? auction.gem._id.toString() : auction.gem.toString();

      isSellerOrBuyer = sellerId === senderId || (winnerId === senderId) || recipientId === sellerId;
    } else if (gemId) {
      const gem = await Gem.findById(gemId);
      if (!gem) {
        return res.status(404).json({ error: 'Gem not found' });
      }
      
      sellerId = gem.seller.toString();
      isSellerOrBuyer = sellerId === senderId || recipientId === sellerId;
      // determine buyer (the non-seller participant)
      buyerId = senderId === sellerId ? recipientId : senderId;
      messageGemId = gemId;
    }

    if (!isSellerOrBuyer && !recipientId) {
      return res.status(403).json({ error: 'Not authorized to send message for this item' });
    }

    // Create message
    const message = new Message({
      auction: auctionId ? auctionId as any : undefined,
      gem: messageGemId ? messageGemId as any : undefined,
      sender: senderId,
      content,
      isRead: false,
      conversation: new mongoose.Types.ObjectId() as any
    });

    await message.save();

    // Update or create conversation
    const resolvedBuyer = buyerId || (senderId === sellerId ? recipientId : senderId);
    let query: any = { participants: { $all: [sellerId, resolvedBuyer] } };

    let conversation = await Conversation.findOne(query).sort({ updatedAt: -1 });
    
    if (!conversation) {
      conversation = new Conversation({
        seller: sellerId,
        buyer: resolvedBuyer,
        participants: [sellerId, resolvedBuyer],
        lastMessage: message._id,
        auction: auctionId ? auctionId as any : undefined,
        gem: messageGemId ? messageGemId as any : undefined,
        unreadCount: {
          buyerUnread: senderId === sellerId ? 1 : 0,
          sellerUnread: senderId !== sellerId ? 1 : 0
        }
      });
    } else {
      conversation.lastMessage = message._id as any;

      // Update unread count
      if (senderId === conversation.seller.toString()) {
        conversation.unreadCount.buyerUnread += 1;
      } else {
        conversation.unreadCount.sellerUnread += 1;
      }
    }

    try {
      await conversation.save();
    } catch (err: any) {
      if (err && err.code === 11000) {
        const existing = await Conversation.findOne(query).sort({ updatedAt: -1 });
        if (existing) {
          conversation = existing as any;
        } else {
          throw err;
        }
      } else {
        throw err;
      }
    }
    
    // Now that conversation is saved, correct the conversation reference on the message
    if (!conversation) {
      return res.status(500).json({ error: 'Conversation not available after save' });
    }
    message.conversation = conversation._id as any;
    await message.save();

    // Populate sender info before sending response
    const populatedMessage = await message.populate([
      { path: 'sender', select: 'name email' },
      { path: 'gem', select: 'type name images' },
      { path: 'auction', populate: { path: 'gem', select: 'type name images' } }
    ]);

    res.status(201).json(populatedMessage);
  } catch (error: any) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: error.message || 'Error sending message' });
  }
};

// Get messages for a fixed gem
export const getGemMessages = async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  try {
    const { gemId } = authReq.params;
    const userId = authReq.user?.userId;
    const { recipientId } = authReq.query; // the other person the current user is talking explicitly with
    const { page = 1, limit = 50 } = authReq.query;

    const query: any = recipientId
      ? { participants: { $all: [userId, recipientId] } }
      : { participants: userId };
    
    const conversation = await Conversation.findOne(query).sort({ updatedAt: -1 });

    if (!conversation) {
      return res.json({ messages: [], total: 0 });
    }

    const unreadCount = userId === conversation.seller.toString() 
      ? conversation.unreadCount.sellerUnread 
      : conversation.unreadCount.buyerUnread;

    const messages = await Message.find({ conversation: conversation._id as any })
      .populate('sender', 'name')
      .populate('gem', 'type name images')
      .populate({ path: 'auction', populate: { path: 'gem', select: 'type name images' } })
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    res.json({
      messages: messages.reverse(),
      total: await Message.countDocuments({ conversation: conversation._id as any }),
      totalPages: Math.ceil((await Message.countDocuments({ conversation: conversation._id as any })) / Number(limit)),
      currentPage: Number(page),
      unreadCount
    });
  } catch (error: any) {
    console.error('Error fetching gem messages:', error);
    res.status(500).json({ error: error.message || 'Error fetching gem messages' });
  }
};

// Get messages for an auction
export const getAuctionMessages = async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  try {
    const { auctionId } = authReq.params;
    const userId = authReq.user?.userId;
    const { page = 1, limit = 50 } = authReq.query;

    // Verify user is involved in auction
    const auction = await Auction.findById(auctionId).populate('seller winner gem');
    if (!auction) {
      return res.status(404).json({ error: 'Auction not found' });
    }

    const sellerId = auction.seller._id ? auction.seller._id.toString() : auction.seller.toString();
    const winnerId = auction.winner ? (auction.winner._id ? auction.winner._id.toString() : auction.winner.toString()) : null;
    const isInvolved = sellerId === userId || winnerId === userId;

    if (!isInvolved) {
      return res.status(403).json({ error: 'Not authorized to view messages' });
    }

    const skip = (Number(page) - 1) * Number(limit);
    const conversation = await Conversation.findOne({
      participants: { $all: [sellerId, winnerId || userId] }
    } as any).sort({ updatedAt: -1 });

    if (!conversation) {
      return res.json({
        messages: [],
        pagination: {
          total: 0,
          page: Number(page),
          pages: 0
        }
      });
    }

    const messages = await Message.find({ conversation: conversation._id as any })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate([
        { path: 'sender', select: 'name email' },
        { path: 'gem', select: 'type name images' },
        { path: 'auction', populate: { path: 'gem', select: 'type name images' } }
      ]);

    const totalCount = await Message.countDocuments({ conversation: conversation._id as any });

    res.json({
      messages: messages.reverse(),
      pagination: {
        total: totalCount,
        page: Number(page),
        pages: Math.ceil(totalCount / Number(limit))
      }
    });
  } catch (error: any) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: error.message || 'Error fetching messages' });
  }
};

// Get messages for a conversation
export const getConversationMessages = async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  try {
    const { conversationId } = authReq.params;
    const userId = authReq.user?.userId;
    const { page = 1, limit = 50 } = authReq.query;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Verify user is part of this conversation
    if (!conversation.participants.includes(userId as any)) {
      return res.status(403).json({ error: 'Not authorized to view this conversation' });
    }

    const skip = (Number(page) - 1) * Number(limit);
    const messages = await Message.find({ conversation: conversationId as any })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate([
        { path: 'sender', select: 'name email' },
        { path: 'gem', select: 'type name images' },
        { path: 'auction', populate: { path: 'gem', select: 'type name images' } }
      ]);

    const totalCount = await Message.countDocuments({ conversation: conversationId as any });

    res.json({
      messages: messages.reverse(),
      pagination: {
        total: totalCount,
        page: Number(page),
        pages: Math.ceil(totalCount / Number(limit))
      }
    });
  } catch (error: any) {
    console.error('Error fetching conversation messages:', error);
    res.status(500).json({ error: error.message || 'Error fetching conversation messages' });
  }
};

// Get conversations for current user
export const getUserConversations = async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  try {
    const userId = authReq.user?.userId;

    const conversations = await Conversation.find({
      $or: [{ seller: userId }, { buyer: userId }]
    } as any)
      .populate('seller', 'name email')
      .populate('buyer', 'name email')
      .populate('auction')
      .populate('gem')
      .populate({ path: 'lastMessage', populate: [
        { path: 'sender', select: 'name email' },
        { path: 'gem', select: 'type name images' },
        { path: 'auction', populate: { path: 'gem', select: 'type name images' } }
      ] })
      .sort({ updatedAt: -1 });

    res.json(conversations);
  } catch (error: any) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: error.message || 'Error fetching conversations' });
  }
};

// Mark messages as read
export const markMessagesAsRead = async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  try {
    const { auctionId, senderId, conversationId, gemId } = authReq.body;
    const userId = authReq.user?.userId;

    let conversation = null as any;

    if (conversationId) {
      conversation = await Conversation.findById(conversationId);
    } else if (auctionId) {
      conversation = await Conversation.findOne({
        auction: auctionId as any,
        participants: { $all: [userId, senderId] }
      } as any);
    } else if (gemId) {
      conversation = await Conversation.findOne({
        gem: gemId as any,
        participants: { $all: [userId, senderId] }
      } as any);
    }

    if (!conversation) {
      return res.json({ success: true });
    }

    // Update messages
    const unreadFilter: any = {
      conversation: conversation._id as any,
      sender: { $ne: userId },
      isRead: false,
    };

    await Message.updateMany(unreadFilter, { isRead: true });

    // Update conversation unread count
    if (userId === conversation.seller.toString()) {
      conversation.unreadCount.sellerUnread = 0;
    } else if (userId === conversation.buyer.toString()) {
      conversation.unreadCount.buyerUnread = 0;
    }

    await conversation.save();

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({ error: error.message || 'Error marking messages as read' });
  }
};

// Get unread message count
export const getUnreadCount = async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  try {
    const userId = authReq.user?.userId;

    const conversations = await Conversation.find({
      $or: [
        { seller: userId },
        { buyer: userId }
      ]
    } as any);

    let totalUnread = 0;
    conversations.forEach((conv) => {
      if (conv.seller.toString() === userId) {
        totalUnread += conv.unreadCount.sellerUnread;
      } else {
        totalUnread += conv.unreadCount.buyerUnread;
      }
    });

    res.json({ unreadCount: totalUnread });
  } catch (error: any) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ error: error.message || 'Error fetching unread count' });
  }
};

// Delete a message (only sender can delete)
export const deleteMessage = async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  try {
    const { messageId } = authReq.params;
    const userId = authReq.user?.userId;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    if (message.sender.toString() !== userId) {
      return res.status(403).json({ error: 'Not authorized to delete this message' });
    }

    await Message.deleteOne({ _id: messageId });
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting message:', error);
    res.status(500).json({ error: error.message || 'Error deleting message' });
  }
};
