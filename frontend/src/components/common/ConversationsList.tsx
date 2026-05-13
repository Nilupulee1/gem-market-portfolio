import React, { useState, useEffect } from 'react';
import { useRef } from 'react';
import { ListGroup, Card, Spinner } from 'react-bootstrap';
import { MessageSquare } from 'lucide-react';
import axiosInstance from '../../api/axios';
import { useAuthStore } from '../../store/authStore';

interface Conversation {
  _id: string;
  gem?: {
    _id: string;
    name: string;
  };
  auction: {
    _id: string;
    gem: {
      name: string;
    };
    currentBid: number;
  };
  lastMessage?: {
    _id: string;
    content: string;
    sender?: {
      _id: string;
      name: string;
      email: string;
    };
  };
  seller: {
    _id: string;
    name: string;
    email: string;
  };
  buyer: {
    _id: string;
    name: string;
    email: string;
  };
  unreadCount: {
    buyerUnread: number;
    sellerUnread: number;
  };
  updatedAt: string;
}

interface ConversationsListProps {
  onSelectConversation?: (conversation: Conversation) => void;
  selectedConversationId?: string | null;
  className?: string;
}

const ConversationsList: React.FC<ConversationsListProps> = ({
  onSelectConversation,
  selectedConversationId,
  className
}) => {
  const { user, token } = useAuthStore();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const autoSelectedRef = useRef(false);

  useEffect(() => {
    const fetchConversations = async () => {
      if (!token) return;

      try {
        setLoading(true);
        const response = await axiosInstance.get('/chat/conversations');
        const data = response.data;
        setConversations(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Error fetching conversations:', error);
        setConversations([]);
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
  }, [token]);

  const filteredConversations = conversations.filter((conv) => {
    const otherUser = user?.id === conv.seller._id ? conv.buyer : conv.seller;
    return otherUser.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.auction?.gem?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.gem?.name?.toLowerCase().includes(searchTerm.toLowerCase());
  }).sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime());

  useEffect(() => {
    if (selectedConversationId || autoSelectedRef.current || !onSelectConversation) {
      return;
    }

    if (filteredConversations.length > 0) {
      onSelectConversation(filteredConversations[0]);
      autoSelectedRef.current = true;
    }
  }, [filteredConversations, onSelectConversation, selectedConversationId]);

  const getUnreadCount = (conv: Conversation) => {
    if (!user) return 0;
    return user.id === conv.seller._id
      ? conv.unreadCount.sellerUnread
      : conv.unreadCount.buyerUnread;
  };

  const formatTime = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className={`conversations-loading ${className || ''}`}>
        <Spinner animation="border" variant="light" />
      </div>
    );
  }

  return (
    <div className={`conversations-list-container ${className}`}>
      <Card className="border-0 conversations-card">
        <Card.Header className="conversations-header">
          <div className="d-flex align-items-center gap-2">
            <div className="conversations-header-icon">
              <MessageSquare size={18} />
            </div>
            <div>
              <h5 className="mb-0">Conversations</h5>
              <small>{conversations.length} active threads</small>
            </div>
          </div>
        </Card.Header>

        <Card.Body className="conversations-body">
          <input
            type="text"
            placeholder="Search conversations..."
            className="conversation-search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <div className="conversation-list-title">All Messages ({filteredConversations.length})</div>
          <ListGroup variant="flush" className="conversations-list">
            {filteredConversations.length === 0 ? (
              <div className="conversations-empty">
                <p>No conversations yet</p>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const otherUser = user?.id === conv.seller._id ? conv.buyer : conv.seller;
                const unreadCount = getUnreadCount(conv);
                const isSelected = selectedConversationId === conv._id;

                return (
                  <ListGroup.Item
                    key={conv._id}
                    className={`conversation-item ${isSelected ? 'selected' : ''} ${unreadCount > 0 ? 'unread' : ''}`}
                    onClick={() => onSelectConversation?.(conv)}
                    role="button"
                  >
                    <div className="conversation-avatar">{otherUser.name[0]?.toUpperCase()}</div>
                    <div className="conversation-info flex-grow-1">
                      <div className="d-flex align-items-center gap-2 mb-1">
                        <h6 className="mb-0">{otherUser.name}</h6>
                      </div>
                      <small className="conversation-meta d-block mb-1">
                        {conv.auction?.gem?.name || conv.gem?.name || 'Unknown Gem'}
                      </small>
                      <p className="mb-0 message-preview">
                        <strong>
                          {user?.id === conv.lastMessage?.sender?._id ? 'You: ' : ''}
                        </strong>
                        {conv.lastMessage?.content || 'No messages yet'}
                      </p>
                    </div>
                    <div className="conversation-time-block text-end">
                      <small className="d-block">{formatTime(conv.updatedAt)}</small>
                      <small className="d-block price">Rs.{conv.auction?.currentBid?.toLocaleString() || 0}</small>
                    </div>
                  </ListGroup.Item>
                );
              })
            )}
          </ListGroup>
        </Card.Body>
      </Card>
    </div>
  );
};

export default ConversationsList;
