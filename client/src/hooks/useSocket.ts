import { useEffect } from 'react';
import { getSocket } from '../socket';
import { useGameStore } from '../store/gameStore';
import type { GameOverState, PlayerGameState, TimerState } from '../types';
import { PIECE_NAMES } from '../types';
import { playCaptureSound, playCapturedSound } from '../utils/sounds';

export function useSocket() {
  const store = useGameStore();
  const socket = getSocket();

  useEffect(() => {
    if (!socket.connected) socket.connect();

    socket.on('room_created', ({ roomCode }: { roomCode: string }) => {
      store.setRoomCode(roomCode);
      store.setPhase('waiting');
    });

    socket.on(
      'room_joined',
      ({
        roomCode,
        color,
        opponentUsername,
        timerSeconds,
      }: {
        roomCode: string;
        color: 'w' | 'b';
        opponentUsername: string;
        timerSeconds: number;
      }) => {
        store.setRoomCode(roomCode);
        store.setMyColor(color);
        store.setOpponentUsername(opponentUsername);
        store.setTimerSeconds(timerSeconds);
        // Don't change phase here — wait for game_start
      }
    );

    socket.on('room_error', ({ message }: { message: string }) => {
      store.addNotification(`Error: ${message}`);
      setTimeout(() => store.clearNotification(`Error: ${message}`), 4000);
    });

    socket.on(
      'game_start',
      ({
        whiteUsername,
        blackUsername,
      }: {
        whiteUsername: string;
        blackUsername: string;
        timerSeconds: number;
      }) => {
        const myUsername = store.username;
        const opponentUsername =
          myUsername === whiteUsername ? blackUsername : whiteUsername;
        store.setOpponentUsername(opponentUsername);
        store.setPhase('playing');
      }
    );

    socket.on('game_state', (state: PlayerGameState) => {
      const prev = store.gameState;

      // Detect when the opponent captured one of our pieces:
      // the transition is: it was our turn, now it's theirs (they just moved),
      // and our piece count dropped.
      if (prev && state.myTurn && !prev.myTurn) {
        const prevCount = prev.pieces.filter((p) => p.color === state.myColor).length;
        const currCount = state.pieces.filter((p) => p.color === state.myColor).length;
        if (currCount < prevCount) {
          playCapturedSound();
          const msg = 'One of your pieces was captured!';
          store.addNotification(msg);
          setTimeout(() => store.clearNotification(msg), 2500);
        }
      }

      store.setMyColor(state.myColor);
      store.setGameState(state);
      if (state.gameOver) {
        store.setPhase('gameover');
      }
    });

    socket.on(
      'move_result',
      ({
        legal,
        from,
        to,
        capturedPiece,
      }: {
        legal: boolean;
        from?: string;
        to?: string;
        capturedPiece?: string | null;
      }) => {
        if (!legal) {
          store.setLastMoveResult({ legal: false, from: from ?? '', to: to ?? '' });
          setTimeout(() => store.setLastMoveResult(null), 800);
        } else if (capturedPiece) {
          // We successfully captured an opponent's piece.
          playCaptureSound();
          const name = PIECE_NAMES[capturedPiece as keyof typeof PIECE_NAMES] ?? capturedPiece;
          const msg = `You captured a ${name}!`;
          store.addNotification(msg);
          setTimeout(() => store.clearNotification(msg), 2500);
        }
      }
    );

    socket.on('timer_tick', (timers: TimerState) => {
      store.updateTimers(timers);
    });

    socket.on('draw_offered', () => {
      store.setDrawOfferPending(true);
    });

    socket.on('draw_declined', () => {
      store.addNotification('Draw offer declined');
      setTimeout(() => store.clearNotification('Draw offer declined'), 3000);
    });

    socket.on('opponent_peeked', () => {
      store.addNotification('Opponent observed the board!');
      setTimeout(() => store.clearNotification('Opponent observed the board!'), 3000);
    });

    socket.on('rematch_requested', () => {
      store.setRematchRequested(true);
    });

    socket.on(
      'opponent_disconnected',
      ({ username }: { username: string }) => {
        store.addNotification(`${username} disconnected`);
      }
    );

    socket.on('game_over', (_state: GameOverState) => {
      store.setPhase('gameover');
    });

    return () => {
      socket.off('room_created');
      socket.off('room_joined');
      socket.off('room_error');
      socket.off('game_start');
      socket.off('game_state');
      socket.off('move_result');
      socket.off('timer_tick');
      socket.off('draw_offered');
      socket.off('draw_declined');
      socket.off('opponent_peeked');
      socket.off('rematch_requested');
      socket.off('opponent_disconnected');
      socket.off('game_over');
    };
  }, []);

  return socket;
}
