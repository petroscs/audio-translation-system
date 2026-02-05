# Real-Time Audio Translation/Broadcast System - Development Plan

## Executive Summary

This document outlines a comprehensive development plan for building a private, on-premise, real-time audio translation/broadcast system. The system enables one translator to speak into a mobile app while multiple listeners on the same local network receive translations in real-time, with optional speech-to-text captions and audio recording capabilities.

**Key Technologies:**
- **Frontend:** Flutter/React Native mobile apps
- **Backend:** C# (.NET) for signaling, auth, and orchestration
- **SFU:** mediasoup (Node.js) for WebRTC media routing
- **STT:** Whisper (local) + FFmpeg for RTP → PCM decoding
- **Recording:** FFmpeg for audio capture
- **Database:** SQLite (file-based, no server required)
- **Network:** Local network only (no cloud dependencies)

---

## Phase 1: Foundation & Infrastructure Setup (Weeks 1-3)

### Milestone 1.1: Development Environment & Project Structure

#### Tasks:
1. **Development Environment Setup**
   - Set up .NET 8 SDK and development tools
   - Install Node.js 18+ and npm/yarn
   - Set up Flutter/React Native development environment
   - SQLite is built into .NET (no separate installation needed)
   - Configure Docker for mediasoup, Whisper, and FFmpeg services
   - Set up Git repository and branching strategy

2. **Project Structure Creation**
   ```
   audio-translation-system/
   ├── backend/              # C# .NET backend
   │   ├── Api/             # Web API controllers
   │   ├── Services/        # Business logic
   │   ├── Models/          # Data models
   │   ├── Infrastructure/  # Database, WebSocket handlers
   │   └── SignalR/         # Real-time signaling
   ├── mediasoup-service/   # Node.js mediasoup SFU
   ├── stt-worker/          # Whisper + FFmpeg STT service
   ├── recording-worker/    # FFmpeg recording service
   ├── mobile-translator/   # Translator mobile app
   ├── mobile-listener/     # Listener mobile app
   ├── admin-dashboard/     # Web admin dashboard
   ├── database/            # SQLite database and migrations
   └── deployment/          # Docker compose, scripts
   ```

3. **Database Schema Design**
   - Design ERD for all entities
   - Create initial migration scripts
   - SQLite connection configuration (file-based, no pooling needed)

**Deliverables:**
- ✅ Development environment configured
- ✅ Project structure created
- ✅ Database schema designed and documented
- ✅ Docker Compose file for local development

---

### Milestone 1.2: Database Schema Implementation

#### Tasks:
1. **Core Tables**
   - `users` (id, username, email, role, password_hash, created_at, updated_at)
   - `events` (id, name, description, start_time, end_time, status, created_by)
   - `channels` (id, event_id, name, language_code, created_at)
   - `sessions` (id, user_id, event_id, channel_id, role, started_at, ended_at, status)
   - `producers` (id, session_id, mediasoup_producer_id, kind, rtp_parameters, created_at)
   - `consumers` (id, session_id, mediasoup_consumer_id, producer_id, kind, rtp_parameters, created_at)
   - `recordings` (id, session_id, file_path, duration_seconds, started_at, ended_at, status)
   - `captions` (id, session_id, text, timestamp, confidence, created_at)
   - `transports` (id, session_id, mediasoup_transport_id, direction, ice_parameters, dtls_parameters, created_at)

2. **Indexes & Constraints**
   - Foreign key constraints
   - Indexes on frequently queried columns (session_id, event_id, user_id)
   - Unique constraints where appropriate

3. **Seed Data**
   - Admin user creation script
   - Test event/channel data

**Deliverables:**
- ✅ SQLite schema implemented
- ✅ Migration scripts created
- ✅ Database connection tested
- ✅ Entity Framework Core models configured (SQLite provider)

---

## Phase 2: Backend Core Services (Weeks 4-7)

### Milestone 2.1: Authentication & Authorization

#### Tasks:
1. **User Authentication**
   - JWT token generation and validation
   - Password hashing (bcrypt/Argon2)
   - Login endpoint (`POST /api/auth/login`)
   - Token refresh mechanism
   - Role-based access control (Admin, Translator, Listener)

2. **Authorization Middleware**
   - JWT validation middleware
   - Role-based authorization attributes
   - Permission checks for API endpoints

3. **User Management API**
   - `GET /api/users` - List users (admin only)
   - `POST /api/users` - Create user (admin only)
   - `GET /api/users/{id}` - Get user details
   - `PUT /api/users/{id}` - Update user
   - `DELETE /api/users/{id}` - Delete user

**Deliverables:**
- ✅ Authentication system working
- ✅ JWT tokens issued and validated
- ✅ Role-based access control implemented
- ✅ User management API endpoints tested

---

### Milestone 2.2: Event & Channel Management

#### Tasks:
1. **Event Management API**
   - `GET /api/events` - List events
   - `POST /api/events` - Create event (admin/translator)
   - `GET /api/events/{id}` - Get event details
   - `PUT /api/events/{id}` - Update event
   - `DELETE /api/events/{id}` - Delete event
   - `POST /api/events/{id}/start` - Start event
   - `POST /api/events/{id}/stop` - Stop event

2. **Channel Management API**
   - `GET /api/events/{eventId}/channels` - List channels for event
   - `POST /api/events/{eventId}/channels` - Create channel
   - `GET /api/channels/{id}` - Get channel details
   - `PUT /api/channels/{id}` - Update channel
   - `DELETE /api/channels/{id}` - Delete channel

3. **Session Management**
   - `POST /api/sessions` - Create session (join event/channel)
   - `GET /api/sessions/{id}` - Get session details
   - `PUT /api/sessions/{id}/end` - End session
   - `GET /api/sessions` - List active sessions

