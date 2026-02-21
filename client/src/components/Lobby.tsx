import { useState } from 'react';
import { getSocket } from '../socket';
import { useGameStore } from '../store/gameStore';

const TIMER_OPTIONS = [
  { label: '1 min', value: 60 },
  { label: '3 min', value: 180 },
  { label: '5 min', value: 300 },
  { label: '10 min', value: 600 },
  { label: '15 min', value: 900 },
];

export function Lobby() {
  const [mode, setMode] = useState<'home' | 'create' | 'join'>('home');
  const [username, setUsernameLocal] = useState('');
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [selectedTimer, setSelectedTimer] = useState(300);
  const { setUsername, notifications, clearNotification } = useGameStore();

  const socket = getSocket();

  function handleCreate() {
    const name = username.trim();
    if (!name) return;
    setUsername(name);
    socket.emit('create_room', { username: name, timerSeconds: selectedTimer });
  }

  function handleJoin() {
    const name = username.trim();
    const code = roomCodeInput.trim().toUpperCase();
    if (!name || !code) return;
    setUsername(name);
    socket.emit('join_room', { roomCode: code, username: name });
  }

  return (
    <div className="lobby">
      <div className="lobby-card">
        <h1 className="logo">FogChess</h1>
        <p className="tagline">Chess in the fog</p>

        {notifications.map((n) => (
          <div key={n} className="notification error" onClick={() => clearNotification(n)}>
            {n}
          </div>
        ))}

        <div className="field">
          <label>Username</label>
          <input
            type="text"
            placeholder="Your username..."
            value={username}
            onChange={(e) => setUsernameLocal(e.target.value)}
            maxLength={20}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                if (mode === 'create') handleCreate();
                if (mode === 'join') handleJoin();
              }
            }}
          />
        </div>

        {mode === 'home' && (
          <div className="btn-group">
            <button
              className="btn btn-primary"
              onClick={() => setMode('create')}
              disabled={!username.trim()}
            >
              Create a game
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => setMode('join')}
              disabled={!username.trim()}
            >
              Join a game
            </button>
          </div>
        )}

        {mode === 'create' && (
          <div className="create-options">
            <label>Time per player</label>
            <div className="timer-options">
              {TIMER_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  className={`timer-btn ${selectedTimer === opt.value ? 'active' : ''}`}
                  onClick={() => setSelectedTimer(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div className="btn-group">
              <button className="btn btn-primary" onClick={handleCreate}>
                Create
              </button>
              <button className="btn btn-ghost" onClick={() => setMode('home')}>
                Back
              </button>
            </div>
          </div>
        )}

        {mode === 'join' && (
          <div className="join-options">
            <div className="field">
              <label>Room code</label>
              <input
                type="text"
                placeholder="e.g. ABC123"
                value={roomCodeInput}
                onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                maxLength={6}
                onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
              />
            </div>
            <div className="btn-group">
              <button
                className="btn btn-primary"
                onClick={handleJoin}
                disabled={roomCodeInput.trim().length !== 6}
              >
                Join
              </button>
              <button className="btn btn-ghost" onClick={() => setMode('home')}>
                Back
              </button>
            </div>
          </div>
        )}

        <div className="rules-hint">
          <details>
            <summary>Game rules</summary>
            <ul>
              <li>You cannot see the opponent's pieces</li>
              <li>Skip your turn = see the full board for 2 seconds</li>
              <li>After each opponent move, you are told <em>which piece</em> moved</li>
              <li>Illegal move (square occupied by opponent) = lose your turn</li>
            </ul>
          </details>
        </div>
      </div>
    </div>
  );
}
