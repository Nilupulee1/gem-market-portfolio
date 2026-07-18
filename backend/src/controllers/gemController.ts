import { Request, Response } from 'express';
import cloudinary from '../config/cloudinary';
import { AuthRequest } from '../middleware/auth';
import Gem from '../models/Gem';
import Auction from '../models/Auction';
import Conversation from '../models/Conversation';
import Message from '../models/Message';
import { GemStatus, AuctionStatus } from '../types';

const getCertificateAccessUrl = (certificate?: { url?: string; mimeType?: string }) => {
  const certificateUrl = certificate?.url;
  return certificateUrl || '';
};

const withNormalizedCertificateUrl = <T extends { certificate?: { url?: string } }>(gem: T): T => {
  if (!gem?.certificate?.url) return gem;

  return {
    ...gem,
    certificate: {
      ...gem.certificate,
      accessUrl: getCertificateAccessUrl(gem.certificate as { url?: string; mimeType?: string }),
    },
  };
};

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

const deleteCloudinaryAsset = async (url?: string) => {
  if (!url) return;

  const publicId = extractCloudinaryPublicId(url);
  if (!publicId) return;

  const isPdfAsset = url.toLowerCase().includes('.pdf') || url.toLowerCase().includes('application/pdf');

  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: isPdfAsset ? 'raw' : 'image' });
  } catch (error) {
    console.warn('⚠️  Failed to delete old certificate from Cloudinary:', error);
  }
};

const normalizeFixedListing = <T extends {
  fixedPrice?: number;
  listingDurationDays?: number;
  fixedPriceEndsAt?: Date | string;
  status?: GemStatus;
}>(gem: T) => {
  if (!gem?.fixedPrice || gem.status !== GemStatus.APPROVED) {
    return gem;
  }

  const expiresAt = gem.fixedPriceEndsAt ? new Date(gem.fixedPriceEndsAt) : null;
  if (!expiresAt || Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() > Date.now()) {
    return gem;
  }

  return {
    ...gem,
    status: GemStatus.REMOVED,
    fixedPrice: undefined,
    listingDurationDays: undefined,
    fixedPriceEndsAt: undefined,
  };
};

export const expireFixedPriceListings = async () => {
  const expiredGems = await Gem.find({
    status: GemStatus.APPROVED,
    fixedPrice: { $gt: 0 },
    fixedPriceEndsAt: { $lt: new Date() },
  });

  for (const gem of expiredGems) {
    gem.status = GemStatus.REMOVED;
    gem.fixedPrice = undefined;
    gem.listingDurationDays = undefined;
    gem.fixedPriceEndsAt = undefined;
    await gem.save();
  }
};

