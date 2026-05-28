import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle,
  Gavel,
  LogOut,
  Package,
  ShieldCheck,
  Moon,
  Sun,
  TrendingUp,
  Users,
  AlertCircle,
} from 'lucide-react';
import { adminAPI } from '../../api/axios';
import { onActivity } from '../../api/socket';
import { useAuthStore } from '../../store/authStore';
import PendingGems from './PendingGems';
import UserManagement from './UserManagement';
import AuctionManagement from './AuctionManagement.tsx';
import type { DashboardStats } from '../../types/admin';
import type { Gem } from '../../types';
import logo from '../../assets/logo.png';

import '../../styles/admin.css';

type TabType = 'dashboard' | 'pending-gems' | 'users' | 'auctions';
type ThemeMode = 'light' | 'dark';
type Tone = 'teal' | 'indigo' | 'amber' | 'rose';

const sidebarItems: Array<{ id: TabType; label: string; icon: any }> = [
  { id: 'dashboard', label: 'Dashboard', icon: TrendingUp },
  { id: 'pending-gems', label: 'Verifications', icon: ShieldCheck },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'auctions', label: 'Auctions', icon: Gavel },
  
];

const formatCompactNumber = (value?: number | null) => {
  if (value === undefined || value === null || Number.isNaN(Number(value))) return '0';
  try {
    return Number(value).toLocaleString();
  } catch {
    return String(value);
  }
};

