# Phase 5: STT Worker Service — Detailed Plan

**Duration:** Weeks 17–19 (3 weeks)  
**Depends on:** Phase 1–4 (Foundation, Backend, mediasoup, Mobile Apps)

---

## Executive Summary

Phase 5 implements the Speech-to-Text (STT) worker that consumes the translator’s audio from mediasoup, transcribes it with Whisper, and delivers captions to listeners in real time. This phase closes the caption pipeline: **Translator → mediasoup → STT Worker → Backend → Listeners**.

---

## Current State Assessment

| Component | Status | Notes |
|-----------|--------|-------|
| **mediasoup-service** | ✅ Complete | HTTP API for transport/consumer creation |
| **Backend** | ✅ Core done | Caption entity, captions table, SignalingHub; **no caption ingestion or broadcast yet** |
| **stt-worker** | ⚠️ Skeleton | Only `package.json`; Dockerfile exists (FFmpeg + Python/Whisper) |
| **Listener app** | ⚠️ Partial | SignalingClient has no caption subscription |
| **docker-compose** | ✅ Ready | stt-worker service configured |

---

## Architecture Overview

```
┌─────────────────┐     RTP (Opus)      ┌──────────────┐     PCM       ┌─────────┐
│   mediasoup     │ ◄────────────────── │  STT Worker  │ ────────────► │ Whisper │
│   (producer)    │     WebRTC          │ mediasoup-   │               │ (STT)   │
│                 │     consumer        │ client +     │               │         │
└─────────────────┘                     │ FFmpeg       │               └────┬────┘
        ▲                               └──────┬───────┘                    │
        │                                      │                            │
        │ Backend creates transport/consumer   │ Caption JSON               │
        │ for STT worker                       ▼                            │
┌───────┴───────┐                     ┌─────────────────┐                   │
│    Backend    │ ◄───────────────────│ POST /captions  │◄──────────────────┘
│  - Store      │                     │ or SignalR      │
│  - Broadcast  │                     └─────────────────┘
│  - SignalR    │
└───────┬───────┘
        │ caption event
        ▼
┌───────────────┐
│   Listener    │
│   Mobile App  │
└───────────────┘
```

---

## Milestone 5.1: STT Worker Setup (Week 17)

### 5.1.1 STT Worker as mediasoup Consumer

The STT worker runs **mediasoup-client** (Node.js) and behaves like a listener, but is started/controlled by the backend.

**Flow:**
1. Backend detects active translator session (producer exists).
2. Backend calls STT worker: `POST /stt/start` with `{ sessionId, channelId, producerId, mediasoupProducerId }`.
3. STT worker:
   - Calls mediasoup HTTP API: create router (if needed), create transport (recv), connect transport, create consumer.
   - Uses mediasoup-client to complete the WebRTC connection and receive RTP.
   - Pipes RTP to FFmpeg for Opus → PCM 16 kHz mono.
   - Feeds PCM chunks to Whisper.

**Tasks:**

| # | Task | Owner | Est. |
|---|------|-------|------|
| 1 | Create `stt-worker/` structure: `src/index.js`, `src/mediasoup-client.js`, `src/audio-pipeline.js`, `src/whisper.js` | — | 1d |
| 2 | Add deps: `mediasoup-client`, `fluent-ffmpeg` or `ffmpeg-static` + spawn, `openai-whisper` (Python) or `whisper.cpp` (Node bindings) | — | 0.5d |
| 3 | Implement mediasoup consumer in Node: create transport, connect, consume, receive RTP | — | 2d |
| 4 | Implement RTP → PCM pipeline (FFmpeg or node-opus): 16 kHz, 16-bit, mono | — | 1.5d |
| 5 | Integrate Whisper: process PCM chunks, emit `{ text, startMs, endMs, confidence }` | — | 2d |
| 6 | Handle session end: stop consumer, cleanup resources | — | 0.5d |

**Technical Decisions:**

- **RTP → PCM:** Use FFmpeg subprocess: pipe RTP packets (with RTP header) into FFmpeg; FFmpeg decodes Opus → PCM. Alternative: `prism-media` or `opus` + custom RTP depayloader.
- **Whisper runtime:** Prefer `openai-whisper` (Python) for flexibility; call via subprocess or HTTP from Node. Alternative: `whisper.cpp` Node bindings for lower latency.
- **Whisper model:** Start with `base` (fast), allow `small` via env var for better accuracy.

### 5.1.2 Backend: STT Worker Orchestration

The backend must **start** the STT worker when a translator starts producing, and **stop** it when the session ends.

**Tasks:**

| # | Task | Owner | Est. |
|---|------|-------|------|
| 7 | Add `ISttWorkerService` and `SttWorkerService` to backend | — | 0.5d |
| 8 | On producer created: call STT worker `POST /stt/start` with session/channel/producer info | — | 1d |
| 9 | On producer closed / session ended: call STT worker `POST /stt/stop` | — | 0.5d |
| 10 | Add `SttWorker__BaseUrl` to appsettings | — | 0.25d |

**API Contract (STT Worker):**

```
POST /stt/start
Body: {
  sessionId: "uuid",
  channelId: "uuid",
  producerId: "uuid",           // our DB producer ID
  mediasoupProducerId: "string" // mediasoup producer ID
}
Response: 202 Accepted

POST /stt/stop
Body: { sessionId: "uuid" }
Response: 200 OK
```

---

## Milestone 5.2: Caption Pipeline Integration (Week 18)

### 5.2.1 Caption Ingestion (STT → Backend)

The STT worker sends captions to the backend. Two options:

- **A) HTTP API:** `POST /api/captions` — simple, stateless.
- **B) SignalR:** STT worker holds a server-to-server SignalR connection — more complex, real-time.

**Recommendation:** Start with **HTTP API**; backend stores and broadcasts via SignalR.

**Tasks:**

| # | Task | Owner | Est. |
|---|------|-------|------|
| 11 | Add `CaptionsController`: `POST /api/captions` (accepts `{ sessionId, text, timestamp, confidence }`) | — | 0.5d |
| 12 | Add `ICaptionService` / `CaptionService`: validate session, save caption, broadcast via SignalR | — | 1d |
| 13 | STT worker: on each Whisper segment, `POST` to backend `/api/captions` | — | 0.5d |
| 14 | Auth for STT worker: API key header or service account JWT | — | 0.5d |

**API Contract:**

```
POST /api/captions
Headers: X-STT-Worker-Key: <secret>  (or Authorization: Bearer <service-token>)
Body: {
  sessionId: "uuid",
  text: "Hello world",
  timestamp: 1234567890,  // ms since epoch
  confidence: 0.95
}
Response: 201 Created
```

### 5.2.2 Caption Broadcast (Backend → Listeners)

Backend broadcasts captions to listeners in the same session via SignalR.

**Tasks:**

| # | Task | Owner | Est. |
|---|------|-------|------|
| 15 | Add SignalR group per session: `Groups.AddToGroupAsync(connectionId, $"session:{sessionId}")` when client joins | — | 0.5d |
| 16 | `CaptionService`: on new caption, `Clients.Group($"session:{sessionId}").SendAsync("Caption", captionDto)` | — | 0.5d |
| 17 | Define `CaptionDto` and ensure clients receive `{ sessionId, text, timestamp, confidence }` | — | 0.25d |
| 18 | Add `GET /api/sessions/{sessionId}/captions` for caption history (optional, for scrollback) | — | 0.5d |

**SignalR Message:**

```json
{
  "type": "caption",
  "sessionId": "uuid",
  "text": "Hello world",
  "timestamp": 1234567890,
  "confidence": 0.95
}
```

### 5.2.3 Listener App: Caption Display

The listener app already has caption display in the plan (optional). Implement subscription and UI.

**Tasks:**

| # | Task | Owner | Est. |
|---|------|-------|------|
| 19 | Add `SignalingClient.onCaption(callback)` — subscribe to `Caption` SignalR event | — | 0.5d |
| 20 | Join session group: backend adds client to group when session is established (or on explicit `JoinSession` hub method) | — | 0.5d |
| 21 | Listener dashboard: caption overlay, history scroll, toggle on/off | — | 1d |
| 22 | Test: translator speaks → captions appear on listener app | — | 0.5d |

---

## Milestone 5.3: STT Optimization & Multi-Channel Support (Week 19)

### 5.3.1 Performance

| # | Task | Owner | Est. |
|---|------|-------|------|
| 23 | Tune Whisper: chunk size (e.g. 30s), overlap, model (base vs small) | — | 0.5d |
| 24 | Add latency metrics: audio received → caption delivered | — | 0.5d |
| 25 | Implement ring buffer for PCM to avoid gaps / overflow | — | 0.5d |
| 26 | Document target: caption latency &lt; 3–5 s (Whisper batch) | — | 0.25d |

### 5.3.2 Multi-Channel

| # | Task | Owner | Est. |
|---|------|-------|------|
| 27 | Support multiple concurrent sessions: one STT pipeline per `sessionId` | — | 1d |
| 28 | Optional: configurable max concurrent sessions; reject new if at limit | — | 0.5d |
| 29 | Optional: multiple STT worker instances + load balancing (future) | — | — |

### 5.3.3 Error Handling & Reliability

