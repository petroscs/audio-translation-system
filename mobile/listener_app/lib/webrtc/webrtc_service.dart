import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart';

/// Holds the real DTLS parameters extracted from the local PeerConnection.
class MediasoupRecvParams {
  final String dtlsParameters;
  MediasoupRecvParams({required this.dtlsParameters});
}

class WebRtcService {
  MediaStream? _localStream;
  MediaStream? _remoteStream;
  RTCPeerConnection? _peerConnection;

  MediaStream? get localStream => _localStream;
  MediaStream? get remoteStream => _remoteStream;
  RTCPeerConnection? get peerConnection => _peerConnection;

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

  /// Create a PeerConnection for receiving audio, perform SDP negotiation
  /// with the mediasoup server's transport parameters, and return the real
  /// DTLS fingerprint the server needs.
  ///
  /// [consumerRtpParametersJson] comes from the Consume response and describes
  /// the RTP stream the server will send to us.
  Future<MediasoupRecvParams> connectRecvTransport({
    required String iceParametersJson,
    required String iceCandidatesJson,
    required String dtlsParametersJson,
    required String consumerRtpParametersJson,
  }) async {
    final iceParams = jsonDecode(iceParametersJson) as Map<String, dynamic>;
    final iceCandidates = jsonDecode(iceCandidatesJson) as List<dynamic>;
    final serverDtls = jsonDecode(dtlsParametersJson) as Map<String, dynamic>;
    final rtpParams = jsonDecode(consumerRtpParametersJson) as Map<String, dynamic>;

    Map<String, dynamic> localDtls;

    try {
    // 1. Create PeerConnection
    _peerConnection = await createPeerConnection({
      'iceServers': <Map<String, dynamic>>[],
      'sdpSemantics': 'unified-plan',
    });

    // Listen for remote audio tracks
    _remoteStream = await createLocalMediaStream('remote-audio');
    _peerConnection!.onTrack = (RTCTrackEvent event) {
      if (event.track.kind == 'audio') {
        _remoteStream!.addTrack(event.track);
      }
    };

    // 2. Build remote offer SDP (server sends audio to us)
    final offerSdp = _buildRemoteOfferSdp(
      iceParams: iceParams,
      iceCandidates: iceCandidates,
      serverDtls: serverDtls,
      rtpParams: rtpParams,
    );

    // 3. Set the constructed offer as remote description
    await _peerConnection!.setRemoteDescription(
      RTCSessionDescription(offerSdp, 'offer'),
    );

    // 4. Create local answer
    final answer = await _peerConnection!.createAnswer({});

    // 5. Keep the answer as-is
    final answerSdp = answer.sdp!;

    // 6. Set local description (answer)
    await _peerConnection!.setLocalDescription(
      RTCSessionDescription(answerSdp, 'answer'),
    );

    // 7. Extract local DTLS fingerprint from answer
    localDtls = _extractDtlsParameters(answerSdp);

    // Monitor connection state
    _peerConnection!.onIceConnectionState = (state) {
      debugPrint('[WebRtcService] ICE connection state: $state');
    };

    } catch (e, st) {
      debugPrint('[WebRtcService] Recv SDP negotiation failed: $e');
      rethrow;
    }
    _peerConnection!.onConnectionState = (state) {
      debugPrint('[WebRtcService] PeerConnection state: $state');
    };

    return MediasoupRecvParams(dtlsParameters: jsonEncode(localDtls));
  }

