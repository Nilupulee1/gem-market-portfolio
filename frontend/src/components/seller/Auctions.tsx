import { useState, useEffect, useMemo } from 'react';
import { Row, Col, Card, Button, Form, Modal, InputGroup, Alert } from 'react-bootstrap';
import { Search, Plus, Clock, Target, Users, ChevronLeft, ChevronRight, Gavel, Calendar, Eye, Trash2 } from 'lucide-react';
import type { Gem, Auction } from '../../types';
import { gemAPI, auctionAPI } from '../../api/axios';
import CreateAuctionModal from './CreateAuctionModal';
import { useLocation } from 'react-router-dom';

interface AuctionsPageProps {
  onContactWinner?: (
    contact: { _id?: string; name: string; email: string; phone?: string },
    gem: { name: string; id: string }
  ) => void;
}

const AuctionsPage = ({ onContactWinner }: AuctionsPageProps) => {
  const location = useLocation();
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [myGems, setMyGems] = useState<Gem[]>([]);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [paymentNotice, setPaymentNotice] = useState<{ variant: 'success' | 'warning' | 'danger'; message: string } | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedGem, setSelectedGem] = useState<Gem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('endDate');
  const [selectedAuction, setSelectedAuction] = useState<Auction | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'myAuctions' | 'history'>('myAuctions');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const toTimestamp = (dateValue?: string) => {
    if (!dateValue) return 0;
    const time = Date.parse(dateValue);
    return Number.isNaN(time) ? 0 : time;
  };

  const getAuctionStatus = (auction: Auction) => {
    const backendStatus = auction.status?.toLowerCase() || '';
    if (backendStatus === 'pending_payment') {
      if (auction.paymentConfirmed || auction.paymentStatus === 'completed') {
        return 'active';
      }

      return 'pending';
    }
    if (backendStatus !== 'active') return backendStatus || 'ended';
    return toTimestamp(auction.endTime) > currentTime ? 'active' : 'ended';
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
  }, [auctions, currentTime]);
  useEffect(() => {
    fetchAuctions();
    fetchMyGems();
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const paymentState = params.get('payment');
    const auctionId = params.get('auctionId');

    if (!paymentState) {
      return;
    }

    if (paymentState === 'success') {
      const activateAuction = async () => {
        try {
          if (auctionId) {
            await auctionAPI.updateAuctionStatus(auctionId, { status: 'active' });
            setAuctions((currentAuctions) =>
              currentAuctions.map((auction) =>
                auction._id === auctionId
                  ? {
                      ...auction,
                      status: 'active',
                      paymentConfirmed: true,
                      paymentStatus: 'completed',
                    }
                  : auction
              )
            );
          }

          setPaymentNotice({
            variant: 'success',
            message: auctionId
              ? `Payment completed for auction ${auctionId}. The listing is now live.`
              : 'Payment completed. The listing is now live.',
          });
        } catch (error) {
          console.error('Error activating auction after payment:', error);
          setPaymentNotice({
            variant: 'warning',
            message: auctionId
              ? `Payment completed for auction ${auctionId}, but the listing is still syncing. Please refresh in a moment.`
              : 'Payment completed, but the listing is still syncing. Please refresh in a moment.',
          });
        } finally {
          fetchAuctions();
        }
      };

      void activateAuction();
      return;
    }

    if (paymentState === 'cancelled') {
      setPaymentNotice({
        variant: 'warning',
        message: auctionId
          ? `Payment was cancelled for auction ${auctionId}. The listing remains pending.`
          : 'Payment was cancelled. The listing remains pending.',
      });
      fetchAuctions();
      return;
    }

    if (paymentState === 'declined') {
      setPaymentNotice({
        variant: 'danger',
        message: auctionId
          ? `PayHere declined payment for auction ${auctionId}. Please try a different sandbox card.`
          : 'PayHere declined the payment. Please try a different sandbox card.',
      });
      fetchAuctions();
    }
  }, [location.search]);

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

  const formatRemaining = (endTime: string) => {
    const ms = new Date(endTime).getTime() - currentTime;
    if (ms <= 0) return 'Ended';
    const d = Math.floor(ms / 86400000);
    const h = Math.floor((ms / 3600000) % 24);
    const m = Math.floor((ms / 60000) % 60);
    const s = Math.floor((ms / 1000) % 60);
    return [d > 0 ? `${d}d` : null, d > 0 || h > 0 ? `${h}h` : null, d > 0 || h > 0 || m > 0 ? `${m}m` : null, `${s}s`].filter(Boolean).join(' ');
  };

  const formatCurrency = (v: number) => `Rs.${v.toLocaleString()}`;

  const getAuctionWinnerContact = (auction: Auction) => {
    const winner = auction.winner;
    if (winner?._id && winner.name && winner.email) {
      return winner;
    }

    const latestBidder = auction.bids?.[auction.bids.length - 1]?.bidder;
    if (latestBidder?._id && latestBidder.name && latestBidder.email) {
      return latestBidder;
    }

    return null;
  };

  const filteredAuctions = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    let baseAuctions = auctions;

    // Filter by tab
    if (activeTab === 'myAuctions') {
      baseAuctions = auctions.filter(a => getAuctionStatus(a) === 'active' || getAuctionStatus(a) === 'pending');
    } else {
      baseAuctions = auctions.filter(a => getAuctionStatus(a) === 'ended');
    }

    const filtered = baseAuctions.filter((auction) => {
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

      const normalizedStatus = getAuctionStatus(auction);
      const matchesStatus = statusFilter === 'all' || normalizedStatus === statusFilter;

      return matchesSearch && matchesStatus;
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
  }, [auctions, activeTab, searchTerm, sortBy, statusFilter, currentTime]);

  const paginatedAuctions = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return filteredAuctions.slice(start, end);
  }, [filteredAuctions, currentPage]);

  const totalPages = Math.ceil(filteredAuctions.length / itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, statusFilter, sortBy, searchTerm]);

  return (
    <div>
      {paymentNotice && (
        <Alert variant={paymentNotice.variant} dismissible onClose={() => setPaymentNotice(null)} className="mb-4">
          {paymentNotice.message}
        </Alert>
      )}

      {/* Header */}
      <div className="d-flex justify-content-between align-items-start mb-4 animate-fade-up">
        <div>
          <h4>My Auctions & History</h4>
          <p className="mb-0">Track your active and past auction participation.</p>
        </div>
        <Button 
          className="bdr-btn-primary d-flex align-items-center gap-2"
          onClick={() => setShowCreateModal(true)}
          style={{ whiteSpace: 'nowrap' }}
        >
          <Plus size={18} />
          Create New Auction
        </Button>
      </div>

      {/* Stats Cards */}
      <Row className="g-4 mb-4 animate-fade-up delay-1">
        <Col md={6} lg={3}>
          <Card className="stat-card stat-card-approved h-100">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <p className="stat-card-label">Total Auctions</p>
                  <h3 style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 0 }}>
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
                  <h3 style={{ fontSize: '28px', fontWeight: 700, color: 'var(--success)', marginBottom: 0 }}>
                    {auctionStats.activeAuctions}
                  </h3>
                </div>
                <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.08)' }}>
                  <Clock size={24} style={{ color: 'var(--success)' }} />
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
                  <h3 style={{ fontSize: '28px', fontWeight: 700, color: 'var(--warning)', marginBottom: 0 }}>
                    {auctionStats.endedAuctions}
                  </h3>
                </div>
                <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.08)' }}>
                  <Calendar size={24} style={{ color: 'var(--warning)' }} />
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
                  <h3 style={{ fontSize: '28px', fontWeight: 700, color: 'var(--danger)', marginBottom: 0 }}>
                    {auctionStats.totalBids}
                  </h3>
                </div>
                <div className="stat-icon" style={{ background: 'rgba(239, 68, 68, 0.08)' }}>
                  <Users size={24} style={{ color: 'var(--danger)' }} />
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Tab Navigation */}
      <div className="content-card mb-4 animate-fade-up delay-2">
        <div className="card-body p-4">
          <div style={{ display: 'flex', gap: '32px', borderBottom: '1px solid var(--border)', paddingBottom: '16px' }}>
            <button
              onClick={() => setActiveTab('myAuctions')}
              className={`auctions-tab-btn ${activeTab === 'myAuctions' ? 'active' : ''}`}
            >
              <Gavel size={16} style={{ marginRight: '8px', display: 'inline' }} />
              My Auctions ({auctions.filter(a => getAuctionStatus(a) === 'active' || getAuctionStatus(a) === 'pending').length})
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`auctions-tab-btn ${activeTab === 'history' ? 'active' : ''}`}
            >
              <Calendar size={16} style={{ marginRight: '8px', display: 'inline' }} />
              Auction History ({auctions.filter(a => getAuctionStatus(a) === 'ended').length})
            </button>
          </div>

          {/* Search and Filters */}
          <div style={{ marginTop: '20px' }}>
            <Row className="g-3 align-items-end">
              <Col md={6}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
                  Search Auctions
                </div>
                <InputGroup className="input-group-premium">
                  <InputGroup.Text className="bg-white border-end-0">
                    <Search size={18} style={{ color: 'var(--text-secondary)' }} />
                  </InputGroup.Text>
                  <Form.Control
                    placeholder="Search by gem type or ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="border-start-0"
                  />
                </InputGroup>
              </Col>
              <Col md={3}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
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
              <Col md={3}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
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
                </Form.Select>
              </Col>
            </Row>
          </div>
        </div>
      </div>

      {/* Auction Cards Grid */}
      {errorMessage && (
        <Alert variant="danger" className="mb-4">
          {errorMessage}
        </Alert>
      )}

      {loading ? (
        <Row className="g-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Col md={6} lg={4} key={i}>
              <div className="skeleton-card skeleton-shimmer" style={{ height: '320px' }} />
            </Col>
          ))}
        </Row>
      ) : paginatedAuctions.length === 0 ? (
        <div className="dashboard-empty-inline mt-5">
          {filteredAuctions.length === 0 
            ? `No ${activeTab === 'myAuctions' ? 'active' : 'ended'} auctions found. ${activeTab === 'myAuctions' ? 'Create a new auction to get started!' : ''}` 
            : 'No results matching your filters.'}
        </div>
      ) : (
        <>
          <Row className="g-4 mb-4">
            {paginatedAuctions.map((auction) => {
              const status = getAuctionStatus(auction);
              const lotNumber = auction._id.slice(-4).toUpperCase();
              const gemImage = auction.gem?.images?.[0] || 'https://via.placeholder.com/460x280';
              const endingTime = formatRemaining(auction.endTime);
              const hasEnded = new Date(auction.endTime).getTime() <= currentTime;

              return (
                <Col md={6} lg={4} key={auction._id}>
                  <article className="market-card auction-card">
                    {/* Image Container */}
                    <div style={{ position: 'relative', marginBottom: '10px' }}>
                      <img
                        className="market-image"
                        src={gemImage}
                        alt={auction.gem?.type}
                        style={{
                          width: '100%',
                          height: '182px',
                          objectFit: 'cover',
                          backgroundColor: 'var(--page-surface-muted)',
                          borderRadius: '12px'
                        }}
                      />
                      {/* Lot Number Badge */}
                      <div className="auction-lot-badge">
                        Lot #{lotNumber}
                      </div>
                      {/* Status Badge */}
                      <div className={`auction-status-pill auction-status-${status}`}>
                        {status}
                      </div>
                    </div>

                    {/* Gem Details */}
                    <h6 className="auction-gem-title">
                      {auction.gem?.type}
                    </h6>
                    <p className="auction-gem-subtitle">
                      {auction.gem?.origin} {auction.gem?.color}
                    </p>

                    {/* Bid and Time */}
                    <div className="auction-metrics-row">
                      <div className="auction-metric">
                        <div className="auction-metric-label">Current Bid</div>
                        <div className="auction-metric-value">
                          {formatCurrency(auction.currentBid)}
                        </div>
                      </div>
                      <div className="auction-metric auction-metric-right">
                        <div className="auction-metric-label">
                          {hasEnded ? 'Ended' : 'Time Left'}
                        </div>
                        <div className={`auction-time-value ${hasEnded ? 'ended' : status}`}>
                          {endingTime}
                        </div>
                      </div>
                    </div>

                    {/* Bid Count */}
                    <div className="auction-bid-count">
                      {auction.bids?.length || 0} bids placed
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        className="bdr-btn-ghost"
                        style={{ flex: 1 }}
                        onClick={() => handleViewDetails(auction)}
                      >
                        <Eye size={14} style={{ display: 'inline', verticalAlign: 'middle' }} />
                        View Details
                      </button>
                      {status === 'ended' && auction.bids?.length > 0 && onContactWinner ? (
                        <button
                          type="button"
                          className="bdr-btn-ghost"
                          style={{ flex: 1 }}
                          onClick={() => {
                            const contact = getAuctionWinnerContact(auction);
                            if (!contact) {
                              handleViewDetails(auction);
                              return;
                            }

                            onContactWinner(
                              {
                                _id: contact._id,
                                name: contact.name,
                                email: contact.email,
                              },
                              {
                                id: auction.gem?._id || '',
                                name: auction.gem?.type || 'Auction gem',
                              }
                            );
                          }}
                        >
                          <Users size={14} style={{ display: 'inline', verticalAlign: 'middle' }} />
                          Contact Buyers
                        </button>
                      ) : status !== 'ended' && (
                        <button
                          type="button"
                          className="bdr-btn-danger"
                          style={{ flex: 1 }}
                          onClick={() => handleDelete(auction)}
                        >
                          <Trash2 size={14} style={{ display: 'inline', verticalAlign: 'middle' }} />
                          Delete
                        </button>
                      )}
                    </div>
                  </article>
                </Col>
              );
            })}
          </Row>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginTop: '32px' }}>
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                style={{
                      border: '1px solid var(--border)',
                      background: 'var(--page-surface)',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  cursor: currentPage === 1 ? 'default' : 'pointer',
                  opacity: currentPage === 1 ? 0.5 : 1
                }}
              >
                <ChevronLeft size={16} />
              </button>
              
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  style={{
                    minWidth: '32px',
                    height: '32px',
                    border: page === currentPage ? 'none' : '1px solid var(--border)',
                    background: page === currentPage ? 'var(--color-primary)' : 'var(--page-surface)',
                    color: page === currentPage ? 'var(--surface-text-on-accent)' : 'var(--text-primary)',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: page === currentPage ? 700 : 500,
                    fontSize: '13px'
                  }}
                >
                  {page}
                </button>
              ))}

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                style={{
                  border: '1px solid var(--border)',
                  background: 'var(--page-surface)',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  cursor: currentPage === totalPages ? 'default' : 'pointer',
                  opacity: currentPage === totalPages ? 0.5 : 1
                }}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}

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
          <p>Are you sure you want to delete this auction? This action cannot be undone.</p>
          {selectedAuction && (
            <div style={{ 
              padding: '12px', 
              background: 'rgba(239,68,68,0.08)', 
              borderRadius: '8px',
              borderLeft: '4px solid var(--danger)'
            }}>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                {selectedAuction.gem?.type}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--danger)' }}>
                Current Bid: {formatCurrency(selectedAuction.currentBid || 0)}
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button className="bdr-btn-ghost" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
          <Button className="bdr-btn-danger" onClick={handleDeleteConfirm}>
            Delete
          </Button>
        </Modal.Footer>
      </Modal>

      {/* View Details Modal */}
      <Modal show={showViewModal} onHide={() => setShowViewModal(false)} centered size="lg">
        <Modal.Header closeButton className="modal-header-gradient">
          <Modal.Title>Auction Details</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          {selectedAuction && (
            <div>
              <Row className="g-4">
                <Col md={4}>
                  <img
                    src={selectedAuction.gem?.images?.[0] || 'https://via.placeholder.com/300'}
                    alt={selectedAuction.gem?.type}
                    style={{ width: '100%', borderRadius: '8px', objectFit: 'cover' }}
                  />
                </Col>
                <Col md={8}>
                  <h5 style={{ fontWeight: 700, marginBottom: '12px' }}>{selectedAuction.gem?.type}</h5>
                  <Row className="g-2" style={{ fontSize: '13px', marginBottom: '16px' }}>
                    <Col xs={6}>
                      <div style={{ color: 'var(--text-secondary)' }}>Start Price</div>
                      <div style={{ fontWeight: 700, fontSize: '16px' }}>
                        {formatCurrency(selectedAuction.startPrice || 0)}
                      </div>
                    </Col>
                    <Col xs={6}>
                      <div style={{ color: 'var(--text-secondary)' }}>Current Bid</div>
                      <div style={{ fontWeight: 700, fontSize: '16px' }}>
                        {formatCurrency(selectedAuction.currentBid || 0)}
                      </div>
                    </Col>
                    <Col xs={6}>
                      <div style={{ color: 'var(--text-secondary)' }}>Min Increment</div>
                      <div style={{ fontWeight: 700, fontSize: '16px' }}>
                        {formatCurrency(selectedAuction.minimumBidIncrement || 0)}
                      </div>
                    </Col>
                    <Col xs={6}>
                      <div style={{ color: 'var(--text-secondary)' }}>Total Bids</div>
                      <div style={{ fontWeight: 700, fontSize: '16px' }}>
                        {selectedAuction.bids?.length || 0}
                      </div>
                    </Col>
                  </Row>

                  {selectedAuction.bids?.length ? (
                    <div style={{ marginTop: '8px' }}>
                      <div
                        style={{
                          color: 'var(--text-secondary)',
                          fontSize: '12px',
                          fontWeight: 600,
                          marginBottom: '8px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                        }}
                      >
                        Bidder History
                      </div>
                      <div style={{ maxHeight: '220px', overflowY: 'auto', paddingRight: '4px' }}>
                        {selectedAuction.bids
                          .slice()
                          .reverse()
                          .map((bid, index) => (
                            <div
                              key={`${bid.bidder?._id || 'bidder'}-${bid.timestamp}-${index}`}
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'flex-start',
                                gap: '12px',
                                padding: '10px 12px',
                                border: '1px solid var(--border)',
                                borderRadius: '10px',
                                marginBottom: '8px',
                                background: '#f8fafc',
                              }}
                            >
                              <div>
                                <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                                  {bid.bidder?.name || 'Unknown bidder'}
                                </div>
                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                  {bid.bidder?.email || 'No email available'}
                                </div>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                                  {formatCurrency(bid.amount)}
                                </div>
                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                  {formatDateTime(bid.timestamp)}
                                </div>
                                {selectedAuction.status === 'ended' && onContactWinner && bid.bidder?._id && bid.bidder.email && (
                                  <Button
                                    variant="link"
                                    className="p-0 mt-1"
                                    style={{ fontSize: '12px', fontWeight: 600, textDecoration: 'none' }}
                                    onClick={() => {
                                      onContactWinner(
                                        {
                                          _id: bid.bidder._id,
                                          name: bid.bidder.name,
                                          email: bid.bidder.email,
                                        },
                                        {
                                          id: selectedAuction.gem?._id || '',
                                          name: selectedAuction.gem?.type || 'Auction gem',
                                        }
                                      );
                                    }}
                                  >
                                    Contact buyer
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  ) : null}

                  <hr />
                  <div style={{ fontSize: '13px' }}>
                    <div style={{ color: 'var(--text-secondary)', marginBottom: '4px' }}>End Time</div>
                    <div style={{ fontWeight: 600 }}>{formatDateTime(selectedAuction.endTime)}</div>
                  </div>

                  {selectedAuction.status === 'ended' && onContactWinner && (
                    <div style={{ marginTop: '16px' }}>
                      <Button
                        className="btn-primary"
                        onClick={() => {
                          const contact = getAuctionWinnerContact(selectedAuction);
                          if (!contact) return;

                          onContactWinner(
                            {
                              _id: contact._id,
                              name: contact.name,
                              email: contact.email,
                            },
                            {
                              id: selectedAuction.gem?._id || '',
                              name: selectedAuction.gem?.type || 'Auction gem',
                            }
                          );
                        }}
                        disabled={!getAuctionWinnerContact(selectedAuction)}
                      >
                        Contact Winner
                      </Button>
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

