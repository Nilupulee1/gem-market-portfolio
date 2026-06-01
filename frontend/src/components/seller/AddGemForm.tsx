import { useState } from 'react';
import { Card, Form, Row, Col, Alert } from 'react-bootstrap';
import { Upload, ArrowRight, ArrowLeft, CheckCircle, Gem } from 'lucide-react';
import { gemAPI } from '../../api/axios';
import { AxiosError } from 'axios';

const LISTING_PLACEMENT_FEE_PERCENT = 5; // Kept for potential future use

interface AddGemFormProps {
  onSuccess: () => void;
}

const STEP_LABELS = ['Core Attributes', 'Media & Certificates', 'Listing Settings'];

const AddGemForm = ({ onSuccess }: AddGemFormProps) => {
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 3;

  const [formData, setFormData] = useState({
    gemName: '', type: '', caratWeight: '', cut: '', color: '', origin: '', story: '',
  });

  const [images,               setImages]               = useState<File[]>([]);
  const [certificate,          setCertificate]          = useState<File | null>(null);
  const [certificateAuthority, setCertificateAuthority] = useState('');
  const [imagePreviews,        setImagePreviews]        = useState<string[]>([]);

  const [listingType,      setListingType]      = useState<'portfolio' | 'fixed'>('portfolio');
  const [fixedPrice,       setFixedPrice]       = useState('');
  const [duration,         setDuration]         = useState('7');
  const [portfolioDisplay, setPortfolioDisplay] = useState<'public' | 'private'>('public');
  const [agreeToTerms,     setAgreeToTerms]     = useState(false);

  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });


  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + images.length > 5) { setError('Maximum 5 images allowed'); return; }
    setError(''); setImages([...images, ...files]);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => setImagePreviews(p => [...p, reader.result as string]);
      reader.readAsDataURL(file);
    });
  };

  const handleCertificateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setCertificate(file); setError(''); }
  };

  const removeImage = (i: number) => {
    setImages(images.filter((_, idx) => idx !== i));
    setImagePreviews(imagePreviews.filter((_, idx) => idx !== i));
  };

  const validateStep1 = () => {
    const { gemName, type, caratWeight, cut, color, origin, story } = formData;
    if (!gemName.trim() || !type.trim() || !caratWeight.trim() || !cut.trim() || !color.trim() || !origin.trim() || !story.trim()) {
      setError('Please complete gem name, story, and all core attributes'); return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (images.length === 0)            { setError('Please upload at least one image'); return false; }
    if (!certificate)                   { setError('Please upload the gem certificate'); return false; }
    if (!certificateAuthority.trim())   { setError('Please enter the certificate authority'); return false; }
    return true;
  };

  const nextStep = () => {
    if (currentStep === 1 && !validateStep1()) return;
    if (currentStep === 2 && !validateStep2()) return;
    setError('');
    if (currentStep < totalSteps) setCurrentStep(s => s + 1);
  };

  const prevStep = () => { setError(''); if (currentStep > 1) setCurrentStep(s => s - 1); };

  const handleSubmit = async () => {
    setError(''); setSuccess('');
    if (!agreeToTerms)                            { setError('Please agree to the terms of services'); return; }
    if (listingType === 'fixed' && !fixedPrice)   { setError('Please enter fixed price'); return; }
    if (!validateStep1() || !validateStep2()) return;

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('type', formData.type);
      fd.append('carat', formData.caratWeight);
      fd.append('cut', formData.cut);
      fd.append('clarity', 'VVS1');
      fd.append('color', formData.color);
      fd.append('origin', formData.origin);
      fd.append('description', formData.story);
      fd.append('certificateAuthority', certificateAuthority);
      fd.append('certificateNumber', formData.gemName);
      images.forEach(img => fd.append('images', img));
      fd.append('certificate', certificate!);

      const gemRes = await gemAPI.createGem(fd);
      const createdGem = gemRes.data.gem;
      setSuccess('Gem created successfully!');

      setTimeout(() => onSuccess(), 1500);
    } catch (err) {
      const e = err as AxiosError<{ message: string }>;
      setError(e.response?.data?.message || 'Failed to add gem');
    } finally {
      setLoading(false);
    }
  };

  /* ── Step progress ── */
  const renderProgress = () => {
    const pct = currentStep === 1 ? '0%' : currentStep === 2 ? '50%' : '100%';
    return (
      <div className="mb-4">
        <div className="d-flex justify-content-between align-items-center gap-3 mb-3">
          <div>
            <div className="port-panel-kicker">Listing wizard</div>
            <div className="port-panel-title" style={{ fontSize: 16 }}>Step {currentStep} of {totalSteps}</div>
          </div>
          <div className="port-step-pill">{STEP_LABELS[currentStep - 1]}</div>
        </div>
        <div className="enhanced-step-bar">
          <div className="enhanced-step-progress" style={{ width: pct }} />
          <div className={`enhanced-step-node ${currentStep >= 1 ? 'active' : ''} ${currentStep > 1 ? 'completed' : ''}`}>
            {currentStep > 1 ? '✓' : '1'}
          </div>
          <div className={`enhanced-step-node ${currentStep >= 2 ? 'active' : ''} ${currentStep > 2 ? 'completed' : ''}`}>
            {currentStep > 2 ? '✓' : '2'}
          </div>
          <div className={`enhanced-step-node ${currentStep === 3 ? 'active' : ''}`}>3</div>
        </div>
        <p className="text-muted small mt-2 mb-0">
          Follow the steps to publish your gem with consistent formatting and verification fields.
        </p>
      </div>
    );
  };

  /* ── Step 1 ── */
  const renderStep1 = () => (
    <div className="animate-fade-up">
      <Card className="content-card mb-4">
        <Card.Body className="p-4">
          <h4 className="mb-1 fw-bold">List Your Gem for Verification</h4>
          <p className="text-muted mb-3">Provide core details about your exquisite gem to request verification.</p>
          {renderProgress()}
          {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
        </Card.Body>
      </Card>

      <Card className="content-card animate-fade-up delay-1">
        <Card.Body className="p-4">
          {/* Core attributes */}
          <div className="mb-4">
            <div className="d-flex align-items-center gap-2 mb-1">
              <Gem size={16} style={{ color: 'var(--ag-primary)' }} />
              <h5 className="fw-bold mb-0">Core Attributes</h5>
            </div>
            <p className="text-muted small mb-3">
              Provide the key attributes of your gem — crucial for accurate identification and valuation.
            </p>
            <Row className="g-3">
              {[
                { label: 'Gem Name', name: 'gemName', placeholder: 'e.g. The Azure Ocean Diamond' },
                { label: 'Gem Type', name: 'type',    placeholder: 'Ruby' },
                { label: 'Carat / Weight', name: 'caratWeight', placeholder: '2.5', type: 'number' },
                { label: 'Cut',    name: 'cut',    placeholder: 'Oval'       },
                { label: 'Color',  name: 'color',  placeholder: 'Red'        },
                { label: 'Origin', name: 'origin', placeholder: 'Madagascar' },
              ].map(({ label, name, placeholder, type }) => (
                <Col md={6} key={name}>
                  <Form.Group>
                    <Form.Label className="port-form-label">{label} *</Form.Label>
                    <Form.Control
                      type={type || 'text'}
                      step={type === 'number' ? '0.01' : undefined}
                      name={name}
                      value={formData[name as keyof typeof formData]}
                      onChange={handleChange}
                      placeholder={placeholder}
                      className="port-form-control"
                      required
                    />
                  </Form.Group>
                </Col>
              ))}
            </Row>
          </div>

          {/* Story */}
          <div className="mb-4">
            <h5 className="fw-bold mb-1">The Story</h5>
            <p className="text-muted small mb-3">
              Share the gem's history or unique characteristics. This adds significant value and appeal.
            </p>
            <Form.Control
              as="textarea"
              rows={4}
              name="story"
              value={formData.story}
              onChange={handleChange}
              placeholder="Describe the history, provenance or unique qualities of your gem..."
              className="port-form-control"
            />
          </div>

          <div className="ag-action-row">
            <button className="bdr-btn-ghost" type="button" disabled>Save Draft</button>
            <button className="bdr-btn-primary" type="button" onClick={nextStep}>
              Next: Media <ArrowRight size={15} />
            </button>
          </div>
        </Card.Body>
      </Card>
    </div>
  );

  /* ── Step 2 ── */
  const renderStep2 = () => (
    <div className="animate-fade-up">
      <h4 className="mb-1 fw-bold">Upload Media & Certificates</h4>
      <p className="text-muted mb-4">Upload visual assets and laboratory authentication reports to verify your gem.</p>

      {renderProgress()}
      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}

      <Card className="content-card animate-fade-up delay-1">
        <Card.Body className="p-4">
          {/* Images */}
          <div className="mb-4">
            <div className="d-flex align-items-center gap-2 mb-1">
              <Upload size={16} style={{ color: 'var(--ag-primary)' }} />
              <h5 className="fw-bold mb-0">Gem Visuals</h5>
            </div>
            <p className="text-muted small mb-3">
              Upload high-resolution images (PNG, JPG). Multiple angles increase bid conversion.
            </p>

            <div className="upload-dropzone p-5 text-center">
              <Upload size={44} className="upload-icon-anim mx-auto d-block mb-3" />
              <p className="fw-semibold mb-2" style={{ color: 'var(--ag-text-sub)' }}>
                Click to upload or drag and drop
              </p>
              <p className="text-muted small mb-3">PNG, JPG· up to 5 images</p>
              <Form.Control
                type="file" accept="image/*" multiple
                onChange={handleImageChange} className="d-none" id="imageUpload"
              />
              <label htmlFor="imageUpload" className="bdr-btn-ghost" style={{ cursor: 'pointer' }}>
                Choose Files
              </label>
            </div>

            {imagePreviews.length > 0 && (
              <div className="ag-preview-grid">
                {imagePreviews.map((src, i) => (
                  <div className="ag-preview-item" key={i}>
                    <img src={src} alt={`Preview ${i + 1}`} />
                    <button
                      type="button"
                      className="ag-preview-remove"
                      onClick={() => removeImage(i)}
                      aria-label="Remove image"
                    >×</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Certificate */}
          <div className="mb-4">
            <h5 className="fw-bold mb-1">Authenticity Documents</h5>
            <p className="text-muted small mb-3">
              Upload certificates from recognized labs (GIA, IGI, GRSI, etc.) in PDF or image format.
            </p>

            <div className="upload-dropzone p-5 text-center">
              <Upload size={44} className="upload-icon-anim mx-auto d-block mb-3" />
              <p className="fw-semibold mb-2" style={{ color: 'var(--ag-text-sub)' }}>
                Click to upload gem certificate
              </p>
              <p className="text-muted small mb-3">PDF, JPG, PNG accepted</p>
              <Form.Control
                type="file" accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleCertificateChange} className="d-none" id="certificateUpload"
              />
              <label htmlFor="certificateUpload" className="bdr-btn-ghost" style={{ cursor: 'pointer' }}>
                Choose Certificate
              </label>
            </div>

            {certificate && (
              <div className="ag-cert-success">
                <div className="ag-cert-success-icon">✓</div>
                <span>{certificate.name}</span>
              </div>
            )}
          </div>

          {/* Certificate authority */}
          <div className="mb-2">
            <h5 className="fw-bold mb-1">Certificate Authority / Lab Name</h5>
            <p className="text-muted small mb-3">
              Enter the certifying laboratory exactly as shown on the report.
            </p>
            <Form.Control
              type="text"
              value={certificateAuthority}
              onChange={e => setCertificateAuthority(e.target.value)}
              placeholder="e.g. GIA (Gemological Institute of America)"
              className="port-form-control"
              autoComplete="organization"
              required
            />
          </div>

          <div className="ag-action-row">
            <button className="bdr-btn-ghost" type="button" onClick={prevStep}>
              <ArrowLeft size={15} /> Back
            </button>
            <button className="bdr-btn-primary" type="button" onClick={nextStep}>
              Next: Publication <ArrowRight size={15} />
            </button>
          </div>
        </Card.Body>
      </Card>
    </div>
  );

  /* ── Step 3 ── */
  const renderStep3 = () => (
    <div className="animate-fade-up">
      <h4 className="mb-1 fw-bold">Finalize Your Listing</h4>
      <p className="text-muted mb-4">Configure how you wish to showcase or monetize your premium gem.</p>

      {renderProgress()}
      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}

      {success ? (
        <Card className="content-card animate-fade-up">
          <Card.Body className="ag-success-card">
            <div className="success-checkmark">✓</div>
            <h4 className="fw-bold">Gem Listing Submitted!</h4>
            <p>{success}</p>
          </Card.Body>
        </Card>
      ) : (
        <Card className="content-card animate-fade-up delay-1">
          <Card.Body className="p-4">

            {/* Listing type - Auction removed */}
            <div className="mb-4">
              <h5 className="fw-bold mb-3">Listing Type</h5>
              <Row className="g-3">
                {([
                  { key: 'portfolio', title: 'Portfolio Only',   desc: 'Display in your collection only, not open for public sale' },
                  { key: 'fixed',     title: 'Fixed Price',      desc: 'Set a premium "Buy Now" price for instant buyers' },
                ] as const).map(({ key, title, desc }) => (
                  <Col md={6} key={key}>
                    <div
                      className={`p-4 text-center choice-card h-100 ${listingType === key ? 'active' : ''}`}
                      onClick={() => setListingType(key)}
                      role="button" tabIndex={0}
                      onKeyDown={e => e.key === 'Enter' && setListingType(key)}
                    >
                      <h6 className="fw-bold mb-2">{title}</h6>
                      <small>{desc}</small>
                    </div>
                  </Col>
                ))}
              </Row>
            </div>

            {/* Portfolio settings */}
            {listingType === 'portfolio' && (
              <div className="mb-4 animate-fade-up">
                <h5 className="fw-bold mb-3">Portfolio Settings</h5>
                {([
                  { key: 'public',  title: 'Public Display',  desc: 'Visible to public search engines and users browsing portfolios.' },
                  { key: 'private', title: 'Private Display', desc: 'Only visible in your private secure workspace vault.' },
                ] as const).map(({ key, title, desc }, i) => (
                  <div
                    key={key}
                    className={`p-3 choice-card ${i === 0 ? 'mb-2' : ''} ${portfolioDisplay === key ? 'active' : ''}`}
                    onClick={() => setPortfolioDisplay(key)}
                    role="button" tabIndex={0}
                    onKeyDown={e => e.key === 'Enter' && setPortfolioDisplay(key)}
                  >
                    <h6 className="fw-bold mb-1">{title}</h6>
                    <small>{desc}</small>
                  </div>
                ))}
              </div>
            )}

            {/* Fixed price */}
            {listingType === 'fixed' && (
              <div className="mb-4 animate-fade-up">
                <h5 className="fw-bold mb-3">Fixed Price Details</h5>
                <Row className="g-3">
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="port-form-label">Fixed Price (Rs) *</Form.Label>
                      <Form.Control type="number" value={fixedPrice}
                        onChange={e => setFixedPrice(e.target.value)}
                        placeholder="50000" className="surface-muted" required />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="port-form-label">Listing Duration</Form.Label>
                      <Form.Select value={duration} onChange={e => setDuration(e.target.value)} className="surface-muted">
                        <option value="7">7 Days</option>
                        <option value="14">14 Days</option>
                        <option value="30">30 Days</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>
              </div>
            )}

            {/* Terms */}
            <Form.Check
              type="checkbox" id="terms"
              label="I certify all laboratory certificates, sizes, and declarations are 100% accurate and agree to marketplace seller terms."
              checked={agreeToTerms}
              onChange={e => setAgreeToTerms(e.target.checked)}
              className="mb-4"
            />

            <div className="ag-action-row">
              <button className="bdr-btn-ghost" type="button" onClick={prevStep}>
                <ArrowLeft size={15} /> Back
              </button>
              <button
                className="bdr-btn-primary" type="button"
                onClick={handleSubmit} disabled={loading || !agreeToTerms}
              >
                {loading ? (
                  <><span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" /> Submitting…</>
                ) : (
                  <>List Gemstone <CheckCircle size={15} /></>
                )}
              </button>
            </div>
          </Card.Body>
        </Card>
      )}
    </div>
  );

  return (
    <div className="ag-root">
      {currentStep === 1 && renderStep1()}
      {currentStep === 2 && renderStep2()}
      {currentStep === 3 && renderStep3()}
    </div>
  );
};

export default AddGemForm;