import { FogChessGame } from './FogChessGame';
import { Color } from './types';

interface PendingRoom {
  creatorSocketId: string;
  creatorUsername: string;
  timerSeconds: number;
}

export interface ActiveRoom {
  game: FogChessGame;
  socketIds: { w: string; b: string };
  usernames: { w: string; b: string };
  rematchVotes: Set<string>;
}

type JoinResult =
  | {
      success: true;
      timerSeconds: number;
      whiteSocketId: string;
      blackSocketId: string;
      whiteUsername: string;
      blackUsername: string;
    }
  | { success: false; reason: string };

export class RoomManager {
  private pendingRooms = new Map<string, PendingRoom>();
  private activeRooms = new Map<string, ActiveRoom>();
  private socketToRoom = new Map<string, string>();

  createRoom(roomCode: string, socketId: string, username: string, timerSeconds: number): void {
    this.pendingRooms.set(roomCode, { creatorSocketId: socketId, creatorUsername: username, timerSeconds });
  }

  joinRoom(roomCode: string, joinerSocketId: string, joinerUsername: string): JoinResult {
    const pending = this.pendingRooms.get(roomCode);
    if (!pending) return { success: false, reason: 'Room not found' };
    if (pending.creatorSocketId === joinerSocketId) {
      return { success: false, reason: 'Cannot join your own room' };
    }

    this.pendingRooms.delete(roomCode);

    // Randomly assign colors
    const [whiteSocketId, blackSocketId] =
      Math.random() < 0.5
        ? [pending.creatorSocketId, joinerSocketId]
        : [joinerSocketId, pending.creatorSocketId];

    const whiteUsername =
      whiteSocketId === pending.creatorSocketId ? pending.creatorUsername : joinerUsername;
    const blackUsername =
      blackSocketId === pending.creatorSocketId ? pending.creatorUsername : joinerUsername;

    this.socketToRoom.set(pending.creatorSocketId, roomCode);
    this.socketToRoom.set(joinerSocketId, roomCode);

    return {
      success: true,
      timerSeconds: pending.timerSeconds,
      whiteSocketId,
      blackSocketId,
      whiteUsername,
      blackUsername,
    };
  }

  registerActiveRoom(roomCode: string, room: ActiveRoom): void {
    this.activeRooms.set(roomCode, room);
  }

  getActiveRoom(roomCode: string): ActiveRoom | undefined {
    return this.activeRooms.get(roomCode);
  }

  getRoomBySocket(socketId: string): string | undefined {
    return this.socketToRoom.get(socketId);
  }

  handleDisconnect(socketId: string): { roomCode: string; room: ActiveRoom } | null {
    // Remove from pending rooms if creator disconnects
    for (const [code, pending] of this.pendingRooms.entries()) {
      if (pending.creatorSocketId === socketId) {
        this.pendingRooms.delete(code);
        return null;
      }
    }

    const roomCode = this.socketToRoom.get(socketId);
    if (!roomCode) return null;

    const room = this.activeRooms.get(roomCode);
    if (!room) return null;

    return { roomCode, room };
  }

  cleanupRoom(roomCode: string): void {
    const room = this.activeRooms.get(roomCode);
    if (room) {
      room.game.stopTimer();
      this.socketToRoom.delete(room.socketIds.w);
      this.socketToRoom.delete(room.socketIds.b);
      this.activeRooms.delete(roomCode);
    }
  }

  getColorForSocket(socketId: string, room: ActiveRoom): Color | null {
    if (room.socketIds.w === socketId) return 'w';
    if (room.socketIds.b === socketId) return 'b';
    return null;
  }
}
