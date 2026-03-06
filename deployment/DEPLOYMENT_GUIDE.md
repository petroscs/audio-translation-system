# Audio Translation System — Deployment Guide

This guide walks you through installing the Audio Translation System on a **new PC for demonstration**. Everything runs in Docker, so you do not need to install .NET, Node, or Flutter on the host.

---

## What You Will Need

### Hardware

- **PC** (Windows 10/11, or Linux) with:
  - **RAM:** 8 GB minimum; 16 GB recommended if running Whisper STT (e.g. `base` or larger model).
  - **Disk:** ~5 GB free for images and build cache; more if you keep many recordings.
  - **Network:** Wired or Wi‑Fi. For demos with phones/tablets, the PC must be on the same LAN.

### Software (before you start)

| Requirement | Purpose |
|-------------|--------|
| **Docker Desktop** | Runs all services (backend, mediasoup, workers, web apps). |
| **Git** | To clone the repository (or you can copy the project folder). |

- **Windows:** Install [Docker Desktop for Windows](https://docs.docker.com/desktop/install/windows-install/) and ensure **WSL 2** is used. Start Docker Desktop and wait until it is fully running.
- **Linux:** Install [Docker Engine](https://docs.docker.com/engine/install/) and [Docker Compose](https://docs.docker.com/compose/install/).

No need to install .NET SDK, Node.js, Flutter, or Python on the host — they run inside containers.

---

## Step 1 — Get the Code

On the new PC, open a terminal (PowerShell on Windows, or bash on Linux).

**Option A: Clone the repository**

```bash
git clone <your-repo-url> audio-translation-system
cd audio-translation-system
```

**Option B: Copy the project**

Copy the whole project folder (e.g. from a USB drive or network share) to the PC and open a terminal in that folder.

---

## Step 2 — Configure Environment

1. Go to the `deployment` folder:

   ```bash
   cd deployment
   ```

2. Create your environment file from the template:

   ```bash
   # Windows (PowerShell)
   Copy-Item .env.example .env

   # Linux / macOS
   cp .env.example .env
   ```

3. Edit `.env` in a text editor. For a **demonstration on one PC** (everything on the same machine), you can leave defaults:

   - `SERVER_IP=127.0.0.1` — fine if only this PC is used.
   - `API_URL=http://localhost:5000`
   - `LISTENER_URL=http://localhost:3001`
   - `JWT_SECRET` — change to any long random string (e.g. 32+ characters) for security.

   For a **demo where phones/tablets or other PCs** join as listeners or translators:

   - Set `SERVER_IP` to this PC’s **LAN IP** (e.g. `192.168.1.100`).  
     (Find it: Windows → `ipconfig`, Linux/macOS → `ip addr` or `ifconfig`.)
   - Set URLs so other devices can reach this PC:
     - `API_URL=http://192.168.1.100:5000` (used by the **admin dashboard** build)
     - `LISTENER_URL=http://192.168.1.100:3001`

   Note: the **web translator** (https://*:3002) proxies `/api` and `/ws` through nginx, so it does not need an `API_URL` setting to reach the backend.

   Optional: `WHISPER_MODEL` — `tiny` (fastest, less accurate) or `base` (default), `small`, `medium`, `large` (slower, more accurate). Larger models need more RAM.

---

## Step 3 — Build and Start All Services

From the `deployment` folder:

```bash
docker-compose up -d --build
```

The first run can take several minutes (downloading base images and building backend, mediasoup, workers, admin dashboard, web listener, web translator). Later starts are much faster.

Check that containers are running:

```bash
docker-compose ps
```

All services should show as “Up”. If something is missing, check logs:

```bash
docker-compose logs -f
```

Press `Ctrl+C` to stop following logs.

---

## Step 4 — First-Time Access

### Admin dashboard

- **URL:** http://localhost:3000 (or http://*&lt;SERVER_IP&gt;*:3000 if you set a LAN IP).
- **Default login:**  
  - Username: `admin`  
  - Password: `ChangeMe123!`  
  (Change this in production via backend configuration.)

Use the admin dashboard to create sessions, manage users, and see the listener link/QR.

### Web listener (for attendees)

- **URL:** http://localhost:3001 (or http://*&lt;SERVER_IP&gt;*:3001).
- Same URL/QR works for the in-browser listener and for the native mobile listener app when it points to this server.

### Web translator (broadcast from browser)

- **URL:** https://localhost:3002 (or https://*&lt;SERVER_IP&gt;*:3002).
- Uses a **self-signed certificate**. The first time you open it, the browser will show a security warning (“Your connection is not private”). Use **Advanced** → **Proceed to …** to continue. After that, the microphone permission prompt will appear when you start broadcasting.

### API and Swagger

- **API:** http://localhost:5000 (or http://*&lt;SERVER_IP&gt;*:5000).
- **Swagger UI:** http://localhost:5000/swagger (handy for debugging).

---

## Demonstration Workflow

1. **Start a session** in the admin dashboard (create or select a session).
2. **Translator:** Open the **Web Translator** (https://…:3002), log in (or use a translator account), join the session, and start broadcasting (allow microphone when prompted).
3. **Listeners:** Share the **Web Listener** link or QR (http://…:3001) from the admin dashboard. Attendees open it in a browser or in the mobile app and choose the session to listen.
4. **Admin:** Use the dashboard to monitor sessions and manage users as needed.

---

## Ports Used (firewall / corporate networks)

If the demo PC is behind a firewall or you use another PC/phone on the LAN, ensure these ports are open on the **demo PC**:

| Port  | Protocol | Service        |
|-------|----------|----------------|
| 5000  | TCP      | Backend API    |
| 3000  | TCP      | Admin dashboard|
| 3001  | TCP      | Web listener   |
| 3002  | TCP      | Web translator |
| 4000  | TCP      | mediasoup HTTP |
| 10000–10100 | UDP | mediasoup WebRTC |

---

## Stopping and Restarting

- **Stop all services:**
  ```bash
  cd deployment
  docker-compose down
  ```

- **Start again (no rebuild):**
  ```bash
  docker-compose up -d
  ```

- **Rebuild after code changes:**
  ```bash
  docker-compose up -d --build
  ```

---

## Data and Backups

- **Database:** Stored in Docker volume `db_data` (SQLite).
- **Recordings:** Stored in Docker volume `recordings`.

To back up the database (run from `deployment`):

```bash
docker run --rm -v audio-translation-system_db_data:/data -v "%cd%:/backup" alpine tar czf /backup/db_backup.tar.gz -C /data .
```

On Linux/macOS use `$(pwd)` instead of `%cd%`.

---

## Troubleshooting

| Issue | What to do |
|-------|------------|
| **Docker Desktop not running** | Start Docker Desktop and wait until the whale icon is steady. On Windows, ensure WSL 2 is enabled. |
| **Port already in use** | Change the port mapping in `deployment/docker-compose.yml` (e.g. `"3003:3000"` instead of `"3000:3000"` for the admin dashboard). |
| **Build fails** | Ensure the full project (backend, admin-dashboard, mobile/translator_app, workers, deployment) is present. Run `docker-compose logs [service-name]` to see errors. |
| **Listeners/translators cannot connect** | Set `SERVER_IP` in `.env` to this PC’s LAN IP. For LAN demos, set `API_URL` (admin dashboard) and `LISTENER_URL` to use the same IP. Open the ports listed above on the PC’s firewall. |
| **Web translator HTTPS warning** | Expected with the self-signed certificate. Use “Advanced” → “Proceed” to continue. |
| **Microphone not working in browser** | Use **HTTPS** for the web translator (https://…:3002). Browsers often block microphone on plain HTTP. |

More commands and tips: see [README.md](README.md) in this folder.

---

## Summary Checklist for a New Demo PC

- [ ] Install Docker Desktop (or Docker Engine + Compose on Linux).
- [ ] Get the project (clone or copy) and `cd deployment`.
- [ ] Copy `.env.example` to `.env`.
- [ ] Edit `.env`: set `SERVER_IP` (and `API_URL` / `LISTENER_URL` for LAN demos) if using other devices on the LAN; set a strong `JWT_SECRET`.
- [ ] Run `docker-compose up -d --build` and wait for all services to be up.
- [ ] Open admin at http://localhost:3000 (or http://*&lt;IP&gt;*:3000), log in with `admin` / `ChangeMe123!`.
- [ ] Use Web Translator at https://…:3002 and Web Listener at http://…:3001 for the demo.