| # | Task | Owner | Est. |
|---|------|-------|------|
| 30 | Handle Whisper crash: restart subprocess, reconnect consumer | — | 1d |
| 31 | Handle FFmpeg errors: log, skip segment, continue | — | 0.5d |
| 32 | Graceful degradation: if STT fails, audio continues; captions disabled | — | 0.5d |
| 33 | Structured logging (e.g. `pino`) and health endpoint `GET /health` | — | 0.5d |

---

## Implementation Order

```
Week 17:
├── 5.1.1  stt-worker: mediasoup consumer + RTP → PCM → Whisper
├── 5.1.2  Backend: STT worker orchestration (start/stop)
└── End of week: STT worker transcribes, but no captions to listeners yet

Week 18:
├── 5.2.1  Backend: Caption API + service
├── 5.2.2  Backend: SignalR caption broadcast + session groups
├── 5.2.1  STT worker: POST captions to backend
└── 5.2.3  Listener app: caption subscription + UI

Week 19:
├── 5.3.1  Performance tuning
├── 5.3.2  Multi-channel support
└── 5.3.3  Error handling, logging, health checks
```

---

## File Structure (New / Modified)

### stt-worker/

```
stt-worker/
├── package.json           # add: mediasoup-client, axios, fluent-ffmpeg / ffmpeg-static
├── src/
│   ├── index.js           # HTTP server, /stt/start, /stt/stop
│   ├── config.js          # env: MEDIASOUP_API_URL, BACKEND_API_URL, WHISPER_MODEL
│   ├── mediasoup-consumer.js   # create transport, consume, receive RTP
│   ├── rtp-to-pcm.js      # FFmpeg or node-opus pipeline
│   ├── whisper-processor.js   # spawn Whisper, parse output, emit captions
│   └── caption-sender.js  # POST captions to backend
├── Dockerfile             # (existing) FFmpeg + Python + Whisper
└── tests/                 # (optional) unit tests
```

### backend/

```
Backend.Api/
├── Controllers/
│   └── CaptionsController.cs    # POST /api/captions
├── Configuration/
│   └── SttWorkerSettings.cs
└── Program.cs                   # register SttWorkerService, CaptionService

Backend.Services/
├── Interfaces/
│   ├── ICaptionService.cs
│   └── ISttWorkerService.cs
├── Services/
│   ├── CaptionService.cs
│   └── SttWorkerService.cs
└── Models/
    └── CreateCaptionRequest.cs
```

### SignalingHub

- Add `JoinSessionGroup(sessionId)` hub method so listeners join the group for caption broadcast.
- Or: add client to group when `CreateTransport` is called with a session that has listeners.

---

## Open Decisions

| # | Decision | Options | Recommendation |
|---|----------|---------|----------------|
| 1 | STT worker ↔ Backend auth | API key, JWT, internal network | API key (`X-STT-Worker-Key`) for simplicity |
| 2 | Whisper runtime | Python subprocess, whisper.cpp Node | Python subprocess first; migrate to whisper.cpp if latency critical |
| 3 | RTP → PCM | FFmpeg pipe, node-opus | FFmpeg pipe (aligns with plan); node-opus if FFmpeg proves brittle |
| 4 | Join session group | Automatic on CreateTransport, or explicit JoinSession | Explicit `JoinSession(sessionId)` when listener joins channel |

---

## Acceptance Criteria (Phase 5)

- [ ] STT worker connects to mediasoup as consumer when translator starts
- [ ] STT worker decodes RTP to PCM and transcribes with Whisper
- [ ] Captions are sent to backend and stored in `captions` table
- [ ] Captions are broadcast to listeners in the session via SignalR
- [ ] Listener app displays captions in real time with toggle
- [ ] STT worker stops and cleans up when session ends
- [ ] Multiple sessions can run simultaneously (at least 2)
- [ ] STT failures do not break audio; captions degrade gracefully
- [ ] Health endpoint and structured logging exist

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Whisper latency too high | Use smaller model (base), tune chunk size; consider streaming Whisper later |
| FFmpeg RTP parsing issues | Validate with known RTP dumps; fallback to node-opus if needed |
| mediasoup-client in Node + RTP access | Verify mediasoup-client exposes RTP; use `consumer.rtpStream` or events |
| STT worker restarts mid-session | Backend retries `/stt/start`; worker reconnects consumer |

---

## Next Steps After Phase 5

- Phase 6: Recording worker (similar mediasoup consumer pattern; no Whisper)
- Phase 7: Admin dashboard (caption history, STT health)
- Phase 8: E2E testing (translator → captions → listener)

---

*Plan Version: 1.0*  
*Created: February 1, 2026*
