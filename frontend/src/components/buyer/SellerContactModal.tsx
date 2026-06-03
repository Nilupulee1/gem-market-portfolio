import { X, Mail, MessageCircle, Phone } from 'lucide-react';
import { useState } from 'react';

interface SellerContactModalProps {
  seller: {
    _id?: string;
    name: string;
    email: string;
    phone?: string;
  };
  gemName: string;
  onClose: () => void;
  onSendMessage?: () => void;
}

const SellerContactModal = ({ seller, gemName, onClose, onSendMessage }: SellerContactModalProps) => {
  const [message, setMessage] = useState('');
  const [showMessageForm, setShowMessageForm] = useState(false);

  const handleSendEmail = () => {
    if (seller.email) {
      window.location.href = `mailto:${seller.email}?subject=Inquiry about ${encodeURIComponent(gemName)}&body=${encodeURIComponent(message || 'I am interested in this gem.')}`;
    }
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-sheet modal-sheet-sm seller-contact-sheet">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="seller-contact-title mb-0">Contact Seller</h5>
          <button className="ghost-btn" type="button" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="seller-contact-card mb-3">
          <div className="d-flex align-items-center gap-3 mb-3">
            <div className="seller-contact-avatar">
              {seller.name[0]?.toUpperCase()}
            </div>
            <div>
              <h6 className="seller-contact-name mb-1">{seller.name}</h6>
              <p className="seller-contact-role mb-0">Gem Seller</p>
            </div>
          </div>

          <div className="border-top pt-3">
            <div className="d-flex align-items-center gap-2 mb-2">
              <Mail size={16} className="text-primary" />
              <span className="seller-contact-meta">{seller.email}</span>
            </div>
            {seller.phone && (
              <div className="d-flex align-items-center gap-2">
                <Phone size={16} className="text-primary" />
                <span className="seller-contact-meta">{seller.phone}</span>
              </div>
            )}
          </div>
        </div>

        <div className="mb-3">
          <p className="seller-contact-gem-line mb-0">
            <strong>Gem:</strong> {gemName}
          </p>
        </div>

        <div className="d-flex flex-column gap-2">
          <button
            className="bid-btn"
            type="button"
            onClick={onSendMessage}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            <MessageCircle size={16} />
            Message in Chat
          </button>

          <button
            className="ghost-btn seller-contact-email-btn"
            type="button"
            onClick={() => {
              window.location.href = `mailto:${seller.email}?subject=Inquiry about ${encodeURIComponent(gemName)}`;
            }}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            <Mail size={16} />
            Quick Email
          </button>

          <button
            className="ghost-btn"
            type="button"
            onClick={() => setShowMessageForm((current) => !current)}
          >
            {showMessageForm ? 'Hide Email Draft' : 'Write Detailed Email'}
          </button>
        </div>

        {showMessageForm && (
          <div className="seller-contact-draft mt-3">
            <textarea
              className="seller-contact-textarea mb-2"
              rows={3}
              placeholder="Type your message here..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
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
                className="ghost-btn flex-grow-1"
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

        <div className="seller-contact-tip mt-3">
          <p className="seller-contact-tip-text mb-0">
            <strong>Tip:</strong> For faster communication, include your preferred response method in your first message.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SellerContactModal;
