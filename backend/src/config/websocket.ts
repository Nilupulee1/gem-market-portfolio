import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import Message from '../models/Message';
import Conversation, { IConversationDocument } from '../models/Conversation';
import Auction from '../models/Auction';
import Gem from '../models/Gem';
import { Types } from 'mongoose';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: string;
}

interface MessagePayload {
  auctionId?: string;
  gemId?: string;
  recipientId?: string;
  content: string;
}

// Store active users
const activeUsers = new Map<string, string>(); // userId -> socketId

export const setupWebSocket = (httpServer: HTTPServer) => {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
        if (!origin || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
          callback(null, true);
        } else {
          callback(new Error('CORS error'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST']
    }
  });

  // Middleware for authentication
  io.use((socket: Socket, next: (err?: Error) => void) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      (socket as AuthenticatedSocket).userId = decoded.userId || decoded.id;
      (socket as AuthenticatedSocket).userRole = decoded.role;
      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`User connected: ${socket.userId} with socket ${socket.id}`);
    
    // Track active user
    if (socket.userId) {
      activeUsers.set(socket.userId, socket.id);
      socket.join(`user_${socket.userId}`);
      io.emit('user_online', { userId: socket.userId });
    }

    // Join auction room
    socket.on('join_auction', (auctionId: string) => {
      const room = `auction_${auctionId}`;
      socket.join(room);
      const roomSize = io.sockets.adapter.rooms.get(room)?.size || 0;
      console.log(`✅ User ${socket.userId} joined room ${room} (total: ${roomSize} clients)`);
      
      socket.to(room).emit('user_in_chat', { 
        userId: socket.userId,
        status: 'online'
      });
    });

    // Join gem room
    socket.on('join_gem', (gemId: string) => {
      const room = `gem_${gemId}`;
      socket.join(room);
      const roomSize = io.sockets.adapter.rooms.get(room)?.size || 0;
      console.log(`✅ User ${socket.userId} joined room ${room} (total: ${roomSize} clients)`);
      
      socket.to(room).emit('user_in_chat', { 
        userId: socket.userId,
        status: 'online'
      });
    });

    // Leave auction room
    socket.on('leave_auction', (auctionId: string) => {
      const room = `auction_${auctionId}`;
      socket.leave(room);
      const roomSize = io.sockets.adapter.rooms.get(room)?.size || 0;
      console.log(`❌ User ${socket.userId} left room ${room} (remaining: ${roomSize} clients)`);
      
      socket.to(room).emit('user_in_chat', {
        userId: socket.userId,
        status: 'offline'
      });
    });

    // Leave gem room
    socket.on('leave_gem', (gemId: string) => {
      const room = `gem_${gemId}`;
      socket.leave(room);
      const roomSize = io.sockets.adapter.rooms.get(room)?.size || 0;
      console.log(`❌ User ${socket.userId} left room ${room} (remaining: ${roomSize} clients)`);
      
      socket.to(room).emit('user_in_chat', {
        userId: socket.userId,
        status: 'offline'
      });
    });

    // Listen for user disconnection
    socket.on('disconnect', () => {
      if (socket.userId) {
        activeUsers.delete(socket.userId);
        io.emit('user_offline', { userId: socket.userId });
        console.log(`User disconnected: ${socket.userId}`);
      }
    });

    // Handle starting a new conversation
    socket.on('start_conversation', async (data: { recipientId: string; gemId?: string }) => {
      const { recipientId } = data;
      const senderId = socket.userId;

      if (!senderId || !recipientId) {
        socket.emit('error', { message: 'Invalid user IDs' });
        return;
      }

      try {
        let conversation: any = await Conversation.findOne({ participants: { $all: [senderId, recipientId] } } as any).sort({ updatedAt: -1 });

        if (!conversation) {
          conversation = new Conversation({ participants: [senderId, recipientId] } as any);
          try {
            await conversation.save();
          } catch (err: any) {
            if (err && err.code === 11000) {
              const existing = await Conversation.findOne({ participants: { $all: [senderId, recipientId] } } as any).sort({ updatedAt: -1 });
              if (existing) {
                conversation = existing as any;
              } else {
                throw err;
              }
            } else {
              throw err;
            }
          }
        }

        socket.emit('conversation_started', { conversationId: conversation._id });

        // Notify the recipient if they are online
        const recipientSocketId = activeUsers.get(recipientId);
        if (recipientSocketId) {
          io.to(recipientSocketId).emit('new_conversation', { conversationId: conversation._id, from: senderId });
        }
      } catch (error) {
        socket.emit('error', { message: 'Failed to start conversation' });
      }
    });

    // Handle incoming messages (for both auction, gem and direct)
    socket.on('send_message', async (data: MessagePayload) => {
        try {
            const { auctionId, gemId, recipientId, content } = data;
            const senderId = socket.userId;

            if (!senderId || !content?.trim()) {
                socket.emit('error', { message: 'Invalid message data - missing sender or content' });
                return;
            }

            const hasValidAuctionId = auctionId && typeof auctionId === 'string' && auctionId.trim();
            const hasValidGemId = gemId && typeof gemId === 'string' && gemId.trim();
            const hasRecipientId = recipientId && typeof recipientId === 'string' && recipientId.trim();

            if (!hasValidAuctionId && !hasValidGemId && !hasRecipientId) {
                socket.emit('error', { message: 'Invalid message data - missing auctionId, gemId or recipientId' });
                return;
            }

            let sellerId = '';
            let buyerId = '';
            let messageGemId: string | undefined;

            if (auctionId && typeof auctionId === 'string' && auctionId.trim()) {
                const auction = await Auction.findById(auctionId).populate('seller winner gem');
                if (!auction) {
                  socket.emit('error', { message: 'Auction not found' });
                  return;
                }

                sellerId = auction.seller._id ? auction.seller._id.toString() : auction.seller.toString();
                const winnerId = auction.winner ? (auction.winner._id ? auction.winner._id.toString() : auction.winner.toString()) : null;
                buyerId = (winnerId || (senderId === sellerId ? recipientId : senderId)) || recipientId || senderId;
                messageGemId = auction.gem?._id ? auction.gem._id.toString() : auction.gem.toString();
              } else if (gemId && typeof gemId === 'string' && gemId.trim()) {
                const gem = await Gem.findById(gemId as any);
                if (!gem) {
                  socket.emit('error', { message: 'Gem not found' });
                  return;
                }

                sellerId = gem.seller.toString();
                buyerId = (senderId === sellerId ? recipientId : senderId) || recipientId || senderId;
                messageGemId = gemId;
              } else if (recipientId) {
                sellerId = senderId;
                buyerId = recipientId;
              }

            const participants = sellerId && buyerId ? [sellerId, buyerId] : [senderId, recipientId];
            let conversation: any = await Conversation.findOne({ participants: { $all: participants } } as any).sort({ updatedAt: -1 });

            if (!conversation) {
                conversation = new Conversation({
                  seller: sellerId || senderId,
                  buyer: buyerId || recipientId,
                  participants,
                  auction: auctionId ? auctionId as any : undefined,
                  gem: messageGemId ? messageGemId as any : undefined,
                  unreadCount: {
                    sellerUnread: senderId === (sellerId || senderId) ? 0 : 1,
                    buyerUnread: senderId === (sellerId || senderId) ? 1 : 0
                  }
                } as any);
                try {
                  await conversation.save();
                } catch (err: any) {
                  if (err && err.code === 11000) {
                    const existing = await Conversation.findOne({ participants: { $all: participants } } as any).sort({ updatedAt: -1 });
                    if (existing) {
                      conversation = existing as any;
                    } else {
                      throw err;
                    }
                  } else {
                    throw err;
                  }
                }
            }

            const newMessage = new Message({
                sender: senderId,
                content,
                conversation: conversation ? conversation._id : undefined,
                auction: auctionId ? auctionId as any : undefined,
                gem: messageGemId ? messageGemId as any : undefined,
            });

            await newMessage.save();
            if (conversation.seller.toString() === senderId) {
              conversation.unreadCount.buyerUnread += 1;
            } else {
              conversation.unreadCount.sellerUnread += 1;
            }
            conversation.lastMessage = newMessage._id as any;
            try {
              await conversation.save();
            } catch (err: any) {
              if (err && err.code === 11000) {
                const existing = await Conversation.findOne({ participants: { $all: participants } } as any).sort({ updatedAt: -1 });
                if (existing) {
                  conversation = existing;
                } else {
                  throw err;
                }
              } else {
                throw err;
              }
            }

            const populatedMessage = await Message.findById(newMessage._id)
              .populate('sender', 'name email')
              .populate('gem', 'type name images')
              .populate({ path: 'auction', populate: { path: 'gem', select: 'type name images' } });

            console.log(`Message from ${senderId} to ${recipientId}:`, { auctionId, gemId });

            // Emit to room(s)
            if (auctionId && typeof auctionId === 'string' && auctionId.trim()) {
                const room = `auction_${auctionId}`;
                const roomSize = io.sockets.adapter.rooms.get(room)?.size || 0;
                console.log(`Emitting to room: ${room} (${roomSize} clients in room)`);
                io.to(room).emit('receive_message', populatedMessage);
            }
            if (gemId && typeof gemId === 'string' && gemId.trim()) {
                const room = `gem_${gemId}`;
                const roomSize = io.sockets.adapter.rooms.get(room)?.size || 0;
                console.log(`Emitting to room: ${room} (${roomSize} clients in room)`);
                io.to(room).emit('receive_message', populatedMessage);
            }

            // Always emit to the recipient's personal room so delivery works on any page.
            if (recipientId) {
              const recipientRoom = `user_${recipientId}`;
              console.log(`Emitting directly to recipient room: ${recipientRoom}`);
              io.to(recipientRoom).emit('new_message_notification', {
                auctionId,
                gemId,
                senderId: socket.userId,
                senderName: (populatedMessage as any)?.sender?.name,
                preview: content.substring(0, 50)
              });
              io.to(recipientRoom).emit('receive_message', populatedMessage);
            }
            
            // Emit back to sender for confirmation
            console.log(`Sending confirmation to sender: ${socket.userId}`);
            socket.emit('receive_message', populatedMessage);
        } catch (error) {
            console.error('Error sending message:', error);
            socket.emit('error', { message: 'Failed to send message' });
        }
    });

    // Handle typing indicator
    socket.on('user_typing', (data: { auctionId: string; isTyping: boolean }) => {
      const room = `auction_${data.auctionId}`;
      socket.to(room).emit('user_typing', {
        userId: socket.userId,
        isTyping: data.isTyping
      });
    });

    // Handle message read receipts
    socket.on('mark_as_read', async (data: { auctionId: string; senderId: string }) => {
      try {
        if (!socket.userId) return;

        const filter: any = {
          auction: new Types.ObjectId(data.auctionId),
          participants: { $all: [socket.userId, data.senderId] }
        };
        let conversation: any = await Conversation.findOne<IConversationDocument>(filter);

        if (!conversation) {
          return;
        }

        const updateFilter: any = {
          conversation: conversation._id,
          sender: new Types.ObjectId(data.senderId),
          isRead: false
        };
        await Message.updateMany(
          updateFilter,
          { $set: { isRead: true } }
        );

        // Update conversation unread count
        if (socket.userId === conversation.seller.toString()) {
          conversation.unreadCount.sellerUnread = 0;
        } else if (socket.userId === conversation.buyer.toString()) {
          conversation.unreadCount.buyerUnread = 0;
        }
        try {
          await conversation.save();
        } catch (err: any) {
          if (err && err.code === 11000) {
            const existing = await Conversation.findOne({ auction: data.auctionId as any, participants: { $all: [socket.userId, data.senderId] } });
            if (existing) {
              conversation = existing as any;
            } else {
              throw err;
            }
          } else {
            throw err;
          }
        }

        if (!conversation) return;

        const room = `auction_${data.auctionId}`;
        io.to(room).emit('messages_read', {
          recipientId: socket.userId,
          senderId: data.senderId,
          conversationId: conversation._id
        });
      } catch (error) {
        console.error('Error marking messages as read:', error);
      }
    });

    // Handle errors
    socket.on('error', (error: Error) => {
      console.error('Socket error:', error);
    });
  });

  return io;
};

export { activeUsers };
