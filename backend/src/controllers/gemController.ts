import { Response } from 'express';
import cloudinary from '../config/cloudinary';
import { AuthRequest } from '../middleware/auth';
import Gem from '../models/Gem';
import { GemStatus } from '../types';

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

  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
  } catch (error) {
    console.warn('⚠️  Failed to delete old certificate from Cloudinary:', error);
  }
};

export const createGem = async (req: AuthRequest, res: Response) => {
  try {
    console.log('📦 Received gem creation request');
    console.log('👤 User:', req.user);
    console.log('📝 Body:', req.body);
    console.log('📁 Files:', req.files);

    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    
    if (!files || !files.images || files.images.length === 0) {
      return res.status(400).json({ message: 'At least one image is required' });
    }

    if (!files.certificate || files.certificate.length === 0) {
      return res.status(400).json({ message: 'Certificate is required' });
    }

    const gemImages = files.images;
    const certificateFile = files.certificate[0];

    console.log('🖼️  Images uploaded:', gemImages.map(img => img.path));
    console.log('📄 Certificate uploaded:', certificateFile.path);

    const imageUrls = gemImages.map(img => img.path);
    const certificateUrl = certificateFile.path;

    const gemData = {
      seller: req.user!.userId,
      type: req.body.type,
      carat: parseFloat(req.body.carat),
      cut: req.body.cut,
      clarity: req.body.clarity,
      color: req.body.color,
      origin: req.body.origin,
      description: req.body.description,
      images: imageUrls,
      certificate: {
        url: certificateUrl,
        mimeType: certificateFile.mimetype,
        authority: req.body.certificateAuthority,
        certificateNumber: req.body.certificateNumber
      },
      status: GemStatus.PENDING
    };

    console.log('💎 Creating gem with data:', gemData);

    const gem = new Gem(gemData);
    await gem.save();

    console.log('✅ Gem created successfully:', gem._id);

    res.status(201).json({
      message: 'Gem uploaded successfully and pending approval',
      gem: withNormalizedCertificateUrl(gem.toObject())
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

export const getMyGems = async (req: AuthRequest, res: Response) => {
  try {
    console.log('📋 Fetching gems for user:', req.user?.userId);
    
    const gems = await Gem.find({ seller: req.user!.userId })
      .sort({ createdAt: -1 });
    
    console.log('✅ Found gems:', gems.length);
    
    res.json({
      gems: gems.map((gem) => withNormalizedCertificateUrl(gem.toObject()))
    });
  } catch (error: any) {
    console.error('❌ Error fetching gems:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message 
    });
  }
};

export const getApprovedGems = async (req: AuthRequest, res: Response) => {
  try {
    const { type, minCarat, maxCarat, origin } = req.query;
    
    const filter: any = { status: GemStatus.APPROVED };
    
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
      gems: gems.map((gem) => withNormalizedCertificateUrl(gem.toObject()))
    });
  } catch (error: any) {
    console.error('❌ Error fetching approved gems:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message 
    });
  }
};

export const getGemById = async (req: AuthRequest, res: Response) => {
  try {
    const gem = await Gem.findById(req.params.id)
      .populate('seller', 'name email');
    
    if (!gem) {
      return res.status(404).json({ message: 'Gem not found' });
    }

    res.json({
      gem: withNormalizedCertificateUrl(gem.toObject())
    });
  } catch (error: any) {
    console.error('❌ Error fetching gem:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message 
    });
  }
};

export const updateGem = async (req: AuthRequest, res: Response) => {
  try {
    const gem = await Gem.findById(req.params.id);

    if (!gem) {
      return res.status(404).json({ message: 'Gem not found' });
    }

    // Only allow seller to update their own gem
    if (gem.seller.toString() !== req.user!.userId) {
      return res.status(403).json({ message: 'You can only update your own gems' });
    }

    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    const previousCertificateUrl = gem.certificate?.url;

    const allowedUpdates = ['type', 'carat', 'cut', 'clarity', 'color', 'origin', 'description'];
    const updates = Object.keys(req.body);
    
    updates.forEach(update => {
      if (allowedUpdates.includes(update)) {
        (gem as any)[update] = req.body[update];
      }
    });

    if (req.body.certificateAuthority !== undefined) {
      gem.certificate.authority = req.body.certificateAuthority;
    }

    if (req.body.certificateNumber !== undefined) {
      gem.certificate.certificateNumber = req.body.certificateNumber;
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
      gem: withNormalizedCertificateUrl(gem.toObject())
    });
  } catch (error: any) {
    console.error('❌ Error updating gem:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message 
    });
  }
};

export const deleteGem = async (req: AuthRequest, res: Response) => {
  try {
    const gem = await Gem.findById(req.params.id);

    if (!gem) {
      return res.status(404).json({ message: 'Gem not found' });
    }

    // Only allow seller to delete their own gem
    if (gem.seller.toString() !== req.user!.userId) {
      return res.status(403).json({ message: 'You can only delete your own gems' });
    }

    // Check if gem is being used in an active auction
    // You can add this check if needed

    await Gem.findByIdAndDelete(req.params.id);

    console.log('✅ Gem deleted:', req.params.id);

    res.json({ message: 'Gem deleted successfully' });
  } catch (error: any) {
    console.error('❌ Error deleting gem:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message 
    });
  }
};