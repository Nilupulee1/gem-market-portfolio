import { useEffect, useMemo, useState } from 'react';
import { Row, Col, Card, Form, Modal, Alert } from 'react-bootstrap';
import { Eye, Edit2, Trash2, Gem, CheckCircle2, Clock3, CircleAlert } from 'lucide-react';
import { AxiosError } from 'axios';
import { gemAPI, auctionAPI } from '../../api/axios';
import type { Gem as GemType } from '../../types';
import GemDetailsModal from './GemDetailsModal';

interface MyPortfolioProps {
  gems: GemType[];
  onRefresh: () => void;
}

const FILTER_OPTIONS = ['All Gems', 'Approved', 'Pending', 'Rejected'] as const;

const getGemStatusLabel = (status: string) => {
  switch (status) {
    case 'approved': return 'Approved';
    case 'pending': return 'Pending';
    case 'rejected': return 'Rejected';
    case 'sold': return 'Sold';
    case 'removed': return 'Removed';
    default: return status;
  }
};

const getGemStatusBadgeClass = (status: string) => {
  switch (status) {
    case 'approved': return 'portfolio-gem-badge--approved';
    case 'pending': return 'portfolio-gem-badge--pending';
    case 'rejected': return 'portfolio-gem-badge--rejected';
    case 'sold': return 'portfolio-gem-badge--approved';
    case 'removed': return 'portfolio-gem-badge--rejected';
    default: return 'portfolio-gem-badge--pending';
  }
};

const StatsBar = ({ gems }: { gems: GemType[] }) => {
  const approved = gems.filter(g => g.status === 'approved').length;
  const pending  = gems.filter(g => g.status === 'pending').length;
  const rejected = gems.filter(g => g.status === 'rejected').length;
  const total    = gems.length;

  return (
    <div className="port-stats-grid animate-fade-up">
      <Card className="stat-card h-100">
        <Card.Body>
          <div className="d-flex justify-content-between align-items-start mb-3">
            <div>
              <p className="text-muted mb-2 small">Total Gems</p>
              <h3 className="mb-0">{total}</h3>
            </div>
            <div className="stat-icon" style={{ background: 'rgba(31, 79, 130, 0.1)' }}>
              <Gem size={24} style={{ color: 'var(--color-primary)' }} />
            </div>
          </div>
        </Card.Body>
      </Card>

      <Card className="stat-card stat-card-approved h-100">
        <Card.Body>
          <div className="d-flex justify-content-between align-items-start mb-3">
            <div>
              <p className="text-muted mb-2 small">Approved</p>
              <h3 className="mb-0">{approved}</h3>
            </div>
            <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.08)' }}>
              <CheckCircle2 size={24} style={{ color: 'var(--success)' }} />
            </div>
          </div>
        </Card.Body>
      </Card>

      <Card className="stat-card stat-card-pending h-100">
        <Card.Body>
          <div className="d-flex justify-content-between align-items-start mb-3">
            <div>
              <p className="text-muted mb-2 small">Pending</p>
              <h3 className="mb-0">{pending}</h3>
            </div>
            <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.08)' }}>
              <Clock3 size={24} style={{ color: 'var(--warning)' }} />
            </div>
          </div>
        </Card.Body>
      </Card>

      <Card className="stat-card stat-card-rejected h-100">
        <Card.Body>
          <div className="d-flex justify-content-between align-items-start mb-3">
            <div>
              <p className="text-muted mb-2 small">Rejected</p>
              <h3 className="mb-0">{rejected}</h3>
            </div>
            <div className="stat-icon" style={{ background: 'rgba(239, 68, 68, 0.08)' }}>
              <CircleAlert size={24} style={{ color: 'var(--danger)' }} />
            </div>
          </div>
        </Card.Body>
      </Card>

    </div>
  );
};

