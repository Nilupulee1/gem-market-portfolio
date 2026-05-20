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
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton className="modal-header-gradient">
        <Modal.Title className="fw-bold text-white">{gem.type} - Detailed Portfolio</Modal.Title>
      </Modal.Header>
      <Modal.Body className="p-4">
        <Row className="g-4">
          <Col md={6}>
            <div className="mb-3 border rounded overflow-hidden shadow-sm" style={{ border: '1px solid var(--border)', background: 'var(--page-surface)' }}>
              <img
                src={gem.images[activeImageIndex] || 'https://via.placeholder.com/400'}
                alt={gem.type}
                className="w-100"
                style={{ maxHeight: '350px', objectFit: 'cover', transition: 'all 0.3s ease' }}
              />
            </div>
            {gem.images.length > 1 && (
              <Row className="g-2">
                {gem.images.map((img, index) => (
                  <Col xs={3} key={index}>
                    <div 
                      onClick={() => setActiveImageIndex(index)}
                      className={`thumbnail-selector-container rounded overflow-hidden shadow-sm cursor-pointer ${
                        activeImageIndex === index ? 'active-thumbnail' : ''
                      }`}
                      style={{ 
                        height: '70px', 
                        border: activeImageIndex === index ? '2.5px solid var(--color-primary)' : '1px solid var(--border)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        opacity: activeImageIndex === index ? 1 : 0.7
                      }}
                    >
                      <img
                        src={img}
                        alt={`${gem.type} thumbnail ${index + 1}`}
                        className="w-100 h-100"
                        style={{ objectFit: 'cover' }}
                      />
                    </div>
                  </Col>
                ))}
              </Row>
            )}
          </Col>
          <Col md={6}>
            <div className="mb-4">
              <h5 className="fw-bold mb-3 d-flex align-items-center justify-content-between">
                <span>Gemstone Metrics</span>
                {getStatusBadge(gem.status)}
              </h5>
              <div className="p-3 rounded mb-3" style={{ background: 'var(--page-surface)', border: '1px solid var(--border)' }}>
                <Row className="g-3">
                  <Col xs={6}>
                    <div className="text-muted small fw-semibold">CARAT WEIGHT</div>
                    <div className="fw-bold text-dark">{gem.carat} ct</div>
                  </Col>
                  <Col xs={6}>
                    <div className="text-muted small fw-semibold">SHAPE & CUT</div>
                    <div className="fw-bold text-dark">{gem.cut}</div>
                  </Col>
                  <Col xs={6}>
                    <div className="text-muted small fw-semibold">CLARITY</div>
                    <div className="fw-bold text-dark">{gem.clarity || 'VVS1'}</div>
                  </Col>
                  <Col xs={6}>
                    <div className="text-muted small fw-semibold">COLOR GRADE</div>
                    <div className="fw-bold text-dark">{gem.color}</div>
                  </Col>
                  <Col xs={12}>
                    <div className="text-muted small fw-semibold">GEOGRAPHIC ORIGIN</div>
                    <div className="fw-bold text-dark">{gem.origin}</div>
                  </Col>
                </Row>
              </div>
            </div>

            <div className="mb-4">
              <h5 className="fw-bold mb-2">Heritage Story</h5>
              <p className="text-muted small" style={{ lineHeight: 1.6 }}>{gem.description || 'No descriptive backstory listed for this gemstone.'}</p>
            </div>

            <div className="mb-3">
              <h5 className="fw-bold mb-2">Authenticity & Lab Guarantee</h5>
              <div className="p-3 rounded mb-3" style={{ background: 'var(--page-surface)', border: '1px solid var(--border)', fontSize: '13px' }}>
                <div className="mb-2">
                  <strong className="text-secondary">Authority:</strong> <span className="fw-bold">{gem.certificate.authority || 'Lab Verified'}</span>
                </div>
                <div className="mb-3">
                  <strong className="text-secondary">Report Number:</strong> <span className="fw-bold">{gem.certificate.certificateNumber || 'N/A'}</span>
                </div>
                <div className="border rounded p-2 bg-light">
                  {isPdfCertificate ? (
                    <PdfViewer url={certificateAccessUrl} />
                  ) : (
                    <img
                      src={certificateAccessUrl}
                      alt="Certificate"
                      className="w-100 rounded"
                      style={{ maxHeight: '200px', objectFit: 'contain' }}
                    />
                  )}
                </div>
                <div className="mt-3">
                  <a
                    href={certificateAccessUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-outline-primary btn-sm px-3 fw-semibold"
                  >
                    Open Official Laboratory Report
                  </a>
                </div>
              </div>
            </div>

            {gem.adminFeedback && (
              <div className="alert alert-info py-2 px-3 small border-0" style={{ background: '#e0f2fe', color: '#0369a1', borderRadius: '8px' }}>
                <strong>Verification Office Feedback:</strong> {gem.adminFeedback}
              </div>
            )}
          </Col>
        </Row>
      </Modal.Body>
      <Modal.Footer style={{ borderTop: '1px solid var(--border)' }}>
        <Button className="btn-secondary px-4" onClick={onHide}>
          Close Details
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default GemDetailsModal;