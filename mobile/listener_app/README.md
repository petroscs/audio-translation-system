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

## Notes
- Consuming audio requires a mediasoup-compatible client to turn RTP parameters
  into a playable track.
