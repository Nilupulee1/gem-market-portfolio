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
  showHeader?: boolean;
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
  showHeader = true,
}: LiveAuctionsProps) => {
  return (
    <>
      {showHeader && (
        <div className="section-head">
          <div>
            <h3>Live Auctions</h3>
            <p className="mb-0 text-secondary">
              {auctions.length} {auctions.length === 1 ? 'auction' : 'auctions'} available
            </p>
          </div>
        </div>
      )}

      <div className="market-grid">
        {auctions.length === 0 && (
          <div className="market-empty-state">
            <h5>No live auctions found</h5>
            <p>Check back later for new auctions.</p>
          </div>
        )}

        {auctions.map((auction) => {
          const inWatchlist = watchlistIds.includes(auction._id);
          const lot = auction._id.slice(-4).toUpperCase();
          // highlight urgent if less than 1 hour remaining
          const remainingMs = new Date(auction.endTime).getTime() - nowMs;
          const urgent = remainingMs > 0 && remainingMs <= 1000 * 60 * 60;
          return (
            <motion.article key={auction._id} whileHover={{ y: -5 }} className="market-card">
              <div style={{ position: 'relative' }}>
                <img
                  className="market-image"
                  src={auction.gem.images?.[0] || 'https://via.placeholder.com/460x280'}
                  alt={auction.gem.type}
                  style={{ height: 240, objectFit: 'cover' }}
                />

                <div style={{ position: 'absolute', top: 10, left: 10 }} className="lot-badge">
                  <span style={{ background: 'rgba(0,0,0,0.7)', color: '#fff', padding: '6px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700 }}>LOT #{lot}</span>
                </div>

                <div style={{ position: 'absolute', top: 10, right: 10 }}>
                  <span style={{ background: urgent ? '#ef4444' : '#10b981', color: '#fff', padding: '6px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700 }}>
                    {urgent ? 'Closing Soon' : 'Live'}
                  </span>
                </div>
              </div>

              <div className="market-body">
                <strong style={{ fontSize: 18 }}>{auction.gem.type}</strong>
                <p className="market-meta" style={{ marginTop: 6 }}>
                  {auction.gem.origin} · {auction.gem.carat} ct
                </p>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                  <div>
                    <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)' }}>CURRENT BID</p>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#1f3a8a', marginTop: 6 }}>{formatCurrency(auction.currentBid)}</div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)' }}>ENDS IN</p>
                    <div style={{ fontSize: 18, fontWeight: 700, color: urgent ? '#ef4444' : '#1f2937', marginTop: 6 }}>{formatRemaining(auction.endTime, nowMs)}</div>
                  </div>
                </div>

                <div style={{ marginTop: 12, display: 'flex', gap: 10, flexDirection: 'column' }}>
                  <button className="bid-btn" type="button" onClick={() => onOpenDetails(auction._id)} style={{ padding: '12px', fontWeight: 700 }}>
                    Bid Now
                  </button>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="ghost-btn" type="button" onClick={() => onOpenDetails(auction._id)} style={{ flex: 1 }}>
                      Details & History
                    </button>
                    <button className="watch-btn" type="button" onClick={() => onToggleWatchlist(auction._id)} style={{ width: 120 }}>
                      <Heart size={14} fill={inWatchlist ? 'currentColor' : 'none'} />
                      {inWatchlist ? 'Saved' : 'Save'}
                    </button>
                  </div>
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
