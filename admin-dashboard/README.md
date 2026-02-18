# Admin Dashboard

Web admin UI for the Audio Translation system. Manage users, events, channels, sessions, and recordings. On the **Sessions** page, active sessions show a QR code that listeners can scan to join via the [web listener](../../web-listener) or the native listener app; the QR encodes the listen URL when `VITE_LISTENER_BASE_URL` is set at build time.

## Stack

- React 18 + TypeScript
- Vite
- React Router

## Development

```bash
npm install
npm run dev
```

Runs at http://localhost:3000 and is also reachable on your LAN at http://\<your-IP\>:3000 (e.g. http://192.168.178.82:3000). In dev, API requests are proxied to the backend (see `vite.config.ts`). Set `VITE_API_URL` if the backend runs elsewhere (e.g. `VITE_API_URL=http://localhost:5000`).

**If you can't open the dashboard by IP:** Windows Firewall may be blocking port 3000. Run PowerShell as Administrator and allow it:  
`New-NetFirewallRule -DisplayName "Admin Dashboard (3000)" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow`

## Build

```bash
npm run build
```

Output is in `dist/`.

## Docker

Built via `deployment/docker/admin-dashboard/`. Build args: `VITE_API_URL` (default `http://localhost:5000`) so the browser can reach the API; `VITE_LISTENER_BASE_URL` (e.g. `http://localhost:3001`) so the Sessions page QR code encodes the full web listener URL. Set `API_URL` and `LISTENER_URL` in docker-compose when your URLs differ.

## Auth

Log in with an Admin (or Translator) user. JWT refresh is handled automatically; logout revokes the refresh token.
