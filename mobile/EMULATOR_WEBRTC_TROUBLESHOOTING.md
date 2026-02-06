# Android Emulator WebRTC Troubleshooting Guide

## Issue: "The remote computer refused the network connection"

This error occurs when the Android emulator tries to establish WebRTC connections with mediasoup. Android emulators have **limited WebRTC support** due to their NAT networking architecture.

## Root Cause

Android emulators use NAT networking and cannot properly forward WebRTC UDP traffic to the host machine's network IP address. When mediasoup returns ICE candidates with IP `192.168.178.82:54958`, the emulator's NAT stack cannot establish the connection.

## Solutions Attempted

### ✅ Solution 1: Configure Mediasoup to Prefer TCP
**Status**: Applied
- Modified `mediasoup-service/src/mediasoup/config.js` to set `preferUdp: false`
- TCP connections work better through NAT than UDP
- **Current Status**: Mediasoup is running with TCP preference

### Solution 2: Use Physical Device (Recommended)
**Why**: Physical devices have full WebRTC support and work much better
**How**: Connect your Android phone/tablet via USB and run the app on it

### Solution 3: Configure Emulator Network Settings
**Option A: Use Host Networking Mode**
1. Open Android Studio
2. Go to AVD Manager
3. Edit your emulator
4. Show Advanced Settings
5. Set "Network" to "Host"
6. Restart emulator

**Option B: Configure Port Forwarding**
- Complex for dynamic RTC ports (40000-49999)
- Not recommended for development

## Current Configuration

- **Mediasoup ANNOUNCED_IP**: `192.168.178.82` (your computer's network IP)
- **Mediasoup Port**: `4000` (HTTP API)
- **RTC Port Range**: `40000-49999` (UDP/TCP for WebRTC)
- **Transport Preference**: TCP (changed from UDP for emulator compatibility)

## Testing Steps

1. **Restart the translator app** in the emulator
2. Try to create a session and start audio streaming
3. Check if the WebRTC connection establishes

## Additional Troubleshooting

### Check Mediasoup Logs
```powershell
# Check if mediasoup is running
netstat -ano | findstr :4000

# View mediasoup logs (if running in foreground)
# The logs will show transport creation and connection attempts
```

### Verify Backend Connection
- Ensure backend API is running on port 5000
- Check that SignalR hub is accessible
- Verify authentication is working

### Check Windows Firewall
```powershell
# Verify Node.js has UDP/TCP access
netsh advfirewall firewall show rule name="node.exe"
```

### Alternative: Test with Physical Device
1. Connect Android device via USB
2. Enable USB debugging
3. Run: `flutter run -d <device-id> --dart-define=API_BASE_URL=http://192.168.178.82:5000`
4. WebRTC should work much better on physical devices

## Known Limitations

- **Android Emulators**: Limited WebRTC UDP support
- **iOS Simulators**: Also have WebRTC limitations
- **Physical Devices**: Full WebRTC support (recommended for testing)

## Next Steps

1. Try the app again with TCP preference enabled
2. If still not working, use a physical device
3. For production, always test on physical devices

## Reverting Changes

If you want to revert to UDP preference (for physical devices):
```javascript
// In mediasoup-service/src/mediasoup/config.js
preferUdp: true  // Change back to true
```

Then restart mediasoup service.
