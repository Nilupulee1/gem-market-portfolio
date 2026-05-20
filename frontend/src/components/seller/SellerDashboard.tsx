import { useState, useEffect, useMemo } from 'react';
import { Container, Row, Col, Card, Nav, Button } from 'react-bootstrap';
import { useAuthStore } from '../../store/authStore';
import { useChatStore } from '../../store/chatStore';
import { gemAPI } from '../../api/axios';
import { Gem as GemIcon, TrendingUp, Package, AlertCircle, Plus, MessageSquare, Settings, LogOut, Moon, Sun } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import MyPortfolio from './MyPortfolio';
import AddGemForm from './AddGemForm';
import AuctionsPage from './Auctions';
import MessagesPage from '../buyer/MessagesPage';
import logo from '../../assets/logo.png';
import type { Gem } from "../../types";


type TabType = 'dashboard' | 'portfolio' | 'auctions' | 'addGem' | 'messages';
type ListingFilter = 'all' | 'approved' | 'pending' | 'rejected';
type ThemeMode = 'light' | 'dark';

type ChatContact = {
  _id?: string;
  name: string;
  email: string;
  phone?: string;
};

type ChatGem = {
  name: string;
  id: string;
};

const sellerDashboardCacheKey = 'seller-dashboard-cache';

type SellerDashboardCache = {
  myGems: Gem[];
  stats: {
    totalCarat: number;
    activeListings: number;
    pendingVerification: number;
    rejectedListings: number;
  };
};

const loadSellerDashboardCache = (): SellerDashboardCache | null => {
  const raw = localStorage.getItem(sellerDashboardCacheKey);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as SellerDashboardCache;
    return Array.isArray(parsed.myGems) && parsed.stats ? parsed : null;
  } catch {
    return null;
  }
};

const saveSellerDashboardCache = (cache: SellerDashboardCache) => {
  localStorage.setItem(sellerDashboardCacheKey, JSON.stringify(cache));
};

