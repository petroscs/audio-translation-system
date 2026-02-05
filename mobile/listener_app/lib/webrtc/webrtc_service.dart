import 'package:flutter_webrtc/flutter_webrtc.dart';

class WebRtcService {
  MediaStream? _localStream;

  MediaStream? get localStream => _localStream;

  Future<MediaStream> startAudioCapture() async {
    if (_localStream != null) {
      return _localStream!;
    }

    final stream = await navigator.mediaDevices.getUserMedia({
      'audio': true,
      'video': false,
    });
    _localStream = stream;
    return stream;
  }

  Future<void> stopAudioCapture() async {
    final stream = _localStream;
    if (stream != null) {
      for (final track in stream.getTracks()) {
        await track.stop();
      }
      await stream.dispose();
    }
    _localStream = null;
  }
}
