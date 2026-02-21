import { useSocket } from './hooks/useSocket';
import { useGameStore } from './store/gameStore';
import { GameBoard } from './components/GameBoard';
import { Lobby } from './components/Lobby';
import { WaitingRoom } from './components/WaitingRoom';

export default function App() {
  useSocket();
  const phase = useGameStore((s) => s.phase);

  return (
    <div className="app">
      {phase === 'lobby' && <Lobby />}
      {phase === 'waiting' && <WaitingRoom />}
      {(phase === 'playing' || phase === 'gameover') && <GameBoard />}
    </div>
  );
}
