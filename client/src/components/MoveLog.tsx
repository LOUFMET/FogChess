import { PIECE_NAMES } from '../types';
import type { PieceType } from '../types';

interface MoveLogProps {
  lastOpponentMoveType: PieceType | null;
  moveNumber: number;
  isPeeking: boolean;
}

export function MoveLog({ lastOpponentMoveType, moveNumber, isPeeking }: MoveLogProps) {
  if (isPeeking) {
    return (
      <div className="move-log peeking">
        <span className="peek-banner">Observing the board...</span>
      </div>
    );
  }

  if (!lastOpponentMoveType) {
    return (
      <div className="move-log empty">
        <span>Waiting for the first opponent move</span>
      </div>
    );
  }

  return (
    <div className="move-log">
      <span className="move-info">
        Move {moveNumber} — Opponent played a{' '}
        <strong>{PIECE_NAMES[lastOpponentMoveType]}</strong>
      </span>
    </div>
  );
}
