import type { Color, PieceType } from '../types';

// Unicode chess pieces
const UNICODE: Record<Color, Record<PieceType, string>> = {
  w: { k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙' },
  b: { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' },
};

interface PieceIconProps {
  type: PieceType;
  color: Color;
}

export function PieceIcon({ type, color }: PieceIconProps) {
  return (
    <span className={`piece piece-${color}`} aria-label={`${color === 'w' ? 'white' : 'black'} ${type}`}>
      {UNICODE[color][type]}
    </span>
  );
}
