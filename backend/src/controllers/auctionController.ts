import crypto from 'crypto';
import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { AuthRequest } from '../middleware/auth';
import Auction from '../models/Auction';
import Gem from '../models/Gem';
import User from '../models/User';
import { AuctionStatus, GemStatus } from '../types';
import cloudinary from '../config/cloudinary';
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

const LISTING_PLACEMENT_FEE_PERCENT = 5;

const calculateListingPlacementFee = (startPriceValue: number) =>
  Math.round((startPriceValue * LISTING_PLACEMENT_FEE_PERCENT) / 100);

const normalizeAuctionAfterPayment = (auction: any) => {
  if (
    auction &&
    auction.status === AuctionStatus.PENDING_PAYMENT &&
    (auction.paymentConfirmed === true || auction.paymentStatus === 'completed')
  ) {
    auction.status = AuctionStatus.ACTIVE;
  }

  return auction;
};

  const getPayHereSecretHash = (merchantSecret: string) =>
    crypto.createHash('md5').update(merchantSecret).digest('hex').toUpperCase();

  const buildPayHereHash = (merchantId: string, orderId: string, amount: string, currency: string, merchantSecret: string) =>
    crypto
      .createHash('md5')
      .update(`${merchantId}${orderId}${amount}${currency}${getPayHereSecretHash(merchantSecret)}`)
      .digest('hex')
      .toUpperCase();

  const buildPayHereNotifyHash = (
    merchantId: string,
    orderId: string,
    amount: string,
    currency: string,
    statusCode: string,
    merchantSecret: string,
  ) =>
    crypto
      .createHash('md5')
      .update(`${merchantId}${orderId}${amount}${currency}${statusCode}${getPayHereSecretHash(merchantSecret)}`)
      .digest('hex')
      .toUpperCase();

  const getAppUrl = (req: Request) => process.env.FRONTEND_URL?.trim() || req.headers.origin || 'http://localhost:5173';

  const getApiBaseUrl = (req: Request) => process.env.BACKEND_URL?.trim() || `${req.protocol}://${req.get('host')}`;

  const splitSellerName = (name: string) => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    return {
      firstName: parts[0] || 'Seller',
      lastName: parts.slice(1).join(' ') || 'User',
    };
  };

  const buildPayHereCheckout = ({
    merchantId,
    merchantSecret,
    checkoutUrl,
    orderId,
    amount,
    currency,
    sellerName,
    sellerEmail,
    itemName,
    appUrl,
    apiBaseUrl,
  }: {
    merchantId: string;
    merchantSecret: string;
    checkoutUrl: string;
    orderId: string;
    amount: string;
    currency: string;
    sellerName: string;
    sellerEmail: string;
    itemName: string;
    appUrl: string;
    apiBaseUrl: string;
  }) => {
    const { firstName, lastName } = splitSellerName(sellerName);
    const hash = buildPayHereHash(merchantId, orderId, amount, currency, merchantSecret);

    return {
      checkoutUrl,
      fields: {
        merchant_id: merchantId,
        return_url: `${appUrl}/seller/auctions?payment=success&auctionId=${orderId}`,
        cancel_url: `${appUrl}/seller/auctions?payment=cancelled&auctionId=${orderId}`,
        notify_url: `${apiBaseUrl}/api/auctions/payhere/notify`,
        order_id: orderId,
        items: itemName,
        amount,
        currency,
        first_name: firstName,
        last_name: lastName,
        email: sellerEmail,
        phone: '',
        address: '',
        city: 'Colombo',
        country: 'Sri Lanka',
        hash,
      }
    };
  };

