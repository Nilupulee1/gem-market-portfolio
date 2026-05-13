import { useEffect, useRef, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from './store/authStore';
import axiosInstance from './api/axios';
import Header from './components/common/Header';
import Footer from './components/common/Footer';
import ProtectedRoute from './components/common/ProtectedRoute';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import SellerDashboard from './components/seller/SellerDashboard';
import AdminDashboard from './components/admin/AdminDashboard';
import BuyerDashboard from './components/buyer/BuyerDashboard';
import { UserRole } from './types';
import { disconnectSocket, initSocket, onNewMessageNotification } from './api/socket';
import { useChatStore } from './store/chatStore';
import {
  ArrowRight,
  BadgeCheck,
  ChevronRight,
  CreditCard,
  Gavel,
  Headphones,
  Package,
  Quote,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Truck,
  UserCheck,
} from 'lucide-react';
const heroImage = '/images/hero-gems.jpg';
const featuredGemImage = '/images/diamond-1.jpg';

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

const marketplaceFeatures = [
  {
    icon: UserCheck,
    title: 'Verified Sellers',
    description: 'Every seller is reviewed before listing, so every transaction starts with trust.',
  },
  {
    icon: BadgeCheck,
    title: 'Traceable Certificates',
    description: 'Certificates stay attached to the gem record for clear, auditable provenance.',
  },
  {
    icon: Gavel,
    title: 'Secure Bidding',
    description: 'Escrow-backed auctions keep the process fair for both buyers and sellers.',
  },
  {
    icon: Truck,
    title: 'Insured Shipping',
    description: 'Every shipment is protected with tracking and premium handling from dispatch to delivery.',
  },
  {
    icon: CreditCard,
    title: 'Secure Payments',
    description: 'Payment flows are protected with bank-grade controls and simple checkout steps.',
  },
  {
    icon: Headphones,
    title: 'Expert Support',
    description: 'Gemology specialists are ready to guide buyers through high-value purchases.',
  },
];

const featuredGems = [
  {
    id: 'diamond',
    name: 'Brilliant Cut Diamond',
    type: 'Diamond',
    carat: '2.45',
    clarity: 'VVS1',
    color: 'D',
    price: '$45,000',
    badge: 'Certified',
    note: 'Elite Diamonds Co.',
  },
  {
    id: 'ruby',
    name: 'Burmese Ruby',
    type: 'Ruby',
    carat: '3.21',
    clarity: 'Eye Clean',
    color: 'Pigeon Blood',
    price: '$32,000',
    badge: 'Live Auction',
    note: 'Royal Gems Ltd.',
  },
  {
    id: 'sapphire',
    name: 'Kashmir Sapphire',
    type: 'Sapphire',
    carat: '4.12',
    clarity: 'VS',
    color: 'Cornflower Blue',
    price: '$55,000',
    badge: 'Certified',
    note: 'Sapphire House',
  },
  {
    id: 'emerald',
    name: 'Colombian Emerald',
    type: 'Emerald',
    carat: '2.87',
    clarity: 'Minor',
    color: 'Vivid Green',
    price: '$38,000',
    badge: 'Live Auction',
    note: 'Emerald Traders',
  },
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
    title: 'Buy or Bid',
    description: 'Choose a direct purchase or join a secure auction with transparent pricing.',
  },
  {
    icon: Package,
    title: 'Secure Delivery',
    description: 'Receive insured, professionally packaged delivery with a clear handoff trail.',
  },
];

