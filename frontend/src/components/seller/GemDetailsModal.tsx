import { useState, useEffect } from 'react';
import { Modal } from 'react-bootstrap';
import { ArrowLeft, Download, FileDown, ScanSearch } from 'lucide-react';
import type { Gem } from '../../types';
import '../../styles/gemdetails.css';

interface GemDetailsModalProps {
  show: boolean;
  onHide: () => void;
  gem: Gem | null;
}

const GemDetailsModal = ({ show, onHide, gem }: GemDetailsModalProps) => {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (show) setActiveImageIndex(0);
  }, [show, gem?._id]);

  if (!gem) return null;

  const images = Array.isArray(gem.images) ? gem.images.filter(Boolean) : [];
  const certificateUrl = gem.certificate?.accessUrl || gem.certificate?.url || '';
  const mainImage = images[activeImageIndex] || images[0] || 'https://via.placeholder.com/900x700';
  const hasMultipleImages = images.length > 1;
  const hasFixedPrice = typeof gem.fixedPrice === 'number' && gem.fixedPrice > 0;
  const fixedPriceEndsAt = gem.fixedPriceEndsAt ? new Date(gem.fixedPriceEndsAt) : null;
  const isFixedPriceActive = hasFixedPrice && (!fixedPriceEndsAt || fixedPriceEndsAt.getTime() > Date.now());

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

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'approved': return 'gd-status-approved';
      case 'pending':  return 'gd-status-pending';
      case 'rejected': return 'gd-status-rejected';
      case 'sold':     return 'gd-status-approved';
      case 'removed':  return 'gd-status-rejected';
      default:         return 'gd-status-pending';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'approved': return 'Approved';
      case 'pending':  return 'Pending Review';
      case 'rejected': return 'Rejected';
      case 'sold':     return 'Sold';
      case 'removed':  return 'Removed';
      default:         return status;
    }
  };

  return (
    <Modal
      show={show}
      onHide={onHide}
      size="xl"
      centered
      dialogClassName="gd-modal-dialog"
      contentClassName="gd-modal-content"
      backdrop="static"
    >
      <Modal.Header closeButton className="gd-modal-header gd-modal-header--compact">
        <button type="button" className="gd-back-link" onClick={onHide}>
          <ArrowLeft size={16} />
          Back to Portfolio
        </button>
      </Modal.Header>

      <Modal.Body className="gd-modal-body">
        <div className="gd-layout">
          {/* ─── Left — Media ─── */}
          <section className="gd-media-panel">
            <div className="gd-hero">
              <span className="gd-hero-chip">Portfolio View</span>
              <img
                src={mainImage}
                alt={gem.type}
                className="gd-hero-image"
                onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/900x700'; }}
              />
            </div>

            {hasMultipleImages && (
              <div className="gd-thumb-row">
                {images.map((img, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`gd-thumb ${activeImageIndex === i ? 'active' : ''}`}
                    onClick={() => setActiveImageIndex(i)}
                    aria-label={`View image ${i + 1} of ${images.length}`}
                  >
                    <img src={img} alt={`${gem.type} ${i + 1}`} />
                  </button>
                ))}
              </div>
            )}

            {hasMultipleImages && (
              <div className="gd-thumb-count" aria-hidden="true">
                {activeImageIndex + 1} / {images.length}
              </div>
            )}

            <div className="gd-story-card">
              <div className="gd-section-heading">
                <div>
                  <p>Heritage Story</p>
                  <h3>About this gemstone</h3>
                </div>
                <span className="gd-story-badge">
                  <ScanSearch size={14} />
                  Portfolio
                </span>
              </div>
              <p className="gd-story-copy">
                {gem.description || 'No descriptive backstory listed for this gemstone.'}
              </p>
              <div className="gd-story-meta">
                <div><span>Origin</span><strong>{gem.origin}</strong></div>
                <div><span>Color</span><strong>{gem.color}</strong></div>
                <div><span>Status</span><strong style={{ textTransform: 'capitalize' }}>{gem.status}</strong></div>
              </div>
            </div>
          </section>

          {/* ─── Right — Panel ─── */}
          <aside className="gd-panel">
            {/* Header card */}
            <div className="gd-surface-card gd-panel-header-card">
              <div className="gd-panel-kicker-row">
                <span className="gd-panel-kicker">Gemstone Details</span>
                <span className={getStatusClass(gem.status)}>{getStatusLabel(gem.status)}</span>
              </div>
              <h2 className="gd-panel-title">{gem.type}</h2>
              <p className="gd-panel-subtitle">
                Detailed specifications and certification for your portfolio listing.
              </p>
            </div>

            {/* Metrics card */}
            <div className="gd-surface-card">
              <div className="gd-metrics-list">
                <div className="gd-metric-item">
                  <span className="gd-metric-label">Carat Weight</span>
                  <strong className="gd-metric-value">{gem.carat} ct</strong>
                </div>
                <div className="gd-metric-item">
                  <span className="gd-metric-label">Shape &amp; Cut</span>
                  <strong className="gd-metric-value">{gem.cut}</strong>
                </div>
                <div className="gd-metric-item">
                  <span className="gd-metric-label">Clarity</span>
                  <strong className="gd-metric-value">{gem.clarity || 'VVS1'}</strong>
                </div>
                <div className="gd-metric-item">
                  <span className="gd-metric-label">Color Grade</span>
                  <strong className="gd-metric-value">{gem.color}</strong>
                </div>
              </div>
            </div>

            {hasFixedPrice && (
              <div className="gd-surface-card">
                <div className="gd-section-heading">
                  <div>
                    <p>Listing</p>
                    <h3>Fixed Price</h3>
                  </div>
                </div>
                <div className="gd-metrics-list">
                  <div className="gd-metric-item">
                    <span className="gd-metric-label">Price</span>
                    <strong className="gd-metric-value">Rs. {gem.fixedPrice?.toLocaleString()}</strong>
                  </div>
                  <div className="gd-metric-item">
                    <span className="gd-metric-label">Status</span>
                    <strong className="gd-metric-value">{isFixedPriceActive ? 'Active' : 'Expired'}</strong>
                  </div>
                  {fixedPriceEndsAt && (
                    <div className="gd-metric-item">
                      <span className="gd-metric-label">Ends</span>
                      <strong className="gd-metric-value">{fixedPriceEndsAt.toLocaleString()}</strong>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Certificate card — with download button (same as admin) */}
            <div className="gd-surface-card">
              <div className="gd-cert-tile">
                <div className="gd-cert-icon">
                  <FileDown size={18} />
                </div>
                <div className="gd-cert-copy">
                  <span>{gem.certificate?.authority || 'Certificate'}</span>
                  <strong>Verified Digital Copy</strong>
                </div>
                {certificateUrl && (
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
                )}
              </div>

              <div className="gd-cert-meta">
                <div><span>Authority</span><strong>{gem.certificate?.authority || 'Unknown'}</strong></div>
                <div><span>Certificate No.</span><strong>{gem.certificate?.certificateNumber || 'N/A'}</strong></div>
              </div>
            </div>

            {/* Admin feedback */}
            {gem.adminFeedback && (
              <div className="gd-feedback-banner">
                <strong>Verification Office Feedback:</strong>
                {gem.adminFeedback}
              </div>
            )}
          </aside>
        </div>
      </Modal.Body>
    </Modal>
  );
};

export default GemDetailsModal;