  /// Extract DTLS parameters from a local SDP.
  /// We determine the role from the SDP's a=setup attribute.
  Map<String, dynamic> _extractDtlsParameters(String sdp) {
    final lines = sdp.split('\n');
    final fingerprints = <Map<String, String>>[];
    String role = 'server'; // default: passive (DTLS server)

    for (final line in lines) {
      final trimmed = line.trim();
      if (trimmed.startsWith('a=fingerprint:')) {
        final parts = trimmed.substring('a=fingerprint:'.length).split(' ');
        if (parts.length >= 2) {
          fingerprints.add({
            'algorithm': parts[0],
            'value': parts.sublist(1).join(' ').trim(),
          });
        }
      }
      if (trimmed.startsWith('a=setup:')) {
        final setup = trimmed.substring('a=setup:'.length).trim();
        // Map SDP setup value to mediasoup DTLS role
        if (setup == 'active') {
          role = 'client';
        } else if (setup == 'passive') {
          role = 'server';
        } else {
          role = 'auto';
        }
      }
    }

    return {
      'role': role,
      'fingerprints': fingerprints,
    };
  }

  /// Build a remote offer SDP from the mediasoup server's transport parameters
  /// and the consumer's RTP parameters. The server is offering to send audio.
  String _buildRemoteOfferSdp({
    required Map<String, dynamic> iceParams,
    required List<dynamic> iceCandidates,
    required Map<String, dynamic> serverDtls,
    required Map<String, dynamic> rtpParams,
  }) {
    // Parse RTP parameters to build codec lines
    final codecs = (rtpParams['codecs'] as List<dynamic>?) ?? [];
    final headerExtensions = (rtpParams['headerExtensions'] as List<dynamic>?) ?? [];
    final encodings = (rtpParams['encodings'] as List<dynamic>?) ?? [];
    final rtcp = (rtpParams['rtcp'] as Map<String, dynamic>?) ?? {};

    // Collect payload types for m= line
    final payloadTypes = codecs.map((c) => c['payloadType'].toString()).toList();
    final ptString = payloadTypes.isNotEmpty ? payloadTypes.join(' ') : '111';

    // Server DTLS fingerprint — prefer sha-256
    final fingerprints = serverDtls['fingerprints'] as List<dynamic>? ?? [];
    final fingerprint = fingerprints.firstWhere(
      (f) => f['algorithm'] == 'sha-256',
      orElse: () => fingerprints.isNotEmpty ? fingerprints[0] : null,
    );

    // SSRC
    int? ssrc;
    if (encodings.isNotEmpty) {
      ssrc = encodings[0]['ssrc'] as int?;
    }

    final sb = StringBuffer();
    sb.writeln('v=0');
    sb.writeln('o=- 0 0 IN IP4 0.0.0.0');
    sb.writeln('s=-');
    sb.writeln('t=0 0');
    sb.writeln('a=ice-lite'); // mediasoup is ICE-lite; tells client to be controlling agent
    sb.writeln('a=group:BUNDLE 0');
    sb.writeln('a=msid-semantic: WMS *');
    // Media section
    sb.writeln('m=audio 9 UDP/TLS/RTP/SAVPF $ptString');
    sb.writeln('c=IN IP4 127.0.0.1');
    sb.writeln('a=rtcp:9 IN IP4 0.0.0.0');
    // ICE parameters
    sb.writeln('a=ice-ufrag:${iceParams['usernameFragment']}');
    sb.writeln('a=ice-pwd:${iceParams['password']}');
    // DTLS
    if (fingerprint != null) {
      sb.writeln('a=fingerprint:${fingerprint['algorithm']} ${fingerprint['value']}');
    }
    sb.writeln('a=setup:actpass'); // server offers actpass, client will answer active
    sb.writeln('a=mid:0');
    sb.writeln('a=sendonly'); // server sends audio to us
    sb.writeln('a=rtcp-mux');
    sb.writeln('a=msid:server-stream server-audio');
    // Header extensions
    for (final ext in headerExtensions) {
      sb.writeln('a=extmap:${ext['id']} ${ext['uri']}');
    }
    // Codec lines
    for (final codec in codecs) {
      final pt = codec['payloadType'];
      final mimeType = (codec['mimeType'] as String).split('/').last;
      final clockRate = codec['clockRate'];
      final channels = codec['channels'];
      final rtpmap = channels != null && channels > 1
          ? '$mimeType/$clockRate/$channels'
          : '$mimeType/$clockRate';
      sb.writeln('a=rtpmap:$pt $rtpmap');
      // fmtp
      final params = codec['parameters'] as Map<String, dynamic>?;
      if (params != null && params.isNotEmpty) {
        final fmtpStr = params.entries.map((e) => '${e.key}=${e.value}').join(';');
        sb.writeln('a=fmtp:$pt $fmtpStr');
      }
      // rtcp-fb
      final rtcpFb = codec['rtcpFeedback'] as List<dynamic>?;
      if (rtcpFb != null) {
        for (final fb in rtcpFb) {
          final fbType = fb['type'] ?? '';
          final fbParam = fb['parameter'] ?? '';
          if (fbType.toString().isNotEmpty) {
            sb.writeln('a=rtcp-fb:$pt $fbType${fbParam.toString().isNotEmpty ? ' $fbParam' : ''}');
          }
        }
      }
    }
    // SSRC
    if (ssrc != null) {
      final cname = rtcp['cname'] ?? 'mediasoup';
      sb.writeln('a=ssrc:$ssrc cname:$cname');
      sb.writeln('a=ssrc:$ssrc msid:server-stream server-audio');
    }
    // ICE candidates
    for (final candidate in iceCandidates) {
      final foundation = candidate['foundation'] ?? 'udpcandidate';
      final priority = candidate['priority'] ?? 1076302079;
      final ip = candidate['ip'] ?? '127.0.0.1';
      final port = candidate['port'] ?? 40000;
      final protocol = (candidate['protocol'] ?? 'udp').toString().toLowerCase();
      final type = candidate['type'] ?? 'host';
      String candidateLine =
          'a=candidate:$foundation 1 $protocol $priority $ip $port typ $type';
      if (protocol == 'tcp') {
        final tcpType = candidate['tcpType'] ?? 'passive';
        candidateLine += ' tcptype $tcpType';
      }
      sb.writeln(candidateLine);
    }
    sb.writeln('a=end-of-candidates');

    return sb.toString();
  }