const GemCard = ({
  gem,
  index,
  onView,
  onEdit,
  onDelete,
}: {
  gem: GemType;
  index: number;
  onView: (g: GemType) => void;
  onEdit: (g: GemType) => void;
  onDelete: (g: GemType) => void;
}) => (
  <Col md={6} lg={3} key={gem._id} className={`animate-fade-up delay-${Math.min(5, index + 1)}`}>
    <Card className="content-card portfolio-gem-card h-100">
      <div className="portfolio-gem-img-wrap">
        <img
          src={gem.images[0] || 'https://via.placeholder.com/400x280?text=No+Image'}
          alt={gem.type}
          className="portfolio-gem-img"
          onError={e => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x280?text=Image+Not+Found'; }}
        />
        <span className={`portfolio-gem-badge ${getGemStatusBadgeClass(gem.status)}`}>
          {getGemStatusLabel(gem.status)}
        </span>
      </div>

      <Card.Body className="portfolio-gem-body">
        <strong className="portfolio-gem-name">{gem.type}</strong>
        <p className="portfolio-gem-meta">{gem.origin} · {gem.carat} ct</p>
        <div className="portfolio-gem-specs">
          <div className="portfolio-gem-meta">
            <strong>Color:</strong> {gem.color}
          </div>
          {gem.cut && <div className="portfolio-gem-meta"><strong>Cut:</strong> {gem.cut}</div>}
          {gem.clarity && <div className="portfolio-gem-meta"><strong>Clarity:</strong> {gem.clarity}</div>}
        </div>

        <div className="portfolio-gem-actions">
          <button
            className={`bdr-btn-ghost`}
            onClick={() => onView(gem)}
            title="View gem details"
            aria-label="View gem details"
          >
            <Eye size={13} />
            View
          </button>
          <button
            className={`bdr-btn-primary`}
            onClick={() => onEdit(gem)}
            title="Edit gem"
            aria-label="Edit gem"
          >
            <Edit2 size={13} />
            Manage
          </button>
          <button
            className="bdr-btn-danger"
            onClick={() => onDelete(gem)}
            title="Delete gem"
            aria-label="Delete gem"
          >
            <Trash2 size={13} />
            Delete
          </button>
        </div>
      </Card.Body>
    </Card>
  </Col>
);

const MyPortfolio = ({ gems, onRefresh }: MyPortfolioProps) => {
  const [selectedGem,      setSelectedGem]      = useState<GemType | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showEditModal,    setShowEditModal]    = useState(false);
  const [showDeleteModal,  setShowDeleteModal]  = useState(false);
  const [gemToDelete,      setGemToDelete]      = useState<GemType | null>(null);
  const [filterStatus,     setFilterStatus]     = useState<string>('All Gems');
  const [isSaving,         setIsSaving]         = useState(false);
  const [isDeleting,       setIsDeleting]       = useState(false);
  const [actionError,      setActionError]      = useState('');
  const [editForm, setEditForm] = useState({
    type: '', carat: '', cut: '', clarity: '', color: '', origin: '', description: '',
  });
  const [activeTab, setActiveTab] = useState<'details' | 'media' | 'listing'>('details');

  // Media state
  const [imagesFiles, setImagesFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [certificateFile, setCertificateFile] = useState<File | null>(null);
  const [certificateAuthority, setCertificateAuthority] = useState('');

  // Listing state
  const [listingType, setListingType] = useState<'portfolio' | 'fixed' | 'auction'>('portfolio');
  const [fixedPrice, setFixedPrice] = useState('');
  const [auctionStartingBid, setAuctionStartingBid] = useState('');
  const [minimumBidIncrement, setMinimumBidIncrement] = useState('');
  const [duration, setDuration] = useState('7');
  const [startDate, setStartDate] = useState('');
  const approvedCount = gems.filter(g => g.status === 'approved').length;
  const approvalRate = gems.length ? Math.round((approvedCount / gems.length) * 100) : 0;

  const handleListingTypeChange = (value: 'portfolio' | 'fixed' | 'auction') => {
    if (value === 'auction' && selectedGem?.status !== 'approved') {
      setActionError('Auction can be created after verifying the gem.');
      setListingType('portfolio');
      setAuctionStartingBid('');
      setMinimumBidIncrement('');
      setDuration('7');
      setStartDate('');
      return;
    }

    setActionError('');
    setListingType(value);
    if (value !== 'fixed') {
      setFixedPrice('');
      setDuration('7');
    }
  };

  useEffect(() => {
    if (!showEditModal || !selectedGem) return;
    const hasFixedPrice = typeof selectedGem.fixedPrice === 'number' && selectedGem.fixedPrice > 0;
    setEditForm({
      type:        selectedGem.type,
      carat:       String(selectedGem.carat),
      cut:         selectedGem.cut,
      clarity:     selectedGem.clarity,
      color:       selectedGem.color,
      origin:      selectedGem.origin,
      description: selectedGem.description,
    });
    // populate media and listing state from selected gem
    setImagePreviews(selectedGem.images || []);
    setImagesFiles([]);
    setCertificateFile(null);
    setCertificateAuthority(selectedGem.certificate?.authority || '');
    // defaults for listing — these may not be stored on gem
    setListingType(hasFixedPrice ? 'fixed' : 'portfolio');
    setFixedPrice(hasFixedPrice ? String(selectedGem.fixedPrice) : '');
    setAuctionStartingBid('');
    setMinimumBidIncrement('');
    setDuration(selectedGem.listingDurationDays ? String(selectedGem.listingDurationDays) : '7');
    setStartDate('');
  }, [showEditModal, selectedGem]);

  const filteredGems = useMemo(() =>
    gems.filter(gem =>
      filterStatus === 'All Gems' ? true : gem.status === filterStatus.toLowerCase()
    ), [gems, filterStatus]);

  const handleViewDetails  = (gem: GemType) => { setSelectedGem(gem); setShowDetailsModal(true); };
  const handleEdit         = (gem: GemType) => { setSelectedGem(gem); setActionError(''); setShowEditModal(true); };
  const handleDeleteClick  = (gem: GemType) => { setGemToDelete(gem); setShowDeleteModal(true); };

  const handleDeleteConfirm = async () => {
    if (!gemToDelete) return;
    try {
      setIsDeleting(true);
      setActionError('');
      await gemAPI.deleteGem(gemToDelete._id);
      setShowDeleteModal(false);
      setGemToDelete(null);
      await onRefresh();
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      setActionError(axiosError.response?.data?.message || 'Failed to delete gem. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditSave = async () => {
    if (!selectedGem) return;
    if (!editForm.type || !editForm.carat || !editForm.cut || !editForm.clarity || !editForm.color || !editForm.origin) {
      setActionError('Please fill all required fields before saving.');
      return;
    }
    try {
      setIsSaving(true);
      setActionError('');
      let updatedGem: any = null;

      // if there are files or certificate authority changes, send multipart form
      const needsForm = imagesFiles.length > 0 || certificateFile || certificateAuthority !== (selectedGem?.certificate?.authority || '');
      if (needsForm) {
        const fd = new FormData();
        fd.append('type', editForm.type);
        fd.append('carat', String(Number(editForm.carat)));
        fd.append('cut', editForm.cut);
        fd.append('clarity', editForm.clarity);
        fd.append('color', editForm.color);
        fd.append('origin', editForm.origin);
        fd.append('description', editForm.description || '');
        if (certificateAuthority) fd.append('certificateAuthority', certificateAuthority);
        if (selectedGem) fd.append('certificateNumber', String(selectedGem._id).slice(0, 8));
        fd.append('listingType', listingType);
        if (listingType === 'fixed') {
          fd.append('fixedPrice', fixedPrice);
          fd.append('listingDurationDays', duration);
        }
        imagesFiles.forEach(f => fd.append('images', f));
        if (certificateFile) fd.append('certificate', certificateFile);

        const res = await gemAPI.updateGem(selectedGem._id, fd);
        updatedGem = res.data.gem;
      } else {
        const payload: Record<string, unknown> = {
          type:        editForm.type,
          carat:       Number(editForm.carat),
          cut:         editForm.cut,
          clarity:     editForm.clarity,
          color:       editForm.color,
          origin:      editForm.origin,
          description: editForm.description,
          listingType,
        };
        if (listingType === 'fixed') {
          payload.fixedPrice = Number(fixedPrice);
          payload.listingDurationDays = Number(duration || '7');
        }
        const res = await gemAPI.updateGem(selectedGem._id, payload);
        updatedGem = res.data.gem;
      }

      if (listingType === 'auction' && selectedGem?.status !== 'approved') {
        setActionError('Auction can be created after verifying the gem.');
        return;
      }

      // If user chose to create an auction listing, initiate PayHere checkout
      if (listingType === 'auction' && auctionStartingBid) {
        try {
          const start = startDate ? new Date(startDate) : new Date();
          const end = new Date(start);
          end.setDate(end.getDate() + Number(duration || '7'));

          const payRes = await auctionAPI.initiatePayHereCheckout({
            gemId: updatedGem._id,
            startPrice: parseFloat(auctionStartingBid),
            minimumBidIncrement: parseFloat(minimumBidIncrement || '1000'),
            startTime: start.toISOString(),
            endTime: end.toISOString(),
          });

          // auto-submit returned PayHere form fields if provided
          const payhere = payRes.data.payhere;
          if (payhere?.checkoutUrl && payhere?.fields) {
            const form = document.createElement('form');
            form.method = 'POST'; form.action = payhere.checkoutUrl; form.style.display = 'none';
            Object.entries(payhere.fields).forEach(([k, v]) => {
              const input = document.createElement('input'); input.type = 'hidden'; input.name = k; input.value = String(v); form.appendChild(input);
            });
            document.body.appendChild(form);
            form.submit();
            return;
          }
        } catch (err) {
          console.warn('Failed to initiate auction after update', err);
        }
      }

      setShowEditModal(false);
      setSelectedGem(null);
      await onRefresh();
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      setActionError(axiosError.response?.data?.message || 'Failed to update gem. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const closeEdit = () => { setShowEditModal(false); setSelectedGem(null); setActionError(''); };
  const closeDelete = () => { setShowDeleteModal(false); setGemToDelete(null); setActionError(''); };

  return (
    <div className="port-root">

      {/* ── Header ── */}
      <Card className="dashboard-hero hero-premium-mesh port-hero-card animate-fade-up">
        <div>
          <p className="dashboard-eyebrow mb-2">Gem collection</p>
          <h4>Manage, view, and edit your listed gems</h4>
          <p className="mb-0">Track your portfolio status, review listings, and manage each stone from one place.</p>
        </div>

        <div className="dashboard-chip-stack port-hero-actions">
          <span className="dashboard-chip dashboard-chip-soft">{approvalRate}% approval rate</span>
          <span className="dashboard-chip">{gems.length} total gems</span>
        </div>
      </Card>

      {/* ── Stats bar ── */}
      {gems.length > 0 && <StatsBar gems={gems} />}

      <div className="port-filter-row animate-fade-up delay-1">
        <div className="port-filter-group" role="group" aria-label="Filter gems by status">
          {FILTER_OPTIONS.map(opt => (
            <button
              key={opt}
              type="button"
              className={`port-filter-btn ${filterStatus === opt ? 'active' : ''} port-filter-${opt.replace(' ', '-').toLowerCase()}`}
              onClick={() => setFilterStatus(opt)}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      {/* ── Gem Grid ── */}
      {filteredGems.length === 0 ? (
        <Card className="content-card animate-fade-up delay-1">
          <Card.Body className="port-empty">
            <div className="port-empty-icon">💎</div>
            <h5 className="port-empty-title">
              {gems.length === 0 ? 'Your portfolio is empty' : `No ${filterStatus.toLowerCase()} gems found`}
            </h5>
            <p className="port-empty-text">
              {gems.length === 0
                ? 'Start building your portfolio by adding your first exquisite gem.'
                : 'Try changing your filter to see more items.'}
            </p>
            {gems.length === 0 && (
              <button className="port-btn-add-first">
                <Gem size={14} style={{ display: 'inline', marginRight: 6 }} />
                Add Your First Gem
              </button>
            )}
          </Card.Body>
        </Card>
      ) : (
        <Row className="g-4">
          {filteredGems.map((gem, i) => (
            <GemCard
              key={gem._id}
              gem={gem}
              index={i}
              onView={handleViewDetails}
              onEdit={handleEdit}
              onDelete={handleDeleteClick}
            />
          ))}
        </Row>
      )}

      {/* ── Details Modal ── */}
      <GemDetailsModal
        show={showDetailsModal}
        onHide={() => { setShowDetailsModal(false); setSelectedGem(null); }}
        gem={selectedGem}
      />

      {/* ── Edit Modal (updated layout to match design) ── */}
      <Modal show={showEditModal} onHide={closeEdit} centered size="lg" backdrop="static" dialogClassName="gem-edit-modal">
        <Modal.Header className="gem-edit-header px-4 pt-3 pb-0 align-items-center">
          <div className="d-flex align-items-center gap-3" style={{ flex: 1 }}>
              <button className="btn gem-edit-back-btn" onClick={closeEdit} aria-label="Back">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            <div>
              <div className="fw-bold fs-4" style={{ color: 'var(--text-primary)' }}>Edit Gem Details</div>
            </div>
          </div>

          <div className="gem-edit-header-actions d-flex align-items-center gap-4">
            <button className="btn gem-edit-action-btn gem-edit-discard-btn" onClick={() => { setShowEditModal(false); setSelectedGem(null); }}>Discard</button>
            <button
              className="btn gem-edit-action-btn gem-edit-save-btn d-flex align-items-center gap-2"
              onClick={handleEditSave}
              disabled={isSaving}
            >
              {isSaving ? (<><span className="spinner-border spinner-border-sm" /> Saving…</>) : 'Save Changes'}
            </button>
          </div>
        </Modal.Header>

        <div className="px-4">
          <ul className="nav nav-tabs gem-edit-tabs" role="tablist">
            <li className="nav-item" role="presentation">
              <button className={`nav-link gem-edit-tab-btn ${activeTab === 'details' ? 'active' : ''}`} onClick={() => setActiveTab('details')} type="button">Gem Details</button>
            </li>
            <li className="nav-item" role="presentation">
              <button className={`nav-link gem-edit-tab-btn ${activeTab === 'media' ? 'active' : ''}`} onClick={() => setActiveTab('media')} type="button">Media</button>
            </li>
            <li className="nav-item" role="presentation">
              <button className={`nav-link gem-edit-tab-btn ${activeTab === 'listing' ? 'active' : ''}`} onClick={() => setActiveTab('listing')} type="button">Listing Type</button>
            </li>
          </ul>
        </div>

        <Modal.Body className="gem-edit-body px-4 py-3">
          {actionError && (
            <Alert variant="danger" className="port-alert-error mb-4 border-0 shadow-sm">{actionError}</Alert>
          )}

          <div className="gem-edit-card p-3">
            <h6 className="mb-3" style={{ fontWeight: 700 }}>Technical Specifications</h6>
            <p className="gem-edit-muted" style={{ marginTop: -8, marginBottom: 14 }}>Define the core physical and chemical attributes of the gemstone for buyer certification.</p>

            {activeTab === 'details' && (
              <Row className="g-4">
              <Col md={7}>
                <div className="gem-edit-section-card p-3">
                  <h6 className="text-uppercase text-secondary" style={{ fontSize: 12, fontWeight: 700 }}>Identification</h6>
                  <Form.Group className="mb-3 mt-2">
                    <Form.Label className="mb-1">Gem Name</Form.Label>
                    <Form.Control
                      type="text"
                      value={editForm.type}
                      onChange={e => setEditForm(p => ({ ...p, type: e.target.value }))}
                      className="gem-edit-input"
                    />
                  </Form.Group>

                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label className="mb-1">Variety / Type</Form.Label>
                        <Form.Control className="gem-edit-input" value={editForm.type} onChange={e => setEditForm(p => ({ ...p, type: e.target.value }))} />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label className="mb-1">Geographic Origin</Form.Label>
                        <Form.Control className="gem-edit-input" value={editForm.origin} onChange={e => setEditForm(p => ({ ...p, origin: e.target.value }))} />
                      </Form.Group>
                    </Col>
                  </Row>
                </div>
              </Col>
            </Row>
            )}

            {activeTab === 'media' && (
              <div>
                <div className="mb-3">
                  <h6 className="fw-bold">Gem Visuals</h6>
                  <p className="gem-edit-muted small">Upload high-resolution images (PNG, JPG, WEBP). Up to 5 images.</p>
                  <Form.Control className="gem-edit-input" type="file" accept="image/*" multiple onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    const files = Array.from(e.target.files ?? []) as File[];
                    if (files.length + imagesFiles.length + imagePreviews.length > 5) { setActionError('Maximum 5 images allowed'); return; }
                    setActionError('');
                    setImagesFiles(prev => [...prev, ...files]);
                    files.forEach(file => {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        if (reader.result) setImagePreviews(p => [...p, String(reader.result)]);
                      };
                      reader.readAsDataURL(file);
                    });
                  }} />

                  {imagePreviews.length > 0 && (
                    <div className="ag-preview-grid mt-3">
                      {imagePreviews.map((src, i) => (
                        <div className="ag-preview-item" key={i}>
                          <img src={src} alt={`Preview ${i + 1}`} />
                          <button type="button" className="ag-preview-remove" onClick={() => {
                            setImagePreviews(pre => pre.filter((_, idx) => idx !== i));
                            setImagesFiles(prev => prev.filter((_, idx) => idx !== i));
                          }}>×</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mb-3">
                  <h6 className="fw-bold">Authenticity Documents</h6>
                  <p className="gem-edit-muted small">Upload certificates (PDF, JPG, PNG).</p>
                  <Form.Control className="gem-edit-input" type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    const f = e.target.files?.[0]; if (f) { setCertificateFile(f); setActionError(''); }
                  }} />
                  {certificateFile ? <div className="mt-2 gem-edit-muted">{certificateFile.name}</div> : selectedGem?.certificate?.authority ? <div className="mt-2 gem-edit-muted">Existing certificate: {selectedGem.certificate?.authority}</div> : null}
                  <Form.Control className="mt-2 gem-edit-input" type="text" placeholder="Certificate authority" value={certificateAuthority} onChange={e => setCertificateAuthority(e.target.value)} />
                </div>
              </div>
            )}

            {activeTab === 'listing' && (
              <div>
                <h6 className="fw-bold">Listing Settings</h6>
                <p className="gem-edit-muted small">Choose how you'd like to list this gem.</p>
                <Row className="g-3">
                  <Col md={4}>
                    <Form.Group>
                      <Form.Label>Listing Type</Form.Label>
                      <Form.Select className="gem-edit-input" value={listingType} onChange={e => handleListingTypeChange(e.target.value as 'portfolio' | 'fixed' | 'auction')}>
                        <option value="portfolio">Portfolio (showcase)</option>
                        <option value="fixed">Fixed Price</option>
                        <option value="auction">Auction</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  {listingType === 'fixed' && (
                    <>
                      <Col md={4}>
                        <Form.Group>
                          <Form.Label>Fixed Price</Form.Label>
                          <Form.Control className="gem-edit-input" type="number" value={fixedPrice} onChange={e => setFixedPrice(e.target.value)} />
                        </Form.Group>
                      </Col>
                      <Col md={4}>
                        <Form.Group>
                          <Form.Label>Listing Duration (days)</Form.Label>
                          <Form.Control className="gem-edit-input" type="number" min="1" value={duration} onChange={e => setDuration(e.target.value)} />
                        </Form.Group>
                      </Col>
                    </>
                  )}
                  {listingType === 'auction' && (
                    <>
                      <Col md={4}><Form.Group><Form.Label>Starting Bid</Form.Label><Form.Control className="gem-edit-input" type="number" value={auctionStartingBid} onChange={e => setAuctionStartingBid(e.target.value)} /></Form.Group></Col>
                      <Col md={4}><Form.Group><Form.Label>Min Bid Increment</Form.Label><Form.Control className="gem-edit-input" type="number" value={minimumBidIncrement} onChange={e => setMinimumBidIncrement(e.target.value)} /></Form.Group></Col>
                      <Col md={4}><Form.Group><Form.Label>Duration (days)</Form.Label><Form.Control className="gem-edit-input" type="number" value={duration} onChange={e => setDuration(e.target.value)} /></Form.Group></Col>
                      <Col md={6}><Form.Group><Form.Label>Start Date (optional)</Form.Label><Form.Control className="gem-edit-input" type="datetime-local" value={startDate} onChange={e => setStartDate(e.target.value)} /></Form.Group></Col>
                    </>
                  )}
                </Row>
              </div>
            )}
          </div>
        </Modal.Body>
      </Modal>

      {/* ── Delete Modal ── */}
      <Modal show={showDeleteModal} onHide={closeDelete} centered>
        <Modal.Header closeButton className="port-modal-header port-modal-header-danger">
          <Modal.Title className="port-modal-title">
            <Trash2 size={18} style={{ display: 'inline', marginRight: 10, verticalAlign: 'middle' }} />
            Confirm Delete
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="port-modal-body">
          {actionError && <Alert variant="danger" className="port-alert-error">{actionError}</Alert>}
          <p style={{ color: 'var(--text-primary)', marginBottom: 16 }}>
            Are you sure you want to permanently delete this gem from your portfolio?
          </p>
          {gemToDelete && (
            <div className="port-delete-preview">
              <div className="port-delete-preview-icon">💎</div>
              <div>
                <div className="port-delete-preview-name">{gemToDelete.type}</div>
                <div className="port-delete-preview-meta">
                  {gemToDelete.carat} ct &middot; {gemToDelete.origin}
                </div>
              </div>
            </div>
          )}
          <p className="port-delete-warning">⚠ This action cannot be undone.</p>
        </Modal.Body>
        <Modal.Footer className="port-modal-footer">
          <button className="port-modal-cancel" onClick={closeDelete}>Cancel</button>
          <button className="port-modal-delete" onClick={handleDeleteConfirm} disabled={isDeleting}>
            {isDeleting ? (
              <><span className="port-spinner port-spinner-white" /> Deleting…</>
            ) : (
              'Delete Gem'
            )}
          </button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default MyPortfolio;