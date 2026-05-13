import { Request, Response } from 'express';
import Message from '../models/Message';
import Conversation from '../models/Conversation';
import Auction from '../models/Auction';
import Gem from '../models/Gem';
import User from '../models/User';
import mongoose from 'mongoose';
import { AuthRequest } from '../middleware/auth';

// Send a message
export const sendMessage = async (req: AuthRequest, res: Response) => {
  try {
    const { auctionId, gemId, recipientId, content } = req.body;
    const senderId = req.user?.userId;

    if ((!auctionId && !gemId) || !recipientId || !content || !senderId) {
      return res.status(400).json({ error: 'Missing required fields (requires either auctionId or gemId)' });
    }

    let isSellerOrBuyer = false;
    let sellerId = '';
    let winnerId = null;

    if (auctionId) {
      // Verify auction exists and user is involved
      const auction = await Auction.findById(auctionId).populate('seller winner');
      if (!auction) {
        return res.status(404).json({ error: 'Auction not found' });
      }
      
      sellerId = auction.seller._id ? auction.seller._id.toString() : auction.seller.toString();
      winnerId = auction.winner ? (auction.winner._id ? auction.winner._id.toString() : auction.winner.toString()) : null;

      isSellerOrBuyer = sellerId === senderId || (winnerId === senderId) || recipientId === sellerId;
    } else if (gemId) {
      const gem = await Gem.findById(gemId);
      if (!gem) {
        return res.status(404).json({ error: 'Gem not found' });
      }
      
      sellerId = gem.seller.toString();
      isSellerOrBuyer = sellerId === senderId || recipientId === sellerId;
    }

    if (!isSellerOrBuyer && !recipientId) {
      return res.status(403).json({ error: 'Not authorized to send message for this item' });
    }

    // Create message
    const message = new Message({
      auction: auctionId ? auctionId as any : undefined,
      gem: gemId ? gemId as any : undefined,
      sender: senderId,
      content,
      isRead: false,
      conversation: new mongoose.Types.ObjectId() as any
    });

    await message.save();

    // Update or create conversation
    let query: any = {};
    if (auctionId) {
      query = { auction: auctionId as any };
    } else {
      query = { gem: gemId as any, $or: [{ participants: senderId }, { participants: recipientId }] };
    }

    let conversation = await Conversation.findOne(query);
    
    if (!conversation) {
      conversation = new Conversation({
        auction: auctionId ? auctionId as any : undefined,
        gem: gemId ? gemId as any : undefined,
        seller: sellerId,
        participants: [senderId, recipientId],
        buyer: winnerId || (senderId === sellerId ? recipientId : senderId),
        lastMessage: message._id,
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

    await conversation.save();
    
    // Now that conversation is saved, correct the conversation reference on the message
    message.conversation = conversation._id as any;
    await message.save();

    // Populate sender info before sending response
    const populatedMessage = await message.populate([
      { path: 'sender', select: 'name email' }
    ]);

    res.status(201).json(populatedMessage);
  } catch (error: any) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: error.message || 'Error sending message' });
  }
};

// Get messages for a fixed gem
export const getGemMessages = async (req: AuthRequest, res: Response) => {
  try {
    const { gemId } = req.params;
    const userId = req.user?.userId;
    const { recipientId } = req.query; // the other person the current user is talking explicitly with
    const { page = 1, limit = 50 } = req.query;

    let query: any = { gem: gemId as any };
    
    // Narrow down finding the right conversation if recipientId is present
    if (recipientId) {
       query.participants = { $all: [userId, recipientId] };
    } else {
       // if no recipient explicitly told, at least the conversation for the current user
       query.participants = userId;
    }
    
    const conversation = await Conversation.findOne(query);

    if (!conversation) {
      return res.json({ messages: [], total: 0 });
    }

    const unreadCount = userId === conversation.seller.toString() 
      ? conversation.unreadCount.sellerUnread 
      : conversation.unreadCount.buyerUnread;

    const messages = await Message.find({ conversation: conversation._id as any })
      .populate('sender', 'name')
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
export const getAuctionMessages = async (req: AuthRequest, res: Response) => {
  try {
    const { auctionId } = req.params;
    const userId = req.user?.userId;
    const { page = 1, limit = 50 } = req.query;

    // Verify user is involved in auction
    const auction = await Auction.findById(auctionId);
    if (!auction) {
      return res.status(404).json({ error: 'Auction not found' });
    }

    const isInvolved = 
      auction.seller.toString() === userId || 
      (auction.winner && auction.winner.toString() === userId);

    if (!isInvolved) {
      return res.status(403).json({ error: 'Not authorized to view messages' });
    }

    const skip = (Number(page) - 1) * Number(limit);
    const messages = await Message.find({ auction: auctionId as any })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate([
        { path: 'sender', select: 'name email' }
      ]);

    const totalCount = await Message.countDocuments({ auction: auctionId as any });

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

// Get conversations for current user
export const getUserConversations = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    const conversations = await Conversation.find({
      $or: [{ seller: userId }, { buyer: userId }]
    } as any)
      .populate('seller', 'name email')
      .populate('buyer', 'name email')
      .populate('auction', 'gem startPrice currentBid')
      .populate('gem', 'name type')
      .populate({ path: 'lastMessage', populate: { path: 'sender', select: 'name email' } })
      .sort({ updatedAt: -1 });

    res.json(conversations);
  } catch (error: any) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: error.message || 'Error fetching conversations' });
  }
};

// Mark messages as read
export const markMessagesAsRead = async (req: AuthRequest, res: Response) => {
  try {
    const { auctionId, senderId } = req.body;
    const userId = req.user?.userId;

    // Update messages
    await Message.updateMany(
      { 
        auction: auctionId as any, 
        sender: senderId,
        // recipientId cannot be checked directly in Message model since there's no recipientId field.
        // Assuming conversation check is handled upstream
        isRead: false 
      },
      { isRead: true }
    );

    // Update conversation unread count
    const conversation = await Conversation.findOne({ auction: auctionId as any });
    if (conversation) {
      if (userId === conversation.seller.toString()) {
        conversation.unreadCount.sellerUnread = 0;
      } else {
        conversation.unreadCount.buyerUnread = 0;
      }
      await conversation.save();
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({ error: error.message || 'Error marking messages as read' });
  }
};

// Get unread message count
export const getUnreadCount = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

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
export const deleteMessage = async (req: AuthRequest, res: Response) => {
  try {
    const { messageId } = req.params;
    const userId = req.user?.userId;

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