**Deliverables:**
- ✅ Event management API complete
- ✅ Channel management API complete
- ✅ Session management working
- ✅ API documentation (Swagger/OpenAPI)

---

### Milestone 2.3: WebSocket Signaling Server

#### Tasks:
1. **WebSocket Infrastructure**
   - Set up SignalR hub or raw WebSocket server
   - Connection management (connect, disconnect, reconnect)
   - Client authentication over WebSocket
   - Heartbeat/ping-pong mechanism

2. **Signaling Protocol Design**
   ```json
   // Client → Server
   {
     "type": "createTransport",
     "direction": "send" | "receive",
     "sessionId": "uuid"
   }
   
   {
     "type": "connectTransport",
     "transportId": "uuid",
     "dtlsParameters": {...}
   }
   
   {
     "type": "produce",
     "transportId": "uuid",
     "kind": "audio",
     "rtpParameters": {...}
   }
   
   {
     "type": "consume",
     "transportId": "uuid",
     "producerId": "uuid"
   }
   
   // Server → Client
   {
     "type": "transportCreated",
     "transportId": "uuid",
     "iceParameters": {...},
     "dtlsParameters": {...}
   }
   
   {
     "type": "producerCreated",
     "producerId": "uuid"
   }
   
   {
     "type": "consumerCreated",
     "consumerId": "uuid",
     "producerId": "uuid",
     "rtpParameters": {...}
   }
   
   {
     "type": "caption",
     "text": "translated text",
     "timestamp": 1234567890
   }
   ```

3. **WebSocket Message Handlers**
   - Transport creation handler
   - Transport connection handler
   - Producer creation handler
   - Consumer creation handler
   - Error handling and validation

**Deliverables:**
- ✅ WebSocket server running
- ✅ Signaling protocol documented
- ✅ Connection management working
- ✅ Message handlers implemented

---

## Phase 3: mediasoup SFU Service (Weeks 8-10)

### Milestone 3.1: mediasoup Server Setup

#### Tasks:
1. **mediasoup Service Initialization**
   - Create Node.js service with mediasoup
   - Configure mediasoup worker processes
   - Set up router creation per channel/event
   - Configure RTP codecs (Opus for audio)
   - Set up ICE servers (STUN only, no TURN needed for LAN)

2. **mediasoup API Endpoints**
   - `POST /mediasoup/worker/create` - Create worker
   - `POST /mediasoup/router/create` - Create router for channel
   - `POST /mediasoup/transport/create` - Create transport
   - `POST /mediasoup/transport/connect` - Connect transport
   - `POST /mediasoup/producer/create` - Create producer
   - `POST /mediasoup/consumer/create` - Create consumer
   - `GET /mediasoup/router/{id}/stats` - Get router stats

3. **Transport Management**
   - WebRTC transport creation (send/receive)
   - ICE candidate handling
   - DTLS handshake management
   - Transport state tracking

**Deliverables:**
- ✅ mediasoup service running
- ✅ Router creation working
- ✅ Transport creation API functional
- ✅ Basic WebRTC connection established

---

### Milestone 3.2: Producer & Consumer Management

#### Tasks:
1. **Producer Management**
   - Handle producer creation from translator
   - Store producer RTP parameters
   - Track active producers per router
   - Handle producer close events

2. **Consumer Management**
   - Create consumers for listeners
   - Create consumers for STT worker
   - Create consumers for recording worker
   - Manage consumer RTP parameters
   - Handle consumer close events

3. **RTP Stream Routing**
   - Route audio from translator to all listeners
   - Route audio to STT worker
   - Route audio to recording worker
   - Handle multiple simultaneous channels

**Deliverables:**
- ✅ Producer creation working
- ✅ Consumer creation working
- ✅ Audio routing functional
- ✅ Multiple consumers per producer supported

---

### Milestone 3.3: mediasoup-Backend Integration

#### Tasks:
1. **mediasoup Client Library Integration**
   - Integrate mediasoup-client in C# backend (via HTTP API or gRPC)
   - Create mediasoup service wrapper in C#
   - Handle mediasoup events (producer close, consumer close, etc.)

2. **State Synchronization**
   - Sync mediasoup state with SQLite database
   - Store producer/consumer IDs in database
   - Handle mediasoup service restarts gracefully

3. **Error Handling & Recovery**
   - Handle mediasoup worker crashes
   - Recreate routers on failure
   - Reconnect transports on network issues

**Deliverables:**
- ✅ Backend integrated with mediasoup
- ✅ State synchronized between services
- ✅ Error handling implemented
- ✅ Service restart recovery working

---

## Phase 4: Mobile Applications (Weeks 11-16)

### Milestone 4.1: Translator Mobile App - Core Features

#### Tasks:
1. **Project Setup**
   - Initialize Flutter project for translator app
   - Set up project structure (`lib/` modules for auth, events, sessions, signaling, webrtc, ui)
   - Configure WebRTC library (`flutter_webrtc`)
   - Set up SignalR client (`signalr_core` or equivalent)
   - Add secure storage + HTTP client dependencies

2. **Authentication UI**
   - Login screen
   - Token storage (secure storage)
   - Auto-login on app start
   - Logout functionality
   - Token refresh on 401 via `/api/auth/refresh`

3. **Event & Channel Selection**
   - List available events
   - Select event and channel
   - Display active sessions
   - Join as translator
   - Persist selected `eventId`, `channelId`, `sessionId`

4. **Audio Capture & WebRTC**
   - Request microphone permissions
   - Capture audio stream from device microphone
   - Create WebRTC peer connection
   - SignalR flow: `CreateTransport` (send), `ConnectTransport`, `Produce`
   - Handle ICE candidates and DTLS parameters from backend
   - Map mediasoup transport/producers to local state

5. **UI/UX**
   - Translator dashboard (event info, channel info, status)
   - Start/stop translation button
   - Audio level indicator
   - Connection status indicator
   - Error handling and user feedback

