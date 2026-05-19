import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  ChevronDown,
  CheckCircle,
  Clock,
  Gavel,
  LogOut,
  Package,
  Search,
  ShieldCheck,
  ShoppingCart,
  TrendingUp,
  Users,
} from 'lucide-react';
import { adminAPI } from '../../api/axios';
import { useAuthStore } from '../../store/authStore';
import PendingGems from './PendingGems';
import UserManagement from './UserManagement';
import AuctionManagement from './AuctionManagement';
import type { DashboardStats } from '../../types/admin';

type TabType = 'dashboard' | 'pending-gems' | 'users' | 'auctions';
type Tone = 'teal' | 'indigo' | 'amber' | 'rose';

const chartBaseValues = [18, 32, 24, 40, 29, 52, 34, 58, 42, 60, 33, 68];

const sidebarItems: Array<{ id: TabType; label: string; icon: typeof TrendingUp }> = [
  { id: 'dashboard', label: 'Dashboard', icon: TrendingUp },
  { id: 'pending-gems', label: 'Products', icon: Package },
  { id: 'users', label: 'Orders', icon: Users },
  { id: 'auctions', label: 'Revenue', icon: Gavel },
];

const formatCompactNumber = (value: number) => value.toLocaleString();

const buildSparkline = (values: number[], width = 600, height = 220) => {
  const maxValue = Math.max(...values, 1);
  const stepX = width / Math.max(values.length - 1, 1);
  const points = values.map((value, index) => {
    const x = index * stepX;
    const y = height - (value / maxValue) * (height - 26) - 12;
    return { x, y };
  });

  return {
    line: points.map(({ x, y }) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' '),
    area: `${points.map(({ x, y }) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')} ${width},${height} 0,${height}`,
  };
};

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
    activeAuctions: 0,
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

    return { approvalRate, reviewQueueRate, auctionHealth };
  }, [stats]);

  const summaryCards = useMemo(
    () => [
      { label: 'Daily Visitors', value: stats.totalUsers, change: '+18%', icon: Users, tone: 'teal' as Tone },
      { label: 'Total Orders', value: stats.totalGems, change: '+30%', icon: ShoppingCart, tone: 'indigo' as Tone },
      { label: 'Total Sales', value: stats.activeAuctions, change: '+22%', icon: Package, tone: 'amber' as Tone },
      { label: 'Total Profit', value: stats.approvedGems, change: '+19%', icon: CheckCircle, tone: 'rose' as Tone },
    ],
    [stats.activeAuctions, stats.approvedGems, stats.totalGems, stats.totalUsers]
  );

  const sparkline = useMemo(() => {
    const values = chartBaseValues.map((value, index) => {
      const source = [stats.totalUsers, stats.totalGems, stats.pendingGems, stats.approvedGems, stats.activeAuctions][index % 5] || 0;
      return value + Math.max(0, Math.min(18, Math.round(source / 5)));
    });

    return buildSparkline(values);
  }, [stats.activeAuctions, stats.approvedGems, stats.pendingGems, stats.totalGems, stats.totalUsers]);

  const statusBreakdown = useMemo(() => {
    const total = Math.max(stats.activeAuctions + stats.approvedGems + stats.pendingGems, 1);
    const active = Math.round((stats.activeAuctions / total) * 100);
    const complete = Math.round((stats.approvedGems / total) * 100);
    const hold = Math.max(0, 100 - active - complete);

    return [
      { label: 'Active', value: active, color: '#6366f1' },
      { label: 'Completed', value: complete, color: '#14b8a6' },
      { label: 'On Hold', value: hold, color: '#f59e0b' },
    ];
  }, [stats.activeAuctions, stats.approvedGems, stats.pendingGems]);

  const recentRows = useMemo(
    () => [
      { label: 'Pending reviews', updated: 'Today', value: stats.pendingGems, status: stats.pendingGems > 0 ? 'Attention' : 'Clear', tone: stats.pendingGems > 0 ? 'warning' : 'success' },
      { label: 'Approved gems', updated: 'Today', value: stats.approvedGems, status: 'Live', tone: 'success' },
      { label: 'Active auctions', updated: 'Today', value: stats.activeAuctions, status: 'Open', tone: 'info' },
      { label: 'Registered users', updated: 'Today', value: stats.totalUsers, status: 'Stable', tone: 'neutral' },
    ],
    [stats.activeAuctions, stats.approvedGems, stats.pendingGems, stats.totalUsers]
  );

  const renderDashboard = () => (
    <div className="admin-dashboard-grid">
      <section className="admin-summary-column">
        <div className="admin-kpi-grid">
          {summaryCards.map((card) => {
            const Icon = card.icon;
            return (
              <article key={card.label} className={`admin-kpi-card tone-${card.tone}`}>
                <div className="admin-kpi-icon">
                  <Icon size={20} />
                </div>
                <div className="admin-kpi-copy">
                  <span>{card.label}</span>
                  <strong>{formatCompactNumber(card.value)}</strong>
                  <small>{card.change}</small>
                </div>
              </article>
            );
          })}
        </div>

        <article className="admin-panel admin-chart-panel">
          <div className="admin-panel-header">
            <div>
              <p className="admin-panel-kicker">Total Sales</p>
              <h2>Rs. {formatCompactNumber(stats.totalUsers * 1250 + stats.approvedGems * 420)}</h2>
            </div>
            <button type="button" className="admin-panel-filter">
              <Clock size={14} />
              Last Year
              <ChevronDown size={14} />
            </button>
          </div>

          <div className="admin-chart-frame">
            <svg viewBox="0 0 600 220" className="admin-chart-svg" preserveAspectRatio="none" aria-hidden="true">
              <defs>
                <linearGradient id="adminChartFill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="rgba(102, 111, 255, 0.28)" />
                  <stop offset="100%" stopColor="rgba(102, 111, 255, 0)" />
                </linearGradient>
              </defs>
              <path d={`M 0 220 L ${sparkline.area} Z`} fill="url(#adminChartFill)" />
              <polyline points={sparkline.line} fill="none" stroke="#6b73ff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="260" cy="120" r="6" fill="#ff5c6c" />
            </svg>

            <div className="admin-chart-axis">
              {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((month) => (
                <span key={month}>{month}</span>
              ))}
            </div>

            <div className="admin-chart-tooltip">
              <strong>Rs. {formatCompactNumber(stats.approvedGems * 1180 + stats.activeAuctions * 940)}</strong>
              <span>30 June 2026</span>
            </div>
          </div>

          <div className="admin-chart-footer">
            <div>
              <span className="admin-muted-label">Approval rate</span>
              <strong>{dashboardInsights.approvalRate}%</strong>
            </div>
            <div>
              <span className="admin-muted-label">Review queue</span>
              <strong>{dashboardInsights.reviewQueueRate}%</strong>
            </div>
            <div>
              <span className="admin-muted-label">Auction health</span>
              <strong>{dashboardInsights.auctionHealth}%</strong>
            </div>
          </div>
        </article>

        <article className="admin-panel admin-table-panel">
          <div className="admin-panel-header">
            <div>
              <p className="admin-panel-kicker">Recent Order</p>
              <h2>Platform snapshot</h2>
            </div>
          </div>

          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Date</th>
                  <th>Value</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentRows.map((row, index) => (
                  <tr key={row.label} className={index % 2 === 1 ? 'alt' : ''}>
                    <td>#{1900 + index}</td>
                    <td>
                      <div className="admin-table-name">
                        <span className={`admin-table-dot ${row.tone}`} />
                        {row.label}
                      </div>
                    </td>
                    <td>{row.updated}</td>
                    <td>{formatCompactNumber(row.value)}</td>
                    <td>
                      <span className={`admin-status-pill ${row.tone}`}>{row.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </section>

      <aside className="admin-rail-column">
        <article className="admin-rail-card admin-rail-highlight">
          <div className="admin-rail-metric-label">Total Profit</div>
          <div className="admin-rail-metric-value">Rs. {formatCompactNumber(stats.approvedGems * 890 + stats.activeAuctions * 240)}</div>
          <div className="admin-rail-metric-change">+24%</div>
        </article>

        <article className="admin-rail-card">
          <div className="admin-panel-header admin-panel-header-tight">
            <div>
              <p className="admin-panel-kicker">Sale Status</p>
              <h2>Overview</h2>
            </div>
          </div>

          <div
            className="admin-donut"
            style={{
              background: `conic-gradient(${statusBreakdown[0].color} 0 ${statusBreakdown[0].value}%, ${statusBreakdown[1].color} ${statusBreakdown[0].value}% ${statusBreakdown[0].value + statusBreakdown[1].value}%, ${statusBreakdown[2].color} ${statusBreakdown[0].value + statusBreakdown[1].value}% 100%)`,
            }}
          >
            <div className="admin-donut-inner">
              <strong>{dashboardInsights.approvalRate}%</strong>
              <span>Approved</span>
            </div>
          </div>

          <div className="admin-legend-row">
            {statusBreakdown.map((item) => (
              <span key={item.label}>
                <i style={{ background: item.color }} />
                {item.label}
              </span>
            ))}
          </div>
        </article>

        <article className="admin-rail-card admin-illustration-card">
          <div className="admin-illustration">
            <div className="admin-badge-circle red">S</div>
            <div className="admin-badge-circle green">%</div>
            <div className="admin-figure">
              <div className="admin-box" />
              <div className="admin-figure-body" />
            </div>
          </div>
          <div className="admin-rail-copy">
            <h3>PDF Report</h3>
            <p>Download monthly reports and platform summaries.</p>
            <button type="button" className="admin-download-button">
              <ShieldCheck size={16} />
              Download
            </button>
          </div>
        </article>
      </aside>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'pending-gems':
        return <PendingGems onApprove={fetchStatistics} />;
      case 'users':
        return <UserManagement />;
      case 'auctions':
        return <AuctionManagement />;
      default:
        return renderDashboard();
    }
  };

  return (
    <div className="admin-dashboard-page">
      <div className="admin-dashboard-shell">
        <aside className="admin-sidebar">
          <div>
            <div className="admin-brand">
              <div className="admin-brand-mark">e</div>
              <div>
                <div className="admin-brand-name">Commerce</div>
                <div className="admin-brand-subtitle">Admin workspace</div>
              </div>
            </div>

            <div className="admin-sidebar-note">
              <ShieldCheck size={16} />
              {user?.name || 'Administrator'}
            </div>

            <nav className="admin-sidebar-nav" aria-label="Admin navigation">
              {sidebarItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`admin-sidebar-link${isActive ? ' active' : ''}`}
                    onClick={() => setActiveTab(item.id)}
                  >
                    <Icon size={18} />
                    <span>{item.label}</span>
                    {item.id === 'pending-gems' && stats.pendingGems > 0 && (
                      <span className="admin-sidebar-badge">{stats.pendingGems}</span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          <button type="button" className="admin-logout-button" onClick={handleLogout}>
            <LogOut size={16} />
            Logout
          </button>
        </aside>

        <main className="admin-main">
          <header className="admin-topbar">
            <div className="admin-topbar-title-group">
              <h1>Dashboard</h1>
              <p>Platform control panel</p>
            </div>

            <div className="admin-topbar-search">
              <Search size={16} />
              <input type="text" placeholder="Search" aria-label="Search dashboard" />
            </div>

            <div className="admin-topbar-actions">
              <button type="button" className="admin-icon-button" aria-label="Notifications">
                <Bell size={18} />
                <span className="admin-notification-dot" aria-hidden="true" />
              </button>
              <div className="admin-profile-chip">
                <div className="admin-profile-avatar">{user?.name?.charAt(0)?.toUpperCase() || 'A'}</div>
                <div>
                  <strong>{user?.name || 'Admin User'}</strong>
                  <span>Administrator</span>
                </div>
                <ChevronDown size={16} />
              </div>
            </div>
          </header>

          {loading ? (
            <div className="admin-loading-state">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : (
            <div className="admin-content-shell">{renderContent()}</div>
          )}
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;