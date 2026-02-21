import { useState } from 'react';
import { useGameStore } from '../store/gameStore';

export function WaitingRoom() {
  const { roomCode } = useGameStore();
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(roomCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="waiting-room">
      <div className="waiting-card">
        <h2>Waiting for an opponent...</h2>
        <p>Share this code with your opponent:</p>
        <div className="room-code-display">
          <span className="room-code">{roomCode}</span>
          <button className="btn btn-secondary copy-btn" onClick={handleCopy}>
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <div className="spinner" />
        <p className="waiting-hint">The game will start automatically</p>
      </div>
    </div>
  );
}
