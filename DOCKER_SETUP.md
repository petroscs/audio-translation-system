# Docker Setup Complete ✅

## What Was Created

### Dockerfiles
1. **Backend** (`deployment/docker/backend/Dockerfile`)
   - Multi-stage build for .NET 8 API
   - Includes SQLite data directory
   - Exposes ports 5000 (HTTP) and 5001 (HTTPS)

2. **mediasoup Service** (`deployment/docker/mediasoup/Dockerfile`)
   - Node.js 20 Alpine-based
   - Includes Python and build tools for mediasoup
   - Exposes port 4000 (HTTP) and 10000-10100 (UDP for RTP)

3. **STT Worker** (`deployment/docker/stt-worker/Dockerfile`)
   - Node.js 20 Alpine-based
   - Includes FFmpeg and Whisper (Python)
   - Exposes port 5002

4. **Recording Worker** (`deployment/docker/recording-worker/Dockerfile`)
   - Node.js 20 Alpine-based
   - Includes FFmpeg
   - Creates recordings volume
   - Exposes port 5003

5. **Admin Dashboard** (`deployment/docker/admin-dashboard/Dockerfile`)
   - Multi-stage build (Node.js build + Nginx serve)
   - Includes Nginx configuration
   - Exposes port 3000

### Configuration Files
- **docker-compose.yml** - Main orchestration file
- **.env.example** - Environment variables template
- **.dockerignore** - Files to exclude from Docker builds
- **README.md** - Deployment documentation
- **nginx.conf** - Nginx configuration for admin dashboard

## Next Steps

1. **Start Docker Desktop** (if not already running)
   - Docker Desktop needs to be started manually
   - Wait for it to fully initialize

2. **Configure Environment**
   ```bash
   cd deployment
   cp .env.example .env
   # Edit .env with your settings
   ```

3. **Test Docker Setup**
   ```bash
   docker-compose config  # Validate configuration
   docker-compose build   # Build images (will fail until code is ready)
   ```

## Important Notes

- Docker Desktop was installed but needs to be **started manually**
- Services cannot be built yet until source code is implemented
- **Voice/WebRTC:** Set `SERVER_IP` to the IP address that translator and listener clients use to reach this host (e.g. your machine’s LAN IP like `192.168.1.x`). If clients run on the same machine as Docker, `127.0.0.1` is fine; otherwise voice will not transfer until `SERVER_IP` is set.
- **Web listener (browser):** The web listener derives the API/SignalR URL at runtime from the page's host (same host, port 5000) when `VITE_API_URL` is not set. If you build with a specific API (e.g. for a different port), set `API_URL` when building: `API_URL=http://YOUR_IP:5000 docker-compose build web-listener`.
- **Listener app (mobile):** The app uses `API_BASE_URL` at build time (default `http://10.0.2.2:5000` for Android emulator). For a real device or another host, build with: `flutter build apk --dart-define=API_BASE_URL=http://YOUR_SERVER_IP:5000` (and use the same value for the translator app if needed). Otherwise you may see "Failed to complete negotiation with the server: TypeError: Failed to fetch".
- **LAN access (e.g. http://192.168.x.x:5000):** Ports are bound to `0.0.0.0` so the backend and web apps are reachable on your LAN IP. If you still cannot reach them from another device, allow inbound TCP (and UDP for 10000–10100) in **Windows Firewall** for the relevant ports (5000, 3000, 3001, 4000) or for "Docker Desktop".
- Change `JWT_SECRET` to a secure random string

## Service Dependencies

```
backend → mediasoup
stt-worker → mediasoup, backend
recording-worker → mediasoup, backend
admin-dashboard → backend
```

All services are on the same Docker network: `audio-translation-network`

## Volumes

- `db_data`: SQLite database persistence
- `recordings`: Audio recording files storage

## Status

✅ Docker Desktop installed
✅ All Dockerfiles created
✅ Docker Compose configuration ready
⏳ Docker Desktop needs to be started manually
⏳ Services cannot be built until code is implemented
