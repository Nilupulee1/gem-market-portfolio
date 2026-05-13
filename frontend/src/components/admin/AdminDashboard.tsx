import { useState, useEffect, useMemo } from 'react';
import { Container, Row, Col, Card, Nav, Button } from 'react-bootstrap';
import { Users, Package, TrendingUp, CheckCircle, Clock, AlertCircle, LogOut } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useNavigate } from 'react-router-dom';
import { adminAPI } from '../../api/axios';
import PendingGems from './PendingGems';
import UserManagement from './UserManagement';
import AuctionManagement from './AuctionManagement';
import type { DashboardStats } from '../../types/admin';

type TabType = 'dashboard' | 'pending-gems' | 'users' | 'auctions';

const AdminDashboard = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalGems: 0,
    pendingGems: 0,
    approvedGems: 0,
    totalAuctions: 0,
    activeAuctions: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatistics();
  }, []);

  const fetchStatistics = async () => {
    try {
      setLoading(true);
      const response = await adminAPI.getStatistics();
      setStats(response.data.statistics);
    } catch (error) {
      console.error('Error fetching statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const dashboardInsights = useMemo(() => {
    const totalGems = stats.totalGems || 0;
    const approvalRate = totalGems ? Math.round((stats.approvedGems / totalGems) * 100) : 0;
    const reviewQueueRate = totalGems ? Math.round((stats.pendingGems / totalGems) * 100) : 0;
    const auctionHealth = stats.totalAuctions ? Math.round((stats.activeAuctions / stats.totalAuctions) * 100) : 0;

    return {
      approvalRate,
      reviewQueueRate,
      auctionHealth,
    };
  }, [stats]);

  const renderContent = () => {
    switch (activeTab) {
      case 'pending-gems':
        return <PendingGems onApprove={fetchStatistics} />;
      case 'users':
        return <UserManagement />;
      case 'auctions':
        return <AuctionManagement />;
      default:
        return (
          <>
            <div className="dashboard-hero mb-4">
              <div>
                <p className="dashboard-eyebrow mb-2">Platform control</p>
                <h4 className="fw-bold mb-2">Admin Dashboard</h4>
                <p className="mb-0">Monitor review flow, user growth, and auction performance from a single view.</p>
              </div>
              <div className="dashboard-chip-stack">
                <span className="dashboard-chip dashboard-chip-soft">{stats.pendingGems} pending reviews</span>
                <span className="dashboard-chip">{dashboardInsights.auctionHealth}% auction activity</span>
              </div>
            </div>

            {/* Statistics Cards */}
            <Row className="g-4 mb-4">
              <Col md={4}>
                <Card className="stat-card h-100">
                  <Card.Body>
                    <div className="d-flex justify-content-between align-items-start mb-3">
                      <div>
                        <p className="text-muted mb-1 small">Total Users</p>
                        <h3 className="mb-0">{stats.totalUsers}</h3>
                      </div>
                      <div className="stat-icon bg-primary bg-opacity-10">
                        <Users className="text-primary" size={24} />
                      </div>
                    </div>
                    <small className="text-muted">Registered on platform</small>
                  </Card.Body>
                </Card>
              </Col>

              <Col md={4}>
                <Card className="stat-card h-100">
                  <Card.Body>
                    <div className="d-flex justify-content-between align-items-start mb-3">
                      <div>
                        <p className="text-muted mb-1 small">Total Gems</p>
                        <h3 className="mb-0">{stats.totalGems}</h3>
                      </div>
                      <div className="stat-icon bg-success bg-opacity-10">
                        <Package className="text-success" size={24} />
                      </div>
                    </div>
                    <small className="text-muted">
                      {stats.approvedGems} approved, {stats.pendingGems} pending
                    </small>
                  </Card.Body>
                </Card>
              </Col>

              <Col md={4}>
                <Card className="stat-card h-100">
                  <Card.Body>
                    <div className="d-flex justify-content-between align-items-start mb-3">
                      <div>
                        <p className="text-muted mb-1 small">Active Auctions</p>
                        <h3 className="mb-0">{stats.activeAuctions}</h3>
                      </div>
                      <div className="stat-icon bg-warning bg-opacity-10">
                        <TrendingUp className="text-warning" size={24} />
                      </div>
                    </div>
                    <small className="text-muted">Out of {stats.totalAuctions} total</small>
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
                        <p className="dashboard-eyebrow mb-2">Platform health</p>
                        <h5 className="mb-0">Verification and marketplace mix</h5>
                      </div>
                      <span className="dashboard-chip dashboard-chip-soft">{dashboardInsights.approvalRate}% approved</span>
                    </div>

                    <div className="dashboard-metric-grid mt-4">
                      <div className="dashboard-metric-card">
                        <span>Approval rate</span>
                        <strong>{dashboardInsights.approvalRate}%</strong>
                      </div>
                      <div className="dashboard-metric-card">
                        <span>Review queue</span>
                        <strong>{dashboardInsights.reviewQueueRate}%</strong>
                      </div>
                      <div className="dashboard-metric-card">
                        <span>Auction health</span>
                        <strong>{dashboardInsights.auctionHealth}%</strong>
                      </div>
                    </div>

                    <div className="dashboard-bar-list mt-4">
                      <div className="dashboard-bar-row">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <span>Pending gems</span>
                          <strong>{stats.pendingGems}</strong>
                        </div>
                        <div className="dashboard-bar-track">
                          <div className="dashboard-bar-fill" style={{ width: `${dashboardInsights.reviewQueueRate}%`, background: '#f59e0b' }} />
                        </div>
                      </div>
                      <div className="dashboard-bar-row">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <span>Approved gems</span>
                          <strong>{stats.approvedGems}</strong>
                        </div>
                        <div className="dashboard-bar-track">
                          <div className="dashboard-bar-fill" style={{ width: `${dashboardInsights.approvalRate}%`, background: '#10b981' }} />
                        </div>
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </Col>

              <Col lg={5}>
                <Card className="content-card dashboard-analytics-card h-100">
                  <Card.Body>
                    <div className="dashboard-analytics-header mb-3">
                      <div>
                        <p className="dashboard-eyebrow mb-2">Action focus</p>
                        <h5 className="mb-0">Operational summary</h5>
                      </div>
                    </div>

                    <div className="dashboard-metric-grid dashboard-metric-grid--single">
                      <div className="dashboard-metric-card">
                        <span>Total users</span>
                        <strong>{stats.totalUsers}</strong>
                      </div>
                      <div className="dashboard-metric-card">
                        <span>Total gems</span>
                        <strong>{stats.totalGems}</strong>
                      </div>
                      <div className="dashboard-metric-card">
                        <span>Active auctions</span>
                        <strong>{stats.activeAuctions}</strong>
                      </div>
                    </div>

                    <div className="dashboard-empty-inline mt-4">
                      {stats.pendingGems === 0
                        ? 'No pending gems need attention right now.'
                        : `${stats.pendingGems} gems are still in the review queue.`}
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            </Row>

            {/* Quick Actions */}
            <Row className="g-4">
              <Col md={6}>
                <Card className="content-card">
                  <Card.Body>
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <h5 className="mb-0">Pending Verifications</h5>
                      <Clock size={20} className="text-warning" />
                    </div>
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <h2 className="mb-0 text-warning">{stats.pendingGems}</h2>
                        <small className="text-muted">Gems awaiting review</small>
                      </div>
                      <Button 
                        variant="outline-primary" 
                        size="sm"
                        onClick={() => setActiveTab('pending-gems')}
                      >
                        Review Now
                      </Button>
                    </div>
                  </Card.Body>
                </Card>
              </Col>

              <Col md={6}>
                <Card className="content-card">
                  <Card.Body>
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <h5 className="mb-0">Approved Gems</h5>
                      <CheckCircle size={20} className="text-success" />
                    </div>
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <h2 className="mb-0 text-success">{stats.approvedGems}</h2>
                        <small className="text-muted">Listed on marketplace</small>
                      </div>
                      <Button 
                        variant="outline-success" 
                        size="sm"
                        disabled
                      >
                        View All
                      </Button>
                    </div>
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
                className="rounded-circle bg-danger bg-opacity-10 mx-auto mb-3 d-flex align-items-center justify-content-center"
                style={{ width: '80px', height: '80px' }}
              >
                <AlertCircle className="text-danger" size={40} />
              </div>
              <h6 className="mb-1">{user?.name}</h6>
              <span className="profile-chip">Administrator</span>
            </Card.Body>
          </Card>

          <Nav className="flex-column">
            <Nav.Link
              className={`sidebar-nav-link ${
                activeTab === 'dashboard' ? 'active' : ''
              }`}
              onClick={() => setActiveTab('dashboard')}
            >
              <TrendingUp size={18} className="me-2" />
              Dashboard
            </Nav.Link>
            <Nav.Link
              className={`sidebar-nav-link ${
                activeTab === 'pending-gems' ? 'active' : ''
              }`}
              onClick={() => setActiveTab('pending-gems')}
            >
              <Clock size={18} className="me-2" />
              Pending Gems
              {stats.pendingGems > 0 && (
                <span className="badge bg-warning text-dark ms-auto">{stats.pendingGems}</span>
              )}
            </Nav.Link>
            <Nav.Link
              className={`sidebar-nav-link ${
                activeTab === 'users' ? 'active' : ''
              }`}
              onClick={() => setActiveTab('users')}
            >
              <Users size={18} className="me-2" />
              User Management
            </Nav.Link>
            <Nav.Link
              className={`sidebar-nav-link ${
                activeTab === 'auctions' ? 'active' : ''
              }`}
              onClick={() => setActiveTab('auctions')}
            >
              <Package size={18} className="me-2" />
              Auctions
            </Nav.Link>
          </Nav>

          <hr className="my-4" />

          <Button 
            variant="outline-danger" 
            size="sm" 
            className="w-100"
            onClick={handleLogout}
          >
            <LogOut size={16} className="me-2" />
            Sign Out
          </Button>
        </Col>

        {/* Main Content */}
        <Col lg={10}>
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : (
            renderContent()
          )}
        </Col>
      </Row>
    </Container>
  );
};

export default AdminDashboard;