**Deliverables:**
- ✅ Translator app builds and runs
- ✅ Authentication working
- ✅ Event/channel selection working
- ✅ Audio capture and WebRTC connection established
- ✅ Audio streaming to mediasoup working

---

### Milestone 4.2: Listener Mobile App - Core Features

#### Tasks:
1. **Project Setup**
   - Initialize Flutter project (separate app or shared package)
   - Set up WebRTC library (`flutter_webrtc`)
   - Set up SignalR client (`signalr_core` or equivalent)

2. **Authentication & Event Selection**
   - Login screen
   - List available events
   - Select event and channel
   - Join as listener
   - Persist selected `eventId`, `channelId`, `sessionId`

3. **Audio Reception & WebRTC**
   - Create WebRTC peer connection
   - SignalR flow: `CreateTransport` (receive), `ConnectTransport`, `Consume`
   - Play received audio stream
   - Handle ICE candidates and DTLS parameters from backend

4. **Caption Display (Optional)**
   - WebSocket subscription for captions
   - Display captions overlay
   - Caption history/scroll
   - Toggle captions on/off

5. **UI/UX**
   - Listener dashboard (event info, channel info, active translator)
   - Audio playback controls (volume, mute)
   - Caption display area
   - Connection status indicator
   - Listener count display

**Deliverables:**
- ✅ Listener app builds and runs
   - ✅ Authentication working
   - ✅ Event/channel selection working
   - ✅ Audio reception and playback working
   - ✅ Caption display functional (if enabled)

---

### Milestone 4.3: Mobile App Polish & Error Handling

#### Tasks:
1. **Error Handling**
   - Network error handling
   - WebRTC connection failures
   - Graceful reconnection logic
   - User-friendly error messages
   - Retry signaling steps on transient errors

2. **Offline Handling**
   - Detect network connectivity
   - Show offline status
   - Queue actions when offline
   - Auto-reconnect when online

3. **Performance Optimization**
   - Optimize audio codec settings
   - Reduce battery consumption
   - Optimize UI rendering
   - Memory leak prevention

4. **Testing**
   - Unit tests for business logic
   - Integration tests for signaling + WebRTC sequence (mock backend)
   - UI tests for critical flows (login, join, start/stop, playback)
   - Device testing (iOS, Android) on real hardware

**Deliverables:**
- ✅ Robust error handling
- ✅ Offline support
- ✅ Performance optimized
- ✅ Test coverage adequate

### Phase 4 Signaling & WebRTC Flow (Flutter)

#### Translator (Send)
1. Login -> obtain JWT
2. REST: create session (`POST /api/sessions`)
3. SignalR connect to `/ws/signaling?access_token={JWT}`
4. `CreateTransport` with `direction: Send`
5. `ConnectTransport` with DTLS parameters from local peer
6. `Produce` with audio RTP parameters from `flutter_webrtc`

#### Listener (Receive)
1. Login -> obtain JWT
2. REST: create session (`POST /api/sessions`)
3. SignalR connect to `/ws/signaling?access_token={JWT}`
4. `CreateTransport` with `direction: Receive`
5. `ConnectTransport` with DTLS parameters from local peer
6. `Consume` with producer ID -> attach remote audio track

**Notes:**
- On reconnect, re-create transports and producers/consumers.
- Cache `eventId`, `channelId`, `sessionId` for resume flows.

### Phase 4 Open Decisions
- Separate translator/listener apps vs single app with role switch
- State management choice (Provider vs Riverpod)

---

## Phase 5: STT Worker Service (Weeks 17-19)

### Milestone 5.1: STT Worker Setup

#### Tasks:
1. **FFmpeg RTP Decoder**
   - Set up FFmpeg to receive RTP stream from mediasoup
   - Decode RTP to PCM (16kHz, 16-bit, mono)
   - Handle RTP packet loss and reordering
   - Buffer management for continuous audio

2. **Whisper Integration**
   - Install Whisper (local model, e.g., base or small)
   - Set up Whisper API or CLI wrapper
   - Configure audio preprocessing (normalization, VAD if needed)
   - Process PCM audio chunks through Whisper

3. **STT Worker Service**
   - Create Node.js/Python service for STT worker
   - Connect to mediasoup as consumer
   - Receive RTP stream
   - Decode to PCM using FFmpeg
   - Feed PCM to Whisper
   - Extract transcription text and timestamps

**Deliverables:**
- ✅ FFmpeg RTP decoder working
- ✅ Whisper integration functional
- ✅ STT worker service running
- ✅ Transcription accuracy tested

---

### Milestone 5.2: Caption Pipeline Integration

#### Tasks:
1. **Caption Processing**
   - Extract text and timestamps from Whisper output
   - Format captions (punctuation, capitalization)
   - Handle partial results and final results
   - Language detection (if multi-language support needed)

2. **Backend Integration**
   - Send captions to backend via WebSocket/HTTP API
   - Include session ID, timestamp, confidence score
   - Handle caption queue/batching if needed

3. **Real-time Caption Delivery**
   - Backend receives captions from STT worker
   - Broadcast captions to all listeners in session
   - Store captions in database
   - Handle caption timing synchronization

**Deliverables:**
- ✅ Caption processing working
- ✅ Backend integration complete
- ✅ Real-time caption delivery to listeners
- ✅ Caption storage in database

---

### Milestone 5.3: STT Optimization & Multi-Channel Support

#### Tasks:
1. **Performance Optimization**
   - Optimize Whisper model size vs. accuracy trade-off
   - Implement audio buffering strategy
   - Reduce latency (streaming vs. batch processing)
   - Handle multiple simultaneous sessions

2. **Multi-Channel Support**
   - Support multiple STT workers for scale
   - Load balancing across STT workers
   - Channel-to-worker assignment logic

3. **Error Handling**
   - Handle Whisper crashes
   - Handle FFmpeg errors
   - Graceful degradation (continue without captions)
   - Logging and monitoring

**Deliverables:**
- ✅ Optimized STT performance
- ✅ Multi-channel support working
- ✅ Error handling robust
- ✅ Monitoring and logging in place

---

## Phase 6: Recording Worker Service (Weeks 20-21)

### Milestone 6.1: Recording Worker Setup

#### Tasks:
1. **FFmpeg Recording Setup**
   - Set up FFmpeg to receive RTP stream from mediasoup
   - Decode RTP to audio format (WAV or Opus)
   - Configure audio quality settings
   - Handle RTP packet loss

2. **Recording Worker Service**
   - Create Node.js service for recording worker
   - Connect to mediasoup as consumer
   - Receive RTP stream per session
   - Record audio to local storage
   - Generate unique filenames per session

3. **File Management**
   - Create directory structure for recordings
   - Store recordings with metadata (session_id, timestamp, duration)
   - Handle file write errors
   - Implement file rotation if needed

**Deliverables:**
- ✅ Recording worker service running
- ✅ Audio recording to local storage working
- ✅ File management implemented
- ✅ Recording metadata stored

---

### Milestone 6.2: Recording Management & API

#### Tasks:
1. **Recording Control**
   - Start recording on session start
   - Stop recording on session end
   - Pause/resume recording (if needed)
   - Handle session interruptions

2. **Recording API**
   - `GET /api/recordings` - List recordings
   - `GET /api/recordings/{id}` - Get recording details
   - `GET /api/recordings/{id}/download` - Download recording file
   - `DELETE /api/recordings/{id}` - Delete recording
   - `GET /api/sessions/{sessionId}/recording` - Get recording for session

3. **Database Integration**
   - Store recording metadata in SQLite database
   - Link recordings to sessions
   - Track recording status (in_progress, completed, failed)
   - Store file path and duration

**Deliverables:**
- ✅ Recording control working
- ✅ Recording API endpoints complete
- ✅ Database integration working
- ✅ File download functional

---

## Phase 7: Admin Dashboard (Weeks 22-24)

### Milestone 7.1: Admin Dashboard - Core Features

#### Tasks:
1. **Project Setup**
   - Choose framework (React, Vue, or Blazor)
   - Set up project structure
   - Configure API client
   - Set up authentication

2. **Dashboard UI**
   - Login page
   - Main dashboard (overview stats)
   - Navigation menu
   - Responsive design

3. **User Management**
   - List users table
   - Create/edit/delete users
   - Role assignment
   - User search and filtering

4. **Event Management**
   - List events table
   - Create/edit/delete events
   - Event status management
   - Event details view

5. **Channel Management**
   - List channels per event
   - Create/edit/delete channels
   - Channel configuration

**Deliverables:**
- ✅ Admin dashboard running
- ✅ User management UI complete
- ✅ Event management UI complete
- ✅ Channel management UI complete

---

### Milestone 7.2: Admin Dashboard - Advanced Features

#### Tasks:
1. **Session Monitoring**
   - Real-time session list
   - Active translator/listener counts
   - Session details view
   - Session termination capability

2. **Recording Management**
   - List all recordings
   - Filter by event, channel, date
   - Playback preview (if possible)
   - Download recordings
   - Delete recordings

3. **Analytics & Reporting**
   - Event statistics (duration, participants)
   - Recording statistics
   - User activity logs
   - System health metrics

4. **System Configuration**
   - mediasoup configuration
   - STT worker configuration
   - Recording settings
   - Network settings

**Deliverables:**
- ✅ Session monitoring working
- ✅ Recording management complete
- ✅ Analytics dashboard functional
- ✅ System configuration UI complete

---

## Phase 8: Integration & Testing (Weeks 25-27)

### Milestone 8.1: End-to-End Integration

#### Tasks:
1. **Full System Integration**
   - Connect all components together
   - Test translator → mediasoup → listeners flow
   - Test STT worker integration
   - Test recording worker integration
   - Test admin dashboard integration

2. **API Integration Testing**
   - Test all API endpoints
   - Test WebSocket signaling flow
   - Test error scenarios
   - Test concurrent users

3. **Cross-Component Testing**
   - Test mobile apps with backend
   - Test backend with mediasoup
   - Test STT worker with mediasoup
   - Test recording worker with mediasoup

**Deliverables:**
- ✅ All components integrated
- ✅ End-to-end flow working
- ✅ Integration tests passing
- ✅ Error scenarios handled

---

### Milestone 8.2: Performance & Load Testing

#### Tasks:
1. **Load Testing**
   - Test with 10 concurrent translators
   - Test with 100 concurrent listeners
   - Test with multiple channels simultaneously
   - Measure latency (audio, captions)
   - Measure CPU/memory usage

2. **Network Testing**
   - Test on different LAN configurations
   - Test with network latency simulation
   - Test packet loss scenarios
   - Test bandwidth limitations

3. **Stress Testing**
   - Test system limits (max users, channels)
   - Test service restarts under load
   - Test database connection pool limits
   - Test mediasoup worker limits

**Deliverables:**
- ✅ Load testing completed
- ✅ Performance benchmarks documented
- ✅ System limits identified
- ✅ Optimization recommendations

---

### Milestone 8.3: Security Testing

#### Tasks:
1. **Authentication & Authorization Testing**
   - Test JWT token validation
   - Test role-based access control
   - Test session hijacking prevention
   - Test password security

2. **Network Security Testing**
   - Verify LAN-only access (no external exposure)
   - Test WebSocket security
   - Test DTLS/TLS encryption
   - Test input validation and SQL injection prevention

3. **Data Security**
   - Test recording file access controls
   - Test database access controls
   - Test sensitive data encryption
   - Test audit logging

