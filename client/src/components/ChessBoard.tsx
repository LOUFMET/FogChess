import { useCallback } from 'react';
import { getSocket } from '../socket';
import { useGameStore } from '../store/gameStore';
import type { Color, FogPiece, PieceType } from '../types';
import { PieceIcon } from './PieceIcon';
import { PromotionDialog } from './PromotionDialog';

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = [8, 7, 6, 5, 4, 3, 2, 1];

// Compute which squares are fogged for this player.
// Every square NOT occupied by own piece is in fog (unless peeking).
function getFoggedSquares(pieces: FogPiece[], myColor: Color, isPeeking: boolean): Set<string> {
  if (isPeeking) return new Set();
  const ownSquares = new Set(pieces.filter((p) => p.color === myColor).map((p) => p.square));
  const fogged = new Set<string>();
  for (const file of FILES) {
    for (const rank of RANKS) {
      const sq = `${file}${rank}`;
      if (!ownSquares.has(sq)) fogged.add(sq);
    }
  }
  return fogged;
}

// Compute candidate move targets for a selected own piece.
// We compute reachable squares based on piece geometry (ignoring unknown opponent pieces).
// This is intentionally approximate — the fog makes full accuracy impossible.
function getLegalMoveTargets(
  from: string,
  piece: FogPiece,
  allOwnPieces: FogPiece[]
): string[] {
  const file = from.charCodeAt(0) - 97; // 0-7
  const rank = parseInt(from[1], 10) - 1; // 0-7
  const ownSquares = new Set(allOwnPieces.map((p) => p.square));
  const targets: string[] = [];

  function add(f: number, r: number) {
    if (f < 0 || f > 7 || r < 0 || r > 7) return false;
    const sq = `${FILES[f]}${r + 1}`;
    if (ownSquares.has(sq)) return false; // blocked by own piece
    targets.push(sq);
    return true; // can continue sliding
  }

  function slide(df: number, dr: number) {
    let f = file + df;
    let r = rank + dr;
    while (f >= 0 && f <= 7 && r >= 0 && r <= 7) {
      const sq = `${FILES[f]}${r + 1}`;
      if (ownSquares.has(sq)) break; // blocked
      targets.push(sq);
      break; // in fog chess we can't know if opponent blocks, show all reach
      // NOTE: we show the full ray but the server will reject if blocked
    }
    // Actually for fog chess the player can ATTEMPT any square in the ray
    // even if an opponent piece might block it. They just risk losing their turn.
    // So we show the full ray.
    f = file + df;
    r = rank + dr;
    targets.pop(); // remove the one we added above
    while (f >= 0 && f <= 7 && r >= 0 && r <= 7) {
      const sq = `${FILES[f]}${r + 1}`;
      if (ownSquares.has(sq)) break;
      targets.push(sq);
      f += df;
      r += dr;
    }
  }

  const color = piece.color;

  switch (piece.type) {
    case 'p': {
      const dir = color === 'w' ? 1 : -1;
      const startRank = color === 'w' ? 1 : 6;
      // Forward move(s)
      const r1 = rank + dir;
      if (r1 >= 0 && r1 <= 7) {
        const sq1 = `${FILES[file]}${r1 + 1}`;
        if (!ownSquares.has(sq1)) {
          targets.push(sq1);
          // Double push from start
          if (rank === startRank) {
            const r2 = rank + 2 * dir;
            const sq2 = `${FILES[file]}${r2 + 1}`;
            if (!ownSquares.has(sq2)) targets.push(sq2);
          }
        }
      }
      // Diagonal captures (always show — might be an opponent piece there)
      for (const df of [-1, 1]) {
        const fc = file + df;
        const rc = rank + dir;
        if (fc >= 0 && fc <= 7 && rc >= 0 && rc <= 7) {
          const sq = `${FILES[fc]}${rc + 1}`;
          if (!ownSquares.has(sq)) targets.push(sq);
        }
      }
      break;
    }
    case 'n': {
      const jumps = [
        [2, 1], [2, -1], [-2, 1], [-2, -1],
        [1, 2], [1, -2], [-1, 2], [-1, -2],
      ];
      for (const [df, dr] of jumps) add(file + df, rank + dr);
      break;
    }
    case 'b':
      slide(1, 1); slide(1, -1); slide(-1, 1); slide(-1, -1);
      break;
    case 'r':
      slide(1, 0); slide(-1, 0); slide(0, 1); slide(0, -1);
      break;
    case 'q':
      slide(1, 1); slide(1, -1); slide(-1, 1); slide(-1, -1);
      slide(1, 0); slide(-1, 0); slide(0, 1); slide(0, -1);
      break;
    case 'k': {
      const dirs = [
        [1, 0], [-1, 0], [0, 1], [0, -1],
        [1, 1], [1, -1], [-1, 1], [-1, -1],
      ];
      for (const [df, dr] of dirs) add(file + df, rank + dr);
      // Castling hints
      if (color === 'w' && from === 'e1') {
        if (!ownSquares.has('f1') && !ownSquares.has('g1')) targets.push('g1');
        if (!ownSquares.has('d1') && !ownSquares.has('c1')) targets.push('c1');
      }
      if (color === 'b' && from === 'e8') {
        if (!ownSquares.has('f8') && !ownSquares.has('g8')) targets.push('g8');
        if (!ownSquares.has('d8') && !ownSquares.has('c8')) targets.push('c8');
      }
      break;
    }
  }

  return [...new Set(targets)];
}

