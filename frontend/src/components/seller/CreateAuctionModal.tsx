import { useState, useEffect } from 'react';
import { Modal, Button, Form, Row, Col, Card, Alert, Badge } from 'react-bootstrap';
import type { Gem } from '../../types';
import { auctionAPI } from '../../api/axios';
import { AxiosError } from 'axios';

interface CreateAuctionModalProps {
  show: boolean;
  onHide: () => void;
  selectedGem: Gem | null;
  availableGems: Gem[];
  onAuctionCreated: () => void;
}

const CreateAuctionModal = ({ show, onHide, selectedGem, availableGems, onAuctionCreated }: CreateAuctionModalProps) => {
  const [gemId, setGemId] = useState('');
  const [startPrice, setStartPrice] = useState('');
  const [minimumBidIncrement, setMinimumBidIncrement] = useState('');
  const [duration, setDuration] = useState('5');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const selectedGemData = selectedGem || availableGems.find(g => g._id === gemId);

  useEffect(() => {
    if (selectedGem) {
      setGemId(selectedGem._id);
    }
  }, [selectedGem]);

  const calculateEndDate = () => {
    const days = parseInt(duration);
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);
    return endDate.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    }) + ' at ' + endDate.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!gemId) {
      setError('Please select a gem to list in the auction pool');
      return;
    }

    setLoading(true);

    try {
      const startTime = new Date();
      const endTime = new Date();
      endTime.setDate(endTime.getDate() + parseInt(duration));

      const auctionData = {
        gemId,
        startPrice: parseFloat(startPrice),
        minimumBidIncrement: parseFloat(minimumBidIncrement),
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString()
      };

      await auctionAPI.createAuction(auctionData);
      setSuccess('Auction created successfully!');
      
      setTimeout(() => {
        onAuctionCreated();
        handleClose();
      }, 1500);
    } catch (err) {
      const error = err as AxiosError<{ message: string }>;
      setError(error.response?.data?.message || 'Failed to create auction pool');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setGemId('');
    setStartPrice('');
    setMinimumBidIncrement('');
    setDuration('5');
    setError('');
    setSuccess('');
    onHide();
  };

  const listingFee = 2500;
  const successFeePercentage = 5;

  return (
    <Modal show={show} onHide={handleClose} size="lg" centered>
      <Modal.Header closeButton className="modal-header-gradient">
        <Modal.Title className="fw-bold text-white">Initiate Live Auction</Modal.Title>
      </Modal.Header>
      <Modal.Body className="p-4">
        {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
        
        {success ? (
          <div className="text-center py-5">
            <div className="success-checkmark">✓</div>
            <h4 className="fw-bold mb-2">Live Auction Created!</h4>
            <p className="text-muted">{success}</p>
            <div className="spinner-border text-success mt-3" role="status" style={{ width: '2rem', height: '2rem', borderWidth: '3px' }}>
              <span className="visually-hidden">Redirecting...</span>
            </div>
          </div>
        ) : (
          <Row className="g-4">
            <Col md={7}>
              <Form onSubmit={handleSubmit}>
                {/* Select Gem */}
                {!selectedGem && (
                  <Form.Group className="mb-4">
                    <Form.Label className="fw-bold text-dark">Select Verified Gem</Form.Label>
                    <Form.Select
                      value={gemId}
                      onChange={(e) => setGemId(e.target.value)}
                      required
                      size="lg"
                      className="surface-muted"
                    >
                      <option value="">Choose a gem from your vault...</option>
                      {availableGems.map((gem) => (
                        <option key={gem._id} value={gem._id}>
                          {gem.type} - {gem.carat} ct ({gem.cut})
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                )}

                {/* Auction Pricing */}
                <div className="mb-4">
                  <h5 className="fw-bold text-dark mb-3">Pricing Parameters</h5>
                  
                  <Row className="g-3">
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label className="fw-semibold text-secondary">Starting Bid (Rs) *</Form.Label>
                        <Form.Control
                          type="number"
                          placeholder="Rs. 50,000.00"
                          value={startPrice}
                          onChange={(e) => setStartPrice(e.target.value)}
                          required
                          size="lg"
                          className="surface-muted"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label className="fw-semibold text-secondary">Min Bid Increment (Rs) *</Form.Label>
                        <Form.Control
                          type="number"
                          placeholder="Rs. 5,000.00"
                          value={minimumBidIncrement}
                          onChange={(e) => setMinimumBidIncrement(e.target.value)}
                          required
                          size="lg"
                          className="surface-muted"
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                </div>

                {/* Auction Timing */}
                <div className="mb-4">
                  <h5 className="fw-bold text-dark mb-3">Bidding Window</h5>
                  
                  <Form.Group>
                    <Form.Label className="fw-semibold text-secondary">Bidding Period Duration</Form.Label>
                    <Form.Select
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      size="lg"
                      className="surface-muted"
                    >
                      <option value="1">1 Day</option>
                      <option value="3">3 Days</option>
                      <option value="5">5 Days</option>
                      <option value="7">7 Days</option>
                      <option value="14">14 Days</option>
                    </Form.Select>
                  </Form.Group>
                </div>

                {/* Auction Summary */}
                <div className="mb-4">
                  <h5 className="fw-bold text-dark mb-3">Fee Structure & Summary</h5>
                  
                  <div className="p-3 rounded mb-3" style={{ background: 'var(--page-surface)', border: '1px solid var(--border)', fontSize: '13px' }}>
                    <div className="d-flex justify-content-between mb-2">
                      <span className="text-secondary fw-semibold">Estimated End Date:</span>
                      <span className="fw-bold text-dark">{calculateEndDate()}</span>
                    </div>
                    <div className="d-flex justify-content-between mb-2">
                      <span className="text-secondary fw-semibold">Listing Placement Fee:</span>
                      <span className="fw-bold text-dark">Rs.{listingFee.toLocaleString()}</span>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span className="text-secondary fw-semibold">Platform Success Commission:</span>
                      <span className="fw-bold text-dark">{successFeePercentage}% of winning bid</span>
                    </div>
                  </div>
                  
                  <p className="text-muted small mt-2">
                    Listing placement fees will be deducted from your portfolio payout. By confirming, you acknowledge that all bids are legally binding contracts.
                  </p>
                </div>

                {/* Buttons */}
                <div className="d-flex gap-3 pt-2">
                  <Button 
                    className="btn-secondary px-4"
                    onClick={handleClose}
                  >
                    Cancel
                  </Button>
                  <Button 
                    className="btn-primary px-4 fw-semibold"
                    type="submit"
                    disabled={loading}
                  >
                    {loading ? 'Creating Bidding Pool...' : 'Confirm & Launch Auction'}
                  </Button>
                </div>
              </Form>
            </Col>

            {/* Right Side - Gem Preview */}
            <Col md={5}>
              <Card className="glass-card border-0 h-100" style={{ minHeight: '320px' }}>
                <Card.Body className="d-flex flex-column align-items-center justify-content-center text-center p-4">
                  {selectedGemData ? (
                    <>
                      <div 
                        className="mb-3 rounded overflow-hidden shadow-sm"
                        style={{ 
                          width: '180px', 
                          height: '180px',
                          border: '1px solid var(--border)'
                        }}
                      >
                        <img 
                          src={selectedGemData.images[0] || 'https://via.placeholder.com/180'}
                          alt={selectedGemData.type}
                          className="w-100 h-100"
                          style={{ objectFit: 'cover' }}
                        />
                      </div>
                      <Badge bg="success" className="mb-3 px-3 py-1 fw-semibold">Office Verified</Badge>
                      <h6 className="fw-bold text-dark mb-2">{selectedGemData.type}</h6>
                      <div className="text-start w-100 p-3 rounded" style={{ background: 'rgba(255,255,255,0.4)', fontSize: '12px', border: '1px solid var(--border)' }}>
                        <div className="mb-1"><strong>Carat:</strong> {selectedGemData.carat} ct</div>
                        <div className="mb-1"><strong>Cut Style:</strong> {selectedGemData.cut}</div>
                        <div className="mb-1"><strong>Origin:</strong> {selectedGemData.origin}</div>
                        <div><strong>Report #:</strong> {selectedGemData.certificate.certificateNumber || 'N/A'}</div>
                      </div>
                    </>
                  ) : (
                    <div className="text-muted p-4">
                      <div 
                        className="mb-3 rounded d-flex align-items-center justify-content-center mx-auto"
                        style={{ 
                          width: '120px', 
                          height: '120px',
                          backgroundColor: 'rgba(255,255,255,0.5)',
                          border: '1px dashed var(--border)'
                        }}
                      >
                        <span style={{ fontSize: '40px' }}>💎</span>
                      </div>
                      <p className="fw-semibold small mt-2">Select a verified gem from the left menu to preview auction profile details</p>
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>
        )}
      </Modal.Body>
    </Modal>
  );
};

export default CreateAuctionModal;