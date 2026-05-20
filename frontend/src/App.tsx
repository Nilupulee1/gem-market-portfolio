import { useEffect, useRef, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from './store/authStore';
import { gemAPI } from './api/axios';
import axiosInstance from './api/axios';
import Header from './components/common/Header';
import Footer from './components/common/Footer';
import ProtectedRoute from './components/common/ProtectedRoute';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import SellerDashboard from './components/seller/SellerDashboard';
import AdminDashboard from './components/admin/AdminDashboard';
import BuyerDashboard from './components/buyer/BuyerDashboard';
import type { Gem } from './types';
import { UserRole } from './types';
import { disconnectSocket, initSocket, onNewMessageNotification } from './api/socket';
import { useChatStore } from './store/chatStore';
import {
  ArrowRight,
  BadgeCheck,
  ChevronRight,
  Gavel,
  Search,
  ShieldCheck,
  Moon,
  Sparkles,
  Sun,
} from 'lucide-react';
const heroImage = '/images/hero-gems.jpg';
const featuredGemImage = '/images/diamond-1.jpg';
const themeStorageKey = 'gemfolio-theme';

type ThemeMode = 'light' | 'dark';

const getInitialTheme = (): ThemeMode => {
  if (typeof window === 'undefined') {
    return 'light';
  }

  const storedTheme = window.localStorage.getItem(themeStorageKey);
  if (storedTheme === 'light' || storedTheme === 'dark') {
    return storedTheme;
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const applyTheme = (theme: ThemeMode) => {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
};

const stats = [
  { value: '10,000+', label: 'Verified Gems' },
  { value: '$50M+', label: 'Total Traded' },
  { value: '500+', label: 'Verified Sellers' },
  { value: '99.8%', label: 'Satisfaction Rate' },
];

const heroFeatures = [
  { icon: ShieldCheck, label: 'Verified Sellers' },
  { icon: BadgeCheck, label: 'Traceable Certificates' },
  { icon: Gavel, label: 'Secure Bidding' },
];



const steps = [
  {
    icon: Search,
    title: 'Browse & Discover',
    description: 'Explore a curated collection of certified gemstones and filter by what matters most.',
  },
  {
    icon: ShieldCheck,
    title: 'Verify Authenticity',
    description: 'Review certificates, seller records, and gem details before you place a bid.',
  },
  {
    icon: Gavel,
    title: 'Review and Connect',
    description: 'Review the listing, verify the certificate, and connect with the seller for next steps.',
  },

];


const homeVariants = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.75, staggerChildren: 0.14 },
  },
};

const sectionVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55 } },
};

interface HomePageProps {
  featuredGems: Gem[];
  featuredGemsLoading: boolean;
}

