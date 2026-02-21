# FogChess

An online multiplayer chess variant where you cannot see your opponent's pieces.

## Game Rules

- **Fog of war** — you only see your own pieces; the opponent's side is hidden.
- **Observe** — skip your turn to reveal the full board for 2 seconds.
- **Piece hint** — after each opponent move, you are told which *type* of piece moved (e.g. "Knight"), but not where.
- **Illegal move penalty** — if you move to a square occupied by an opponent's piece, the move is rejected and you lose your turn.
- **Capture feedback** — a sound and message notify you when you capture a piece or when one of yours is taken.

## Tech Stack

| Layer | Technology |
|---|---|
| Server | Node.js, TypeScript, Express, Socket.io, chess.js |
| Client | React 19, TypeScript, Vite, Zustand |

## Project Structure

```
FogChess/
├── server/
│   └── src/
│       ├── index.ts           # HTTP server + Socket.io bootstrap
│       ├── FogChessGame.ts    # Core game logic & fog-of-war rules
│       ├── RoomManager.ts     # Room lifecycle & socket mapping
│       ├── socketHandlers.ts  # All Socket.io event handlers
│       └── types.ts
└── client/
    └── src/
        ├── components/        # React UI components
        ├── hooks/useSocket.ts # Socket.io event wiring
        ├── store/gameStore.ts # Global state (Zustand)
        ├── utils/sounds.ts    # Web Audio API capture sounds
        └── types.ts
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+

### Install dependencies

```bash
npm install
```

### Run in development

```bash
# Both server and client in parallel
npm run dev

# Or separately
npm run dev:server   # http://localhost:3001
npm run dev:client   # http://localhost:5173
```

### How to play locally

1. Open `http://localhost:5173` in **two separate browser tabs**.
2. **Tab 1** — enter a username → Create a game → choose a timer → Create.
3. Copy the 6-letter room code shown.
4. **Tab 2** — enter a username → Join a game → paste the code → Join.
5. The game starts automatically.

## Features

- Private rooms via 6-character codes
- Configurable per-player timer (1 / 3 / 5 / 10 / 15 min)
- Pawn promotion dialog
- Draw offer / accept / decline
- Resign
- Rematch (colors swap)
- Opponent disconnect detection
