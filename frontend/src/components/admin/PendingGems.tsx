import { useState, useEffect, useMemo } from 'react';
import { Card, Table, Button, Modal, Form, Alert } from 'react-bootstrap';
import { Check, CheckCircle, Ban, ScanSearch, ArrowLeft, Download, FileDown } from 'lucide-react';
import { adminAPI } from '../../api/axios';
import { sendMessage } from '../../api/socket';
import type { Gem } from '../../types';
import { UserRole } from '../../types';
import { AxiosError } from 'axios';
import { useAuthStore } from '../../store/authStore';
import '../../styles/gemdetails.css';

interface PendingGemsProps {
  onApprove: () => void;
}

const PendingGems = ({ onApprove }: PendingGemsProps) => {
  const { user } = useAuthStore();
  const [gems, setGems] = useState<Gem[]>([]);
  const [filterType, setFilterType] = useState('All');
  const [filterCarat, setFilterCarat] = useState('All');
  const [sortOrder, setSortOrder] = useState('oldest');
  const [loading, setLoading] = useState(true);
  const [selectedGem, setSelectedGem] = useState<Gem | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewStatus, setReviewStatus] = useState<'approved' | 'rejected'>('approved');
  const [feedback, setFeedback] = useState('');
  const [reviewChecklistState, setReviewChecklistState] = useState([false, false, false]);
  const [submitting, setSubmitting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionModal, setActionModal] = useState({
    show: false,
    title: '',
    message: '',
    variant: 'success' as 'success' | 'danger',
  });
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
    setRejectionReason('');
    setReviewChecklistState([false, false, false]);
    setError('');
    setSuccess('');
  };

  const buildSellerMessage = () => {
    const trimmedFeedback = feedback.trim();
    if (reviewStatus !== 'rejected') {
      return trimmedFeedback;
    }

    const reasonText = rejectionReason ? `Rejection reason: ${rejectionReason}.` : '';
    if (reasonText && trimmedFeedback) {
      return `${reasonText} ${trimmedFeedback}`;
    }
    return reasonText || trimmedFeedback;
  };

  const handleSubmitReview = async () => {
    if (!selectedGem) return;

    if (reviewStatus === 'rejected' && !feedback.trim() && !rejectionReason) {
      setError('Please provide a rejection reason or message for the seller');
      return;
    }

    if (user?.role === UserRole.OPERATIONAL_MANAGER && reviewStatus === 'approved' && reviewChecklistState.some((isChecked) => !isChecked)) {
      setError('Please confirm all checklist items before approving this gem');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const sellerMessage = buildSellerMessage();

      await adminAPI.reviewGem({
        gemId: selectedGem._id,
        status: reviewStatus,
        feedback: sellerMessage || undefined
      });

      if (reviewStatus === 'rejected' && sellerMessage) {
        sendMessage(undefined, selectedGem.seller._id, sellerMessage, selectedGem._id);
        window.dispatchEvent(new Event('chat:refresh-conversations'));
      }

      const nextTitle = reviewStatus === 'approved' ? 'Approved' : 'Rejected';
      const nextMessage = reviewStatus === 'approved'
        ? 'Gem approved successfully.'
        : 'Gem rejected successfully.';

      setActionModal({
        show: true,
        title: nextTitle,
        message: nextMessage,
        variant: reviewStatus === 'approved' ? 'success' : 'danger',
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


  const uniqueTypes = useMemo(() => Array.from(new Set(gems.map(g => g.type))).sort(), [gems]);

  const orderedGems = useMemo(() => {
    let filtered = [...gems];
    
    if (filterType !== 'All') {
      filtered = filtered.filter(g => g.type === filterType);
    }
    
    if (filterCarat !== 'All') {
      filtered = filtered.filter(g => {
        if (filterCarat === '<1ct') return g.carat < 1;
        if (filterCarat === '1-3ct') return g.carat >= 1 && g.carat <= 3;
        if (filterCarat === '>3ct') return g.carat > 3;
        return true;
      });
    }

    return filtered.sort((left, right) => {
      const diff = new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
      return sortOrder === 'oldest' ? diff : -diff;
    });
  }, [gems, filterType, filterCarat, sortOrder]);

  const selectedGemImages = selectedGem?.images?.filter(Boolean) ?? [];
  const mainGemImage = selectedGemImages[0] || 'https://via.placeholder.com/900x700';
  const certificateUrl = selectedGem?.certificate?.accessUrl || selectedGem?.certificate?.url || '';
  const [downloading, setDownloading] = useState(false);

  const handleDownloadCertificate = async () => {
    if (!certificateUrl || !selectedGem) return;
    setDownloading(true);
    try {
      const response = await fetch(certificateUrl);
      if (!response.ok) throw new Error(`Failed to fetch certificate: ${response.status}`);
      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = `${selectedGem.type.replace(/\s+/g, '_').toLowerCase()}-certificate.pdf`;
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

  const gemStory = selectedGem
    ? `This ${selectedGem.type.toLowerCase()} arrived from ${selectedGem.origin} as part of a carefully documented submission from ${selectedGem.seller.name}. The stone weighs ${selectedGem.carat} ct and presents with ${selectedGem.clarity} clarity, ${selectedGem.cut} cut, and ${selectedGem.color} color. The seller describes it as ${selectedGem.description}`
    : '';

  const reviewChecklist = [
    { title: 'Authenticity Confirmed', description: 'Visual markers align with the submitted certificate and photos.' },
    { title: 'Quality Grade Matches', description: 'Cut, clarity, and color are consistent with the listing details.' },
    { title: 'Document Match', description: 'Certificate number and issuer match the listing metadata.' },
  ];

  const canApprove = user?.role === UserRole.OPERATIONAL_MANAGER ? reviewChecklistState.every(Boolean) : true;

  return (
    <div>
      <section className="dashboard-hero hero-premium-mesh admin-dashboard-hero section-card--long animate-fade-up">
        <div>
          <p className="dashboard-eyebrow">Verifications</p>
          <h4>Pending Gem Verifications</h4>
          <p>Review and approve gem listings before they go live</p>
        </div>
        <div className="dashboard-chip-stack">
          <span className="dashboard-chip dashboard-chip-soft">{gems.length} pending</span>
          <span className="dashboard-chip">{gems.length} total listings</span>
        </div>
      </section>

      <div className="pending-gems-toolbar animate-fade-up delay-1">
        <div className="pending-gems-filters d-flex gap-2">
          <select 
            className="pending-gems-filter custom-select-arrow" 
            value={filterType} 
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="All">All Types</option>
            {uniqueTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>

          <select 
            className="pending-gems-filter custom-select-arrow" 
            value={filterCarat} 
            onChange={(e) => setFilterCarat(e.target.value)}
          >
            <option value="All">All Weights</option>
            <option value="<1ct">Under 1 ct</option>
            <option value="1-3ct">1 - 3 ct</option>
            <option value=">3ct">Over 3 ct</option>
          </select>

          <select 
            className="pending-gems-filter custom-select-arrow" 
            value={sortOrder} 
            onChange={(e) => setSortOrder(e.target.value)}
          >
            <option value="oldest">Sort By: Oldest</option>
            <option value="newest">Sort By: Newest</option>
          </select>
        </div>

        <div className="pending-gems-summary">
          {orderedGems.length} gem{orderedGems.length === 1 ? '' : 's'} waiting for review
        </div>
      </div>

      {error && !showReviewModal && (
        <Alert variant="danger" dismissible onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Card className="content-card animate-fade-up delay-2">
        <Card.Body className="p-4">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : gems.length === 0 ? (
            <div className="pending-gems-empty-state" role="status" aria-live="polite">
              <div className="pending-gems-empty-icon" aria-hidden="true">
                <Check size={24} />
              </div>
              <h5 className="pending-gems-empty-title">All clear</h5>
              <p className="pending-gems-empty-subtitle">No pending gems to review right now.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <Table hover className="align-middle surface-table pending-gems-table">
                <thead>
                  <tr>
                    <th className="border-0 py-3">Gem Name / ID</th>
                    <th className="border-0 py-3">Seller</th>
                    <th className="border-0 py-3">Submitted</th>
                    <th className="border-0 py-3">Status</th>
                    <th className="border-0 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orderedGems.map((gem) => (
                    <tr key={gem._id}>
                      <td>
                        <div className="pending-gems-gem-cell">
                          <div className="pending-gems-gem-thumb">
                            <img
                              src={gem.images[0] || 'https://via.placeholder.com/60'}
                              alt={gem.type}
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = 'https://via.placeholder.com/60';
                              }}
                            />
                          </div>
                          <div className="pending-gems-gem-copy">
                            <div className="fw-semibold">{gem.type}</div>
                            <small className="text-muted d-block">#{gem._id.slice(-6).toUpperCase()}</small>
                            <small className="text-muted d-block">
                              Certificate #{gem.certificate.certificateNumber}
                            </small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="fw-semibold">{gem.seller.name}</div>
                        <small className="text-muted">{gem.seller.email}</small>
                      </td>
                      <td>
                        <small className="d-block text-muted">{formatDate(gem.createdAt)}</small>
                        <small className="d-block">{gem.certificate.authority}</small>
                      </td>
                      <td>
                        <span className="pending-gems-status-pill pending-gems-status-pill--warning">
                          Pending Review
                        </span>
                      </td>
                      <td className="text-center pending-gems-action-cell">
                        <Button
                          className="pending-gems-action-button"
                          size="sm"
                          onClick={() => handleReview(gem)}
                        >
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
        size="xl"
        centered
        dialogClassName="admin-review-modal-dialog"
        contentClassName="admin-review-modal-content"
      >
        <Modal.Header closeButton className="admin-review-modal-header admin-review-modal-header--compact">
          <button type="button" className="admin-review-back-link" onClick={() => setShowReviewModal(false)}>
            <ArrowLeft size={16} />
            Back to Verification Queue
          </button>
        </Modal.Header>
        <Modal.Body className="admin-review-modal-body">
          {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
          {success && <Alert variant="success">{success}</Alert>}

          {selectedGem && (
            <div className="admin-review-layout">
              {/* Left Panel (Media + Story) - unchanged */}
              <section className="admin-review-media-panel">
                <div className="admin-review-hero">
                  <span className="admin-review-hero-chip">Primary View</span>
                  <img
                    src={mainGemImage}
                    alt={selectedGem.type}
                    className="admin-review-hero-image"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = 'https://via.placeholder.com/900x700';
                    }}
                  />
                </div>

                <div className="admin-review-story-card">
                  <div className="admin-review-section-heading">
                    <div>
                      <p>Gem Story</p>
                      <h3>How this stone reached the queue</h3>
                    </div>
                    <span className="admin-review-story-badge">
                      <ScanSearch size={14} />
                      Listing Narrative
                    </span>
                  </div>
                  <p className="admin-review-story-copy">{gemStory}</p>

                  <div className="admin-review-story-meta">
                    <div>
                      <span>Submitted</span>
                      <strong>{formatDate(selectedGem.createdAt)}</strong>
                    </div>
                  </div>
                </div>
              </section>

              <aside className="admin-review-panel">
                <div className="gd-surface-card mb-4">
                  <div className="gd-cert-tile">
                    <div className="gd-cert-icon">
                      <FileDown size={18} />
                    </div>
                    <div className="gd-cert-copy">
                      <span>{selectedGem.certificate?.authority || 'Certificate'}</span>
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
                    <div><span>Authority</span><strong>{selectedGem.certificate?.authority || 'Unknown'}</strong></div>
                    <div><span>Certificate No.</span><strong>{selectedGem.certificate?.certificateNumber || 'N/A'}</strong></div>
                  </div>
                </div>

                {user?.role === UserRole.OPERATIONAL_MANAGER && (
                  <div className="admin-review-surface-card admin-review-checklist-card" style={{ marginBottom: '16px', padding: '16px' }}>
                    <div className="admin-review-section-heading" style={{ marginBottom: '12px' }}>
                      <div>
                        <p style={{ margin: 0, fontSize: '11px' }}>Checklist</p>
                        <h3 style={{ margin: 0, fontSize: '15px' }}>Verification Criteria</h3>
                      </div>
                    </div>

                    <div className="admin-review-checklist">
                      {reviewChecklist.map((item, index) => (
                        <Form.Check 
                          key={item.title} 
                          className="admin-review-checklist-item-form"
                          style={{ 
                            padding: '8px 12px', 
                            margin: '0 0 8px 0', 
                            border: '1px solid var(--border, #e2e8f0)', 
                            borderRadius: '8px', 
                            background: 'var(--page-bg-alt, #f8fafc)',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '8px'
                          }}
                        >
                          <Form.Check.Input
                            type="checkbox"
                            id={`check-${index}`}
                            checked={reviewChecklistState[index]}
                            onChange={() => setReviewChecklistState((current) => 
                              current.map((c, i) => (i === index ? !c : c))
                            )}
                            style={{ marginTop: '4px' }}
                          />
                          <Form.Check.Label htmlFor={`check-${index}`} className="admin-review-checklist-item-label" style={{ margin: 0 }}>
                            <strong style={{ fontSize: '13px', display: 'block', color: 'var(--text-primary)' }}>{item.title}</strong>
                            <div className="admin-review-checklist-item-desc" style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px', lineHeight: '1.4' }}>{item.description}</div>
                          </Form.Check.Label>
                        </Form.Check>
                      ))}
                    </div>
                  </div>
                )}

               {/* Decision Card - Smaller & Cleaner Buttons */}
               {user?.role !== UserRole.ADMIN && (
                <div className="admin-review-surface-card admin-review-decision-card">
                  <div className="admin-review-section-heading">
                    <div>
                      <p>Decision</p>
                      <h3>Approve or Reject Listing</h3>
                    </div>
                  </div>

                  <div className="admin-review-decision-actions d-flex flex-column gap-2">
                    
                    {/* Approve Button - Green */}
                    <Button
                      variant="success"
                      className="admin-approve-btn d-flex align-items-center justify-content-center gap-2 py-2 fw-semibold"
                      onClick={handleSubmitReview}
                      disabled={!canApprove || submitting || reviewStatus === 'rejected'}
                    >
                      <CheckCircle size={18} />
                      APPROVE GEM
                    </Button>

                    {/* Initial Reject Button - Red */}
                    {reviewStatus === 'approved' && (
                      <Button
                        variant="danger"
                        className="admin-reject-btn d-flex align-items-center justify-content-center gap-2 py-2 fw-semibold"
                        onClick={() => {
                          setReviewStatus('rejected');
                          setFeedback('');
                          setRejectionReason('');
                        }}
                        disabled={submitting}
                      >
                        <Ban size={18} />
                        REJECT LISTING
                      </Button>
                    )}

                    
                  </div>

                  {!canApprove && reviewStatus === 'approved' && user?.role === UserRole.OPERATIONAL_MANAGER && (
                    <p className="admin-review-gate-note text-center mt-2 mb-0 small" style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      Approve is enabled after all checklist items are confirmed.
                    </p>
                  )}

                  {/* Rejection Reason */}
                  {reviewStatus === 'rejected' && (
                    <Form.Group className="mb-3 mt-3">
                      <Form.Label className="fw-semibold">
                        Rejection Reason <span className="text-danger">*</span>
                      </Form.Label>
                      <Form.Select
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                      >
                        <option value="">Select a reason...</option>
                        <option value="Certificate details need clarification">Certificate details need clarification</option>
                        <option value="Listing photos are insufficient">Listing photos are insufficient</option>
                        <option value="Gem attributes mismatch">Gem attributes mismatch</option>
                        <option value="Missing supporting documents">Missing supporting documents</option>
                      </Form.Select>
                    </Form.Group>
                  )}

                  <Form.Group className="mt-3">
                    <Form.Label className="fw-semibold">Message to Seller (Optional)</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={2}
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      placeholder="Add any additional explanation or instructions..."
                    />
                    <Form.Text className="text-muted">
                      This message will be sent to the seller via chat.
                    </Form.Text>
                  </Form.Group>
                  {/* Confirm Reject Button - Red */}
                    {reviewStatus === 'rejected' && (
                      <Button
                        variant="danger"
                        className="admin-reject-btn d-flex align-items-center justify-content-center gap-2 py-2 fw-semibold"
                        onClick={handleSubmitReview}
                        disabled={submitting || (!rejectionReason && !feedback.trim())}
                      >
                        <Ban size={18} />
                        CONFIRM REJECT
                      </Button>
                    )}
                </div>
               )}
              </aside>
            </div>
          )}
        </Modal.Body>
      </Modal>

      {/* Action Result Modal */}
      <Modal
        show={actionModal.show}
        onHide={() => setActionModal((current) => ({ ...current, show: false }))}
        centered
        size="sm"
      >
        <Modal.Body>
          <Alert
            variant={actionModal.variant}
            className="mb-0"
            onClose={() => setActionModal((current) => ({ ...current, show: false }))}
            dismissible
          >
            <strong>{actionModal.title}</strong>
            <div>{actionModal.message}</div>
          </Alert>
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default PendingGems;