import { useState, useEffect } from 'react';
import { Modal, Button, Row, Col, Badge } from 'react-bootstrap';
import type { Gem } from '../../types';
import PdfViewer from '../common/PdfViewer';

interface GemDetailsModalProps {
  show: boolean;
  onHide: () => void;
  gem: Gem | null;
}

const GemDetailsModal = ({ show, onHide, gem }: GemDetailsModalProps) => {
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Reset image index when gem changes
  useEffect(() => {
    setActiveImageIndex(0);
  }, [gem]);

  if (!gem) return null;

  const certificateUrl = gem.certificate?.url || '';
  const certificateAccessUrl = gem.certificate?.accessUrl || certificateUrl;
  const normalizedUrl = certificateUrl.toLowerCase();
  const isPdfCertificate =
    gem.certificate?.mimeType === 'application/pdf' ||
    normalizedUrl.includes('.pdf') ||
    normalizedUrl.includes('application/pdf');

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge bg="success" className="px-3 py-2 fw-semibold">Approved</Badge>;
      case 'pending':
        return <Badge bg="warning" className="px-3 py-2 fw-semibold text-dark">Pending Review</Badge>;
      case 'rejected':
        return <Badge bg="danger" className="px-3 py-2 fw-semibold">Rejected</Badge>;
      default:
        return <Badge bg="secondary" className="px-3 py-2 fw-semibold text-capitalize">{status}</Badge>;
    }
  };

  return (
    <Modal show={show} onHide={onHide} size="xl" centered contentClassName="port-gem-modal">
      <Modal.Header closeButton className="port-modal-header">
        <Modal.Title className="port-modal-title">{gem.type} - Detailed Portfolio</Modal.Title>
      </Modal.Header>
      <Modal.Body className="port-modal-body">
        <div className="port-gem-detail-layout">
          <div className="port-gem-gallery">
            <div className="port-gem-hero-frame">
              <img
                src={gem.images[activeImageIndex] || 'https://via.placeholder.com/400'}
                alt={gem.type}
                className="port-gem-hero-image"
              />
            </div>
            {gem.images.length > 1 && (
              <div className="port-gem-thumbs">
                {gem.images.map((img, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setActiveImageIndex(index)}
                    className={`port-gem-thumb ${activeImageIndex === index ? 'active' : ''}`}
                  >
                    <img src={img} alt={`${gem.type} thumbnail ${index + 1}`} />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="port-gem-sidebar">
            <div className="port-gem-panel">
              <div className="d-flex align-items-start justify-content-between gap-3 mb-3">
                <div>
                  <div className="port-panel-kicker">Gemstone Metrics</div>
                  <h5 className="port-panel-title mb-0">Overview</h5>
                </div>
                {getStatusBadge(gem.status)}
              </div>

              <div className="port-metric-grid">
                <div className="port-metric-item">
                  <span>Carat Weight</span>
                  <strong>{gem.carat} ct</strong>
                </div>
                <div className="port-metric-item">
                  <span>Shape & Cut</span>
                  <strong>{gem.cut}</strong>
                </div>
                <div className="port-metric-item">
                  <span>Clarity</span>
                  <strong>{gem.clarity || 'VVS1'}</strong>
                </div>
                <div className="port-metric-item">
                  <span>Color Grade</span>
                  <strong>{gem.color}</strong>
                </div>
                <div className="port-metric-item port-metric-wide">
                  <span>Geographic Origin</span>
                  <strong>{gem.origin}</strong>
                </div>
              </div>
            </div>

            <div className="port-gem-panel">
              <div className="port-panel-kicker">Heritage Story</div>
              <h5 className="port-panel-title mb-2">Story</h5>
              <p className="port-panel-copy">{gem.description || 'No descriptive backstory listed for this gemstone.'}</p>
            </div>

            <div className="port-gem-panel">
              <div className="port-panel-kicker">Authenticity & Lab Guarantee</div>
              <h5 className="port-panel-title mb-2">Certification</h5>
              <div className="port-cert-meta">
                <div><strong>Authority:</strong> {gem.certificate.authority || 'Lab Verified'}</div>
                <div><strong>Report Number:</strong> {gem.certificate.certificateNumber || 'N/A'}</div>
              </div>
              <div className="port-cert-preview">
                {isPdfCertificate ? (
                  <PdfViewer url={certificateAccessUrl} />
                ) : (
                  <img src={certificateAccessUrl} alt="Certificate" className="w-100" style={{ maxHeight: '230px', objectFit: 'contain' }} />
                )}
              </div>
              <a
                href={certificateAccessUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bdr-btn-primary mt-3 d-inline-flex align-items-center justify-content-center"
                style={{ textDecoration: 'none', width: 'fit-content' }}
              >
                Open Official Laboratory Report
              </a>
            </div>

            {gem.adminFeedback && (
              <div className="port-feedback-banner">
                <strong>Verification Office Feedback:</strong> {gem.adminFeedback}
              </div>
            )}
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer className="port-modal-footer">
        <Button className="port-modal-cancel" onClick={onHide}>
          Close Details
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default GemDetailsModal;