export const createAuction = async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  try {
    console.log('📦 Creating auction with data:', authReq.body);
    
    const { gemId, startPrice, minimumBidIncrement, paymentConfirmed, startTime, endTime } = authReq.body;

    const startPriceValue = parseFloat(startPrice);
    const listingPlacementFee = calculateListingPlacementFee(startPriceValue);

    if (!Number.isFinite(startPriceValue) || startPriceValue <= 0) {
      return res.status(400).json({ message: 'Starting bid is required' });
    }

    if (listingPlacementFee <= 0) {
      return res.status(400).json({ message: 'Calculated listing placement fee is invalid' });
    }

    if (paymentConfirmed !== true && paymentConfirmed !== 'true') {
      return res.status(400).json({ message: 'PayHere sandbox payment confirmation is required before starting the auction' });
    }

    // Verify gem exists and is approved
    const gem = await Gem.findById(gemId);
    if (!gem) {
      return res.status(404).json({ message: 'Gem not found' });
    }

    if (gem.status !== GemStatus.APPROVED) {
      return res.status(400).json({ message: 'Only approved gems can be auctioned' });
    }

    if (gem.seller.toString() !== authReq.user!.userId) {
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
      seller: authReq.user!.userId,
      startPrice: startPriceValue,
      currentBid: startPriceValue,
      minimumBidIncrement: parseFloat(minimumBidIncrement),
      listingPlacementFeePercent: LISTING_PLACEMENT_FEE_PERCENT,
      listingPlacementFee,
      paymentConfirmed: true,
      paymentMethod: 'payhere-sandbox',
      paymentStatus: 'completed',
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

    try {
      emitActivity({ type: 'auction_created', title: `A new auction for “${(auction.gem as any)?.type || 'item'}” was listed.`, time: new Date(), tone: 'warning' });
    } catch (err) {
      console.warn('emitActivity failed for auction create', err);
    }

    res.status(201).json({
      message: 'Auction created successfully',
      auction: {
        ...auction.toObject(),
        gem: withCertificateAccessUrl((auction.gem as any)?.toObject?.() || auction.gem),
      }
    });
  } catch (error: any) {
    console.error('❌ Error creating auction:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message 
    });
  }
};