export const createGem = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    console.log('📦 Received gem creation request');
    console.log('👤 User:', authReq.user);
    console.log('📝 Body:', authReq.body);
    console.log('📁 Files:', authReq.files);

    const files = authReq.files as { [fieldname: string]: Express.Multer.File[] };
    
    if (!files || !files.images || files.images.length === 0) {
      return res.status(400).json({ message: 'At least one image is required' });
    }

    if (!files.certificate || files.certificate.length === 0) {
      return res.status(400).json({ message: 'Certificate is required' });
    }

    const requiredTextFields = ['type', 'carat', 'cut', 'clarity', 'color', 'origin', 'description', 'certificateAuthority', 'certificateNumber'];
    const missingField = requiredTextFields.find((field) => {
      const value = String(authReq.body[field] ?? '').trim();
      return value.length === 0;
    });

    if (missingField) {
      return res.status(400).json({
        message: `Missing required field: ${missingField}`,
      });
    }

    const gemImages = files.images;
    const certificateFile = files.certificate[0];

    console.log('🖼️  Images uploaded:', gemImages.map(img => img.path));
    console.log('📄 Certificate uploaded:', certificateFile.path);

    const imageUrls = gemImages.map(img => img.path);
    const certificateUrl = certificateFile.path;

    const fixedPrice = authReq.body.fixedPrice !== undefined ? Number(authReq.body.fixedPrice) : undefined;
    const listingDurationDays = authReq.body.listingDurationDays !== undefined ? Number(authReq.body.listingDurationDays) : undefined;

    const gemData = {
      seller: authReq.user!.userId,
      type: authReq.body.type,
      carat: parseFloat(authReq.body.carat),
      cut: authReq.body.cut,
      clarity: authReq.body.clarity,
      color: authReq.body.color,
      origin: authReq.body.origin,
      description: authReq.body.description,
      images: imageUrls,
      certificate: {
        url: certificateUrl,
        mimeType: certificateFile.mimetype,
        authority: authReq.body.certificateAuthority,
        certificateNumber: authReq.body.certificateNumber
      },
      fixedPrice: Number.isFinite(fixedPrice as number) && (fixedPrice as number) > 0 ? fixedPrice : undefined,
      listingDurationDays: Number.isFinite(listingDurationDays as number) && (listingDurationDays as number) > 0 ? listingDurationDays : undefined,
      status: GemStatus.PENDING,
      listingMode: (authReq.body.listingMode === 'direct_sale' ? 'direct_sale' : 'portfolio') as 'portfolio' | 'direct_sale',
      portfolioVisibility: (authReq.body.portfolioVisibility === 'private' ? 'private' : 'public') as 'public' | 'private',
    };

    console.log('💎 Creating gem with data:', gemData);

    const gem = new Gem(gemData);
    await gem.save();

    console.log('✅ Gem created successfully:', gem._id);

    res.status(201).json({
      message: 'Gem uploaded successfully and pending approval',
      gem: withNormalizedCertificateUrl(normalizeFixedListing(gem.toObject()))
    });
  } catch (error: any) {
    console.error('❌ Error creating gem:', error);
    console.error('Stack:', error.stack);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

export const getMyGems = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    console.log('📋 Fetching gems for user:', authReq.user?.userId);

    await expireFixedPriceListings();
    
    const gems = await Gem.find({ seller: authReq.user!.userId })
      .sort({ createdAt: -1 });
    
    console.log('✅ Found gems:', gems.length);
    
    res.json({
      gems: gems.map((gem) => withNormalizedCertificateUrl(normalizeFixedListing(gem.toObject())))
    });
  } catch (error: any) {
    console.error('❌ Error fetching gems:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message 
    });
  }
};

export const getApprovedGems = async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  try {
    const { type, minCarat, maxCarat, origin } = req.query;

    await expireFixedPriceListings();
    
    const filter: any = {
      status: GemStatus.APPROVED,
      // Exclude private portfolio gems — buyers only see public portfolio or direct-sale gems
      $nor: [{ listingMode: 'portfolio', portfolioVisibility: 'private' }]
    };
    
    if (type) filter.type = type;
    if (origin) filter.origin = origin;
    if (minCarat || maxCarat) {
      filter.carat = {};
      if (minCarat) filter.carat.$gte = Number(minCarat);
      if (maxCarat) filter.carat.$lte = Number(maxCarat);
    }

    const gems = await Gem.find(filter)
      .populate('seller', 'name email')
      .sort({ createdAt: -1 });
    
    res.json({
      gems: gems.map((gem) => withNormalizedCertificateUrl(normalizeFixedListing(gem.toObject())))
    });
  } catch (error: any) {
    console.error('❌ Error fetching approved gems:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message 
    });
  }
};

export const getGemById = async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  try {
    await expireFixedPriceListings();
    const gem = await Gem.findById(req.params.id)
      .populate('seller', 'name email');
    
    if (!gem) {
      return res.status(404).json({ message: 'Gem not found' });
    }

    res.json({
      gem: withNormalizedCertificateUrl(normalizeFixedListing(gem.toObject()))
    });
  } catch (error: any) {
    console.error('❌ Error fetching gem:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message 
    });
  }
};

