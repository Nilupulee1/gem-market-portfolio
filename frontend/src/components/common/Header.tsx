import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../store/authStore';
import { useChatStore } from '../../store/chatStore';
import { UserRole } from '../../types';
import { Home, LogOut } from 'lucide-react';
import logo from '../../assets/logo.png';


const Header = () => {
  const { user, isAuthenticated, logout } = useAuthStore();
  const unreadCount = useChatStore((state) => state.unreadCount);
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleLogout = () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
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

  const handleNavigate = (path: string) => {
    navigate(path);
  };

  const handleBrandClick = (e: React.MouseEvent) => {
    e.preventDefault();
    navigate('/');
  };

  const publicNavLinks = [
    { label: 'Gemstones', href: '/#featured-gems' },
    { label: 'How It Works', href: '/#how-it-works' },
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

        <div className="lux-nav-actions">
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
                        background: 'var(--danger)',
                        color: 'var(--surface-text-on-accent)',
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
                disabled={isLoggingOut}
                className="lux-logout-btn"
                style={{ opacity: isLoggingOut ? 0.6 : 1, cursor: isLoggingOut ? 'not-allowed' : 'pointer' }}
              >
                <LogOut size={16} />
                {isLoggingOut ? 'Signing out...' : 'Logout'}
              </button>
            </>
          ) : (
            <>
              {publicNavLinks.map((link) => (
                <Link
                  key={link.label}
                  to={link.href}
                  className="lux-nav-link"
                >
                  <span>{link.label}</span>
                  <span className="lux-link-underline" />
                </Link>
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
    </header>
  );
};

export default Header;