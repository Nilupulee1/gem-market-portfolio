import { useState, useEffect } from 'react';
import { Modal, Button, Form, Row, Col, Card, Alert, Badge } from 'react-bootstrap';
import type { Gem } from '../../types';
import { auctionAPI } from '../../api/axios';
import { AxiosError } from 'axios';

const LISTING_PLACEMENT_FEE_PERCENT = 5;

interface CreateAuctionModalProps {
  show: boolean;
  onHide: () => void;
  selectedGem: Gem | null;
  availableGems: Gem[];
}

const CreateAuctionModal = ({ show, onHide, selectedGem, availableGems }: CreateAuctionModalProps) => {
  const [gemId, setGemId] = useState('');
  const [startPrice, setStartPrice] = useState('');
  const [minimumBidIncrement, setMinimumBidIncrement] = useState('');
  const [duration, setDuration] = useState('5');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const calculateListingFee = () => {
    const bidValue = parseFloat(startPrice);

    if (!Number.isFinite(bidValue) || bidValue <= 0) {
      return 0;
    }

    return Math.round((bidValue * LISTING_PLACEMENT_FEE_PERCENT) / 100);
  };

  const submitPayHereForm = (checkoutUrl: string, fields: Record<string, string>) => {
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = checkoutUrl;
    form.style.display = 'none';

    Object.entries(fields).forEach(([key, value]) => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = key;
      input.value = value;
      form.appendChild(input);
    });

    document.body.appendChild(form);
    form.submit();
  };

  const selectedGemData = selectedGem || availableGems.find(g => g._id === gemId);

  useEffect(() => {
    if (selectedGem) {
      setGemId(selectedGem._id);
    }
  }, [selectedGem]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!gemId) {
      setError('Please select a gem to list in the auction pool');
      return;
    }

    const listingPlacementFee = calculateListingFee();

    if (listingPlacementFee <= 0) {
      setError('Please enter a valid starting bid');
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
        listingPlacementFee,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString()
      };

      const response = await auctionAPI.initiatePayHereCheckout(auctionData);
      const { checkoutUrl, fields } = response.data.payhere;
      setSuccess('Redirecting to PayHere sandbox...');
      submitPayHereForm(checkoutUrl, fields);
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

  const listingFee = calculateListingFee();

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

                  <div className="mt-3">
                    <Form.Group>
                      <Form.Label className="fw-semibold text-secondary">Listing Placement Fee</Form.Label>
                      <Form.Control
                        type="text"
                        value={`Rs.${listingFee.toLocaleString()}`}
                        readOnly
                        disabled
                        size="lg"
                        className="surface-muted"
                      />
                      <Form.Text className="text-muted">
                        (Fixed at {LISTING_PLACEMENT_FEE_PERCENT}% of the starting bid)
                      </Form.Text>
                    </Form.Group>
                  </div>

                  
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

                

                {/* Buttons */}
                <div className="d-flex gap-3 pt-2">
                  <Button 
                    className="bdr-btn-ghost"
                    onClick={handleClose}
                  >
                    Cancel
                  </Button>
                  <Button 
                    className="bdr-btn-primary"
                    disabled={loading}
                    type="submit"
                  >
                    {loading ? 'Redirecting to PayHere...' : `Pay Rs.${listingFee.toLocaleString()} & Launch Auction`}
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