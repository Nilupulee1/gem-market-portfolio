import { useState, useEffect, useMemo } from 'react';
import { Container, Row, Col, Card, Nav, Button, Badge, ListGroup } from 'react-bootstrap';
import { useAuthStore } from '../../store/authStore';
import { gemAPI } from '../../api/axios';
import { Gem as GemIcon, TrendingUp, Package, AlertCircle, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import MyPortfolio from './MyPortfolio';
import AddGemForm from './AddGemForm';
import AuctionsPage from './Auctions';
import type { Gem } from "../../types";


type TabType = 'dashboard' | 'portfolio' | 'auctions' | 'addGem';
type ListingFilter = 'all' | 'approved' | 'pending' | 'rejected';

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

const SellerDashboard = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [listingFilter, setListingFilter] = useState<ListingFilter>('all');
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

  const handleSignOut = () => {
    logout();
    navigate('/login');
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'portfolio':
        return <MyPortfolio gems={myGems} onRefresh={fetchMyGems} />;
      case 'auctions':
        return <AuctionsPage />;
      case 'addGem':
        return <AddGemForm onSuccess={() => {
          fetchMyGems();
          setActiveTab('portfolio');
        }} />;
      default:
        return (
          <>
            {/* Welcome Section */}
            <div className="dashboard-title">
              <h4 className="mb-1">Welcome back, {user?.name?.split(' ')[0]}</h4>
              <p className="text-muted">Here's a summary of your gem portfolio and recent activity.</p>
            </div>

            {/* Stats Cards */}
            <Row className="g-4 mb-4">
              <Col md={4}>
                <Card className="stat-card h-100">
                  <Card.Body>
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <div>
                        <p className="text-muted mb-1 small">Total Portfolio Value</p>
                        <h3 className="mb-0">{stats.totalCarat.toFixed(2)} ct</h3>
                      </div>
                      <div className="stat-icon bg-primary bg-opacity-10">
                        <TrendingUp className="text-primary" size={24} />
                      </div>
                    </div>
                    <small className="text-muted">Based on {myGems.length} gems</small>
                  </Card.Body>
                </Card>
              </Col>

              <Col md={4}>
                <Card className="stat-card h-100">
                  <Card.Body>
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <div>
                        <p className="text-muted mb-1 small">Active Listings</p>
                        <h3 className="mb-0">{stats.activeListings}</h3>
                      </div>
                      <div className="stat-icon bg-success bg-opacity-10">
                        <Package className="text-success" size={24} />
                      </div>
                    </div>
                    <small className="text-muted">out of {myGems.length} gems</small>
                  </Card.Body>
                </Card>
              </Col>

              <Col md={4}>
                <Card className="stat-card h-100">
                  <Card.Body>
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <div>
                        <p className="text-muted mb-1 small">Pending Verification</p>
                        <h3 className="mb-0">{stats.pendingVerification}</h3>
                      </div>
                      <div className="stat-icon bg-warning bg-opacity-10">
                        <AlertCircle className="text-warning" size={24} />
                      </div>
                    </div>
                    <small className="text-muted">awaiting admin review</small>
                  </Card.Body>
                </Card>
              </Col>
            </Row>

            {/* My Listings Section */}
            <Row>
              <Col lg={8}>
                <Card className="content-card mb-4">
                  <Card.Body>
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <h5 className="mb-0">My Listings</h5>
                      <div>
                        <Button 
                          variant={listingFilter === 'pending' ? 'primary' : 'link'}
                          size="sm"
                          className={`me-2 ${listingFilter === 'pending' ? '' : 'text-muted'}`}
                          onClick={() => setListingFilter('pending')}
                        >
                          Pending
                        </Button>
                        <Button 
                          variant={listingFilter === 'approved' ? 'primary' : 'link'}
                          size="sm"
                          className={listingFilter === 'approved' ? '' : 'text-muted'}
                          onClick={() => setListingFilter('approved')}
                        >
                          Approved
                        </Button>
                        <Button 
                          variant={listingFilter === 'rejected' ? 'primary' : 'link'}
                          size="sm"
                          className="ms-2 text-muted"
                          onClick={() => setListingFilter('rejected')}
                        >
                          Rejected
                        </Button>
                        <Button 
                          variant={listingFilter === 'all' ? 'primary' : 'link'} 
                          size="sm"
                          className="ms-2"
                          onClick={() => setListingFilter('all')}
                        >
                          All
                        </Button>
                      </div>
                    </div>

                    {loading ? (
                      <div className="text-center py-5">
                        <div className="spinner-border text-primary" role="status">
                          <span className="visually-hidden">Loading...</span>
                        </div>
                      </div>
                    ) : myGems.length === 0 ? (
                      <div className="text-center py-5">
                        <GemIcon size={48} className="text-muted mb-3" />
                        <p className="text-muted">No gems added yet</p>
                        <Button 
                          variant="primary"
                          onClick={() => setActiveTab('addGem')}
                        >
                          <Plus size={16} className="me-1" />
                          Add Your First Gem
                        </Button>
                      </div>
                    ) : dashboardListedGems.length === 0 ? (
                      <div className="text-center py-5 text-muted">
                        No gems found for selected status.
                      </div>
                    ) : (
                      <Row className="g-3">
                        {dashboardListedGems.map((gem) => (
                          <Col md={6} key={gem._id}>
                            <Card className="surface-muted">
                              <div 
                                className="position-relative"
                                style={{ height: '200px', overflow: 'hidden' }}
                              >
                                <img
                                  src={gem.images[0] || 'https://via.placeholder.com/300x200'}
                                  alt={gem.type}
                                  className="w-100 h-100"
                                  style={{ objectFit: 'cover' }}
                                />
                                <Badge 
                                  bg={gem.status === 'approved' ? 'success' : gem.status === 'pending' ? 'warning' : 'danger'}
                                  className="position-absolute top-0 end-0 m-2"
                                >
                                  {gem.status}
                                </Badge>
                              </div>
                              <Card.Body>
                                <h6 className="mb-1">{gem.type}</h6>
                                <p className="text-muted small mb-2">
                                  Carat: {gem.carat} | Origin: {gem.origin}
                                </p>
                                <div className="d-flex justify-content-between">
                                  <Button variant="outline-primary" size="sm" onClick={() => setActiveTab('portfolio')}>
                                    View Details
                                  </Button>
                                  <Button variant="outline-secondary" size="sm" onClick={() => setActiveTab('portfolio')}>
                                    Manage
                                  </Button>
                                </div>
                              </Card.Body>
                            </Card>
                          </Col>
                        ))}
                      </Row>
                    )}
                  </Card.Body>
                </Card>
              </Col>

              {/* Recent Activity */}
              <Col lg={4}>
                <Card className="content-card">
                  <Card.Body>
                    <h5 className="mb-3">Recent Activity</h5>
                    <ListGroup variant="flush">
                      {recentActivities.length === 0 ? (
                        <ListGroup.Item className="px-0 text-muted">No recent gem activity</ListGroup.Item>
                      ) : recentActivities.map((activity, index) => (
                        <ListGroup.Item key={index} className="px-0">
                          <div className="d-flex align-items-start">
                            <div 
                              className={`me-2 rounded-circle d-flex align-items-center justify-content-center ${
                                activity.type === 'success' ? 'bg-success-subtle' : 
                                activity.type === 'info' ? 'bg-info-subtle' : 'bg-danger-subtle'
                              }`}
                              style={{ width: '32px', height: '32px', minWidth: '32px' }}
                            >
                              <span className={`text-${activity.type}`}>{activity.icon}</span>
                            </div>
                            <div className="flex-grow-1">
                              <p className="mb-1 small">{activity.message}</p>
                              <small className="text-muted">{activity.time}</small>
                            </div>
                          </div>
                        </ListGroup.Item>
                      ))}
                    </ListGroup>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </>
        );
    }
  };

  return (
    <Container fluid className="dashboard-shell">
      <Row className="g-0">
        {/* Sidebar */}
        <Col lg={2} className="pe-lg-3">
          <Card className="sidebar-card mb-4">
            <Card.Body className="text-center py-4">
              <div 
                className="rounded-circle mx-auto mb-3 d-flex align-items-center justify-content-center"
                style={{ width: '80px', height: '80px' }}
              >
                <span className="display-6">👤</span>
              </div>
              <h6 className="mb-1">{user?.name}</h6>
              <span className="profile-chip">Collector</span>
            </Card.Body>
          </Card>

          <Nav className="flex-column">
            <Nav.Link
              className={`sidebar-nav-link ${
                activeTab === 'dashboard' ? 'active' : ''
              }`}
              onClick={() => setActiveTab('dashboard')}
            >
              <GemIcon size={18} className="me-2" />
              Dashboard
            </Nav.Link>
            <Nav.Link
              className={`sidebar-nav-link ${
                activeTab === 'portfolio' ? 'active' : ''
              }`}
              onClick={() => setActiveTab('portfolio')}
            >
              <Package size={18} className="me-2" />
              My Portfolio
            </Nav.Link>
            <Nav.Link
              className={`sidebar-nav-link ${
                activeTab === 'auctions' ? 'active' : ''
              }`}
              onClick={() => setActiveTab('auctions')}
            >
              <TrendingUp size={18} className="me-2" />
              Auctions
            </Nav.Link>
            <Nav.Link
              className={`sidebar-nav-link ${
                activeTab === 'addGem' ? 'active' : ''
              }`}
              onClick={() => setActiveTab('addGem')}
            >
              <Plus size={18} className="me-2" />
              Add New Gem
            </Nav.Link>
          </Nav>

          <hr className="my-4" />

          <Button variant="outline-secondary" size="sm" className="w-100">
            <AlertCircle size={16} className="me-2" />
            Settings
          </Button>
          <Button variant="outline-danger" size="sm" className="w-100 mt-2" onClick={handleSignOut}>
            Sign Out
          </Button>
        </Col>

        {/* Main Content */}
        <Col lg={10}>
          {renderContent()}
        </Col>
      </Row>
    </Container>
  );
};

export default SellerDashboard;