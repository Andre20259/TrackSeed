# TrackSeed backend

Fastify + TypeScript on Node 26 (Node runs the `.ts` files directly, no build step), PostgreSQL in Docker.

## Run it

From `TrackSeed/`:

```bash
cp .env.example .env      # then set your own password in both lines
docker compose up -d      # starts PostgreSQL on localhost:5432
cd backend && npm install && npm run dev
```

The API listens on http://localhost:3000. The dashboard's dev server forwards `/api` to it.

Without PostgreSQL, remove or comment out `DATABASE_URL` in `.env`: tracks are then kept in memory and lost when the server stops.

## API

| Method | Path | |
|---|---|---|
| `GET` | `/api/tracks` | List of tracks (summaries) |
| `GET` | `/api/tracks/:id` | One track with its cones |
| `POST` | `/api/tracks` | Upload a track; the body must match `../shared/track.schema.json` |

## Checks

```bash
npm test             # API tests, in memory (no database needed)
npm run type-check
```
