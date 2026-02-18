# Web Listener

A browser-based listener for the Audio Translation System. Listeners can join an active translation session by scanning a QR code or opening a link—**no app install or login required**.

## Features

- **Anonymous access** — No account or login needed
- **QR code join** — Scan the QR code shown in the admin dashboard or translator app (the same QR works for the web listener and the native listener app)
- **Real-time audio** — Low-latency audio streaming via WebRTC (mediasoup)
- **Live captions** — Speech-to-text captions when the translator is speaking
- **Mobile-friendly** — Works in modern browsers on phones and tablets

## Requirements

- Modern browser (Chrome, Firefox, Safari, Edge) with WebRTC support
- HTTPS in production (required for media capture in many browsers)
- Backend API and mediasoup service running

## Quick Start

### Development

1. Ensure the backend and mediasoup services are running.

2. From the project root:
   ```bash
   cd web-listener
   npm install
   npm run dev
   ```

3. Open http://localhost:3001 in your browser.

4. **Access from other devices (same network):** The dev server binds to `0.0.0.0`, so you can use your machine’s IP, e.g. `http://192.168.178.82:3001/listen/{sessionId}`. If the connection is refused:
   - Restart the dev server after changing the config.
   - **Windows:** Allow Node (or “Node.js JavaScript Runtime”) through Windows Defender Firewall for Private networks, or allow inbound TCP on port 3001.
   - Confirm the terminal shows a “Network” URL (e.g. `http://192.168.178.82:3001`).

5. To listen, either:
   - Scan the QR code from the admin dashboard (Sessions page) or translator app
   - Open a URL: `http://<host>:3001/listen/{sessionId}` (use `localhost` or your LAN IP)
   - Or use the query param: `http://<host>:3001/?session={sessionId}`

### Production Build

```bash
npm run build
```

Output is in the `dist/` directory. Serve it with any static file server (e.g. nginx).

### Preview Production Build

```bash
npm run preview
```

Serves the built app locally for testing.

## Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API base URL (used for REST and WebSocket) | `''` (relative to same origin) |

When `VITE_API_URL` is unset, the app uses relative URLs (`/api`, `/ws`). This works when the web listener is served from the same origin as the API or when a reverse proxy routes requests.

### Examples

**Local development (Vite proxy):**  
Leave `VITE_API_URL` unset. Vite proxies `/api` and `/ws` to the backend.

**Standalone (different origin):**
```bash
VITE_API_URL=http://localhost:5000 npm run build
```

**Production:**
```bash
VITE_API_URL=https://api.example.com npm run build
```

## URL Structure

| URL | Purpose |
|-----|---------|
| `/` | Landing page; redirects to listen if `?session={id}` is present |
| `/listen/:sessionId` | Listen to the session with the given ID |

The session ID is a UUID (e.g. `a1b2c3d4-e5f6-7890-abcd-ef1234567890`). It identifies the translator's broadcast session.

## How It Works

1. **Join** — User opens `/listen/{sessionId}` (e.g. via QR code).
2. **Anonymous join** — App calls `POST /api/listen/join` with the session ID. The backend creates a temporary guest account and returns an access token plus join info.
3. **Signaling** — App connects to SignalR with the token and creates a receive transport.
4. **WebRTC** — App negotiates a PeerConnection with mediasoup and receives the audio stream.
5. **Playback** — Audio is played in the browser; captions are shown when available.

## Architecture

```
┌─────────────┐     POST /api/listen/join      ┌─────────────┐
│   Browser   │ ─────────────────────────────► │   Backend   │
│             │ ◄───────────────────────────── │             │
│             │   accessToken, producerId...   │  (creates   │
│             │                                │   guest)    │
└─────────────┘                                └─────────────┘
       │                                               │
       │  SignalR + WebRTC                             │
       ▼                                               ▼
┌─────────────┐                                ┌─────────────┐
│  mediasoup  │ ◄──── RTP audio stream ────────│  mediasoup  │
│  (receive)  │                                │  (server)   │
└─────────────┘                                └─────────────┘
```

## Docker

The web listener is included in the main Docker Compose setup:

```bash
docker compose -f deployment/docker-compose.yml up -d web-listener
```

It listens on port 3001 by default. Set `API_URL` and `LISTENER_URL` in the compose environment if your setup uses different hostnames or ports.

## Troubleshooting

### "No active broadcast for this session"

The translator has not started broadcasting yet, or the session has ended. Ask the translator to start broadcasting.

### No audio

- Confirm the backend and mediasoup services are running.
- Check browser console for WebRTC or network errors.
- On some networks, firewall rules may block WebRTC; TURN may be needed for complex setups.

### CORS errors

Ensure the backend CORS configuration allows the web listener origin (e.g. `http://localhost:3001`). The default backend config includes common listener origins.

### Connection fails

- Verify `VITE_API_URL` matches the backend URL the browser can reach.
- Ensure WebSocket connections to `/ws/signaling` are allowed (no overly strict firewalls or proxies).
