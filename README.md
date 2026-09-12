# Core Quest Finder

Core Quest Finder is a browser-based 3D campus treasure hunt. Players explore a virtual campus, investigate objects, unlock clues, solve technical puzzles, collect items, and progress through ten levels. The React/Three.js frontend is backed by an Express API and PostgreSQL database.

## Features

- Ten-level 3D treasure hunt with campus and facility scenes
- Logic, binary, hexadecimal, acoustics, steganography, physics, circuits, Fibonacci, networking, and final-riddle challenges
- Server-authoritative answers, hints, penalties, timers, inventory, and leaderboard data
- PostgreSQL-backed session recovery after refresh or reconnect
- Pause/resume, progressive hints, AR-style scanning, leaderboard, and admin views
- Prisma transactions and row locking for concurrent submissions

## Project Structure

```text
core-quest-finder/
|-- backend/       Express + Prisma API
|-- frontend/      React + TanStack Start + Three.js game
|-- prisma/        Backend schema and migrations
|-- scratch/       Integration and release checks
`-- package.json   Root build, typecheck, and start scripts
```

## Requirements

- Node.js 20 or newer
- npm
- PostgreSQL 15 or newer, either local or hosted (Supabase works well)

## Local Development

### 1. Install dependencies

Run these commands from the repository root:

```powershell
npm install --prefix backend
npm install --prefix frontend
```

### 2. Configure the backend

Copy the safe template and fill in the PostgreSQL values:

```powershell
Copy-Item backend/.env.example backend/.env
```

Required backend variables:

| Variable | Purpose | Local example |
|---|---|---|
| `PORT` | API port | `5000` |
| `NODE_ENV` | Runtime mode | `development` |
| `DATABASE_URL` | Runtime PostgreSQL connection | `postgresql://...` |
| `DIRECT_URL` | Direct connection used by Prisma migrations | `postgresql://...` |
| `CORS_ORIGIN` | Comma-separated frontend origins | `http://localhost:5173` |
| `ADMIN_PASSWORD` | Admin page password | Set a private value |

Apply the database schema and generate Prisma Client:

```powershell
npm run prisma:generate --prefix backend
npm run prisma:migrate:deploy --prefix backend
```

For a new local development migration, use `npm run prisma:migrate --prefix backend` instead of editing the database manually.

### 3. Configure the frontend

Copy the frontend template if needed:

```powershell
Copy-Item frontend/.env.example frontend/.env
```

The default local configuration is:

```ini
VITE_API_URL=http://localhost:5000/api
VITE_USE_MOCK_API=false
```

### 4. Start the services

Open two terminals:

```powershell
# Terminal 1: backend API
Set-Location backend
npm run dev
```

```powershell
# Terminal 2: frontend
Set-Location frontend
npm run dev
```

Open the game at [http://localhost:5173](http://localhost:5173).

The backend is available at [http://localhost:5000](http://localhost:5000).

## Useful Commands

Run from the repository root:

```powershell
npm run build        # Build backend and frontend
npm run typecheck    # Type-check backend and frontend
npm run start:backend
npm run start:frontend
```

Run directly in each package:

```powershell
npm run typecheck --prefix backend
npm run typecheck --prefix frontend
npm run lint --prefix frontend
npm run build --prefix frontend
```

## API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/` | API status response |
| `GET` | `/health` | Root health probe |
| `GET` | `/api/health` | Health and PostgreSQL status |
| `POST` | `/api/players` | Register a player |
| `GET` | `/api/players/:id` | Recover player and progress |
| `POST` | `/api/sessions/start` | Start or recover a session |
| `POST` | `/api/sessions/pause` | Pause a session |
| `POST` | `/api/sessions/resume` | Resume a session |
| `POST` | `/api/sessions/complete` | Complete a session |
| `POST` | `/api/game/investigate` | Investigate a game object |
| `POST` | `/api/game/submit-answer` | Submit the current answer |
| `POST` | `/api/game/hint` | Request a progressive hint |
| `POST` | `/api/game/scan` | Run the proximity scanner |
| `GET` | `/api/leaderboard` | Read leaderboard data |

Check the local API and database connection with:

```powershell
Invoke-WebRequest http://localhost:5000/api/health
```

## Production

Build both packages:

```powershell
npm run build
```

Start the compiled backend and frontend preview servers:

```powershell
npm run start:backend
npm run start:frontend
```

The backend listens on port `5000`. Vite preview uses port `4173` by default. For a public deployment, place both services behind the included [nginx.conf](nginx.conf), or use the PM2 configuration in [ecosystem.config.cjs](ecosystem.config.cjs). The Docker configuration in [docker-compose.production.yml](docker-compose.production.yml) starts the backend container; PostgreSQL remains an external service configured through `backend/.env`.

See [DEPLOYMENT.md](DEPLOYMENT.md) for migrations, PM2, Docker, reverse proxy, health probes, and rollback procedures.

## Data and Browser Sessions

Gameplay progress is stored in PostgreSQL and can be recovered by player ID. The browser stores that player ID in `localStorage`, so refreshing the same browser profile can recover progress. A different browser, profile, or private window does not share that local ID and will start a separate player unless an account-transfer or login flow is added.

Never commit `backend/.env` or `frontend/.env`. The repository includes `.env.example` templates for safe configuration sharing.

## Troubleshooting

### API returns `Endpoint not found: GET /`

Use the API health route instead:

```text
http://localhost:5000/api/health
```

### Game says there is no active session

Refresh the game page and let initialization finish. Confirm that the API health endpoint reports `database.connected: true`. If the issue persists, verify the browser is using the same profile that started the game.

### Frontend cannot reach the server

Check that the backend is running on port `5000` and that `frontend/.env` contains:

```ini
VITE_API_URL=http://localhost:5000/api
```

Restart Vite after changing environment variables.

## License

This project is private and intended for the Core Quest Finder event deployment.