const HomePage = ({ featuredGems, featuredGemsLoading }: HomePageProps) => (
  <main className="lux-home">
    <section className="lux-hero-section lux-hero-bg" style={{ backgroundImage: `url(${heroImage})` }}>
      <div className="lux-hero-overlay" aria-hidden="true" />

      <motion.div className="lux-hero-grid" variants={homeVariants} initial="hidden" animate="show">
        <div>
          <motion.div variants={sectionVariants} className="lux-eyebrow">
            <Sparkles size={14} className="lux-eyebrow-icon" />
            Premium verified marketplace
          </motion.div>

          <motion.h1 variants={sectionVariants} className="lux-hero-title">
            The Trusted Marketplace For{' '}
            <span className="lux-gold-text">certified gemstones</span>
          </motion.h1>

          <motion.p variants={sectionVariants} className="lux-hero-copy">
            Trade exceptional gems with confidence through transparent verification, secure bidding,
            and curated high-value listings built for discerning buyers and sellers.
          </motion.p>

          <motion.div variants={sectionVariants} className="lux-cta-row">
            <Link to="/register" className="lux-btn lux-btn-primary">
              Get Started
              <ArrowRight size={16} className="lux-btn-arrow" />
            </Link>
            <Link to="/login" className="lux-btn lux-btn-secondary">
              Sign In
            </Link>
          </motion.div>

          <motion.div variants={sectionVariants} className="lux-pill-row">
            {heroFeatures.map((feature) => {
              const Icon = feature.icon;
              return (
                <span key={feature.label} className="lux-pill">
                  <Icon size={14} />
                  {feature.label}
                </span>
              );
            })}
          </motion.div>

          <motion.div variants={sectionVariants} className="lux-stat-grid">
            {stats.map((stat) => (
              <article key={stat.label} className="lux-stat-card">
                <p className="lux-stat-value">{stat.value}</p>
                <p className="lux-stat-label">{stat.label}</p>
              </article>
            ))}
          </motion.div>
        </div>

      </motion.div>
    </section>

    

    <section id="featured-gems" className="lux-section lux-section-muted">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.25 }}
        transition={{ duration: 0.55 }}
        className="lux-section-row lux-section-row-center"
      >
        <div>
          <p className="lux-section-kicker">Featured gems</p>
          <h2 className="lux-section-title">Curated stones from verified sellers</h2>
        </div>
        <Link to="/register" className="lux-inline-link">
          Request access
          <ChevronRight size={16} />
        </Link>
      </motion.div>

      <div className="lux-gem-grid">
        {featuredGemsLoading ? (
          <div className="lux-gem-empty-state">Loading gem details from the database...</div>
        ) : featuredGems.length === 0 ? (
          <div className="lux-gem-empty-state">No approved gems are available yet.</div>
        ) : (
          featuredGems.map((gem, index) => {
            const imageUrl = gem.images?.[0] || featuredGemImage;
            const badgeLabel = gem.certificate?.authority || 'Certified';

            return (
              <motion.article
                key={gem._id}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ delay: index * 0.09, duration: 0.5 }}
                className="lux-gem-card"
              >
                <div className="lux-gem-image-wrap">
                  <img src={imageUrl} alt={gem.type} className="lux-gem-image" />
                  <span className="lux-gem-badge">{badgeLabel}</span>
                </div>
                <div className="lux-gem-body">
                  <div className="lux-gem-head">
                    <div>
                      <h3>{gem.type}</h3>
                      <p>{gem.seller?.name || 'Verified seller'}</p>
                    </div>
                    <span className="lux-gem-price">{gem.status}</span>
                  </div>

                  <div className="lux-gem-specs">
                    <span>{gem.type}</span>
                    <span>{gem.carat} ct</span>
                    <span>{gem.cut}</span>
                    <span>{gem.clarity}</span>
                  </div>

                  <p className="lux-gem-summary">
                    {gem.color} origin: {gem.origin}
                  </p>

                  <Link to="/login" className="lux-card-link">
                    View listing
                  </Link>
                </div>
              </motion.article>
            );
          })
        )}
      </div>
    </section>

    <section id="how-it-works" className="lux-section">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.25 }}
        transition={{ duration: 0.55 }}
        className="lux-section-heading"
      >
        <p className="lux-section-kicker">How it works</p>
        <h2 className="lux-section-title">A clear process from discovery to seller contact</h2>
        <p className="lux-section-copy">
          The browsing journey is intentionally simple, with each step visible so trust never drops off.
        </p>
      </motion.div>

      <div className="lux-step-grid">
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <motion.article
              key={step.title}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              className="lux-step-card"
            >
              <div className="lux-step-icon">
                <Icon size={22} />
              </div>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </motion.article>
          );
        })}
      </div>
    </section>

    <section className="lux-cta-section">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.25 }}
        transition={{ duration: 0.5 }}
        className="lux-cta-panel"
      >
        <div className="lux-cta-content">
          <p className="lux-section-kicker">Ready to trade</p>
          <h2 className="lux-cta-title">Join a premium gemstone marketplace built on trust</h2>
          <p className="lux-cta-copy">
            Start as a buyer, seller, or admin and experience a marketplace designed for clarity and
            confidence from the first screen.
          </p>
          <div className="lux-cta-actions">
            <Link to="/register" className="lux-btn lux-btn-primary">
              Create account
              <ArrowRight size={16} className="lux-btn-arrow" />
            </Link>
            <Link to="/login" className="lux-btn lux-btn-secondary">
              Sign in
            </Link>
          </div>
        </div>
        <div className="lux-cta-divider" />
        <Footer />
      </motion.div>
    </section>
  </main>
);

