import { Timer, TrendingUp } from 'lucide-react';
import type { ActiveBidItem } from './BuyerDashboard';

interface ActiveBidsCardProps {
  item: ActiveBidItem;
  nowMs: number;
  formatCurrency: (value: number) => string;
  formatRemaining: (endTime: string, nowMs: number) => string;
  onIncreaseBid: (item: ActiveBidItem) => void;
  onViewDetails: (auctionId: string) => void;
}

export default function ActiveBidsCard({
  item,
  nowMs,
  formatCurrency,
  formatRemaining,
  onIncreaseBid,
  onViewDetails,
}: ActiveBidsCardProps) {
  const { auction, myHighestBid, isWinning, remainingTimeMs } = item;
  const { gem, currentBid, endTime, _id: auctionId } = auction;
  const gemImage = gem.images?.[0] || 'https://via.placeholder.com/460x280';
  const hasEnded = remainingTimeMs <= 0;
  const lotNumber = auctionId.slice(-4).toUpperCase();

  return (
    <article className="market-card">
      {/* Image Container */}
      <div style={{ position: 'relative' }}>
          <img
          className="market-image"
          src={gemImage}
          alt={gem.type}
          style={{
            width: '100%',
            height: '180px',
            objectFit: 'cover',
              backgroundColor: 'var(--page-surface-muted)',
          }}
        />
        {/* Lot Number Badge */}
        <div
          style={{
            position: 'absolute',
            top: '10px',
            left: '10px',
            backgroundColor: 'var(--badge-bg)',
            color: 'var(--surface-text-on-accent)',
            padding: '4px 10px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: '600',
          }}
        >
          Lot #{lotNumber}
        </div>

        {/* Status Badge */}
          <div
            style={{
              position: 'absolute',
              top: '10px',
              right: '10px',
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              backgroundColor: isWinning ? 'var(--success)' : 'var(--danger)',
              color: 'var(--surface-text-on-accent)',
            }}
        >
          {isWinning ? <TrendingUp size={12} /> : null}
          {isWinning ? 'Winning' : 'Outbid'}
        </div>
      </div>

      {/* Card Body */}
      <div className="market-body">
        {/* Gem Name */}
        <strong
          style={{
            display: 'block',
            fontSize: '15px',
            marginBottom: '6px',
            color: '#1a202c',
          }}
        >
          {gem.type}
        </strong>

        {/* Gem Details */}
        {gem.origin && (
          <p
            className="market-meta"
            style={{
              fontSize: '13px',
              color: '#718096',
              margin: '0 0 8px',
            }}
          >
            {gem.origin}
            {gem.carat ? ` • ${gem.carat} ct` : ''}
          </p>
        )}

        {/* Bid Information */}
        <div style={{ marginBottom: '10px' }}>
          <p
            style={{
              fontSize: '12px',
              color: '#718096',
              margin: '0 0 4px',
              fontWeight: '500',
            }}
          >
            Current Bid
          </p>
          <p
            style={{
              fontSize: '16px',
              fontWeight: '700',
              color: '#1a202c',
              margin: '0 0 6px',
            }}
          >
            {formatCurrency(currentBid)}
          </p>

          <p
            style={{
              fontSize: '12px',
              color: '#718096',
              margin: '0 0 4px',
              fontWeight: '500',
            }}
          >
            Your Bid
          </p>
          <p
            style={{
              fontSize: '14px',
              fontWeight: '600',
              color: isWinning ? '#10b981' : '#ef4444',
              margin: '0',
            }}
          >
            {formatCurrency(myHighestBid)}
          </p>
        </div>

        {/* Time Remaining */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            marginBottom: '12px',
            padding: '8px',
            backgroundColor: hasEnded ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.06)',
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: '600',
            color: hasEnded ? 'var(--danger)' : 'var(--success)',
          }}
        >
          <Timer size={14} />
          {hasEnded ? 'Ended' : formatRemaining(endTime, nowMs)}
        </div>

        {/* Action Buttons */}
        <div className="market-actions" style={{ marginTop: '10px' }}>
          <button
            className="bid-btn"
            type="button"
            onClick={() => onIncreaseBid(item)}
            disabled={hasEnded}
            style={{
              flex: 1,
              opacity: hasEnded ? 0.5 : 1,
              cursor: hasEnded ? 'not-allowed' : 'pointer',
            }}
          >
            Increase Bid
          </button>
          <button
            className="ghost-btn"
            type="button"
            onClick={() => onViewDetails(auctionId)}
            style={{ flex: 1 }}
          >
            View Details
          </button>
        </div>
      </div>
    </article>
  );
}
