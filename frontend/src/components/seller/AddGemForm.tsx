import { useState } from 'react';
import { Card, Form, Button, Row, Col, Alert } from 'react-bootstrap';
import { Upload } from 'lucide-react';
import { gemAPI, auctionAPI } from '../../api/axios';
import { AxiosError } from 'axios';

interface AddGemFormProps {
  onSuccess: () => void;
}

const AddGemForm = ({ onSuccess }: AddGemFormProps) => {
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 3;

  // Step 1: Core Attributes
  const [formData, setFormData] = useState({
    gemName: '',
    type: '',
    caratWeight: '',
    cut: '',
    color: '',
    origin: '',
    story: '',
  });

  // Step 2: Media Upload
  const [images, setImages] = useState<File[]>([]);
  const [certificate, setCertificate] = useState<File | null>(null);
  const [certificateAuthority, setCertificateAuthority] = useState('');
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  // Step 3: Listing Type
  const [listingType, setListingType] = useState<'portfolio' | 'fixed' | 'auction'>('portfolio');
  const [fixedPrice, setFixedPrice] = useState('');
  const [auctionStartingBid, setAuctionStartingBid] = useState('');
  const [minimumBidIncrement, setMinimumBidIncrement] = useState('');
  const [duration, setDuration] = useState('7');
  const [startDate, setStartDate] = useState('');
  const [portfolioDisplay, setPortfolioDisplay] = useState<'public' | 'private'>('public');
  const [agreeToTerms, setAgreeToTerms] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + images.length > 5) {
      setError('Maximum 5 images allowed');
      return;
    }

    setError('');
    setImages([...images, ...files]);
    
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleCertificateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCertificate(file);
      setError('');
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
    setImagePreviews(imagePreviews.filter((_, i) => i !== index));
  };

  const nextStep = () => {
    if (currentStep === 1) {
      // Validate Step 1
      if (!formData.type || !formData.caratWeight || !formData.cut || !formData.color || !formData.origin) {
        setError('Please fill all required fields');
        return;
      }
    }
    
    if (currentStep === 2) {
      // Validate Step 2
      if (images.length === 0) {
        setError('Please upload at least one image');
        return;
      }
      if (!certificate) {
        setError('Please upload the gem certificate');
        return;
      }
    }

    setError('');
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    setError('');
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setError('');
    setSuccess('');

    if (!agreeToTerms) {
      setError('Please agree to the terms of services');
      return;
    }

    // Validate based on listing type
    if (listingType === 'auction' && !auctionStartingBid) {
      setError('Please enter starting bid for auction');
      return;
    }

    if (listingType === 'fixed' && !fixedPrice) {
      setError('Please enter fixed price');
      return;
    }

    setLoading(true);

    try {
      // Step 1: Create the gem
      const formDataToSend = new FormData();
      
      formDataToSend.append('type', formData.type);
      formDataToSend.append('carat', formData.caratWeight);
      formDataToSend.append('cut', formData.cut);
      formDataToSend.append('clarity', 'VVS1');
      formDataToSend.append('color', formData.color);
      formDataToSend.append('origin', formData.origin);
      formDataToSend.append('description', formData.story);
      formDataToSend.append('certificateAuthority', certificateAuthority);
      formDataToSend.append('certificateNumber', formData.gemName);

      images.forEach(image => {
        formDataToSend.append('images', image);
      });

      formDataToSend.append('certificate', certificate!);

      const gemResponse = await gemAPI.createGem(formDataToSend);
      const createdGem = gemResponse.data.gem;

      setSuccess('Gem created successfully!');

      // Step 2: Create auction if listing type is auction
      if (listingType === 'auction' && createdGem._id) {
        const startTime = startDate ? new Date(startDate) : new Date();
        const endTime = new Date(startTime);
        endTime.setDate(endTime.getDate() + parseInt(duration));

        const auctionData = {
          gemId: createdGem._id,
          startPrice: parseFloat(auctionStartingBid),
          minimumBidIncrement: parseFloat(minimumBidIncrement || '1000'),
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString()
        };

        await auctionAPI.createAuction(auctionData);
        setSuccess('Gem and auction created successfully!');
      }

      setTimeout(() => {
        onSuccess();
      }, 1500);
      
    } catch (err) {
      const error = err as AxiosError<{ message: string }>;
      setError(error.response?.data?.message || 'Failed to add gem');
    } finally {
      setLoading(false);
    }
  };

  const renderStepProgress = () => {
    const progressWidth = currentStep === 1 ? '0%' : currentStep === 2 ? '50%' : '100%';
    const stepLabel = currentStep === 1 ? 'Core Attributes' : currentStep === 2 ? 'Media and Verification Assets' : 'Listing and Publication Settings';
    return (
      <div className="mb-4">
        <div className="enhanced-step-bar my-3">
          <div className="enhanced-step-progress" style={{ width: progressWidth }} />
          <div className={`enhanced-step-node ${currentStep >= 1 ? 'active' : ''} ${currentStep > 1 ? 'completed' : ''}`}>
            {currentStep > 1 ? '✓' : '1'}
          </div>
          <div className={`enhanced-step-node ${currentStep >= 2 ? 'active' : ''} ${currentStep > 2 ? 'completed' : ''}`}>
            {currentStep > 2 ? '✓' : '2'}
          </div>
          <div className={`enhanced-step-node ${currentStep === 3 ? 'active' : ''}`}>
            3
          </div>
        </div>
        <div className="d-flex justify-content-between align-items-center px-1">
          <span className="text-muted small">Step {currentStep} of 3: {stepLabel}</span>
        </div>
      </div>
    );
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="animate-fade-up">
            <h4 className="mb-1 fw-bold">List Your Gem for Verification</h4>
            <p className="text-muted mb-3">Provide core details about your exquisite gem to request verification.</p>

            {renderStepProgress()}

            {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}

            <Card className="content-card animate-fade-up delay-1">
              <Card.Body className="p-4">
                <div className="mb-4">
                  <h5 className="fw-bold mb-3">Core Attributes</h5>
                  <p className="text-muted small">
                    Provide the key core attributes of your gem. This information is crucial for accurate identification and valuation.
                  </p>

                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Gem Name: *</Form.Label>
                        <Form.Control
                          type="text"
                          name="gemName"
                          value={formData.gemName}
                          onChange={handleChange}
                          placeholder="e.g The Azure Ocean Diamond"
                          className="surface-muted"
                          required
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Gem Type: *</Form.Label>
                        <Form.Control
                          type="text"
                          name="type"
                          value={formData.type}
                          onChange={handleChange}
                          placeholder="Ruby"
                          className="surface-muted"
                          required
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Carat/Weight: *</Form.Label>
                        <Form.Control
                          type="number"
                          step="0.01"
                          name="caratWeight"
                          value={formData.caratWeight}
                          onChange={handleChange}
                          placeholder="e.g 2.5"
                          className="surface-muted"
                          required
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Cut: *</Form.Label>
                        <Form.Control
                          type="text"
                          name="cut"
                          value={formData.cut}
                          onChange={handleChange}
                          placeholder="Oval"
                          className="surface-muted"
                          required
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Color: *</Form.Label>
                        <Form.Control
                          type="text"
                          name="color"
                          value={formData.color}
                          onChange={handleChange}
                          placeholder="Red"
                          className="surface-muted"
                          required
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Origin: *</Form.Label>
                        <Form.Control
                          type="text"
                          name="origin"
                          value={formData.origin}
                          onChange={handleChange}
                          placeholder="Madagascar"
                          className="surface-muted"
                          required
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                </div>

                <div className="mb-4">
                  <h5 className="fw-bold mb-3">The story</h5>
                  <p className="text-muted small">
                    Share the gem's romantic history, or unique characteristics. The adds significant value and appeal.
                  </p>
                  <Form.Control
                    as="textarea"
                    rows={4}
                    name="story"
                    value={formData.story}
                    onChange={handleChange}
                    placeholder="Describe the history, provenance or unique qualities of your gem..."
                    className="surface-muted"
                  />
                </div>

                <div className="d-flex justify-content-between">
                  <Button variant="outline-secondary" disabled>
                    Save Draft
                  </Button>
                  <Button 
                    variant="primary" 
                    onClick={nextStep}
                    className="px-4"
                  >
                    Next Step: Media →
                  </Button>
                </div>
              </Card.Body>
            </Card>
          </div>
        );

      case 2:
        return (
          <div className="animate-fade-up">
            <h4 className="mb-1 fw-bold">Upload Media & Certificates</h4>
            <p className="text-muted mb-3">Upload visual assets and laboratory authentication reports to verify your gem.</p>

            {renderStepProgress()}

            {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}

            <Card className="content-card animate-fade-up delay-1">
              <Card.Body className="p-4">
                <div className="mb-4">
                  <h5 className="fw-bold mb-3">Gem Visuals</h5>
                  <p className="text-muted small">
                    Upload hi-resolution images (PNG, JPG, WEBP). Striving for multiple angles increases bid conversion.
                  </p>

                  <div className="upload-dropzone p-5 text-center">
                    <Upload size={48} className="text-muted mb-3 mx-auto d-block upload-icon-anim" />
                    <p className="text-muted mb-3 fw-semibold">Click to upload or drag and drop</p>
                    <Form.Control
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageChange}
                      className="d-none"
                      id="imageUpload"
                    />
                    <label htmlFor="imageUpload" className="btn btn-outline-primary px-4 fw-semibold">
                      Choose Files
                    </label>
                  </div>

                  {imagePreviews.length > 0 && (
                    <Row className="mt-3 g-2">
                      {imagePreviews.map((preview, index) => (
                        <Col xs={4} md={2} key={index}>
                          <div className="position-relative border rounded overflow-hidden shadow-sm" style={{ border: '1px solid var(--border)' }}>
                            <img 
                              src={preview} 
                              alt={`Preview ${index}`} 
                              className="w-100"
                              style={{ height: '90px', objectFit: 'cover' }}
                            />
                            <Button
                              variant="danger"
                              size="sm"
                              className="position-absolute top-0 end-0 m-1"
                              onClick={() => removeImage(index)}
                              style={{ padding: '2px 6px', fontSize: '12px', opacity: 0.9 }}
                            >
                              ×
                            </Button>
                          </div>
                        </Col>
                      ))}
                    </Row>
                  )}
                </div>

                <div className="mb-4">
                  <h5 className="fw-bold mb-3">Authenticity Documents</h5>
                  <p className="text-muted small">
                    Upload certificates/reports from recognized labs (GIA, IGI, GRSI, etc.) in PDF or image format.
                  </p>

                  <div className="upload-dropzone p-5 text-center">
                    <Upload size={48} className="text-muted mb-3 mx-auto d-block upload-icon-anim" />
                    <p className="text-muted mb-3 fw-semibold">Click to upload gem certificate</p>
                    <Form.Control
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleCertificateChange}
                      className="d-none"
                      id="certificateUpload"
                    />
                    <label htmlFor="certificateUpload" className="btn btn-outline-primary px-4 fw-semibold">
                      Choose Certificate
                    </label>
                  </div>

                  {certificate && (
                    <div className="mt-3 alert alert-success py-2 d-flex align-items-center gap-2" style={{ background: '#d1f5d1', border: 'none', color: '#0b6623' }}>
                      <strong>✓</strong> <span>{certificate.name}</span>
                    </div>
                  )}
                </div>

                <div className="mb-4">
                  <h5 className="fw-bold mb-3">Certificate Authority</h5>
                  <p className="text-muted small">
                    Enter the certifying laboratory or authority that issued the report.
                  </p>
                  <Form.Group>
                    <Form.Control
                      type="text"
                      value={certificateAuthority}
                      onChange={(e) => setCertificateAuthority(e.target.value)}
                      placeholder="e.g. GIA (Gemological Institute of America)"
                      className="surface-muted"
                    />
                  </Form.Group>
                </div>

                <div className="d-flex justify-content-between pt-3">
                  <Button variant="outline-secondary" onClick={prevStep}>
                    ← Back to Details
                  </Button>
                  <Button 
                    variant="primary" 
                    onClick={nextStep}
                    className="px-4"
                  >
                    Next Step: Publication Settings →
                  </Button>
                </div>
              </Card.Body>
            </Card>
          </div>
        );

      case 3:
        return (
          <div className="animate-fade-up">
            <h4 className="mb-1 fw-bold">Finalize Your Listing</h4>
            <p className="text-muted mb-3">Configure how you wish to showcase or monetize your premium collector gem.</p>

            {renderStepProgress()}

            {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
            {success && (
              <Card className="content-card animate-fade-up border-0 text-center py-5 shadow-lg">
                <Card.Body>
                  <div className="success-checkmark">✓</div>
                  <h4 className="fw-bold mb-2">Gem Listing Submitted!</h4>
                  <p className="text-muted">{success}</p>
                  <div className="spinner-border text-success mt-3" role="status" style={{ width: '2rem', height: '2rem', borderWidth: '3px' }}>
                    <span className="visually-hidden">Redirecting...</span>
                  </div>
                </Card.Body>
              </Card>
            )}

            {!success && (
              <Card className="content-card animate-fade-up delay-1">
                <Card.Body className="p-4">
                  <div className="mb-4">
                    <h5 className="fw-bold mb-3">Listing Type</h5>
                    
                    <Row className="g-3">
                      <Col md={4}>
                        <div
                          className={`p-4 text-center choice-card h-100 ${
                            listingType === 'portfolio' ? 'active' : ''
                          }`}
                          onClick={() => setListingType('portfolio')}
                        >
                          <h6 className="fw-bold mb-2">Portfolio Only</h6>
                          <small className="text-muted">
                            Display in your collection only, not open for public sale
                          </small>
                        </div>
                      </Col>
                      <Col md={4}>
                        <div
                          className={`p-4 text-center choice-card h-100 ${
                            listingType === 'fixed' ? 'active' : ''
                          }`}
                          onClick={() => setListingType('fixed')}
                        >
                          <h6 className="fw-bold mb-2">Fixed Price</h6>
                          <small className="text-muted">
                            Set a premium "Buy Now" fixed price for instant buyers
                          </small>
                        </div>
                      </Col>
                      <Col md={4}>
                        <div
                          className={`p-4 text-center choice-card h-100 ${
                            listingType === 'auction' ? 'active' : ''
                          }`}
                          onClick={() => setListingType('auction')}
                        >
                          <h6 className="fw-bold mb-2">Live Auction</h6>
                          <small className="text-muted">
                            Maximize gemstone value with competitive marketplace bidding
                          </small>
                        </div>
                      </Col>
                    </Row>
                  </div>

                  {/* Portfolio Settings */}
                  {listingType === 'portfolio' && (
                    <div className="mb-4 animate-fade-up">
                      <h5 className="fw-bold mb-3">Portfolio Settings</h5>
                      
                      <div
                        className={`p-3 mb-2 choice-card ${
                          portfolioDisplay === 'public' ? 'active' : ''
                        }`}
                        onClick={() => setPortfolioDisplay('public')}
                      >
                        <h6 className="fw-bold mb-1">Public Display</h6>
                        <small className="text-muted">
                          This gem is visible to the public search engines and users browsing portfolios. Excellent for showcasing collector credibility.
                        </small>
                      </div>

                      <div
                        className={`p-3 choice-card ${
                          portfolioDisplay === 'private' ? 'active' : ''
                        }`}
                        onClick={() => setPortfolioDisplay('private')}
                      >
                        <h6 className="fw-bold mb-1">Private Display</h6>
                        <small className="text-muted">
                          Only you will see this gemstone in your private secure workspace vault.
                        </small>
                      </div>
                    </div>
                  )}

                  {/* Fixed Price Details */}
                  {listingType === 'fixed' && (
                    <div className="mb-4 animate-fade-up">
                      <h5 className="fw-bold mb-3">Fixed Price Details</h5>
                      
                      <Form.Group className="mb-3">
                        <Form.Label className="fw-semibold">Fixed Valuation Price (Rs) *</Form.Label>
                        <Form.Control
                          type="number"
                          value={fixedPrice}
                          onChange={(e) => setFixedPrice(e.target.value)}
                          placeholder="Rs 5,000"
                          className="surface-muted"
                          size="lg"
                          required
                        />
                      </Form.Group>

                      <Form.Group className="mb-3">
                        <Form.Label className="fw-semibold">Listing Duration</Form.Label>
                        <Form.Select
                          value={duration}
                          onChange={(e) => setDuration(e.target.value)}
                          className="surface-muted"
                          size="lg"
                        >
                          <option value="7">7 Days</option>
                          <option value="14">14 Days</option>
                          <option value="30">30 Days</option>
                        </Form.Select>
                      </Form.Group>
                    </div>
                  )}

                  {/* Auction Details */}
                  {listingType === 'auction' && (
                    <div className="mb-4 animate-fade-up">
                      <h5 className="fw-bold mb-3">Auction Details</h5>
                      
                      <Form.Group className="mb-3">
                        <Form.Label className="fw-semibold">Starting Bid (Rs) *</Form.Label>
                        <Form.Control
                          type="number"
                          value={auctionStartingBid}
                          onChange={(e) => setAuctionStartingBid(e.target.value)}
                          placeholder="Rs 50,000"
                          className="surface-muted"
                          size="lg"
                          required
                        />
                      </Form.Group>

                      <Form.Group className="mb-3">
                        <Form.Label className="fw-semibold">Minimum Bid Increment (Rs) *</Form.Label>
                        <Form.Control
                          type="number"
                          value={minimumBidIncrement}
                          onChange={(e) => setMinimumBidIncrement(e.target.value)}
                          placeholder="Rs 5,000"
                          className="surface-muted"
                          size="lg"
                          required
                        />
                      </Form.Group>

                      <Row>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label className="fw-semibold">Duration:</Form.Label>
                            <Form.Select
                              value={duration}
                              onChange={(e) => setDuration(e.target.value)}
                              className="surface-muted"
                              size="lg"
                            >
                              <option value="3">3 days</option>
                              <option value="5">5 days</option>
                              <option value="7">7 days</option>
                              <option value="14">14 days</option>
                              <option value="30">30 days</option>
                            </Form.Select>
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label className="fw-semibold">Start Date:</Form.Label>
                            <Form.Control
                              type="date"
                              value={startDate}
                              onChange={(e) => setStartDate(e.target.value)}
                              placeholder="mm/dd/yyyy"
                              className="surface-muted"
                              size="lg"
                              min={new Date().toISOString().split('T')[0]}
                            />
                          </Form.Group>
                        </Col>
                      </Row>
                    </div>
                  )}

                  <Form.Check
                    type="checkbox"
                    id="terms"
                    label="I certify all laboratory certificates, sizes, and declarations are 100% accurate and agree to marketplace seller terms."
                    checked={agreeToTerms}
                    onChange={(e) => setAgreeToTerms(e.target.checked)}
                    className="mb-4 fw-semibold text-secondary"
                  />

                  <div className="d-flex justify-content-between pt-3">
                    <Button variant="outline-secondary" onClick={prevStep}>
                      ← Back to Media
                    </Button>
                    <Button 
                      variant="primary" 
                      onClick={handleSubmit}
                      disabled={loading || !agreeToTerms}
                      className="px-5"
                    >
                      {loading ? 'Submitting...' : 'List Gemstone ✓'}
                    </Button>
                  </div>
                </Card.Body>
              </Card>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return <div>{renderStep()}</div>;
};

export default AddGemForm;