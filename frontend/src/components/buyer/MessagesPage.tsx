import React, { useEffect, useState } from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import ConversationsList from '../common/ConversationsList';
import AuctionChat from '../common/AuctionChat';
import { useAuthStore } from '../../store/authStore';
import { useChatStore } from '../../store/chatStore';

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

  useEffect(() => {
    resetUnreadCount();
  }, [resetUnreadCount]);

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

  const isDirectOpen = showDirectChat && !selectedConversation && !!(initialContact && initialGem);

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
    if (selectedConversation) setForceFullWidth(false);
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
              <ConversationsList
                onSelectConversation={setSelectedConversation}
                selectedConversationId={selectedConversation?._id}
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

            {!selectedConversation && initialContact && initialGem && (
              <AuctionChat
                gemId={initialGem.id}
                recipientId={initialContact._id || ''}
                recipientName={initialContact.name}
                conversationLabel={chatTitle}
                onClose={() => {
                  setShowDirectChat(false);
                  setForceFullWidth(false);
                }}
                scrollOnLoad={!!isDirectOpen}
              />
            )}

            {!selectedConversation && !(initialContact && initialGem) && (
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