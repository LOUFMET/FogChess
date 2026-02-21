let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

// Short percussive thud — played when YOU capture an opponent's piece.
export function playCaptureSound(): void {
  try {
    const ac = getCtx();
    const osc = ac.createOscillator();
    const gain = ac.createGain();

    osc.connect(gain);
    gain.connect(ac.destination);

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(280, ac.currentTime);
    osc.frequency.exponentialRampToValueAtTime(60, ac.currentTime + 0.18);

    gain.gain.setValueAtTime(0.55, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.22);

    osc.start(ac.currentTime);
    osc.stop(ac.currentTime + 0.22);
  } catch {
    // AudioContext blocked (no user interaction yet) — silently ignore.
  }
}

// Lower, softer tone — played when the OPPONENT captures one of your pieces.
export function playCapturedSound(): void {
  try {
    const ac = getCtx();
    const osc = ac.createOscillator();
    const gain = ac.createGain();

    osc.connect(gain);
    gain.connect(ac.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, ac.currentTime);
    osc.frequency.exponentialRampToValueAtTime(70, ac.currentTime + 0.35);

    gain.gain.setValueAtTime(0.35, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.4);

    osc.start(ac.currentTime);
    osc.stop(ac.currentTime + 0.4);
  } catch {
    // Silently ignore.
  }
}
