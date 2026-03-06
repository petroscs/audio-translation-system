# Translator App (Flutter)

This app connects to the backend REST API and SignalR hub to publish live audio
as a Translator session.

## Setup
- Ensure Flutter is installed and in `PATH`.
- Run `flutter pub get` from this directory.
- Start the backend (`Backend.Api`) locally.

## Configuration
- Default API base URL: `http://10.0.2.2:5000` (mobile/desktop). On **web**, the default is `http://localhost:5000` when not set.
- Override with: `flutter run --dart-define=API_BASE_URL=http://<host>:5000` or `flutter build web --dart-define=API_BASE_URL=https://<api-host>`.
- **Listener QR URL:** The QR code shown while broadcasting always encodes the full web listener URL (e.g. `https://listener.example.com/listen/{sessionId}`). Default base URL is `http://localhost:3001`. For production or when the web listener is elsewhere, set: `flutter run --dart-define=LISTENER_WEB_BASE_URL=https://<listener-host>`.

## Web
The app can run in the browser as well as on mobile and desktop (same codebase).

- **Enable web (once):** `flutter config --enable-web`
- **Run in Chrome:**  
  `flutter run -d chrome`  
  Optionally: `flutter run -d chrome --dart-define=API_BASE_URL=http://localhost:5000`
- **Build for production:**  
  `flutter build web --dart-define=API_BASE_URL=https://your-api-host`  
  Output is in `build/web/` (static files). Serve with any static host (Nginx, Firebase Hosting, etc.).
- **Production:** Set `API_BASE_URL` to your backend URL when building. Ensure the backend **CORS** configuration allows the translator web app origin (e.g. add it to `Cors:AllowedOrigins` in appsettings). WebRTC requires HTTPS (or localhost) in production.

- **Docker Compose:** The deployment includes a `web-translator` service served over **HTTPS** (self-signed cert). After `docker compose up`, open **https://localhost:3002** or **https://&lt;server-IP&gt;:3002**; accept the browser certificate warning once, then the microphone prompt will work when you start broadcasting.

  **Note:** `web-translator` is now a **React** web app (see `web-translator/`) and it proxies `/api` and `/ws` through nginx on port 3002, so it does **not** need a separate `API_URL` build-time setting. (The Flutter translator app in this folder is still usable for mobile/desktop, and can still be run in a browser via `flutter run -d chrome`, but it is no longer what Docker serves on port 3002.)

## Logs
- **When you run from a terminal** (`flutter run -d windows` or `flutter run -d <device>`):  
  All `debugPrint` output and error stack traces appear in that same terminal.
- **When you run from an IDE** (e.g. Run/Debug in VS Code or Cursor):  
  Logs appear in the **Debug Console** or **Run** output panel.
- To see the full stack trace for errors (e.g. `FormatException`), run the app from a terminal so the logged trace is visible after you trigger the error.

## Patches (reapply after `flutter pub upgrade`)

**flutter_webrtc – UTF-8 sanitizer on Windows**

On Windows, the native audio device layer can return device names/GUIDs in a non-UTF-8 encoding. When those strings are sent over the platform channel, Flutter can throw `FormatException: Missing extension byte (at offset 1)` in `getUserMedia`.

We patch the plugin in the pub cache so all device-related strings are sanitized to valid UTF-8 before being sent to Dart.

- **Location:**  
  In your pub cache: `hosted/pub.dev/flutter_webrtc-<version>/common/cpp/src/flutter_media_stream.cc`  
  (e.g. on Windows: `%LOCALAPPDATA%\Pub\Cache\hosted\pub.dev\flutter_webrtc-1.3.0\common\cpp\src\flutter_media_stream.cc`)

- **What to add:**  
  1. After `#define DEFAULT_FPS 30` and before `void FlutterMediaStream::GetUserMedia`, add a static helper `SanitizeUtf8(const std::string& s)` that walks the string and replaces any invalid UTF-8 byte sequences with `'?'` (keep valid 1–4 byte UTF-8 code points as-is).
  2. In **GetUserAudio**, set  
     `settings[EncodableValue("deviceId")] = EncodableValue(SanitizeUtf8(sourceId));`
  3. In **GetSources**, wrap every `label` and `deviceId` value passed to `EncodableValue(...)` with `SanitizeUtf8(...)` for recording, playout, and video device entries.

- **After editing:** run `flutter clean` then `flutter pub get` and rebuild so the plugin is recompiled.

## Notes
- WebRTC signaling scaffolding is wired to the SignalR hub, but DTLS/RTP params
  still require a mediasoup-compatible client implementation.
