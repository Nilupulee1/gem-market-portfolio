import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { authAPI } from '../../api/axios';
import { Eye, EyeOff, Lock, Mail, User } from 'lucide-react';
import { UserRole } from '../../types';
import { AxiosError } from 'axios';
import { Container, Row, Col, Form, Button, Alert } from 'react-bootstrap';

import logo from '../../assets/logo.png';


const Register = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: UserRole.BUYER as UserRole,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRoleChange = (role: UserRole) => {
    setFormData({ ...formData, role });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      const registerData = {
        name: `${formData.firstName} ${formData.lastName}`,
        email: formData.email,
        password: formData.password,
        role: formData.role,
      };

      const response = await authAPI.register(registerData);
      const { user, token } = response.data;
      setAuth(user, token);

      switch (user.role) {
        case UserRole.SELLER:
          navigate('/seller');
          break;
        case UserRole.BUYER:
          navigate('/buyer');
          break;
        default:
          navigate('/');
      }
    } catch (err) {
      const error = err as AxiosError<{ message: string }>;
      setError(error.response?.data?.message || 'Registration failed');
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
              <p className="auth-kicker">Create your verified account</p>
              <h1 className="auth-visual-title">Join a Trusted Marketplace for Certified Gems</h1>
              <p className="auth-visual-copy">
                Build your buyer or seller profile to access secure transactions and curated gemstone portfolios.
              </p>
            </div>
            <div className="auth-stat-grid">
              <div className="auth-stat-card">
                <p className="auth-stat-value">10K+</p>
                <p className="auth-stat-label">Verified Gems</p>
              </div>
              <div className="auth-stat-card">
                <p className="auth-stat-value">500+</p>
                <p className="auth-stat-label">Trusted Sellers</p>
              </div>
            </div>
            <p className="auth-visual-foot">&copy; {new Date().getFullYear()} GemFolio. All rights reserved.</p>
          </div>
        </Col>

        <Col lg={6} className="d-flex align-items-center justify-content-center auth-form-col">
          <div className="auth-form-wrap">
            <div className="auth-mobile-brand d-lg-none mb-4">
              <Link to="/" className="auth-brand-link">
                <img src={logo} alt="GemFolio" className="auth-brand-logo" />
                <span className="auth-brand-name">GemFolio</span>
              </Link>
            </div>

            <div className="auth-card p-4 p-md-5">
              <div className="text-center mb-4">
                <h2 className="h2 fw-bold mt-2 mb-2" style={{ color: '#1c2a3b' }}>Create Account</h2>
                <p className="mb-0" style={{ color: '#687585' }}>
                  Enter your information to get started.
                </p>
              </div>

              {error && (
                <Alert variant="danger" dismissible onClose={() => setError('')}>
                  {error}
                </Alert>
              )}

              <Form onSubmit={handleSubmit} className="auth-form-stack">
                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold" style={{ color: '#2f3d4f' }}>First Name</Form.Label>
                  <div className="auth-input-wrap">
                    <User size={16} className="auth-input-icon" />
                    <Form.Control
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      placeholder="Enter your first name"
                      required
                      size="lg"
                    />
                  </div>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold" style={{ color: '#2f3d4f' }}>Last Name</Form.Label>
                  <div className="auth-input-wrap">
                    <User size={16} className="auth-input-icon" />
                    <Form.Control
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      placeholder="Enter your last name"
                      required
                      size="lg"
                    />
                  </div>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold" style={{ color: '#2f3d4f' }}>Email</Form.Label>
                  <div className="auth-input-wrap">
                    <Mail size={16} className="auth-input-icon" />
                    <Form.Control
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="name@example.com"
                      required
                      size="lg"
                    />
                  </div>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold" style={{ color: '#2f3d4f' }}>Password</Form.Label>
                  <div className="position-relative">
                    <Lock size={16} className="auth-password-icon" />
                    <Form.Control
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Create password"
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
                  <Form.Text className="text-muted">Must be at least 8 characters.</Form.Text>
                </Form.Group>

                <Form.Group className="mb-4">
                  <Form.Label className="fw-semibold" style={{ color: '#2f3d4f' }}>Select your role</Form.Label>
                  <Row className="g-3">
                    <Col xs={6}>
                      <div
                        className={`role-button p-3 rounded text-center ${
                          formData.role === UserRole.BUYER ? 'active' : ''
                        }`}
                        onClick={() => handleRoleChange(UserRole.BUYER)}
                        role="button"
                        tabIndex={0}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            handleRoleChange(UserRole.BUYER);
                          }
                        }}
                      >
                        Buyer
                      </div>
                    </Col>
                    <Col xs={6}>
                      <div
                        className={`role-button p-3 rounded text-center ${
                          formData.role === UserRole.SELLER ? 'active' : ''
                        }`}
                        onClick={() => handleRoleChange(UserRole.SELLER)}
                        role="button"
                        tabIndex={0}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            handleRoleChange(UserRole.SELLER);
                          }
                        }}
                      >
                        Collector/Seller
                      </div>
                    </Col>
                  </Row>
                </Form.Group>

                <Button
                  variant="primary"
                  type="submit"
                  size="lg"
                  className="w-100 fw-semibold"
                  disabled={loading}
                >
                  {loading ? 'Creating Account...' : 'Sign Up'}
                </Button>
              </Form>

              <p className="text-center mt-4 mb-0" style={{ color: '#647182' }}>
                Already have an account?{' '}
                <Link to="/login" className="fw-semibold text-decoration-none">
                  Sign In
                </Link>
              </p>
            </div>
          </div>
        </Col>
      </Row>
    </Container>
  );
};

export default Register;