function App() {
  const { initAuth, token, user } = useAuthStore();
  const unreadCount = useChatStore((state) => state.unreadCount);
  const initChatState = useChatStore((state) => state.initChatState);
  const incrementUnreadCount = useChatStore((state) => state.incrementUnreadCount);
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme);
  const [featuredGems, setFeaturedGems] = useState<Gem[]>([]);
  const [featuredGemsLoading, setFeaturedGemsLoading] = useState(true);
  const [messageToast, setMessageToast] = useState<{
    senderName?: string;
    preview: string;
    unreadCount: number;
  } | null>(null);
  const hideToastTimerRef = useRef<number | null>(null);

  useEffect(() => {
    applyTheme(theme);
    window.localStorage.setItem(themeStorageKey, theme);
  }, [theme]);

  useEffect(() => {
    initAuth();
    initChatState();
  }, [initAuth, initChatState]);

  useEffect(() => {
    let isMounted = true;

    const loadFeaturedGems = async () => {
      setFeaturedGemsLoading(true);

      try {
        const response = await gemAPI.getApprovedGems();
        if (!isMounted) {
          return;
        }

        setFeaturedGems((response.data?.gems || []).slice(0, 4));
      } catch (error) {
        console.error('Failed to load featured gems:', error);
        if (isMounted) {
          setFeaturedGems([]);
        }
      } finally {
        if (isMounted) {
          setFeaturedGemsLoading(false);
        }
      }
    };

    loadFeaturedGems();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!token) {
      disconnectSocket();
      return;
    }

    initChatState();
    const currentSocket = initSocket(token);

    const loadUnreadCount = async () => {
      try {
        const response = await axiosInstance.get('/chat/unread/count');
        useChatStore.getState().setUnreadCount(Number(response.data.unreadCount || 0));
      } catch (error) {
        console.error('Failed to load unread message count:', error);
      }
    };

    loadUnreadCount();

    const handleIncomingNotification = (data: {
      senderId: string;
      senderName?: string;
      preview: string;
    }) => {
      incrementUnreadCount();
      const nextUnreadCount = useChatStore.getState().unreadCount;
      window.dispatchEvent(new Event('chat:refresh-conversations'));
      setMessageToast({
        senderName: data.senderName || 'New message',
        preview: data.preview,
        unreadCount: nextUnreadCount,
      });

      if (hideToastTimerRef.current) {
        window.clearTimeout(hideToastTimerRef.current);
      }

      hideToastTimerRef.current = window.setTimeout(() => {
        setMessageToast(null);
      }, 4500);
    };

    onNewMessageNotification(handleIncomingNotification);

    return () => {
      if (hideToastTimerRef.current) {
        window.clearTimeout(hideToastTimerRef.current);
        hideToastTimerRef.current = null;
      }
      currentSocket.disconnect();
    };
  }, [token, user?.id, incrementUnreadCount, initChatState]);

  return (
    <BrowserRouter>
      <AppLayout
        messageToast={messageToast}
        unreadCount={unreadCount}
        isAuthenticated={!!token}
        theme={theme}
        featuredGems={featuredGems}
        featuredGemsLoading={featuredGemsLoading}
        onToggleTheme={() => setTheme((currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark'))}
      />
    </BrowserRouter>
  );
}

const AppLayout = ({
  messageToast,
  unreadCount,
  isAuthenticated,
  theme,
  featuredGems,
  featuredGemsLoading,
  onToggleTheme,
}: {
  messageToast: { senderName?: string; preview: string; unreadCount: number } | null;
  unreadCount: number;
  isAuthenticated: boolean;
  theme: ThemeMode;
  featuredGems: Gem[];
  featuredGemsLoading: boolean;
  onToggleTheme: () => void;
}) => {
  const location = useLocation();
  const isPortalRoute =
    location.pathname.startsWith('/buyer') ||
    location.pathname.startsWith('/seller') ||
    location.pathname.startsWith('/admin');
  const isSellerRoute = location.pathname.startsWith('/seller');
  const isMessagesRoute = location.pathname.includes('/messages');

  useEffect(() => {
    if (!location.hash) {
      return;
    }

    const targetId = location.hash.replace('#', '');
    const targetElement = document.getElementById(targetId);

    if (!targetElement) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [location.hash, location.pathname]);

  return (
    <div className="min-h-screen market-shell">
      {isPortalRoute && !isSellerRoute && (
        <button
          type="button"
          onClick={onToggleTheme}
          className="theme-toggle"
          style={{ top: 16 }}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
        </button>
      )}

      {!isPortalRoute && (
        <Header theme={theme} onToggleTheme={onToggleTheme} />
      )}
      <Routes>
        <Route path="/" element={<HomePage featuredGems={featuredGems} featuredGemsLoading={featuredGemsLoading} />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route
          path="/seller/*"
          element={
            <ProtectedRoute allowedRoles={[UserRole.SELLER]}>
              <SellerDashboard theme={theme} onToggleTheme={onToggleTheme} />
            </ProtectedRoute>
          }
        />

        <Route
          path="/buyer/*"
          element={
            <ProtectedRoute allowedRoles={[UserRole.BUYER]}>
              <BuyerDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/*"
          element={
            <ProtectedRoute allowedRoles={[UserRole.ADMIN]}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {isAuthenticated && messageToast && !isMessagesRoute && (
        <div
          style={{
            position: 'fixed',
            right: 20,
            bottom: 20,
            zIndex: 1050,
            width: 'min(360px, calc(100vw - 32px))',
            background: 'rgba(8, 18, 35, 0.96)',
            color: '#fff',
            borderRadius: 16,
            padding: '14px 16px',
            boxShadow: '0 18px 50px rgba(0, 0, 0, 0.28)',
            border: '1px solid rgba(148, 163, 184, 0.24)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <div className="d-flex align-items-start justify-content-between gap-3">
            <div>
              <div style={{ fontSize: 12, letterSpacing: 0.4, textTransform: 'uppercase', opacity: 0.7 }}>
                New message
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, marginTop: 4 }}>
                {messageToast.senderName}
              </div>
              <div style={{ fontSize: 14, opacity: 0.9, marginTop: 4 }}>
                {messageToast.preview}
              </div>
            </div>
            <div
              style={{
                minWidth: 34,
                height: 34,
                borderRadius: 999,
                display: 'grid',
                placeItems: 'center',
                background: 'linear-gradient(135deg, #4b84f8, #38bdf8)',
                color: '#fff',
                fontWeight: 800,
                fontSize: 14,
              }}
            >
              {unreadCount}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;