import { useEffect, useState } from 'react';
import { Card, Table, Button, Modal } from 'react-bootstrap';
import { TrendingUp, Gavel, AlertCircle, Package, Users, CheckCircle } from 'lucide-react';
import { adminAPI, auctionAPI } from '../../api/axios';
import type { DashboardStats } from '../../types/admin';

import '../../styles/admin.css';

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
  paymentStatus?: string;
  paymentConfirmed?: boolean;
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

const isAwaitingAdminApproval = (auction: Auction) =>
  auction.status?.toLowerCase() === 'pending_payment' &&
  (auction.paymentStatus === 'completed' || auction.paymentConfirmed);

const isPendingAuction = (auction: Auction) => auction.status?.toLowerCase() === 'pending_payment';

const AuctionManagement = () => {
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalGems: 0,
    pendingGems: 0,
    approvedGems: 0,
    totalAuctions: 0,
    activeAuctions: 0,
    totalRevenue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [selectedAuction, setSelectedAuction] = useState<Auction | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    void fetchAuctions();
    void fetchStatistics();
  }, []);

  const fetchAuctions = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getAllAuctions();
      setAuctions(response.data.auctions);
    } catch (error) {
      console.error('Error fetching auctions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewAuction = async (auction: Auction) => {
    setShowDetailsModal(true);

    try {
      const response = await auctionAPI.getAuctionById(auction._id);
      setSelectedAuction(response.data.auction);
    } catch (error) {
      console.error('Error fetching auction details:', error);
      setSelectedAuction(auction);
    }
  };

  const handleApproveAuction = async (auction: Auction) => {
    try {
      await auctionAPI.updateAuctionStatus(auction._id, { status: 'active' });
      await fetchAuctions();
    } catch (error) {
      console.error('Error approving auction:', error);
    }
  };

  const getStatusBadge = (auction: Auction) => {
    const status = auction.status?.toLowerCase();

    if (status === 'active') return <span className="auction-status-badge active">Live</span>;
    if (isAwaitingAdminApproval(auction)) return <span className="auction-status-badge ending-soon">Awaiting admin approval</span>;
    if (status === 'pending_payment') return <span className="auction-status-badge ending-soon">Payment pending</span>;
    if (status === 'ended') return <span className="auction-status-badge ended">Ended</span>;
    if (status === 'cancelled') return <span className="auction-status-badge ended">Cancelled</span>;

    return <span className="auction-status-badge">{auction.status || 'Unknown'}</span>;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: number) => `Rs.${amount.toLocaleString()}`;

  const formatCompactNumber = (value?: number | null) => {
    if (value === undefined || value === null || Number.isNaN(Number(value))) return '0';
    try {
      return Number(value).toLocaleString();
    } catch {
      return String(value);
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await adminAPI.getStatistics();
      setStats(response.data.statistics);
    } catch (error) {
      console.error('Error fetching statistics:', error);
    }
  };

  const summaryCards = [
    // Placeholder values — replaced below by auction-derived metrics in render
    { label: 'Pending Verification', value: stats.pendingGems, subtitle: 'awaiting review', icon: AlertCircle, tone: 'amber' },
    { label: 'Active Listings', value: stats.activeAuctions, subtitle: 'live on market', icon: Package, tone: 'teal' },
    { label: 'Auctions Ending Today', value: 0, subtitle: 'ending today', icon: Gavel, tone: 'indigo' },
    { label: 'Total Active Bids', value: 0, subtitle: 'aggregate bids', icon: TrendingUp, tone: 'rose' },
  ];

  return (
    <div>
      <section className="dashboard-hero admin-dashboard-hero animate-fade-up">
        <div>
          <p className="dashboard-eyebrow">Auctions</p>
          <h4>Auction Management</h4>
          <p>Overview of active listings and platform auction metrics.</p>
        </div>

        <div className="dashboard-chip-stack">
          <span className="dashboard-chip">{formatCompactNumber(stats.totalGems)} total listings</span>
          <span className="dashboard-chip dashboard-chip-soft">{formatCompactNumber(stats.activeAuctions)} active auctions</span>
        </div>
      </section>

      <section className="admin-stat-grid auction-stat-grid animate-fade-up" aria-label="Auction overview metrics">
        {(() => {
          const now = new Date();
          const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

          const auctionsEnding24h = auctions.filter(a => {
            try {
              const end = new Date(a.endTime);
              return end >= now && end <= in24h;
            } catch {
              return false;
            }
          }).length;

          const currentBidSum = auctions.reduce((sum, a) => sum + (Number(a.currentBid) || 0), 0);
          const avgBid = auctions.length > 0 ? Math.round(currentBidSum / auctions.length) : 0;

          const revenuePerAuction = stats.totalAuctions > 0 ? Math.round((stats.totalRevenue || 0) / Math.max(1, stats.totalAuctions)) : Math.round(currentBidSum / Math.max(1, auctions.length));

          const cards = [
            { label: 'Auctions Ending (24h)', value: auctionsEnding24h, subtitle: 'ending within 24 hours', icon: Gavel, tone: 'amber' },
            { label: 'Average Bid', value: avgBid, subtitle: 'average current bid', icon: TrendingUp, tone: 'teal', isCurrency: true },
            { label: 'Revenue per Auction', value: revenuePerAuction, subtitle: 'avg revenue / auction', icon: Package, tone: 'indigo', isCurrency: true },
            { label: 'Pending Verification', value: stats.pendingGems, subtitle: 'awaiting review', icon: AlertCircle, tone: 'rose' },
          ];

          return cards.map((card) => {
            const Icon = card.icon as any;
            return (
              <article key={card.label} className={`stat-card stat-card-${card.tone} h-100`}>
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start mb-3">
                    <div>
                      <p className="text-muted mb-2 small">{card.label}</p>
                      <h3 className="mb-0">{card.isCurrency ? formatCurrency(Number(card.value)) : formatCompactNumber(card.value)}</h3>
                      <small className="text-muted">{card.subtitle}</small>
                    </div>
                    <div className="stat-icon" style={{ background: 'rgba(47, 109, 225, 0.08)' }}>
                      <Icon size={20} style={{ color: 'var(--color-bright)' }} />
                    </div>
                  </div>
                </div>
              </article>
            );
          });
        })()}
      </section>

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
              <h5>No Auctions Found</h5>
              <p className="text-muted">There are currently no auctions on the platform</p>
            </div>
          ) : (
            <div className="table-responsive auction-table-wrap">
              <Table hover className="align-middle surface-table auction-table">
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
                            style={{ width: '50px', height: '50px', overflow: 'hidden' }}
                          >
                            <img
                              src={auction.gem.images?.[0] || 'https://via.placeholder.com/50'}
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
                      <td>{getStatusBadge(auction)}</td>
                      <td className="text-center">
                        <div className="d-flex justify-content-center gap-2 flex-wrap">
                          <Button
                            variant="outline-primary"
                            size="sm"
                            type="button"
                            className="auction-action-button ghost"
                            onClick={() => void handleViewAuction(auction)}
                          >
                            Verification Review
                          </Button>
                          {isPendingAuction(auction) && (
                            <Button
                              variant="success"
                              size="sm"
                              type="button"
                              className="auction-action-button confirm"
                              onClick={() => handleApproveAuction(auction)}
                            >
                              Confirm Auction
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Card.Body>
      </Card>

      <Modal show={showDetailsModal} onHide={() => setShowDetailsModal(false)} size="lg" centered className="auction-details-modal">
        <Modal.Header closeButton>
          <Modal.Title>Auction Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedAuction && (
            <div>
              <div className="d-flex gap-4 mb-4 flex-wrap flex-md-nowrap">
                <img
                  src={selectedAuction.gem.images?.[0] || 'https://via.placeholder.com/200'}
                  alt={selectedAuction.gem.type}
                  style={{ width: '200px', height: '200px', objectFit: 'cover' }}
                  className="rounded"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = 'https://via.placeholder.com/200';
                  }}
                />
                <div style={{ flexGrow: 1, minWidth: 0 }}>
                  <h5 className="mb-3">{selectedAuction.gem.type}</h5>
                  <div className="mb-2"><strong>Seller:</strong> {selectedAuction.seller.name}</div>
                  <div className="mb-2"><strong>Start Price:</strong> {formatCurrency(selectedAuction.startPrice)}</div>
                  <div className="mb-2">
                    <strong>Current Bid:</strong>
                    <span className="text-success fw-bold ms-2">{formatCurrency(selectedAuction.currentBid)}</span>
                  </div>
                  <div className="mb-2"><strong>Status:</strong> {getStatusBadge(selectedAuction)}</div>
                  <div className="mb-2">
                    <strong>Payment:</strong>{' '}
                    {isAwaitingAdminApproval(selectedAuction) ? (
                      <span className="auction-status-badge ending-soon small">Awaiting admin approval</span>
                    ) : selectedAuction.paymentStatus === 'completed' || selectedAuction.paymentConfirmed ? (
                      <span className="auction-status-badge active">Paid</span>
                    ) : (
                      <span className="auction-status-badge ending-soon small">Payment pending</span>
                    )}
                  </div>
                  <div className="mb-2"><strong>Ends:</strong> {formatDate(selectedAuction.endTime)}</div>
                  <div className="mb-2"><strong>Total Bids:</strong> {selectedAuction.bids.length}</div>
                </div>
              </div>

              <hr />

              <div className="auction-history-section">
                <div className="auction-history-header">
                  <h6 className="fw-bold mb-0">Bid History ({selectedAuction.bids.length})</h6>
                  <span className="auction-history-summary">Latest bid listed first in the table below</span>
                </div>

                {selectedAuction.bids.length === 0 ? (
                  <div className="auction-history-empty text-center py-4">
                    <p className="mb-0">No bids placed yet</p>
                  </div>
                ) : (
                  <div className="auction-history-list" role="list" aria-label="Bid history">
                    {selectedAuction.bids.map((bid, index) => (
                      <article key={`${bid.timestamp}-${index}`} className="auction-history-item" role="listitem">
                        <div className="auction-history-bidder">
                          <div className="auction-history-bidder-name">{bid.bidder.name}</div>
                          <div className="auction-history-bidder-email">{bid.bidder.email}</div>
                        </div>
                        <div className="auction-history-amount">{formatCurrency(bid.amount)}</div>
                        <div className="auction-history-time">{formatDate(bid.timestamp)}</div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          {selectedAuction && isPendingAuction(selectedAuction) && (
            <Button
              variant="success"
              type="button"
              className="auction-action-button confirm"
              onClick={() => {
                void handleApproveAuction(selectedAuction);
                setShowDetailsModal(false);
                setSelectedAuction(null);
              }}
            >
              Confirm Auction
            </Button>
          )}
          <Button variant="secondary" type="button" onClick={() => setShowDetailsModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default AuctionManagement;
