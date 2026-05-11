import { X, Mail, MessageCircle, Phone } from 'lucide-react';
import { useState } from 'react';

interface SellerContactModalProps {
  seller: {
    name: string;
    email: string;
    phone?: string;
  };
  gemName: string;
  onClose: () => void;
}

const SellerContactModal = ({ seller, gemName, onClose }: SellerContactModalProps) => {
  const [message, setMessage] = useState('');
  const [showMessageForm, setShowMessageForm] = useState(false);

  const handleSendEmail = () => {
    if (seller.email) {
      window.location.href = `mailto:${seller.email}?subject=Inquiry about ${encodeURIComponent(gemName)}&body=${encodeURIComponent(message || 'I am interested in this gem.')}`;
    }
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-sheet" style={{ maxWidth: '500px' }}>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="fw-bold mb-0">Contact Seller</h5>
          <button className="ghost-btn" type="button" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="block-card mb-3">
          <div className="d-flex align-items-center gap-3 mb-3">
            <div
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                backgroundColor: '#f0f0f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
              }}
            >
              {seller.name[0]?.toUpperCase()}
            </div>
            <div>
              <h6 className="fw-bold mb-1">{seller.name}</h6>
              <p className="text-muted small mb-0">Gem Seller</p>
            </div>
          </div>

          <div className="border-top pt-3">
            <div className="d-flex align-items-center gap-2 mb-2">
              <Mail size={16} className="text-primary" />
              <span className="text-muted small">{seller.email}</span>
            </div>
            {seller.phone && (
              <div className="d-flex align-items-center gap-2">
                <Phone size={16} className="text-primary" />
                <span className="text-muted small">{seller.phone}</span>
              </div>
            )}
          </div>
        </div>

        <div className="mb-3">
          <p className="text-muted small">
            <strong>Gem:</strong> {gemName}
          </p>
        </div>

        <div className="d-flex flex-column gap-2">
          <button
            className="bid-btn"
            type="button"
            onClick={() => setShowMessageForm(!showMessageForm)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            <MessageCircle size={16} />
            Send Message
          </button>

          <button
            className="btn btn-outline-primary w-100"
            type="button"
            onClick={() => {
              window.location.href = `mailto:${seller.email}?subject=Inquiry about ${encodeURIComponent(gemName)}`;
            }}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            <Mail size={16} />
            Quick Email
          </button>
        </div>

        {showMessageForm && (
          <div className="mt-3 p-3 rounded" style={{ backgroundColor: '#f9f9f9' }}>
            <textarea
              className="form-control mb-2"
              rows={3}
              placeholder="Type your message here..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              style={{ fontSize: '14px' }}
            />
            <div className="d-flex gap-2">
              <button
                className="bid-btn flex-grow-1"
                type="button"
                onClick={handleSendEmail}
                disabled={!message.trim()}
              >
                Send Email
              </button>
              <button
                className="btn btn-outline-secondary flex-grow-1"
                type="button"
                onClick={() => {
                  setShowMessageForm(false);
                  setMessage('');
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="mt-3 p-2 rounded" style={{ backgroundColor: '#e3f2fd' }}>
          <p className="text-muted small mb-0">
            💡 <strong>Tip:</strong> For faster communication, consider sharing your contact details in your message.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SellerContactModal;
