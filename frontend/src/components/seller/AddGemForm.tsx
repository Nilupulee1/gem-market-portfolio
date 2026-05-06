import { useState } from 'react';
import { Card, Form, Button, Row, Col, ProgressBar, Alert } from 'react-bootstrap';
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
      formDataToSend.append('certificateAuthority', 'GIA');
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

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="animate-fade-up">
            <h4 className="mb-1 fw-bold">List Your Gem for Verification</h4>
            <p className="text-muted mb-4">Step 1 of 3: Gem Details</p>

            <div className="step-progress-label">
              <span className="step-dot active" />
              <span className="step-dot" />
              <span className="step-dot" />
              Core Attributes
            </div>
            <ProgressBar now={33} className="mb-4" style={{ height: '8px' }} />

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
            <p className="text-muted mb-4">Step 2 of 3: Media Upload</p>

            <div className="step-progress-label">
              <span className="step-dot active" />
              <span className="step-dot active" />
              <span className="step-dot" />
              Media and Verification Assets
            </div>
            <ProgressBar now={66} className="mb-4" style={{ height: '8px' }} />

            {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}

            <Card className="content-card animate-fade-up delay-1">
              <Card.Body className="p-4">
                <div className="mb-4">
                  <h5 className="fw-bold mb-3">Gem Visuals</h5>
                  <p className="text-muted small">
                    Upload hi-resolution files (e.g., Jds, Jdds, Jtech). Videos are encouraged.
                  </p>

                  <div className="upload-dropzone p-5 text-center">
                    <Upload size={48} className="text-muted mb-3 mx-auto d-block" />
                    <p className="text-muted mb-3">Click to upload or drag and Drop</p>
                    <Form.Control
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageChange}
                      className="d-none"
                      id="imageUpload"
                    />
                    <label htmlFor="imageUpload" className="btn btn-outline-primary">
                      Choose Files
                    </label>
                  </div>

                  {imagePreviews.length > 0 && (
                    <Row className="mt-3 g-2">
                      {imagePreviews.map((preview, index) => (
                        <Col xs={4} md={2} key={index}>
                          <div className="position-relative">
                            <img 
                              src={preview} 
                              alt={`Preview ${index}`} 
                              className="w-100 rounded"
                              style={{ height: '100px', objectFit: 'cover' }}
                            />
                            <Button
                              variant="danger"
                              size="sm"
                              className="position-absolute top-0 end-0 m-1"
                              onClick={() => removeImage(index)}
                              style={{ padding: '2px 6px', fontSize: '12px' }}
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
                    Upload reports from recognized labs (e.g., GIA, GRSI, IGI) or high-res images.
                  </p>

                  <div className="upload-dropzone p-5 text-center">
                    <Upload size={48} className="text-muted mb-3 mx-auto d-block" />
                    <p className="text-muted mb-3">Click to Upload Certificate</p>
                    <Form.Control
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleCertificateChange}
                      className="d-none"
                      id="certificateUpload"
                    />
                    <label htmlFor="certificateUpload" className="btn btn-outline-primary">
                      Choose Certificate
                    </label>
                  </div>

                  {certificate && (
                    <div className="mt-3">
                      <small className="text-success">✓ {certificate.name}</small>
                    </div>
                  )}
                </div>

                <div className="d-flex justify-content-between">
                  <Button variant="link" onClick={prevStep} className="text-decoration-none">
                    ← Back
                  </Button>
                  <Button 
                    variant="primary" 
                    onClick={nextStep}
                    className="px-4"
                  >
                    Next Step: Finalize Listing →
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
            <p className="text-muted mb-4">Step 3 of 3</p>

            <div className="step-progress-label">
              <span className="step-dot active" />
              <span className="step-dot active" />
              <span className="step-dot active" />
              Listing and Publication Settings
            </div>
            <ProgressBar now={100} className="mb-4" style={{ height: '8px' }} />

            {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
            {success && <Alert variant="success">{success}</Alert>}

            <Card className="content-card animate-fade-up delay-1">
              <Card.Body className="p-4">
                <div className="mb-4">
                  <h5 className="fw-bold mb-3">Listing Type</h5>
                  
                  <Row className="g-3">
                    <Col md={4}>
                      <div
                        className={`p-4 text-center choice-card ${
                          listingType === 'portfolio' ? 'active' : ''
                        }`}
                        onClick={() => setListingType('portfolio')}
                      >
                        <h6 className="fw-bold mb-2">Portfolio</h6>
                        <small className="text-muted">
                          Display in your collection only, not for sale
                        </small>
                      </div>
                    </Col>
                    <Col md={4}>
                      <div
                        className={`p-4 text-center choice-card ${
                          listingType === 'fixed' ? 'active' : ''
                        }`}
                        onClick={() => setListingType('fixed')}
                      >
                        <h6 className="fw-bold mb-2">Fixed Price</h6>
                        <small className="text-muted">
                          Set a "Buy Now" price (Opt to list later)
                        </small>
                      </div>
                    </Col>
                    <Col md={4}>
                      <div
                        className={`p-4 text-center choice-card ${
                          listingType === 'auction' ? 'active' : ''
                        }`}
                        onClick={() => setListingType('auction')}
                      >
                        <h6 className="fw-bold mb-2">Auction</h6>
                        <small className="text-muted">
                          Maximize value with competitive bidding
                        </small>
                      </div>
                    </Col>
                  </Row>
                </div>

                {/* Portfolio Settings */}
                {listingType === 'portfolio' && (
                  <div className="mb-4">
                    <h5 className="fw-bold mb-3">Portfolio Settings</h5>
                    
                    <div
                      className={`p-3 mb-2 choice-card ${
                        portfolioDisplay === 'public' ? 'active' : ''
                      }`}
                      onClick={() => setPortfolioDisplay('public')}
                    >
                      <h6 className="fw-bold mb-1">Public Display</h6>
                      <small className="text-muted">
                        This item will be visible in your public profile and search results, so ids will be listed for Sale. You can manage specific visibility settings in your Dashboard after listing.
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
                        This item will be visible in your profile only.
                      </small>
                    </div>
                  </div>
                )}

                {/* Fixed Price Details */}
                {listingType === 'fixed' && (
                  <div className="mb-4">
                    <h5 className="fw-bold mb-3">Fixed Price Details</h5>
                    
                    <Form.Group className="mb-3">
                      <Form.Label className="fw-semibold">Fixed Price (Rs) *</Form.Label>
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
                      <Form.Label className="fw-semibold">Duration</Form.Label>
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
                  <div className="mb-4">
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
                  label="I agree to the terms of Services"
                  checked={agreeToTerms}
                  onChange={(e) => setAgreeToTerms(e.target.checked)}
                  className="mb-4"
                />

                <div className="d-flex justify-content-between">
                  <Button variant="link" onClick={prevStep} className="text-decoration-none">
                    ← Back to Media
                  </Button>
                  <Button 
                    variant="primary" 
                    onClick={handleSubmit}
                    disabled={loading || !agreeToTerms}
                    className="px-4"
                  >
                    {loading ? 'Submitting...' : 'Submit'}
                  </Button>
                </div>
              </Card.Body>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return <div>{renderStep()}</div>;
};

export default AddGemForm;