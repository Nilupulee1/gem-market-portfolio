import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Bell,
  Compass,
  Gavel,
  Heart,
  LayoutDashboard,
  LogOut,
  Search,
  Settings,
  ShieldCheck,
  Sparkle,
  Timer,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { auctionAPI, buyerAPI } from '../../api/axios';
import { useAuthStore } from '../../store/authStore';
import type { Auction } from '../../types';
import logo from '../../assets/logo.png';
import './BuyerDashboard.css';

type BuyerView = 'dashboard' | 'marketplace' | 'auctions' | 'watchlist';

interface BuyerStats {
  auctionsParticipated: number;
  activeBids: number;
  wonAuctions: number;
  totalBidsPlaced: number;
}

interface BuyerDashboardPayload {
  stats: BuyerStats;
  recentBids: Array<{
    auctionId: string;
    amount: number;
    timestamp: string;
    currentBid: number;
    isWinning: boolean;
    endTime: string;
    gem: Auction['gem'];
  }>;
  recentWins: Auction[];
}

interface ActiveBidItem {
  auction: Auction;
  myHighestBid: number;
  bidsPlacedByMe: number;
  isWinning: boolean;
  remainingTimeMs: number;
}

const watchlistStorageKey = 'buyer-watchlist-auction-ids';

const formatCurrency = (value: number) => `Rs.${value.toLocaleString()}`;

const formatRemaining = (endTime: string) => {
  const ms = new Date(endTime).getTime() - Date.now();
  if (ms <= 0) {
    return 'Ended';
  }

  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  if (days > 0) {
    return `${days}d ${hours}h`;
  }
  return `${hours}h ${minutes}m`;
};

