import { useEffect, useMemo, useState } from 'react';
import { Row, Col, Card, Form, Modal, Alert } from 'react-bootstrap';
import { Eye, Edit2, Trash2, Gem } from 'lucide-react';
import { AxiosError } from 'axios';
import { gemAPI } from '../../api/axios';
import type { Gem as GemType } from '../../types';
import GemDetailsModal from './GemDetailsModal';

interface MyPortfolioProps {
  gems: GemType[];
  onRefresh: () => void;
}

const FILTER_OPTIONS = ['All Gems', 'Approved', 'Pending', 'Rejected'] as const;

const StatsBar = ({ gems }: { gems: GemType[] }) => {
  const approved = gems.filter(g => g.status === 'approved').length;
  const pending  = gems.filter(g => g.status === 'pending').length;
  const rejected = gems.filter(g => g.status === 'rejected').length;
  const total    = gems.length;
  const totalCt  = gems.reduce((s, g) => s + Number(g.carat || 0), 0);

  return (
    <div className="port-stats-bar animate-fade-up">
      <div className="port-stat">
        <span className="port-stat-value">{total}</span>
        <span className="port-stat-label">Total gems</span>
      </div>
      <div className="port-stat-divider" />
      <div className="port-stat">
        <span className="port-stat-value" style={{ color: 'var(--success)' }}>{approved}</span>
        <span className="port-stat-label">Approved</span>
      </div>
      <div className="port-stat-divider" />
      <div className="port-stat">
        <span className="port-stat-value" style={{ color: 'var(--warning)' }}>{pending}</span>
        <span className="port-stat-label">Pending</span>
      </div>
      <div className="port-stat-divider" />
      <div className="port-stat">
        <span className="port-stat-value" style={{ color: 'var(--danger)' }}>{rejected}</span>
        <span className="port-stat-label">Rejected</span>
      </div>
      <div className="port-stat-divider" />
      <div className="port-stat">
        <span className="port-stat-value">{totalCt.toFixed(2)}</span>
        <span className="port-stat-label">Total carats</span>
      </div>
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
  <Col md={6} lg={4} key={gem._id} className={`animate-fade-up delay-${Math.min(5, index + 1)}`}>
    <article className="bdr-market-card h-100">
      <div className="bdr-market-img-wrap">
        <img
          src={gem.images[0] || 'https://via.placeholder.com/400x280?text=No+Image'}
          alt={gem.type}
          className="bdr-market-img"
          onError={e => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x280?text=Image+Not+Found'; }}
        />
        <span className={`bdr-market-badge ${gem.status === 'approved' ? 'bdr-badge-sale' : gem.status === 'pending' ? 'bdr-badge-live' : 'bdr-badge-live'}`}>
          {gem.status}
        </span>
      </div>

      <div className="bdr-market-body">
        <strong className="bdr-market-name">{gem.type}</strong>
        <p className="bdr-market-meta">{gem.origin} · {gem.carat} ct</p>
        <div style={{ marginTop: 6 }}>
          <div className="bdr-market-meta" style={{ marginBottom: 6 }}>
            <strong>Color:</strong> {gem.color}
          </div>
          {gem.cut && <div className="bdr-market-meta" style={{ marginBottom: 6 }}><strong>Cut:</strong> {gem.cut}</div>}
          {gem.clarity && <div className="bdr-market-meta" style={{ marginBottom: 6 }}><strong>Clarity:</strong> {gem.clarity}</div>}
        </div>

        <div className="bdr-market-actions">
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
      </div>
    </article>
  </Col>
);

const FORM_FIELDS = [
  { key: 'type',        label: 'Gem Type',    col: 6, type: 'text' },
  { key: 'carat',       label: 'Carat',       col: 6, type: 'number' },
  { key: 'cut',         label: 'Cut',         col: 6, type: 'text' },
  { key: 'clarity',     label: 'Clarity',     col: 6, type: 'text' },
  { key: 'color',       label: 'Color',       col: 6, type: 'text' },
  { key: 'origin',      label: 'Origin',      col: 6, type: 'text' },
  { key: 'description', label: 'Description', col: 12, type: 'textarea' },
] as const;

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

  useEffect(() => {
    if (!showEditModal || !selectedGem) return;
    setEditForm({
      type:        selectedGem.type,
      carat:       String(selectedGem.carat),
      cut:         selectedGem.cut,
      clarity:     selectedGem.clarity,
      color:       selectedGem.color,
      origin:      selectedGem.origin,
      description: selectedGem.description,
    });
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
    } catch {
      setActionError('Failed to delete gem. Please try again.');
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
      await gemAPI.updateGem(selectedGem._id, {
        type:        editForm.type,
        carat:       Number(editForm.carat),
        cut:         editForm.cut,
        clarity:     editForm.clarity,
        color:       editForm.color,
        origin:      editForm.origin,
        description: editForm.description,
      });
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
      <div className="port-header animate-fade-up">
        <div>
          <h4 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
            Gem Collection
          </h4>
          <p style={{ margin: '4px 0 0', fontSize: 13.5, color: 'var(--text-secondary)' }}>
            Manage, view, and edit your listed gems
          </p>
        </div>

        {/* Filter pill group — no filter icon */}
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

      {/* ── Stats bar ── */}
      {gems.length > 0 && <StatsBar gems={gems} />}

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

      {/* ── Edit Modal ── */}
      <Modal show={showEditModal} onHide={closeEdit} centered size="lg" backdrop="static">
        <Modal.Header closeButton className="border-0 pb-0 pt-4 px-4">
          <Modal.Title className="fw-bold fs-4 d-flex align-items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <div className="d-flex align-items-center justify-content-center bg-primary bg-opacity-10 rounded-circle" style={{ width: '40px', height: '40px', color: 'var(--color-primary)' }}>
              <Edit2 size={20} />
            </div>
            Edit Gem Details
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="px-4 py-4">
          {actionError && (
            <Alert variant="danger" className="port-alert-error mb-4 border-0 shadow-sm">{actionError}</Alert>
          )}
          <Row className="g-4">
            {FORM_FIELDS.map(({ key, label, col, type }) => (
              <Col md={col} key={key}>
                <Form.Group>
                  <Form.Label className="text-uppercase fw-bold text-secondary mb-2" style={{ fontSize: '12px', letterSpacing: '0.05em' }}>
                    {label}
                  </Form.Label>
                  {type === 'textarea' ? (
                    <Form.Control
                      as="textarea"
                      rows={4}
                      className="form-control bg-light border-0 shadow-none px-3 py-2"
                      style={{ borderRadius: '12px', fontSize: '14px', transition: 'all 0.2s ease' }}
                      value={editForm[key]}
                      onChange={e => setEditForm(p => ({ ...p, [key]: e.target.value }))}
                      onFocus={e => e.target.style.boxShadow = '0 0 0 3px rgba(47, 109, 225, 0.15)'}
                      onBlur={e => e.target.style.boxShadow = 'none'}
                    />
                  ) : (
                    <Form.Control
                      type={type}
                      step={type === 'number' ? '0.01' : undefined}
                      min={type === 'number' ? '0' : undefined}
                      className="form-control bg-light border-0 shadow-none px-3 py-2"
                      style={{ borderRadius: '12px', fontSize: '14px', transition: 'all 0.2s ease', height: '46px' }}
                      value={editForm[key]}
                      onChange={e => setEditForm(p => ({ ...p, [key]: e.target.value }))}
                      onFocus={e => e.target.style.boxShadow = '0 0 0 3px rgba(47, 109, 225, 0.15)'}
                      onBlur={e => e.target.style.boxShadow = 'none'}
                    />
                  )}
                </Form.Group>
              </Col>
            ))}
          </Row>
        </Modal.Body>
        <Modal.Footer className="border-0 pt-0 pb-4 px-4 d-flex justify-content-end gap-2">
          <button 
            className="btn btn-light fw-semibold px-4 py-2" 
            style={{ borderRadius: '10px', color: 'var(--text-secondary)' }}
            onClick={closeEdit}
          >
            Cancel
          </button>
          <button 
            className="btn btn-primary fw-semibold px-4 py-2 d-flex align-items-center gap-2" 
            style={{ borderRadius: '10px', background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-bright) 100%)', border: 'none', boxShadow: '0 4px 12px rgba(47, 109, 225, 0.25)' }}
            onClick={handleEditSave} 
            disabled={isSaving}
          >
            {isSaving ? (
              <><span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Saving…</>
            ) : (
              'Save Changes'
            )}
          </button>
        </Modal.Footer>
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
            Are you sure you want to remove this gem from your portfolio?
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