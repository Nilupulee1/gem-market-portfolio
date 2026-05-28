import { Response, Request } from 'express';
import cloudinary from '../config/cloudinary';
import { AuthRequest } from '../middleware/auth';
import Gem from '../models/Gem';
import Auction from '../models/Auction';
import User from '../models/User';
import { AuctionStatus, GemStatus } from '../types';
import { emitActivity } from '../config/websocket';

const extractCloudinaryPublicId = (url: string) => {
  try {
    const assetUrl = new URL(url);
    const uploadIndex = assetUrl.pathname.indexOf('/upload/');

    if (uploadIndex === -1) return null;

    const assetPath = assetUrl.pathname.slice(uploadIndex + '/upload/'.length).replace(/^v\d+\//, '');
    const publicId = assetPath.replace(/\.[^/.]+$/, '');

    return publicId ? decodeURIComponent(publicId) : null;
  } catch {
    return null;
  }
};

const getCertificateAccessUrl = (certificate?: { url?: string; mimeType?: string }) => {
  const certificateUrl = certificate?.url;
  return certificateUrl || '';
};

const withCertificateAccessUrl = <T extends { certificate?: { url?: string; mimeType?: string } }>(gem: T): T => ({
  ...gem,
  certificate: gem.certificate
    ? {
        ...gem.certificate,
        accessUrl: getCertificateAccessUrl(gem.certificate),
      }
    : gem.certificate,
});

const normalizeAuctionForAdmin = (auction: any) => {
  if (
    auction &&
    auction.status === AuctionStatus.PENDING_PAYMENT &&
    (auction.paymentConfirmed === true || auction.paymentStatus === 'completed')
  ) {
    return {
      ...auction,
      status: AuctionStatus.PENDING_PAYMENT,
      approvalState: 'ready-for-approval',
    };
  }

  return {
    ...auction,
    approvalState: auction?.status === AuctionStatus.ACTIVE ? 'live' : 'payment-pending',
  };
};

export const getPendingGems = async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  try {
    const gems = await Gem.find({ status: GemStatus.PENDING })
      .populate('seller', 'name email')
      .sort({ createdAt: -1 });

    res.json({ gems: gems.map((gem) => withCertificateAccessUrl(gem.toObject())) });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const reviewGem = async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  try {
    const { gemId, status, feedback } = authReq.body;

    if (![GemStatus.APPROVED, GemStatus.REJECTED].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const gem = await Gem.findById(gemId);
    if (!gem) {
      return res.status(404).json({ message: 'Gem not found' });
    }

    gem.status = status;
    if (feedback) {
      gem.adminFeedback = feedback;
    }

    await gem.save();

      try {
        emitActivity({ type: 'gem_review', title: `Gem ${gem.type} has been ${status}`, time: new Date(), tone: status === 'approved' ? 'success' : 'warning' });
      } catch (err) {
        console.warn('emitActivity failed for gem review', err);
      }
    res.json({
      message: `Gem ${status} successfully`,
      gem: withCertificateAccessUrl(gem.toObject())
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const getAllUsers = async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json({ users });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const getStatistics = async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  try {
    const totalUsers = await User.countDocuments();
    const totalGems = await Gem.countDocuments();
    const pendingGems = await Gem.countDocuments({ status: GemStatus.PENDING });
    const approvedGems = await Gem.countDocuments({ status: GemStatus.APPROVED });
    const totalAuctions = await Auction.countDocuments();
    const activeAuctions = await Auction.countDocuments({ status: AuctionStatus.ACTIVE });
    const revenueResult = await Auction.aggregate([
      {
        $match: {
          paymentConfirmed: true,
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: {
            $sum: '$listingPlacementFee',
          },
        },
      },
    ]);
    const totalRevenue = revenueResult[0]?.totalRevenue || 0;

    res.json({
      statistics: {
        totalUsers,
        totalGems,
        pendingGems,
        approvedGems,
        totalAuctions,
        activeAuctions,
        totalRevenue,
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const getAllAuctions = async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  try {
    const auctions = await Auction.find()
      .populate('gem')
      .populate('seller', 'name email')
      .populate('bids.bidder', 'name email')
      .populate('winner', 'name email')
      .sort({ createdAt: -1 });

    res.json({
      auctions: auctions.map((auction) => ({
        ...normalizeAuctionForAdmin(auction.toObject()),
        gem: withCertificateAccessUrl((auction.gem as any)?.toObject?.() || auction.gem),
      })),
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const getRecentActivity = async (req: Request, res: Response) => {
  try {
    const recentUsers = await User.find({ role: 'seller' }).select('name createdAt').sort({ createdAt: -1 }).limit(10);
    const recentAuctions = await Auction.find().select('gem status createdAt endTime').populate('gem', 'type').sort({ createdAt: -1 }).limit(20);
    const recentGems = await Gem.find().select('type status createdAt updatedAt').sort({ createdAt: -1 }).limit(10);

    const items: Array<any> = [];
    for (const u of recentUsers) {
      items.push({ type: 'user_registration', title: `${u.name} registered as a new seller`, time: u.createdAt, tone: 'success' });
    }

    for (const a of recentAuctions) {
      if (a.status === AuctionStatus.ENDED) {
        items.push({ type: 'auction_ended', title: `Auction for “${(a.gem as any)?.type || 'item'}” has ended.`, time: a.endTime || a.createdAt, tone: 'info' });
      } else {
        items.push({ type: 'auction_listed', title: `A new auction for “${(a.gem as any)?.type || 'item'}” was listed.`, time: a.createdAt, tone: 'warning' });
      }
    }

    for (const g of recentGems) {
      if (g.status === GemStatus.APPROVED) {
        items.push({ type: 'gem_approved', title: `Gem “${g.type}” has been approved.`, time: g.updatedAt || g.createdAt, tone: 'neutral' });
      } else {
        items.push({ type: 'gem_submitted', title: `Gem “${g.type}” submitted for review.`, time: g.createdAt, tone: 'warning' });
      }
    }

    // sort by time desc and limit
    items.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
    res.json({ activity: items.slice(0, 12) });
  } catch (error) {
    console.error('Error building recent activity:', error);
    res.status(500).json({ message: 'Server error', error });
  }
};