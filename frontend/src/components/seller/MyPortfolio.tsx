import { useEffect, useMemo, useState } from 'react';
import { Row, Col, Card, Button, Form, Modal, Alert } from 'react-bootstrap';
import { Eye, Edit2, Trash2 } from 'lucide-react';
import { AxiosError } from 'axios';
import { gemAPI } from '../../api/axios';
import type { Gem } from '../../types';
import GemDetailsModal from './GemDetailsModal';

interface MyPortfolioProps {
  gems: Gem[];
  onRefresh: () => void;
}

const MyPortfolio = ({ gems, onRefresh }: MyPortfolioProps) => {
  const [selectedGem, setSelectedGem] = useState<Gem | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [gemToDelete, setGemToDelete] = useState<Gem | null>(null);
  const [filterStatus, setFilterStatus] = useState('All Gems');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionError, setActionError] = useState('');
  const [editForm, setEditForm] = useState({
    type: '',
    carat: '',
    cut: '',
    clarity: '',
    color: '',
    origin: '',
    description: '',
  });

  useEffect(() => {
    if (!showEditModal || !selectedGem) {
      return;
    }

    setEditForm({
      type: selectedGem.type,
      carat: String(selectedGem.carat),
      cut: selectedGem.cut,
      clarity: selectedGem.clarity,
      color: selectedGem.color,
      origin: selectedGem.origin,
      description: selectedGem.description,
    });
  }, [showEditModal, selectedGem]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <span className="status-pill approved">Approved</span>;
      case 'pending':
        return <span className="status-pill pending">Pending</span>;
      case 'rejected':
        return <span className="status-pill rejected">Rejected</span>;
      default:
        return <span className="status-pill default text-capitalize">{status}</span>;
    }
  };

  const handleViewDetails = (gem: Gem) => {
    setSelectedGem(gem);
    setShowDetailsModal(true);
  };

  const handleEdit = (gem: Gem) => {
    setSelectedGem(gem);
    setActionError('');
    setShowEditModal(true);
  };

  const handleDeleteClick = (gem: Gem) => {
    setGemToDelete(gem);
    setShowDeleteModal(true);
  };

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
      console.error('Error deleting gem:', error);
      setActionError('Failed to delete gem. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditFormChange = (field: keyof typeof editForm, value: string) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleEditSave = async () => {
    if (!selectedGem) {
      return;
    }

    if (!editForm.type || !editForm.carat || !editForm.cut || !editForm.clarity || !editForm.color || !editForm.origin) {
      setActionError('Please fill all required fields before saving.');
      return;
    }

    try {
      setIsSaving(true);
      setActionError('');
      await gemAPI.updateGem(selectedGem._id, {
        type: editForm.type,
        carat: Number(editForm.carat),
        cut: editForm.cut,
        clarity: editForm.clarity,
        color: editForm.color,
        origin: editForm.origin,
        description: editForm.description,
      });

      setShowEditModal(false);
      setSelectedGem(null);
      await onRefresh();
    } catch (error) {
      console.error('Error updating gem:', error);
      const axiosError = error as AxiosError<{ message?: string }>;
      setActionError(
        axiosError.response?.data?.message || 'Failed to update gem. Please try again.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Filter gems based on status
  const filteredGems = useMemo(() => gems.filter(gem => {
    if (filterStatus === 'All Gems') return true;
    return gem.status === filterStatus.toLowerCase();
  }), [gems, filterStatus]);

  return (
    <div>
      <div className="d-flex flex-column flex-sm-row justify-content-between align-sm-items-center gap-3 mb-4 animate-fade-up">
        <div className="dashboard-title mb-0">
          <h4>Collector Portfolio</h4>
          <p>Manage and organize your gem collection</p>
        </div>
        <div className="filter-group-premium">
          {['All Gems', 'Approved', 'Pending', 'Rejected'].map((status) => (
            <button
              key={status}
              type="button"
              className={`filter-btn-premium ${filterStatus === status ? 'active' : ''}`}
              onClick={() => setFilterStatus(status)}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {filteredGems.length === 0 ? (
        <Card className="content-card animate-fade-up delay-1">
          <Card.Body className="text-center py-5">
            <div className="empty-state-icon" style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.8 }}>💎</div>
            <h5 className="fw-bold mb-2">
              {gems.length === 0 
                ? 'Your Portfolio is Empty' 
                : `No ${filterStatus.toLowerCase()} gems found`}
            </h5>
            <p className="text-muted mb-4">
              {gems.length === 0 
                ? 'Start building your collector portfolio by adding your first exquisite gem.' 
                : 'Try changing your filter status to see more items.'}
            </p>
            {gems.length === 0 && (
              <Button className="btn-primary">Add Your First Gem</Button>
            )}
          </Card.Body>
        </Card>
      ) : (
        <Row className="g-4">
          {filteredGems.map((gem, index) => (
            <Col md={6} lg={4} key={gem._id} className={`animate-fade-up delay-${Math.min(5, index + 1)}`}>
              <Card className="gem-card h-100 hover-card">
                <div className="gem-image-container surface-muted" style={{ height: '250px' }}>
                  <img
                    src={gem.images[0] || 'https://via.placeholder.com/300x250'}
                    alt={gem.type}
                    className="gem-image"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = 'https://via.placeholder.com/300x250?text=Image+Not+Found';
                    }}
                  />
                  <div className="position-absolute top-0 end-0 m-2">
                    {getStatusBadge(gem.status)}
                  </div>
                </div>
                <Card.Body className="gem-card-body">
                  <div className="gem-type mb-2">{gem.type}</div>
                  <div className="gem-details mb-3">
                    <div><strong>Carat:</strong> {gem.carat}</div>
                    <div><strong>Cut:</strong> {gem.cut}</div>
                    <div><strong>Origin:</strong> {gem.origin}</div>
                  </div>
                  <div className="d-flex gap-2">
                    <Button 
                      className="btn-primary d-flex align-items-center justify-content-center" 
                      size="sm" 
                      style={{ flexGrow: 1 }}
                      onClick={() => handleViewDetails(gem)}
                    >
                      <Eye size={14} className="me-2" />
                      View Details
                    </Button>
                    <Button 
                      className="btn-secondary d-flex align-items-center justify-content-center" 
                      size="sm"
                      onClick={() => handleEdit(gem)}
                      title="Edit Gem"
                    >
                      <Edit2 size={14} />
                    </Button>
                    <Button 
                      variant="outline-danger"
                      className="d-flex align-items-center justify-content-center" 
                      size="sm"
                      onClick={() => handleDeleteClick(gem)}
                      title="Delete Gem"
                      style={{ border: '1px solid #fee2e2', color: '#ef4444' }}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {/* Gem Details Modal */}
      <GemDetailsModal
        show={showDetailsModal}
        onHide={() => {
          setShowDetailsModal(false);
          setSelectedGem(null);
        }}
        gem={selectedGem}
      />

      <Modal
        show={showEditModal}
        onHide={() => {
          setShowEditModal(false);
          setSelectedGem(null);
          setActionError('');
        }}
        centered
      >
        <Modal.Header closeButton className="modal-header-gradient">
          <Modal.Title>Edit Gem Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {actionError && <Alert variant="danger">{actionError}</Alert>}
          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Type</Form.Label>
                <Form.Control
                  value={editForm.type}
                  onChange={(event) => handleEditFormChange('type', event.target.value)}
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Carat</Form.Label>
                <Form.Control
                  type="number"
                  step="0.01"
                  min="0"
                  value={editForm.carat}
                  onChange={(event) => handleEditFormChange('carat', event.target.value)}
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Cut</Form.Label>
                <Form.Control
                  value={editForm.cut}
                  onChange={(event) => handleEditFormChange('cut', event.target.value)}
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Clarity</Form.Label>
                <Form.Control
                  value={editForm.clarity}
                  onChange={(event) => handleEditFormChange('clarity', event.target.value)}
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Color</Form.Label>
                <Form.Control
                  value={editForm.color}
                  onChange={(event) => handleEditFormChange('color', event.target.value)}
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Origin</Form.Label>
                <Form.Control
                  value={editForm.origin}
                  onChange={(event) => handleEditFormChange('origin', event.target.value)}
                />
              </Form.Group>
            </Col>
            <Col md={12}>
              <Form.Group className="mb-2">
                <Form.Label>Description</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={editForm.description}
                  onChange={(event) => handleEditFormChange('description', event.target.value)}
                />
              </Form.Group>
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => {
              setShowEditModal(false);
              setSelectedGem(null);
              setActionError('');
            }}
          >
            Cancel
          </Button>
          <Button variant="primary" onClick={handleEditSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        show={showDeleteModal}
        onHide={() => {
          setShowDeleteModal(false);
          setGemToDelete(null);
          setActionError('');
        }}
        centered
      >
        <Modal.Header closeButton className="modal-header-gradient">
          <Modal.Title>Confirm Delete</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {actionError && <Alert variant="danger">{actionError}</Alert>}
          <p>Are you sure you want to delete this gem from your portfolio?</p>
          {gemToDelete && (
            <div className="alert alert-warning" style={{ borderLeft: '4px solid #f59e0b', borderRadius: '8px' }}>
              <strong>{gemToDelete.type}</strong>
              <br />
              <small>Carat: {gemToDelete.carat} | Origin: {gemToDelete.origin}</small>
            </div>
          )}
          <p className="text-muted mb-0">This action cannot be undone.</p>
        </Modal.Body>
        <Modal.Footer>
          <Button 
            variant="secondary" 
            onClick={() => {
              setShowDeleteModal(false);
              setGemToDelete(null);
            }}
          >
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDeleteConfirm}>
            {isDeleting ? 'Deleting...' : 'Delete Gem'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default MyPortfolio;