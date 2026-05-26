import { motion } from 'framer-motion';
import { Heart, Timer } from 'lucide-react';
import type { Auction } from '../../types';

interface LiveAuctionsProps {
  auctions: Auction[];
  watchlistIds: string[];
  nowMs: number;
  onToggleWatchlist: (auctionId: string) => void;
  onOpenDetails: (auctionId: string) => void;
  formatCurrency: (value: number) => string;
  formatRemaining: (endTime: string, nowMs: number) => string;
  getLeadingBidderName: (auction?: Auction | null) => string;
}

const LiveAuctions = ({
  auctions,
  watchlistIds,
  nowMs,
  onToggleWatchlist,
  onOpenDetails,
  formatCurrency,
  formatRemaining,
  getLeadingBidderName,
}: LiveAuctionsProps) => {
  return (
    <>
      <div className="section-head">
        <div>
          <h3>Live Auctions</h3>
          <p className="mb-0 text-secondary">
            {auctions.length} {auctions.length === 1 ? 'auction' : 'auctions'} available
          </p>
        </div>
      </div>

      <div className="market-grid">
        {auctions.length === 0 && (
          <div className="market-empty-state">
            <h5>No live auctions found</h5>
            <p>Check back later for new auctions.</p>
          </div>
        )}

        {auctions.map((auction) => {
          const inWatchlist = watchlistIds.includes(auction._id);
          return (
            <motion.article key={auction._id} whileHover={{ y: -5 }} className="market-card">
              <img
                className="market-image"
                src={auction.gem.images?.[0] || 'https://via.placeholder.com/460x280'}
                alt={auction.gem.type}
              />
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

export default LiveAuctions;
