import React, { useEffect, useState } from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import ConversationsList from '../common/ConversationsList';
import AuctionChat from '../common/AuctionChat';
import { useAuthStore } from '../../store/authStore';
import { useChatStore } from '../../store/chatStore';
import { adminAPI } from '../../api/axios';

interface SelectedConversation {
  _id: string;
  gem?: {
    _id: string;
    name: string;
    images?: string[];
  };
  auction: {
    _id: string;
    gem: {
      _id?: string;
      name: string;
      images?: string[];
    };
    currentBid: number;
  };
  seller: {
    _id: string;
    name: string;
  };
  buyer: {
    _id: string;
    name: string;
  };
}

interface MessagesPageProps {
  initialContact?: {
    _id?: string;
    name: string;
    email: string;
    phone?: string;
  } | null;
  initialGem?: {
    name: string;
    id: string;
  } | null;
}

const MessagesPage: React.FC<MessagesPageProps> = ({ initialContact, initialGem }) => {
  const { user } = useAuthStore();
  const resetUnreadCount = useChatStore((state) => state.resetUnreadCount);
  const [selectedConversation, setSelectedConversation] = useState<SelectedConversation | null>(null);
  const [showDirectChat, setShowDirectChat] = useState<boolean>(!!(initialContact && initialGem));
  const [forceFullWidth, setForceFullWidth] = useState<boolean>(!!(initialContact && initialGem));
  
  const [directPartner, setDirectPartner] = useState<{ _id: string; name: string } | null>(null);
  const [partners, setPartners] = useState<Array<{ _id: string; name: string; role: string }>>([]);

  useEffect(() => {
    resetUnreadCount();
  }, [resetUnreadCount]);

  useEffect(() => {
    if (user && (user.role === 'admin' || user.role === 'operational_manager')) {
      const fetchPartners = async () => {
        try {
          const res = await adminAPI.getChatPartners();
          setPartners(res.data.partners || []);
        } catch (e) {
          console.error('Failed to fetch chat partners:', e);
        }
      };
      fetchPartners();
    }
  }, [user]);

  if (!user) {
    return (
      <div className="messages-page d-flex align-items-center justify-content-center" style={{ minHeight: '60vh' }}>
        <div className="text-center">
          <div className="empty-chat-icon mx-auto mb-3">
            <span>🔒</span>
          </div>
          <p className="text-muted">Please log in to view your support inbox.</p>
        </div>
      </div>
    );
  }

  const otherUser = selectedConversation
    ? (user.id === selectedConversation.seller._id
        ? selectedConversation.buyer
        : selectedConversation.seller)
    : null;

  const chatTitle = selectedConversation
    ? (user.id === selectedConversation.seller._id
        ? selectedConversation.buyer.name
        : selectedConversation.seller.name)
    : initialContact?.name || 'Support Inbox';

  const isDirectOpen = (showDirectChat && !selectedConversation && !!(initialContact && initialGem)) || (!!directPartner && !selectedConversation);

  useEffect(() => {
    const hasDirectContext = !!(initialContact && initialGem);
    if (hasDirectContext) {
      setShowDirectChat(true);
      setForceFullWidth(true);
    }
  }, [initialContact, initialGem]);

  useEffect(() => {
    if (initialContact && initialGem) setForceFullWidth(true);
  }, [initialContact, initialGem]);

  useEffect(() => {
    if (selectedConversation) {
      setForceFullWidth(false);
      setDirectPartner(null);
    }
  }, [selectedConversation]);

  useEffect(() => {
    if (selectedConversation) {
      setShowDirectChat(false);
    }
  }, [selectedConversation]);

  return (
    <Container fluid className="messages-page py-0">
      <div className="messages-shell">
        <Row className="g-0 align-items-stretch">
          {/* Conversations column (hidden when opening a direct chat) */}
          {!isDirectOpen && !forceFullWidth && (
            <Col lg={3} md={4} className="conversations-column">
              {user && (user.role === 'admin' || user.role === 'operational_manager') && partners.length > 0 && (
                <div className="p-3 mb-2" style={{ background: 'var(--page-surface-elevated)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <label className="mb-2 d-block" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', fontWeight: 700 }}>
                    {user.role === 'admin' ? 'Message Operational Manager' : 'Message Administrator'}
                  </label>
                  <select
                    className="chat-gem-selector w-100"
                    style={{ padding: '8px 12px', fontSize: '13px' }}
                    value={directPartner?._id || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (!val) {
                        setDirectPartner(null);
                        return;
                      }
                      const partner = partners.find(p => p._id === val);
                      if (partner) {
                        setSelectedConversation(null);
                        setDirectPartner(partner);
                      }
                    }}
                  >
                    <option value="">-- Choose recipient --</option>
                    {partners.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <ConversationsList
                onSelectConversation={setSelectedConversation}
                selectedConversationId={selectedConversation?._id || (directPartner ? 'direct' : null)}
              />
            </Col>
          )}

          {/* Chat / detail column */}
          <Col lg={(isDirectOpen && forceFullWidth) ? 12 : 9} md={(isDirectOpen && forceFullWidth) ? 12 : 8} className="chat-column">
            {selectedConversation && (
              <AuctionChat
                conversationId={selectedConversation._id}
                auctionId={selectedConversation.auction?._id}
                gemId={
                  selectedConversation?.auction?.gem?._id ||
                  selectedConversation?.gem?._id
                }
                recipientId={otherUser?._id || ''}
                recipientName={otherUser?.name || 'User'}
                conversationLabel={chatTitle}
              />
            )}

            {!selectedConversation && directPartner && (
              <AuctionChat
                gemId="direct"
                recipientId={directPartner._id}
                recipientName={directPartner.name}
                conversationLabel={`Chat with ${directPartner.name}`}
                onClose={() => {
                  setDirectPartner(null);
                }}
              />
            )}

            {!selectedConversation && !directPartner && initialContact && initialGem && (
              <AuctionChat
                gemId={initialGem.id}
                recipientId={initialContact._id || ''}
                recipientName={initialContact.name}
                conversationLabel={chatTitle}
                onClose={() => {
                  setShowDirectChat(false);
                  setForceFullWidth(false);
                }}
              />
            )}

            {!selectedConversation && !directPartner && !(initialContact && initialGem) && (
              <div className="empty-chat-state">
                  <div className="empty-chat-card">
                    <div className="empty-chat-icon">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="26"
                      height="26"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                  </div>
                  <h5>No chat selected</h5>
                  <p>Choose a chat from the inbox to view the conversation.</p>
                </div>
              </div>
            )}
          </Col>
        </Row>
      </div>
    </Container>
  );
};

export default MessagesPage;