export const createPayHereCheckout = async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  try {
    const { gemId, startPrice, minimumBidIncrement, startTime, endTime } = authReq.body;

    if (!gemId || !Types.ObjectId.isValid(gemId)) {
      return res.status(400).json({ message: 'A valid gem is required' });
    }

    const parsedStartTime = new Date(startTime);
    const parsedEndTime = new Date(endTime);

    const startPriceValue = parseFloat(startPrice);
    const listingPlacementFee = calculateListingPlacementFee(startPriceValue);
    const minimumBidValue = parseFloat(minimumBidIncrement);

    if (Number.isNaN(parsedStartTime.getTime()) || Number.isNaN(parsedEndTime.getTime())) {
      return res.status(400).json({ message: 'Valid auction start and end times are required' });
    }

    if (parsedEndTime <= parsedStartTime) {
      return res.status(400).json({ message: 'Auction end time must be after the start time' });
    }

    if (!Number.isFinite(startPriceValue) || startPriceValue <= 0) {
      return res.status(400).json({ message: 'Starting bid is required' });
    }

    if (!Number.isFinite(listingPlacementFee) || listingPlacementFee <= 0) {
      return res.status(400).json({ message: 'Calculated listing placement fee is invalid' });
    }

    if (!Number.isFinite(minimumBidValue) || minimumBidValue <= 0) {
      return res.status(400).json({ message: 'Minimum bid increment is required' });
    }

    const gem = await Gem.findById(gemId);
    if (!gem) {
      return res.status(404).json({ message: 'Gem not found' });
    }

    if (gem.status !== GemStatus.APPROVED) {
      return res.status(400).json({ message: 'Only approved gems can be auctioned' });
    }

    if (gem.seller.toString() !== authReq.user!.userId) {
      return res.status(403).json({ message: 'You can only auction your own gems' });
    }

    const existingAuction = await Auction.findOne({
      gem: gemId,
      status: { $in: [AuctionStatus.ACTIVE, AuctionStatus.PENDING_PAYMENT] }
    });

    if (existingAuction) {
      return res.status(400).json({ message: 'Gem already has an auction in progress' });
    }

    const seller = await User.findById(authReq.user!.userId).select('name email');
    if (!seller) {
      return res.status(404).json({ message: 'Seller account not found' });
    }

    const merchantId = process.env.PAYHERE_MERCHANT_ID?.trim();
    const merchantSecret = process.env.PAYHERE_MERCHANT_SECRET?.trim();
    const checkoutUrl = process.env.PAYHERE_CHECKOUT_URL?.trim() || 'https://sandbox.payhere.lk/pay/checkout';

    if (!merchantId || !merchantSecret) {
      return res.status(500).json({ message: 'PayHere sandbox credentials are not configured' });
    }

    const auctionId = new Types.ObjectId();
    const orderId = auctionId.toString();
    const currency = process.env.PAYHERE_CURRENCY?.trim() || 'LKR';
    const amount = listingPlacementFee.toFixed(2);
    const { firstName, lastName } = splitSellerName(seller.name);
    const appUrl = getAppUrl(authReq);
    const apiBaseUrl = getApiBaseUrl(authReq);

    const auction = new Auction({
      _id: auctionId,
      gem: gemId,
      seller: authReq.user!.userId,
      startPrice: startPriceValue,
      currentBid: startPriceValue,
      minimumBidIncrement: minimumBidValue,
      listingPlacementFeePercent: LISTING_PLACEMENT_FEE_PERCENT,
      listingPlacementFee,
      paymentConfirmed: false,
      paymentMethod: 'payhere-sandbox',
      paymentStatus: 'pending',
      paymentOrderId: orderId,
      paymentAmount: listingPlacementFee,
      paymentCurrency: currency,
      startTime: parsedStartTime,
      endTime: parsedEndTime,
      status: AuctionStatus.PENDING_PAYMENT,
      bids: []
    });

    await auction.save();

    const payhere = buildPayHereCheckout({
      merchantId,
      merchantSecret,
      checkoutUrl,
      orderId,
      amount,
      currency,
      sellerName: seller.name,
      sellerEmail: seller.email,
      itemName: `Auction listing fee for ${gem.type}`,
      appUrl,
      apiBaseUrl,
    });

    res.status(201).json({
      message: 'PayHere checkout created successfully',
      auction: auction.toObject(),
      payhere,
    });
  } catch (error: any) {
    console.error('❌ Error creating PayHere checkout:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const retryPayHereCheckout = async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  try {
    const auction = await Auction.findById(authReq.params.id).populate('gem');

    if (!auction) {
      return res.status(404).json({ message: 'Auction not found' });
    }

    if (auction.seller.toString() !== authReq.user!.userId) {
      return res.status(403).json({ message: 'You can only pay for your own auction' });
    }

    if (auction.status !== AuctionStatus.PENDING_PAYMENT) {
      return res.status(400).json({ message: 'This auction is not waiting for payment' });
    }

    if (auction.paymentConfirmed === true || auction.paymentStatus === 'completed') {
      return res.status(400).json({ message: 'Payment has already been completed for this auction' });
    }

    const seller = await User.findById(auction.seller).select('name email');
    if (!seller) {
      return res.status(404).json({ message: 'Seller account not found' });
    }

    const merchantId = process.env.PAYHERE_MERCHANT_ID?.trim();
    const merchantSecret = process.env.PAYHERE_MERCHANT_SECRET?.trim();
    const checkoutUrl = process.env.PAYHERE_CHECKOUT_URL?.trim() || 'https://sandbox.payhere.lk/pay/checkout';

    if (!merchantId || !merchantSecret) {
      return res.status(500).json({ message: 'PayHere sandbox credentials are not configured' });
    }

    const sellerDoc = seller as any;
    const gem = auction.gem as any;
    const orderId = auction.paymentOrderId || auction._id.toString();
    const currency = auction.paymentCurrency || process.env.PAYHERE_CURRENCY?.trim() || 'LKR';
    const amount = Number(auction.paymentAmount ?? calculateListingPlacementFee(auction.startPrice)).toFixed(2);

    auction.paymentOrderId = orderId;
    auction.paymentAmount = Number(auction.paymentAmount ?? calculateListingPlacementFee(auction.startPrice));
    auction.paymentCurrency = currency;
    auction.paymentMethod = 'payhere-sandbox';
    auction.paymentStatus = 'pending';
    await auction.save();

    const appUrl = getAppUrl(authReq);
    const apiBaseUrl = getApiBaseUrl(authReq);
    const payhere = buildPayHereCheckout({
      merchantId,
      merchantSecret,
      checkoutUrl,
      orderId,
      amount,
      currency,
      sellerName: sellerDoc.name,
      sellerEmail: sellerDoc.email,
      itemName: `Auction listing fee for ${gem?.type || 'auction item'}`,
      appUrl,
      apiBaseUrl,
    });

    return res.status(200).json({
      message: 'PayHere checkout created successfully',
      auction: auction.toObject(),
      payhere,
    });
  } catch (error: any) {
    console.error('❌ Error creating PayHere retry checkout:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const payHereNotify = async (req: Request, res: Response) => {
  try {
    const merchantId = process.env.PAYHERE_MERCHANT_ID?.trim();
    const merchantSecret = process.env.PAYHERE_MERCHANT_SECRET?.trim();

    if (!merchantId || !merchantSecret) {
      return res.status(500).send('PayHere credentials missing');
    }

    const merchant_id = String(req.body.merchant_id || req.body.merchantId || '');
    const order_id = String(req.body.order_id || req.body.orderId || '');
    const payhere_amount = String(req.body.payhere_amount || req.body.amount || '');
    const payhere_currency = String(req.body.payhere_currency || req.body.currency || '');
    const status_code = String(req.body.status_code || req.body.statusCode || '');
    const md5sig = String(req.body.md5sig || req.body.signature || '');
    const paymentId = String(req.body.payhere_payment_id || req.body.payment_id || req.body.paymentId || '');

    if (!merchant_id || !order_id || !payhere_amount || !payhere_currency || !status_code || !md5sig) {
      return res.status(400).send('Invalid PayHere notification');
    }

    const expectedSignature = buildPayHereNotifyHash(merchant_id, order_id, payhere_amount, payhere_currency, status_code, merchantSecret);
    if (merchant_id !== merchantId || expectedSignature !== md5sig.toUpperCase()) {
      return res.status(400).send('Invalid signature');
    }

    const auction = await Auction.findById(order_id);
    if (!auction) {
      return res.status(404).send('Auction not found');
    }

    if (status_code === '2') {
      auction.paymentConfirmed = true;
      auction.paymentStatus = 'completed';
      auction.paymentTransactionId = paymentId || auction.paymentTransactionId;
      auction.status = AuctionStatus.ACTIVE;
      auction.listingPlacementFeePercent = LISTING_PLACEMENT_FEE_PERCENT;
      auction.listingPlacementFee = calculateListingPlacementFee(auction.startPrice);
    } else if (status_code === '0' || status_code === '-1' || status_code === '-2') {
      auction.paymentStatus = 'failed';
    }

    await auction.save();

    return res.status(200).send('OK');
  } catch (error: any) {
    console.error('❌ Error handling PayHere notify:', error);
    return res.status(500).send('Server error');
  }
};

export const placeBid = async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  try {
    const { auctionId, amount } = authReq.body;

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
    if (auction.seller.toString() === authReq.user!.userId) {
      return res.status(400).json({ message: 'You cannot bid on your own auction' });
    }

    auction.bids.push({
      bidder: new Types.ObjectId(authReq.user!.userId),
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

export const checkAndEndExpiredAuctions = async () => {
  try {
    const now = new Date();
    const expiredActiveAuctions = await Auction.find({
      status: AuctionStatus.ACTIVE,
      endTime: { $lt: now }
    });

    for (const auction of expiredActiveAuctions) {
      auction.status = AuctionStatus.ENDED;
      if (auction.bids.length > 0) {
        const highestBid = auction.bids[auction.bids.length - 1];
        auction.winner = highestBid.bidder;
      }
      await auction.save();
    }
  } catch (error) {
    console.error('Error ending expired auctions:', error);
  }
};

export const getActiveAuctions = async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  try {
    console.log('📋 Fetching active auctions');
    await checkAndEndExpiredAuctions();

    const auctions = await Auction.find({ status: AuctionStatus.ACTIVE })
      .populate('gem')
      .populate('seller', 'name email')
      .populate('bids.bidder', 'name email')
      .sort({ endTime: 1 });

    console.log('✅ Found auctions:', auctions.length);

    res.json({ auctions: auctions.map((auction) => ({
      ...normalizeAuctionAfterPayment(auction.toObject()),
      gem: withCertificateAccessUrl((auction.gem as any)?.toObject?.() || auction.gem),
    })) });
  } catch (error: any) {
    console.error('❌ Error fetching auctions:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message 
    });
  }
};

export const getMyAuctions = async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  try {
    console.log('📋 Fetching my auctions for user:', authReq.user?.userId);
    await checkAndEndExpiredAuctions();

    const auctions = await Auction.find({ seller: authReq.user!.userId })
      .populate('gem')
      .populate('seller', 'name email')
      .populate('bids.bidder', 'name email')
      .populate('winner', 'name email')
      .sort({ createdAt: -1 });

    console.log('✅ Found my auctions:', auctions.length);

    res.json({ auctions: auctions.map((auction) => ({
      ...normalizeAuctionAfterPayment(auction.toObject()),
      gem: withCertificateAccessUrl((auction.gem as any)?.toObject?.() || auction.gem),
    })) });
  } catch (error: any) {
    console.error('❌ Error fetching my auctions:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message 
    });
  }
};

export const getAuctionById = async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  try {
    await checkAndEndExpiredAuctions();
    const auction = await Auction.findById(authReq.params.id)
      .populate('gem')
      .populate('seller', 'name email')
      .populate('bids.bidder', 'name email')
      .populate('winner', 'name email');

    if (!auction) {
      return res.status(404).json({ message: 'Auction not found' });
    }

    res.json({
      auction: {
        ...normalizeAuctionAfterPayment(auction.toObject()),
        gem: withCertificateAccessUrl((auction.gem as any)?.toObject?.() || auction.gem),
      }
    });
  } catch (error: any) {
    console.error('❌ Error fetching auction:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message 
    });
  }
};

