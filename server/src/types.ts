export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
export type Color = 'w' | 'b';
export type Square = string;

export interface FogPiece {
  type: PieceType;
  color: Color;
  square: Square;
}

export interface TimerState {
  w: number; // milliseconds remaining
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

export interface MoveAttempt {
  from: Square;
  to: Square;
  promotion?: PieceType;
}

export interface Player {
  socketId: string;
  username: string;
  color: Color;
}
