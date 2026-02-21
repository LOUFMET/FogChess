export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
export type Color = 'w' | 'b';
export type Square = string;

export interface FogPiece {
  type: PieceType;
  color: Color;
  square: Square;
}

export interface TimerState {
  w: number;
  b: number;
}

export interface GameOverState {
  reason: 'checkmate' | 'stalemate' | 'timeout' | 'resign' | 'draw';
  winner: Color | null;
}

export interface PlayerGameState {
  pieces: FogPiece[];
  turn: Color;
  myColor: Color;
  myTurn: boolean;
  isInCheck: boolean;
  timers: TimerState;
  lastOpponentMoveType: PieceType | null;
  isPeeking: boolean;
  gameOver: GameOverState | null;
  moveNumber: number;
}

export const PIECE_NAMES: Record<PieceType, string> = {
  p: 'Pawn',
  n: 'Knight',
  b: 'Bishop',
  r: 'Rook',
  q: 'Queen',
  k: 'King',
};
