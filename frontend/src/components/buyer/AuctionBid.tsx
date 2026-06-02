import { X } from 'lucide-react';
import type { Auction } from '../../types';

interface AuctionBidProps {
  show: boolean;
  selectedAuction: Auction | null;
  bidAmount: string;
  placingBid: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  formatCurrency: (value: number) => string;
}

const AuctionBid = ({
  show,
  selectedAuction,
  bidAmount,
  placingBid,
  onCancel,
  onConfirm,
  formatCurrency,
}: AuctionBidProps) => {
  if (!show || !selectedAuction) {
    return null;
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-sheet modal-sheet-sm">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <strong>Confirm Your Bid</strong>
          <button className="ghost-btn" type="button" onClick={onCancel}>
            <X size={15} />
          </button>
        </div>

        <p className="text-secondary mb-2">
          You are about to place <strong>{formatCurrency(Number(bidAmount) || 0)}</strong> on <strong>{selectedAuction.gem.type}</strong>.
        </p>
        <p className="text-secondary mb-3">
          Current leading bid is {formatCurrency(selectedAuction.currentBid)} and the minimum next bid is {formatCurrency(selectedAuction.currentBid + selectedAuction.minimumBidIncrement)}.
        </p>

        <div className="d-flex gap-2 justify-content-end">
          <button className="ghost-btn" type="button" onClick={onCancel}>
            Cancel
          </button>
          <button className="bid-btn" type="button" disabled={placingBid} onClick={onConfirm}>
            {placingBid ? 'Placing...' : 'Confirm Bid'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuctionBid;