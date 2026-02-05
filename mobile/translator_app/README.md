# Translator App (Flutter)

This app connects to the backend REST API and SignalR hub to publish live audio
as a Translator session.

## Setup
- Ensure Flutter is installed and in `PATH`.
- Run `flutter pub get` from this directory.
- Start the backend (`Backend.Api`) locally.

## Configuration
- Default API base URL: `http://10.0.2.2:5081`
- Override with: `flutter run --dart-define=API_BASE_URL=http://<host>:5081`

## Notes
- WebRTC signaling scaffolding is wired to the SignalR hub, but DTLS/RTP params
  still require a mediasoup-compatible client implementation.
