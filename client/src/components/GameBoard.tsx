import { getSocket } from '../socket';
import { useGameStore } from '../store/gameStore';
import { ChessBoard } from './ChessBoard';
import { GameOver } from './GameOver';
import { MoveLog } from './MoveLog';
import { TimerDisplay } from './TimerDisplay';

export function GameBoard() {
  const {
    gameState,
    myColor,
    username,
    opponentUsername,
    drawOfferPending,
    setDrawOfferPending,
    notifications,
    clearNotification,
    phase,
  } = useGameStore();

  const socket = getSocket();

  if (!gameState) return null;

  const opponentColor = myColor === 'w' ? 'b' : 'w';
  const isMyTurn = gameState.myTurn;
  const isGameOver = phase === 'gameover';

  function handlePeek() {
    socket.emit('peek');
  }

  function handleResign() {
    if (window.confirm('Are you sure you want to resign?')) {
      socket.emit('resign');
    }
  }

  function handleOfferDraw() {
    socket.emit('request_draw');
  }

  function handleAcceptDraw() {
    socket.emit('accept_draw');
    setDrawOfferPending(false);
  }

  function handleDeclineDraw() {
    socket.emit('decline_draw');
    setDrawOfferPending(false);
  }

  return (
    <div className="game-board-layout">
      {/* Notifications */}
      <div className="notifications-bar">
        {notifications.map((n) => (
          <div key={n} className="notification" onClick={() => clearNotification(n)}>
            {n}
          </div>
        ))}
      </div>

      {/* Opponent info + timer */}
      <div className="player-bar opponent-bar">
        <TimerDisplay
          timeMs={gameState.timers[opponentColor]}
          color={opponentColor}
          isActive={!isMyTurn && !isGameOver}
          username={opponentUsername || 'Opponent'}
        />
      </div>

      {/* Move log showing what type of piece the opponent moved */}
      <MoveLog
        lastOpponentMoveType={gameState.lastOpponentMoveType}
        moveNumber={gameState.moveNumber}
        isPeeking={gameState.isPeeking}
      />

      {/* Draw offer banner */}
      {drawOfferPending && (
        <div className="draw-offer-banner">
          <span>Opponent offers a draw</span>
          <button className="btn btn-primary small" onClick={handleAcceptDraw}>
            Accept
          </button>
          <button className="btn btn-ghost small" onClick={handleDeclineDraw}>
            Decline
          </button>
        </div>
      )}

      {/* The board */}
      <div className="board-container">
        <ChessBoard />
        {isGameOver && <GameOver />}
      </div>

      {/* My info + timer */}
      <div className="player-bar my-bar">
        <TimerDisplay
          timeMs={gameState.timers[myColor!]}
          color={myColor!}
          isActive={isMyTurn && !isGameOver}
          username={username || 'You'}
        />
      </div>

      {/* Action buttons */}
      {!isGameOver && (
        <div className="action-bar">
          <button
            className={`btn ${isMyTurn ? 'btn-peek' : 'btn-disabled'}`}
            onClick={handlePeek}
            disabled={!isMyTurn}
            title="Observe the board (skips your turn)"
          >
            Observe
          </button>
          <button
            className="btn btn-ghost small"
            onClick={handleOfferDraw}
            disabled={!isMyTurn}
          >
            Offer draw
          </button>
          <button className="btn btn-danger small" onClick={handleResign}>
            Resign
          </button>
        </div>
      )}
    </div>
  );
}
