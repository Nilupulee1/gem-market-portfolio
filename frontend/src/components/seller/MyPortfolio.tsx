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

const STATUS_CONFIG = {
  approved: { label: 'Approved', color: '#10b981', bg: 'rgba(16,185,129,0.10)', border: 'rgba(16,185,129,0.25)', dot: '#10b981' },
  pending:  { label: 'Pending',  color: '#f59e0b', bg: 'rgba(245,158,11,0.10)', border: 'rgba(245,158,11,0.25)', dot: '#f59e0b' },
  rejected: { label: 'Rejected', color: '#ef4444', bg: 'rgba(239,68,68,0.10)',  border: 'rgba(239,68,68,0.25)',  dot: '#ef4444' },
} as const;

const StatusBadge = ({ status }: { status: string }) => {
  const cfg = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG];
  if (!cfg) return <span className="port-status-badge port-status-default">{status}</span>;
  return (
    <span className="port-status-badge" style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}>
      <span className="port-status-dot" style={{ background: cfg.dot }} />
      {cfg.label}
    </span>
  );
};

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
        <span className="port-stat-value" style={{ color: '#10b981' }}>{approved}</span>
        <span className="port-stat-label">Approved</span>
      </div>
      <div className="port-stat-divider" />
      <div className="port-stat">
        <span className="port-stat-value" style={{ color: '#f59e0b' }}>{pending}</span>
        <span className="port-stat-label">Pending</span>
      </div>
      <div className="port-stat-divider" />
      <div className="port-stat">
        <span className="port-stat-value" style={{ color: '#ef4444' }}>{rejected}</span>
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
    <Card className="gem-card h-100">
      {/* Image — matches dashboard gem-image-container */}
      <div className="gem-image-container">
        <img
          src={gem.images[0] || 'https://via.placeholder.com/400x280?text=No+Image'}
          alt={gem.type}
          className="gem-image"
          onError={e => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x280?text=Image+Not+Found'; }}
        />
        <div className={`gem-status-badge gem-status-${gem.status}`}>
          {gem.status}
        </div>
      </div>

      {/* Body — matches dashboard gem-card-body */}
      <div className="gem-card-body">
        <div className="gem-type">{gem.type}</div>
        <div className="gem-details">
          <div><strong>Carat:</strong> {gem.carat}</div>
          <div><strong>Origin:</strong> {gem.origin}</div>
          <div><strong>Color:</strong> {gem.color}</div>
          {gem.cut && <div><strong>Cut:</strong> {gem.cut}</div>}
          {gem.clarity && <div><strong>Clarity:</strong> {gem.clarity}</div>}
        </div>
        <div className="gem-actions">
          <button
            className={`gem-actions button btn-primary btn-view-details btn-status-${gem.status}`}
            onClick={() => onView(gem)}
          >
            <Eye size={13} style={{ display: 'inline', marginRight: 5, verticalAlign: 'middle' }} />
            View Details
          </button>
          <button
            className={`gem-actions button btn-manage btn-status-${gem.status}`}
            onClick={() => onEdit(gem)}
            title="Edit gem"
          >
            <Edit2 size={13} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
            Edit
          </button>
          <button
            className="gem-actions button btn-manage btn-delete-outline"
            onClick={() => onDelete(gem)}
            title="Delete gem"
          >
            <Trash2 size={13} style={{ display: 'inline', verticalAlign: 'middle' }} />
          </button>
        </div>
      </div>
    </Card>
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
      <Modal show={showEditModal} onHide={closeEdit} centered size="lg">
        <Modal.Header closeButton className="port-modal-header">
          <Modal.Title className="port-modal-title">
            <Edit2 size={18} style={{ display: 'inline', marginRight: 10, verticalAlign: 'middle' }} />
            Edit Gem Details
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="port-modal-body">
          {actionError && (
            <Alert variant="danger" className="port-alert-error">{actionError}</Alert>
          )}
          <Row className="g-3">
            {FORM_FIELDS.map(({ key, label, col, type }) => (
              <Col md={col} key={key}>
                <Form.Group>
                  <Form.Label className="port-form-label">{label}</Form.Label>
                  {type === 'textarea' ? (
                    <Form.Control
                      as="textarea"
                      rows={3}
                      className="port-form-control"
                      value={editForm[key]}
                      onChange={e => setEditForm(p => ({ ...p, [key]: e.target.value }))}
                    />
                  ) : (
                    <Form.Control
                      type={type}
                      step={type === 'number' ? '0.01' : undefined}
                      min={type === 'number' ? '0' : undefined}
                      className="port-form-control"
                      value={editForm[key]}
                      onChange={e => setEditForm(p => ({ ...p, [key]: e.target.value }))}
                    />
                  )}
                </Form.Group>
              </Col>
            ))}
          </Row>
        </Modal.Body>
        <Modal.Footer className="port-modal-footer">
          <button className="port-modal-cancel" onClick={closeEdit}>Cancel</button>
          <button className="port-modal-save" onClick={handleEditSave} disabled={isSaving}>
            {isSaving ? (
              <><span className="port-spinner" /> Saving…</>
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