import { motion } from 'framer-motion';
import { Heart, Timer } from 'lucide-react';
import type { Auction, Gem } from '../../types';

interface MarketplaceProps {
  auctions: Auction[];
  approvedGems: Gem[];
  query: string;
  selectedType: string;
  uniqueTypes: string[];
  watchlistIds: string[];
  nowMs: number;
  onTypeChange: (value: string) => void;
  onToggleWatchlist: (auctionId: string) => void;
  onOpenDetails: (auctionId: string) => void;
  onOpenGemDetails: (gemId: string) => void;
  onOpenSellerContact: (seller: { _id?: string; name: string; email: string; phone?: string }, gemName: string, gemId: string) => void;
  formatCurrency: (value: number) => string;
  formatRemaining: (endTime: string, nowMs: number) => string;
  getLeadingBidderName: (auction?: Auction | null) => string;
}

const Marketplace = ({
  auctions,
  approvedGems,
  query,
  selectedType,
  uniqueTypes,
  watchlistIds,
  nowMs,
  onTypeChange,
  onToggleWatchlist,
  onOpenDetails,
  onOpenGemDetails,
  onOpenSellerContact,
  formatCurrency,
  formatRemaining,
  getLeadingBidderName,
}: MarketplaceProps) => {
  const filteredGems = approvedGems.filter((gem) => {
    const queryValue = query.trim().toLowerCase();
    const matchesQuery =
      queryValue.length === 0 ||
      gem.type.toLowerCase().includes(queryValue) ||
      gem.origin.toLowerCase().includes(queryValue) ||
      gem.color.toLowerCase().includes(queryValue);
    const matchesType = selectedType === 'all' || gem.type === selectedType;
    return matchesQuery && matchesType;
  });

  const totalVisible = auctions.length + filteredGems.length;

  return (
    <>
      <div className="bdr-dashboard-hero bdr-market-hero-card">
        <div className="bdr-dashboard-hero-copy bdr-market-hero-copy">
          <p className="dashboard-eyebrow bdr-market-hero-kicker">Marketplace</p>
          <h4 className="bdr-market-hero-title">Masterpiece Collection</h4>
          <p className="bdr-market-hero-subtitle">Showing {totalVisible} exquisite specimens curated for investment.</p>
        </div>

        <div className="bdr-dashboard-hero-actions bdr-market-hero-controls" aria-label="Marketplace filters">
          <span className="bdr-market-hero-label">Sort by</span>
          <select
            className="bdr-market-hero-select"
            value={selectedType}
            onChange={(event) => onTypeChange(event.target.value)}
          >
            {uniqueTypes.map((type) => (
              <option key={type} value={type}>
                {type === 'all' ? 'All Types' : type}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="market-grid">
        {totalVisible === 0 && (
          <div className="market-empty-state">
            <h5>No gems found</h5>
            <p>Try clearing filters or searching with a different keyword.</p>
          </div>
        )}

        {filteredGems.map((gem) => (
          <motion.article key={`gem-${gem._id}`} whileHover={{ y: -5 }} className="market-card">
            <img className="market-image" src={gem.images?.[0] || 'https://via.placeholder.com/460x280'} alt={gem.type} />
            <div className="market-body">
              <strong>{gem.type}</strong>
              <p className="market-meta">
                {gem.origin} - {gem.carat} ct
              </p>
              <p className="market-meta">
                {gem.cut} - {gem.color}
              </p>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="bid-price">Contact Seller</span>
                <span className="market-sale-badge">
                  Direct Sale
                </span>
              </div>
              <p className="market-meta mb-0">
                Seller: <strong>{gem.seller.name}</strong>
              </p>
              <div className="market-actions">
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="ghost-btn" type="button" onClick={() => onOpenGemDetails(gem._id)}>
                    View Details
                  </button>
                  <button
                    className="bid-btn"
                    type="button"
                    style={{ flex: 1 }}
                    onClick={() => onOpenSellerContact(gem.seller, gem.type, gem._id)}
                  >
                    Contact Seller
                  </button>
                </div>
              </div>
            </div>
          </motion.article>
        ))}

        {auctions.map((auction) => {
          const inWatchlist = watchlistIds.includes(auction._id);
          return (
            <motion.article key={auction._id} whileHover={{ y: -5 }} className="market-card">
              <img className="market-image" src={auction.gem.images?.[0] || 'https://via.placeholder.com/460x280'} alt={auction.gem.type} />
              <div className="market-body">
                <strong>{auction.gem.type}</strong>
                <p className="market-meta">
                  {auction.gem.origin} - {auction.gem.carat} ct
                </p>
                <p className="market-meta">
                  {auction.gem.cut} - {auction.gem.color}
                </p>
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="bid-price">{formatCurrency(auction.currentBid)}</span>
                  <span className="auction-timer">
                    <Timer size={14} /> {formatRemaining(auction.endTime, nowMs)}
                  </span>
                </div>
                <p className="market-meta mb-0">
                  Current leader: <strong>{getLeadingBidderName(auction)}</strong>
                </p>
                <div className="market-actions">
                  <button className="watch-btn" type="button" onClick={() => onToggleWatchlist(auction._id)}>
                    <Heart size={15} fill={inWatchlist ? 'currentColor' : 'none'} />
                    {inWatchlist ? 'Watched' : 'Watch'}
                  </button>
                  <button className="bid-btn" type="button" onClick={() => onOpenDetails(auction._id)}>
                    View Details
                  </button>
                </div>
              </div>
            </motion.article>
          );
        })}
      </div>
    </>
  );
};

export default Marketplace;