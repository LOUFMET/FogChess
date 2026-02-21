import { Chess } from 'chess.js';
import {
  Color,
  FogPiece,
  GameOverState,
  MoveAttempt,
  Player,
  PlayerGameState,
  TimerState,
} from './types';

export class FogChessGame {
  private chess: Chess;
  private players: { w: Player; b: Player };
  private timers: { w: number; b: number };
  private lastMoveType: string | null = null;
  private lastCapturedPiece: string | null = null;
  private gameOver: GameOverState | null = null;
  private pendingDrawOffer: Color | null = null;
  private timerInterval: ReturnType<typeof setInterval> | null = null;
  private lastTickTime = 0;
  private onTimerUpdate: (timers: TimerState) => void;
  private onTimeout: (loser: Color) => void;
  public timerSeconds: number;

  constructor(
    white: Player,
    black: Player,
    timerSeconds: number,
    onTimerUpdate: (timers: TimerState) => void,
    onTimeout: (loser: Color) => void
  ) {
    this.chess = new Chess();
    this.players = { w: white, b: black };
    this.timerSeconds = timerSeconds;
    const ms = timerSeconds * 1000;
    this.timers = { w: ms, b: ms };
    this.onTimerUpdate = onTimerUpdate;
    this.onTimeout = onTimeout;
  }

  // Returns the pieces visible to a given player.
  // Own pieces: always visible.
  // Opponent pieces: only visible when peeking.
  getVisiblePieces(forColor: Color, peek = false): FogPiece[] {
    const board = this.chess.board();
    const result: FogPiece[] = [];
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

    for (let rank = 0; rank < 8; rank++) {
      for (let file = 0; file < 8; file++) {
        const piece = board[rank][file];
        if (!piece) continue;
        const isOwn = piece.color === forColor;
        if (isOwn || peek) {
          const square = `${files[file]}${8 - rank}`;
          result.push({ type: piece.type as FogPiece['type'], color: piece.color as Color, square });
        }
      }
    }
    return result;
  }

  // Attempt a move. Returns 'ok', 'illegal', 'not_your_turn', or 'game_over'.
  attemptMove(forColor: Color, attempt: MoveAttempt): 'ok' | 'illegal' | 'not_your_turn' | 'game_over' {
    if (this.gameOver) return 'game_over';
    if (this.chess.turn() !== forColor) return 'not_your_turn';

    let move = null;
    try {
      move = this.chess.move({
        from: attempt.from,
        to: attempt.to,
        promotion: attempt.promotion ?? 'q',
      });
    } catch {
      move = null;
    }

    if (!move) {
      // Illegal move: the player loses their turn.
      this.advanceTurn();
      this.lastMoveType = null;
      this.lastCapturedPiece = null;
      return 'illegal';
    }

    this.lastMoveType = move.piece;
    this.lastCapturedPiece = move.captured ?? null;
    this.checkGameOver();
    return 'ok';
  }

  // Peek: the player skips their turn to see all opponent pieces.
  // Returns false if not the player's turn or game is already over.
  peek(forColor: Color): boolean {
    if (this.gameOver) return false;
    if (this.chess.turn() !== forColor) return false;
    this.advanceTurn();
    this.lastMoveType = null;
    return true;
  }

  // Advance the turn without a real move (used for illegal move penalty and peek).
  // Manipulates the FEN string directly to flip the active color.
  private advanceTurn(): void {
    const fen = this.chess.fen();
    const parts = fen.split(' ');
    const wasWhite = parts[1] === 'w';
    parts[1] = wasWhite ? 'b' : 'w';
    // Clear en passant — no real move was made
    parts[3] = '-';
    // Increment halfmove clock
    parts[4] = String(parseInt(parts[4], 10) + 1);
    // If we flipped to white, increment fullmove number
    if (!wasWhite) {
      parts[5] = String(parseInt(parts[5], 10) + 1);
    }
    this.chess.load(parts.join(' '), { skipValidation: true });
  }

  private checkGameOver(): void {
    if (this.chess.isCheckmate()) {
      const loser = this.chess.turn();
      const winner: Color = loser === 'w' ? 'b' : 'w';
      this.setGameOver({ reason: 'checkmate', winner });
    } else if (this.chess.isStalemate() || this.chess.isDraw()) {
      this.setGameOver({ reason: 'stalemate', winner: null });
    }
  }

  private setGameOver(state: GameOverState): void {
    this.gameOver = state;
    this.stopTimer();
  }

  resign(forColor: Color): void {
    const winner: Color = forColor === 'w' ? 'b' : 'w';
    this.setGameOver({ reason: 'resign', winner });
  }

  offerDraw(forColor: Color): boolean {
    if (this.pendingDrawOffer !== null) return false;
    this.pendingDrawOffer = forColor;
    return true;
  }

  acceptDraw(forColor: Color): boolean {
    if (this.pendingDrawOffer === null || this.pendingDrawOffer === forColor) return false;
    this.setGameOver({ reason: 'draw', winner: null });
    return true;
  }

  declineDraw(): void {
    this.pendingDrawOffer = null;
  }

  // Build the board state to send to a specific player.
  buildStateFor(forColor: Color, isPeeking = false): PlayerGameState {
    const isMyTurn = this.chess.turn() === forColor;

    return {
      pieces: this.getVisiblePieces(forColor, isPeeking),
      turn: this.chess.turn() as Color,
      myColor: forColor,
      myTurn: isMyTurn,
      isInCheck: isMyTurn && this.chess.inCheck(),
      timers: { w: this.timers.w, b: this.timers.b },
      lastOpponentMoveType: isMyTurn ? (this.lastMoveType as FogPiece['type'] | null) : null,
      isPeeking,
      gameOver: this.gameOver,
      moveNumber: Math.ceil(this.chess.history().length / 2),
    };
  }

  startTimer(): void {
    this.lastTickTime = Date.now();
    this.timerInterval = setInterval(() => {
      const now = Date.now();
      const elapsed = now - this.lastTickTime;
      this.lastTickTime = now;

      const activeColor = this.chess.turn() as Color;
      this.timers[activeColor] -= elapsed;

      if (this.timers[activeColor] <= 0) {
        this.timers[activeColor] = 0;
        this.gameOver = { reason: 'timeout', winner: activeColor === 'w' ? 'b' : 'w' };
        this.stopTimer();
        this.onTimeout(activeColor);
      } else {
        this.onTimerUpdate({ w: this.timers.w, b: this.timers.b });
      }
    }, 1000);
  }

  stopTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  getLastCapturedPiece(): string | null {
    return this.lastCapturedPiece;
  }

  getGameOver(): GameOverState | null {
    return this.gameOver;
  }

  getTurn(): Color {
    return this.chess.turn() as Color;
  }

  getPlayerByColor(color: Color): Player {
    return this.players[color];
  }

  getPendingDrawOffer(): Color | null {
    return this.pendingDrawOffer;
  }
}