**Deliverables:**
- ✅ Security testing completed
- ✅ Vulnerabilities identified and fixed
- ✅ Security best practices implemented
- ✅ Security documentation updated

---

## Phase 9: Deployment & Infrastructure (Weeks 28-29)

### Milestone 9.1: Deployment Configuration

#### Tasks:
1. **Docker Configuration**
   - Create Dockerfile for each service
   - Create Docker Compose file for entire system
   - Configure service networking
   - Configure volume mounts (recordings, database)

2. **Environment Configuration**
   - Create environment variable templates
   - Configure service URLs and ports
   - Configure database connection strings
   - Configure mediasoup settings

3. **Deployment Scripts**
   - Create startup scripts
   - Create shutdown scripts
   - Create backup scripts
   - Create update/migration scripts

**Deliverables:**
- ✅ Docker configuration complete
- ✅ Environment configuration documented
- ✅ Deployment scripts created
- ✅ System deployable via Docker Compose

---

### Milestone 9.2: Infrastructure Setup

#### Tasks:
1. **Server Requirements**
   - Document hardware requirements
   - Document network requirements
   - Document port requirements
   - Document storage requirements

2. **Network Configuration**
   - Document LAN setup
   - Document firewall rules
   - Document DNS/hostname configuration
   - Document mobile app network discovery

3. **Monitoring & Logging**
   - Set up logging aggregation
   - Set up health check endpoints
   - Set up monitoring dashboards (optional)
   - Set up alerting (optional)

**Deliverables:**
- ✅ Infrastructure documentation complete
- ✅ Network configuration documented
- ✅ Monitoring setup complete
- ✅ Deployment guide created

---

## Phase 10: Documentation & Finalization (Week 30)

### Milestone 10.1: Documentation

#### Tasks:
1. **Technical Documentation**
   - Architecture documentation
   - API documentation (OpenAPI/Swagger)
   - Database schema documentation
   - Deployment guide
   - Troubleshooting guide

2. **User Documentation**
   - Translator app user guide
   - Listener app user guide
   - Admin dashboard user guide
   - System administrator guide

3. **Developer Documentation**
   - Setup guide for new developers
   - Code style guide
   - Testing guide
   - Contributing guide

**Deliverables:**
- ✅ Technical documentation complete
- ✅ User documentation complete
- ✅ Developer documentation complete

---

### Milestone 10.2: Final Testing & Acceptance

#### Tasks:
1. **Acceptance Testing**
   - Test all acceptance criteria
   - Test user workflows end-to-end
   - Test edge cases
   - Test error recovery

2. **Performance Validation**
   - Validate performance benchmarks
   - Validate system capacity
   - Validate latency requirements

3. **Security Validation**
   - Final security review
   - Penetration testing (if applicable)
   - Compliance check (if applicable)

**Deliverables:**
- ✅ Acceptance testing passed
- ✅ Performance validated
- ✅ Security validated
- ✅ System ready for production

---

## API & Signaling Milestones

### API Endpoints Summary

#### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh token
- `POST /api/auth/logout` - User logout

#### Users
- `GET /api/users` - List users (admin)
- `POST /api/users` - Create user (admin)
- `GET /api/users/{id}` - Get user
- `PUT /api/users/{id}` - Update user
- `DELETE /api/users/{id}` - Delete user

#### Events
- `GET /api/events` - List events
- `POST /api/events` - Create event
- `GET /api/events/{id}` - Get event
- `PUT /api/events/{id}` - Update event
- `DELETE /api/events/{id}` - Delete event
- `POST /api/events/{id}/start` - Start event
- `POST /api/events/{id}/stop` - Stop event

#### Channels
- `GET /api/events/{eventId}/channels` - List channels
- `POST /api/events/{eventId}/channels` - Create channel
- `GET /api/channels/{id}` - Get channel
- `PUT /api/channels/{id}` - Update channel
- `DELETE /api/channels/{id}` - Delete channel

#### Sessions
- `POST /api/sessions` - Create session
- `GET /api/sessions/{id}` - Get session
- `PUT /api/sessions/{id}/end` - End session
- `GET /api/sessions` - List sessions

#### Recordings
- `GET /api/recordings` - List recordings
- `GET /api/recordings/{id}` - Get recording
- `GET /api/recordings/{id}/download` - Download recording
- `DELETE /api/recordings/{id}` - Delete recording

#### Captions
- `GET /api/sessions/{sessionId}/captions` - Get captions for session
- `WebSocket: caption` - Real-time caption stream

### WebSocket Signaling Protocol

#### Client → Server Messages

**createTransport**
```json
{
  "type": "createTransport",
  "direction": "send" | "receive",
  "sessionId": "uuid"
}
```

**connectTransport**
```json
{
  "type": "connectTransport",
  "transportId": "uuid",
  "dtlsParameters": {
    "fingerprints": [...],
    "role": "auto"
  }
```

**produce**
```json
{
  "type": "produce",
  "transportId": "uuid",
  "kind": "audio",
  "rtpParameters": {...}
}
```

**consume**
```json
{
  "type": "consume",
  "transportId": "uuid",
  "producerId": "uuid"
}
```

**resumeConsumer**
```json
{
  "type": "resumeConsumer",
  "consumerId": "uuid"
}
```

#### Server → Client Messages

**transportCreated**
```json
{
  "type": "transportCreated",
  "transportId": "uuid",
  "iceParameters": {...},
  "dtlsParameters": {...}
}
```

**producerCreated**
```json
{
  "type": "producerCreated",
  "producerId": "uuid"
}
```

**consumerCreated**
```json
{
  "type": "consumerCreated",
  "consumerId": "uuid",
  "producerId": "uuid",
  "kind": "audio",
  "rtpParameters": {...}
}
```

