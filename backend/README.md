# Core Quest Finder — Backend Service

This service is the foundational backend API for the **Core Quest Finder** 3D campus adventure game, built with **Express**, **Prisma ORM**, and **Supabase PostgreSQL**.

---

## Technology Stack

- **Runtime**: [Node.js](https://nodejs.org/) (v20+)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Web Framework**: [Express](https://expressjs.com/) (v4)
- **ORM**: [Prisma](https://www.prisma.io/) (v6)
- **Database Engine**: [PostgreSQL](https://www.postgresql.org/) (hosted on [Supabase](https://supabase.com/))
- **Development Tooling**: [tsx](https://github.com/privatenumber/tsx) (fast TypeScript execution & watch mode)

---

## Project Structure

```
backend/
├── prisma/
│   └── schema.prisma    # Prisma schema (Player, GameSession, LevelProgress)
├── src/
│   ├── config/          # Environment configuration & PostgreSQL/Prisma connectivity
│   │   ├── db.ts
│   │   └── env.ts
│   ├── controllers/     # Route logic for health check & player operations
│   │   ├── health.controller.ts
│   │   └── player.controller.ts
│   ├── lib/             # Singleton Prisma client instance
│   │   └── prisma.ts
│   ├── middleware/      # Error handling & database availability checks
│   │   ├── dbCheck.ts
│   │   └── errorHandler.ts
│   ├── routes/          # Express route definitions
│   │   ├── health.routes.ts
│   │   ├── player.routes.ts
│   │   └── index.ts
│   ├── types/           # Shared domain & API contract types
│   │   └── index.ts
│   ├── app.ts           # Express app setup, CORS, body parsers
│   └── server.ts        # Server bootstrap & graceful shutdown
├── .env.example         # Environment template with safe placeholder
├── package.json         # Scripts and dependencies
├── tsconfig.json        # TypeScript configuration
└── README.md            # Documentation
```

---

## Database Models

- **Player**: Represents player accounts with `playerName`, unique `enrollmentNumber`, `team`, optional unique `email`, `selectedCharacter` (`MALE`/`FEMALE`), `status`, `currentLevel`, `score`, and timestamps.
- **GameSession**: Tracks active and past gameplay sessions for players with start/end timestamps and active flags.
- **LevelProgress**: Tracks individual level attempts, status, score, penalty seconds, and timestamps per player with a composite unique key `(playerId, levelId)`.

---

## Installation & Setup (Windows / Local)

### 1. Install Dependencies

Open a PowerShell terminal, navigate to the `backend` directory, and install packages:

```powershell
cd backend
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` (if not already created):

```powershell
cp .env.example .env
```

Ensure your `.env` contains your Supabase PostgreSQL connection string:
```ini
PORT=5000
NODE_ENV=development
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"
CORS_ORIGIN=http://localhost:5173,http://localhost:5174
```

### 3. Generate Prisma Client & Run Migrations

Generate the type-safe client:
```powershell
npx prisma generate
```

Apply database migrations to Supabase PostgreSQL:
```powershell
npx prisma migrate dev --name init_postgres
```

---

## Running the Backend

### Development Mode (with hot-reload)

```powershell
npm run dev
```

The server will start on port `5000`:
```
====================================================
 Core Quest Finder Backend Server (PostgreSQL)
====================================================
 Environment : development
 Port        : 5000
 Health check: http://localhost:5000/api/health
 CORS origins: http://localhost:5173, http://localhost:5174
====================================================
```

### Production Build & Run

```powershell
npm run build
npm start
```

### Type Checking

```powershell
npm run typecheck
```

---

## API Endpoints

### 1. Health Check
- **`GET /health`**: Root-level health check endpoint (HTTP 200) for container orchestrators, Kubernetes liveness/readiness probes, and cloud load balancers (ALB / GCP Cloud Run).
- **`GET /api/health`**: API-prefixed health check endpoint reporting server status, uptime, environment mode, and live PostgreSQL connection state.

Sample response:
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "uptimeSeconds": 24,
    "timestamp": "2026-09-08T20:52:15.000Z",
    "env": "production",
    "database": {
      "connected": true,
      "status": "connected"
    }
  }
}
```

### 2. Player Operations
- **`GET /api/players`**: Lists registered players (up to 50 most recent).
- **`GET /api/players/:id`**: Retrieves a single player by ID, including session state, current level progress, and cumulative inventory.
- **`POST /api/players`**: Creates/registers a new player.

Example payload for `POST /api/players`:
```json
{
  "playerName": "Megh Patel",
  "enrollmentNumber": "21BCE0456",
  "team": "Binary Titans",
  "selectedCharacter": "MALE",
  "email": "megh@example.com"
}
```

### 3. Session Operations
- **`POST /api/sessions/start`**: Begins or resumes an active gameplay session for a player.
- **`POST /api/sessions/pause`**: Freezes session timer and disallows puzzle submissions during pause.
- **`POST /api/sessions/resume`**: Resumes active session timer.

### 4. Game Operations
- **`POST /api/game/investigate`**: Evaluates 3D object interaction. Returns clue and grants item if target object, or contextual feedback if decoy object.
- **`POST /api/game/submit-answer`**: Verifies answer authoritatively under PostgreSQL `FOR UPDATE` row-level lock. Advances level or atomically marks mission completion for Level 10.
- **`POST /api/game/hint`**: Requests progressive hint (orders 1, 2, 3) with authoritative penalty seconds applied to the player's session.
- **`POST /api/game/scan`**: Proximity pulse detecting distance to current level target object.

---

## Production Deployment & Security Runbook

### 1. Environment Configuration
Ensure the following environment variables are set in production container / VM:
- `NODE_ENV`: Set to `production`. This activates:
  - Error message sanitization (preventing SQL or internal stack leaks).
  - Strict CORS origin enforcement against `CORS_ORIGIN`.
- `PORT`: Server port (default: `5000`).
- `DATABASE_URL`: PostgreSQL connection string. In Supabase, connect via the **Transaction Connection Pooler** (`port 6543`) with `?pgbouncer=true&connection_limit=15` to ensure connection scalability under high concurrent user load.
- `DIRECT_URL`: Direct session connection string (`port 5432`) used exclusively for migrations.
- `CORS_ORIGIN`: Comma-separated list of allowed frontend domain origins.

### 2. Payload Protection & Reverse Proxy Limits
- Express body parsers enforce a strict `100kb` maximum payload limit (`express.json({ limit: "100kb" })`), rejecting oversized denial-of-service payloads with HTTP 413.
- In Nginx or Cloudflare, configure `client_max_body_size 100k;` to reject excessive payloads before they reach the Node.js process.

### 3. High-Concurrency Database Optimization
- **Row-Level Locking**: Answer submissions and session updates utilize `SELECT ... FOR UPDATE` row locks inside PostgreSQL transactions, preventing race conditions from simultaneous double-clicks or multiple browser tabs.
- **Geographic Placement**: When deploying the backend in cloud environments (e.g. AWS, GCP, Vercel, Railway), colocate the backend compute region with the Supabase database region (e.g. `ap-southeast-2` Sydney or `ap-south-1` Mumbai) to minimize transactional network latency.