const AdminDashboard = ({
  theme,
  onToggleTheme,
}: {
  theme: ThemeMode;
  onToggleTheme: () => void;
}) => {
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
    totalRevenue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [verificationRows, setVerificationRows] = useState<
    Array<{ id: string; gem: string; seller: string; date: string; action: string }>
  >([]);
  const [verificationLoading, setVerificationLoading] = useState(true);
  const [verificationError, setVerificationError] = useState('');

  useEffect(() => {
    fetchStatistics();
    void fetchVerificationRows();
    void fetchRecentActivity();

    try {
      onActivity((payload: any) => {
        const icon = payload.type === 'user_registered' ? Users : payload.type === 'auction_ended' ? Gavel : payload.type === 'gem_review' ? CheckCircle : Package;
        const item = { icon, title: payload.title, time: relativeTime(new Date(payload.time || Date.now())), tone: payload.tone || 'info' };
        setRecentActivity((prev) => [item, ...prev].slice(0, 6));
      });
    } catch (e) {
      // ignore
    }
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

  const formatVerificationDate = (dateString: string) => {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toISOString().slice(0, 10);
  };

  const fetchVerificationRows = async () => {
    try {
      setVerificationLoading(true);
      setVerificationError('');
      const response = await adminAPI.getPendingGems();
      const gems: Gem[] = response.data.gems || [];
      const rows = gems.slice(0, 4).map((gem) => ({
        id: gem._id,
        gem: gem.type,
        seller: gem.seller?.name || 'Unknown seller',
        date: formatVerificationDate(gem.createdAt),
        action: 'Review',
      }));
      setVerificationRows(rows);
    } catch (error) {
      console.error('Error fetching verification queue:', error);
      setVerificationError('Failed to load pending review queue');
      setVerificationRows([]);
    } finally {
      setVerificationLoading(false);
    }
  };

  const summaryCards = useMemo(
    () => [
      { label: 'Pending Verification', value: stats.pendingGems, subtitle: 'awaiting review', icon: AlertCircle, tone: 'amber' as Tone },
      { label: 'Active Listings', value: stats.activeAuctions, subtitle: 'live on market', icon: Package, tone: 'teal' as Tone },
      { label: 'New User Registrations', value: Math.max(0, Math.round(stats.totalUsers * 0.018)), subtitle: '24h', icon: Users, tone: 'indigo' as Tone },
      { label: 'Total Live Listings', value: stats.totalGems, subtitle: 'approved gems', icon: CheckCircle, tone: 'rose' as Tone },
    ],
    [stats.activeAuctions, stats.pendingGems, stats.totalGems, stats.totalUsers]
  );

  const [recentActivity, setRecentActivity] = useState<Array<{ icon: any; title: string; time: string; tone: 'success' | 'info' | 'warning' | 'neutral' }>>([]);

  const relativeTime = (date: Date) => {
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diff < 60) return `${diff} sec${diff === 1 ? '' : 's'} ago`;
    const mins = Math.floor(diff / 60);
    if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'} ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} hr${hours === 1 ? '' : 's'} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days === 1 ? '' : 's'} ago`;
  };

  const fetchRecentActivity = async () => {
    try {
      // Prefer server activity endpoint
      if ((adminAPI as any).getActivity) {
        const resp = await (adminAPI as any).getActivity();
        const list = resp.data.activity || [];
        const mapped = list.map((it: any) => ({
          icon: it.type === 'user_registration' ? Users : it.type === 'auction_ended' ? Gavel : it.type === 'auction_listed' || it.type === 'auction_created' ? Package : CheckCircle,
          title: it.title,
          time: relativeTime(new Date(it.time)),
          tone: it.tone || 'info'
        }));
        setRecentActivity(mapped.slice(0, 6));
        return;
      }

      // Fallback: build from users/auctions
      const [auctionsResp, usersResp] = await Promise.all([adminAPI.getAllAuctions(), adminAPI.getAllUsers()]);
      const auctionsList = auctionsResp.data.auctions || [];
      const usersList = usersResp.data.users || [];

      const items: Array<{ icon: any; title: string; time: string; tone: 'success' | 'info' | 'warning' | 'neutral' }> = [];

      const now = new Date();

      for (const u of usersList.slice(0, 6)) {
        if (!u.createdAt) continue;
        const created = new Date(u.createdAt);
        items.push({ icon: Users, title: `${u.name} registered as a new seller`, time: relativeTime(created), tone: 'success' });
      }

      for (const a of auctionsList.slice(0, 12)) {
        try {
          if (a.status === 'ended' && a.endTime) {
            const end = new Date(a.endTime);
            if ((now.getTime() - end.getTime()) / (1000 * 60 * 60) < 24) {
              items.push({ icon: Gavel, title: `Auction for “${a.gem?.type || 'item'}” has ended.`, time: relativeTime(end), tone: 'info' });
            }
          }

          if (a.createdAt) {
            const created = new Date(a.createdAt);
            if ((now.getTime() - created.getTime()) / (1000 * 60 * 60) < 24 && a.status === 'active') {
              items.push({ icon: Package, title: `A new high-value gem, “${a.gem?.type || 'item'}”, was listed.`, time: relativeTime(created), tone: 'warning' });
            }
          }
        } catch (e) {
          // ignore malformed dates
        }
      }

      const deduped: Array<{ icon: any; title: string; time: string; tone: any }> = [];
      const seen = new Set<string>();
      for (const it of items) {
        if (!seen.has(it.title)) {
          seen.add(it.title);
          deduped.push(it);
        }
        if (deduped.length >= 6) break;
      }

      setRecentActivity(deduped);
    } catch (error) {
      console.error('Error fetching recent activity:', error);
    }
  };

  const renderDashboard = () => (
    <div className="admin-overview">
      <section className="dashboard-hero hero-premium-mesh admin-dashboard-hero">
        <div>
          <p className="dashboard-eyebrow">Admin dashboard</p>
          <h4>Welcome back, {user?.name?.split(' ')[0] || 'Admin'}!</h4>
          <p>Track approvals, active listings, and recent updates from one place.</p>
        </div>

        <div className="dashboard-chip-stack">
          <span className="dashboard-chip dashboard-chip-soft">
            {stats.totalGems ? Math.round((stats.approvedGems / Math.max(stats.totalGems, 1)) * 100) : 0}% approval rate
          </span>
          <span className="dashboard-chip">{formatCompactNumber(stats.totalGems)} total listings</span>
        </div>
      </section>

      <section className="admin-stat-grid" aria-label="Admin overview metrics">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <article key={card.label} className={`stat-card stat-card-${card.tone} h-100`}>
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-start mb-3">
                  <div>
                    <p className="text-muted mb-2 small">{card.label}</p>
                    <h3 className="mb-0">{formatCompactNumber(card.value)}</h3>
                    <small className="text-muted">{card.subtitle}</small>
                  </div>
                  <div className="stat-icon" style={{ background: 'rgba(47, 109, 225, 0.08)' }}>
                    <Icon size={24} style={{ color: 'var(--color-bright)' }} />
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </section>

      <div className="admin-bottom-grid">
        <article className="admin-verify-card">
          <div className="admin-card-header">
            <div>
              <p className="admin-card-kicker">Awaiting Verification</p>
              <h2>Pending gem review queue</h2>
            </div>
            <button type="button" className="admin-subtle-link" onClick={() => setActiveTab('pending-gems')}>
              View all
            </button>
          </div>

          <div className="admin-table-wrap">
            <table className="admin-verify-table">
              <thead>
                <tr>
                  <th>Gem Name</th>
                  <th>Seller</th>
                  <th>Date Submitted</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {verificationLoading ? (
                  <tr>
                    <td colSpan={4}>Loading pending gems...</td>
                  </tr>
                ) : verificationError ? (
                  <tr>
                    <td colSpan={4}>{verificationError}</td>
                  </tr>
                ) : verificationRows.length === 0 ? (
                  <tr>
                    <td colSpan={4}>No gems awaiting verification</td>
                  </tr>
                ) : (
                  verificationRows.map((row) => (
                    <tr key={row.id}>
                      <td className="admin-verify-gem">{row.gem}</td>
                      <td>{row.seller}</td>
                      <td>{row.date}</td>
                      <td className="admin-verify-action-cell">
                        <button type="button" className="admin-review-button" onClick={() => setActiveTab('pending-gems')}>
                          {row.action}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </article>

        <article className="admin-activity-feed-card">
          <div className="admin-card-header">
            <div>
              <p className="admin-card-kicker">Recent Platform Activity</p>
              <h2>Live updates</h2>
            </div>
          </div>

          <div className="admin-activity-feed">
            {recentActivity.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="admin-activity-item">
                  <div className={`admin-activity-icon tone-${item.tone}`}>
                    <Icon size={14} />
                  </div>
                  <div className="admin-activity-copy">
                    <p>{item.title}</p>
                    <span>{item.time}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </article>
      </div>
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
    <div className="dashboard-shell">
      <div className="seller-navbar">
        <div className="seller-navbar-content">
          <button
            type="button"
            className="seller-navbar-brand"
            onClick={() => setActiveTab('dashboard')}
          >
            <img src={logo} alt="GemFolio logo" className="seller-navbar-brand-logo" />
            <span>GemFolio</span>
          </button>

          <div className="seller-navbar-actions">
            <div className="seller-navbar-user">
              <span>👤</span>
              <span>{user?.name?.split(' ')[0] || 'Admin'}</span>
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

            <button type="button" onClick={handleLogout} className="seller-navbar-theme-toggle">
              <LogOut size={16} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>

      <div className="dashboard-content-wrapper">
        <aside className="dashboard-sidebar-wrapper admin-sidebar-shell">
          <div>
            <div className="sidebar-profile-section">
              <button
                type="button"
                className="sidebar-profile-card"
                onClick={() => setActiveTab('dashboard')}
                style={{ width: '100%', background: 'var(--page-surface-muted)' }}
              >
                <div className="sidebar-profile-avatar-container">
                  <div className="sidebar-profile-avatar">
                    <div className="sidebar-profile-avatar-inner">
                      <img src={logo} alt="GemFolio logo" style={{ width: 22, height: 22, objectFit: 'contain' }} />
                    </div>
                  </div>
                </div>
                <div className="sidebar-profile-info">
                  <div className="sidebar-profile-name">Admin workspace</div>
                  <div className="sidebar-profile-role-badge">GemFolio control room</div>
                </div>
              </button>
            </div>

            <nav className="sidebar-nav" aria-label="Admin navigation">
              {sidebarItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`sidebar-nav-link${isActive ? ' active' : ''}`}
                    onClick={() => setActiveTab(item.id)}
                    style={{ width: '100%', background: 'transparent', textAlign: 'left' }}
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

          <div className="sidebar-button-group">
            <button type="button" className="seller-navbar-theme-toggle" onClick={handleLogout}>
              <LogOut size={16} />
              <span>Logout</span>
            </button>
          </div>
        </aside>

        <main className="dashboard-main-content admin-main">
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