const parseWatchlist = () => {
  const raw = localStorage.getItem(watchlistStorageKey);
  if (!raw) {
    return [] as string[];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveWatchlist = (ids: string[]) => {
  localStorage.setItem(watchlistStorageKey, JSON.stringify(ids));
};

const BuyerDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const [view, setView] = useState<BuyerView>('dashboard');
  const [query, setQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');

  const [loading, setLoading] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [placingBid, setPlacingBid] = useState(false);

  const [allAuctions, setAllAuctions] = useState<Auction[]>([]);
  const [dashboard, setDashboard] = useState<BuyerDashboardPayload | null>(null);
  const [activeBids, setActiveBids] = useState<ActiveBidItem[]>([]);
  const [wonAuctions, setWonAuctions] = useState<Auction[]>([]);

  const [watchlistIds, setWatchlistIds] = useState<string[]>(parseWatchlist);

  const [selectedAuction, setSelectedAuction] = useState<Auction | null>(null);
  const [bidAmount, setBidAmount] = useState('');
  const isBuyerAccount = user?.role === 'buyer';

  const refreshData = async () => {
    if (!isBuyerAccount) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [activeRes, dashboardRes, activeBidsRes, wonRes] = await Promise.all([
        auctionAPI.getActiveAuctions(),
        buyerAPI.getDashboard(),
        buyerAPI.getActiveBids(),
        buyerAPI.getWonAuctions(),
      ]);

      setAllAuctions(activeRes.data.auctions || []);
      setDashboard(dashboardRes.data);
      setActiveBids(activeBidsRes.data.activeBids || []);
      setWonAuctions(wonRes.data.wonAuctions || []);
    } catch (error) {
      console.error('Failed to load buyer dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, [isBuyerAccount]);

  const uniqueTypes = useMemo(() => {
    const typeSet = new Set(allAuctions.map((item) => item.gem.type));
    return ['all', ...Array.from(typeSet)];
  }, [allAuctions]);

  const filteredAuctions = useMemo(() => {
    return allAuctions.filter((item) => {
      const queryValue = query.trim().toLowerCase();
      const matchesQuery =
        queryValue.length === 0 ||
        item.gem.type.toLowerCase().includes(queryValue) ||
        item.gem.origin.toLowerCase().includes(queryValue) ||
        item.gem.color.toLowerCase().includes(queryValue);
      const matchesType = selectedType === 'all' || item.gem.type === selectedType;
      return matchesQuery && matchesType;
    });
  }, [allAuctions, query, selectedType]);

  const watchedAuctions = useMemo(
    () => allAuctions.filter((item) => watchlistIds.includes(item._id)),
    [allAuctions, watchlistIds]
  );

  const toggleWatchlist = (auctionId: string) => {
    const updated = watchlistIds.includes(auctionId)
      ? watchlistIds.filter((id) => id !== auctionId)
      : [...watchlistIds, auctionId];
    setWatchlistIds(updated);
    saveWatchlist(updated);
  };

  const openDetails = async (auctionId: string) => {
    try {
      setLoadingDetails(true);
      const response = await auctionAPI.getAuctionById(auctionId);
      setSelectedAuction(response.data.auction);
      const minBid = response.data.auction.currentBid + response.data.auction.minimumBidIncrement;
      setBidAmount(String(minBid));
    } catch (error) {
      console.error('Failed to fetch auction details:', error);
    } finally {
      setLoadingDetails(false);
    }
  };

  const closeDetails = () => {
    setSelectedAuction(null);
    setBidAmount('');
  };

  const placeBid = async () => {
    if (!selectedAuction) {
      return;
    }

    const amount = Number(bidAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return;
    }

    try {
      setPlacingBid(true);
      await auctionAPI.placeBid({ auctionId: selectedAuction._id, amount });
      await openDetails(selectedAuction._id);
      await refreshData();
    } catch (error) {
      console.error('Failed to place bid:', error);
    } finally {
      setPlacingBid(false);
    }
  };

  const handleSignOut = () => {
    logout();
    navigate('/login');
  };

  const renderDashboard = () => {
    const stats = dashboard?.stats;

    return (
      <>
        <div className="section-head">
          <div>
            <h3>Welcome back, {user?.name?.split(' ')[0]}!</h3>
            <p className="mb-0 text-secondary">You have {stats?.activeBids || 0} active bids</p>
          </div>
        </div>

        <div className="buyer-grid3">
          <article className="quick-card">
            <div className="quick-icon"><Gavel size={18} /></div>
            <div>View Bids</div>
            <strong>{stats?.totalBidsPlaced || 0} bids</strong>
          </article>
          <article className="quick-card">
            <div className="quick-icon"><Heart size={18} /></div>
            <div>My Watchlist</div>
            <strong>{watchlistIds.length} items</strong>
          </article>
          <article className="quick-card">
            <div className="quick-icon"><Sparkle size={18} /></div>
            <div>Recent Dealings</div>
            <strong>{stats?.wonAuctions || 0} wins</strong>
          </article>
        </div>

        <section className="block-card">
          <div className="section-head">
            <h3>Your Watched Auctions</h3>
            <button type="button" onClick={() => setView('watchlist')}>View All</button>
          </div>
          {watchedAuctions.length === 0 ? (
            <p className="empty-note">No watched auctions yet. Add some from Marketplace.</p>
          ) : (
            watchedAuctions.slice(0, 3).map((auction) => (
              <div key={auction._id} className="d-flex justify-content-between align-items-center border rounded-3 p-2 mb-2">
                <div className="d-flex align-items-center gap-2">
                  <img src={auction.gem.images[0]} alt={auction.gem.type} width={52} height={42} style={{ objectFit: 'cover', borderRadius: 8 }} />
                  <div>
                    <strong>{auction.gem.type}</strong>
                    <p className="m-0 text-secondary">{auction.gem.carat} ct</p>
                  </div>
                </div>
                <div className="text-end">
                  <p className="m-0 text-secondary small">Current Bid</p>
                  <strong>{formatCurrency(auction.currentBid)}</strong>
                </div>
              </div>
            ))
          )}
        </section>

        <section className="block-card">
          <div className="section-head">
            <h3>Pick Up Where You Left Off</h3>
            <button type="button" onClick={() => setView('marketplace')}>View All</button>
          </div>
          <div className="market-grid">
            {filteredAuctions.slice(0, 3).map((auction) => (
              <article className="market-card" key={auction._id}>
                <img className="market-image" src={auction.gem.images[0]} alt={auction.gem.type} />
                <div className="market-body">
                  <strong>{auction.gem.type}</strong>
                  <p className="market-meta">{auction.gem.origin}</p>
                  <div className="bid-price">{formatCurrency(auction.currentBid)}</div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </>
    );
  };

  const renderMarketplace = () => (
    <>
      <div className="section-head">
        <div>
          <h3>Browse Gems</h3>
          <p className="mb-0 text-secondary">Showing {filteredAuctions.length} gems</p>
        </div>
      </div>

      <div className="control-row">
        <input
          className="buyer-search"
          placeholder="Search gems..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <select value={selectedType} onChange={(event) => setSelectedType(event.target.value)}>
          {uniqueTypes.map((type) => (
            <option key={type} value={type}>{type === 'all' ? 'All Types' : type}</option>
          ))}
        </select>
      </div>

      <div className="market-grid">
        {filteredAuctions.map((auction) => {
          const inWatchlist = watchlistIds.includes(auction._id);
          return (
            <motion.article key={auction._id} whileHover={{ y: -5 }} className="market-card">
              <img className="market-image" src={auction.gem.images[0]} alt={auction.gem.type} />
              <div className="market-body">
                <strong>{auction.gem.type}</strong>
                <p className="market-meta">{auction.gem.origin} - {auction.gem.carat} ct</p>
                <p className="market-meta">{auction.gem.cut} - {auction.gem.color}</p>
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="bid-price">{formatCurrency(auction.currentBid)}</span>
                  <span className="text-secondary small"><Timer size={14} /> {formatRemaining(auction.endTime)}</span>
                </div>
                <div className="d-flex gap-2">
                  <button className="watch-btn" type="button" onClick={() => toggleWatchlist(auction._id)}>
                    <Heart size={15} fill={inWatchlist ? 'currentColor' : 'none'} /> {inWatchlist ? 'Watched' : 'Watch'}
                  </button>
                  <button className="bid-btn" type="button" onClick={() => openDetails(auction._id)}>Open</button>
                </div>
              </div>
            </motion.article>
          );
        })}
      </div>
    </>
  );

  const renderAuctions = () => (
    <>
      <div className="section-head">
        <h3>My Auction Activity</h3>
      </div>

      <section className="block-card">
        <h5 className="mb-3">Active Bids</h5>
        {activeBids.length === 0 ? (
          <p className="empty-note">You have no active bids at the moment.</p>
        ) : (
          activeBids.map((item) => (
            <div key={item.auction._id} className="d-flex justify-content-between border rounded-3 p-2 mb-2">
              <div>
                <strong>{item.auction.gem.type}</strong>
                <p className="m-0 text-secondary">Highest by you: {formatCurrency(item.myHighestBid)}</p>
                <small className={item.isWinning ? 'text-success' : 'text-danger'}>{item.isWinning ? 'Currently Leading' : 'Outbid'}</small>
              </div>
              <div className="text-end">
                <p className="m-0">{formatCurrency(item.auction.currentBid)}</p>
                <small className="text-secondary">{formatRemaining(item.auction.endTime)}</small>
              </div>
            </div>
          ))
        )}
      </section>

      <section className="block-card">
        <h5 className="mb-3">Won Auctions</h5>
        {wonAuctions.length === 0 ? (
          <p className="empty-note">No won auctions yet.</p>
        ) : (
          wonAuctions.map((auction) => (
            <div key={auction._id} className="d-flex justify-content-between border rounded-3 p-2 mb-2">
              <div>
                <strong>{auction.gem.type}</strong>
                <p className="m-0 text-secondary">Seller: {auction.seller.name}</p>
              </div>
              <div className="text-end">
                <strong>{formatCurrency(auction.currentBid)}</strong>
              </div>
            </div>
          ))
        )}
      </section>
    </>
  );

  const renderWatchlist = () => (
    <>
      <div className="section-head">
        <div>
          <h3>My Watchlist</h3>
          <p className="mb-0 text-secondary">{watchedAuctions.length} gems in your watchlist</p>
        </div>
      </div>
      <div className="market-grid">
        {watchedAuctions.map((auction) => (
          <article className="market-card" key={auction._id}>
            <img className="market-image" src={auction.gem.images[0]} alt={auction.gem.type} />
            <div className="market-body">
              <strong>{auction.gem.type}</strong>
              <p className="market-meta">{auction.gem.origin} � {auction.gem.carat} ct</p>
              <p className="market-meta">Current Bid</p>
              <div className="bid-price">{formatCurrency(auction.currentBid)}</div>
              <div className="d-flex gap-2 mt-2">
                <button className="alert-btn" type="button" onClick={() => toggleWatchlist(auction._id)}>
                  <X size={15} /> Remove
                </button>
                <button className="bid-btn" type="button" onClick={() => openDetails(auction._id)}>
                  Open
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
      {watchedAuctions.length === 0 && <p className="empty-note">No items in watchlist.</p>}
    </>
  );

  const renderBody = () => {
    if (!isBuyerAccount) {
      return (
        <div className="block-card p-4">
          <h3 className="mb-2">Buyer access required</h3>
          <p className="text-secondary mb-0">
            You are currently signed in as <strong>{user?.role || 'unknown'}</strong>. Switch to a buyer account to view dashboard data, active bids, and won auctions.
          </p>
        </div>
      );
    }

    if (loading) {
      return <p className="empty-note">Loading buyer workspace...</p>;
    }

    switch (view) {
      case 'marketplace':
        return renderMarketplace();
      case 'auctions':
        return renderAuctions();
      case 'watchlist':
        return renderWatchlist();
      default:
        return renderDashboard();
    }
  };

  return (
    <div className="buyer-shell">
      <aside className="buyer-sidebar">
        <div className="buyer-brand">
          <img src={logo} alt="GemFolio" />
          <h1>GemFolio</h1>
        </div>

        <div className="buyer-profile">
          <div className="buyer-avatar">{user?.name?.slice(0, 1).toUpperCase() || 'B'}</div>
          <div>
            <strong>{user?.name || 'Buyer'}</strong>
            <p className="buyer-role">Buyer</p>
          </div>
        </div>

        <nav className="buyer-nav">
          <button type="button" className={view === 'dashboard' ? 'active' : ''} onClick={() => setView('dashboard')}>
            <LayoutDashboard size={16} /> Dashboard
          </button>
          <button type="button" className={view === 'marketplace' ? 'active' : ''} onClick={() => setView('marketplace')}>
            <Compass size={16} /> Marketplace
          </button>
          <button type="button" className={view === 'auctions' ? 'active' : ''} onClick={() => setView('auctions')}>
            <Gavel size={16} /> Auctions
          </button>
          <button type="button" className={view === 'watchlist' ? 'active' : ''} onClick={() => setView('watchlist')}>
            <Heart size={16} /> My Watchlist
          </button>
        </nav>

        <div className="buyer-sidebar-bottom">
          <button type="button" className="ghost-btn w-100 mb-2 d-flex align-items-center justify-content-center gap-2">
            <Settings size={16} /> Settings
          </button>
          <button type="button" className="alert-btn w-100 d-flex align-items-center justify-content-center gap-2" onClick={handleSignOut}>
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </aside>

      <main className="buyer-content">
        <div className="buyer-topbar">
          <input
            className="buyer-search"
            placeholder="Search for gems, auctions..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <button className="ghost-btn" type="button"><Search size={16} /></button>
          <button className="ghost-btn" type="button"><Bell size={16} /></button>
          <button className="ghost-btn" type="button"><ShieldCheck size={16} /></button>
        </div>

        {renderBody()}
      </main>

      {(selectedAuction || loadingDetails) && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-sheet">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <strong>{selectedAuction?.gem.type || 'Loading details...'}</strong>
              <button className="ghost-btn" type="button" onClick={closeDetails}><X size={15} /></button>
            </div>

            {loadingDetails || !selectedAuction ? (
              <p className="empty-note">Loading auction details...</p>
            ) : (
              <div className="modal-grid">
                <div>
                  <img className="modal-photo" src={selectedAuction.gem.images[0]} alt={selectedAuction.gem.type} />
                  <div className="metric-row mt-2">
                    <div className="metric">
                      <p>Certified Authentic</p>
                      <strong>{selectedAuction.gem.certificate.authority}</strong>
                    </div>
                    <div className="metric">
                      <p>Certificate No</p>
                      <strong>{selectedAuction.gem.certificate.certificateNumber}</strong>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="metric-row">
                    <div className="metric"><p>Carat</p><strong>{selectedAuction.gem.carat} ct</strong></div>
                    <div className="metric"><p>Cut</p><strong>{selectedAuction.gem.cut}</strong></div>
                    <div className="metric"><p>Color</p><strong>{selectedAuction.gem.color}</strong></div>
                    <div className="metric"><p>Origin</p><strong>{selectedAuction.gem.origin}</strong></div>
                  </div>

                  <p className="text-secondary">{selectedAuction.gem.description}</p>

                  <section className="block-card">
                    <p className="m-0 text-secondary">Current Bid</p>
                    <div className="bid-price">{formatCurrency(selectedAuction.currentBid)}</div>
                    <p className="text-secondary small">
                      Minimum increment: {formatCurrency(selectedAuction.minimumBidIncrement)}
                    </p>

                    <div className="d-flex gap-2">
                      <input
                        className="buyer-search"
                        value={bidAmount}
                        onChange={(event) => setBidAmount(event.target.value)}
                        type="number"
                        min={selectedAuction.currentBid + selectedAuction.minimumBidIncrement}
                      />
                      <button className="bid-btn" type="button" disabled={placingBid} onClick={placeBid}>
                        {placingBid ? 'Placing...' : 'Place Bid'}
                      </button>
                    </div>

                    <div className="d-flex gap-2 mt-2">
                      <button
                        className="ghost-btn flex-fill"
                        type="button"
                        onClick={() => setBidAmount(String(selectedAuction.currentBid + selectedAuction.minimumBidIncrement))}
                      >
                        Min Bid
                      </button>
                      <button
                        className="ghost-btn flex-fill"
                        type="button"
                        onClick={() => setBidAmount(String(selectedAuction.currentBid + selectedAuction.minimumBidIncrement * 2))}
                      >
                        +2x Increment
                      </button>
                    </div>
                  </section>

                  <section className="block-card">
                    <h6>Bid History</h6>
                    {selectedAuction.bids.length === 0 ? (
                      <p className="text-secondary mb-0">No bids yet.</p>
                    ) : (
                      selectedAuction.bids.slice().reverse().slice(0, 5).map((bid, index) => (
                        <div key={`${bid.timestamp}-${index}`} className="d-flex justify-content-between border-bottom py-2">
                          <span>{bid.bidder.name}</span>
                          <strong>{formatCurrency(bid.amount)}</strong>
                        </div>
                      ))
                    )}
                  </section>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BuyerDashboard;
