import { useState, useEffect } from 'react';
import { Card, Table, Button, Modal } from 'react-bootstrap';
import { Eye, TrendingUp } from 'lucide-react';
import { auctionAPI } from '../../api/axios';

interface Auction {
  _id: string;
  gem: {
    _id: string;
    type: string;
    images: string[];
  };
  seller: {
    _id: string;
    name: string;
    email: string;
  };
  startPrice: number;
  currentBid: number;
  status: string;
  endTime: string;
  bids: Array<{
    bidder: {
      name: string;
      email: string;
    };
    amount: number;
    timestamp: string;
  }>;
}

const AuctionManagement = () => {
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAuction, setSelectedAuction] = useState<Auction | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    fetchAuctions();
  }, []);

  const fetchAuctions = async () => {
    try {
      setLoading(true);
      const response = await auctionAPI.getActiveAuctions();
      setAuctions(response.data.auctions);
    } catch (error) {
      console.error('Error fetching auctions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewAuction = (auction: Auction) => {
    setSelectedAuction(auction);
    setShowDetailsModal(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return <span className="status-pill active">Active</span>;
      case 'ended':
        return <span className="status-pill ended">Ended</span>;
      case 'cancelled':
        return <span className="status-pill cancelled">Cancelled</span>;
      default:
        return <span className="status-pill info text-capitalize">{status}</span>;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number) => {
    return `Rs.${amount.toLocaleString()}`;
  };

  return (
    <div>
      <div className="dashboard-title animate-fade-up">
        <h4 className="fw-bold">Auction Management</h4>
        <p>Monitor and manage all auctions on the platform</p>
      </div>

      <Card className="content-card animate-fade-up delay-1">
        <Card.Body className="p-4">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : auctions.length === 0 ? (
            <div className="text-center py-5">
              <TrendingUp size={48} className="text-muted mb-3" />
              <h5>No Active Auctions</h5>
              <p className="text-muted">There are currently no auctions on the platform</p>
            </div>
          ) : (
            <div className="table-responsive">
              <Table hover className="align-middle surface-table">
                <thead>
                  <tr>
                    <th className="border-0 py-3">Gem</th>
                    <th className="border-0 py-3">Seller</th>
                    <th className="border-0 py-3">Start Price</th>
                    <th className="border-0 py-3">Current Bid</th>
                    <th className="border-0 py-3">Bids</th>
                    <th className="border-0 py-3">Ends</th>
                    <th className="border-0 py-3">Status</th>
                    <th className="border-0 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {auctions.map((auction) => (
                    <tr key={auction._id}>
                      <td>
                        <div className="d-flex align-items-center">
                          <div 
                            className="rounded me-3 surface-muted"
                            style={{ 
                              width: '50px', 
                              height: '50px',
                              overflow: 'hidden'
                            }}
                          >
                            <img 
                              src={auction.gem.images[0] || 'https://via.placeholder.com/50'}
                              alt={auction.gem.type}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = 'https://via.placeholder.com/50';
                              }}
                            />
                          </div>
                          <div className="fw-semibold">{auction.gem.type}</div>
                        </div>
                      </td>
                      <td>
                        <div className="fw-semibold">{auction.seller.name}</div>
                        <small className="text-muted">{auction.seller.email}</small>
                      </td>
                      <td>{formatCurrency(auction.startPrice)}</td>
                      <td className="fw-bold text-success">{formatCurrency(auction.currentBid)}</td>
                      <td>
                        <span className="status-pill info">{auction.bids.length}</span>
                      </td>
                      <td>
                        <small>{formatDate(auction.endTime)}</small>
                      </td>
                      <td>{getStatusBadge(auction.status)}</td>
                      <td className="text-center">
                        <Button 
                          variant="outline-primary" 
                          size="sm"
                          onClick={() => handleViewAuction(auction)}
                        >
                          <Eye size={14} className="me-1" />
                          View
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

      {/* Auction Details Modal */}
      <Modal 
        show={showDetailsModal} 
        onHide={() => setShowDetailsModal(false)}
        size="lg"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Auction Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedAuction && (
            <div>
              <div className="d-flex gap-4 mb-4">
                <img 
                  src={selectedAuction.gem.images[0]}
                  alt={selectedAuction.gem.type}
                  style={{ width: '200px', height: '200px', objectFit: 'cover' }}
                  className="rounded"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = 'https://via.placeholder.com/200';
                  }}
                />
                <div style={{ flexGrow: 1 }}>
                  <h5 className="mb-3">{selectedAuction.gem.type}</h5>
                  <div className="mb-2">
                    <strong>Seller:</strong> {selectedAuction.seller.name}
                  </div>
                  <div className="mb-2">
                    <strong>Start Price:</strong> {formatCurrency(selectedAuction.startPrice)}
                  </div>
                  <div className="mb-2">
                    <strong>Current Bid:</strong> 
                    <span className="text-success fw-bold ms-2">
                      {formatCurrency(selectedAuction.currentBid)}
                    </span>
                  </div>
                  <div className="mb-2">
                    <strong>Status:</strong> {getStatusBadge(selectedAuction.status)}
                  </div>
                  <div className="mb-2">
                    <strong>Ends:</strong> {formatDate(selectedAuction.endTime)}
                  </div>
                  <div className="mb-2">
                    <strong>Total Bids:</strong> {selectedAuction.bids.length}
                  </div>
                </div>
              </div>

              <hr />

              <h6 className="fw-bold mb-3">Bid History ({selectedAuction.bids.length})</h6>
              {selectedAuction.bids.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-muted mb-0">No bids placed yet</p>
                </div>
              ) : (
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  <Table size="sm" hover>
                    <thead className="bg-light">
                      <tr>
                        <th>Bidder</th>
                        <th>Amount</th>
                        <th>Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedAuction.bids.map((bid, index) => (
                        <tr key={index}>
                          <td>
                            <div className="fw-semibold">{bid.bidder.name}</div>
                            <small className="text-muted">{bid.bidder.email}</small>
                          </td>
                          <td className="fw-bold text-success">{formatCurrency(bid.amount)}</td>
                          <td>
                            <small>{formatDate(bid.timestamp)}</small>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDetailsModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default AuctionManagement;