export const deleteAuction = async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  try {
    const auction = await Auction.findById(authReq.params.id);

    if (!auction) {
      return res.status(404).json({ message: 'Auction not found' });
    }

    // Only allow seller to delete their own auction
    if (auction.seller.toString() !== authReq.user!.userId) {
      return res.status(403).json({ message: 'You can only delete your own auctions' });
    }

    // Don't allow deletion if there are bids
    if (auction.bids.length > 0) {
      return res.status(400).json({ message: 'Cannot delete auction with existing bids' });
    }

    await Auction.findByIdAndDelete(authReq.params.id);

    console.log('✅ Auction deleted:', authReq.params.id);

    res.json({ message: 'Auction deleted successfully' });
  } catch (error: any) {
    console.error('❌ Error deleting auction:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message 
    });
  }
};

export const updateAuctionStatus = async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  try {
    const { status } = authReq.body;
    const auction = await Auction.findById(authReq.params.id);

    if (!auction) {
      return res.status(404).json({ message: 'Auction not found' });
    }

    // Only allow seller or admin to update status
    const isAdmin = authReq.user!.role === 'admin';
    const isSeller = auction.seller.toString() === authReq.user!.userId;

    if (!isAdmin && !isSeller) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    auction.status = status;

    if (status === AuctionStatus.ACTIVE) {
      auction.paymentConfirmed = true;
      auction.paymentStatus = 'completed';
    }

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