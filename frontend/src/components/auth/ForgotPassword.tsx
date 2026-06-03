import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authAPI } from '../../api/axios';
import { Eye, EyeOff, Lock, Mail, ArrowLeft } from 'lucide-react';
import { AxiosError } from 'axios';
import { Container, Row, Col, Form, Button, Alert } from 'react-bootstrap';

const ForgotPassword = () => {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'email' | 'reset'>('email');
  const [resetToken, setResetToken] = useState('');

  const navigate = useNavigate();
  const token = searchParams.get('token');

  // If token is in URL, go directly to reset step
  if (token && step === 'email') {
    setStep('reset');
    setResetToken(token);
  }

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await authAPI.forgotPassword({ email });
      setSuccess(
        'If an account exists with this email, a password reset link will be sent shortly.'
      );
      setEmail('');
      // Optionally move to reset step after 2 seconds
      setTimeout(() => {
        // User should check their email for the reset link
      }, 2000);
    } catch (err) {
      const error = err as AxiosError<{ message: string }>;
      setError(error.response?.data?.message || 'Failed to send reset link');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      await authAPI.resetPassword({ token: resetToken, password });
      setSuccess(
        'Password reset successful! Redirecting to login...'
      );
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      const error = err as AxiosError<{ message: string }>;
      setError(error.response?.data?.message || 'Failed to reset password');
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
              <p className="auth-kicker">Account recovery</p>
              <h1 className="auth-visual-title">Reset Your GemFolio Account Password</h1>
              <p className="auth-visual-copy">
                Securely regain access to your account with a simple password reset process.
              </p>
            </div>
            <p className="auth-visual-foot">&copy; {new Date().getFullYear()} GemFolio. All rights reserved.</p>
          </div>
        </Col>

        <Col lg={6} className="d-flex align-items-center justify-content-center auth-form-col">
          <div className="auth-form-wrap">
            <div className="auth-card p-4 p-md-5">
              <Button
                variant="link"
                className="auth-back-btn mb-3"
                onClick={() => navigate('/login')}
              >
                <ArrowLeft size={18} /> Back to Login
              </Button>

              <div className="text-center mb-4">
                <h1 className="h2 fw-bold mt-2 mb-2" style={{ color: 'var(--text-primary)' }}>
                  {step === 'email' ? 'Forgot Password?' : 'Reset Password'}
                </h1>
                <p className="mb-0" style={{ color: 'var(--text-secondary)' }}>
                  {step === 'email'
                    ? 'Enter your email address and we will send you a link to reset your password.'
                    : 'Enter your new password below.'}
                </p>
              </div>

              {error && (
                <Alert variant="danger" dismissible onClose={() => setError('')}>
                  {error}
                </Alert>
              )}

              {success && (
                <Alert variant="success" dismissible onClose={() => setSuccess('')}>
                  {success}
                </Alert>
              )}

              {step === 'email' ? (
                <Form onSubmit={handleRequestReset} className="auth-form-stack">
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-semibold" style={{ color: 'var(--text-primary)' }}>
                      Email Address
                    </Form.Label>
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

                  <Button
                    variant="primary"
                    type="submit"
                    size="lg"
                    className="w-100 fw-semibold"
                    disabled={loading}
                  >
                    {loading ? 'Sending...' : 'Send Reset Link'}
                  </Button>
                </Form>
              ) : (
                <Form onSubmit={handleResetPassword} className="auth-form-stack">
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-semibold" style={{ color: 'var(--text-primary)' }}>
                      New Password
                    </Form.Label>
                    <div className="position-relative">
                      <Lock className="auth-password-icon" size={16} />
                      <Form.Control
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter new password"
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

                  <Form.Group className="mb-4">
                    <Form.Label className="fw-semibold" style={{ color: 'var(--text-primary)' }}>
                      Confirm Password
                    </Form.Label>
                    <div className="position-relative">
                      <Lock className="auth-password-icon" size={16} />
                      <Form.Control
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm new password"
                        required
                        size="lg"
                        className="auth-password-field"
                      />
                      <Button
                        variant="link"
                        className="auth-password-toggle"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        type="button"
                      >
                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </Button>
                    </div>
                  </Form.Group>

                  <Button
                    variant="primary"
                    type="submit"
                    size="lg"
                    className="w-100 fw-semibold"
                    disabled={loading}
                  >
                    {loading ? 'Resetting...' : 'Reset Password'}
                  </Button>
                </Form>
              )}

              <p className="text-center mt-4 mb-0" style={{ color: 'var(--text-secondary)' }}>
                Remember your password?{' '}
                <Button
                  variant="link"
                  className="fw-semibold text-decoration-none p-0"
                  onClick={() => navigate('/login')}
                >
                  Sign In
                </Button>
              </p>
            </div>
          </div>
        </Col>
      </Row>
    </Container>
  );
};

export default ForgotPassword;
