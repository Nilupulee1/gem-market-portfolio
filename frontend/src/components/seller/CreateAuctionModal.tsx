import { useState, useEffect } from 'react';
import { Modal, Button, Form, Row, Col, Card, Alert } from 'react-bootstrap';
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
      setError('Please select a gem');
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
      setError(error.response?.data?.message || 'Failed to create auction');
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
      <Modal.Body className="p-0">
        <div className="p-4">
          <h3 className="fw-bold text-primary mb-2">Create Your Gem Auction</h3>
          <p className="text-muted mb-4">
            Set the price and duration for your auction. Your listing will go live once confirmed.
          </p>

          {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
          {success && <Alert variant="success">{success}</Alert>}

          <Row>
            <Col md={7}>
              <Form onSubmit={handleSubmit}>
                {/* Select Gem */}
                {!selectedGem && (
                  <Form.Group className="mb-4">
                    <Form.Label className="fw-semibold">Select Gem</Form.Label>
                    <Form.Select
                      value={gemId}
                      onChange={(e) => setGemId(e.target.value)}
                      required
                      size="lg"
                    >
                      <option value="">Choose a gem...</option>
                      {availableGems.map((gem) => (
                        <option key={gem._id} value={gem._id}>
                          {gem.type} - {gem.carat} carat
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                )}

                {/* Auction Pricing */}
                <div className="mb-4">
                  <h5 className="fw-bold text-primary mb-3">Auction Pricing</h5>
                  <p className="text-muted small">Define the financial parameters for your auction</p>
                  
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label className="fw-semibold text-primary">Set your starting price</Form.Label>
                        <Form.Control
                          type="number"
                          placeholder="Rs. 50,000.00"
                          value={startPrice}
                          onChange={(e) => setStartPrice(e.target.value)}
                          required
                          size="lg"
                          style={{ backgroundColor: '#f8f9fa' }}
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label className="fw-semibold text-primary">Set minimum bid increment</Form.Label>
                        <Form.Control
                          type="number"
                          placeholder="Rs. 50,000.00"
                          value={minimumBidIncrement}
                          onChange={(e) => setMinimumBidIncrement(e.target.value)}
                          required
                          size="lg"
                          style={{ backgroundColor: '#f8f9fa' }}
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                </div>

                {/* Auction Timing */}
                <div className="mb-4">
                  <h5 className="fw-bold text-primary mb-3">Auction Timing</h5>
                  <p className="text-muted small">Choose how long your auction will run</p>
                  
                  <Form.Group>
                    <Form.Label className="fw-semibold text-primary">Auction Duration</Form.Label>
                    <Form.Select
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      size="lg"
                      style={{ backgroundColor: '#f8f9fa' }}
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
                  <h5 className="fw-bold text-primary mb-3">Auction Summary</h5>
                  <p className="text-muted small">Review your settings before going live</p>
                  
                  <div className="bg-light p-3 rounded">
                    <div className="d-flex justify-content-between mb-2">
                      <span className="fw-semibold text-primary">Auction Ends on:</span>
                      <span>{calculateEndDate()}</span>
                    </div>
                    <div className="d-flex justify-content-between mb-2">
                      <span className="fw-semibold text-primary">Listing Fee:</span>
                      <span>Rs.{listingFee.toLocaleString()}</span>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span className="fw-semibold text-primary">Success Fee:</span>
                      <span>{successFeePercentage}% of final sale price</span>
                    </div>
                  </div>
                  
                  <p className="text-muted small mt-3">
                    By starting this auction you agree to the Gemstone Auctions Terms of Services and Auction Policies
                  </p>
                </div>

                {/* Buttons */}
                <div className="d-flex gap-3">
                  <Button 
                    variant="outline-secondary" 
                    onClick={handleClose}
                    className="px-4"
                  >
                    Cancel
                  </Button>
                  <Button 
                    variant="primary" 
                    type="submit"
                    disabled={loading}
                    className="px-4"
                  >
                    {loading ? 'Creating...' : 'Confirm and Start Auction'}
                  </Button>
                </div>
              </Form>
            </Col>

            {/* Right Side - Gem Preview */}
            <Col md={5}>
              <Card className="border-0 shadow-sm h-100" style={{ backgroundColor: '#f8f9fa' }}>
                <Card.Body className="d-flex flex-column align-items-center justify-content-center text-center p-4">
                  {selectedGemData ? (
                    <>
                      <div 
                        className="mb-3 rounded"
                        style={{ 
                          width: '200px', 
                          height: '200px',
                          overflow: 'hidden',
                          backgroundColor: '#fff'
                        }}
                      >
                        <img 
                          src={selectedGemData.images[0] || 'https://via.placeholder.com/200'}
                          alt={selectedGemData.type}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </div>
                      <div className="mb-2">
                        <span className="badge bg-success mb-2">Admin Verified</span>
                      </div>
                      <div className="mb-3">
                        <small className="text-muted">Listing Id: {selectedGemData.certificate.certificateNumber}</small>
                      </div>
                      <h5 className="fw-bold mb-3">{selectedGemData.type}</h5>
                      <div className="text-start w-100">
                        <small className="text-muted d-block">Carat: {selectedGemData.carat}</small>
                        <small className="text-muted d-block">Type: {selectedGemData.cut}</small>
                        <small className="text-muted d-block">Origin: {selectedGemData.origin}</small>
                      </div>
                    </>
                  ) : (
                    <div className="text-muted">
                      <div 
                        className="mb-3 rounded d-flex align-items-center justify-content-center"
                        style={{ 
                          width: '200px', 
                          height: '200px',
                          backgroundColor: '#e9ecef'
                        }}
                      >
                        <span style={{ fontSize: '64px' }}>💎</span>
                      </div>
                      <p>Select a gem to preview</p>
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </div>
      </Modal.Body>
    </Modal>
  );
};

export default CreateAuctionModal;