**caption**
```json
{
  "type": "caption",
  "sessionId": "uuid",
  "text": "translated text",
  "timestamp": 1234567890,
  "confidence": 0.95
}
```

**error**
```json
{
  "type": "error",
  "code": "ERROR_CODE",
  "message": "Error description"
}
```

---

## Infrastructure & Deployment Plan

### Server Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Local Network (LAN)                  │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   Mobile     │  │   Mobile     │  │   Mobile     │ │
│  │  Translator  │  │   Listener   │  │   Listener   │ │
│  │     App      │  │     App      │  │     App      │ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘ │
│         │                  │                  │         │
│         └──────────────────┼──────────────────┘         │
│                            │                            │
│         ┌──────────────────▼──────────────────┐         │
│         │     C# Backend (.NET)               │         │
│         │  - Web API (REST)                   │         │
│         │  - WebSocket (SignalR)              │         │
│         │  - Port: 5000 (HTTP), 5001 (HTTPS)  │         │
│         └──────┬──────────────┬───────────────┘         │
│                │              │                          │
│    ┌───────────┘              └───────────┐             │
│    │                                      │             │
│    ▼                                      ▼             │
│  ┌──────────────┐              ┌──────────────┐         │
│  │   SQLite     │              │  mediasoup   │         │
│  │   Database   │              │   Service    │         │
│  │  (file-based)│              │  Port: 4000  │         │
│  └──────────────┘              └──────┬───────┘         │
│                                       │                 │
│                    ┌──────────────────┼──────────────────┐
│                    │                  │                  │
│                    ▼                  ▼                  ▼
│              ┌──────────┐      ┌──────────┐      ┌──────────┐
│              │   STT    │      │Recording │      │  Admin   │
│              │  Worker  │      │  Worker  │      │Dashboard │
│              │ Port:    │      │ Port:    │      │ Port:    │
│              │  5002    │      │  5003    │      │  3000    │
│              └──────────┘      └──────────┘      └──────────┘
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Port Configuration

| Service | Port | Protocol | Description |
|---------|------|----------|-------------|
| C# Backend API | 5000 | HTTP | REST API |
| C# Backend API | 5001 | HTTPS | REST API (if TLS enabled) |
| C# Backend WebSocket | 5000/5001 | WebSocket | SignalR/WebSocket |
| SQLite Database | N/A | File-based | No port needed |
| mediasoup Service | 4000 | HTTP | mediasoup API |
| mediasoup RTP | 10000-10100 | UDP | RTP media |
| STT Worker | 5002 | HTTP | STT worker API |
| Recording Worker | 5003 | HTTP | Recording worker API |
| Admin Dashboard | 3000 | HTTP | Web dashboard |

### Hardware Requirements

#### Minimum Requirements (Small Deployment)
- **Server:** 4 CPU cores, 8GB RAM, 100GB storage
- **Network:** Gigabit Ethernet
- **Database:** SQLite (file-based, no separate server needed)

#### Recommended Requirements (Medium Deployment)
- **Server:** 8 CPU cores, 16GB RAM, 500GB storage
- **Network:** Gigabit Ethernet
- **Database:** SQLite (file-based, stored on fast SSD)

#### Production Requirements (Large Deployment)
- **Backend Server:** 8+ CPU cores, 32GB RAM
- **mediasoup Server:** 8+ CPU cores, 16GB RAM
- **Database:** SQLite on fast SSD (or migrate to PostgreSQL if concurrent writes become a bottleneck)
- **STT Worker Server:** 8+ CPU cores, 16GB RAM (CPU-intensive)
- **Network:** Gigabit Ethernet, low latency
- **Storage:** 1TB+ for recordings and database

### Docker Compose Structure

```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "5000:5000"
      - "5001:5001"
    environment:
      - ConnectionStrings__DefaultConnection=Data Source=/data/audio_translation.db
      - Mediasoup__ApiUrl=http://mediasoup:4000
    volumes:
      - db_data:/data  # SQLite database file storage
    depends_on:
      - mediasoup

  mediasoup:
    build: ./mediasoup-service
    ports:
      - "4000:4000"
      - "10000-10100:10000-10100/udp"
    environment:
      - MEDIASOUP_ANNOUNCED_IP=${SERVER_IP}

  stt-worker:
    build: ./stt-worker
    ports:
      - "5002:5002"
    environment:
      - MEDIASOUP_API_URL=http://mediasoup:4000
      - BACKEND_API_URL=http://backend:5000
    depends_on:
      - mediasoup
      - backend

  recording-worker:
    build: ./recording-worker
    ports:
      - "5003:5003"
    volumes:
      - recordings:/recordings
    environment:
      - MEDIASOUP_API_URL=http://mediasoup:4000
      - BACKEND_API_URL=http://backend:5000
    depends_on:
      - mediasoup
      - backend

  admin-dashboard:
    build: ./admin-dashboard
    ports:
      - "3000:3000"
    environment:
      - REACT_APP_API_URL=http://localhost:5000
    depends_on:
      - backend

volumes:
  db_data:  # SQLite database file storage
  recordings:
```

### Network Configuration

1. **LAN Setup**
   - All devices on same subnet (e.g., 192.168.1.0/24)
   - No external internet required (except for initial app downloads)
   - Static IP for server recommended

2. **Firewall Rules**
   - Allow TCP: 5000, 5001, 4000, 5002, 5003, 3000
   - Allow UDP: 10000-10100 (RTP)
   - Block all external access
   - Note: SQLite doesn't require a network port (file-based)

3. **Mobile App Discovery**
   - Option 1: Hardcode server IP/URL in app
   - Option 2: mDNS/Bonjour for automatic discovery
   - Option 3: QR code scanning for server URL

---

## Testing Strategy

### Unit Testing

