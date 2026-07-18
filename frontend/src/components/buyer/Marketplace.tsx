import { motion } from 'framer-motion';
import { Heart, Timer } from 'lucide-react';
import type { Auction, Gem } from '../../types';

interface MarketplaceProps {
  auctions: Auction[];
  approvedGems: Gem[];
  query: string;
  selectedType: string;
  watchlistAuctionIds: string[];
  watchlistGemIds: string[];
  nowMs: number;
  onToggleAuctionWatchlist: (auctionId: string) => void;
  onToggleGemWatchlist: (gemId: string) => void;
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
  watchlistAuctionIds,
  watchlistGemIds,
  nowMs,
  onToggleAuctionWatchlist,
  onToggleGemWatchlist,
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
      <div className="dashboard-hero hero-premium-mesh mb-4 port-hero-card">
        <div>
          <p className="dashboard-eyebrow mb-2">Marketplace</p>
          <h4>Masterpiece Collection</h4>
          <p className="mb-0">Showing {totalVisible} exquisite specimens curated for investment.</p>
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
          <motion.article key={`gem-${gem._id}`} whileHover={{ y: -3 }} className="portfolio-gem-card h-100 d-flex flex-column">
            <div className="portfolio-gem-img-wrap">
              <img
                className="portfolio-gem-img"
                src={gem.images?.[0] || 'https://via.placeholder.com/460x280'}
                alt={gem.type}
                onError={e => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x280?text=Image+Not+Found'; }}
              />
              <span className="portfolio-gem-badge portfolio-gem-badge--approved">
                Direct Sale
              </span>
            </div>
            <div className="portfolio-gem-body d-flex flex-column flex-grow-1">
              <strong className="portfolio-gem-name">{gem.type}</strong>
              <p className="portfolio-gem-meta">
                {gem.origin} · {gem.carat} ct
              </p>
              <p className="portfolio-gem-meta">
                {gem.cut} · {gem.color}
              </p>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="bid-price" style={{ fontSize: '15px', fontWeight: 700 }}>Direct Sale</span>
              </div>
              <p className="portfolio-gem-meta mb-0">
                Seller: <strong>{gem.seller.name}</strong>
              </p>
              <div className="portfolio-gem-actions mt-auto pt-2">
                <div style={{ display: 'flex', gap: 8, width: '100%' }}>
                  <button className="watch-btn" type="button" style={{ padding: '8px 12px', fontSize: '13px' }} onClick={() => onToggleGemWatchlist(gem._id)}>
                    <Heart size={15} fill={watchlistGemIds.includes(gem._id) ? 'currentColor' : 'none'} />
                    {watchlistGemIds.includes(gem._id) ? 'Saved' : 'Save'}
                  </button>
                  <button className="ghost-btn" type="button" style={{ padding: '8px 12px', fontSize: '13px' }} onClick={() => onOpenGemDetails(gem._id)}>
                    View Details
                  </button>
                  <button
                    className="bid-btn"
                    type="button"
                    style={{ flex: 1, padding: '8px 12px', fontSize: '13px' }}
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
          const inWatchlist = watchlistAuctionIds.includes(auction._id);
          return (
            <motion.article key={auction._id} whileHover={{ y: -3 }} className="portfolio-gem-card h-100 d-flex flex-column">
              <div className="portfolio-gem-img-wrap">
                <img
                  className="portfolio-gem-img"
                  src={auction.gem.images?.[0] || 'https://via.placeholder.com/460x280'}
                  alt={auction.gem.type}
                  onError={e => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x280?text=Image+Not+Found'; }}
                />
                <span className="portfolio-gem-badge portfolio-gem-badge--pending">
                  Live Auction
                </span>
              </div>
              <div className="portfolio-gem-body d-flex flex-column flex-grow-1">
                <strong className="portfolio-gem-name">{auction.gem.type}</strong>
                <p className="portfolio-gem-meta">
                  {auction.gem.origin} · {auction.gem.carat} ct
                </p>
                <p className="portfolio-gem-meta">
                  {auction.gem.cut} · {auction.gem.color}
                </p>
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="bid-price" style={{ fontSize: '16px', fontWeight: 800 }}>{formatCurrency(auction.currentBid)}</span>
                  <span className="auction-timer" style={{ fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Timer size={14} /> {formatRemaining(auction.endTime, nowMs)}
                  </span>
                </div>
                <p className="portfolio-gem-meta mb-0">
                  Current leader: <strong>{getLeadingBidderName(auction)}</strong>
                </p>
                <div className="portfolio-gem-actions mt-auto pt-2">
                    <button className="watch-btn" type="button" style={{ padding: '8px 12px', fontSize: '13px' }} onClick={() => onToggleAuctionWatchlist(auction._id)}>
                    <Heart size={15} fill={inWatchlist ? 'currentColor' : 'none'} />
                    {inWatchlist ? 'Watched' : 'Watch'}
                  </button>
                  <button className="bid-btn" type="button" style={{ padding: '8px 12px', fontSize: '13px' }} onClick={() => onOpenDetails(auction._id)}>
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