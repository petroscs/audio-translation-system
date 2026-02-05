# Admin Dashboard

Web admin UI for the Audio Translation system. Manage users, events, channels, sessions, and recordings.

## Stack

- React 18 + TypeScript
- Vite
- React Router

## Development

```bash
npm install
npm run dev
```

Runs at http://localhost:3000. In dev, API requests are proxied to the backend (see `vite.config.ts`). Set `VITE_API_URL` if the backend runs elsewhere (e.g. `VITE_API_URL=http://localhost:5000`).

## Build

```bash
npm run build
```

Output is in `dist/`.

## Docker

Built by the repo root Dockerfile context; build arg `VITE_API_URL` (default `http://localhost:5000`) is used at build time so the browser can reach the API. Set `API_URL` when running docker-compose if your backend URL differs.

## Auth

Log in with an Admin (or Translator) user. JWT refresh is handled automatically; logout revokes the refresh token.
