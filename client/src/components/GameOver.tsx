import { getSocket } from '../socket';
import { useGameStore } from '../store/gameStore';
import type { Color, GameOverState } from '../types';

const REASON_LABELS: Record<GameOverState['reason'], string> = {
  checkmate: 'Checkmate',
  stalemate: 'Stalemate',
  timeout: 'Time out',
  resign: 'Resignation',
  draw: 'Draw',
};

function getResultMessage(gameOver: GameOverState, myColor: Color): string {
  if (!gameOver.winner) return 'Draw!';
  if (gameOver.winner === myColor) return 'You win!';
  return 'You lose.';
}

export function GameOver() {
  const { gameState, myColor, rematchRequested, setRematchRequested } = useGameStore();
  const socket = getSocket();

  const gameOver = gameState?.gameOver;
  if (!gameOver || !myColor) return null;

  function handleRematch() {
    socket.emit('rematch_request');
    setRematchRequested(false);
  }

  function handleNewGame() {
    useGameStore.getState().reset();
  }

  return (
    <div className="game-over-overlay">
      <div className="game-over-dialog">
        <h2 className={gameOver.winner === myColor ? 'win' : gameOver.winner === null ? 'draw' : 'lose'}>
          {getResultMessage(gameOver, myColor)}
        </h2>
        <p className="reason">{REASON_LABELS[gameOver.reason]}</p>

        {rematchRequested ? (
          <div className="rematch-prompt">
            <p>Opponent wants a rematch!</p>
            <button className="btn btn-primary" onClick={handleRematch}>
              Accept
            </button>
            <button className="btn btn-ghost" onClick={handleNewGame}>
              Decline
            </button>
          </div>
        ) : (
          <div className="btn-group">
            <button className="btn btn-primary" onClick={handleRematch}>
              Rematch
            </button>
            <button className="btn btn-ghost" onClick={handleNewGame}>
              New game
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
