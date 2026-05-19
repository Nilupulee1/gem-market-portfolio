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

  useEffect(() => {
    resetUnreadCount();
  }, [resetUnreadCount]);

  if (!user) {
    return <div>Please log in to view messages</div>;
  }

  const otherUser = selectedConversation
    ? (user.id === selectedConversation.seller._id
        ? selectedConversation.buyer
        : selectedConversation.seller)
    : null;

  const chatTitle = selectedConversation
    ? (user.id === selectedConversation.seller._id ? selectedConversation.buyer.name : selectedConversation.seller.name)
    : initialContact?.name || 'Messages';

  return (
    <Container fluid className="messages-page py-4">
      <div className="messages-shell">
        <div className="messages-header">
          <h4 className="mb-0">Messages</h4>
        </div>

        <Row className="messages-grid g-3">
          <Col lg={4} md={5} className="conversations-column">
            <ConversationsList
              onSelectConversation={setSelectedConversation}
              selectedConversationId={selectedConversation?._id}
            />
          </Col>

          <Col lg={8} md={7} className="chat-column">
            {selectedConversation && (
              <AuctionChat
                conversationId={selectedConversation._id}
                auctionId={selectedConversation.auction?._id}
                gemId={selectedConversation?.auction?.gem?._id || selectedConversation?.gem?._id}
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
              />
            )}
            {!selectedConversation && !(initialContact && initialGem) && (
              <div className="empty-chat-state">
                <div className="empty-chat-card">
                  <div className="empty-chat-icon">
                    <span>✦</span>
                  </div>
                  <h5>Select a conversation</h5>
                  <p>Click a name on the left to open the chat here.</p>
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