#### Backend (C#)
- **Coverage Target:** 80%+
- **Frameworks:** xUnit, Moq, FluentAssertions
- **Test Areas:**
  - Authentication/authorization logic
  - Business logic services
  - Data access layer
  - WebSocket message handlers

#### Mobile Apps
- **Coverage Target:** 70%+
- **Frameworks:** Flutter: flutter_test, React Native: Jest
- **Test Areas:**
  - Business logic
  - State management
  - API client
  - WebRTC wrapper logic

#### mediasoup Service
- **Coverage Target:** 70%+
- **Frameworks:** Jest, Mocha
- **Test Areas:**
  - Router management
  - Transport creation
  - Producer/consumer management
  - Error handling

### Integration Testing

#### API Integration Tests
- Test all REST API endpoints
- Test authentication flows
- Test CRUD operations
- Test error scenarios

#### WebSocket Integration Tests
- Test signaling protocol
- Test connection/disconnection
- Test message handling
- Test error recovery

#### Database Integration Tests
- Test database migrations
- Test data persistence
- Test transactions
- Test concurrent access

### WebRTC Testing

#### Connection Testing
- Test translator → mediasoup connection
- Test mediasoup → listener connection
- Test ICE candidate exchange
- Test DTLS handshake

#### Audio Quality Testing
- Test audio latency (< 500ms target)
- Test audio quality (Opus codec)
- Test packet loss handling
- Test network jitter handling

#### Multi-User Testing
- Test multiple translators simultaneously
- Test multiple listeners per translator
- Test channel switching
- Test concurrent sessions

### Load Testing

#### Tools
- **Backend API:** k6, Apache JMeter, or custom scripts
- **WebSocket:** Artillery, custom WebSocket load tester
- **WebRTC:** mediasoup load testing tools

#### Test Scenarios
1. **Baseline:** 1 translator, 10 listeners
2. **Medium:** 5 translators, 50 listeners
3. **High:** 10 translators, 100 listeners
4. **Stress:** 20 translators, 200 listeners

#### Metrics to Measure
- API response time (p50, p95, p99)
- WebSocket message latency
- Audio latency (end-to-end)
- CPU usage per service
- Memory usage per service
- Network bandwidth usage
- Database query performance
- Error rates

### End-to-End Testing

#### Test Scenarios
1. **Happy Path:** Translator starts → Listeners join → Audio flows → Captions appear → Recording starts → Session ends → Recording available
2. **Error Recovery:** Network interruption → Reconnection → Audio resumes
3. **Multi-Channel:** Multiple events/channels active simultaneously
4. **Admin Operations:** Create event → Assign translator → Monitor session → Download recording

#### Tools
- **Mobile Apps:** Appium, Detox (React Native), or Flutter Driver
- **Web Dashboard:** Selenium, Playwright, or Cypress
- **Manual Testing:** Test scripts and checklists

---

## Security Considerations

### Authentication & Authorization

1. **JWT Tokens**
   - Use RS256 or HS256 with strong secret
   - Short expiration time (15-30 minutes)
   - Refresh token mechanism
   - Token revocation on logout

2. **Password Security**
   - Bcrypt or Argon2 hashing
   - Minimum password requirements
   - Password reset mechanism
   - Account lockout after failed attempts

3. **Role-Based Access Control**
   - Admin: Full system access
   - Translator: Create events, start sessions
   - Listener: Join sessions, view captions

### Network Security

1. **LAN-Only Access**
   - No external ports exposed
   - Firewall rules to block external access
   - Network segmentation if needed
   - VPN access for remote admins (if required)

2. **Encryption**
   - HTTPS/TLS for API (if enabled)
   - DTLS for WebRTC media
   - Encrypted WebSocket (WSS) for signaling
   - Database connection encryption

3. **Input Validation**
   - Validate all API inputs
   - Sanitize user inputs
   - SQL injection prevention (parameterized queries)
   - XSS prevention in admin dashboard

### Data Security

1. **Recording Storage**
   - Secure file permissions
   - Access control for recordings
   - Encryption at rest (optional)
   - Backup and recovery procedures

2. **Database Security**
   - Secure file permissions on SQLite database file
   - Regular backups of database file
   - Backup encryption
   - Consider database file encryption (SQLCipher) for sensitive data

3. **Audit Logging**
   - Log all authentication attempts
   - Log admin actions
   - Log session creation/termination
   - Log recording access

### Application Security

1. **Dependency Management**
   - Regular dependency updates
   - Vulnerability scanning (npm audit, NuGet audit)
   - Keep dependencies minimal

2. **Error Handling**
   - Don't expose internal errors to clients
   - Log errors securely
   - Rate limiting on API endpoints
   - DDoS protection (if applicable)

3. **Session Management**
   - Secure session storage
   - Session timeout
   - Concurrent session limits
   - Session invalidation on logout

---

## Final Deliverables & Acceptance Criteria

### Deliverables

1. **Source Code**
   - Complete source code for all components
   - Version controlled (Git)
   - Code documentation
   - Build scripts

2. **Deployment Artifacts**
   - Docker images for all services
   - Docker Compose configuration
   - Deployment scripts
   - Environment configuration templates

3. **Documentation**
   - Architecture documentation
   - API documentation
   - User guides (translator, listener, admin)
   - Developer setup guide
   - Deployment guide
   - Troubleshooting guide

4. **Database**
   - Database schema
   - Migration scripts
   - Seed data scripts

5. **Mobile Applications**
   - Translator app (iOS/Android)
   - Listener app (iOS/Android)
   - App distribution instructions

6. **Admin Dashboard**
   - Web-based admin dashboard
   - Accessible via browser

### Acceptance Criteria

#### Functional Requirements

1. **Authentication**
   - ✅ Users can log in with username/password
   - ✅ JWT tokens are issued and validated
   - ✅ Role-based access control works
   - ✅ Users can log out