  /// Get audio level from the remote audio track using getStats().
  /// Returns a value between 0.0 and 1.0, or null if unavailable.
  Future<double?> getRemoteAudioLevel() async {
    if (_peerConnection == null || _remoteStream == null) return null;

    try {
      final audioTracks = _remoteStream!.getAudioTracks();
      if (audioTracks.isEmpty) return null;

      final stats = await _peerConnection!.getStats(audioTracks.first);
      for (final report in stats) {
        if (report.type == 'inbound-rtp' || report.type == 'track') {
          final values = report.values;
          final audioLevel = values['audioLevel'];
          if (audioLevel != null) {
            final level = audioLevel is num
                ? audioLevel.toDouble()
                : double.tryParse(audioLevel.toString());
            if (level != null) {
              return level.clamp(0.0, 1.0);
            }
          }
          // Check if receiving bytes (indicates audio flow)
          final bytesReceived = values['bytesReceived'];
          if (bytesReceived != null) {
            final bytes = bytesReceived is num
                ? bytesReceived.toInt()
                : int.tryParse(bytesReceived.toString()) ?? 0;
            if (bytes > 0) return 0.3; // indicate activity
          }
        }
      }
    } catch (e) {
      debugPrint('[WebRtcService] Stats error: $e');
    }
    return null;
  }

  /// Check if remote audio is being received.
  Future<bool> isReceivingAudio() async {
    final level = await getRemoteAudioLevel();
    return level != null && level > 0.05;
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

  Future<void> stopRemoteAudio() async {
    if (_remoteStream != null) {
      for (final track in _remoteStream!.getTracks()) {
        try {
          await track.stop();
        } catch (_) {}
      }
      await _remoteStream!.dispose();
      _remoteStream = null;
    }

    if (_peerConnection != null) {
      await _peerConnection!.close();
      _peerConnection = null;
    }
  }

  void dispose() {
    stopAudioCapture();
    stopRemoteAudio();
  }
}
