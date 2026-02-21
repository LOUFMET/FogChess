import type { Color, PieceType } from '../types';
import { PieceIcon } from './PieceIcon';

const PROMOTION_PIECES: PieceType[] = ['q', 'r', 'b', 'n'];

interface PromotionDialogProps {
  color: Color;
  onChoose: (piece: PieceType) => void;
  onCancel: () => void;
}

export function PromotionDialog({ color, onChoose, onCancel }: PromotionDialogProps) {
  return (
    <div className="promotion-overlay" onClick={onCancel}>
      <div className="promotion-dialog" onClick={(e) => e.stopPropagation()}>
        <p>Choose a promotion piece</p>
        <div className="promotion-choices">
          {PROMOTION_PIECES.map((p) => (
            <button key={p} className="promotion-piece-btn" onClick={() => onChoose(p)}>
              <PieceIcon type={p} color={color} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
