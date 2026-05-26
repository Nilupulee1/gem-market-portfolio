import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { authAPI } from '../../api/axios';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { AxiosError } from 'axios';
import { Container, Row, Col, Form, Button, Alert } from 'react-bootstrap';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authAPI.login({ email, password });
      const { user, token } = response.data;
      setAuth(user, token);

      switch (user.role) {
        case 'seller':
          navigate('/seller');
          break;
        case 'buyer':
          navigate('/buyer');
          break;
        case 'admin':
          navigate('/admin');
          break;
        default:
          navigate('/');
      }
    } catch (err) {
      const error = err as AxiosError<{ message: string }>;
      setError(error.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };



  return (
    <Container fluid className="auth-container p-0">
      <Row className="g-0 min-vh-100">
        <Col lg={6} className="d-none d-lg-block position-relative overflow-hidden auth-visual-col">
          <img src="/images/auth-bg.jpg" alt="Luxury gemstones" className="auth-visual-image" />
          <div className="auth-visual-overlay" />
          <div className="auth-visual-content">
            <div>
              <p className="auth-kicker">Buyer and seller access</p>
              <h1 className="auth-visual-title">Secure Sign In for the GemFolio Marketplace</h1>
              <p className="auth-visual-copy">
                Continue to your verified account and manage listings, bidding, and portfolio data in one place.
              </p>
            </div>
            <p className="auth-visual-foot">&copy; {new Date().getFullYear()} GemFolio. All rights reserved.</p>
          </div>
        </Col>

        <Col lg={6} className="d-flex align-items-center justify-content-center auth-form-col">
          <div className="auth-form-wrap">
            <div className="auth-card p-4 p-md-5">
              <div className="text-center mb-4">
                <h1 className="h2 fw-bold mt-2 mb-2" style={{ color: 'var(--text-primary)' }}>Sign In</h1>
                <p className="mb-0" style={{ color: 'var(--text-secondary)' }}>
                  Enter your credentials to access your account.
                </p>
              </div>

              {error && (
                <Alert variant="danger" dismissible onClose={() => setError('')}>
                  {error}
                </Alert>
              )}

              <Form onSubmit={handleSubmit} className="auth-form-stack">
                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold" style={{ color: 'var(--text-primary)' }}>Email Address</Form.Label>
                  <div className="auth-input-wrap">
                    <Mail size={16} className="auth-input-icon" />
                    <Form.Control
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      required
                      size="lg"
                    />
                  </div>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold" style={{ color: 'var(--text-primary)' }}>Password</Form.Label>
                  <div className="position-relative">
                    <Lock className="auth-password-icon" size={16} />
                    <Form.Control
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      required
                      size="lg"
                      className="auth-password-field"
                    />
                    <Button
                      variant="link"
                      className="auth-password-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                      type="button"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </Button>
                  </div>
                </Form.Group>

                <div className="d-flex align-items-center justify-content-between mb-4 auth-meta-row">
                  <Form.Check
                    type="checkbox"
                    id="remember"
                    label="Remember me for 30 days"
                    checked={rememberMe}
                    onChange={(event) => setRememberMe(event.target.checked)}
                    className="auth-remember-check"
                  />
                  <Button
                    variant="link"
                    className="auth-mini-btn p-0"
                    onClick={() => navigate('/forgot-password')}
                    style={{ color: 'var(--primary-color)', textDecoration: 'none', fontSize: '0.875rem' }}
                  >
                    Forgot password?
                  </Button>
                </div>

                <Button
                  variant="primary"
                  type="submit"
                  size="lg"
                  className="w-100 fw-semibold"
                  disabled={loading}
                >
                  {loading ? 'Signing in...' : 'Sign In'}
                </Button>
              </Form>



              <p className="text-center mt-4 mb-0" style={{ color: 'var(--text-secondary)' }}>
                Don't have an account?{' '}
                <Link to="/register" className="fw-semibold text-decoration-none">
                  Sign Up
                </Link>
              </p>
            </div>
          </div>
        </Col>
      </Row>
    </Container>
  );
};

export default Login;