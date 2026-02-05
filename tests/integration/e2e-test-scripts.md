# End-to-End Integration Test Scripts

This document contains manual test procedures for validating complete system workflows.

## Test Environment Setup

1. Start all services using Docker Compose:
   ```bash
   cd deployment
   docker-compose up -d
   ```

2. Verify all services are running:
   - Backend API: http://localhost:5000
   - Admin Dashboard: http://localhost:3000
   - mediasoup: http://localhost:4000
   - STT Worker: http://localhost:5002
   - Recording Worker: http://localhost:5003

3. Ensure database is seeded with test data (admin user should exist)

---

## Test Scenario 1: Complete Translation Session Flow (Happy Path)

### Objective
Verify the complete workflow from translator login to recording availability.

### Steps

1. **Translator Login**
   - Open translator mobile app
   - Login with translator credentials
   - Verify JWT token received
   - Verify authentication successful

2. **Event and Channel Selection**
   - List available events
   - Select an event
   - List channels for the event
   - Select a channel
   - Verify event and channel data displayed correctly

3. **Create Session**
   - Create session as translator
   - Verify session created in database
   - Verify session status is "Active"

4. **Start Audio Production**
   - Connect to SignalR hub (`/ws/signaling`)
   - Create send transport
   - Connect transport
   - Create producer
   - Start capturing audio from microphone
   - Verify audio is being sent to mediasoup

5. **STT Worker Activation**
   - Verify STT worker receives start command from backend
   - Verify STT worker connects to mediasoup as consumer
   - Verify STT worker starts processing audio

6. **Recording Worker Activation**
   - Verify recording worker receives start command from backend
   - Verify recording worker connects to mediasoup as consumer
   - Verify recording starts

7. **Listener Joins**
   - Open listener mobile app
   - Login with listener credentials
   - Select same event and channel
   - Create session as listener
   - Connect to SignalR hub
   - Create receive transport
   - Connect transport
   - Create consumer
   - Verify audio is received and played

8. **Caption Delivery**
   - Wait for STT worker to generate captions
   - Verify captions are sent to backend via HTTP API
   - Verify captions are broadcast to listeners via SignalR
   - Verify captions appear on listener app

9. **Session End**
   - Translator ends session
   - Verify session status updated to "Ended"
   - Verify STT worker receives stop command
   - Verify recording worker receives stop command
   - Verify recording file is finalized

10. **Recording Availability**
    - Admin logs into dashboard
    - Navigate to recordings page
    - Verify recording appears in list
    - Download recording
    - Verify recording file is valid and playable

### Expected Results
- All steps complete without errors
- Audio flows from translator to listeners
- Captions appear in real-time
- Recording is created and downloadable
- All data persisted in database

---

## Test Scenario 2: Multi-Channel Concurrent Sessions

### Objective
Verify multiple events/channels can run simultaneously without interference.

### Steps

1. **Create Multiple Events**
   - Admin creates Event A
   - Admin creates Event B
   - Admin creates Event C

2. **Create Channels**
   - Create Channel 1 for Event A
   - Create Channel 2 for Event A
   - Create Channel 1 for Event B

3. **Start Multiple Sessions**
   - Translator 1 starts session in Event A / Channel 1
   - Translator 2 starts session in Event A / Channel 2
   - Translator 3 starts session in Event B / Channel 1

4. **Add Listeners**
   - Listener 1 joins Event A / Channel 1
   - Listener 2 joins Event A / Channel 1
   - Listener 3 joins Event A / Channel 2
   - Listener 4 joins Event B / Channel 1

5. **Verify Isolation**
   - Verify Listener 1 and 2 hear Translator 1 only
   - Verify Listener 3 hears Translator 2 only
   - Verify Listener 4 hears Translator 3 only
   - Verify no cross-channel audio leakage

6. **Verify STT Workers**
   - Verify each session has its own STT worker instance
   - Verify captions are channel-specific

7. **Verify Recordings**
   - End all sessions
   - Verify separate recordings for each session
   - Verify recordings are correctly labeled

### Expected Results
- Multiple sessions run concurrently
- No audio cross-talk between channels
- Each session has independent STT and recording
- All recordings are separate and correct

---

## Test Scenario 3: Error Recovery (Network Interruption)

### Objective
Verify system handles network interruptions gracefully.

### Steps

1. **Establish Session**
   - Translator starts session
   - Listener joins session
   - Verify audio flowing

2. **Simulate Network Interruption**
   - Disconnect translator's network (or stop network interface)
   - Wait 10 seconds
   - Reconnect network

3. **Verify Reconnection**
   - Translator app should detect disconnection
   - Translator app should attempt reconnection
   - Verify transport recreated
   - Verify producer recreated
   - Verify audio resumes

