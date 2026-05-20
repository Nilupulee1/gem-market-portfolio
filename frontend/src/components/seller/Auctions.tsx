import { useState, useEffect, useMemo } from 'react';
import { Row, Col, Card, Button, Form, Modal, InputGroup, Alert } from 'react-bootstrap';
import { Search, Plus, Eye, Trash2, TrendingUp, Clock, Target, Users } from 'lucide-react';
import type { Gem, Auction } from '../../types';
import { gemAPI, auctionAPI } from '../../api/axios';
import CreateAuctionModal from './CreateAuctionModal';

interface AuctionsPageProps {
  onContactWinner?: (
    contact: { _id?: string; name: string; email: string; phone?: string },
    gem: { name: string; id: string }
  ) => void;
}

const AuctionsPage = ({ onContactWinner }: AuctionsPageProps) => {
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

  const toTimestamp = (dateValue?: string) => {
    if (!dateValue) return 0;
    const time = Date.parse(dateValue);
    return Number.isNaN(time) ? 0 : time;
  };

  const getAuctionStatus = (auction: Auction) => {
    const backendStatus = auction.status?.toLowerCase() || '';
    if (backendStatus !== 'active') return backendStatus || 'ended';
    return toTimestamp(auction.endTime) > Date.now() ? 'active' : 'ended';
  };

  const auctionStats = useMemo(() => {
    const totalBids = auctions.reduce((sum, auction) => sum + (auction.bids?.length || 0), 0);
    const activeAuctions = auctions.filter((auction) => getAuctionStatus(auction) === 'active').length;
    const endedAuctions = auctions.filter((auction) => getAuctionStatus(auction) === 'ended').length;

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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
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
    const latestBid = auction?.bids?.reduce((latest, bid) => {
      if (!latest) return bid;
      return new Date(bid.timestamp).getTime() > new Date(latest.timestamp).getTime() ? bid : latest;
    }, auction.bids?.[0]);
    return latestBid?.bidder?.name || 'No bids yet';
  };

  const getLatestBidder = (auction?: Auction | null) => {
    if (!auction?.bids?.length) {
      return null;
    }

    return auction.bids.reduce((latest, bid) => {
      if (!latest) return bid;
      return new Date(bid.timestamp).getTime() > new Date(latest.timestamp).getTime() ? bid : latest;
    }, auction.bids[0]);
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

      const normalizedStatus = getAuctionStatus(auction);
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
      {/* Header Section */}
      <div className="d-flex justify-content-between align-items-start mb-5 animate-fade-up">
        <div className="dashboard-title">
          <h4 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px' }}>Marketplace Auctions</h4>
          <p style={{ color: '#7c8aa3', margin: 0 }}>Establish custom bidding pools, monitor offers, and manage live sales</p>
        </div>
        <Button 
          className="btn-primary d-flex align-items-center gap-2"
          onClick={() => setShowCreateModal(true)}
          style={{ whiteSpace: 'nowrap' }}
        >
          <Plus size={18} />
          Create New Auction
        </Button>
      </div>

      {/* Stats Cards */}
      <Row className="g-4 mb-5 animate-fade-up delay-1">
        <Col md={6} lg={3}>
          <Card className="stat-card stat-card-approved h-100">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <p className="stat-card-label">Total Auctions</p>
                  <h3 style={{ fontSize: '28px', fontWeight: 700, color: '#1a2332', marginBottom: 0 }}>
                    {auctionStats.totalAuctions}
                  </h3>
                </div>
                <div className="stat-icon" style={{ background: 'rgba(31, 79, 130, 0.1)' }}>
                  <Target size={24} style={{ color: 'var(--color-primary)' }} />
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={6} lg={3}>
          <Card className="stat-card stat-card-pending h-100">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <p className="stat-card-label">Active Now</p>
                  <h3 style={{ fontSize: '28px', fontWeight: 700, color: '#10b981', marginBottom: 0 }}>
                    {auctionStats.activeAuctions}
                  </h3>
                </div>
                <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.1)' }}>
                  <Clock size={24} style={{ color: '#10b981' }} />
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={6} lg={3}>
          <Card className="stat-card stat-card-rejected h-100">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <p className="stat-card-label">Ended</p>
                  <h3 style={{ fontSize: '28px', fontWeight: 700, color: '#f59e0b', marginBottom: 0 }}>
                    {auctionStats.endedAuctions}
                  </h3>
                </div>
                <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.1)' }}>
                  <TrendingUp size={24} style={{ color: '#f59e0b' }} />
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={6} lg={3}>
          <Card className="stat-card stat-card-approved h-100">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <p className="stat-card-label">Total Bids</p>
                  <h3 style={{ fontSize: '28px', fontWeight: 700, color: '#ef4444', marginBottom: 0 }}>
                    {auctionStats.totalBids}
                  </h3>
                </div>
                <div className="stat-icon" style={{ background: 'rgba(239, 68, 68, 0.1)' }}>
                  <Users size={24} style={{ color: '#ef4444' }} />
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Main Content Card */}
      <Card className="content-card animate-fade-up delay-2">
        <Card.Body className="p-4">
          {/* Search and Filters */}
          <div className="mb-4">
            <Row className="g-3 align-items-end">
              <Col md={5}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#1a2332', marginBottom: '8px' }}>
                  Search Auctions
                </div>
                <InputGroup className="input-group-premium">
                  <InputGroup.Text className="bg-white border-end-0">
                    <Search size={18} style={{ color: '#7c8aa3' }} />
                  </InputGroup.Text>
                  <Form.Control
                    placeholder="Search by gem name, ID or winner..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="border-start-0"
                  />
                </InputGroup>
              </Col>
              <Col md={7}>
                <Row className="g-2">
                  <Col xs={6} sm={4}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#7c8aa3', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Status
                    </div>
                    <Form.Select 
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="surface-muted"
                      style={{ fontSize: '13px', fontWeight: 500 }}
                    >
                      <option value="all">All Status</option>
                      <option value="active">Active</option>
                      <option value="ended">Ended</option>
                      <option value="cancelled">Cancelled</option>
                    </Form.Select>
                  </Col>
                  <Col xs={6} sm={4}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#7c8aa3', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Sort By
                    </div>
                    <Form.Select 
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="surface-muted"
                      style={{ fontSize: '13px', fontWeight: 500 }}
                    >
                      <option value="endDate">End Date</option>
                      <option value="startDate">Start Date</option>
                      <option value="bidAmount">Bid Amount</option>
                    </Form.Select>
                  </Col>
                  <Col xs={12} sm={4}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#7c8aa3', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Role
                    </div>
                    <Form.Select 
                      value={roleFilter}
                      onChange={(e) => setRoleFilter(e.target.value)}
                      className="surface-muted"
                      style={{ fontSize: '13px', fontWeight: 500 }}
                    >
                      <option value="all">All Roles</option>
                      <option value="seller">Seller</option>
                      <option value="buyer">Buyer</option>
                    </Form.Select>
                  </Col>
                </Row>
              </Col>
            </Row>
          </div>

          <hr style={{ margin: '24px 0', borderColor: 'var(--border)' }} />

          {/* Content */}
          {errorMessage && (
            <Alert variant="danger" className="mb-4">
              {errorMessage}
            </Alert>
          )}

          {loading ? (
            <Row className="g-4">
              {[1, 2, 3].map((i) => (
                <Col md={6} lg={4} key={i}>
                  <div className="skeleton-card skeleton-shimmer" style={{ height: '350px' }}>
                    <div className="skeleton-text skeleton-text-lg skeleton-shimmer" style={{ width: '80%' }} />
                    <div className="skeleton-text skeleton-text-md skeleton-shimmer" style={{ width: '60%', marginTop: '16px' }} />
                    <div className="skeleton-text skeleton-shimmer" style={{ width: '100%', height: '80px', borderRadius: '8px', marginTop: '20px' }} />
                  </div>
                </Col>
              ))}
            </Row>
          ) : filteredAuctions.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🎯</div>
              <div className="empty-state-title">
                {auctions.length === 0 ? 'No Auctions Found' : 'No Results Found'}
              </div>
              <div className="empty-state-text">
                {auctions.length === 0 
                  ? 'Start by creating your first auction to attract collectors and bidders.'
                  : 'Try adjusting your filters, sort order, or search queries.'
                }
              </div>
              {auctions.length === 0 && (
                <Button 
                  className="btn-primary"
                  onClick={() => setShowCreateModal(true)}
                >
                  <Plus size={16} className="me-2" style={{ display: 'inline' }} />
                  Create Your First Auction
                </Button>
              )}
            </div>
          ) : (
            <div>
              {/* Auction Cards Grid */}
              <Row className="g-4 mb-4">
                {filteredAuctions.map((auction, index) => (
                  <Col md={6} lg={4} key={auction._id} className={`animate-fade-up delay-${Math.min(5, index + 1)}`}>
                    <Card 
                      className="gem-card h-100 hover-card"
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleViewDetails(auction)}
                    >
                      {/* Image */}
                      <div className="gem-image-container">
                        <img
                          src={auction.gem?.images?.[0] || 'https://via.placeholder.com/300x200'}
                          alt={auction.gem?.type}
                          className="gem-image"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = 'https://via.placeholder.com/300x200';
                          }}
                        />
                        <div className={`gem-status-badge gem-status-${getAuctionStatus(auction)}`}>
                          {getAuctionStatus(auction)}
                        </div>
                      </div>

                      {/* Content */}
                      <div className="gem-card-body">
                        <div className="gem-type mb-2">
                          {auction.gem?.type || 'Unknown Gem'}
                        </div>

                        {/* Auction Info */}
                        <div className="gem-details mb-3">
                          <div><strong>Current Bid:</strong> Rs.{auction.currentBid?.toLocaleString() || 0}</div>
                          <div><strong>Starting Bid:</strong> Rs.{auction.startPrice?.toLocaleString() || 0}</div>
                          <div><strong>Bids Registered:</strong> {auction.bids?.length || 0}</div>
                          <div><strong>Ends:</strong> {formatDate(auction.endTime)}{getAuctionStatus(auction) === 'active' ? ' (Active)' : ''}</div>
                        </div>

                        {/* Leading bidder / winner info */}
                        {auction.bids && auction.bids.length > 0 ? (
                          <div className="p-3 mb-3 rounded shadow-sm" style={{ 
                            background: 'var(--page-surface)', 
                            border: '1px solid var(--border)',
                            fontSize: '12px'
                          }}>
                            <div className="text-muted mb-1 fw-semibold">
                              {getAuctionStatus(auction) === 'ended' ? 'WINNING COLLECTOR' : 'LEADING BIDDER'}
                            </div>
                            <div className="fw-bold" style={{ color: 'var(--color-primary)' }}>
                              {getLeadingBidderName(auction)}
                            </div>
                          </div>
                        ) : (
                          <div className="p-3 mb-3 rounded text-center fw-semibold" style={{ 
                            background: 'var(--page-surface)', 
                            border: '1px dashed var(--border)',
                            fontSize: '12px',
                            color: '#7c8aa3'
                          }}>
                            No bids placed yet
                          </div>
                        )}

                        {/* Actions */}
                        <div className="d-flex gap-2 mt-auto">
                          <Button 
                            className="btn-primary d-flex align-items-center justify-content-center"
                            size="sm"
                            style={{ flex: 1, fontWeight: 600 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewDetails(auction);
                            }}
                          >
                            <Eye size={14} className="me-2" />
                            View Auction
                          </Button>
                          <Button 
                            className="btn-secondary d-flex align-items-center justify-content-center"
                            size="sm"
                            style={{ fontWeight: 600, border: '1px solid #fee2e2', color: '#ef4444' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(auction);
                            }}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  </Col>
                ))}
              </Row>

              {/* Results Info */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                paddingTop: '16px',
                borderTop: '1px solid var(--border)',
                fontSize: '13px',
                color: '#7c8aa3'
              }}>
                <span>
                  Showing <strong>{filteredAuctions.length}</strong> of <strong>{auctions.length}</strong> auctions
                </span>
              </div>
            </div>
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
        <Modal.Header closeButton className="modal-header-gradient">
          <Modal.Title>Delete Auction</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p style={{ marginBottom: '16px' }}>
            Are you sure you want to delete this auction? This action cannot be undone.
          </p>
          {selectedAuction && (
            <div style={{ 
              padding: '16px', 
              background: '#fee2e2', 
              borderRadius: '8px',
              borderLeft: '4px solid #ef4444'
            }}>
              <div style={{ fontWeight: 600, color: '#1a2332', marginBottom: '8px' }}>
                {selectedAuction.gem?.type}
              </div>
              <div style={{ fontSize: '13px', color: '#7f1d1d' }}>
                Current Bid: Rs.{selectedAuction.currentBid?.toLocaleString() || 0}
              </div>
              <div style={{ fontSize: '13px', color: '#7f1d1d' }}>
                Bids: {selectedAuction.bids?.length || 0}
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer style={{ gap: '12px' }}>
          <Button 
            variant="secondary" 
            onClick={() => setShowDeleteModal(false)}
          >
            Cancel
          </Button>
          <Button 
            style={{ background: '#ef4444', border: 'none' }}
            onClick={handleDeleteConfirm}
          >
            Delete Auction
          </Button>
        </Modal.Footer>
      </Modal>

      {/* View Details Modal */}
      <Modal show={showViewModal} onHide={() => setShowViewModal(false)} centered size="lg">
        <Modal.Header closeButton style={{ background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--secondary-color) 100%)', color: 'white', border: 'none' }}>
          <Modal.Title style={{ fontWeight: 700 }}>Auction Details</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ padding: '24px' }}>
          {selectedAuction && (
            <div>
              {/* Top Section - Gem and Key Info */}
              <Row className="g-4 mb-4">
                <Col md={4}>
                  <img
                    src={selectedAuction.gem?.images?.[0] || 'https://via.placeholder.com/300'}
                    alt={selectedAuction.gem?.type}
                    style={{ width: '100%', borderRadius: '12px', objectFit: 'cover' }}
                  />
                </Col>
                <Col md={8}>
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                      <h5 style={{ margin: 0, fontWeight: 700, color: '#1a2332' }}>
                        {selectedAuction.gem?.type}
                      </h5>
                      <span className={`gem-status-badge gem-status-${getAuctionStatus(selectedAuction)}`}>
                        {getAuctionStatus(selectedAuction)}
                      </span>
                    </div>
                    <p style={{ color: '#7c8aa3', margin: 0, fontSize: '13px' }}>
                      Certificate: {selectedAuction.gem?.certificate?.certificateNumber || 'N/A'}
                    </p>
                  </div>

                  {/* Key Metrics Grid */}
                  <Row className="g-2">
                    <Col xs={6}>
                      <div style={{ 
                        padding: '12px', 
                        background: '#f8f9fa', 
                        borderRadius: '8px',
                        borderLeft: '3px solid #1f4f82'
                      }}>
                        <div style={{ fontSize: '11px', color: '#7c8aa3', fontWeight: 600, marginBottom: '4px' }}>
                          START PRICE
                        </div>
                        <div style={{ fontSize: '16px', fontWeight: 700, color: '#1a2332' }}>
                          Rs.{selectedAuction.startPrice?.toLocaleString() || 0}
                        </div>
                      </div>
                    </Col>
                    <Col xs={6}>
                      <div style={{ 
                        padding: '12px', 
                        background: '#f8f9fa', 
                        borderRadius: '8px',
                        borderLeft: '3px solid #10b981'
                      }}>
                        <div style={{ fontSize: '11px', color: '#7c8aa3', fontWeight: 600, marginBottom: '4px' }}>
                          CURRENT BID
                        </div>
                        <div style={{ fontSize: '16px', fontWeight: 700, color: '#1a2332' }}>
                          Rs.{selectedAuction.currentBid?.toLocaleString() || 0}
                        </div>
                      </div>
                    </Col>
                    <Col xs={6}>
                      <div style={{ 
                        padding: '12px', 
                        background: '#f8f9fa', 
                        borderRadius: '8px',
                        borderLeft: '3px solid #f59e0b'
                      }}>
                        <div style={{ fontSize: '11px', color: '#7c8aa3', fontWeight: 600, marginBottom: '4px' }}>
                          MIN INCREMENT
                        </div>
                        <div style={{ fontSize: '16px', fontWeight: 700, color: '#1a2332' }}>
                          Rs.{selectedAuction.minimumBidIncrement?.toLocaleString() || 0}
                        </div>
                      </div>
                    </Col>
                    <Col xs={6}>
                      <div style={{ 
                        padding: '12px', 
                        background: '#f8f9fa', 
                        borderRadius: '8px',
                        borderLeft: '3px solid #ef4444'
                      }}>
                        <div style={{ fontSize: '11px', color: '#7c8aa3', fontWeight: 600, marginBottom: '4px' }}>
                          TOTAL BIDS
                        </div>
                        <div style={{ fontSize: '16px', fontWeight: 700, color: '#1a2332' }}>
                          {selectedAuction.bids?.length || 0}
                        </div>
                      </div>
                    </Col>
                  </Row>
                </Col>
              </Row>

              <hr style={{ margin: '24px 0', borderColor: '#e5e7eb' }} />

              {/* Leading bidder / winner and bids */}
              <Row className="g-4">
                <Col md={5}>
                  <h6 style={{ fontWeight: 700, marginBottom: '16px', color: '#1a2332' }}>
                    {getAuctionStatus(selectedAuction) === 'ended' ? '🏆 Winner' : '👑 Leading Bidder'}
                  </h6>
                  {selectedAuction.bids && selectedAuction.bids.length > 0 ? (
                    (() => {
                      const latestBid = getLatestBidder(selectedAuction);

                      return (
                    <div style={{ 
                      padding: '16px', 
                      background: '#d1f5d1', 
                      borderRadius: '12px',
                      borderLeft: '4px solid #10b981'
                    }}>
                      <div style={{ fontSize: '13px', color: '#0b6623', marginBottom: '4px' }}>
                        {getAuctionStatus(selectedAuction) === 'ended' ? 'Winning Bid' : 'Current Leader'}
                      </div>
                      <div style={{ fontWeight: 700, color: '#0b6623', marginBottom: '8px', fontSize: '16px' }}>
                        {getLeadingBidderName(selectedAuction)}
                      </div>
                      <div style={{ fontSize: '13px', color: '#0b6623' }}>
                        Rs.{selectedAuction.currentBid?.toLocaleString() || 0}
                      </div>
                      {getAuctionStatus(selectedAuction) === 'ended' && latestBid?.bidder && onContactWinner && (
                        <Button
                          className="btn-primary mt-3"
                          size="sm"
                          onClick={() => onContactWinner(
                            latestBid.bidder,
                            { name: selectedAuction.gem?.type || 'Gem', id: selectedAuction.gem?._id || '' }
                          )}
                        >
                          Contact Winner
                        </Button>
                      )}
                    </div>
                      );
                    })()
                  ) : (
                    <div style={{ 
                      padding: '16px', 
                      background: '#fef3c7', 
                      borderRadius: '12px',
                      borderLeft: '4px solid #f59e0b',
                      color: '#92400e'
                    }}>
                      No bids have been placed yet
                    </div>
                  )}
                </Col>

                <Col md={7}>
                  <h6 style={{ fontWeight: 700, marginBottom: '16px', color: '#1a2332' }}>
                    📊 All Bids ({selectedAuction.bids?.length || 0})
                  </h6>
                  {selectedAuction.bids.length === 0 ? (
                    <div style={{ 
                      padding: '16px', 
                      background: '#f8f9fa', 
                      borderRadius: '8px',
                      color: '#7c8aa3',
                      textAlign: 'center'
                    }}>
                      No bids yet
                    </div>
                  ) : (
                    <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                      {selectedAuction.bids.slice().reverse().map((bid, index) => (
                        <div 
                          key={`${bid.timestamp}-${index}`}
                          style={{
                            padding: '12px',
                            marginBottom: '8px',
                            background: index === 0 ? '#d1f5d1' : '#f8f9fa',
                            borderRadius: '8px',
                            borderLeft: index === 0 ? '4px solid #10b981' : '4px solid #e5e7eb'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '6px' }}>
                            <div>
                              <div style={{ fontWeight: 600, color: '#1a2332', fontSize: '13px' }}>
                                {bid.bidder?.name || 'Unknown'}
                                {index === 0 && <span style={{ marginLeft: '8px', fontSize: '11px', background: '#10b981', color: 'white', padding: '2px 6px', borderRadius: '4px' }}>Top</span>}
                              </div>
                              <div style={{ fontSize: '12px', color: '#7c8aa3' }}>
                                {bid.bidder?.email || '-'}
                              </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontWeight: 700, color: '#1a2332', fontSize: '14px' }}>
                                Rs.{bid.amount?.toLocaleString() || 0}
                              </div>
                              <div style={{ fontSize: '11px', color: '#7c8aa3' }}>
                                {formatDateTime(bid.timestamp)}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Col>
              </Row>
            </div>
          )}
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default AuctionsPage;