# Audio Translation System - Project Structure

## Root Directory Structure

```
audio-translation-system/
├── backend/                    # C# .NET Backend API
├── mediasoup-service/          # Node.js mediasoup SFU Service
├── stt-worker/                 # Speech-to-Text Worker (Whisper + FFmpeg)
├── recording-worker/           # Audio Recording Worker (FFmpeg)
├── mobile-translator/          # Translator Mobile App (Flutter/React Native)
├── mobile-listener/            # Listener Mobile App (Flutter/React Native)
├── admin-dashboard/            # Web Admin Dashboard (React/Vue)
├── database/                   # PostgreSQL Migrations & Scripts
├── deployment/                 # Docker & Deployment Scripts
└── docs/                       # Documentation
```

---

## Backend (C# .NET)

```
backend/
├── Api/
│   ├── Controllers/           # REST API Controllers
│   ├── Middleware/            # Custom Middleware
│   └── Filters/               # Action Filters
├── Services/
│   ├── Auth/                  # Authentication Services
│   ├── Events/                # Event Management Services
│   ├── Channels/              # Channel Management Services
│   ├── Sessions/              # Session Management Services
│   ├── Recordings/            # Recording Services
│   ├── Captions/              # Caption Services
│   └── Mediasoup/             # mediasoup Integration Services
├── Models/
│   ├── Entities/              # Database Entities (EF Core)
│   ├── DTOs/                  # Data Transfer Objects
│   └── ViewModels/            # View Models
├── Infrastructure/
│   ├── Database/              # DbContext, Repositories
│   ├── WebSocket/             # WebSocket/SignalR Handlers
│   ├── Config/                # Configuration Classes
│   └── Logging/               # Logging Infrastructure
├── SignalR/                   # SignalR Hubs
├── Data/                      # Data Access Layer
└── Tests/                     # Unit & Integration Tests
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
│   ├── routers/               # Router Management
│   ├── transports/            # Transport Management
│   ├── producers/             # Producer Management
│   ├── consumers/             # Consumer Management
│   └── workers/               # Worker Management
├── config/                    # Configuration Files
└── tests/                     # Tests
```

---

## STT Worker (Node.js/Python)

```
stt-worker/
├── src/
│   ├── ffmpeg/               # FFmpeg RTP Decoder
│   ├── whisper/               # Whisper Integration
│   └── api/                   # API Endpoints
├── models/                    # Data Models
├── config/                    # Configuration
└── tests/                     # Tests
```

---

## Recording Worker (Node.js)

```
recording-worker/
├── src/
│   ├── ffmpeg/               # FFmpeg Recording
│   ├── storage/               # File Storage Management
│   └── api/                   # API Endpoints
├── config/                    # Configuration
└── tests/                     # Tests
```

---

## Mobile Translator App (Flutter/React Native)

```
mobile-translator/
├── lib/                       # Flutter: Source Code | React Native: src/
│   ├── screens/               # App Screens
│   ├── services/             # API & WebSocket Services
│   ├── models/               # Data Models
│   ├── widgets/              # Reusable Widgets/Components
│   ├── utils/                # Utility Functions
│   └── webrtc/               # WebRTC Wrapper
├── test/                      # Tests
└── assets/                    # Images, Fonts, etc.
```

---

## Mobile Listener App (Flutter/React Native)

```
mobile-listener/
├── lib/                       # Flutter: Source Code | React Native: src/
│   ├── screens/               # App Screens
│   ├── services/             # API & WebSocket Services
│   ├── models/               # Data Models
│   ├── widgets/              # Reusable Widgets/Components
│   ├── utils/                # Utility Functions
│   └── webrtc/               # WebRTC Wrapper
├── test/                      # Tests
└── assets/                    # Images, Fonts, etc.
```

---

## Admin Dashboard (React/Vue)

```
admin-dashboard/
├── src/
│   ├── components/
│   │   ├── common/           # Common Components
│   │   ├── users/            # User Management Components
│   │   ├── events/           # Event Management Components
│   │   ├── channels/         # Channel Management Components
│   │   ├── sessions/         # Session Management Components
│   │   └── recordings/       # Recording Management Components
│   ├── pages/
│   │   ├── dashboard/        # Dashboard Page
│   │   ├── users/            # User Management Page
│   │   ├── events/           # Event Management Page
│   │   ├── sessions/         # Session Monitoring Page
│   │   ├── recordings/       # Recording Management Page
│   │   └── settings/         # Settings Page
│   ├── services/             # API Services
│   ├── store/                # State Management (Redux/Vuex)
│   ├── utils/                # Utility Functions
│   └── hooks/                # Custom Hooks (React)
├── public/                    # Static Assets
└── tests/                     # Tests
```

---

## Database

```
database/
├── migrations/                # PostgreSQL Migration Scripts
├── seeds/                     # Seed Data Scripts
└── scripts/                   # Utility Scripts
```

---

## Deployment

```
deployment/
├── docker/
│   ├── backend/              # Backend Dockerfile
│   ├── mediasoup/            # mediasoup Dockerfile
│   ├── stt-worker/           # STT Worker Dockerfile
│   ├── recording-worker/     # Recording Worker Dockerfile
│   └── admin-dashboard/      # Admin Dashboard Dockerfile
├── scripts/                   # Deployment Scripts
│   ├── start.sh              # Startup Script
│   ├── stop.sh               # Shutdown Script
│   └── backup.sh             # Backup Script
└── config/                    # Deployment Configuration
    ├── docker-compose.yml     # Docker Compose Configuration
    └── .env.example          # Environment Variables Template
```

---

## Documentation

```
docs/
├── api/                       # API Documentation
├── architecture/              # Architecture Diagrams & Docs
├── deployment/                # Deployment Guides
└── user-guides/               # User Guides
    ├── translator-guide.md
    ├── listener-guide.md
    └── admin-guide.md
```

---

## Next Steps

1. Initialize each project with its respective framework/tooling
2. Set up version control (Git)
3. Create initial configuration files
4. Set up CI/CD pipelines (optional)
5. Begin Phase 1 development (see DEVELOPMENT_PLAN.md)