export function ChessBoard() {
  const {
    gameState,
    myColor,
    selectedSquare,
    legalMoveTargets,
    lastMoveResult,
    pendingPromotion,
    setSelectedSquare,
    setPendingPromotion,
  } = useGameStore();

  const socket = getSocket();

  const handleSquareClick = useCallback(
    (square: string) => {
      if (!gameState || !gameState.myTurn || gameState.isPeeking) return;

      const pieces = gameState.pieces;
      const myPieces = pieces.filter((p) => p.color === myColor);
      const clickedOwnPiece = myPieces.find((p) => p.square === square);

      // If clicking own piece: select it
      if (clickedOwnPiece) {
        if (selectedSquare === square) {
          setSelectedSquare(null);
        } else {
          const targets = getLegalMoveTargets(square, clickedOwnPiece, myPieces);
          setSelectedSquare(square, targets);
        }
        return;
      }

      // If a piece is selected and we click a legal target: attempt the move
      if (selectedSquare && legalMoveTargets.includes(square)) {
        const movingPiece = myPieces.find((p) => p.square === selectedSquare);

        // Check for pawn promotion
        if (movingPiece?.type === 'p') {
          const targetRank = square[1];
          const isPromotion =
            (myColor === 'w' && targetRank === '8') ||
            (myColor === 'b' && targetRank === '1');
          if (isPromotion) {
            setPendingPromotion({ from: selectedSquare, to: square });
            return;
          }
        }

        socket.emit('attempt_move', { from: selectedSquare, to: square });
        setSelectedSquare(null);
        return;
      }

      // Click on an empty or fogged square without selection: deselect
      setSelectedSquare(null);
    },
    [gameState, myColor, selectedSquare, legalMoveTargets, socket, setSelectedSquare, setPendingPromotion]
  );

  function handlePromotion(piece: PieceType) {
    if (!pendingPromotion) return;
    socket.emit('attempt_move', { ...pendingPromotion, promotion: piece });
    setPendingPromotion(null);
    setSelectedSquare(null);
  }

  if (!gameState) return null;

  const { pieces, isPeeking, isInCheck } = gameState;
  const foggedSquares = getFoggedSquares(pieces, myColor!, isPeeking);

  // Build a map from square -> piece for fast lookup
  const pieceMap = new Map<string, FogPiece>();
  for (const p of pieces) pieceMap.set(p.square, p);

  // Board orientation: player's pieces at bottom
  const ranks = myColor === 'w' ? RANKS : [...RANKS].reverse();
  const files = myColor === 'w' ? FILES : [...FILES].reverse();

  // Find king square for check highlight
  const myKing = pieces.find((p) => p.type === 'k' && p.color === myColor);

  return (
    <div className="chess-board-wrapper">
      <div className="chess-board">
        {ranks.map((rank) =>
          files.map((file) => {
            const square = `${file}${rank}`;
            const piece = pieceMap.get(square);
            const isFogged = foggedSquares.has(square);
            const isSelected = selectedSquare === square;
            const isLegalTarget = legalMoveTargets.includes(square);
            const isKingInCheck = isInCheck && square === myKing?.square;
            const isIllegalFrom = lastMoveResult && !lastMoveResult.legal && lastMoveResult.from === square;
            const isIllegalTo = lastMoveResult && !lastMoveResult.legal && lastMoveResult.to === square;
            const isLight = (FILES.indexOf(file) + rank) % 2 === 0;

            return (
              <div
                key={square}
                className={[
                  'square',
                  isLight ? 'light' : 'dark',
                  isSelected ? 'selected' : '',
                  isKingInCheck ? 'in-check' : '',
                  isIllegalFrom || isIllegalTo ? 'illegal' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => handleSquareClick(square)}
                data-square={square}
              >
                {/* Rank label on the leftmost file */}
                {file === (myColor === 'w' ? 'a' : 'h') && (
                  <span className="rank-label">{rank}</span>
                )}
                {/* File label on the bottom rank */}
                {rank === (myColor === 'w' ? 1 : 8) && (
                  <span className="file-label">{file}</span>
                )}

                {piece && <PieceIcon type={piece.type} color={piece.color} />}

                {/* Fog overlay */}
                {isFogged && <div className="fog-overlay" />}

                {/* Legal move dot */}
                {isLegalTarget && !isFogged && (
                  <div className={`legal-dot ${piece ? 'capture' : ''}`} />
                )}
                {isLegalTarget && isFogged && (
                  <div className="legal-dot fogged" />
                )}
              </div>
            );
          })
        )}
      </div>

      {pendingPromotion && (
        <PromotionDialog
          color={myColor!}
          onChoose={handlePromotion}
          onCancel={() => setPendingPromotion(null)}
        />
      )}
    </div>
  );
}