export const updateGem = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const gem = await Gem.findById(authReq.params.id);

    if (!gem) {
      return res.status(404).json({ message: 'Gem not found' });
    }

    // Only allow seller to update their own gem
    if (gem.seller.toString() !== authReq.user!.userId) {
      return res.status(403).json({ message: 'You can only update your own gems' });
    }

    const files = authReq.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    const previousCertificateUrl = gem.certificate?.url;

    const allowedUpdates = ['type', 'carat', 'cut', 'clarity', 'color', 'origin', 'description', 'fixedPrice', 'listingDurationDays'];
    const updates = Object.keys(authReq.body);
    
    updates.forEach(update => {
      if (allowedUpdates.includes(update)) {
        (gem as any)[update] = authReq.body[update];
      }
    });

    if (authReq.body.certificateAuthority !== undefined) {
      gem.certificate.authority = authReq.body.certificateAuthority;
    }

    if (authReq.body.certificateNumber !== undefined) {
      gem.certificate.certificateNumber = authReq.body.certificateNumber;
    }

    if (authReq.body.fixedPrice !== undefined) {
      const parsedFixedPrice = Number(authReq.body.fixedPrice);
      gem.fixedPrice = Number.isFinite(parsedFixedPrice) && parsedFixedPrice > 0 ? parsedFixedPrice : undefined;
    }

    if (authReq.body.listingDurationDays !== undefined) {
      const parsedDuration = Number(authReq.body.listingDurationDays);
      gem.listingDurationDays = Number.isFinite(parsedDuration) && parsedDuration > 0 ? parsedDuration : undefined;
    }

    if (files?.images?.length) {
      gem.images = files.images.map((imageFile) => imageFile.path);
    }

    if (files?.certificate?.length) {
      const certificateFile = files.certificate[0];
      gem.certificate.url = certificateFile.path;
      gem.certificate.mimeType = certificateFile.mimetype;
    }

    // Reset status to pending after update
    gem.status = GemStatus.PENDING;
    gem.adminFeedback = undefined;

    await gem.save();

    if (files?.certificate?.length && previousCertificateUrl && previousCertificateUrl !== gem.certificate.url) {
      await deleteCloudinaryAsset(previousCertificateUrl);
    }

    console.log('✅ Gem updated:', gem._id);

    res.json({
      message: 'Gem updated successfully',
      gem: withNormalizedCertificateUrl(normalizeFixedListing(gem.toObject()))
    });
  } catch (error: any) {
    console.error('❌ Error updating gem:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message 
    });
  }
};

export const deleteGem = async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const gem = await Gem.findById(authReq.params.id);

    if (!gem) {
      return res.status(404).json({ message: 'Gem not found' });
    }

    // Only allow seller to delete their own gem
    if (gem.seller.toString() !== authReq.user!.userId) {
      return res.status(403).json({ message: 'You can only delete your own gems' });
    }

    // Do not allow deleting a sold gem
    if (gem.status === GemStatus.SOLD) {
      return res.status(400).json({ message: 'Cannot delete a sold gem.' });
    }

    // Check if there are active or pending payment auctions for this gem
    const activeAuction = await Auction.findOne({
      gem: gem._id,
      status: { $in: [AuctionStatus.ACTIVE, AuctionStatus.PENDING_PAYMENT] }
    });
    if (activeAuction) {
      return res.status(400).json({ message: 'Cannot delete gem while it is listed in an active or pending auction.' });
    }

    // Delete images from Cloudinary
    if (gem.images && gem.images.length > 0) {
      for (const imageUrl of gem.images) {
        await deleteCloudinaryAsset(imageUrl);
      }
    }

    // Delete certificate from Cloudinary
    if (gem.certificate?.url) {
      await deleteCloudinaryAsset(gem.certificate.url);
    }

    // Find all auctions related to this gem to also clean up associated conversations/messages
    const relatedAuctions = await Auction.find({ gem: gem._id });
    const auctionIds = relatedAuctions.map(a => a._id);

    // Delete related auctions
    await Auction.deleteMany({ gem: gem._id });

    // Delete conversations and messages related to this gem directly or via its auctions
    await Conversation.deleteMany({
      $or: [
        { gem: gem._id },
        { auction: { $in: auctionIds } }
      ]
    } as any);

    await Message.deleteMany({
      $or: [
        { gem: gem._id },
        { auction: { $in: auctionIds } }
      ]
    } as any);

    // Finally delete the gem itself from MongoDB
    await Gem.deleteOne({ _id: gem._id });

    console.log('✅ Gem permanently deleted:', authReq.params.id);

    res.json({ message: 'Gem deleted permanently' });
  } catch (error: any) {
    console.error('❌ Error deleting gem:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message 
    });
  }
};