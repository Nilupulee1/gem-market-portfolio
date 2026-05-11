import { useState, useEffect, useMemo } from 'react';
import { Row, Col, Card, Button, Form, Table, InputGroup, Pagination, Modal } from 'react-bootstrap';
import { Search, Plus, Eye, Trash2 } from 'lucide-react';
import type { Gem, Auction } from '../../types';
import { gemAPI, auctionAPI } from '../../api/axios';
import CreateAuctionModal from './CreateAuctionModal';

const AuctionsPage = () => {
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [myGems, setMyGems] = useState<Gem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedGem, setSelectedGem] = useState<Gem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('endDate');
  const [selectedAuction, setSelectedAuction] = useState<Auction | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);

  const auctionStats = useMemo(() => {
    const totalBids = auctions.reduce((sum, auction) => sum + (auction.bids?.length || 0), 0);
    const activeAuctions = auctions.filter((auction) => auction.status === 'active').length;
    const endedAuctions = auctions.filter((auction) => auction.status === 'ended').length;

    return {
      totalAuctions: auctions.length,
      activeAuctions,
      endedAuctions,
      totalBids,
    };
  }, [auctions]);
  useEffect(() => {
    fetchAuctions();
    fetchMyGems();
  }, []);

  const fetchAuctions = async () => {
    try {
      setLoading(true);
      setErrorMessage('');
      const response = await auctionAPI.getMyAuctions();
      setAuctions(response.data.auctions || []);
    } catch (error) {
      console.error('Error fetching auctions:', error);
      setAuctions([]);
      setErrorMessage('Failed to load auctions. Please refresh and try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchMyGems = async () => {
    try {
      const response = await gemAPI.getMyGems();
      const approvedGems = response.data.gems.filter((gem: Gem) => gem.status === 'approved');
      setMyGems(approvedGems);
    } catch (error) {
      console.error('Error fetching gems:', error);
    }
  };

  const handleAuctionCreated = () => {
    setShowCreateModal(false);
    setSelectedGem(null);
    fetchAuctions();
  };

  const handleViewDetails = (auction: Auction) => {
    setSelectedAuction(auction);
    setShowViewModal(true);
  };

  const handleDelete = (auction: Auction) => {
    setSelectedAuction(auction);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedAuction) return;

    try {
      await auctionAPI.deleteAuction(selectedAuction._id);
      setShowDeleteModal(false);
      setSelectedAuction(null);
      fetchAuctions();
    } catch (error) {
      console.error('Error deleting auction:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return <span className="status-pill active">Active</span>;
      case 'ended':
        return <span className="status-pill ended">Ended</span>;
      case 'cancelled':
        return <span className="status-pill cancelled">Canceled</span>;
      default:
        return <span className="status-pill info">Active</span>;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
  };

  const formatCurrency = (amount: number) => {
    return `Rs.${amount.toLocaleString()}`;
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getLeadingBidderName = (auction?: Auction | null) => {
    const latestBid = auction?.bids?.[auction.bids.length - 1];
    return latestBid?.bidder?.name || auction?.winner?.name || 'No bids yet';
  };

  const getUniqueBidders = (auction?: Auction | null) => {
    if (!auction?.bids?.length) {
      return [] as Array<{ bidderId: string; name: string; email: string; bidCount: number; highestBid: number }>;
    }

    const bidderMap = new Map<string, { bidderId: string; name: string; email: string; bidCount: number; highestBid: number }>();

    auction.bids.forEach((bid) => {
      const bidderId = bid.bidder?._id || bid.bidder?.email || bid.bidder?.name;
      if (!bidderId) {
        return;
      }

      const current = bidderMap.get(bidderId) || {
        bidderId,
        name: bid.bidder?.name || 'Unknown bidder',
        email: bid.bidder?.email || '-',
        bidCount: 0,
        highestBid: 0,
      };

      current.bidCount += 1;
      current.highestBid = Math.max(current.highestBid, bid.amount);
      bidderMap.set(bidderId, current);
    });

    return Array.from(bidderMap.values()).sort((a, b) => b.highestBid - a.highestBid);
  };

  const toTimestamp = (dateValue?: string) => {
    if (!dateValue) return 0;
    const time = Date.parse(dateValue);
    return Number.isNaN(time) ? 0 : time;
  };

  const filteredAuctions = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    const filtered = auctions.filter((auction) => {
      const gemType = auction.gem?.type?.toLowerCase() || '';
      const auctionId = auction._id?.toLowerCase() || '';
      const winnerName = auction.winner?.name?.toLowerCase() || '';
      const certificateNumber = auction.gem?.certificate?.certificateNumber?.toLowerCase() || '';

      const matchesSearch =
        !normalizedSearch ||
        gemType.includes(normalizedSearch) ||
        auctionId.includes(normalizedSearch) ||
        winnerName.includes(normalizedSearch) ||
        certificateNumber.includes(normalizedSearch);

      const matchesRole =
        roleFilter === 'all' ||
        (roleFilter === 'seller') ||
        (roleFilter === 'buyer' && Boolean(auction.winner));

      const normalizedStatus = auction.status?.toLowerCase() || '';
      const matchesStatus = statusFilter === 'all' || normalizedStatus === statusFilter;

      return matchesSearch && matchesRole && matchesStatus;
    });

    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === 'startDate') {
        return toTimestamp(b.startTime) - toTimestamp(a.startTime);
      }
      if (sortBy === 'bidAmount') {
        return b.currentBid - a.currentBid;
      }
      return toTimestamp(b.endTime) - toTimestamp(a.endTime);
    });

    return sorted;
  }, [auctions, roleFilter, searchTerm, sortBy, statusFilter]);

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4 animate-fade-up">
        <div className="dashboard-title mb-0">
          <h2 className="mb-1 fw-bold">Auctions</h2>
          <p>Review all your past auctions and bidder activity</p>
        </div>
        <Button 
          variant="primary" 
          className="d-flex align-items-center px-4 auction-primary-btn"
          onClick={() => setShowCreateModal(true)}
        >
          <Plus size={18} className="me-2" />
          Create Auction
        </Button>
      </div>

      <div className="auction-summary-grid animate-fade-up delay-1 mb-4">
        <div className="auction-summary-card">
          <span className="auction-summary-label">Total auctions</span>
          <strong className="auction-summary-value">{auctionStats.totalAuctions}</strong>
          <small>All seller listings</small>
        </div>
        <div className="auction-summary-card">
          <span className="auction-summary-label">Active auctions</span>
          <strong className="auction-summary-value">{auctionStats.activeAuctions}</strong>
          <small>Open for bidding</small>
        </div>
        <div className="auction-summary-card">
          <span className="auction-summary-label">Ended auctions</span>
          <strong className="auction-summary-value">{auctionStats.endedAuctions}</strong>
          <small>Winner decided</small>
        </div>
        <div className="auction-summary-card">
          <span className="auction-summary-label">Total bids</span>
          <strong className="auction-summary-value">{auctionStats.totalBids}</strong>
          <small>Across all auctions</small>
        </div>
      </div>

      <Card className="content-card auction-panel animate-fade-up delay-2">
        <Card.Body className="p-4">
          {/* Filters and Search */}
          <Row className="mb-4 align-items-center">
            <Col md={5}>
              <InputGroup>
                <InputGroup.Text className="bg-white">
                  <Search size={18} className="text-muted" />
                </InputGroup.Text>
                <Form.Control
                  placeholder="Search by gem name, auction ID or winner"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </InputGroup>
            </Col>
            <Col md={7} className="d-flex gap-3 justify-content-end mt-3 mt-md-0">
              <Form.Select 
                style={{ width: 'auto' }}
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                <option value="all">Role: All</option>
                <option value="seller">Seller</option>
                <option value="buyer">Buyer</option>
              </Form.Select>
              <Form.Select 
                style={{ width: 'auto' }}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">Status: All</option>
                <option value="active">Active</option>
                <option value="ended">Ended</option>
                <option value="cancelled">Canceled</option>
              </Form.Select>
              <Form.Select 
                style={{ width: 'auto' }}
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="endDate">Sort By: End date</option>
                <option value="startDate">Sort By: Start date</option>
                <option value="bidAmount">Sort By: Bid amount</option>
              </Form.Select>
            </Col>
          </Row>

          {/* Auctions Table */}
          {errorMessage && (
            <div className="alert alert-warning" role="alert">
              {errorMessage}
            </div>
          )}

          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : filteredAuctions.length === 0 ? (
            <div className="text-center py-5">
              <p className="text-muted mb-3">No auctions found for the selected filters</p>
              {auctions.length === 0 && (
                <Button variant="primary" onClick={() => setShowCreateModal(true)}>
                  Create Your First Auction
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="table-responsive">
                <Table hover className="align-middle surface-table">
                  <thead>
                    <tr>
                      <th className="border-0 py-3">Gem Details</th>
                      <th className="border-0 py-3">Winner</th>
                      <th className="border-0 py-3">Auction End Date</th>
                      <th className="border-0 py-3">Final Bid</th>
                      <th className="border-0 py-3 text-center">Action</th>
                      <th className="border-0 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAuctions.map((auction) => (
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
                                src={auction.gem?.images?.[0] || 'https://via.placeholder.com/50'}
                                alt={auction.gem?.type}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.src = 'https://via.placeholder.com/50';
                                }}
                              />
                            </div>
                            <div>
                              <div className="fw-semibold">{auction.gem?.type || '-'}</div>
                              <small className="text-muted">
                                {auction.gem?.certificate?.certificateNumber || '-'}
                              </small>
                            </div>
                          </div>
                        </td>
                        <td>{auction.winner?.name || '-'}</td>
                        <td>{formatDate(auction.endTime)}</td>
                        <td className="fw-semibold">{formatCurrency(auction.currentBid)}</td>
                        <td className="text-center">
                          <div className="d-flex gap-2 justify-content-center">
                            <Button 
                              variant="link" 
                              size="sm" 
                              className="p-1 text-success"
                              title="View Details"
                              onClick={() => handleViewDetails(auction)}
                            >
                              <Eye size={18} />
                            </Button>
                            <Button 
                              variant="link" 
                              size="sm" 
                              className="p-1 text-danger"
                              title="Delete"
                              onClick={() => handleDelete(auction)}
                            >
                              <Trash2 size={18} />
                            </Button>
                          </div>
                        </td>
                        <td>{getStatusBadge(auction.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="d-flex justify-content-between align-items-center mt-3">
                <small className="text-muted">Showing 1-{filteredAuctions.length} of {auctions.length}</small>
                <Pagination className="mb-0">
                  <Pagination.Prev disabled />
                  <Pagination.Item active>{1}</Pagination.Item>
                  <Pagination.Item>{2}</Pagination.Item>
                  <Pagination.Item>{3}</Pagination.Item>
                  <Pagination.Next />
                </Pagination>
              </div>
            </>
          )}
        </Card.Body>
      </Card>

      {/* Create Auction Modal */}
      <CreateAuctionModal
        show={showCreateModal}
        onHide={() => {
          setShowCreateModal(false);
          setSelectedGem(null);
        }}
        selectedGem={selectedGem}
        availableGems={myGems}
        onAuctionCreated={handleAuctionCreated}
      />

      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Delete</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Are you sure you want to delete this auction?</p>
          {selectedAuction && (
            <div className="alert alert-warning">
              <strong>{selectedAuction.gem?.type}</strong>
              <br />
              <small>Current Bid: {formatCurrency(selectedAuction.currentBid)}</small>
            </div>
          )}
          <p className="text-muted mb-0">This action cannot be undone.</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDeleteConfirm}>
            Delete Auction
          </Button>
        </Modal.Footer>
      </Modal>

      {/* View Details Modal */}
      <Modal show={showViewModal} onHide={() => setShowViewModal(false)} centered size="lg" dialogClassName="auction-modal">
        <Modal.Header closeButton>
          <Modal.Title>Auction Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedAuction && (
            <>
              <Row className="g-4 auction-details-hero p-3">
                <Col md={4} className="d-flex align-items-start">
                  <img
                    src={selectedAuction.gem?.images?.[0] || 'https://via.placeholder.com/300'}
                    alt={selectedAuction.gem?.type}
                    className="w-100 rounded"
                    style={{ objectFit: 'cover', maxHeight: '220px' }}
                  />
                </Col>
                <Col md={8}>
                  <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
                    <h5 className="mb-0">{selectedAuction.gem?.type || 'N/A'}</h5>
                    <span className="status-pill info text-capitalize">{selectedAuction.status}</span>
                  </div>
                  <div className="row g-3">
                    <div className="col-md-6">
                      <div className="auction-details-card h-100">
                        <span className="auction-details-label">Auction ID</span>
                        <div className="fw-semibold text-break">{selectedAuction._id}</div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="auction-details-card h-100">
                        <span className="auction-details-label">Certificate No</span>
                        <div className="fw-semibold text-break">{selectedAuction.gem?.certificate?.certificateNumber || '-'}</div>
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="auction-details-card">
                        <span className="auction-details-label">Start Price</span>
                        <div className="fw-semibold">{formatCurrency(selectedAuction.startPrice)}</div>
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="auction-details-card">
                        <span className="auction-details-label">Final Bid</span>
                        <div className="fw-semibold">{formatCurrency(selectedAuction.currentBid)}</div>
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="auction-details-card">
                        <span className="auction-details-label">Minimum Increment</span>
                        <div className="fw-semibold">{formatCurrency(selectedAuction.minimumBidIncrement)}</div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="auction-details-card">
                        <span className="auction-details-label">End Date</span>
                        <div className="fw-semibold">{formatDate(selectedAuction.endTime)}</div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="auction-details-card">
                        <span className="auction-details-label">Winner</span>
                        <div className="fw-semibold">{selectedAuction.winner?.name || getLeadingBidderName(selectedAuction)}</div>
                      </div>
                    </div>
                  </div>
                </Col>
              </Row>

              <hr className="my-4" />

              <Row className="g-4 mt-1">
                <Col md={5}>
                  <h6 className="fw-bold mb-3">Winner Summary</h6>
                  {selectedAuction.winner ? (
                    <div className="auction-details-card">
                      <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
                        <div>
                          <p className="mb-1"><strong>{selectedAuction.winner.name}</strong></p>
                          <p className="mb-1 text-muted">{selectedAuction.winner.email}</p>
                        </div>
                        <span className="auction-bid-flag winner">Winner</span>
                      </div>
                      <p className="mb-1">Winning bid: <strong>{formatCurrency(selectedAuction.currentBid)}</strong></p>
                      <p className="mb-0 text-muted small">Finalized from the highest submitted bid.</p>
                    </div>
                  ) : (
                    <div className="auction-details-card">
                      <p className="mb-0 text-muted">
                        Winner has not been decided yet. Current leader: <strong>{getLeadingBidderName(selectedAuction)}</strong>
                      </p>
                    </div>
                  )}
                </Col>

                <Col md={7}>
                  <h6 className="fw-bold mb-3">All Bidders</h6>
                  {selectedAuction.bids.length === 0 ? (
                    <div className="auction-details-card text-muted">No bids have been placed on this auction.</div>
                  ) : (
                    <div className="auction-bid-table border rounded-3 overflow-hidden">
                      <Table responsive className="mb-0 align-middle">
                        <thead className="table-light">
                          <tr>
                            <th className="border-0">Bidder</th>
                            <th className="border-0">Email</th>
                            <th className="border-0">Amount</th>
                            <th className="border-0">Time</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedAuction.bids.slice().reverse().map((bid, index) => {
                            const isTopBid = index === 0;
                            return (
                              <tr key={`${bid.timestamp}-${index}`}>
                                <td>
                                  <div className="fw-semibold d-flex align-items-center gap-2">
                                    {bid.bidder?.name || 'Unknown bidder'}
                                    {isTopBid && <span className="auction-bid-flag top">Top bid</span>}
                                  </div>
                                </td>
                                <td>{bid.bidder?.email || '-'}</td>
                                <td className="fw-semibold">{formatCurrency(bid.amount)}</td>
                                <td>{formatDateTime(bid.timestamp)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </Table>
                    </div>
                  )}
                </Col>
              </Row>

              <Row className="g-4 mt-2">
                <Col>
                  <h6 className="fw-bold mb-3">Bidder Summary</h6>
                  {getUniqueBidders(selectedAuction).length === 0 ? (
                    <div className="auction-details-card text-muted">No bidder summary available.</div>
                  ) : (
                    <Row className="g-3">
                      {getUniqueBidders(selectedAuction).map((bidder) => (
                        <Col md={6} key={bidder.bidderId}>
                          <div className="auction-details-card h-100">
                            <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
                              <div>
                                <div className="fw-semibold">{bidder.name}</div>
                                <small className="text-muted">{bidder.email}</small>
                              </div>
                              {selectedAuction.winner?._id === bidder.bidderId && <span className="auction-bid-flag winner">Winner</span>}
                            </div>
                            <div className="d-flex justify-content-between">
                              <small className="text-muted">Bids placed</small>
                              <strong>{bidder.bidCount}</strong>
                            </div>
                            <div className="d-flex justify-content-between mt-1">
                              <small className="text-muted">Highest bid</small>
                              <strong>{formatCurrency(bidder.highestBid)}</strong>
                            </div>
                          </div>
                        </Col>
                      ))}
                    </Row>
                  )}
                </Col>
              </Row>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowViewModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default AuctionsPage;