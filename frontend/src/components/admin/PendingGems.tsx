import { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, Row, Col, Alert } from 'react-bootstrap';
import { Check, X, Eye } from 'lucide-react';
import { adminAPI } from '../../api/axios';
import type { Gem } from '../../types';
import { AxiosError } from 'axios';
import PdfViewer from '../common/PdfViewer';

interface PendingGemsProps {
  onApprove: () => void;
}

const PendingGems = ({ onApprove }: PendingGemsProps) => {
  const [gems, setGems] = useState<Gem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGem, setSelectedGem] = useState<Gem | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewStatus, setReviewStatus] = useState<'approved' | 'rejected'>('approved');
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchPendingGems();
  }, []);

  const fetchPendingGems = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getPendingGems();
      setGems(response.data.gems);
    } catch (error) {
      console.error('Error fetching pending gems:', error);
      setError('Failed to fetch pending gems');
    } finally {
      setLoading(false);
    }
  };

  const handleReview = (gem: Gem) => {
    setSelectedGem(gem);
    setShowReviewModal(true);
    setReviewStatus('approved');
    setFeedback('');
    setError('');
    setSuccess('');
  };

  const handleSubmitReview = async () => {
    if (!selectedGem) return;

    if (reviewStatus === 'rejected' && !feedback.trim()) {
      setError('Please provide feedback for rejection');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await adminAPI.reviewGem({
        gemId: selectedGem._id,
        status: reviewStatus,
        feedback: feedback.trim() || undefined
      });

      setSuccess(`Gem ${reviewStatus} successfully!`);
      setTimeout(() => {
        setShowReviewModal(false);
        setSelectedGem(null);
        setSuccess('');
        fetchPendingGems();
        onApprove();
      }, 1500);
    } catch (err) {
      const error = err as AxiosError<{ message: string }>;
      setError(error.response?.data?.message || 'Failed to review gem');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const getCertificateAccessUrl = (gem: Gem) => {
    return gem.certificate?.accessUrl || gem.certificate?.url || '';
  };

  const isPdfCertificate = (gem: Gem) => {
    const normalizedUrl = (gem.certificate?.url || '').toLowerCase();
    return (
      gem.certificate?.mimeType === 'application/pdf' ||
      normalizedUrl.includes('.pdf') ||
      normalizedUrl.includes('application/pdf')
    );
  };

  return (
    <div>
      <div className="dashboard-title animate-fade-up">
        <h4 className="fw-bold">Pending Gem Verifications</h4>
        <p>Review and approve gem listings before they go live</p>
      </div>

      {error && !showReviewModal && (
        <Alert variant="danger" dismissible onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Card className="content-card animate-fade-up delay-1">
        <Card.Body className="p-4">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : gems.length === 0 ? (
            <div className="text-center py-5">
              <Check size={48} className="text-success mb-3" />
              <h5>All Clear!</h5>
              <p className="text-muted">No pending gems to review</p>
            </div>
          ) : (
            <div className="table-responsive">
              <Table hover className="align-middle surface-table">
                <thead>
                  <tr>
                    <th className="border-0 py-3">Gem Details</th>
                    <th className="border-0 py-3">Seller</th>
                    <th className="border-0 py-3">Specifications</th>
                    <th className="border-0 py-3">Certificate</th>
                    <th className="border-0 py-3">Submitted</th>
                    <th className="border-0 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {gems.map((gem) => (
                    <tr key={gem._id}>
                      <td>
                        <div className="d-flex align-items-center">
                          <div 
                            className="rounded me-3 surface-muted"
                            style={{ 
                              width: '60px', 
                              height: '60px',
                              overflow: 'hidden'
                            }}
                          >
                            <img 
                              src={gem.images[0] || 'https://via.placeholder.com/60'}
                              alt={gem.type}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = 'https://via.placeholder.com/60';
                              }}
                            />
                          </div>
                          <div>
                            <div className="fw-semibold">{gem.type}</div>
                            <small className="text-muted">
                              {gem.description?.substring(0, 40)}
                              {gem.description && gem.description.length > 40 ? '...' : ''}
                            </small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="fw-semibold">{gem.seller.name}</div>
                        <small className="text-muted">{gem.seller.email}</small>
                      </td>
                      <td>
                        <small className="d-block"><strong>Carat:</strong> {gem.carat}</small>
                        <small className="d-block"><strong>Cut:</strong> {gem.cut}</small>
                        <small className="d-block"><strong>Origin:</strong> {gem.origin}</small>
                      </td>
                      <td>
                        <div className="fw-semibold text-primary">{gem.certificate.authority}</div>
                        <small className="text-muted d-block">{gem.certificate.certificateNumber}</small>
                        <a 
                          href={getCertificateAccessUrl(gem)} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary small"
                          onClick={(e) => e.stopPropagation()}
                        >
                          View Document
                        </a>
                      </td>
                      <td>
                        <small>{formatDate(gem.createdAt)}</small>
                      </td>
                      <td className="text-center">
                        <Button 
                          variant="primary" 
                          size="sm"
                          onClick={() => handleReview(gem)}
                        >
                          <Eye size={14} className="me-1" />
                          Review
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Review Modal */}
      <Modal 
        show={showReviewModal} 
        onHide={() => {
          setShowReviewModal(false);
          setSelectedGem(null);
          setError('');
          setSuccess('');
        }} 
        size="lg"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Review Gem - {selectedGem?.type}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
          {success && <Alert variant="success">{success}</Alert>}

          {selectedGem && (
            <Row>
              <Col md={6}>
                <h6 className="fw-bold mb-3">Gem Images</h6>
                <div className="mb-3">
                  <img 
                    src={selectedGem.images[0]}
                    alt={selectedGem.type}
                    className="w-100 rounded"
                    style={{ maxHeight: '300px', objectFit: 'cover' }}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = 'https://via.placeholder.com/400';
                    }}
                  />
                </div>
                {selectedGem.images.length > 1 && (
                  <Row className="g-2">
                    {selectedGem.images.slice(1).map((img, index) => (
                      <Col xs={4} key={index}>
                        <img 
                          src={img}
                          alt={`${selectedGem.type} ${index + 2}`}
                          className="w-100 rounded"
                          style={{ height: '80px', objectFit: 'cover' }}
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = 'https://via.placeholder.com/100';
                          }}
                        />
                      </Col>
                    ))}
                  </Row>
                )}

                <div className="mt-3">
                  <h6 className="fw-bold mb-2">Seller Information</h6>
                  <p className="mb-1">
                    <strong>Name:</strong> {selectedGem.seller.name}
                  </p>
                  <p className="mb-1">
                    <strong>Email:</strong> {selectedGem.seller.email}
                  </p>
                </div>
              </Col>

              <Col md={6}>
                <h6 className="fw-bold mb-3">Gem Specifications</h6>
                <div className="mb-3">
                  <Row>
                    <Col xs={6}>
                      <p className="mb-2">
                        <strong>Type:</strong><br />
                        <span className="text-muted">{selectedGem.type}</span>
                      </p>
                    </Col>
                    <Col xs={6}>
                      <p className="mb-2">
                        <strong>Carat:</strong><br />
                        <span className="text-muted">{selectedGem.carat}</span>
                      </p>
                    </Col>
                    <Col xs={6}>
                      <p className="mb-2">
                        <strong>Cut:</strong><br />
                        <span className="text-muted">{selectedGem.cut}</span>
                      </p>
                    </Col>
                    <Col xs={6}>
                      <p className="mb-2">
                        <strong>Clarity:</strong><br />
                        <span className="text-muted">{selectedGem.clarity}</span>
                      </p>
                    </Col>
                    <Col xs={6}>
                      <p className="mb-2">
                        <strong>Color:</strong><br />
                        <span className="text-muted">{selectedGem.color}</span>
                      </p>
                    </Col>
                    <Col xs={6}>
                      <p className="mb-2">
                        <strong>Origin:</strong><br />
                        <span className="text-muted">{selectedGem.origin}</span>
                      </p>
                    </Col>
                  </Row>
                </div>

                <h6 className="fw-bold mb-2">Description</h6>
                <p className="text-muted small mb-3">{selectedGem.description}</p>

                <h6 className="fw-bold mb-2">Certificate Information</h6>
                <div className="mb-3">
                  <p className="mb-2">
                    <strong>Authority:</strong> {selectedGem.certificate.authority}
                  </p>
                  <p className="mb-2">
                    <strong>Certificate Number:</strong> {selectedGem.certificate.certificateNumber}
                  </p>
                  <a 
                    href={getCertificateAccessUrl(selectedGem)} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="btn btn-outline-primary btn-sm"
                  >
                    Open Certificate
                  </a>
                </div>

                <div className="border rounded p-2 bg-light mb-3">
                  {isPdfCertificate(selectedGem) ? (
                    <PdfViewer url={getCertificateAccessUrl(selectedGem)} />
                  ) : (
                    <img
                      src={selectedGem.certificate.url}
                      alt="Certificate"
                      className="w-100 rounded"
                      style={{ maxHeight: '240px', objectFit: 'contain' }}
                    />
                  )}
                </div>

                <hr className="my-3" />

                <h6 className="fw-bold mb-3">Review Decision</h6>
                <div className="d-flex gap-3 mb-3">
                  <Button
                    variant={reviewStatus === 'approved' ? 'success' : 'outline-success'}
                    onClick={() => setReviewStatus('approved')}
                    style={{ flexGrow: 1 }}
                  >
                    <Check size={16} className="me-1" />
                    Approve
                  </Button>
                  <Button
                    variant={reviewStatus === 'rejected' ? 'danger' : 'outline-danger'}
                    onClick={() => setReviewStatus('rejected')}
                    style={{ flexGrow: 1 }}
                  >
                    <X size={16} className="me-1" />
                    Reject
                  </Button>
                </div>

                {reviewStatus === 'rejected' && (
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-semibold">
                      Rejection Reason <span className="text-danger">*</span>
                    </Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={3}
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      placeholder="Provide detailed feedback for the seller about why this gem was rejected..."
                      required
                    />
                    <Form.Text className="text-muted">
                      This feedback will be sent to the seller.
                    </Form.Text>
                  </Form.Group>
                )}

                {reviewStatus === 'approved' && (
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-semibold">Optional Feedback</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={2}
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      placeholder="Add any additional comments or notes for the seller..."
                    />
                  </Form.Group>
                )}
              </Col>
            </Row>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button 
            variant="secondary" 
            onClick={() => {
              setShowReviewModal(false);
              setSelectedGem(null);
              setError('');
              setSuccess('');
            }}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button 
            variant={reviewStatus === 'approved' ? 'success' : 'danger'}
            onClick={handleSubmitReview}
            disabled={submitting}
          >
            {submitting ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Processing...
              </>
            ) : (
              <>
                {reviewStatus === 'approved' ? <Check size={16} className="me-1" /> : <X size={16} className="me-1" />}
                Confirm {reviewStatus === 'approved' ? 'Approval' : 'Rejection'}
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default PendingGems;