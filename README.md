# Audio Translation System - Project Structure

## Root Directory Structure

```
audio-translation-system/
├── backend/                    # C# .NET Backend API
├── mediasoup-service/          # Node.js mediasoup SFU Service
├── stt-worker/                 # Speech-to-Text Worker (Whisper + FFmpeg)
├── recording-worker/           # Audio Recording Worker (FFmpeg)
├── mobile/                     # Mobile Apps (Flutter)
│   ├── translator_app/         # Translator Mobile App
│   └── listener_app/           # Listener Mobile App
├── admin-dashboard/            # Web Admin Dashboard (React + Vite)
├── database/                   # PostgreSQL schema & scripts
├── deployment/                 # Docker & deployment config
├── tests/                      # Integration, load, network, security, stress tests
├── ARCHITECTURE.md             # Architecture documentation
├── DEVELOPMENT_PLAN.md
├── DOCKER_SETUP.md
├── NEXT_STEPS.md
└── *.ps1                       # GitHub/setup scripts (e.g. push-to-github.ps1)
```

---

## Backend (C# .NET)

```
backend/
├── Backend.Api/               # Web API project
│   ├── Controllers/           # REST API Controllers (Auth, Captions, Channels, Events, Recordings, Sessions, Users)
│   ├── Hubs/                  # SignalR Hubs (SignalingHub)
│   ├── Contracts/             # Request/Response DTOs (Auth, Captions, Channels, Events, Recordings, Sessions, Signaling, Users)
│   ├── Configuration/         # App configuration (AdminUserSettings, CaptionBroadcaster)
│   └── Seeding/               # Database seeder
├── Backend.Services/          # Business logic
│   ├── Services/              # Auth, Caption, Channel, Event, Mediasoup, Recording, Session, Signaling, SttWorker, User
│   ├── Interfaces/           # Service interfaces
│   └── Models/                # Service models (JWT, Mediasoup, etc.)
├── Backend.Models/            # Shared domain models
│   ├── Entities/              # EF Core entities (Caption, Channel, Consumer, Event, Producer, Recording, Session, Transport, User, etc.)
│   └── Enums/                 # EventStatus, MediaKind, RecordingStatus, SessionRole, SessionStatus, UserRole, etc.
├── Backend.Infrastructure/    # Data & cross-cutting
│   └── Data/                  # AppDbContext, Migrations
├── Backend.Tests/             # Unit & integration tests
│   ├── Integration/           # API, Mediasoup, RecordingWorker, Signaling, SttWorker, Concurrency
│   ├── Security/              # Auth, authorization, data & session security
│   └── Helpers/               # TestServerFactory, TestDataBuilder, etc.
└── Backend.sln
```

---

## SignalR Signaling (Backend.Api)

The signaling hub is available at `/ws/signaling` and expects `access_token` in the query string.

Example (JavaScript SignalR client):
```
const connection = new signalR.HubConnectionBuilder()
  .withUrl("http://localhost:5081/ws/signaling?access_token=JWT_TOKEN")
  .build();

await connection.start();
const transport = await connection.invoke("CreateTransport", {
  sessionId: "SESSION_GUID",
  direction: "Send"
});
```

---

## mediasoup Service (Node.js)

```
mediasoup-service/
├── src/
│   ├── index.js
│   ├── server.js
│   └── mediasoup/             # Router, transport, producer, consumer, worker modules
│       ├── config.js
│       ├── routers.js
│       ├── transports.js
│       ├── producers.js
│       ├── consumers.js
│       └── workers.js
├── package.json
└── package-lock.json
```

---

## STT Worker (Node.js)

```
stt-worker/
├── src/
│   ├── index.js
│   ├── config.js
│   ├── mediasoup-consumer.js
│   ├── rtp-receiver.js
│   ├── whisper-processor.js
│   └── caption-sender.js
├── package.json
└── package-lock.json
```

---

## Recording Worker (Node.js)

```
recording-worker/
├── src/
│   ├── index.js
│   ├── config.js
│   ├── mediasoup-consumer.js
│   ├── recording-sender.js
│   └── rtp-to-file.js
├── package.json
└── package-lock.json
```

---

## Mobile Apps (Flutter)

Translator and listener apps live under `mobile/` as separate Flutter projects.

```
mobile/
├── translator_app/            # Translator Mobile App
│   ├── lib/
│   │   ├── app/               # App state
│   │   ├── config/            # API config
│   │   ├── models/            # Auth, channel, event, session, signaling
│   │   ├── services/          # API client, auth, event, session
│   │   ├── signaling/         # Signaling client
│   │   ├── ui/                # Screens (login, event list, channel list, dashboard)
│   │   └── webrtc/            # WebRTC service
│   ├── test/
│   ├── android/, ios/, web/, linux/, macos/, windows/
│   └── pubspec.yaml
└── listener_app/              # Listener Mobile App (similar structure)
```

---

## Admin Dashboard (React + Vite)

```
admin-dashboard/
├── src/
│   ├── api/                   # API client & endpoints (auth, channels, events, recordings, sessions, users)
│   ├── auth/                  # AuthContext
│   ├── components/            # Layout and shared components
│   ├── pages/                 # Dashboard, Events, EventChannels, Login, Recordings, Sessions, Users
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── index.html
├── vite.config.ts
├── tsconfig.json
└── package.json
```

---

## Database

```
database/
└── schema.sql                 # PostgreSQL schema
```

---

## Deployment

```
deployment/
├── docker/
│   ├── backend/               # Backend Dockerfile
│   ├── mediasoup/             # mediasoup Dockerfile
│   ├── stt-worker/            # STT Worker Dockerfile
│   ├── recording-worker/     # Recording Worker Dockerfile
│   └── admin-dashboard/      # Admin Dashboard Dockerfile + nginx.conf
├── docker-compose.yml
├── .env.example
├── .dockerignore
└── README.md
```

---

## Documentation & tests

- **Root .md files:** ARCHITECTURE.md, DATABASE_CHOICE.md, DEVELOPMENT_PLAN.md, DOCKER_SETUP.md, GITHUB_SETUP.md, NEXT_STEPS.md, PHASE_5_PLAN.md, SETUP_STATUS.md, STRUCTURE.md, WSL_INSTALLATION.md
- **tests/**  
  - `integration/` – e2e test scripts  
  - `load/` – API, WebRTC, WebSocket load tests  
  - `network/` – network testing guide  
  - `security/` – security checklist, vulnerability assessment  
  - `stress/` – stress testing guide  
  - TEST_EXECUTION_GUIDE.md, PHASE_8_SUMMARY.md

---

## Next Steps

1. Initialize each project with its respective framework/tooling
2. Set up version control (Git)
3. Create initial configuration files
4. Set up CI/CD pipelines (optional)
5. Begin Phase 1 development (see DEVELOPMENT_PLAN.md)
