import React, { useEffect, useState } from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { MessageSquare } from 'lucide-react';
import ConversationsList from '../common/ConversationsList';
import AuctionChat from '../common/AuctionChat';
import { useAuthStore } from '../../store/authStore';
import { useChatStore } from '../../store/chatStore';

interface SelectedConversation {
  _id: string;
  gem?: {
    _id: string;
    name: string;
  };
  auction: {
    _id: string;
    gem: {
      _id?: string;
      name: string;
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

  const selectedGemId = selectedConversation?.auction?.gem?._id || selectedConversation?.gem?._id;
  const selectedGemName = selectedConversation?.auction?.gem?.name || selectedConversation?.gem?.name || 'Unknown Gem';
  const chatTitle = selectedConversation
    ? (user.id === selectedConversation.seller._id ? selectedConversation.buyer.name : selectedConversation.seller.name)
    : initialContact?.name || 'Messages';

  return (
    <Container fluid className="messages-page py-4">
      <div className="messages-shell">
        <Row className="messages-grid g-3">
          <Col lg={4} md={5} className="conversations-column">
            <ConversationsList
              onSelectConversation={setSelectedConversation}
              selectedConversationId={selectedConversation?._id}
            />
          </Col>

          <Col lg={8} md={7} className="chat-column">
            {selectedConversation ? (
              <AuctionChat
                auctionId={selectedConversation.auction?._id}
                gemId={selectedGemId}
                recipientId={otherUser?._id || ''}
                recipientName={otherUser?.name || 'User'}
                gemName={selectedGemName}
                conversationLabel={chatTitle}
              />
            ) : initialContact ? (
              <AuctionChat
                gemId={initialGem?.id}
                recipientId={initialContact._id || ''}
                recipientName={initialContact.name || 'User'}
                gemName={initialGem?.name || 'Unknown Gem'}
                conversationLabel={chatTitle}
              />
            ) : (
              <div className="empty-chat-state">
                <div className="empty-chat-card">
                  <div className="empty-chat-icon">
                    <MessageSquare size={30} />
                  </div>
                  <h5>Select a conversation</h5>
                  <p>Choose a conversation from the list to view messages and continue chatting.</p>
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