const SellerDashboard = ({
  theme,
  onToggleTheme,
}: {
  theme: ThemeMode;
  onToggleTheme: () => void;
}) => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [listingFilter, setListingFilter] = useState<ListingFilter>('all');
  const [chatInitialContact, setChatInitialContact] = useState<ChatContact | null>(null);
  const [chatInitialGem, setChatInitialGem] = useState<ChatGem | null>(null);
  const cachedSellerDashboard = loadSellerDashboardCache();
  const [myGems, setMyGems] = useState<Gem[]>(cachedSellerDashboard?.myGems || []);
  const [loading, setLoading] = useState(!cachedSellerDashboard);
  const [stats, setStats] = useState(
    cachedSellerDashboard?.stats || {
      totalCarat: 0,
      activeListings: 0,
      pendingVerification: 0,
      rejectedListings: 0,
    }
  );

  useEffect(() => {
    fetchMyGems(true);
  }, []);

  const fetchMyGems = async (isInitialLoad: boolean = false) => {
    try {
      if (isInitialLoad && !cachedSellerDashboard) {
        setLoading(true);
      }
      const response = await gemAPI.getMyGems();
      const gems = response.data.gems;
      setMyGems(gems);

      // Calculate stats from actual records only
      const approved = gems.filter((g: Gem) => g.status === 'approved');
      const pending = gems.filter((g: Gem) => g.status === 'pending');
      const rejected = gems.filter((g: Gem) => g.status === 'rejected');
      const totalCarat = gems.reduce((sum: number, gem: Gem) => sum + Number(gem.carat || 0), 0);
      
      const nextStats = {
        totalCarat,
        activeListings: approved.length,
        pendingVerification: pending.length,
        rejectedListings: rejected.length,
      };

      setStats(nextStats);
      saveSellerDashboardCache({ myGems: gems, stats: nextStats });
    } catch (error) {
      console.error('Error fetching gems:', error);
    } finally {
      setLoading(false);
    }
  };

  const recentActivities = useMemo(() => {
    return [...myGems]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 5)
      .map((gem) => {
        const isApproved = gem.status === 'approved';
        const isRejected = gem.status === 'rejected';
        const type = isApproved ? 'success' : isRejected ? 'danger' : 'info';
        const icon = isApproved ? '✓' : isRejected ? '✕' : 'i';
        const statusText = isApproved ? 'approved' : isRejected ? 'rejected' : 'submitted for review';

        return {
          type,
          icon,
          message: `Gem "${gem.type}" was ${statusText}.`,
          time: new Date(gem.updatedAt).toLocaleString(),
        };
      });
  }, [myGems]);

  const dashboardListedGems = useMemo(() => {
    const filtered = myGems.filter((gem) => {
      if (listingFilter === 'all') {
        return true;
      }
      return gem.status === listingFilter;
    });

    return filtered.slice(0, 4);
  }, [myGems, listingFilter]);

  const dashboardInsights = useMemo(() => {
    const totalListings = myGems.length;
    const approvalRate = totalListings ? Math.round((stats.activeListings / totalListings) * 100) : 0;
    const pendingRate = totalListings ? Math.round((stats.pendingVerification / totalListings) * 100) : 0;
    const rejectionRate = totalListings ? Math.round((stats.rejectedListings / totalListings) * 100) : 0;
    const averageCarat = totalListings ? stats.totalCarat / totalListings : 0;

    return {
      totalListings,
      approvalRate,
      pendingRate,
      rejectionRate,
      averageCarat,
      statusBreakdown: [
        { label: 'Approved', value: stats.activeListings, color: '#10b981' },
        { label: 'Pending', value: stats.pendingVerification, color: '#f59e0b' },
        { label: 'Rejected', value: stats.rejectedListings, color: '#ef4444' },
      ],
    };
  }, [myGems.length, stats]);

  const handleSignOut = () => {
    logout();
    navigate('/login');
  };

  const openSellerChat = (contact: ChatContact, gem: ChatGem) => {
    setChatInitialContact(contact);
    setChatInitialGem(gem);
    setActiveTab('messages');
  };

  const unreadCount = useChatStore((state) => state.unreadCount);

  const renderContent = () => {
    switch (activeTab) {
      case 'portfolio':
        return <MyPortfolio gems={myGems} onRefresh={fetchMyGems} />;
      case 'auctions':
        return <AuctionsPage onContactWinner={openSellerChat} />;
      case 'messages':
        return <MessagesPage initialContact={chatInitialContact} initialGem={chatInitialGem} />;
      case 'addGem':
        return <AddGemForm onSuccess={() => {
          fetchMyGems();
          setActiveTab('portfolio');
        }} />;
      default: {
        return (
          <>
            <div className="dashboard-hero hero-premium-mesh mb-4 animate-fade-up">
              <div>
                <p className="dashboard-eyebrow mb-2">Seller dashboard</p>
                <h4>Welcome back, {user?.name?.split(' ')[0]}!</h4>
                <p className="mb-0">Track approvals, active listings, and recent updates from one place.</p>
              </div>
              <div className="dashboard-chip-stack">
                <span className="dashboard-chip dashboard-chip-soft">{dashboardInsights.approvalRate}% approval rate</span>
                <span className="dashboard-chip">{dashboardInsights.totalListings} total listings</span>
              </div>
            </div>

            <Row className="g-4 mb-4">
              <Col md={6} lg={3} className="animate-fade-up delay-1">
                <Card className="stat-card h-100">
                  <Card.Body>
                    <div className="d-flex justify-content-between align-items-start mb-3">
                      <div>
                        <p className="text-muted mb-2 small">Total Carats</p>
                        <h3 className="mb-0">{stats.totalCarat.toFixed(2)}</h3>
                        <small className="text-muted">portfolio weight</small>
                      </div>
                      <div className="stat-icon" style={{ background: 'rgba(31, 79, 130, 0.1)' }}>
                        <TrendingUp size={24} style={{ color: 'var(--color-primary)' }} />
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </Col>

              <Col md={6} lg={3} className="animate-fade-up delay-2">
                <Card className="stat-card stat-card-approved h-100">
                  <Card.Body>
                    <div className="d-flex justify-content-between align-items-start mb-3">
                      <div>
                        <p className="text-muted mb-2 small">Active Listings</p>
                        <h3 className="mb-0">{stats.activeListings}</h3>
                        <small className="text-muted">live on market</small>
                      </div>
                      <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.1)' }}>
                        <Package size={24} style={{ color: '#10b981' }} />
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </Col>

              <Col md={6} lg={3} className="animate-fade-up delay-3">
                <Card className="stat-card stat-card-pending h-100">
                  <Card.Body>
                    <div className="d-flex justify-content-between align-items-start mb-3">
                      <div>
                        <p className="text-muted mb-2 small">Pending Verification</p>
                        <h3 className="mb-0">{stats.pendingVerification}</h3>
                        <small className="text-muted">awaiting review</small>
                      </div>
                      <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.1)' }}>
                        <AlertCircle size={24} style={{ color: '#f59e0b' }} />
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </Col>

              <Col md={6} lg={3} className="animate-fade-up delay-4">
                <Card className="stat-card stat-card-rejected h-100">
                  <Card.Body>
                    <div className="d-flex justify-content-between align-items-start mb-3">
                      <div>
                        <p className="text-muted mb-2 small">Rejected Items</p>
                        <h3 className="mb-0">{stats.rejectedListings}</h3>
                        <small className="text-muted">needs attention</small>
                      </div>
                      <div className="stat-icon" style={{ background: 'rgba(239, 68, 68, 0.1)' }}>
                        <AlertCircle size={24} style={{ color: '#ef4444' }} />
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            </Row>

            <Row className="g-4 mb-4">
              <Col lg={7}>
                <Card className="content-card dashboard-analytics-card h-100">
                  <Card.Body>
                    <div className="dashboard-analytics-header">
                      <div>
                        <p className="dashboard-eyebrow mb-2">Listing health</p>
                        <h5 className="mb-0">Approval and review mix</h5>
                      </div>
                      <span className="dashboard-chip dashboard-chip-soft">Avg. {dashboardInsights.averageCarat.toFixed(2)} ct</span>
                    </div>

                    <div className="dashboard-metric-grid mt-4">
                      <div className="dashboard-metric-card">
                        <span>Approval rate</span>
                        <strong>{dashboardInsights.approvalRate}%</strong>
                      </div>
                      <div className="dashboard-metric-card">
                        <span>Pending share</span>
                        <strong>{dashboardInsights.pendingRate}%</strong>
                      </div>
                      <div className="dashboard-metric-card">
                        <span>Rejected share</span>
                        <strong>{dashboardInsights.rejectionRate}%</strong>
                      </div>
                    </div>

                    <div className="dashboard-bar-list mt-4">
                      {dashboardInsights.statusBreakdown.map((item) => {
                        const progress = dashboardInsights.totalListings ? (item.value / dashboardInsights.totalListings) * 100 : 0;

                        return (
                          <div key={item.label} className="dashboard-bar-row">
                            <div className="d-flex justify-content-between align-items-center mb-2">
                              <span>{item.label}</span>
                              <strong>{item.value}</strong>
                            </div>
                            <div className="dashboard-bar-track">
                              <div
                                className="dashboard-bar-fill"
                                style={{ width: `${progress}%`, background: item.color }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </Card.Body>
                </Card>
              </Col>

              <Col lg={5}>
                <Card className="content-card dashboard-analytics-card h-100">
                  <Card.Body>
                    <div className="dashboard-analytics-header mb-3">
                      <div>
                        <p className="dashboard-eyebrow mb-2">Recent activity</p>
                        <h5 className="mb-0">Latest gem updates</h5>
                      </div>
                    </div>

                    <div className="activity-list">
                      {recentActivities.length === 0 ? (
                        <div className="dashboard-empty-inline">No recent activity</div>
                      ) : recentActivities.map((activity, index) => (
                        <div key={index} className="activity-item">
                          <div className={`activity-icon ${activity.type}`}>
                            {activity.icon}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div className="activity-message">{activity.message}</div>
                            <div className="activity-time">{activity.time}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            </Row>

            <Row>
              <Col lg={12}>
                <Card className="content-card mb-4">
                  <Card.Body>
                    <div className="d-flex justify-content-between align-items-center mb-4">
                      <h5 className="mb-0">My Listings</h5>
                      <div className="filter-button-group">
                        <button 
                          className={`filter-button ${listingFilter === 'all' ? 'active' : ''}`}
                          onClick={() => setListingFilter('all')}
                        >
                          All
                        </button>
                        <button 
                          className={`filter-button ${listingFilter === 'approved' ? 'active' : ''}`}
                          onClick={() => setListingFilter('approved')}
                        >
                          Approved
                        </button>
                        <button 
                          className={`filter-button ${listingFilter === 'pending' ? 'active' : ''}`}
                          onClick={() => setListingFilter('pending')}
                        >
                          Pending
                        </button>
                        <button 
                          className={`filter-button ${listingFilter === 'rejected' ? 'active' : ''}`}
                          onClick={() => setListingFilter('rejected')}
                        >
                          Rejected
                        </button>
                      </div>
                    </div>

                    {loading ? (
                      <Row className="g-3">
                        {[1, 2, 3, 4].map((i) => (
                          <Col md={6} key={i}>
                            <div className="skeleton-card skeleton-shimmer">
                              <div className="d-flex gap-3">
                                <div className="skeleton-circle skeleton-shimmer" style={{ width: '80px', height: '80px', flexShrink: 0 }} />
                                <div className="flex-grow-1">
                                  <div className="skeleton-text skeleton-text-lg skeleton-shimmer" style={{ width: '70%' }} />
                                  <div className="skeleton-text skeleton-text-md skeleton-shimmer" style={{ width: '50%', marginTop: '10px' }} />
                                </div>
                              </div>
                              <div className="d-flex gap-2 mt-3">
                                <div className="skeleton-text skeleton-shimmer" style={{ width: '100%', height: '32px', borderRadius: '6px' }} />
                                <div className="skeleton-text skeleton-shimmer" style={{ width: '100%', height: '32px', borderRadius: '6px' }} />
                              </div>
                            </div>
                          </Col>
                        ))}
                      </Row>
                    ) : myGems.length === 0 ? (
                      <div className="empty-state">
                        <div className="empty-state-icon">💎</div>
                        <div className="empty-state-title">No Gems Yet</div>
                        <div className="empty-state-text">Start building your portfolio by adding your first gem</div>
                        <Button 
                          className="btn-primary"
                          onClick={() => setActiveTab('addGem')}
                        >
                          <Plus size={16} className="me-2" style={{ display: 'inline' }} />
                          Add Your First Gem
                        </Button>
                      </div>
                    ) : dashboardListedGems.length === 0 ? (
                      <div className="empty-state">
                        <div className="empty-state-icon">🔍</div>
                        <div className="empty-state-title">No Items Found</div>
                        <div className="empty-state-text">No gems found for the selected status</div>
                      </div>
                    ) : (
                      <Row className="g-3">
                        {dashboardListedGems.map((gem) => (
                          <Col md={6} key={gem._id}>
                            <Card className="gem-card">
                              <div className="gem-image-container">
                                <img
                                  src={gem.images[0] || 'https://via.placeholder.com/300x200'}
                                  alt={gem.type}
                                  className="gem-image"
                                />
                                <div className={`gem-status-badge gem-status-${gem.status}`}>
                                  {gem.status}
                                </div>
                              </div>
                              <div className="gem-card-body">
                                <div className="gem-type">{gem.type}</div>
                                <div className="gem-details">
                                  <div><strong>Carat:</strong> {gem.carat}</div>
                                  <div><strong>Origin:</strong> {gem.origin}</div>
                                  <div><strong>Color:</strong> {gem.color}</div>
                                </div>
                                <div className="gem-actions">
                                  <button 
                                    className="gem-actions button btn-primary"
                                    onClick={() => setActiveTab('portfolio')}
                                  >
                                    View Details
                                  </button>
                                  <button 
                                    className="gem-actions button btn-secondary"
                                    onClick={() => setActiveTab('portfolio')}
                                  >
                                    Manage
                                  </button>
                                </div>
                              </div>
                            </Card>
                          </Col>
                        ))}
                      </Row>
                    )}
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </>
        );
      }
    }
  };

  return (
    <div className="dashboard-shell">
      {/* Navbar */}
      <div className="seller-navbar">
        <div className="seller-navbar-content">
          <button type="button" className="seller-navbar-logo seller-navbar-brand" onClick={() => setActiveTab('dashboard')}>
            <img src={logo} alt="GemFolio logo" className="seller-navbar-brand-logo" />
            <span>GemFolio</span>
          </button>
          <div className="seller-navbar-actions">
            <div className="seller-navbar-user">
              <span>👤</span>
              <span>{user?.name?.split(' ')[0]}</span>
            </div>
            <button
              type="button"
              onClick={onToggleTheme}
              className="seller-navbar-theme-toggle"
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Content Wrapper */}
      <div className="dashboard-content-wrapper">
        {/* Sidebar */}
        <div className="dashboard-sidebar-wrapper">
          {/* Professional Compact Sidebar Profile Header */}
          <div className="sidebar-profile-section">
            <div className="sidebar-profile-card">
              <div className="sidebar-profile-avatar-container">
                <div className="sidebar-profile-avatar">
                  <div className="sidebar-profile-avatar-inner">
                    {user?.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase() : '👤'}
                  </div>
                </div>
              </div>
              <div className="sidebar-profile-info">
                <div className="sidebar-profile-name" title={user?.name || ''}>
                  {user?.name}
                </div>
                <div className="sidebar-profile-role-badge">
                  Verified Seller
                </div>
              </div>
            </div>
          </div>

          <Nav className="sidebar-nav">
            <Nav.Link
              className={`sidebar-nav-link ${
                activeTab === 'dashboard' ? 'active' : ''
              }`}
              onClick={() => setActiveTab('dashboard')}
            >
              <GemIcon size={18} />
              Dashboard
            </Nav.Link>
            <Nav.Link
              className={`sidebar-nav-link ${
                activeTab === 'portfolio' ? 'active' : ''
              }`}
              onClick={() => setActiveTab('portfolio')}
            >
              <Package size={18} />
              My Portfolio
            </Nav.Link>
            <Nav.Link
              className={`sidebar-nav-link ${
                activeTab === 'auctions' ? 'active' : ''
              }`}
              onClick={() => setActiveTab('auctions')}
            >
              <TrendingUp size={18} />
              Auctions
            </Nav.Link>
            <Nav.Link
              className={`sidebar-nav-link ${
                activeTab === 'addGem' ? 'active' : ''
              }`}
              onClick={() => setActiveTab('addGem')}
            >
              <Plus size={18} />
              Add New Gem
            </Nav.Link>
            <Nav.Link
              className={`sidebar-nav-link ${
                activeTab === 'messages' ? 'active' : ''
              }`}
              onClick={() => setActiveTab('messages')}
            >
              <MessageSquare size={18} />
              <span style={{ flex: 1 }}>Messages</span>
              {unreadCount > 0 && (
                <span
                  style={{
                    minWidth: 22,
                    height: 22,
                    borderRadius: 999,
                    padding: '0 7px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#ef4444',
                    color: '#fff',
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                  aria-label={`${unreadCount} unread messages`}
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Nav.Link>
          </Nav>

          <div className="sidebar-button-group">
            <Button variant="outline-secondary" size="sm" className="w-100 d-flex align-items-center justify-content-center gap-2 mb-2">
              <Settings size={16} />
              Settings
            </Button>
            <Button variant="outline-danger" size="sm" className="w-100 d-flex align-items-center justify-content-center gap-2" onClick={handleSignOut}>
              <LogOut size={16} />
              Sign Out
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="dashboard-main-content">
          <Container fluid className="p-0">
            {renderContent()}
          </Container>
        </div>
      </div>
    </div>
  );
};

export default SellerDashboard;