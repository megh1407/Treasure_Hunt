# Core Quest Finder

Core Quest Finder is an interactive, browser-based 3D campus treasure hunt and technical puzzle platform. Players explore a 3D campus, enter 10 distinct facility interiors, investigate physical objects, discover clues, solve technical challenges, collect cumulative inventory items, and compete on an authoritative global leaderboard.

---

## Game Features

- **Full Level 1 → Level 10 Progression**:
  1. *Level 1: Library (The Silent Archive)* — Logic sequence puzzle
  2. *Level 2: Robotics Lab (Servo Silence)* — Binary status byte conversion
  3. *Level 3: Computer Lab (The Silicon Node)* — Hexadecimal memory address decoding
  4. *Level 4: Auditorium (Echoes of Sound)* — Acoustic frequency sequence calculation
  5. *Level 5: Cafeteria (The Caffeine Protocol)* — Steganographic pantry riddle
  6. *Level 6: Sports Complex (Kinetic Resonance)* — Parabolic projectile distance calculation
  7. *Level 7: Electronics Workshop (Circuit Symphony)* — Phase angle circuit impedance calculation
  8. *Level 8: Campus Garden (Flora & Silicon)* — Fibonacci growth progression calculation
  9. *Level 9: Data Center (Heart of the Grid)* — HTTPS default port decryption
  10. *Level 10: Innovation Hub (The Final Artifact)* — Magnetic clamp master riddle & atomic completion
- **Physical Campus Walking**: Players physically navigate across the campus green between facilities; no teleportation upon level completion.
- **Backend-Authoritative Security**: All puzzle answers, clue evaluations, hint penalties, and timer scoring are enforced strictly on the server with PostgreSQL row-level locks. Client production bundles contain 0 leaked answers or credentials.
- **Session Resilience**: Full session recovery upon browser refresh, network disconnection, or tab reload, preserving level progress, active status, and cumulative inventory.
- **Fair Play & Concurrency**: Atomic Level 10 completion with idempotent repeat submission handling, negative-order hint protection, and out-of-bounds input sanitization.

---

## Technology Stack

### Frontend
- **Framework**: React 19, TypeScript
- **Bundler & SSR**: Vite, TanStack Start, TanStack Router
- **3D Graphics**: Three.js, React Three Fiber (`@react-three/fiber`), Drei (`@react-three/drei`)
- **State Management**: Zustand
- **Styling**: Tailwind CSS v4, Radix UI primitives

### Backend
- **Runtime**: Node.js (v20+)
- **Framework**: Express (v4), TypeScript
- **Database & ORM**: PostgreSQL (Supabase) via Prisma ORM (v6)
- **Concurrency**: Interactive transactions with `FOR UPDATE` row-level locking

---

## Quick Start (Local Development)

### 1. Backend Setup
```sh
cd backend
npm install
npm run dev
```
Backend runs by default at `http://localhost:5000`.

### 2. Frontend Setup
```sh
cd frontend
npm install
npm run dev
```
Frontend runs by default at `http://localhost:5173`.

---

## Production Build & Launch

### Backend
```sh
cd backend
npm run build
npm start
```

### Frontend
```sh
cd frontend
npm run build
npm run preview
```

---

## Environment Configuration

### Frontend (`frontend/.env`)
| Variable | Description | Default |
|---|---|---|
| `VITE_API_URL` | Full backend API base URL (leave empty in production behind reverse-proxy) | `http://localhost:5000/api` |

### Backend (`backend/.env`)
| Variable | Description | Example |
|---|---|---|
| `PORT` | HTTP server listening port | `5000` |
| `NODE_ENV` | Environment mode (`development` / `production`) | `production` |
| `DATABASE_URL` | PostgreSQL connection pooler URI (Supabase port 6543) | `postgresql://postgres.[ref]:[pass]@...:6543/postgres?pgbouncer=true` |
| `DIRECT_URL` | PostgreSQL direct URI for migrations (Supabase port 5432) | `postgresql://postgres.[ref]:[pass]@...:5432/postgres` |
| `CORS_ORIGIN` | Comma-separated list of allowed frontend origins | `https://game.example.com,https://corequest.campus.edu` |

---

## Production Deployment & Reverse Proxy Architecture

In production, run both frontend and backend behind a unified reverse proxy (e.g. Nginx, Cloudflare, AWS ALB):

```nginx
server {
    listen 80;
    server_name game.example.com;

    # Backend Health Check
    location /health {
        proxy_pass http://127.0.0.1:5000/health;
        proxy_set_header Host $host;
    }

    # Backend API
    location /api/ {
        client_max_body_size 100k;
        proxy_pass http://127.0.0.1:5000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Frontend Static & SSR
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
    }
}
```

