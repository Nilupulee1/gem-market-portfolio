import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../store/authStore';
import { useChatStore } from '../../store/chatStore';
import { UserRole } from '../../types';
import { Home, LogOut, Menu, X } from 'lucide-react';
import logo from '../../assets/logo.png';

const Header = () => {
  const { user, isAuthenticated, logout } = useAuthStore();
  const unreadCount = useChatStore((state) => state.unreadCount);
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getDashboardLink = () => {
    if (!user) return '/';
    switch (user.role) {
      case UserRole.SELLER:
        return '/seller';
      case UserRole.BUYER:
        return '/buyer';
      case UserRole.ADMIN:
        return '/admin';
      default:
        return '/';
    }
  };

  const handleDashboardClick = (e: React.MouseEvent) => {
    e.preventDefault();
    navigate(getDashboardLink());
  };

  const handleBrandClick = (e: React.MouseEvent) => {
    e.preventDefault();
    navigate('/');
    setIsMobileMenuOpen(false);
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    setIsMobileMenuOpen(false);
  };

  const publicNavLinks = [
    { label: 'Gemstones', href: '#featured-gems' },
    { label: 'How It Works', href: '#how-it-works' },
    { label: 'Featured Gems', href: '#featured-gems' },
  ];

  return (
    <header className="lux-nav-wrap">
      <motion.nav
        initial={{ y: -18, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className={`lux-nav ${isScrolled ? 'is-scrolled' : ''}`}
      >
        <a href="/" onClick={handleBrandClick} className="lux-brand-link">
          <img src={logo} alt="GemFolio Logo" className="lux-brand-logo" />
          <span className="lux-brand-text">GemFolio</span>
        </a>

        <button
          type="button"
          onClick={() => setIsMobileMenuOpen((value) => !value)}
          className="lux-mobile-toggle md-hidden"
          aria-label="Toggle menu"
        >
          {isMobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
        </button>

        <div className="lux-nav-actions md-visible">
          {isAuthenticated ? (
            <>
              <a
                href={getDashboardLink()}
                onClick={handleDashboardClick}
                className="lux-nav-link"
              >
                <Home size={16} />
                Dashboard
                {unreadCount > 0 && (
                  <span
                    style={{
                      marginLeft: 8,
                      minWidth: 20,
                      height: 20,
                      borderRadius: 999,
                      padding: '0 6px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: '#ef4444',
                      color: '#fff',
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    {unreadCount}
                  </span>
                )}
                <span className="lux-link-underline" />
              </a>
              <span className="lux-user-chip">
                {user?.name} ({user?.role.toUpperCase()})
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="lux-logout-btn"
              >
                <LogOut size={16} />
                Logout
              </button>
            </>
          ) : (
            <>
              {publicNavLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="lux-nav-link"
                >
                  <span>{link.label}</span>
                  <span className="lux-link-underline" />
                </a>
              ))}
              <button
                type="button"
                onClick={() => handleNavigate('/login')}
                className="lux-login-btn"
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => handleNavigate('/register')}
                className="lux-getstarted-btn"
              >
                Get Started
              </button>
            </>
          )}
        </div>
      </motion.nav>

      {isMobileMenuOpen && (
        <div className="lux-mobile-panel md-hidden">
          {isAuthenticated ? (
            <div className="lux-mobile-list">
              <button
                type="button"
                onClick={() => handleNavigate(getDashboardLink())}
                className="lux-mobile-item"
              >
                Dashboard
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="lux-mobile-item danger"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="lux-mobile-list">
              {publicNavLinks.map((link) => (
                <a key={link.label} href={link.href} className="lux-mobile-item">
                  {link.label}
                </a>
              ))}
              <button
                type="button"
                onClick={() => handleNavigate('/login')}
                className="lux-mobile-item"
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => handleNavigate('/register')}
                className="lux-mobile-primary"
              >
                Get Started
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
};

export default Header;