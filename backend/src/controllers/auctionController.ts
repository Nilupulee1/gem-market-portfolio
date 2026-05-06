import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Auction from '../models/Auction';
import Gem from '../models/Gem';
import { AuctionStatus, GemStatus } from '../types';

export const createAuction = async (req: AuthRequest, res: Response) => {
  try {
    console.log('📦 Creating auction with data:', req.body);
    
    const { gemId, startPrice, minimumBidIncrement, startTime, endTime } = req.body;

    // Verify gem exists and is approved
    const gem = await Gem.findById(gemId);
    if (!gem) {
      return res.status(404).json({ message: 'Gem not found' });
    }

    if (gem.status !== GemStatus.APPROVED) {
      return res.status(400).json({ message: 'Only approved gems can be auctioned' });
    }

    if (gem.seller.toString() !== req.user!.userId) {
      return res.status(403).json({ message: 'You can only auction your own gems' });
    }

    // Check if gem already has an active auction
    const existingAuction = await Auction.findOne({ 
      gem: gemId, 
      status: AuctionStatus.ACTIVE 
    });

    if (existingAuction) {
      return res.status(400).json({ message: 'Gem already has an active auction' });
    }

    const auction = new Auction({
      gem: gemId,
      seller: req.user!.userId,
      startPrice: parseFloat(startPrice),
      currentBid: parseFloat(startPrice),
      minimumBidIncrement: parseFloat(minimumBidIncrement),
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      status: AuctionStatus.ACTIVE,
      bids: []
    });

    await auction.save();

    console.log('✅ Auction created successfully:', auction._id);

    // Populate gem data before sending response
    await auction.populate('gem');
    await auction.populate('seller', 'name email');

    res.status(201).json({
      message: 'Auction created successfully',
      auction
    });
  } catch (error: any) {
    console.error('❌ Error creating auction:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message 
    });
  }
};

export const placeBid = async (req: AuthRequest, res: Response) => {
  try {
    const { auctionId, amount } = req.body;

    const auction = await Auction.findById(auctionId);
    if (!auction) {
      return res.status(404).json({ message: 'Auction not found' });
    }

    if (auction.status !== AuctionStatus.ACTIVE) {
      return res.status(400).json({ message: 'Auction is not active' });
    }

    const now = new Date();
    if (now < auction.startTime) {
      return res.status(400).json({ message: 'Auction has not started yet' });
    }

    if (now > auction.endTime) {
      // Auto-end the auction
      auction.status = AuctionStatus.ENDED;
      if (auction.bids.length > 0) {
        const highestBid = auction.bids[auction.bids.length - 1];
        auction.winner = highestBid.bidder;
      }
      await auction.save();
      return res.status(400).json({ message: 'Auction has ended' });
    }

    const minBidAmount = auction.currentBid + auction.minimumBidIncrement;
    if (amount < minBidAmount) {
      return res.status(400).json({ 
        message: `Bid must be at least Rs.${minBidAmount.toLocaleString()}` 
      });
    }

    // Don't allow seller to bid on their own auction
    if (auction.seller.toString() === req.user!.userId) {
      return res.status(400).json({ message: 'You cannot bid on your own auction' });
    }

    auction.bids.push({
      bidder: req.user!.userId as any,
      amount: parseFloat(amount),
      timestamp: new Date()
    });

    auction.currentBid = parseFloat(amount);
    await auction.save();

    // Populate data
    await auction.populate('gem');
    await auction.populate('seller', 'name email');
    await auction.populate('bids.bidder', 'name email');

    console.log('✅ Bid placed successfully on auction:', auction._id);

    res.json({
      message: 'Bid placed successfully',
      auction
    });
  } catch (error: any) {
    console.error('❌ Error placing bid:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message 
    });
  }
};

export const getActiveAuctions = async (req: AuthRequest, res: Response) => {
  try {
    console.log('📋 Fetching active auctions');

    const auctions = await Auction.find({ status: AuctionStatus.ACTIVE })
      .populate('gem')
      .populate('seller', 'name email')
      .populate('bids.bidder', 'name email')
      .sort({ endTime: 1 });

    console.log('✅ Found auctions:', auctions.length);

    res.json({ auctions });
  } catch (error: any) {
    console.error('❌ Error fetching auctions:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message 
    });
  }
};

export const getMyAuctions = async (req: AuthRequest, res: Response) => {
  try {
    console.log('📋 Fetching my auctions for user:', req.user?.userId);

    const auctions = await Auction.find({ seller: req.user!.userId })
      .populate('gem')
      .populate('seller', 'name email')
      .populate('bids.bidder', 'name email')
      .populate('winner', 'name email')
      .sort({ createdAt: -1 });

    console.log('✅ Found my auctions:', auctions.length);

    res.json({ auctions });
  } catch (error: any) {
    console.error('❌ Error fetching my auctions:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message 
    });
  }
};

export const getAuctionById = async (req: AuthRequest, res: Response) => {
  try {
    const auction = await Auction.findById(req.params.id)
      .populate('gem')
      .populate('seller', 'name email')
      .populate('bids.bidder', 'name email')
      .populate('winner', 'name email');

    if (!auction) {
      return res.status(404).json({ message: 'Auction not found' });
    }

    res.json({ auction });
  } catch (error: any) {
    console.error('❌ Error fetching auction:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message 
    });
  }
};

export const deleteAuction = async (req: AuthRequest, res: Response) => {
  try {
    const auction = await Auction.findById(req.params.id);

    if (!auction) {
      return res.status(404).json({ message: 'Auction not found' });
    }

    // Only allow seller to delete their own auction
    if (auction.seller.toString() !== req.user!.userId) {
      return res.status(403).json({ message: 'You can only delete your own auctions' });
    }

    // Don't allow deletion if there are bids
    if (auction.bids.length > 0) {
      return res.status(400).json({ message: 'Cannot delete auction with existing bids' });
    }

    await Auction.findByIdAndDelete(req.params.id);

    console.log('✅ Auction deleted:', req.params.id);

    res.json({ message: 'Auction deleted successfully' });
  } catch (error: any) {
    console.error('❌ Error deleting auction:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message 
    });
  }
};

export const updateAuctionStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.body;
    const auction = await Auction.findById(req.params.id);

    if (!auction) {
      return res.status(404).json({ message: 'Auction not found' });
    }

    // Only allow seller or admin to update status
    const isAdmin = req.user!.role === 'admin';
    const isSeller = auction.seller.toString() === req.user!.userId;

    if (!isAdmin && !isSeller) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    auction.status = status;

    // If ending auction, set winner
    if (status === AuctionStatus.ENDED && auction.bids.length > 0) {
      const highestBid = auction.bids[auction.bids.length - 1];
      auction.winner = highestBid.bidder;
    }

    await auction.save();

    console.log('✅ Auction status updated:', auction._id);

    res.json({ 
      message: 'Auction status updated successfully',
      auction 
    });
  } catch (error: any) {
    console.error('❌ Error updating auction:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message 
    });
  }
};