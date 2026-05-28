import React, { useEffect, useMemo, useState } from 'react';
import { Row, Col, Card, Button, Form, Modal, InputGroup, Alert } from 'react-bootstrap';
import { Search, Clock, Target, Trophy, ChevronLeft, ChevronRight, TrendingUp } from 'lucide-react';
import type { Auction } from '../../types';
import { buyerAPI, auctionAPI } from '../../api/axios';
import LiveAuctions from './LiveAuctions';

interface BuyerAuctionsPageProps {
  onContactSeller?: (seller: { _id?: string; name: string; email: string; phone?: string }, gemName: string, gemId: string) => void;
}

const ITEMS_PER_PAGE = 6;

const BuyerAuctionsPage: React.FC<BuyerAuctionsPageProps> = ({ onContactSeller }) => {
  const [liveAuctions, setLiveAuctions] = useState<Auction[]>([]);
  const [activeBids, setActiveBids] = useState<Auction[]>([]);
  const [wonAuctions, setWonAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'endDate' | 'startDate' | 'bidAmount'>('endDate');
  const [selectedAuction, setSelectedAuction] = useState<Auction | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'myAuctions' | 'won'>('myAuctions');
  const [currentPage, setCurrentPage] = useState(1);
  const [watchlistIds, setWatchlistIds] = useState<string[]>([]);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const loadWatchlist = (): string[] => {
    try {
      const raw = localStorage.getItem('buyer-watchlist-auction-ids');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  };

  useEffect(() => {
    setWatchlistIds(loadWatchlist());
    void fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      setLoading(true);
      setErrorMessage('');

      const [liveRes, activeRes, wonRes] = await Promise.all([
        auctionAPI.getActiveAuctions(),
        buyerAPI.getActiveBids(),
        buyerAPI.getWonAuctions(),
      ]);

      setLiveAuctions(liveRes.data?.auctions || []);
      // buyerAPI endpoints may return arrays or objects shaped like { activeBids: [...] }
      setActiveBids(activeRes.data?.activeBids || activeRes.data || []);
      setWonAuctions(wonRes.data?.wonAuctions || wonRes.data || []);
    } catch (err) {
      console.error(err);
      setErrorMessage('Failed to load auctions. Please refresh and try again.');
    } finally {
      setLoading(false);
    }
  };

  const saveWatchlist = (ids: string[]) => localStorage.setItem('buyer-watchlist-auction-ids', JSON.stringify(ids));
  const toggleWatchlist = (auctionId: string) => {
    const updated = watchlistIds.includes(auctionId) ? watchlistIds.filter((id) => id !== auctionId) : [...watchlistIds, auctionId];
    setWatchlistIds(updated);
    saveWatchlist(updated);
  };

  const toTimestamp = (v?: string) => (v ? Date.parse(v) : 0);
  const getAuctionStatus = (auction: Auction) => (toTimestamp(auction.endTime) > Date.now() ? 'active' : 'ended');

  const formatRemaining = (endTime: string) => {
    const ms = Date.parse(endTime) - nowMs;
    if (ms <= 0) return 'Ended';
    const d = Math.floor(ms / 86400000);
    const h = Math.floor((ms / 3600000) % 24);
    const m = Math.floor((ms / 60000) % 60);
    const s = Math.floor((ms / 1000) % 60);
    return [d > 0 ? `${d}d` : null, d > 0 || h > 0 ? `${h}h` : null, d > 0 || h > 0 || m > 0 ? `${m}m` : null, `${s}s`].filter(Boolean).join(' ');
  };

  const formatCurrency = (v = 0) => `Rs.${v.toLocaleString()}`;

  const getLeadingBidderName = (auction?: Auction | null) => {
    const latest = auction?.bids?.[auction.bids.length - 1];
    return latest?.bidder?.name || 'No bids yet';
  };

  const isAuctionWinning = (auction: Auction) => {
    // Best-effort: if bids present and last bid has bidder flag 'isMine' or bidder._id === local user id.
    // Fallback: false (can't determine reliably here).
    const last = auction.bids?.[auction.bids.length - 1];
    if (!last) return false;
    // if API marks bids with `isMine`, use it
    // @ts-ignore
    if (last.isMine !== undefined) return Boolean(last.isMine);
    return false;
  };

  const filteredAuctions = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();
    const base = activeTab === 'myAuctions' ? activeBids : wonAuctions;
    const filtered = base.filter((a) => {
      const type = a.gem?.type?.toLowerCase() || '';
      const seller = a.seller?.name?.toLowerCase() || '';
      return !normalized || type.includes(normalized) || seller.includes(normalized) || (a._id || '').toLowerCase().includes(normalized);
    });

    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === 'startDate') return toTimestamp(b.startTime) - toTimestamp(a.startTime);
      if (sortBy === 'bidAmount') return (b.currentBid || 0) - (a.currentBid || 0);
      return toTimestamp(b.endTime) - toTimestamp(a.endTime);
    });

    return sorted;
  }, [activeBids, wonAuctions, activeTab, searchTerm, sortBy]);

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredAuctions.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredAuctions, currentPage]);

  const totalPages = Math.max(1, Math.ceil(filteredAuctions.length / ITEMS_PER_PAGE));

  useEffect(() => setCurrentPage(1), [activeTab, sortBy, searchTerm]);

  const handleViewDetails = (auction: Auction) => {
    setSelectedAuction(auction);
    setShowViewModal(true);
  };

  const handleContactSeller = () => {
    if (selectedAuction && onContactSeller) onContactSeller(selectedAuction.seller, selectedAuction.gem.type, selectedAuction.gem._id);
  };

  return (
    <div>
      <LiveAuctions
        auctions={liveAuctions}
        watchlistIds={watchlistIds}
        nowMs={nowMs}
        onToggleWatchlist={toggleWatchlist}
        onOpenDetails={(id) => {
          const a = liveAuctions.find((x) => x._id === id);
          if (a) handleViewDetails(a);
        }}
        formatCurrency={formatCurrency}
        formatRemaining={formatRemaining}
        getLeadingBidderName={getLeadingBidderName}
      />

      <div style={{ marginTop: 40 }}>
        <div className="d-flex justify-content-between align-items-start mb-4 animate-fade-up">
          <div>
            <p className="dashboard-eyebrow mb-2">Buyer Dashboard</p>
            <h4>My Auctions & Wins</h4>
            <p className="mb-0">Track your active bids and won auctions.</p>
          </div>
        </div>

        <Row className="g-4 mb-4 animate-fade-up delay-1">
          <Col md={6} lg={3}>
            <Card className="stat-card stat-card-approved h-100">
              <Card.Body>
                <div className="d-flex justify-content-between align-items-start">
                  <div>
                    <p className="stat-card-label">Total Participations</p>
                    <h3 style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 0 }}>
                      {activeBids.length + wonAuctions.length}
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
                    <p className="stat-card-label">Active Bids</p>
                    <h3 style={{ fontSize: 28, fontWeight: 700, color: 'var(--success)', marginBottom: 0 }}>{activeBids.length}</h3>
                  </div>
                    <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.08)' }}>
                    <Clock size={24} style={{ color: 'var(--success)' }} />
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>

          <Col md={6} lg={3}>
            <Card className="stat-card stat-card-success h-100">
              <Card.Body>
                <div className="d-flex justify-content-between align-items-start">
                  <div>
                    <p className="stat-card-label">Won Auctions</p>
                    <h3 style={{ fontSize: 28, fontWeight: 700, color: 'var(--warning)', marginBottom: 0 }}>{wonAuctions.length}</h3>
                  </div>
                    <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.08)' }}>
                    <Trophy size={24} style={{ color: 'var(--warning)' }} />
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
                    <p className="stat-card-label">Total Bids Placed</p>
                    <h3 style={{ fontSize: 28, fontWeight: 700, color: 'var(--danger)', marginBottom: 0 }}>
                      {activeBids.reduce((s, a) => s + (a.bids?.length || 0), 0)}
                    </h3>
                  </div>
                  <div className="stat-icon" style={{ background: 'rgba(239, 68, 68, 0.1)' }}>
                    <TrendingUp size={24} style={{ color: '#ef4444' }} />
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        <div className="content-card mb-4 animate-fade-up delay-2">
          <div className="card-body p-4">
            <div style={{ display: 'flex', gap: 32, borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>
              <button onClick={() => setActiveTab('myAuctions')} className={`auctions-tab-btn ${activeTab === 'myAuctions' ? 'active' : ''}`}>
                <TrendingUp size={16} style={{ marginRight: 8, display: 'inline' }} />
                My Active Bids ({activeBids.filter((a) => getAuctionStatus(a) === 'active').length})
              </button>

              <button onClick={() => setActiveTab('won')} className={`auctions-tab-btn ${activeTab === 'won' ? 'active' : ''}`}>
                <Trophy size={16} style={{ marginRight: 8, display: 'inline' }} />
                Won Auctions ({wonAuctions.length})
              </button>
            </div>

            <div style={{ marginTop: 20 }}>
              <Row className="g-3 align-items-end">
                <Col md={6}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>Search Auctions</div>
                  <InputGroup className="input-group-premium">
                    <InputGroup.Text className="bg-white border-end-0"><Search size={18} style={{ color: 'var(--text-secondary)' }} /></InputGroup.Text>
                    <Form.Control placeholder="Search by gem type or seller name..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="border-start-0" />
                  </InputGroup>
                </Col>

                <Col md={3}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Sort By</div>
                  <Form.Select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="surface-muted" style={{ fontSize: 13, fontWeight: 500 }}>
                    <option value="endDate">End Date</option>
                    <option value="startDate">Start Date</option>
                    <option value="bidAmount">Bid Amount</option>
                  </Form.Select>
                </Col>
              </Row>
            </div>
          </div>
        </div>

        {errorMessage && <Alert variant="danger" className="mb-4">{errorMessage}</Alert>}

        {loading ? (
          <Row className="g-4">
            {[1,2,3,4,5,6].map(i => (
              <Col md={6} lg={4} key={i}><div className="skeleton-card skeleton-shimmer" style={{ height: 320 }} /></Col>
            ))}
          </Row>
        ) : paginated.length === 0 ? (
          <div className="dashboard-empty-inline mt-5">{filteredAuctions.length === 0 ? `No ${activeTab === 'myAuctions' ? 'active bids' : 'won auctions'} found.` : 'No results matching your filters.'}</div>
        ) : (
          <>
            <Row className="g-4 mb-4">
              {paginated.map((auction) => {
                const status = getAuctionStatus(auction);
                const lotNumber = auction._id.slice(-4).toUpperCase();
                const gemImage = auction.gem?.images?.[0] || 'https://via.placeholder.com/460x280';
                const endingTime = formatRemaining(auction.endTime);
                const hasEnded = Date.parse(auction.endTime) <= Date.now();
                const isWinning = isAuctionWinning(auction);

                return (
                  <Col md={6} lg={4} key={auction._id}>
                    <article className="market-card">
                      <div style={{ position: 'relative', marginBottom: 12 }}>
                        <img className="market-image" src={gemImage} alt={auction.gem?.type} style={{ width: '100%', height: 200, objectFit: 'cover', backgroundColor: 'var(--page-surface-muted)', borderRadius: 8 }} />
                          <div style={{ position: 'absolute', top: 10, left: 10, backgroundColor: 'var(--badge-bg)', color: 'var(--surface-text-on-accent)', padding: '4px 10px', borderRadius: 4, fontSize: 12, fontWeight: 600 }}>Lot #{lotNumber}</div>
                          <div style={{ position: 'absolute', top: 10, right: 10, backgroundColor: activeTab === 'won' ? 'var(--success)' : isWinning ? 'var(--success)' : status === 'active' ? 'var(--warning)' : 'var(--danger)', color: 'var(--surface-text-on-accent)', padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, textTransform: 'capitalize' }}>{activeTab === 'won' ? 'Won' : isWinning ? 'Winning' : status === 'active' ? 'Bidding' : 'Outbid'}</div>
                      </div>

                      <h6 style={{ fontWeight: 700, fontSize: 15, margin: '0 0 4px 0', color: 'var(--text-primary)' }}>{auction.gem?.type}</h6>
                      <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 8px 0' }}>Seller: {auction.seller?.name || 'Unknown'}</p>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <div>
                          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>Current Bid</div>
                          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{formatCurrency(auction.currentBid || 0)}</div>
                        </div>
                        {activeTab === 'myAuctions' && (
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4 }}>{hasEnded ? 'Ended' : 'Time Left'}</div>
                            <div style={{ fontSize: 16, fontWeight: 700, color: hasEnded ? 'var(--danger)' : 'var(--success)' }}>{endingTime}</div>
                          </div>
                        )}
                      </div>

                      <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>{auction.bids?.length || 0} bids placed</div>

                      <div style={{ display: 'flex', gap: 8 }}>
                        <Button className="bdr-btn-primary" style={{ flex: 1, fontSize: 13, padding: 8 }} onClick={() => handleViewDetails(auction)}>{activeTab === 'won' ? 'Contact Seller' : 'View Details'}</Button>
                      </div>
                    </article>
                  </Col>
                );
              })}
            </Row>

            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 32 }}>
                <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} style={{ border: '1px solid var(--border)', background: 'var(--page-surface)', padding: '8px 12px', borderRadius: 6, cursor: currentPage === 1 ? 'default' : 'pointer', opacity: currentPage === 1 ? 0.5 : 1 }}><ChevronLeft size={16} /></button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button key={page} onClick={() => setCurrentPage(page)} style={{ minWidth: 32, height: 32, border: page === currentPage ? 'none' : '1px solid var(--border)', background: page === currentPage ? 'var(--color-primary)' : 'var(--page-surface)', color: page === currentPage ? 'var(--surface-text-on-accent)' : 'var(--text-primary)', borderRadius: 6, cursor: 'pointer', fontWeight: page === currentPage ? 700 : 500, fontSize: 13 }}>{page}</button>
                ))}
                <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} style={{ border: '1px solid var(--border)', background: 'var(--page-surface)', padding: '8px 12px', borderRadius: 6, cursor: currentPage === totalPages ? 'default' : 'pointer', opacity: currentPage === totalPages ? 0.5 : 1 }}><ChevronRight size={16} /></button>
              </div>
            )}
          </>
        )}

        <Modal show={showViewModal} onHide={() => setShowViewModal(false)} centered size="lg">
          <Modal.Header closeButton className="modal-header-gradient">
            <Modal.Title>{activeTab === 'won' ? 'Won Auction Details' : 'Auction Details'}</Modal.Title>
          </Modal.Header>
          <Modal.Body className="p-4">
            {selectedAuction && (
              <div>
                <Row className="g-4">
                  <Col md={4}>
                    <img src={selectedAuction.gem?.images?.[0] || 'https://via.placeholder.com/300'} alt={selectedAuction.gem?.type} style={{ width: '100%', borderRadius: 8, objectFit: 'cover' }} />
                  </Col>
                  <Col md={8}>
                    <h5 style={{ fontWeight: 700, marginBottom: 12 }}>{selectedAuction.gem?.type}</h5>
                    <Row className="g-2" style={{ fontSize: 13, marginBottom: 16 }}>
                      <Col xs={6}><div style={{ color: '#7c8aa3' }}>Start Price</div><div style={{ fontWeight: 700, fontSize: 16 }}>{formatCurrency(selectedAuction.startPrice || 0)}</div></Col>
                      <Col xs={6}><div style={{ color: '#7c8aa3' }}>Winning Bid</div><div style={{ fontWeight: 700, fontSize: 16 }}>{formatCurrency(selectedAuction.currentBid || 0)}</div></Col>
                      <Col xs={6}><div style={{ color: '#7c8aa3' }}>Seller</div><div style={{ fontWeight: 700, fontSize: 14 }}>{selectedAuction.seller?.name}</div></Col>
                      <Col xs={6}><div style={{ color: '#7c8aa3' }}>Total Bids</div><div style={{ fontWeight: 700, fontSize: 16 }}>{selectedAuction.bids?.length || 0}</div></Col>
                    </Row>
                    <hr />
                    <div style={{ fontSize: 13 }}>
                      <div style={{ color: '#7c8aa3', marginBottom: 4 }}>{activeTab === 'won' ? 'Ended' : 'End'} Time</div>
                      <div style={{ fontWeight: 600 }}>{new Date(selectedAuction.endTime).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                  </Col>
                </Row>
              </div>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowViewModal(false)}>Close</Button>
            {activeTab === 'won' && <Button className="btn-primary" onClick={handleContactSeller}>Contact Seller</Button>}
          </Modal.Footer>
        </Modal>
      </div>
    </div>
  );
};

export default BuyerAuctionsPage;