const testimonials = [
  {
    name: 'Sarah Mitchell',
    role: 'Collector',
    initials: 'SM',
    content:
      'GemFolio changed how I buy. The verification process made a major sapphire purchase feel controlled and transparent.',
    purchase: 'Kashmir Blue Sapphire, 5.2ct',
  },
  {
    name: 'James Chen',
    role: 'Jeweler',
    initials: 'JC',
    content:
      'As a professional jeweler, I need reliable sourcing. The seller validation and grading standards are exactly what I needed.',
    purchase: 'Multiple Diamond Purchases',
  },
  {
    name: 'Elena Rodriguez',
    role: 'First-time Buyer',
    initials: 'ER',
    content:
      'The support team explained every step. I felt informed, and the ruby arrived even better than expected.',
    purchase: 'Burmese Ruby, 2.1ct',
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

const HomePage = () => (
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

    <section id="features" className="lux-section">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.25 }}
        transition={{ duration: 0.55 }}
        className="lux-section-heading"
      >
        <p className="lux-section-kicker">Why GemFolio</p>
        <h2 className="lux-section-title">Built for trust, precision, and premium trading</h2>
        <p className="lux-section-copy">
          The platform is designed to feel calm, expensive, and reliable while keeping every core step
          visible to the buyer.
        </p>
      </motion.div>

      <div className="lux-feature-grid">
        {marketplaceFeatures.map((feature, index) => {
          const Icon = feature.icon;
          return (
            <motion.article
              key={feature.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ delay: index * 0.08, duration: 0.5 }}
              whileHover={{ y: -6 }}
              className="lux-feature-card"
            >
              <div className="lux-feature-icon">
                <Icon size={20} />
              </div>
              <h3 className="lux-feature-title">{feature.title}</h3>
              <p className="lux-feature-copy">{feature.description}</p>
            </motion.article>
          );
        })}
      </div>
    </section>

    <section id="featured-gems" className="lux-section lux-section-muted">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.25 }}
        transition={{ duration: 0.55 }}
        className="lux-section-row"
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
        {featuredGems.map((gem, index) => (
          <motion.article
            key={gem.id}
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ delay: index * 0.09, duration: 0.5 }}
            className="lux-gem-card"
          >
            <div className="lux-gem-image-wrap">
              <img src={featuredGemImage} alt={gem.name} className="lux-gem-image" />
              <span className={`lux-gem-badge ${gem.badge === 'Live Auction' ? 'is-live' : ''}`}>
                {gem.badge}
              </span>
            </div>
            <div className="lux-gem-body">
              <div className="lux-gem-head">
                <div>
                  <h3>{gem.name}</h3>
                  <p>{gem.note}</p>
                </div>
                <span className="lux-gem-price">{gem.price}</span>
              </div>

              <div className="lux-gem-specs">
                <span>{gem.type}</span>
                <span>{gem.carat} ct</span>
                <span>{gem.clarity}</span>
                <span>{gem.color}</span>
              </div>

              <Link to="/login" className="lux-card-link">
                View listing
              </Link>
            </div>
          </motion.article>
        ))}
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
        <h2 className="lux-section-title">A clear process from discovery to delivery</h2>
        <p className="lux-section-copy">
          The buying journey is intentionally simple, with each step visible so trust never drops off.
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
              <div className="lux-step-number">0{index + 1}</div>
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

    <section className="lux-section lux-section-muted">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.25 }}
        transition={{ duration: 0.55 }}
        className="lux-section-heading"
      >
        <p className="lux-section-kicker">Trusted by collectors</p>
        <h2 className="lux-section-title">Premium buyers value clarity and confidence</h2>
      </motion.div>

      <div className="lux-testimonial-grid">
        {testimonials.map((testimonial, index) => (
          <motion.article
            key={testimonial.name}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ delay: index * 0.1, duration: 0.5 }}
            className="lux-testimonial-card"
          >
            <Quote className="lux-quote-icon" size={28} />
            <div className="lux-stars">
              {Array.from({ length: 5 }).map((_, starIndex) => (
                <Star key={starIndex} size={14} fill="currentColor" />
              ))}
            </div>
            <p className="lux-testimonial-copy">&quot;{testimonial.content}&quot;</p>
            <p className="lux-testimonial-purchase">Purchased: {testimonial.purchase}</p>
            <div className="lux-testimonial-author">
              <div className="lux-avatar">{testimonial.initials}</div>
              <div>
                <p className="lux-author-name">{testimonial.name}</p>
                <p className="lux-author-role">{testimonial.role}</p>
              </div>
            </div>
          </motion.article>
        ))}
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
        <div>
          <p className="lux-section-kicker">Ready to trade</p>
          <h2 className="lux-cta-title">Join a premium gemstone marketplace built on trust</h2>
          <p className="lux-cta-copy">
            Start as a buyer, seller, or admin and experience a marketplace designed for clarity and
            confidence from the first screen.
          </p>
        </div>
        <div className="lux-cta-actions">
          <Link to="/register" className="lux-btn lux-btn-primary">
            Create account
            <ArrowRight size={16} className="lux-btn-arrow" />
          </Link>
          <Link to="/login" className="lux-btn lux-btn-secondary">
            Sign in
          </Link>
        </div>
      </motion.div>
    </section>

    <Footer />
  </main>
);

function App() {
  const { initAuth, token, user } = useAuthStore();
  const unreadCount = useChatStore((state) => state.unreadCount);
  const initChatState = useChatStore((state) => state.initChatState);
  const incrementUnreadCount = useChatStore((state) => state.incrementUnreadCount);
  const [messageToast, setMessageToast] = useState<{
    senderName?: string;
    preview: string;
    unreadCount: number;
  } | null>(null);
  const hideToastTimerRef = useRef<number | null>(null);

  useEffect(() => {
    initAuth();
    initChatState();
  }, [initAuth, initChatState]);

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
      <AppLayout messageToast={messageToast} unreadCount={unreadCount} isAuthenticated={!!token} />
    </BrowserRouter>
  );
}

const AppLayout = ({
  messageToast,
  unreadCount,
  isAuthenticated,
}: {
  messageToast: { senderName?: string; preview: string; unreadCount: number } | null;
  unreadCount: number;
  isAuthenticated: boolean;
}) => {
  const location = useLocation();
  const isPortalRoute =
    location.pathname.startsWith('/buyer') ||
    location.pathname.startsWith('/seller') ||
    location.pathname.startsWith('/admin');
  const isMessagesRoute = location.pathname.includes('/messages');

  return (
    <div className="min-h-screen market-shell">
      {!isPortalRoute && <Header />}
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route
          path="/seller/*"
          element={
            <ProtectedRoute allowedRoles={[UserRole.SELLER]}>
              <SellerDashboard />
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