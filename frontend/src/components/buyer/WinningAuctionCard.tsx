import React, { useState } from 'react';
import { X } from 'lucide-react';
import type { Auction } from '../../types';

interface WinningAuctionCardProps {
  auction: Auction;
  onContactSeller: (seller: { _id?: string; name: string; email: string; phone?: string }, gemName: string, gemId: string) => void;
  onDismiss?: (auctionId: string) => void;
}

const WinningAuctionCard: React.FC<WinningAuctionCardProps> = ({ auction, onContactSeller, onDismiss }) => {
  const [showContact, setShowContact] = useState(false);

  const formatCurrency = (value: number) => `Rs.${value.toLocaleString()}`;

  const handleRevealContact = () => {
    setShowContact(true);
    onContactSeller(auction.seller, auction.gem.type, auction.gem._id);
  };

  return (
    <div className="winning-auction-card">
      {/* Close button */}
      {onDismiss && (
        <button 
          className="close-btn" 
          onClick={() => onDismiss(auction._id)}
          type="button"
          aria-label="Close"
        >
          <X size={20} />
        </button>
      )}

      <div className="winning-content">
        {/* Left: Gem Image and Status */}
        <div className="winning-image-section">
          <div className="winning-image-wrapper">
            <img 
              src={auction.gem.images?.[0] || 'https://via.placeholder.com/300x400'} 
              alt={auction.gem.type}
              className="winning-gem-image"
            />
            <div className="auction-ended-badge">Auction Ended</div>
          </div>
        </div>

        {/* Right: Congratulations and Details */}
        <div className="winning-info-section">
          {/* Congratulations Header */}
          <div className="winning-header">
            <h2>Congratulations, {auction.seller.name?.split(' ')[0]}!</h2>
            <p className="winning-subtitle">
              You are the provisional winner of the auction for the{' '}
              <span className="gem-highlight">"{auction.gem.type}"</span>.
            </p>
          </div>

          {/* Winning Bid */}
          <div className="winning-bid-section">
            <p className="winning-bid-label">Winning Bid</p>
            <p className="winning-bid-amount">{formatCurrency(auction.currentBid)}</p>
          </div>

          {/* Finalize Transaction */}
          <div className="finalize-section">
            <div className="finalize-header">
              <h4>Finalize Your Transaction</h4>
              <p>
                Connect with the seller to arrange payment and shipping offline. To protect your privacy, contact details are only shared upon your explicit consent.
              </p>
            </div>

            {!showContact ? (
              <button 
                className="reveal-contact-btn"
                onClick={handleRevealContact}
                type="button"
              >
                <span className="btn-icon">👁️</span>
                Reveal Seller's Contact Info
              </button>
            ) : (
              <div className="seller-contact-info">
                <div className="contact-item">
                  <span className="contact-label">Name:</span>
                  <span className="contact-value">{auction.seller.name}</span>
                </div>
                <div className="contact-item">
                  <span className="contact-label">Email:</span>
                  <span className="contact-value">{auction.seller.email}</span>
                </div>
              </div>
            )}
          </div>

          {/* Gem Details Grid */}
          <div className="gem-details-section">
            <div className="detail-row">
              <div className="detail-col">
                <span className="detail-label">Carat Weight</span>
                <span className="detail-value">{auction.gem.carat} ct</span>
              </div>
              <div className="detail-col">
                <span className="detail-label">Cut</span>
                <span className="detail-value">{auction.gem.cut}</span>
              </div>
            </div>
            <div className="detail-row">
              <div className="detail-col">
                <span className="detail-label">Color</span>
                <span className="detail-value">{auction.gem.color}</span>
              </div>
              <div className="detail-col">
                <span className="detail-label">Clarity</span>
                <span className="detail-value">{auction.gem.clarity}</span>
              </div>
            </div>
            {auction.gem.certificate && (
              <div className="detail-row">
                <div className="detail-col full-width">
                  <span className="detail-label">Certificate</span>
                  <a 
                    href={auction.gem.certificate.accessUrl || auction.gem.certificate.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="certificate-link"
                  >
                    {auction.gem.certificate.authority || 'GIA'} Certified ({auction.gem.certificate.certificateNumber})
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Tab Navigation */}
          <div className="gem-tabs">
            <button className="tab-btn active" type="button">
              Gem Details
            </button>
            <button className="tab-btn" type="button">
              Auction History
            </button>
            <button className="tab-btn" type="button">
              Seller Information
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WinningAuctionCard;
