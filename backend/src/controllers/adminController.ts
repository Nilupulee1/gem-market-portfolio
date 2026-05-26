import { Response, Request } from 'express';
import cloudinary from '../config/cloudinary';
import { AuthRequest } from '../middleware/auth';
import Gem from '../models/Gem';
import Auction from '../models/Auction';
import User from '../models/User';
import { AuctionStatus, GemStatus } from '../types';

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
  if (!certificateUrl) return certificateUrl;

  const normalizedUrl = certificateUrl.toLowerCase();
  const isPdfCertificate =
    certificate?.mimeType === 'application/pdf' ||
    normalizedUrl.includes('.pdf') ||
    normalizedUrl.includes('application/pdf');

  if (!isPdfCertificate) {
    return certificateUrl;
  }

  const publicId = extractCloudinaryPublicId(certificateUrl);
  if (!publicId) {
    console.warn('⚠️  Failed to extract public ID from certificate URL:', certificateUrl);
    return certificateUrl;
  }

  const signedUrl = cloudinary.utils.private_download_url(publicId, 'pdf', {
    resource_type: 'image',
    type: 'upload',
  });
  
  console.log('🔐 Generated signed URL for public ID:', publicId);
  console.log('📄 Signed URL:', signedUrl);

  return signedUrl;
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

    res.json({
      statistics: {
        totalUsers,
        totalGems,
        pendingGems,
        approvedGems,
        totalAuctions,
        activeAuctions,
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