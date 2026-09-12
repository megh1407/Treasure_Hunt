# Core Quest Finder — Production Deployment & Operations Runbook

This document details the exact procedures for deploying, maintaining, and rolling back **Core Quest Finder** in a production environment.

---

## 1. System Requirements & Architecture

- **Backend**: Node.js v20+ / v22+ (TypeScript -> Express + Prisma ORM)
- **Frontend**: Vite + TanStack Start (React 19 + Three.js / React Three Fiber)
- **Database**: PostgreSQL 15+ (Hosted on Supabase with Supavisor transaction pooler)
- **Port Mapping**:
  - Backend API: `5000` (Endpoints: `/api/*`, `/health`)
  - Frontend Preview/SSR: `4173`
  - Public Reverse Proxy (Nginx): `80` (HTTP redirect) / `443` (HTTPS)

---

## 2. Environment Variables Specification

### Backend (`backend/.env`)
| Variable | Required | Example | Description |
| :--- | :---: | :--- | :--- |
| `PORT` | Yes | `5000` | HTTP port on which the Express server listens |
| `NODE_ENV` | Yes | `production` | Environment mode; suppresses stack traces and sanitizes errors |
| `DATABASE_URL` | Yes | `postgres://postgres.[REF]:[PASS]@aws-0-ap-southeast-2.pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true&connection_limit=10&pool_timeout=20` | Transaction pooler URL (port 6543) used by Prisma Client |
| `DIRECT_URL` | Yes | `postgres://postgres.[REF]:[PASS]@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres?sslmode=require` | Direct session pooler connection (port 5432) used for `prisma migrate deploy` |
| `CORS_ORIGIN` | Yes | `https://game.example.com,https://corequest.campus.edu` | Comma-separated list of allowed frontend origins (no trailing slashes) |

### Frontend (`frontend/.env`)
| Variable | Required | Example | Description |
| :--- | :---: | :--- | :--- |
| `VITE_API_URL` | No | `/api` | Relative `/api` fallback when hosted behind Nginx reverse proxy |
| `VITE_USE_MOCK_API` | No | `false` | Always `false` in production |

---

## 3. Database Migration Runbook (Non-Destructive)

> [!IMPORTANT]
> Never execute `prisma migrate reset` in production. Always use `prisma migrate deploy`.

```bash
cd backend

# 1. Verify connection and check pending migrations
npx prisma migrate status

# 2. Apply pending migrations non-destructively
npm run prisma:migrate:deploy
# or: npx prisma migrate deploy

# 3. Generate latest Prisma client artifacts
npm run prisma:generate
```

---

## 4. Production Deployment Methods

### Method A: PM2 + Nginx Reverse Proxy (Recommended for VPS / Dedicated Host)

#### Step 1: Clone and Install
```bash
git clone <REPOSITORY_URL> /var/www/core-quest-finder
cd /var/www/core-quest-finder

# Install backend dependencies
cd backend
npm ci
npm run prisma:generate
npm run build

# Install frontend dependencies and build production bundles
cd ../frontend
npm ci
npm run build
```

#### Step 2: Configure Environment
Ensure `backend/.env` exists with real PostgreSQL credentials and `NODE_ENV=production`.

#### Step 3: Start Services with PM2
```bash
cd /var/www/core-quest-finder
mkdir -p logs
pm2 start ecosystem.config.cjs --env production
pm2 save
pm2 startup
```

#### Step 4: Configure Nginx
```bash
sudo cp nginx.conf /etc/nginx/sites-available/core-quest-finder
# Replace YOUR_DOMAIN.COM in /etc/nginx/sites-available/core-quest-finder with your real domain
sudo ln -s /etc/nginx/sites-available/core-quest-finder /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

### Method B: Docker Compose (Containerized Deployment)

```bash
cd /var/www/core-quest-finder

# 1. Ensure backend/.env has the production database credentials
cp backend/.env.example backend/.env
# Edit backend/.env with production credentials

# 2. Build and start backend container in detached mode
docker compose -f docker-compose.production.yml up -d --build

# 3. Verify health
docker compose -f docker-compose.production.yml ps
curl http://localhost:5000/health
```

---

## 5. Health Probes & Monitoring

The system exposes two machine-readable health endpoints:
- `GET /health` (Root alias for AWS ALB, GCP Cloud Run, Kubernetes liveness/readiness probes)
- `GET /api/health`

Response format:
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "uptimeSeconds": 1420,
    "timestamp": "2026-09-09T16:00:00.000Z",
    "env": "production",
    "database": {
      "connected": true,
      "status": "connected"
    }
  }
}
```

If PostgreSQL is unreachable, the endpoint returns `HTTP 503 Service Unavailable` with `database: { connected: false, status: "disconnected" }`.

---

## 6. Rollback & Disaster Recovery Runbook

### Scenario 1: Reverting to a Previous Release Commit
```bash
cd /var/www/core-quest-finder

# 1. Checkout target stable tag or commit
git checkout v1.0.0-rc1

# 2. Rebuild backend and frontend
npm run build --prefix backend
npm run build --prefix frontend

# 3. Reload PM2 processes gracefully
pm2 reload ecosystem.config.cjs --env production
```

### Scenario 2: Rollback with Database Migration Reversal
```bash
cd /var/www/core-quest-finder/backend

# If a migration needs to be rolled back manually in PostgreSQL:
# 1. Execute SQL rollback script on Supabase SQL editor
# 2. Mark migration as rolled back in Prisma migration table:
npx prisma migrate resolve --rolled-back "<MIGRATION_NAME>"
```

### Scenario 3: Emergency Process Restart
```bash
pm2 restart core-quest-backend
pm2 restart core-quest-frontend
```

---

## 7. Operational Safety Rules

1. **Client Bundles**: Production assets in `frontend/dist/client/assets/` must never contain puzzle answers (`keyboard`, `salt`, `159`, `443`, `FOUNDER`, etc.) or database connection strings.
2. **Payload Limits**: The backend enforces a `100kb` limit on all inbound JSON request bodies to prevent Denial of Service.
3. **Session Authority**: All progress, cumulative inventory collections, and speedrun scores are stored in PostgreSQL; browser cache clears or tab closures do not cause state loss.