4. **Listener Side**
   - Verify listener detects translator disconnection
   - Verify listener maintains connection
   - Verify audio resumes when translator reconnects

5. **STT Worker**
   - Verify STT worker handles interruption
   - Verify STT worker reconnects consumer
   - Verify captions resume

6. **Recording**
   - Verify recording continues (or handles gap gracefully)
   - Verify recording file is still valid

### Expected Results
- System detects disconnections
- Automatic reconnection works
- Audio resumes after reconnection
- No data loss (or minimal)
- Recordings remain valid

---

## Test Scenario 4: Admin Operations Workflow

### Objective
Verify admin can manage the system through the dashboard.

### Steps

1. **Admin Login**
   - Open admin dashboard
   - Login with admin credentials
   - Verify dashboard loads

2. **User Management**
   - Navigate to Users page
   - Create new user (translator role)
   - Create new user (listener role)
   - Edit existing user
   - Delete user (if allowed)
   - Verify changes persisted

3. **Event Management**
   - Navigate to Events page
   - Create new event
   - Edit event details
   - Start event
   - Stop event
   - Delete event (if no active sessions)
   - Verify changes persisted

4. **Channel Management**
   - Select an event
   - Create channel for event
   - Edit channel
   - Delete channel
   - Verify changes persisted

5. **Session Monitoring**
   - Navigate to Sessions page
   - View active sessions
   - View session details
   - Terminate session (if needed)
   - Verify session status updates

6. **Recording Management**
   - Navigate to Recordings page
   - View list of recordings
   - Filter by event/channel/date
   - Download recording
   - Delete recording
   - Verify operations succeed

7. **Analytics**
   - View dashboard statistics
   - Verify event statistics
   - Verify recording statistics
   - Verify user activity

### Expected Results
- All admin operations succeed
- Changes persisted correctly
- UI reflects current state
- No unauthorized access possible

---

## Test Scenario 5: STT Worker Integration

### Objective
Verify STT worker correctly processes audio and delivers captions.

### Steps

1. **Start Session**
   - Translator starts session
   - Verify STT worker receives start command

2. **STT Worker Connection**
   - Verify STT worker connects to mediasoup
   - Verify consumer created
   - Verify RTP stream received

3. **Audio Processing**
   - Translator speaks clearly
   - Verify STT worker receives audio
   - Verify FFmpeg decodes RTP to PCM
   - Verify Whisper processes audio

4. **Caption Generation**
   - Wait for Whisper to generate text
   - Verify captions sent to backend
   - Verify captions stored in database
   - Verify captions broadcast to listeners

5. **Multiple Listeners**
   - Add multiple listeners
   - Verify all receive captions
   - Verify caption timing synchronized

6. **Session End**
   - End session
   - Verify STT worker stops
   - Verify resources cleaned up

### Expected Results
- STT worker starts automatically
- Captions generated accurately (>85% WER)
- Captions delivered in real-time
- Multiple listeners receive captions
- Clean shutdown on session end

---

## Test Scenario 6: Recording Worker Integration

### Objective
Verify recording worker correctly records audio.

### Steps

1. **Start Session**
   - Translator starts session
   - Verify recording worker receives start command

2. **Recording Worker Connection**
   - Verify recording worker connects to mediasoup
   - Verify consumer created
   - Verify RTP stream received

3. **Audio Recording**
   - Translator speaks for 30 seconds
   - Verify recording worker receives audio
   - Verify FFmpeg records to file
   - Verify file being written

4. **Recording Metadata**
   - Verify recording metadata sent to backend
   - Verify metadata stored in database
   - Verify file path recorded

5. **Session End**
   - End session
   - Verify recording worker receives stop command
   - Verify file finalized
   - Verify file duration matches session duration

6. **File Validation**
   - Download recording file
   - Verify file is valid audio format
   - Play file and verify audio quality
   - Verify file duration correct

### Expected Results
- Recording starts automatically
- Audio recorded correctly
- File format valid
- Metadata stored correctly
- File downloadable and playable

---

## Test Data Requirements

### Test Users
- Admin user: `admin` / `admin123` (created by seed)
- Translator user: `translator1` / `password123`
- Listener user: `listener1` / `password123`

### Test Events
- Event A: "Test Conference 2026"
- Event B: "Workshop Session"
- Event C: "Training Day"

### Test Channels
- English channel (en)
- Spanish channel (es)
- French channel (fr)

---

## Notes

- All timestamps should be verified in UTC
- Network interruptions can be simulated using `iptables` or network interface controls
- Audio quality can be verified using audio analysis tools
- Caption accuracy can be verified manually or using WER calculation tools
