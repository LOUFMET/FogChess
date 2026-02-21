import { Server, Socket } from 'socket.io';
import { nanoid } from 'nanoid';
import { RoomManager, ActiveRoom } from './RoomManager';
import { FogChessGame } from './FogChessGame';
import { Color, MoveAttempt } from './types';

function sendBothStates(io: Server, room: ActiveRoom, game: FogChessGame): void {
  io.to(room.socketIds.w).emit('game_state', game.buildStateFor('w'));
  io.to(room.socketIds.b).emit('game_state', game.buildStateFor('b'));
}

export function registerSocketHandlers(
  io: Server,
  socket: Socket,
  roomManager: RoomManager
): void {
  // ---------------------------------------------------------------------------
  // CREATE ROOM
  // ---------------------------------------------------------------------------
  socket.on(
    'create_room',
    ({ username, timerSeconds }: { username: string; timerSeconds: number }) => {
      const roomCode = nanoid(6).toUpperCase();
      roomManager.createRoom(roomCode, socket.id, username.trim(), timerSeconds);
      socket.join(roomCode);
      socket.emit('room_created', { roomCode });
      console.log(`[${roomCode}] Room created by "${username}"`);
    }
  );

  // ---------------------------------------------------------------------------
  // JOIN ROOM
  // ---------------------------------------------------------------------------
  socket.on(
    'join_room',
    ({ roomCode, username }: { roomCode: string; username: string }) => {
      const code = roomCode.trim().toUpperCase();
      const result = roomManager.joinRoom(code, socket.id, username.trim());

      if (!result.success) {
        socket.emit('room_error', { message: result.reason });
        return;
      }

      const { whiteSocketId, blackSocketId, whiteUsername, blackUsername, timerSeconds } = result;

      const whiteSocket = io.sockets.sockets.get(whiteSocketId);
      const blackSocket = io.sockets.sockets.get(blackSocketId);

      if (!whiteSocket || !blackSocket) {
        socket.emit('room_error', { message: 'Connection error. Please try again.' });
        return;
      }

      whiteSocket.join(code);
      blackSocket.join(code);

      whiteSocket.emit('room_joined', {
        roomCode: code,
        color: 'w',
        opponentUsername: blackUsername,
        timerSeconds,
      });
      blackSocket.emit('room_joined', {
        roomCode: code,
        color: 'b',
        opponentUsername: whiteUsername,
        timerSeconds,
      });

      // Build the game
      const game = new FogChessGame(
        { socketId: whiteSocketId, username: whiteUsername, color: 'w' },
        { socketId: blackSocketId, username: blackUsername, color: 'b' },
        timerSeconds,
        (timers) => io.to(code).emit('timer_tick', timers),
        (loser) => {
          const activeRoom = roomManager.getActiveRoom(code);
          if (activeRoom) {
            sendBothStates(io, activeRoom, game);
          }
          io.to(code).emit('game_over', game.getGameOver());
        }
      );

      const room: ActiveRoom = {
        game,
        socketIds: { w: whiteSocketId, b: blackSocketId },
        usernames: { w: whiteUsername, b: blackUsername },
        rematchVotes: new Set(),
      };
      roomManager.registerActiveRoom(code, room);

      io.to(code).emit('game_start', { whiteUsername, blackUsername, timerSeconds });
      sendBothStates(io, room, game);
      game.startTimer();

      console.log(`[${code}] Game started: ${whiteUsername} (w) vs ${blackUsername} (b)`);
    }
  );

  // ---------------------------------------------------------------------------
  // ATTEMPT MOVE
  // ---------------------------------------------------------------------------
  socket.on('attempt_move', (attempt: MoveAttempt) => {
    const roomCode = roomManager.getRoomBySocket(socket.id);
    if (!roomCode) return;

    const room = roomManager.getActiveRoom(roomCode);
    if (!room) return;

    const myColor = roomManager.getColorForSocket(socket.id, room);
    if (!myColor) return;

    const result = room.game.attemptMove(myColor, attempt);
    if (result === 'not_your_turn' || result === 'game_over') return;

    socket.emit('move_result', {
      legal: result === 'ok',
      capturedPiece: result === 'ok' ? room.game.getLastCapturedPiece() : null,
    });
    sendBothStates(io, room, room.game);

    if (room.game.getGameOver()) {
      io.to(roomCode).emit('game_over', room.game.getGameOver());
    }
  });

  // ---------------------------------------------------------------------------
  // PEEK (skip turn to see all opponent pieces for 2 seconds)
  // ---------------------------------------------------------------------------
  socket.on('peek', () => {
    const roomCode = roomManager.getRoomBySocket(socket.id);
    if (!roomCode) return;

    const room = roomManager.getActiveRoom(roomCode);
    if (!room) return;

    const myColor = roomManager.getColorForSocket(socket.id, room);
    if (!myColor) return;

    const success = room.game.peek(myColor);
    if (!success) return;

    const opponentColor: Color = myColor === 'w' ? 'b' : 'w';
    const opponentSocketId = room.socketIds[opponentColor];

    // Send peek view (full board visible) to the peeking player
    socket.emit('game_state', room.game.buildStateFor(myColor, true));

    // Notify opponent
    io.to(opponentSocketId).emit('opponent_peeked');

    // After 2 seconds, send the normal state to both players
    setTimeout(() => {
      const currentRoom = roomManager.getActiveRoom(roomCode);
      if (!currentRoom) return;
      socket.emit('game_state', currentRoom.game.buildStateFor(myColor, false));
      io.to(opponentSocketId).emit('game_state', currentRoom.game.buildStateFor(opponentColor, false));
    }, 2000);
  });

  // ---------------------------------------------------------------------------
  // RESIGN
  // ---------------------------------------------------------------------------
  socket.on('resign', () => {
    const roomCode = roomManager.getRoomBySocket(socket.id);
    if (!roomCode) return;

    const room = roomManager.getActiveRoom(roomCode);
    if (!room) return;

    const myColor = roomManager.getColorForSocket(socket.id, room);
    if (!myColor) return;

    room.game.resign(myColor);
    sendBothStates(io, room, room.game);
    io.to(roomCode).emit('game_over', room.game.getGameOver());
  });

  // ---------------------------------------------------------------------------
  // DRAW OFFER
  // ---------------------------------------------------------------------------
  socket.on('request_draw', () => {
    const roomCode = roomManager.getRoomBySocket(socket.id);
    if (!roomCode) return;

    const room = roomManager.getActiveRoom(roomCode);
    if (!room) return;

    const myColor = roomManager.getColorForSocket(socket.id, room);
    if (!myColor) return;

    if (room.game.offerDraw(myColor)) {
      const opponentColor: Color = myColor === 'w' ? 'b' : 'w';
      io.to(room.socketIds[opponentColor]).emit('draw_offered');
    }
  });

  socket.on('accept_draw', () => {
    const roomCode = roomManager.getRoomBySocket(socket.id);
    if (!roomCode) return;

    const room = roomManager.getActiveRoom(roomCode);
    if (!room) return;

    const myColor = roomManager.getColorForSocket(socket.id, room);
    if (!myColor) return;

    if (room.game.acceptDraw(myColor)) {
      sendBothStates(io, room, room.game);
      io.to(roomCode).emit('game_over', room.game.getGameOver());
    }
  });

  socket.on('decline_draw', () => {
    const roomCode = roomManager.getRoomBySocket(socket.id);
    if (!roomCode) return;

    const room = roomManager.getActiveRoom(roomCode);
    if (!room) return;

    const myColor = roomManager.getColorForSocket(socket.id, room);
    if (!myColor) return;

    room.game.declineDraw();
    const opponentColor: Color = myColor === 'w' ? 'b' : 'w';
    io.to(room.socketIds[opponentColor]).emit('draw_declined');
  });

  // ---------------------------------------------------------------------------
  // REMATCH
  // ---------------------------------------------------------------------------
  socket.on('rematch_request', () => {
    const roomCode = roomManager.getRoomBySocket(socket.id);
    if (!roomCode) return;

    const room = roomManager.getActiveRoom(roomCode);
    if (!room || !room.game.getGameOver()) return;

    room.rematchVotes.add(socket.id);

    const myColor = roomManager.getColorForSocket(socket.id, room);
    if (!myColor) return;
    const opponentColor: Color = myColor === 'w' ? 'b' : 'w';
    io.to(room.socketIds[opponentColor]).emit('rematch_requested');

    if (room.rematchVotes.size === 2) {
      // Swap colors for the new game
      const newWhiteSocketId = room.socketIds.b;
      const newBlackSocketId = room.socketIds.w;
      const newWhiteUsername = room.usernames.b;
      const newBlackUsername = room.usernames.w;
      const timerSeconds = room.game.timerSeconds;

      room.game.stopTimer();

      const newGame = new FogChessGame(
        { socketId: newWhiteSocketId, username: newWhiteUsername, color: 'w' },
        { socketId: newBlackSocketId, username: newBlackUsername, color: 'b' },
        timerSeconds,
        (timers) => io.to(roomCode).emit('timer_tick', timers),
        () => {
          const currentRoom = roomManager.getActiveRoom(roomCode);
          if (currentRoom) sendBothStates(io, currentRoom, newGame);
          io.to(roomCode).emit('game_over', newGame.getGameOver());
        }
      );

      const newRoom: ActiveRoom = {
        game: newGame,
        socketIds: { w: newWhiteSocketId, b: newBlackSocketId },
        usernames: { w: newWhiteUsername, b: newBlackUsername },
        rematchVotes: new Set(),
      };
      roomManager.registerActiveRoom(roomCode, newRoom);

      io.to(newRoom.socketIds.w).emit('room_joined', {
        roomCode,
        color: 'w',
        opponentUsername: newBlackUsername,
        timerSeconds,
      });
      io.to(newRoom.socketIds.b).emit('room_joined', {
        roomCode,
        color: 'b',
        opponentUsername: newWhiteUsername,
        timerSeconds,
      });

      io.to(roomCode).emit('game_start', {
        whiteUsername: newWhiteUsername,
        blackUsername: newBlackUsername,
        timerSeconds,
      });
      sendBothStates(io, newRoom, newGame);
      newGame.startTimer();
      console.log(`[${roomCode}] Rematch started`);
    }
  });

  // ---------------------------------------------------------------------------
  // DISCONNECT
  // ---------------------------------------------------------------------------
  socket.on('disconnect', () => {
    const result = roomManager.handleDisconnect(socket.id);
    if (!result) return;

    const { roomCode, room } = result;
    const myColor = roomManager.getColorForSocket(socket.id, room);

    if (myColor) {
      const opponentColor: Color = myColor === 'w' ? 'b' : 'w';
      io.to(room.socketIds[opponentColor]).emit('opponent_disconnected', {
        username: room.usernames[myColor],
      });
    }
    roomManager.cleanupRoom(roomCode);
    console.log(`[${roomCode}] Socket ${socket.id} disconnected, room cleaned up`);
  });
}
