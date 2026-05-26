import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { Auction } from '../../types';
import PdfViewer from '../common/PdfViewer';

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
  onOpenSellerContact: (seller: { _id?: string; name: string; email: string; phone?: string }, gemName: string, gemId: string) => void;
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
  onOpenSellerContact,
}: GemDetailsProps) => {
  const [countdown, setCountdown] = useState<CountdownTime>({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    if (!selectedAuction) return;

    const calculateCountdown = () => {
      const ms = new Date(selectedAuction.endTime).getTime() - Date.now();
      if (ms <= 0) {
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const days = Math.floor(ms / (1000 * 60 * 60 * 24));
      const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((ms / (1000 * 60)) % 60);
      const seconds = Math.floor((ms / 1000) % 60);

      setCountdown({ days, hours, minutes, seconds });
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

  if (!selectedAuction && !selectedGemDetails) {
    return <></>;
  }

  const gem = (selectedGemDetails || selectedAuction?.gem)!;
  const certificateUrl = getCertificateAccessUrl(gem.certificate);
  const hasCertificate = Boolean(certificateUrl);

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-sheet">
          <div className="d-flex justify-content-between align-items-center mb-2">
          <strong>{gem.type}</strong>
          <button className="ghost-btn" type="button" onClick={onClose}>
            <X size={15} />
          </button>
        </div>

        {loading && <p className="empty-note mb-3">Loading details...</p>}

        <div className="modal-grid">
          <div>
            <img className="modal-photo" src={gem.images?.[0] || 'https://via.placeholder.com/760x480'} alt={gem.type} />
            <div className="metric-row mt-2">
              <div className="metric">
                <p>Certified Authentic</p>
                <strong>{gem.certificate?.authority || 'Not available'}</strong>
              </div>
              <div className="metric">
                <p>Certificate No</p>
                <strong>{gem.certificate?.certificateNumber || 'Not provided'}</strong>
              </div>
            </div>

            <div className="metric cert-preview-card mt-2">
              <p>Certificate Preview</p>
              <strong>{gem.certificate?.authority || 'No certificate metadata'}</strong>
              <div className="certificate-frame mt-2">
                {!hasCertificate ? (
                  <div className="empty-note mb-0">Certificate preview unavailable</div>
                ) : isPdfCertificate(gem.certificate) ? (
                  <PdfViewer url={certificateUrl} />
                ) : (
                  <img
                    src={certificateUrl}
                    alt="Certificate"
                    className="w-100 rounded"
                  />
                )}
              </div>
              {hasCertificate && (
                <a
                  className="btn btn-outline-primary btn-sm mt-2"
                  href={certificateUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open Certificate
                </a>
              )}
            </div>
          </div>

          <div>
                <div className="metric-row">
                  <div className="metric"><p>Carat</p><strong>{gem.carat} ct</strong></div>
                  <div className="metric"><p>Cut</p><strong>{gem.cut}</strong></div>
                  <div className="metric"><p>Color</p><strong>{gem.color}</strong></div>
                  <div className="metric"><p>Origin</p><strong>{gem.origin}</strong></div>
                </div>

            {selectedAuction ? (
              <>
                <div className="metric-row mb-3">
                  <div className="metric">
                    <p>Current Leader</p>
                    <strong>{getLeadingBidderName(selectedAuction)}</strong>
                  </div>
                  <div className="metric">
                    <p>Current Bid</p>
                    <strong>{formatCurrency(selectedAuction.currentBid)}</strong>
                  </div>
                </div>

                <p className="text-secondary">{gem.description}</p>

                {selectedAuction.status === 'active' ? (
                  <section className="block-card">
                    {bidFeedback && (
                      <div className={`alert ${bidFeedback.type === 'success' ? 'alert-success' : 'alert-warning'}`} role="alert">
                        {bidFeedback.message}
                      </div>
                    )}

                    {/* Countdown Timer */}
                    {selectedAuction.status === 'active' && (
                      <div className="mb-3" style={{ padding: '16px', backgroundColor: 'rgba(255, 193, 7, 0.1)', borderRadius: '8px', border: '1px solid rgba(255, 193, 7, 0.3)' }}>
                        <p className="m-0 text-secondary small">Auction Ends In</p>
                        <div style={{ display: 'flex', gap: '12px', marginTop: '8px', alignItems: 'center', justifyContent: 'center' }}>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ffc107' }}>{String(countdown.days).padStart(2, '0')}</div>
                            <div style={{ fontSize: '10px', color: '#666', marginTop: '4px' }}>DAYS</div>
                          </div>
                          <div style={{ fontSize: '20px', color: '#999' }}>:</div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ffc107' }}>{String(countdown.hours).padStart(2, '0')}</div>
                            <div style={{ fontSize: '10px', color: '#666', marginTop: '4px' }}>HOURS</div>
                          </div>
                          <div style={{ fontSize: '20px', color: '#999' }}>:</div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ffc107' }}>{String(countdown.minutes).padStart(2, '0')}</div>
                            <div style={{ fontSize: '10px', color: '#666', marginTop: '4px' }}>MINS</div>
                          </div>
                          <div style={{ fontSize: '20px', color: '#999' }}>:</div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ffc107' }}>{String(countdown.seconds).padStart(2, '0')}</div>
                            <div style={{ fontSize: '10px', color: '#666', marginTop: '4px' }}>SECS</div>
                          </div>
                        </div>
                      </div>
                    )}

                    <p className="m-0 text-secondary small mb-2">Current Highest Bid</p>
                    <div className="bid-price">{formatCurrency(selectedAuction.currentBid)}</div>
                    <p className="text-secondary small mb-3">
                      by <strong>{getLeadingBidderName(selectedAuction)}</strong>
                    </p>

                    <p className="m-0 text-secondary small mb-2">Your Bid</p>
                    <div className="d-flex gap-2 mb-3">
                      <input
                        className="buyer-search"
                        value={bidAmount}
                        onChange={(event) => onBidAmountChange(event.target.value)}
                        type="number"
                        min={selectedAuction.currentBid + selectedAuction.minimumBidIncrement}
                        placeholder={String(selectedAuction.currentBid + selectedAuction.minimumBidIncrement)}
                      />
                    </div>

                    {/* Quick Bid Buttons */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '12px' }}>
                      <button 
                        className="ghost-btn" 
                        type="button" 
                        onClick={() => addToCurrentBid(100)}
                        style={{ padding: '8px 12px', fontSize: '14px' }}
                      >
                        +Rs.100
                      </button>
                      <button 
                        className="ghost-btn" 
                        type="button" 
                        onClick={() => addToCurrentBid(250)}
                        style={{ padding: '8px 12px', fontSize: '14px' }}
                      >
                        +Rs.250
                      </button>
                      <button 
                        className="ghost-btn" 
                        type="button" 
                        onClick={() => addToCurrentBid(500)}
                        style={{ padding: '8px 12px', fontSize: '14px' }}
                      >
                        +Rs.500
                      </button>
                    </div>

                    <button className="bid-btn w-100" type="button" disabled={placingBid} onClick={onRequestBidConfirmation}>
                      {placingBid ? 'Placing...' : 'Place Bid'}
                    </button>

                    <p className="text-secondary small mt-2 mb-0">
                      Minimum increment: {formatCurrency(selectedAuction.minimumBidIncrement)}
                    </p>
                  </section>
                ) : (
                  <section className="block-card">
                    <p className="m-0 text-secondary">Auction ended</p>
                    <div className="bid-price">Winner: {getLeadingBidderName(selectedAuction)}</div>
                    <p className="text-secondary small mb-3">
                      Final bid: {formatCurrency(selectedAuction.currentBid)}
                    </p>
                    {selectedAuction.seller && (
                      <button
                        className="bid-btn w-100"
                        type="button"
                        onClick={() => onOpenSellerContact(selectedAuction.seller, gem.type, selectedAuction.gem._id || gem._id)}
                      >
                        Contact Seller
                      </button>
                    )}
                  </section>
                )}
              </>
            ) : (
              <>
                <p className="text-secondary">{gem.description}</p>
                <section className="block-card">
                  <p className="m-0 text-secondary">Direct sale listing</p>
                  <div className="d-flex gap-2 mt-2">
                    <a
                      className="bid-btn"
                      href={gem.seller?.email ? `mailto:${gem.seller.email}?subject=Inquiry about ${encodeURIComponent(gem.type)}` : '#'}
                    >
                      Contact Seller
                    </a>
                  </div>
                </section>
              </>
            )}

            {selectedAuction && (
              <section className="block-card">
                <h6>Gem History</h6>
                <div className="d-flex flex-column gap-2">
                  <div className="d-flex justify-content-between border-bottom py-2">
                    <span className="text-secondary">Auction status</span>
                    <strong>{selectedAuction.status}</strong>
                  </div>
                  <div className="d-flex justify-content-between border-bottom py-2">
                    <span className="text-secondary">Auction started</span>
                    <strong>{new Date(selectedAuction.startTime).toLocaleString()}</strong>
                  </div>
                  <div className="d-flex justify-content-between border-bottom py-2">
                    <span className="text-secondary">Auction ends</span>
                    <strong>{new Date(selectedAuction.endTime).toLocaleString()}</strong>
                  </div>
                  <div className="d-flex justify-content-between border-bottom py-2">
                    <span className="text-secondary">Certificate</span>
                    <strong>{gem.certificate?.certificateNumber || 'N/A'}</strong>
                  </div>
                </div>

                <h6 className="mt-3">Bid History</h6>
                {selectedAuction.bids.length === 0 ? (
                  <p className="text-secondary mb-0">No bids yet.</p>
                ) : (
                  selectedAuction.bids.slice().reverse().slice(0, 5).map((bid, index) => (
                    <div key={`${bid.timestamp}-${index}`} className="d-flex justify-content-between align-items-start border-bottom py-2 gap-2">
                      <div>
                        <strong>{bid.bidder.name}</strong>
                        <div className="text-secondary small">{formatDateTime(bid.timestamp)}</div>
                      </div>
                      <div className="text-end">
                        <strong>{formatCurrency(bid.amount)}</strong>
                        <div className="text-secondary small">{index === 0 ? 'Latest bid' : 'Earlier bid'}</div>
                      </div>
                    </div>
                  ))
                )}

                <h6 className="mt-3">Your Gem History</h6>
                {bidHistory.filter((entry) => entry.auctionId === selectedAuction._id).length === 0 ? (
                  <p className="text-secondary mb-0">No personal bid history for this gem.</p>
                ) : (
                  bidHistory
                    .filter((entry) => entry.auctionId === selectedAuction._id)
                    .slice(0, 5)
                    .map((entry, index) => (
                      <div key={`${entry.timestamp}-${index}`} className="d-flex justify-content-between border-bottom py-2">
                        <span>{new Date(entry.timestamp).toLocaleString()}</span>
                        <strong>{formatCurrency(entry.amount)}</strong>
                      </div>
                    ))
                )}
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GemDetails;