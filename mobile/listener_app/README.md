# Listener App (Flutter)

This app connects to the backend REST API and SignalR hub to receive live audio
as a Listener session.

## Setup
- Ensure Flutter is installed and in `PATH`.
- Run `flutter pub get` from this directory.
- Start the backend (`Backend.Api`) locally.

## Configuration
- Default API base URL: `http://10.0.2.2:5000`
- Override with: `flutter run --dart-define=API_BASE_URL=http://<host>:5000`

## Joining a session (QR code or URL)

You can join by scanning a QR code (in-app) or pasting a session ID/URL. The **same QR code** works for both this app and the [web listener](../../web-listener): when the translator or admin dashboard shows a QR that encodes a full URL (e.g. `https://listener.example.com/listen/{sessionId}`), opening it in a browser uses the web listener; scanning it in this app (or pasting that URL in the session ID field) joins with the native app. Supported formats:

- **Raw session ID** — UUID only (e.g. from an older QR)
- **Web listener URL** — `https://.../listen/{sessionId}` (same QR as web listener)
- **Custom scheme** — `listenerapp://session/{id}` (if used elsewhere)

## Logs
- **When you run from a terminal** (`flutter run -d windows` or `flutter run -d <device>`):  
  All `debugPrint` output and error stack traces appear in that same terminal.
- **When you run from an IDE** (e.g. Run/Debug in VS Code or Cursor):  
  Logs appear in the **Debug Console** or **Run** output panel.
- To see the full stack trace for errors, run the app from a terminal so the logged trace is visible after you trigger the error.

## Notes
- Consuming audio requires a mediasoup-compatible client to turn RTP parameters
  into a playable track.
