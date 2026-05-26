import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Auction from '../models/Auction';
import { AuctionStatus } from '../types';

const isAuctionRunning = (startTime: Date, endTime: Date, status: AuctionStatus) => {
  const now = new Date();
  return status === AuctionStatus.ACTIVE && now >= startTime && now <= endTime;
};

export const getBuyerDashboard = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user!.userId;

    const [myBidAuctions, wonAuctions] = await Promise.all([
      Auction.find({ 'bids.bidder': userId })
        .populate('gem')
        .populate('seller', 'name email')
        .sort({ updatedAt: -1 }),
      Auction.find({ winner: userId, status: AuctionStatus.ENDED })
        .populate('gem')
        .populate('seller', 'name email')
        .sort({ endTime: -1 })
    ]);

    let totalBidsPlaced = 0;
    const recentBidEntries: Array<{
      auctionId: string;
      gem: any;
      amount: number;
      timestamp: Date;
      currentBid: number;
      isWinning: boolean;
      endTime: Date;
    }> = [];

    myBidAuctions.forEach((auction) => {
      const myBids = auction.bids.filter((bid) => bid.bidder.toString() === userId);
      totalBidsPlaced += myBids.length;

      const latestBid = auction.bids[auction.bids.length - 1];
      const isWinning = !!latestBid && latestBid.bidder.toString() === userId;

      myBids.forEach((bid) => {
        recentBidEntries.push({
          auctionId: auction._id.toString(),
          gem: auction.gem,
          amount: bid.amount,
          timestamp: bid.timestamp,
          currentBid: auction.currentBid,
          isWinning,
          endTime: auction.endTime
        });
      });
    });

    recentBidEntries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    const activeBidsCount = myBidAuctions.filter((auction) =>
      isAuctionRunning(auction.startTime, auction.endTime, auction.status)
    ).length;

    res.json({
      stats: {
        auctionsParticipated: myBidAuctions.length,
        activeBids: activeBidsCount,
        wonAuctions: wonAuctions.length,
        totalBidsPlaced
      },
      recentBids: recentBidEntries.slice(0, 5),
      recentWins: wonAuctions.slice(0, 5)
    });
  } catch (error: any) {
    console.error('Error loading buyer dashboard:', error);
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
};

export const getMyBidHistory = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user!.userId;

    const auctions = await Auction.find({ 'bids.bidder': userId })
      .populate('gem')
      .populate('seller', 'name email')
      .sort({ updatedAt: -1 });

    const bidHistory: Array<{
      auctionId: string;
      gem: any;
      seller: any;
      amount: number;
      timestamp: Date;
      currentBid: number;
      minimumBidIncrement: number;
      status: AuctionStatus;
      endTime: Date;
      isWinning: boolean;
    }> = [];

    auctions.forEach((auction) => {
      const latestBid = auction.bids[auction.bids.length - 1];
      const isWinning = !!latestBid && latestBid.bidder.toString() === userId;

      auction.bids
        .filter((bid) => bid.bidder.toString() === userId)
        .forEach((bid) => {
          bidHistory.push({
            auctionId: auction._id.toString(),
            gem: auction.gem,
            seller: auction.seller,
            amount: bid.amount,
            timestamp: bid.timestamp,
            currentBid: auction.currentBid,
            minimumBidIncrement: auction.minimumBidIncrement,
            status: auction.status,
            endTime: auction.endTime,
            isWinning
          });
        });
    });

    bidHistory.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    res.json({ bidHistory });
  } catch (error: any) {
    console.error('Error loading buyer bid history:', error);
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
};

export const getMyActiveBids = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user!.userId;

    const auctions = await Auction.find({
      'bids.bidder': userId,
      status: AuctionStatus.ACTIVE
    })
      .populate('gem')
      .populate('seller', 'name email')
      .sort({ endTime: 1 });

    const activeBids = auctions
      .filter((auction) => isAuctionRunning(auction.startTime, auction.endTime, auction.status))
      .map((auction) => {
        const myBids = auction.bids.filter((bid) => bid.bidder.toString() === userId);
        const myHighestBid = myBids.reduce((max, bid) => Math.max(max, bid.amount), 0);
        const latestBid = auction.bids[auction.bids.length - 1];
        const isWinning = !!latestBid && latestBid.bidder.toString() === userId;

        return {
          auction,
          myHighestBid,
          bidsPlacedByMe: myBids.length,
          isWinning,
          remainingTimeMs: Math.max(auction.endTime.getTime() - Date.now(), 0)
        };
      });

    res.json({ activeBids });
  } catch (error: any) {
    console.error('Error loading buyer active bids:', error);
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
};

export const getWonAuctions = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user!.userId;

    const wonAuctions = await Auction.find({
      winner: userId,
      status: AuctionStatus.ENDED
    })
      .populate('gem')
      .populate('seller', 'name email')
      .sort({ endTime: -1 });

    const totalWonValue = wonAuctions.reduce((sum, auction) => sum + auction.currentBid, 0);

    res.json({
      stats: {
        totalWonAuctions: wonAuctions.length,
        totalWonValue
      },
      wonAuctions
    });
  } catch (error: any) {
    console.error('Error loading won auctions:', error);
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
};
