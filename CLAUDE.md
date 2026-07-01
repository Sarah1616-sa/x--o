# CLAUDE.md

Guidance for working in this repository.

## Project

**Mystery X-O (اكس او)** — a real-time, server-authoritative multiplayer team game. It's tic-tac-toe where
claiming a cell requires correctly answering an Arabic trivia question, plus four special abilities
(power / shield / steal / trap). Two teams (X and O), RTL-native, mobile-first.

> **Repo layout note:** the actual project lives in the nested **`mystery-xo/`** folder (that's where
> `package.json` is). **Run all npm commands from `mystery-xo/`.** The repo root also holds `NewUIStyle/`
> (UI design-system docs) and `.agents/`.

## Commands (run from `mystery-xo/`)

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite frontend dev server (http://localhost:5173) |
| `npm run server:dev` | Backend with nodemon auto-reload (port 3001) |
| `npm run server:start` | Backend without watch (`node server/src/index.js`) |
| `npm run build` | Production frontend build → `dist/` |
| `npm run preview` | Preview the built frontend |

**Local dev = two processes:** run `npm run server:dev` and `npm run dev` together (frontend 5173 → backend 3001).
There is no single "start everything" script.

Health check: `GET http://localhost:3001/health` → `{ ok: true }`.

## Architecture

Server-authoritative. The client **renders from server snapshots and sends intents only** — it runs no
authoritative game logic. The server validates every action and broadcasts the next state.

```
mystery-xo/
├── index.html              # Vite entry (RTL, Arabic, Google Fonts: Lalezar + Cairo)
├── src/                    # ── FRONTEND (vanilla JS, no framework — Phaser was retired) ──
│   ├── main.js             # Boot: load theme.css, start ScreenManager, socketService.connect()
│   ├── ui/
│   │   ├── theme.css       # Whole design system in pure CSS variables (House theme)
│   │   ├── dom.js          # h(tag, props, ...children) hyperscript factory
│   │   ├── ScreenManager.js# Screen router (replaces Phaser scenes; instant, no animation)
│   │   ├── screens/        # MainMenuScreen, LobbyScreen, GameScreen
│   │   └── game/           # Dumb renderers: Board, AbilityBar, InfoBar, QuestionDialog, MatchEndDialog
│   ├── network/
│   │   ├── socket.js       # Socket.IO client → http://localhost:3001 (autoConnect: false)
│   │   ├── socketService.js# Singleton: connection + client state ({room, game, selfPlayerId, ...})
│   │   └── socketEvents.js # Event name constants
│   └── game/               # ── SHARED PURE GAME LOGIC (imported by client AND server) ──
│       ├── systems/        # MatchSystem, TurnResolver, AbilitySystem, QuestionSystem
│       ├── data/questions.js   # Arabic trivia question bank
│       └── constants/      # gameConstants.js (QUESTION_TIME_LIMIT=15, MAX_STAGES=5), abilityNames.js
├── server/src/             # ── BACKEND (Express 5 + Socket.IO 4, port 3001) ──
│   ├── index.js            # HTTP + Socket.IO bootstrap, CORS for :5173, /health
│   ├── socket.js           # Maps client events → roomManager / GameEngine, broadcasts snapshots
│   ├── rooms/
│   │   ├── roomManager.js  # In-memory rooms, player sessions, reconnect tokens, host reassignment
│   │   └── roomCode.js     # 6-char room codes (no confusable chars)
│   ├── game/GameEngine.js  # Authoritative orchestrator — reuses the SHARED src/game/ systems
│   ├── constants/roomConstants.js  # Phases, roles, defaults, DEFAULT_SERVER_PORT
│   └── validators/roomValidators.js
├── public/                 # Static assets: favicon.png, apple-touch-icon.png, background.png,
│                           #   xo-logo.png, xo-logo-mark.png, icons.svg
└── scripts/                # Node test/util harnesses (see below)
```

### Data flow
1. Client emits an **intent**: `cell:select`, `ability:activate`, `answer:select` (plus lobby events
   like `room:create`, `room:join`, `match:start`).
2. Server (`server/src/socket.js`) routes it to `roomManager` / `room.engine` (a `GameEngine`).
3. Server broadcasts an authoritative **`game:snapshot`** (in-game) or **`room:update`** (lobby) to the room.
4. `GameScreen` re-renders all components from that snapshot.

### Server-side game model
- Rooms are plain objects in a `Map`, keyed by room code, held in memory only.
- Lifecycle phases: `LOBBY → TURN_IDLE → QUESTION_OPEN → STAGE_END → MATCH_END`.
- A `GameEngine` is created at match start and runs questions/turns/abilities over the **same shared
  `src/game/systems/` modules the client imports** — so rules live in exactly one place.

## Conventions & gotchas

- **Shared game logic is single-source.** `src/game/systems/` and `src/game/data/questions.js` are imported
  by both the browser and `server/src/game/GameEngine.js`. Change a rule **once** here; never fork it per side.
- **The client never decides outcomes.** Win detection, move/ability validation, and scoring are all
  server-side. Client UI is render + dispatch only.
- **Ports are hardcoded.** Client → `http://localhost:3001` (`src/network/socket.js`); server CORS allows
  `localhost:5173` / `127.0.0.1:5173` (`server/src/index.js`). Changing a port means editing both sides.
- **State is in-memory.** Restarting the server wipes all rooms/sessions. No database.
- **RTL + Arabic.** `<html dir="rtl">`; user-facing strings (banners, ability names) are Arabic.
- **House design system.** UI follows `NewUIStyle/` (`SKILL.md`, `tokens.md`, `components.md`, `layout.md`):
  cream "sticker" shapes on a red field, maroon ink, hard offset shadows, **no animations**, one gold action
  per screen. Implemented in `src/ui/theme.css`. Read those docs before changing UI.
- **No framework / no config.** Vanilla DOM via `dom.js`; no `vite.config.js`, no ESLint/Prettier,
  no TypeScript. ES modules throughout (`"type": "module"`).

## Testing / tooling

No unit-test framework. Manual harnesses in `mystery-xo/scripts/` (run with `node`, use `socket.io-client`
and `playwright`):
- `mp-test.mjs`, `mp-game.mjs`, `mp-ability.mjs` — drive multiplayer flows against a running server.
- `shot.mjs` — Playwright screenshot of the UI.
- `gen-favicon.mjs`, `gen-mark.mjs` — regenerate brand/icon assets.

Start the server first, then run a script, e.g. `node scripts/mp-game.mjs`.
