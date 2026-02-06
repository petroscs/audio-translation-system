# Mobile App Installation and Setup Guide

This guide will help you install and run the mobile applications (Translator App and Listener App) on physical mobile devices.

## Prerequisites

### 1. Install Flutter

- **Download Flutter**: https://flutter.dev/docs/get-started/install/windows
- **Add Flutter to PATH**: Follow the installation instructions
- **Verify installation**: Run `flutter doctor` in PowerShell

### 2. Install Platform-Specific Tools

**For Android:**
- Install **Android Studio**: https://developer.android.com/studio
- Enable **USB Debugging** on your Android device:
  - Go to Settings → About Phone
  - Tap "Build Number" 7 times to enable Developer Options
  - Go to Settings → Developer Options → Enable "USB Debugging"
- Connect your device via USB and accept the USB debugging authorization

**For iOS (macOS only):**
- Install **Xcode** from the App Store
- Install **CocoaPods**: `sudo gem install cocoapods`
- Connect your iPhone/iPad via USB
- Trust the computer on your device when prompted

### 3. Ensure Backend is Running

Before running the mobile apps, make sure:
- ✅ Backend API is running on port `5000`
- ✅ Backend is accessible from your network

---

## Step 1: Find Your Computer's IP Address

For physical devices, you need to use your computer's local IP address instead of `10.0.2.2` (which only works for Android emulators).

**Windows:**
```powershell
ipconfig
```
Look for **"IPv4 Address"** under your active network adapter (usually starts with `192.168.x.x` or `10.x.x.x`)

**Example:** `192.168.1.100`

---

## Step 2: Install Dependencies

### For Translator App:
```powershell
cd c:\Users\pcons\audio-translation-system\mobile\translator_app
flutter pub get
```

### For Listener App:
```powershell
cd c:\Users\pcons\audio-translation-system\mobile\listener_app
flutter pub get
```

---

## Step 3: Connect Your Device

**Android:**
- Connect your device via USB cable
- Ensure USB debugging is enabled
- Verify connection: `flutter devices`

**iOS:**
- Connect your device via USB cable
- Trust the computer on your device
- Verify connection: `flutter devices`

---

## Step 4: Run the Apps

Replace `YOUR_IP_ADDRESS` with your computer's IP address (e.g., `192.168.1.100`).

### Translator App:
```powershell
cd c:\Users\pcons\audio-translation-system\mobile\translator_app
flutter run --dart-define=API_BASE_URL=http://YOUR_IP_ADDRESS:5000
```

### Listener App:
```powershell
cd c:\Users\pcons\audio-translation-system\mobile\listener_app
flutter run --dart-define=API_BASE_URL=http://YOUR_IP_ADDRESS:5000
```

The app will automatically build and install on your connected device.

---

## Step 5: Build Release APK/IPA (Optional)

If you want to create installable files for distribution:

### Android APK:
```powershell
cd c:\Users\pcons\audio-translation-system\mobile\translator_app
flutter build apk --release --dart-define=API_BASE_URL=http://YOUR_IP_ADDRESS:5000
```

The APK will be located at: `build\app\outputs\flutter-apk\app-release.apk`

You can then transfer this APK to Android devices and install it.

### iOS (macOS only):
```bash
cd mobile/translator_app
flutter build ios --release --dart-define=API_BASE_URL=http://YOUR_IP_ADDRESS:5000
```

---

## Troubleshooting

### Device Not Detected
- Run `flutter doctor` to check your setup
- For Android: Ensure USB debugging is enabled and device is unlocked
- For iOS: Ensure device is trusted and unlocked
- Try disconnecting and reconnecting the USB cable

### Connection Refused / Cannot Connect to Backend
- ✅ Ensure backend is running (`Backend.Api` on port 5000)
- ✅ Verify you're using the correct IP address
- ✅ Check Windows Firewall - ensure port 5000 is allowed
- ✅ Ensure device and computer are on the same Wi-Fi network
- ✅ Try pinging the IP address from your device

### Build Errors
- Run `flutter clean` then `flutter pub get`
- Check `flutter doctor` for missing dependencies
- Ensure you have the latest Flutter SDK version

