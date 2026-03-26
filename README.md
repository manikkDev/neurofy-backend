# Neurofy Backend

Node.js + Express + TypeScript backend for the Neurofy tremor monitoring platform.

## Setup

```bash
cd Backend
npm install
cp .env.example .env    # edit .env with your MongoDB URI
npm run dev
```

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start dev server with hot reload (tsx watch) |
| `npm run build` | Compile TypeScript to dist/ |
| `npm start` | Run compiled production build |

## API

- `GET /api/health` — Health check endpoint

## Environment Variables

See `.env.example` for all required variables.

## Structure

```
src/
  config/        — env loader, DB connection
  controllers/   — route handlers (Phase 1+)
  middlewares/    — error handler, auth (Phase 1+)
  models/        — Mongoose models (Phase 1+)
  modules/       — domain modules (Phase 1+)
  routes/        — Express route definitions
  services/      — business logic (Phase 1+)
  sockets/       — Socket.IO setup
  utils/         — shared helpers
  app.ts         — Express app bootstrap
  server.ts      — HTTP + Socket.IO server entry
```
