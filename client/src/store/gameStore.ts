import { create } from 'zustand';
import type { Color, PlayerGameState, TimerState } from '../types';

export type GamePhase = 'lobby' | 'waiting' | 'playing' | 'gameover';

interface GameStore {
  phase: GamePhase;
  username: string;
  roomCode: string;
  myColor: Color | null;
  opponentUsername: string;
  timerSeconds: number;
  gameState: PlayerGameState | null;
  selectedSquare: string | null;
  legalMoveTargets: string[];
  lastMoveResult: { legal: boolean; from: string; to: string } | null;
  pendingPromotion: { from: string; to: string } | null;
  drawOfferPending: boolean;
  rematchRequested: boolean;
  notifications: string[];

  setUsername: (name: string) => void;
  setRoomCode: (code: string) => void;
  setPhase: (phase: GamePhase) => void;
  setMyColor: (color: Color) => void;
  setOpponentUsername: (name: string) => void;
  setTimerSeconds: (s: number) => void;
  setGameState: (state: PlayerGameState) => void;
  updateTimers: (timers: TimerState) => void;
  setSelectedSquare: (sq: string | null, legalTargets?: string[]) => void;
  setLastMoveResult: (r: { legal: boolean; from: string; to: string } | null) => void;
  setPendingPromotion: (p: { from: string; to: string } | null) => void;
  setDrawOfferPending: (v: boolean) => void;
  setRematchRequested: (v: boolean) => void;
  addNotification: (msg: string) => void;
  clearNotification: (msg: string) => void;
  reset: () => void;
}

const defaults = {
  phase: 'lobby' as GamePhase,
  username: '',
  roomCode: '',
  myColor: null,
  opponentUsername: '',
  timerSeconds: 300,
  gameState: null,
  selectedSquare: null,
  legalMoveTargets: [],
  lastMoveResult: null,
  pendingPromotion: null,
  drawOfferPending: false,
  rematchRequested: false,
  notifications: [],
};

export const useGameStore = create<GameStore>((set) => ({
  ...defaults,
  setUsername: (username) => set({ username }),
  setRoomCode: (roomCode) => set({ roomCode }),
  setPhase: (phase) => set({ phase }),
  setMyColor: (myColor) => set({ myColor }),
  setOpponentUsername: (opponentUsername) => set({ opponentUsername }),
  setTimerSeconds: (timerSeconds) => set({ timerSeconds }),
  setGameState: (gameState) =>
    set({ gameState, selectedSquare: null, legalMoveTargets: [] }),
  updateTimers: (timers) =>
    set((s) => ({ gameState: s.gameState ? { ...s.gameState, timers } : null })),
  setSelectedSquare: (selectedSquare, legalMoveTargets = []) =>
    set({ selectedSquare, legalMoveTargets }),
  setLastMoveResult: (lastMoveResult) => set({ lastMoveResult }),
  setPendingPromotion: (pendingPromotion) => set({ pendingPromotion }),
  setDrawOfferPending: (drawOfferPending) => set({ drawOfferPending }),
  setRematchRequested: (rematchRequested) => set({ rematchRequested }),
  addNotification: (msg) =>
    set((s) => ({ notifications: [...s.notifications, msg] })),
  clearNotification: (msg) =>
    set((s) => ({ notifications: s.notifications.filter((n) => n !== msg) })),
  reset: () => set(defaults),
}));