### Network Issues
- **Important**: Use your computer's local IP address, NOT `localhost` or `127.0.0.1`
- Physical devices cannot access `localhost` - they need the actual network IP
- Ensure both device and computer are on the same Wi-Fi network
- If using mobile data, ensure your computer's firewall allows external connections

### Android Permissions
If you encounter permission issues, check `android/app/src/main/AndroidManifest.xml`:
- Ensure `INTERNET` permission is declared (usually added automatically by Flutter)
- For audio recording, ensure `RECORD_AUDIO` permission is present

### WebRTC/Mediasoup Connection Errors

**Error: "The remote computer refused the network connection"**

This error typically occurs when WebRTC cannot establish a connection to the mediasoup service. Common causes and solutions:

1. **Mediasoup service not running:**
   ```powershell
   # Check if mediasoup is running on port 4000
   netstat -ano | findstr :4000
   
   # Start mediasoup service with correct IP
   cd mediasoup-service
   $env:MEDIASOUP_ANNOUNCED_IP='YOUR_COMPUTER_IP'
   npm start
   ```

2. **Android Emulator WebRTC Limitations:**
   - Android emulators have **limited WebRTC support**
   - The emulator cannot reliably connect to the host's network IP for WebRTC
   - **Solution**: Use a **physical Android device** instead of an emulator for WebRTC testing
   - Physical devices work much better with WebRTC connections

3. **Mediasoup ANNOUNCED_IP Configuration:**
   - For **physical devices**: Set `MEDIASOUP_ANNOUNCED_IP` to your computer's network IP (e.g., `192.168.178.82`)
   - For **emulators**: WebRTC may not work reliably - use physical devices instead
   - Find your IP: `ipconfig | findstr IPv4`

4. **Windows Firewall:**
   - Ensure UDP ports 40000-49999 are allowed (mediasoup RTC port range)
   - Check Windows Firewall settings for Node.js/mediasoup

5. **Required Services:**
   Make sure these services are running:
   - ✅ Backend API (port 5000)
   - ✅ Mediasoup service (port 4000)
   - ✅ STT Worker (port 5002) - if using speech-to-text
   - ✅ Recording Worker (port 5003) - if using recording

**Quick Fix for Mediasoup:**
```powershell
# Stop existing mediasoup (if running)
# Find process: netstat -ano | findstr :4000
# Kill it: taskkill /PID <PID> /F

# Start mediasoup with correct IP
cd c:\Users\pcons\audio-translation-system\mediasoup-service
$env:MEDIASOUP_ANNOUNCED_IP='192.168.178.82'  # Replace with your IP
npm start
```

---

## Quick Reference

- **Default API URL (emulator)**: `http://10.0.2.2:5000`
- **Physical device API URL**: `http://YOUR_COMPUTER_IP:5000`
- **Backend port**: `5000`
- **Translator app path**: `mobile/translator_app/`
- **Listener app path**: `mobile/listener_app/`

---

## Example Commands

**Find your IP address:**
```powershell
ipconfig | findstr IPv4
```

**Run Translator App on connected device:**
```powershell
cd mobile\translator_app
flutter run --dart-define=API_BASE_URL=http://192.168.1.100:5000
```

**Run Listener App on connected device:**
```powershell
cd mobile\listener_app
flutter run --dart-define=API_BASE_URL=http://192.168.1.100:5000
```

**Build release APK for Translator App:**
```powershell
cd mobile\translator_app
flutter build apk --release --dart-define=API_BASE_URL=http://192.168.1.100:5000
```

---

## Notes

- The default API URL (`http://10.0.2.2:5000`) only works for Android emulators
- For physical devices, you **must** use your computer's local IP address
- Both apps use the same backend API and SignalR hub
- WebRTC signaling is configured to work with the mediasoup service
- Make sure all backend services are running before testing the mobile apps:
  - Backend API (port 5000)
  - Mediasoup service (port 4000) - **Required for WebRTC**
  - STT Worker (port 5002) - Optional, for speech-to-text
  - Recording Worker (port 5003) - Optional, for recording
- Backend API runs on port **5000** (not 5081)
- **Important**: Android emulators have limited WebRTC support. For best results, use physical devices for WebRTC testing.
