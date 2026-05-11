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
  onSetMinimumBid: () => void;
  onSetDoubleBid: () => void;
  formatCurrency: (value: number) => string;
  formatDateTime: (value: string) => string;
  getLeadingBidderName: (auction?: Auction | null) => string;
  getCertificateAccessUrl: (certificate?: { url?: string; accessUrl?: string }) => string;
  isPdfCertificate: (certificate?: { url?: string; accessUrl?: string; mimeType?: string }) => boolean;
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
  onSetMinimumBid,
  onSetDoubleBid,
  formatCurrency,
  formatDateTime,
  getLeadingBidderName,
  getCertificateAccessUrl,
  isPdfCertificate,
}: GemDetailsProps) => {
  if (!selectedAuction) {
    return (
      <></>
    );
  }

  const gem = selectedGemDetails || selectedAuction.gem;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-sheet">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <strong>{selectedAuction.gem.type}</strong>
          <button className="ghost-btn" type="button" onClick={onClose}>
            <X size={15} />
          </button>
        </div>

        {loading && <p className="empty-note mb-3">Loading auction details...</p>}

        <div className="modal-grid">
          <div>
            <img className="modal-photo" src={selectedAuction.gem.images[0]} alt={selectedAuction.gem.type} />
            <div className="metric-row mt-2">
              <div className="metric">
                <p>Certified Authentic</p>
                <strong>{selectedAuction.gem.certificate.authority}</strong>
              </div>
              <div className="metric">
                <p>Certificate No</p>
                <strong>{selectedAuction.gem.certificate.certificateNumber}</strong>
              </div>
            </div>

            <div className="metric cert-preview-card mt-2">
              <p>Certificate Preview</p>
              <strong>{gem.certificate.authority}</strong>
              <div className="certificate-frame mt-2">
                {isPdfCertificate(gem.certificate) ? (
                  <PdfViewer url={getCertificateAccessUrl(gem.certificate)} />
                ) : (
                  <img
                    src={getCertificateAccessUrl(gem.certificate)}
                    alt="Certificate"
                    className="w-100 rounded"
                  />
                )}
              </div>
              <a
                className="btn btn-outline-primary btn-sm mt-2"
                href={getCertificateAccessUrl(gem.certificate)}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open Certificate
              </a>
            </div>
          </div>

          <div>
            <div className="metric-row">
              <div className="metric"><p>Carat</p><strong>{selectedAuction.gem.carat} ct</strong></div>
              <div className="metric"><p>Cut</p><strong>{selectedAuction.gem.cut}</strong></div>
              <div className="metric"><p>Color</p><strong>{selectedAuction.gem.color}</strong></div>
              <div className="metric"><p>Origin</p><strong>{selectedAuction.gem.origin}</strong></div>
            </div>

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

            <p className="text-secondary">{selectedAuction.gem.description}</p>

            <section className="block-card">
              {bidFeedback && (
                <div className={`alert ${bidFeedback.type === 'success' ? 'alert-success' : 'alert-warning'}`} role="alert">
                  {bidFeedback.message}
                </div>
              )}

              <p className="m-0 text-secondary">Current Bid</p>
              <div className="bid-price">{formatCurrency(selectedAuction.currentBid)}</div>
              <p className="text-secondary small">
                Minimum increment: {formatCurrency(selectedAuction.minimumBidIncrement)}
              </p>

              <div className="d-flex gap-2">
                <input
                  className="buyer-search"
                  value={bidAmount}
                  onChange={(event) => onBidAmountChange(event.target.value)}
                  type="number"
                  min={selectedAuction.currentBid + selectedAuction.minimumBidIncrement}
                />
                <button className="bid-btn" type="button" disabled={placingBid} onClick={onRequestBidConfirmation}>
                  {placingBid ? 'Placing...' : 'Place Bid'}
                </button>
              </div>

              <p className="text-secondary small mt-2 mb-0">
                Your bid will be reviewed in a confirmation step before submission.
              </p>

              <div className="d-flex gap-2 mt-2">
                <button className="ghost-btn flex-fill" type="button" onClick={onSetMinimumBid}>
                  Min Bid
                </button>
                <button className="ghost-btn flex-fill" type="button" onClick={onSetDoubleBid}>
                  +2x Increment
                </button>
              </div>
            </section>

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
                  <strong>{gem.certificate.certificateNumber}</strong>
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default GemDetails;