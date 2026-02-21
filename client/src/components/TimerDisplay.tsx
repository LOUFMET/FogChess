import type { Color } from '../types';

interface TimerDisplayProps {
  timeMs: number;
  color: Color;
  isActive: boolean;
  username: string;
}

function formatTime(ms: number): string {
  const totalSecs = Math.max(0, Math.floor(ms / 1000));
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function TimerDisplay({ timeMs, isActive, username, color }: TimerDisplayProps) {
  const isLow = timeMs < 30000;
  return (
    <div className={`timer-display ${isActive ? 'active' : ''} ${isLow ? 'low' : ''}`}>
      <span className="timer-username">
        <span className={`color-dot ${color === 'w' ? 'white' : 'black'}`} />
        {username}
      </span>
      <span className="timer-time">{formatTime(timeMs)}</span>
    </div>
  );
}
