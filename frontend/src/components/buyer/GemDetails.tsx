import { useState, useEffect } from 'react';
import { X, Download, FileDown, ScanSearch } from 'lucide-react';
import type { Auction } from '../../types';
import PdfViewer from '../common/PdfViewer';
import '../../styles/gemdetails.css';

interface GemDetailsProps {
  selectedAuction: Auction | null;
  selectedGemDetails: Auction['gem'] | null;
  loading: boolean;
  bidAmount: string;
  bidFeedback: { type: 'success' | 'error'; message: string } | null;
  placingBid: boolean;
  bidHistory: Array<{
    auctionId: string;
    amount: number;
    timestamp: string;
  }>;
  onClose: () => void;
  onBidAmountChange: (value: string) => void;
  onRequestBidConfirmation: () => void;
  formatCurrency: (value: number) => string;
  formatDateTime: (value: string) => string;
  getLeadingBidderName: (auction?: Auction | null) => string;
  getCertificateAccessUrl: (certificate?: { url?: string; accessUrl?: string }) => string;
  isPdfCertificate: (certificate?: { url?: string; accessUrl?: string; mimeType?: string }) => boolean;
}

interface CountdownTime {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

const GemDetails = ({
  selectedAuction,
  selectedGemDetails,
  loading,
  bidAmount,
  bidFeedback,
  placingBid,
  bidHistory,
  onClose,
  onBidAmountChange,
  onRequestBidConfirmation,
  formatCurrency,
  formatDateTime,
  getLeadingBidderName,
  getCertificateAccessUrl,
  isPdfCertificate,
}: GemDetailsProps) => {
  const [countdown, setCountdown] = useState<CountdownTime>({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!selectedAuction) return;

    const calculateCountdown = () => {
      const ms = new Date(selectedAuction.endTime).getTime() - Date.now();
      if (ms <= 0) {
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      setCountdown({
        days: Math.floor(ms / (1000 * 60 * 60 * 24)),
        hours: Math.floor((ms / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((ms / (1000 * 60)) % 60),
        seconds: Math.floor((ms / 1000) % 60),
      });
    };

    calculateCountdown();
    const interval = setInterval(calculateCountdown, 1000);
    return () => clearInterval(interval);
  }, [selectedAuction]);

  const addToCurrentBid = (amount: number) => {
    if (selectedAuction) {
      const newBid = selectedAuction.currentBid + amount;
      const minRequired = selectedAuction.currentBid + selectedAuction.minimumBidIncrement;
      if (newBid >= minRequired) {
        onBidAmountChange(String(newBid));
      }
    }
  };

  if (!selectedAuction && !selectedGemDetails) return <></>;

  const gem = (selectedGemDetails || selectedAuction?.gem)!;
  const certificateUrl = getCertificateAccessUrl(gem.certificate);
  const hasCertificate = Boolean(certificateUrl);

  // ── Same download logic as admin PendingGems.handleDownloadCertificate ──
  const handleDownloadCertificate = async () => {
    if (!certificateUrl) return;
    setDownloading(true);
    try {
      const response = await fetch(certificateUrl);
      if (!response.ok) throw new Error(`Failed to fetch certificate: ${response.status}`);
      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = `${gem.type.replace(/\s+/g, '_').toLowerCase()}-certificate.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 1000);
    } catch (error) {
      console.error('Failed to download certificate:', error);
      window.open(certificateUrl, '_blank', 'noopener,noreferrer');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="gd-overlay" role="dialog" aria-modal="true">
      <div className="gd-sheet">
        {/* ─── Header ─── */}
        <div className="gd-sheet-header">
          <span className="gd-sheet-title">{gem.type}</span>
          <button className="gd-close-btn" type="button" onClick={onClose}>
            <X size={15} />
          </button>
        </div>

        {loading && <p style={{ color: '#64748b', fontSize: 13, margin: '0 0 12px' }}>Loading details…</p>}

        <div className="gd-layout">
          {/* ═══ Left — Media + Certificate ═══ */}
          <section className="gd-media-panel">
            <div className="gd-hero">
              <span className="gd-hero-chip">{selectedAuction ? 'Auction Listing' : 'Gem Listing'}</span>
              <img
                src={gem.images?.[0] || 'https://via.placeholder.com/900x700'}
                alt={gem.type}
                className="gd-hero-image"
                onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/900x700'; }}
              />
            </div>

            {/* Story card */}
            <div className="gd-story-card">
              <div className="gd-section-heading">
                <div>
                  <p>Gem Story</p>
                  <h3>About this gemstone</h3>
                </div>
                <span className="gd-story-badge">
                  <ScanSearch size={14} />
                  Listing
                </span>
              </div>
              <p className="gd-story-copy">
                {gem.description || 'No description provided for this gemstone.'}
              </p>
              {selectedAuction && (
                <div className="gd-story-meta">
                  <div><span>Auction Starts</span><strong>{new Date(selectedAuction.startTime).toLocaleDateString()}</strong></div>
                  <div><span>Auction Ends</span><strong>{new Date(selectedAuction.endTime).toLocaleDateString()}</strong></div>
                  <div><span>Status</span><strong style={{ textTransform: 'capitalize' }}>{selectedAuction.status}</strong></div>
                </div>
              )}
            </div>

            {/* Certificate card (same as admin) */}
            {hasCertificate && (
              <div className="gd-surface-card">
                <div className="gd-cert-tile">
                  <div className="gd-cert-icon">
                    <FileDown size={18} />
                  </div>
                  <div className="gd-cert-copy">
                    <span>{gem.certificate?.authority || 'Certificate'}</span>
                    <strong>Verified Digital Copy</strong>
                  </div>
                  <a
                    href={certificateUrl}
                    onClick={(e) => {
                      e.preventDefault();
                      void handleDownloadCertificate();
                    }}
                    className={`gd-download-link ${downloading ? 'disabled' : ''}`}
                    aria-label="Download certificate"
                  >
                    <Download size={16} />
                  </a>
                </div>

                <div className="gd-cert-meta">
                  <div><span>Authority</span><strong>{gem.certificate?.authority || 'N/A'}</strong></div>
                  <div><span>Certificate No.</span><strong>{gem.certificate?.certificateNumber || 'N/A'}</strong></div>
                </div>

              </div>
            )}
          </section>

          {/* ═══ Right — Panel ═══ */}
          <aside className="gd-panel">
            {/* Header */}
            <div className="gd-surface-card gd-panel-header-card">
              <div className="gd-panel-kicker-row">
                <span className="gd-panel-kicker">Gem Details</span>
                <span className="gd-panel-id">#{gem._id?.slice(-8)?.toUpperCase()}</span>
              </div>
              <h2 className="gd-panel-title">{gem.type}</h2>
              <p className="gd-panel-subtitle">
                {selectedAuction
                  ? 'Review details and place your bid below.'
                  : 'Gem specifications and listing details.'}
              </p>
            </div>

            {/* Metrics */}
            <div className="gd-surface-card">
              <div className="gd-metrics-list">
                <div className="gd-metric-item">
                  <span className="gd-metric-label">Carat</span>
                  <strong className="gd-metric-value">{gem.carat} ct</strong>
                </div>
                <div className="gd-metric-item">
                  <span className="gd-metric-label">Cut</span>
                  <strong className="gd-metric-value">{gem.cut}</strong>
                </div>
                <div className="gd-metric-item">
                  <span className="gd-metric-label">Color</span>
                  <strong className="gd-metric-value">{gem.color}</strong>
                </div>
                <div className="gd-metric-item">
                  <span className="gd-metric-label">Origin</span>
                  <strong className="gd-metric-value">{gem.origin}</strong>
                </div>
              </div>
            </div>

            {/* ── Auction / Bidding ── */}
            {selectedAuction ? (
              <>
                {selectedAuction.status === 'active' ? (
                  <div className="gd-surface-card gd-bid-card">
                    {bidFeedback && (
                      <div className={`gd-alert ${bidFeedback.type === 'success' ? 'gd-alert--success' : 'gd-alert--warning'}`}>
                        {bidFeedback.message}
                      </div>
                    )}

                    {/* Countdown */}
                    <p className="gd-bid-label">Auction Ends In</p>
                    <div className="gd-countdown">
                      <div className="gd-countdown-unit">
                        <div className="gd-countdown-num">{String(countdown.days).padStart(2, '0')}</div>
                        <div className="gd-countdown-lbl">DAYS</div>
                      </div>
                      <span className="gd-countdown-sep">:</span>
                      <div className="gd-countdown-unit">
                        <div className="gd-countdown-num">{String(countdown.hours).padStart(2, '0')}</div>
                        <div className="gd-countdown-lbl">HOURS</div>
                      </div>
                      <span className="gd-countdown-sep">:</span>
                      <div className="gd-countdown-unit">
                        <div className="gd-countdown-num">{String(countdown.minutes).padStart(2, '0')}</div>
                        <div className="gd-countdown-lbl">MINS</div>
                      </div>
                      <span className="gd-countdown-sep">:</span>
                      <div className="gd-countdown-unit">
                        <div className="gd-countdown-num">{String(countdown.seconds).padStart(2, '0')}</div>
                        <div className="gd-countdown-lbl">SECS</div>
                      </div>
                    </div>

                    {/* Current bid */}
                    <p className="gd-bid-label">Current Highest Bid</p>
                    <div className="gd-bid-price">{formatCurrency(selectedAuction.currentBid)}</div>
                    <p className="gd-bid-sub">
                      by <strong>{getLeadingBidderName(selectedAuction)}</strong>
                    </p>

                    {/* Bid input */}
                    <p className="gd-bid-label">Your Bid</p>
                    <input
                      className="gd-bid-input"
                      value={bidAmount}
                      onChange={(e) => onBidAmountChange(e.target.value)}
                      type="number"
                      min={selectedAuction.currentBid + selectedAuction.minimumBidIncrement}
                      placeholder={String(selectedAuction.currentBid + selectedAuction.minimumBidIncrement)}
                    />

                    {/* Quick bids */}
                    <div className="gd-quick-bids">
                      <button className="gd-quick-bid-btn" type="button" onClick={() => addToCurrentBid(100)}>+Rs.100</button>
                      <button className="gd-quick-bid-btn" type="button" onClick={() => addToCurrentBid(250)}>+Rs.250</button>
                      <button className="gd-quick-bid-btn" type="button" onClick={() => addToCurrentBid(500)}>+Rs.500</button>
                    </div>

                    <button className="gd-place-bid-btn" type="button" disabled={placingBid} onClick={onRequestBidConfirmation}>
                      {placingBid ? 'Placing…' : 'Place Bid'}
                    </button>

                    <p className="gd-min-increment">
                      Minimum increment: {formatCurrency(selectedAuction.minimumBidIncrement)}
                    </p>
                  </div>
                ) : (
                  <></>
                )}

                {/* Bid history */}
                <div className="gd-surface-card">
                  <div className="gd-section-heading">
                    <div>
                      <p>History</p>
                      <h3>Bid Activity</h3>
                    </div>
                  </div>

                  {selectedAuction.bids.length === 0 ? (
                    <p style={{ color: '#64748b', fontSize: 13, margin: 0 }}>No bids yet.</p>
                  ) : (
                    selectedAuction.bids.slice().reverse().slice(0, 5).map((bid, i) => (
                      <div key={`${bid.timestamp}-${i}`} className="gd-history-row">
                        <div>
                          <div className="gd-history-name">{bid.bidder.name}</div>
                          <div className="gd-history-date">{formatDateTime(bid.timestamp)}</div>
                        </div>
                        <div>
                          <div className="gd-history-amount">{formatCurrency(bid.amount)}</div>
                          <div className="gd-history-label">{i === 0 ? 'Latest bid' : 'Earlier bid'}</div>
                        </div>
                      </div>
                    ))
                  )}

                  {/* Personal bid history */}
                  {bidHistory.filter((e) => e.auctionId === selectedAuction._id).length > 0 && (
                    <>
                      <div className="gd-section-heading" style={{ marginTop: 16 }}>
                        <div>
                          <p>Your Bids</p>
                          <h3>Personal History</h3>
                        </div>
                      </div>
                      {bidHistory
                        .filter((e) => e.auctionId === selectedAuction._id)
                        .slice(0, 5)
                        .map((entry, i) => (
                          <div key={`${entry.timestamp}-${i}`} className="gd-history-row">
                            <div className="gd-history-date">{new Date(entry.timestamp).toLocaleString()}</div>
                            <div className="gd-history-amount">{formatCurrency(entry.amount)}</div>
                          </div>
                        ))}
                    </>
                  )}
                </div>
              </>
            ) : (
              /* Direct sale (no auction) */
              <div className="gd-surface-card gd-bid-card">
                <p className="gd-bid-label">Direct Sale</p>
                <p className="gd-story-copy">{gem.description || 'Contact the seller for more information.'}</p>
                <a
                  className="gd-contact-btn"
                  href={gem.seller?.email ? `mailto:${gem.seller.email}?subject=Inquiry about ${encodeURIComponent(gem.type)}` : '#'}
                >
                  Contact Seller
                </a>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
};

export default GemDetails;