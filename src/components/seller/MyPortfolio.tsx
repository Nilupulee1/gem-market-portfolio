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
      <div className="d-flex justify-content-between align-items-center mb-4 animate-fade-up">
        <div className="dashboard-title mb-0">
          <h4>Collector Portfolio</h4>
          <p>Manage and organize your gem collection</p>
        </div>
        <Form.Select 
          style={{ width: 'auto' }} 
          size="sm"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option>All Gems</option>
          <option>Approved</option>
          <option>Pending</option>
          <option>Rejected</option>
        </Form.Select>
      </div>

      {filteredGems.length === 0 ? (
        <Card className="content-card animate-fade-up delay-1">
          <Card.Body className="text-center py-5">
            <p className="text-muted mb-3">
              {gems.length === 0 
                ? 'No gems in your portfolio yet' 
                : `No ${filterStatus.toLowerCase()} gems found`}
            </p>
            {gems.length === 0 && (
              <Button variant="primary">Add Your First Gem</Button>
            )}
          </Card.Body>
        </Card>
      ) : (
        <Row className="g-4">
          {filteredGems.map((gem) => (
            <Col md={6} lg={4} key={gem._id}>
              <Card className="content-card h-100 hover-card animate-fade-up delay-1">
                <div className="position-relative surface-muted" style={{ height: '250px', overflow: 'hidden' }}>
                  <img
                    src={gem.images[0] || 'https://via.placeholder.com/300x250'}
                    alt={gem.type}
                    className="w-100 h-100"
                    style={{ objectFit: 'cover' }}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = 'https://via.placeholder.com/300x250?text=Image+Not+Found';
                    }}
                  />
                  <div className="position-absolute top-0 end-0 m-2">
                    {getStatusBadge(gem.status)}
                  </div>
                </div>
                <Card.Body>
                  <h6 className="mb-2 fw-bold">{gem.type}</h6>
                  <div className="mb-3">
                    <small className="text-muted d-block">
                      <strong>Carat:</strong> {gem.carat}
                    </small>
                    <small className="text-muted d-block">
                      <strong>Cut:</strong> {gem.cut}
                    </small>
                    <small className="text-muted d-block">
                      <strong>Origin:</strong> {gem.origin}
                    </small>
                  </div>
                  <div className="d-flex gap-2">
                    <Button 
                      variant="outline-primary" 
                      size="sm" 
                      style={{ flexGrow: 1 }}
                      onClick={() => handleViewDetails(gem)}
                    >
                      <Eye size={14} className="me-1" />
                      View
                    </Button>
                    <Button 
                      variant="outline-secondary" 
                      size="sm"
                      onClick={() => handleEdit(gem)}
                      title="Edit Gem"
                    >
                      <Edit2 size={14} />
                    </Button>
                    <Button 
                      variant="outline-danger" 
                      size="sm"
                      onClick={() => handleDeleteClick(gem)}
                      title="Delete Gem"
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
        <Modal.Header closeButton>
          <Modal.Title>Edit Gem</Modal.Title>
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
        <Modal.Header closeButton>
          <Modal.Title>Confirm Delete</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {actionError && <Alert variant="danger">{actionError}</Alert>}
          <p>Are you sure you want to delete this gem?</p>
          {gemToDelete && (
            <div className="alert alert-warning">
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