2. **Event & Channel Management**
   - ✅ Admins can create/edit/delete events
   - ✅ Admins can create/edit/delete channels
   - ✅ Events can be started/stopped
   - ✅ Events list is accessible to users

3. **Real-Time Audio Translation**
   - ✅ Translator can start a session
   - ✅ Translator audio is captured and streamed
   - ✅ Listeners can join a session
   - ✅ Listeners receive audio in real-time (< 500ms latency)
   - ✅ Multiple listeners can join simultaneously
   - ✅ Audio quality is acceptable (Opus codec)

4. **Speech-to-Text Captions**
   - ✅ STT worker processes audio
   - ✅ Captions are generated in real-time
   - ✅ Captions are delivered to listeners
   - ✅ Captions can be toggled on/off
   - ✅ Caption accuracy is acceptable (> 85% WER)

5. **Audio Recording**
   - ✅ Recording starts automatically with session
   - ✅ Recording stops when session ends
   - ✅ Recordings are stored locally
   - ✅ Recordings can be downloaded via API
   - ✅ Recording metadata is stored in database

6. **Admin Dashboard**
   - ✅ Admins can manage users
   - ✅ Admins can manage events/channels
   - ✅ Admins can monitor active sessions
   - ✅ Admins can view/download recordings
   - ✅ Admins can view system statistics

#### Non-Functional Requirements

1. **Performance**
   - ✅ System supports 10+ concurrent translators
   - ✅ System supports 100+ concurrent listeners
   - ✅ Audio latency < 500ms end-to-end
   - ✅ API response time < 200ms (p95)
   - ✅ System remains stable under load

2. **Reliability**
   - ✅ System handles network interruptions gracefully
   - ✅ Automatic reconnection works
   - ✅ No data loss during reconnection
   - ✅ System recovers from service crashes

3. **Security**
   - ✅ System is accessible only on LAN
   - ✅ Authentication is required for all operations
   - ✅ Role-based access control enforced
   - ✅ Passwords are securely hashed
   - ✅ No sensitive data exposed in errors

4. **Usability**
   - ✅ Mobile apps are intuitive to use
   - ✅ Admin dashboard is user-friendly
   - ✅ Error messages are clear
   - ✅ System provides feedback for all actions

5. **Maintainability**
   - ✅ Code is well-documented
   - ✅ Code follows best practices
   - ✅ System is easy to deploy
   - ✅ System is easy to troubleshoot

---

## Risk Management

### Technical Risks

1. **WebRTC Complexity**
   - **Risk:** WebRTC setup and debugging can be complex
   - **Mitigation:** Use proven libraries (mediasoup), extensive testing, documentation

2. **STT Accuracy**
   - **Risk:** Whisper may not be accurate enough for all languages/accents
   - **Mitigation:** Test with target languages, consider model fine-tuning, allow manual correction

3. **Network Latency**
   - **Risk:** High latency on poor networks
   - **Mitigation:** Optimize codec settings, implement adaptive bitrate, test on various networks

4. **Scalability**
   - **Risk:** System may not scale to required number of users
   - **Mitigation:** Load testing, horizontal scaling design, performance monitoring

### Operational Risks

1. **Deployment Complexity**
   - **Risk:** Complex deployment may lead to errors
   - **Mitigation:** Docker Compose, detailed deployment guide, automated scripts

2. **Maintenance**
   - **Risk:** System requires ongoing maintenance
   - **Mitigation:** Comprehensive documentation, monitoring, logging

3. **Data Loss**
   - **Risk:** Recordings or data may be lost
   - **Mitigation:** Regular backups, redundant storage, recovery procedures

---

## Timeline Summary

| Phase | Duration | Weeks |
|-------|----------|-------|
| Phase 1: Foundation & Infrastructure | 3 weeks | 1-3 |
| Phase 2: Backend Core Services | 4 weeks | 4-7 |
| Phase 3: mediasoup SFU Service | 3 weeks | 8-10 |
| Phase 4: Mobile Applications | 6 weeks | 11-16 |
| Phase 5: STT Worker Service | 3 weeks | 17-19 |
| Phase 6: Recording Worker Service | 2 weeks | 20-21 |
| Phase 7: Admin Dashboard | 3 weeks | 22-24 |
| Phase 8: Integration & Testing | 3 weeks | 25-27 |
| Phase 9: Deployment & Infrastructure | 2 weeks | 28-29 |
| Phase 10: Documentation & Finalization | 1 week | 30 |
| **Total** | **30 weeks** | **~7.5 months** |

---

## Success Metrics

### Development Metrics
- Code coverage > 70% (unit tests)
- Zero critical security vulnerabilities
- All acceptance criteria met
- Documentation completeness > 90%

### Performance Metrics
- Audio latency < 500ms (p95)
- API response time < 200ms (p95)
- System supports 10+ translators, 100+ listeners
- Uptime > 99% during testing

### Quality Metrics
- Bug density < 1 bug per 1000 lines of code
- User satisfaction > 4/5 (if user testing conducted)
- Code review approval rate > 90%

---

## Conclusion

This development plan provides a comprehensive roadmap for building a private, on-premise, real-time audio translation/broadcast system. The plan is structured in 10 phases over 30 weeks, with clear milestones, tasks, and deliverables for each component.

The system architecture leverages proven technologies (WebRTC, mediasoup, Whisper) while maintaining simplicity and focusing on LAN-only deployment. Each phase builds upon the previous one, ensuring a systematic and manageable development process.

Regular testing, security considerations, and documentation are integrated throughout the plan to ensure a robust, secure, and maintainable system.

**Next Steps:**
1. Review and approve this development plan
2. Set up development environment (Phase 1)
3. Begin database schema implementation
4. Start backend development

---

*Document Version: 1.0*  
*Last Updated: January 28, 2026*
