import React, { useEffect, useMemo, useState } from 'react';
import { Row, Col, Card, Button, Form, Modal, InputGroup, Alert } from 'react-bootstrap';
import { Search, Clock, Target, Trophy, ChevronLeft, ChevronRight, TrendingUp, LogOut, Moon, Sun } from 'lucide-react';
import type { Auction } from '../../types';
import { buyerAPI, auctionAPI } from '../../api/axios';
import LiveAuctions from './LiveAuctions';
import logo from '../../assets/logo.png';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useChatStore } from '../../store/chatStore';

interface BuyerAuctionsPageProps {
  onContactSeller?: (seller: { _id?: string; name: string; email: string; phone?: string }, gemName: string, gemId: string) => void;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

const ITEMS_PER_PAGE = 6;
type SidebarSection = 'overview' | 'live' | 'myAuctions' | 'won';

const BuyerAuctionsPage: React.FC<BuyerAuctionsPageProps> = ({ onContactSeller, theme, onToggleTheme }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const unreadCount = useChatStore((state) => state.unreadCount);
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
  const [activeSection, setActiveSection] = useState<SidebarSection>('overview');

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
      setActiveBids(activeRes.data?.activeBids || activeRes.data || []);
      setWonAuctions(wonRes.data?.wonAuctions || wonRes.data || []);
    } catch (err) {
      console.error(err);
      setErrorMessage('Failed to load auctions. Please refresh and try again.');
    } finally {
      setLoading(false);
    }
  };

  const saveWatchlist = (ids: string[]) =>
    localStorage.setItem('buyer-watchlist-auction-ids', JSON.stringify(ids));

  const toggleWatchlist = (auctionId: string) => {
    const updated = watchlistIds.includes(auctionId)
      ? watchlistIds.filter((id) => id !== auctionId)
      : [...watchlistIds, auctionId];
    setWatchlistIds(updated);
    saveWatchlist(updated);
  };

  const toTimestamp = (v?: string) => (v ? Date.parse(v) : 0);
  const getAuctionStatus = (auction: Auction) =>
    toTimestamp(auction.endTime) > Date.now() ? 'active' : 'ended';

  const formatRemaining = (endTime: string) => {
    const ms = Date.parse(endTime) - nowMs;
    if (ms <= 0) return 'Ended';
    const d = Math.floor(ms / 86400000);
    const h = Math.floor((ms / 3600000) % 24);
    const m = Math.floor((ms / 60000) % 60);
    const s = Math.floor((ms / 1000) % 60);
    return [
      d > 0 ? `${d}d` : null,
      d > 0 || h > 0 ? `${h}h` : null,
      d > 0 || h > 0 || m > 0 ? `${m}m` : null,
      `${s}s`,
    ]
      .filter(Boolean)
      .join(' ');
  };

  const formatCurrency = (v = 0) => `Rs.${v.toLocaleString()}`;

  const getLeadingBidderName = (auction?: Auction | null) => {
    const latest = auction?.bids?.[auction.bids.length - 1];
    return latest?.bidder?.name || 'No bids yet';
  };

  const isAuctionWinning = (auction: Auction) => {
    const last = auction.bids?.[auction.bids.length - 1];
    if (!last) return false;
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
      return (
        !normalized ||
        type.includes(normalized) ||
        seller.includes(normalized) ||
        (a._id || '').toLowerCase().includes(normalized)
      );
    });
    return [...filtered].sort((a, b) => {
      if (sortBy === 'startDate') return toTimestamp(b.startTime) - toTimestamp(a.startTime);
      if (sortBy === 'bidAmount') return (b.currentBid || 0) - (a.currentBid || 0);
      return toTimestamp(b.endTime) - toTimestamp(a.endTime);
    });
  }, [activeBids, wonAuctions, activeTab, searchTerm, sortBy]);

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredAuctions.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredAuctions, currentPage]);

  const totalPages = Math.max(1, Math.ceil(filteredAuctions.length / ITEMS_PER_PAGE));

  useEffect(() => setCurrentPage(1), [activeTab, sortBy, searchTerm]);

  const handleSignOut = () => {
    logout();
    navigate('/login');
  };

  const scrollToSection = (section: SidebarSection) => {
    setActiveSection(section);
    if (section === 'myAuctions') setActiveTab('myAuctions');
    if (section === 'won') setActiveTab('won');
    const targetId =
      section === 'overview'
        ? 'buyer-auctions-overview'
        : section === 'live'
        ? 'buyer-live-auctions'
        : 'buyer-auctions-summary';
    document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleViewDetails = (auction: Auction) => {
    setSelectedAuction(auction);
    setShowViewModal(true);
  };

  const handleContactSeller = () => {
    if (selectedAuction && onContactSeller)
      onContactSeller(selectedAuction.seller, selectedAuction.gem.type, selectedAuction.gem._id);
  };

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase()
    : 'B';
  const latestWin = wonAuctions[0] || null;

  /* ─────────────────────────────────────────────────────────────── */
  /* Inline auction card (used in the paginated grid below)          */
  /* ─────────────────────────────────────────────────────────────── */
  const renderAuctionCard = (auction: Auction) => {
    const status = getAuctionStatus(auction);
    const lotNumber = auction._id.slice(-4).toUpperCase();
    const gemImage = auction.gem?.images?.[0] || 'https://via.placeholder.com/460x280';
    const hasEnded = Date.parse(auction.endTime) <= Date.now();
    const isWinning = isAuctionWinning(auction);

    const statusLabel =
      activeTab === 'won'
        ? 'Won'
        : isWinning
        ? 'Winning'
        : status === 'active'
        ? 'Bidding'
        : 'Outbid';

    const statusColor =
      activeTab === 'won' || isWinning
        ? 'var(--success, #10b981)'
        : status === 'active'
        ? 'var(--warning, #f59e0b)'
        : 'var(--danger, #ef4444)';

    return (
      <article
        key={auction._id}
        className="market-card"
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          borderRadius: '12px',
          overflow: 'hidden',
          backgroundColor: 'var(--surface, #fff)',
          boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
        }}
      >
        {/* Image */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <img
            src={gemImage}
            alt={auction.gem?.type}
            style={{
              width: '100%',
              height: '200px',
              objectFit: 'cover',
              display: 'block',
              backgroundColor: 'var(--page-surface-muted)',
            }}
          />
          {/* Lot badge */}
          <div style={{
            position: 'absolute', top: 10, left: 10,
            backgroundColor: 'var(--badge-bg, #1a202c)',
            color: 'var(--surface-text-on-accent, #fff)',
            padding: '4px 10px', borderRadius: '4px',
            fontSize: '12px', fontWeight: 600,
          }}>
            Lot #{lotNumber}
          </div>
          {/* Status badge */}
          <div style={{
            position: 'absolute', top: 10, right: 10,
            backgroundColor: statusColor,
            color: 'var(--surface-text-on-accent, #fff)',
            padding: '5px 12px', borderRadius: '20px',
            fontSize: '12px', fontWeight: 600,
          }}>
            {statusLabel}
          </div>
        </div>

        {/* Body */}
        <div style={{
          padding: '14px 16px 16px',
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          gap: '8px',
        }}>
          <h6 style={{ fontWeight: 700, fontSize: '15px', margin: 0, color: 'var(--text-primary)' }}>
            {auction.gem?.type}
          </h6>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
            Seller: {auction.seller?.name || 'Unknown'}
          </p>

          {/* Bid + time row */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: activeTab === 'myAuctions' ? '1fr 1fr' : '1fr',
            gap: '8px',
            padding: '10px',
            borderRadius: '8px',
            backgroundColor: 'var(--page-surface-muted, #f8f9fa)',
          }}>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '3px' }}>
                Current Bid
              </div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {formatCurrency(auction.currentBid || 0)}
              </div>
            </div>
            {activeTab === 'myAuctions' && (
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '3px' }}>
                  {hasEnded ? 'Ended' : 'Time Left'}
                </div>
                <div style={{
                  fontSize: '14px', fontWeight: 700,
                  color: hasEnded ? 'var(--danger, #ef4444)' : 'var(--success, #10b981)',
                }}>
                  {formatRemaining(auction.endTime)}
                </div>
              </div>
            )}
          </div>

          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
            {auction.bids?.length || 0} bids placed
          </p>

          {/* Button pushed to bottom */}
          <div style={{ marginTop: 'auto', paddingTop: '4px' }}>
            <Button
              className="bdr-btn-primary"
              style={{ width: '100%', fontSize: '13px', padding: '8px' }}
              onClick={() => handleViewDetails(auction)}
            >
              {activeTab === 'won' ? 'Contact Seller' : 'View Details'}
            </Button>
          </div>
        </div>
      </article>
    );
  };

  return (
    <div className="bdr-shell">
      {/* ── Navbar ── */}
      <header className="bdr-navbar">
        <div className="bdr-navbar-inner">
          <button type="button" className="bdr-navbar-brand" onClick={() => scrollToSection('overview')}>
            <img src={logo} alt="GemFolio" className="bdr-navbar-logo" />
            <span>GemFolio</span>
          </button>
          <div className="bdr-navbar-actions">
            <div className="bdr-navbar-user">
              <span className="bdr-navbar-avatar">{initials}</span>
              <span>{user?.name?.split(' ')[0] || 'Buyer'}</span>
            </div>
            {onToggleTheme && (
              <button
                type="button"
                className="seller-navbar-theme-toggle"
                onClick={onToggleTheme}
                aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              >
                {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
                <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="bdr-content-wrapper">
        {/* ── Sidebar ── */}
        <aside className="bdr-sidebar">
          <div className="sidebar-profile-section">
            <div className="sidebar-profile-card">
              <div className="sidebar-profile-avatar-container">
                <div className="sidebar-profile-avatar">
                  <div className="sidebar-profile-avatar-inner">{initials}</div>
                </div>
              </div>
              <div className="sidebar-profile-info">
                <div className="sidebar-profile-name" title={user?.name || ''}>
                  {user?.name || 'Buyer account'}
                </div>
                <div className="sidebar-profile-role-badge">Verified Buyer</div>
              </div>
            </div>
          </div>

          <nav className="sidebar-nav" aria-label="Buyer navigation">
            {(
              [
                { key: 'overview', icon: <TrendingUp size={16} />, label: 'Overview' },
                { key: 'live', icon: <Clock size={16} />, label: 'Live Auctions' },
                { key: 'myAuctions', icon: <Target size={16} />, label: 'My Auctions' },
                { key: 'won', icon: <Trophy size={16} />, label: 'Won Auctions' },
              ] as { key: SidebarSection; icon: React.ReactNode; label: string }[]
            ).map(({ key, icon, label }) => (
              <button
                key={key}
                type="button"
                className={`sidebar-nav-link ${activeSection === key ? 'active' : ''}`}
                onClick={() => scrollToSection(key)}
              >
                {icon}
                <span>{label}</span>
              </button>
            ))}
          </nav>

          <div className="sidebar-button-group">
            <button type="button" className="bdr-signout-btn" onClick={handleSignOut}>
              <LogOut size={15} /> Sign Out
            </button>
            {unreadCount > 0 && (
              <div className="bdr-unread-badge" style={{ alignSelf: 'flex-start' }}>
                {unreadCount > 99 ? '99+' : unreadCount} unread messages
              </div>
            )}
          </div>
        </aside>

        {/* ── Main ── */}
        <main className="bdr-main">
          {/* Live Auctions section */}
          <div id="buyer-live-auctions">
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
          </div>

          {/* ── Overview / dashboard ── */}
          <div id="buyer-auctions-overview" style={{ marginTop: 40 }}>
            {/* Header */}
            <div className="d-flex justify-content-between align-items-start mb-4 animate-fade-up">
              <div>
                <p className="dashboard-eyebrow mb-2">Buyer Dashboard</p>
                <h4>My Auctions &amp; Wins</h4>
                <p className="mb-0">Track your active bids and won auctions.</p>
              </div>
            </div>

            {/* Latest-win highlight panel */}
            {activeTab === 'won' && latestWin && (
              <div className="content-card winning-panel mb-4 animate-fade-up delay-1">
                <div className="card-body p-0" style={{ display: 'flex', gap: 24 }}>
                  <div style={{ flex: '0 0 44%', maxWidth: '44%' }}>
                    <img
                      src={latestWin.gem?.images?.[0] || 'https://via.placeholder.com/600x600'}
                      alt={latestWin.gem?.type}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 12, display: 'block' }}
                    />
                  </div>
                  <div style={{ flex: 1, padding: 24 }}>
                    <h2 style={{ marginTop: 0, marginBottom: 8, fontSize: 28, fontWeight: 800 }}>
                      Congratulations, {user?.name?.split(' ')[0]}!
                    </h2>
                    <p style={{ marginTop: 0, marginBottom: 18, color: 'var(--text-secondary)' }}>
                      You are the provisional winner of the auction for the "
                      <strong>{latestWin.gem?.type}</strong>".
                    </p>
                    <div style={{ marginBottom: 20 }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-secondary)', marginBottom: 6 }}>
                        WINNING BID
                      </div>
                      <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--color-primary)', marginBottom: 12 }}>
                        {formatCurrency(latestWin.currentBid || 0)}
                      </div>
                      <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '12px 0 18px' }} />
                      <div className="winning-cta" style={{ marginBottom: 18 }}>
                        <Button
                          variant="outline-primary"
                          className="w-100"
                          onClick={() =>
                            onContactSeller?.(latestWin.seller, latestWin.gem.type, latestWin.gem._id)
                          }
                        >
                          Reveal Seller's Contact Info
                        </Button>
                      </div>
                    </div>
                    <div className="winning-specs" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      {[
                        ['CARAT WEIGHT', latestWin.gem?.carat ?? '—'],
                        ['CUT', latestWin.gem?.cut || '—'],
                        ['COLOR', latestWin.gem?.color || '—'],
                        ['CLARITY', latestWin.gem?.clarity || '—'],
                      ].map(([label, val]) => (
                        <div key={label}>
                          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 6 }}>{label}</div>
                          <div style={{ fontWeight: 700 }}>{val}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Stat cards */}
            <Row className="g-4 mb-4 animate-fade-up delay-1">
              {[
                {
                  label: 'Total Participations',
                  value: activeBids.length + wonAuctions.length,
                  icon: <Target size={24} style={{ color: 'var(--color-primary)' }} />,
                  iconBg: 'rgba(31,79,130,0.1)',
                  cls: 'stat-card-approved',
                  valueColor: 'var(--text-primary)',
                },
                {
                  label: 'Active Bids',
                  value: activeBids.length,
                  icon: <Clock size={24} style={{ color: 'var(--success)' }} />,
                  iconBg: 'rgba(16,185,129,0.08)',
                  cls: 'stat-card-pending',
                  valueColor: 'var(--success)',
                },
                {
                  label: 'Won Auctions',
                  value: wonAuctions.length,
                  icon: <Trophy size={24} style={{ color: 'var(--warning)' }} />,
                  iconBg: 'rgba(245,158,11,0.08)',
                  cls: 'stat-card-success',
                  valueColor: 'var(--warning)',
                },
                {
                  label: 'Total Bids Placed',
                  value: activeBids.reduce((s, a) => s + (a.bids?.length || 0), 0),
                  icon: <TrendingUp size={24} style={{ color: '#ef4444' }} />,
                  iconBg: 'rgba(239,68,68,0.1)',
                  cls: 'stat-card-approved',
                  valueColor: 'var(--danger)',
                },
              ].map(({ label, value, icon, iconBg, cls, valueColor }) => (
                <Col md={6} lg={3} key={label}>
                  <Card className={`stat-card ${cls} h-100`}>
                    <Card.Body>
                      <div className="d-flex justify-content-between align-items-start">
                        <div>
                          <p className="stat-card-label">{label}</p>
                          <h3 style={{ fontSize: 28, fontWeight: 700, color: valueColor, marginBottom: 0 }}>
                            {value}
                          </h3>
                        </div>
                        <div className="stat-icon" style={{ background: iconBg }}>{icon}</div>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>

            {/* Tab + filter bar */}
            <div className="content-card mb-4 animate-fade-up delay-2" id="buyer-auctions-summary">
              <div className="card-body p-4">
                {/* Tabs */}
                <div style={{ display: 'flex', gap: 32, borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>
                  <button
                    onClick={() => setActiveTab('myAuctions')}
                    className={`auctions-tab-btn ${activeTab === 'myAuctions' ? 'active' : ''}`}
                  >
                    <TrendingUp size={16} style={{ marginRight: 8, display: 'inline' }} />
                    My Active Bids ({activeBids.filter((a) => getAuctionStatus(a) === 'active').length})
                  </button>
                  <button
                    onClick={() => setActiveTab('won')}
                    className={`auctions-tab-btn ${activeTab === 'won' ? 'active' : ''}`}
                  >
                    <Trophy size={16} style={{ marginRight: 8, display: 'inline' }} />
                    Won Auctions ({wonAuctions.length})
                  </button>
                </div>

                {/* Filters */}
                <div style={{ marginTop: 20 }}>
                  <Row className="g-3 align-items-end">
                    <Col md={6}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
                        Search Auctions
                      </div>
                      <InputGroup className="input-group-premium">
                        <InputGroup.Text className="bg-white border-end-0">
                          <Search size={18} style={{ color: 'var(--text-secondary)' }} />
                        </InputGroup.Text>
                        <Form.Control
                          placeholder="Search by gem type or seller name..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="border-start-0"
                        />
                      </InputGroup>
                    </Col>
                    <Col md={3}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Sort By
                      </div>
                      <Form.Select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="surface-muted"
                        style={{ fontSize: 13, fontWeight: 500 }}
                      >
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

            {/* Cards grid */}
            {loading ? (
              <Row className="g-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Col md={6} lg={4} key={i}>
                    <div className="skeleton-card skeleton-shimmer" style={{ height: 340 }} />
                  </Col>
                ))}
              </Row>
            ) : paginated.length === 0 ? (
              <div className="dashboard-empty-inline mt-5">
                {filteredAuctions.length === 0
                  ? `No ${activeTab === 'myAuctions' ? 'active bids' : 'won auctions'} found.`
                  : 'No results matching your filters.'}
              </div>
            ) : (
              <>
                {/* KEY FIX: align-items-stretch so all cards in a row have equal height */}
                <Row className="g-4 mb-4" style={{ alignItems: 'stretch' }}>
                  {paginated.map((auction) => (
                    <Col md={6} lg={4} key={auction._id} style={{ display: 'flex' }}>
                      {renderAuctionCard(auction)}
                    </Col>
                  ))}
                </Row>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 32 }}>
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      style={{ border: '1px solid var(--border)', background: 'var(--page-surface)', padding: '8px 12px', borderRadius: 6, cursor: currentPage === 1 ? 'default' : 'pointer', opacity: currentPage === 1 ? 0.5 : 1 }}
                    >
                      <ChevronLeft size={16} />
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        style={{ minWidth: 32, height: 32, border: page === currentPage ? 'none' : '1px solid var(--border)', background: page === currentPage ? 'var(--color-primary)' : 'var(--page-surface)', color: page === currentPage ? 'var(--surface-text-on-accent)' : 'var(--text-primary)', borderRadius: 6, cursor: 'pointer', fontWeight: page === currentPage ? 700 : 500, fontSize: 13 }}
                      >
                        {page}
                      </button>
                    ))}
                    <button
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      style={{ border: '1px solid var(--border)', background: 'var(--page-surface)', padding: '8px 12px', borderRadius: 6, cursor: currentPage === totalPages ? 'default' : 'pointer', opacity: currentPage === totalPages ? 0.5 : 1 }}
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* ── View Details Modal ── */}
          <Modal show={showViewModal} onHide={() => setShowViewModal(false)} centered size="lg">
            <Modal.Header closeButton className="modal-header-gradient">
              <Modal.Title>{activeTab === 'won' ? 'Won Auction Details' : 'Auction Details'}</Modal.Title>
            </Modal.Header>
            <Modal.Body className="p-4">
              {selectedAuction && (
                <Row className="g-4">
                  <Col md={4}>
                    <img
                      src={selectedAuction.gem?.images?.[0] || 'https://via.placeholder.com/300'}
                      alt={selectedAuction.gem?.type}
                      style={{ width: '100%', borderRadius: 8, objectFit: 'cover', display: 'block' }}
                    />
                  </Col>
                  <Col md={8}>
                    <h5 style={{ fontWeight: 700, marginBottom: 12 }}>{selectedAuction.gem?.type}</h5>
                    <Row className="g-2" style={{ fontSize: 13, marginBottom: 16 }}>
                      <Col xs={6}>
                        <div style={{ color: '#7c8aa3' }}>Start Price</div>
                        <div style={{ fontWeight: 700, fontSize: 16 }}>{formatCurrency(selectedAuction.startPrice || 0)}</div>
                      </Col>
                      <Col xs={6}>
                        <div style={{ color: '#7c8aa3' }}>Winning Bid</div>
                        <div style={{ fontWeight: 700, fontSize: 16 }}>{formatCurrency(selectedAuction.currentBid || 0)}</div>
                      </Col>
                      <Col xs={6}>
                        <div style={{ color: '#7c8aa3' }}>Seller</div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{selectedAuction.seller?.name}</div>
                      </Col>
                      <Col xs={6}>
                        <div style={{ color: '#7c8aa3' }}>Total Bids</div>
                        <div style={{ fontWeight: 700, fontSize: 16 }}>{selectedAuction.bids?.length || 0}</div>
                      </Col>
                    </Row>
                    <hr />
                    <div style={{ fontSize: 13 }}>
                      <div style={{ color: '#7c8aa3', marginBottom: 4 }}>
                        {activeTab === 'won' ? 'Ended' : 'End'} Time
                      </div>
                      <div style={{ fontWeight: 600 }}>
                        {new Date(selectedAuction.endTime).toLocaleString('en-US', {
                          year: 'numeric', month: 'short', day: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </div>
                    </div>
                  </Col>
                </Row>
              )}
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => setShowViewModal(false)}>Close</Button>
              {activeTab === 'won' && (
                <Button className="btn-primary" onClick={handleContactSeller}>Contact Seller</Button>
              )}
            </Modal.Footer>
          </Modal>
        </main>
      </div>
    </div>
  );
};

export default BuyerAuctionsPage;