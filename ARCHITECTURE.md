# Audio Translation System - Architecture Overview

This document provides comprehensive architecture diagrams showing how all services interact with each other in the real-time audio translation/broadcast system.

## Table of Contents

1. [High-Level System Architecture](#high-level-system-architecture)
2. [Service Interaction Flow - Audio Streaming](#service-interaction-flow---audio-streaming)
3. [Service Interaction Flow - STT/Captions](#service-interaction-flow---sttcaptions)
4. [Service Interaction Flow - Recording](#service-interaction-flow---recording)
5. [Data Flow Diagram](#data-flow-diagram)
6. [Deployment Architecture](#deployment-architecture)
7. [Service Communication Protocols](#service-communication-protocols)

---

## High-Level System Architecture

```mermaid
graph TB
    subgraph "Local Network (LAN)"
        subgraph "Client Layer"
            TA[Mobile Translator App<br/>Flutter]
            LA1[Mobile Listener App<br/>Flutter]
            LA2[Mobile Listener App<br/>Flutter]
            AD[Admin Dashboard<br/>React + Vite]
        end
        
        subgraph "Backend Services"
            BE[C# Backend API<br/>.NET 8<br/>Port: 5000/5001]
            MS[mediasoup Service<br/>Node.js<br/>Port: 4000]
            STT[STT Worker<br/>Node.js/Python<br/>Port: 5002]
            RW[Recording Worker<br/>Node.js<br/>Port: 5003]
        end
        
        subgraph "Data Layer"
            DB[(SQLite Database<br/>File-based)]
            FS[File Storage<br/>Recordings]
        end
    end
    
    TA -->|REST API<br/>WebSocket SignalR| BE
    LA1 -->|REST API<br/>WebSocket SignalR| BE
    LA2 -->|REST API<br/>WebSocket SignalR| BE
    AD -->|REST API| BE
    
    BE -->|HTTP API| MS
    BE -->|HTTP API| STT
    BE -->|HTTP API| RW
    BE -->|File Access| DB
    
    MS -->|RTP/UDP<br/>Port: 10000-10100| TA
    MS -->|RTP/UDP<br/>Port: 10000-10100| LA1
    MS -->|RTP/UDP<br/>Port: 10000-10100| LA2
    MS -->|RTP/UDP| STT
    MS -->|RTP/UDP| RW
    
    STT -->|HTTP API<br/>WebSocket| BE
    RW -->|HTTP API| BE
    RW -->|File Write| FS
    
    BE -->|Read/Write| DB
    
    style TA fill:#e1f5ff
    style LA1 fill:#e1f5ff
    style LA2 fill:#e1f5ff
    style AD fill:#fff4e1
    style BE fill:#ffe1f5
    style MS fill:#e1ffe1
    style STT fill:#ffe1f5
    style RW fill:#ffe1f5
    style DB fill:#f0f0f0
    style FS fill:#f0f0f0
```

---

## Service Interaction Flow - Audio Streaming

This diagram shows the complete flow when a translator starts streaming audio and listeners receive it.

```mermaid
sequenceDiagram
    participant TA as Translator App
    participant BE as Backend API
    participant MS as mediasoup Service
    participant LA1 as Listener App 1
    participant LA2 as Listener App 2
    
    Note over TA,LA2: Authentication & Session Setup
    TA->>BE: POST /api/auth/login
    BE-->>TA: JWT Token
    TA->>BE: POST /api/sessions (create session)
    BE-->>TA: Session ID
    
    LA1->>BE: POST /api/auth/login
    BE-->>LA1: JWT Token
    LA1->>BE: POST /api/sessions (join session)
    BE-->>LA1: Session ID
    
    LA2->>BE: POST /api/auth/login
    BE-->>LA2: JWT Token
    LA2->>BE: POST /api/sessions (join session)
    BE-->>LA2: Session ID
    
    Note over TA,LA2: WebSocket Signaling (SignalR)
    TA->>BE: Connect SignalR /ws/signaling
    LA1->>BE: Connect SignalR /ws/signaling
    LA2->>BE: Connect SignalR /ws/signaling
    
    Note over TA,MS: Translator Transport Setup
    TA->>BE: createTransport (direction: send)
    BE->>MS: POST /mediasoup/transport/create
    MS-->>BE: Transport ID, ICE params, DTLS params
    BE-->>TA: transportCreated
    
    TA->>BE: connectTransport (DTLS parameters)
    BE->>MS: POST /mediasoup/transport/connect
    MS-->>BE: OK
    BE-->>TA: transportConnected
    
    TA->>BE: produce (audio RTP parameters)
    BE->>MS: POST /mediasoup/producer/create
    MS-->>BE: Producer ID
    BE-->>TA: producerCreated
    
    Note over LA1,MS: Listener Transport Setup
    LA1->>BE: createTransport (direction: receive)
    BE->>MS: POST /mediasoup/transport/create
    MS-->>BE: Transport ID, ICE params, DTLS params
    BE-->>LA1: transportCreated
    
    LA1->>BE: connectTransport (DTLS parameters)
    BE->>MS: POST /mediasoup/transport/connect
    MS-->>BE: OK
    BE-->>LA1: transportConnected
    
    LA1->>BE: consume (producer ID)
    BE->>MS: POST /mediasoup/consumer/create
    MS-->>BE: Consumer ID, RTP parameters
    BE-->>LA1: consumerCreated
    
    LA2->>BE: createTransport (direction: receive)
    BE->>MS: POST /mediasoup/transport/create
    MS-->>BE: Transport ID, ICE params, DTLS params
    BE-->>LA2: transportCreated
    
    LA2->>BE: connectTransport (DTLS parameters)
    BE->>MS: POST /mediasoup/transport/connect
    MS-->>BE: OK
    BE-->>LA2: transportConnected
    
    LA2->>BE: consume (producer ID)
    BE->>MS: POST /mediasoup/consumer/create
    MS-->>BE: Consumer ID, RTP parameters
    BE-->>LA2: consumerCreated
    
    Note over TA,LA2: WebRTC Media Flow (RTP/UDP)
    TA->>MS: RTP Audio Stream (UDP: 10000-10100)
    MS->>LA1: RTP Audio Stream (UDP: 10000-10100)
    MS->>LA2: RTP Audio Stream (UDP: 10000-10100)
    
    Note over TA,LA2: Continuous Audio Streaming
    loop Audio Streaming
        TA->>MS: RTP Packets (Opus audio)
        MS->>LA1: RTP Packets (Opus audio)
        MS->>LA2: RTP Packets (Opus audio)
    end
```

---

## Service Interaction Flow - STT/Captions

This diagram shows how audio is processed for speech-to-text and captions are delivered to listeners. The backend starts the STT worker when the translator creates a producer (starts streaming). The STT worker connects to mediasoup via **Plain RTP transport** (plain-transport/create, plain-transport/connect, then consumer/create).

```mermaid
sequenceDiagram
    participant TA as Translator App
    participant BE as Backend API
    participant MS as mediasoup Service
    participant STT as STT Worker
    participant LA1 as Listener App 1
    participant LA2 as Listener App 2
    
    Note over TA,STT: STT Worker Setup (triggered when translator produces)
    BE->>STT: POST /stt/start (sessionId, eventId, channelId, producerId, mediasoupProducerId)
    STT->>MS: POST /mediasoup/plain-transport/create, plain-transport/connect
    STT->>MS: POST /mediasoup/consumer/create
    MS-->>STT: Consumer ID, RTP parameters
    
    Note over TA,STT: Audio Processing Pipeline
    TA->>MS: RTP Audio Stream
    MS->>STT: RTP Audio Stream (Plain RTP to worker)
    
    loop Continuous Processing
        STT->>STT: FFmpeg: RTP → PCM (16kHz, 16-bit, mono)
        STT->>STT: Whisper: PCM → Text + Timestamps
        STT->>STT: Format captions (punctuation, capitalization)
        STT->>BE: POST /api/captions (caption data, X-STT-Worker-Key)
        BE->>BE: Store caption in SQLite
        BE->>LA1: WebSocket (SignalR): Caption message
        BE->>LA2: WebSocket (SignalR): Caption message
        LA1->>LA1: Display caption overlay
        LA2->>LA2: Display caption overlay
    end
```

---

## Service Interaction Flow - Recording

This diagram shows how audio recordings are captured and managed. The backend starts the recording worker when the translator creates a producer (starts streaming). The recording worker connects to mediasoup via **Plain RTP transport** (plain-transport/create, plain-transport/connect, then consumer/create). Recordings are written to file storage; the backend serves downloads by reading from the same path (shared volume or local disk).

```mermaid
sequenceDiagram
    participant TA as Translator App
    participant BE as Backend API
    participant MS as mediasoup Service
    participant RW as Recording Worker
    participant FS as File Storage
    participant AD as Admin Dashboard
    
    Note over TA,RW: Recording Worker Setup (triggered when translator produces)
    BE->>RW: POST /recording/start (sessionId, eventId, channelId, producerId, mediasoupProducerId)
    RW->>MS: POST /mediasoup/plain-transport/create, plain-transport/connect
    RW->>MS: POST /mediasoup/consumer/create
    MS-->>RW: Consumer ID, RTP parameters
    
    Note over TA,RW: Recording Process
    TA->>MS: RTP Audio Stream
    MS->>RW: RTP Audio Stream (Plain RTP to worker)
    
    loop Recording Session
        RW->>RW: FFmpeg: RTP → Audio File (Opus, SDP-based)
        RW->>FS: Write recording.opus to session directory
    end
    
    Note over TA,RW: Recording Completion (session end)
    BE->>RW: POST /recording/stop (sessionId)
    RW->>RW: Finalize audio file
    RW->>BE: POST /api/recordings/complete (sessionId, filePath, durationSeconds, X-Recording-Worker-Key)
    BE->>BE: Store recording metadata in SQLite
    
    Note over AD: Admin Access
    AD->>BE: GET /api/recordings
    BE-->>AD: List of recordings
    AD->>BE: GET /api/recordings/{id}/download
    BE->>FS: Read recording file (Recordings.Path)
    BE-->>AD: Recording file download
```

---

## Data Flow Diagram

This diagram shows the complete data flow through the system for a typical translation session.

```mermaid
flowchart TD
    Start([Translator Starts Session]) --> Auth[Authentication]
    Auth -->|JWT Token| Session[Create Session]
    Session -->|Session ID| SignalR[Connect SignalR]
    
    SignalR --> Transport[Create Transport]
    Transport -->|Transport ID| Connect[Connect Transport]
    Connect -->|DTLS Params| Produce[Create Producer]
    
    Produce -->|Producer ID| Audio[Audio Capture]
    Audio -->|RTP Stream| Mediasoup[mediasoup SFU]
    
    Mediasoup -->|Route RTP| Listeners[Listener Apps]
    Mediasoup -->|Route RTP| STT[STT Worker]
    Mediasoup -->|Route RTP| Record[Recording Worker]
    
    STT -->|RTP → PCM| Whisper[Whisper Processing]
    Whisper -->|Text + Timestamps| Format[Format Captions]
    Format -->|HTTP API| Backend[Backend API]
    Backend -->|Store| DB[(SQLite Database)]
    Backend -->|WebSocket| Listeners
    
    Record -->|RTP → Audio File| File[File Storage]
    Record -->|Metadata| Backend
    Backend -->|Store| DB
    
    Listeners -->|Play Audio| End([Listeners Hear Translation])
    Listeners -->|Display| Captions[Show Captions]
    
    style Start fill:#e1f5ff
    style Mediasoup fill:#e1ffe1
    style Backend fill:#ffe1f5
    style DB fill:#f0f0f0
    style File fill:#f0f0f0
    style End fill:#e1f5ff
```

---

## Deployment Architecture

This diagram shows how services are deployed using Docker containers.

```mermaid
graph TB
    subgraph "Docker Host / Server"
        subgraph "Docker Network"
            subgraph "Backend Container"
                BE[C# Backend API<br/>Port: 5000/5001<br/>Internal: 5000]
            end
            
            subgraph "mediasoup Container"
                MS[mediasoup Service<br/>Port: 4000<br/>UDP: 10000-10100]
            end
            
            subgraph "STT Container"
                STT[STT Worker<br/>Port: 5002<br/>Whisper + FFmpeg]
            end
            
            subgraph "Recording Container"
                RW[Recording Worker<br/>Port: 5003<br/>FFmpeg]
            end
            
            subgraph "Admin Dashboard Container"
                AD[Admin Dashboard<br/>Port: 3000<br/>Nginx]
            end
        end
        
        subgraph "Volumes"
            DB_VOL[(Database Volume<br/>SQLite file)]
            REC_VOL[(Recordings Volume<br/>Audio files)]
        end
    end
    
    subgraph "External Clients"
        TA[Mobile Translator App]
        LA[Mobile Listener Apps]
        AD_CLIENT[Admin Browser]
    end
    
    BE -->|Read/Write| DB_VOL
    RW -->|Write| REC_VOL
    BE -->|Read| REC_VOL
    
    BE -.->|HTTP API| MS
    BE -.->|HTTP API| STT
    BE -.->|HTTP API| RW
    
    MS -.->|RTP/UDP| STT
    MS -.->|RTP/UDP| RW
    
    TA -->|REST + WebSocket| BE
    TA -->|RTP/UDP| MS
    
    LA -->|REST + WebSocket| BE
    LA -->|RTP/UDP| MS
    
    AD_CLIENT -->|HTTP| AD
    AD -->|REST API| BE
    
    style BE fill:#ffe1f5
    style MS fill:#e1ffe1
    style STT fill:#ffe1f5
    style RW fill:#ffe1f5
    style AD fill:#fff4e1
    style DB_VOL fill:#f0f0f0
    style REC_VOL fill:#f0f0f0
```

---

## Service Communication Protocols

### Port Configuration

| Service | Port | Protocol | Purpose |
|---------|------|----------|---------|
| C# Backend API | 5000 | HTTP | REST API endpoints |
| C# Backend API | 5001 | HTTPS | REST API (if TLS enabled) |
| C# Backend WebSocket | 5000/5001 | WebSocket (SignalR) | Real-time signaling |
| mediasoup Service | 4000 | HTTP | mediasoup API |
| mediasoup RTP | 10000-10100 | UDP | RTP media streams |
| STT Worker | 5002 | HTTP | STT worker API (POST /stt/start, POST /stt/stop) |
| Recording Worker | 5003 | HTTP | Recording worker API (POST /recording/start, POST /recording/stop) |
| Admin Dashboard | 3000 | HTTP | Web dashboard |

### Communication Patterns

#### 1. REST API (HTTP)
- **Backend ↔ Mobile Apps**: Authentication, session management, event/channel CRUD
- **Backend ↔ Admin Dashboard**: All CRUD operations, monitoring
- **Backend ↔ mediasoup**: Transport/producer/consumer creation
- **Backend ↔ STT Worker**: Caption submission, status updates
- **Backend ↔ Recording Worker**: Recording control (start/stop), completion callback (POST /api/recordings/complete)

#### 2. WebSocket (SignalR)
- **Backend ↔ Mobile Apps**: Real-time signaling (transport creation, producer/consumer setup)
- **Backend ↔ Mobile Apps**: Caption delivery to listeners
- **Backend ↔ Admin Dashboard**: Real-time session monitoring (optional)

#### 3. RTP/UDP (WebRTC and Plain RTP)
- **Mobile Apps ↔ mediasoup**: Audio streaming via WebRTC transports (Opus codec)
- **mediasoup ↔ STT Worker**: Audio feed via Plain RTP transport (worker creates plain-transport, then consumer)
- **mediasoup ↔ Recording Worker**: Audio feed via Plain RTP transport (same pattern)

#### 4. File System
- **Backend ↔ SQLite**: Database file access (file-based, no network protocol)
- **Recording Worker ↔ File Storage**: Audio file writes (recordings directory)
- **Backend ↔ File Storage**: Audio file reads for downloads (same Recordings.Path; no request to Recording Worker)

### Service Dependencies

```mermaid
graph LR
    BE[Backend API] -->|Depends on| MS[mediasoup]
    BE -->|Depends on| DB[(SQLite)]
    STT -->|Depends on| MS
    STT -->|Depends on| BE
    RW -->|Depends on| MS
    RW -->|Depends on| BE
    AD -->|Depends on| BE
    TA -->|Depends on| BE
    TA -->|Depends on| MS
    LA -->|Depends on| BE
    LA -->|Depends on| MS
    
    style BE fill:#ffe1f5
    style MS fill:#e1ffe1
    style DB fill:#f0f0f0
```

### Message Flow Summary

1. **Authentication Flow**: Client → Backend (REST) → JWT Token
2. **Session Creation**: Client → Backend (REST) → Session ID
3. **Signaling Flow**: Client ↔ Backend (WebSocket/SignalR) ↔ mediasoup (HTTP)
4. **Media Flow**: Client ↔ mediasoup (RTP/UDP via WebRTC); Workers ↔ mediasoup (Plain RTP)
5. **Caption Flow**: Backend → STT Worker (POST /stt/start when producer created); STT Worker → Backend (POST /api/captions) → Listeners (SignalR)
6. **Recording Flow**: Backend → Recording Worker (POST /recording/start, POST /recording/stop); Recording Worker → File Storage (writes); Recording Worker → Backend (POST /api/recordings/complete); Admin → Backend (GET /api/recordings, GET /api/recordings/{id}/download); Backend serves file from File Storage

---

## Key Architectural Decisions

### 1. **SFU Architecture (mediasoup)**
- Uses Selective Forwarding Unit (SFU) instead of MCU
- Reduces server CPU load by routing streams without transcoding
- Enables efficient one-to-many audio distribution

### 2. **Separation of Concerns**
- **Backend API**: Authentication, authorization, orchestration, state management
- **mediasoup**: Media routing only (no business logic)
- **STT Worker**: Isolated transcription processing
- **Recording Worker**: Isolated recording processing

### 3. **File-based Database (SQLite)**
- No separate database server required
- Simplified deployment
- Suitable for LAN-only, single-server deployments
- Can migrate to PostgreSQL if needed for scale

### 4. **Worker Pattern**
- STT and Recording workers are separate services
- Can scale independently
- Can restart without affecting other services
- Isolated failure domains

### 5. **Real-time Communication**
- WebSocket (SignalR) for signaling (low latency, bidirectional)
- RTP/UDP for media (low latency, optimized for real-time)
- REST API for CRUD operations (simpler, stateless)

---

*Last Updated: February 9, 2026*
