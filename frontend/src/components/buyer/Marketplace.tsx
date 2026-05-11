import { motion } from 'framer-motion';
import { Heart, Timer } from 'lucide-react';
import type { Auction } from '../../types';

interface MarketplaceProps {
  auctions: Auction[];
  query: string;
  selectedType: string;
  uniqueTypes: string[];
  watchlistIds: string[];
  nowMs: number;
  onQueryChange: (value: string) => void;
  onTypeChange: (value: string) => void;
  onToggleWatchlist: (auctionId: string) => void;
  onOpenDetails: (auctionId: string) => void;
  formatCurrency: (value: number) => string;
  formatRemaining: (endTime: string, nowMs: number) => string;
  getLeadingBidderName: (auction?: Auction | null) => string;
}

const Marketplace = ({
  auctions,
  query,
  selectedType,
  uniqueTypes,
  watchlistIds,
  nowMs,
  onQueryChange,
  onTypeChange,
  onToggleWatchlist,
  onOpenDetails,
  formatCurrency,
  formatRemaining,
  getLeadingBidderName,
}: MarketplaceProps) => {
  return (
    <>
      <div className="section-head">
        <div>
          <h3>Browse Gems</h3>
          <p className="mb-0 text-secondary">Showing {auctions.length} gems</p>
        </div>
      </div>

      <div className="control-row">
        <input
          className="buyer-search"
          placeholder="Search gems..."
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
        />
        <select value={selectedType} onChange={(event) => onTypeChange(event.target.value)}>
          {uniqueTypes.map((type) => (
            <option key={type} value={type}>
              {type === 'all' ? 'All Types' : type}
            </option>
          ))}
        </select>
      </div>

      <div className="market-grid">
        {auctions.map((auction) => {
          const inWatchlist = watchlistIds.includes(auction._id);
          return (
            <motion.article key={auction._id} whileHover={{ y: -5 }} className="market-card">
              <img className="market-image" src={auction.gem.images[0]} alt={auction.gem.type} />
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