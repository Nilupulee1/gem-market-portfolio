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
    <article
      className="market-card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
        backgroundColor: 'var(--surface, #fff)',
        height: '100%',         // fill the Col height so cards in a row align
      }}
    >
      {/* ── Image ── */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <img
          src={gemImage}
          alt={gem.type}
          style={{
            width: '100%',
            height: '180px',
            objectFit: 'cover',
            display: 'block',   // kills the 4px gap under inline images
            backgroundColor: 'var(--page-surface-muted)',
          }}
        />

        {/* Lot badge */}
        <div style={{
          position: 'absolute', top: 10, left: 10,
          backgroundColor: 'var(--badge-bg, #1a202c)',
          color: 'var(--surface-text-on-accent, #fff)',
          padding: '4px 10px', borderRadius: '6px',
          fontSize: '12px', fontWeight: 600,
        }}>
          Lot #{lotNumber}
        </div>

        {/* Status badge */}
        <div style={{
          position: 'absolute', top: 10, right: 10,
          backgroundColor: isWinning ? 'var(--success, #10b981)' : 'var(--danger, #ef4444)',
          color: 'var(--surface-text-on-accent, #fff)',
          padding: '4px 10px', borderRadius: '6px',
          fontSize: '11px', fontWeight: 700,
          display: 'flex', alignItems: 'center', gap: '4px',
        }}>
          {isWinning && <TrendingUp size={12} />}
          {isWinning ? 'Winning' : 'Outbid'}
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{
        padding: '14px 16px 16px',
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        gap: '10px',
      }}>
        {/* Name */}
        <strong style={{ fontSize: '15px', color: 'var(--text-primary, #1a202c)', lineHeight: 1.3 }}>
          {gem.type}
        </strong>

        {/* Origin / carat */}
        {gem.origin && (
          <p style={{ fontSize: '13px', color: 'var(--text-secondary, #718096)', margin: 0 }}>
            {gem.origin}{gem.carat ? ` • ${gem.carat} ct` : ''}
          </p>
        )}

        {/* Bid row */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px',
          padding: '10px', borderRadius: '8px',
          backgroundColor: 'var(--page-surface-muted, #f8f9fa)',
        }}>
          <div>
            <p style={{ fontSize: '11px', color: 'var(--text-secondary, #718096)', margin: '0 0 2px', fontWeight: 500 }}>
              Current Bid
            </p>
            <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary, #1a202c)', margin: 0 }}>
              {formatCurrency(currentBid)}
            </p>
          </div>
          <div>
            <p style={{ fontSize: '11px', color: 'var(--text-secondary, #718096)', margin: '0 0 2px', fontWeight: 500 }}>
              Your Bid
            </p>
            <p style={{ fontSize: '14px', fontWeight: 600, color: isWinning ? '#10b981' : '#ef4444', margin: 0 }}>
              {formatCurrency(myHighestBid)}
            </p>
          </div>
        </div>

        {/* Timer */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '8px', borderRadius: '8px',
          backgroundColor: hasEnded ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.06)',
          fontSize: '12px', fontWeight: 600,
          color: hasEnded ? 'var(--danger, #ef4444)' : 'var(--success, #10b981)',
        }}>
          <Timer size={14} />
          {hasEnded ? 'Ended' : formatRemaining(endTime, nowMs)}
        </div>

        {/* Buttons pushed to bottom */}
        <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
          <button
            className="bid-btn"
            type="button"
            onClick={() => onIncreaseBid(item)}
            disabled={hasEnded}
            style={{ flex: 1, opacity: hasEnded ? 0.5 : 1, cursor: hasEnded ? 'not-allowed' : 'pointer' }}
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