import { Modal, Button, Row, Col, Badge } from 'react-bootstrap';
import type { Gem } from '../../types';
import PdfViewer from '../common/PdfViewer';

interface GemDetailsModalProps {
  show: boolean;
  onHide: () => void;
  gem: Gem | null;
}

const GemDetailsModal = ({ show, onHide, gem }: GemDetailsModalProps) => {
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
        return <Badge bg="success">Approved</Badge>;
      case 'pending':
        return <Badge bg="warning">Pending</Badge>;
      case 'rejected':
        return <Badge bg="danger">Rejected</Badge>;
      default:
        return <Badge bg="secondary">{status}</Badge>;
    }
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title className="fw-bold">{gem.type}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Row>
          <Col md={6}>
            <div className="mb-3">
              <img
                src={gem.images[0] || 'https://via.placeholder.com/400'}
                alt={gem.type}
                className="w-100 rounded"
                style={{ maxHeight: '400px', objectFit: 'cover' }}
              />
            </div>
            {gem.images.length > 1 && (
              <Row className="g-2">
                {gem.images.slice(1).map((img, index) => (
                  <Col xs={3} key={index}>
                    <img
                      src={img}
                      alt={`${gem.type} ${index + 2}`}
                      className="w-100 rounded"
                      style={{ height: '80px', objectFit: 'cover' }}
                    />
                  </Col>
                ))}
              </Row>
            )}
          </Col>
          <Col md={6}>
            <div className="mb-3">
              <h5 className="mb-3">Gem Details</h5>
              <div className="mb-2">
                <strong>Status:</strong> {getStatusBadge(gem.status)}
              </div>
              <div className="mb-2">
                <strong>Carat:</strong> {gem.carat}
              </div>
              <div className="mb-2">
                <strong>Cut:</strong> {gem.cut}
              </div>
              <div className="mb-2">
                <strong>Clarity:</strong> {gem.clarity}
              </div>
              <div className="mb-2">
                <strong>Color:</strong> {gem.color}
              </div>
              <div className="mb-2">
                <strong>Origin:</strong> {gem.origin}
              </div>
            </div>

            <div className="mb-3">
              <h5 className="mb-2">Description</h5>
              <p className="text-muted">{gem.description}</p>
            </div>

            <div className="mb-3">
              <h5 className="mb-2">Certificate Information</h5>
              <div className="mb-2">
                <strong>Authority:</strong> {gem.certificate.authority}
              </div>
              <div className="mb-2">
                <strong>Certificate Number:</strong> {gem.certificate.certificateNumber}
              </div>
              <div className="border rounded p-2 bg-light mt-3">
                {isPdfCertificate ? (
                  <PdfViewer url={certificateAccessUrl} />
                ) : (
                  <img
                    src={certificateAccessUrl}
                    alt="Certificate"
                    className="w-100 rounded"
                    style={{ maxHeight: '240px', objectFit: 'contain' }}
                  />
                )}
              </div>
              <div className="mt-2">
                <a
                  href={certificateAccessUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline-primary btn-sm"
                >
                  Open Certificate
                </a>
              </div>
            </div>

            {gem.adminFeedback && (
              <div className="alert alert-info">
                <strong>Admin Feedback:</strong> {gem.adminFeedback}
              </div>
            )}
          </Col>
        </Row>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default GemDetailsModal;