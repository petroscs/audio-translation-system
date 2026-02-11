import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart';

/// Holds the real DTLS and RTP parameters extracted from the local PeerConnection.
class MediasoupSendParams {
  final String dtlsParameters;
  final String rtpParameters;
  MediasoupSendParams({required this.dtlsParameters, required this.rtpParameters});
}

class WebRtcService {
  MediaStream? _localStream;
  RTCPeerConnection? _peerConnection;
  RTCIceConnectionState? _lastIceState;
  RTCPeerConnectionState? _lastConnectionState;

  MediaStream? get localStream => _localStream;
  RTCPeerConnection? get peerConnection => _peerConnection;

  /// Capture audio from the microphone.
  Future<MediaStream> startAudioCapture() async {
    if (_localStream != null) {
      debugPrint('[WebRtcService] Audio capture already active');
      return _localStream!;
    }

    try {
      debugPrint('[WebRtcService] Requesting microphone access...');
      final stream = await navigator.mediaDevices.getUserMedia({
        'audio': true,
        'video': false,
      });

      debugPrint('[WebRtcService] Microphone access granted');
      final audioTracks = stream.getAudioTracks();
      debugPrint('[WebRtcService] Audio tracks count: ${audioTracks.length}');
      if (audioTracks.isNotEmpty) {
        final track = audioTracks.first;
        debugPrint('[WebRtcService] Audio track ID: ${track.id}, enabled: ${track.enabled}');
      }

      _localStream = stream;
      return stream;
    } catch (e, stackTrace) {
      debugPrint('[WebRtcService] ERROR: Failed to start audio capture: $e');
      debugPrint('[WebRtcService] Stack trace: $stackTrace');
      rethrow;
    }
  }

  /// Create a PeerConnection, add the audio track, perform SDP negotiation
  /// with the mediasoup server's transport parameters, and return the real
  /// DTLS fingerprint + RTP parameters that the server needs.
  Future<MediasoupSendParams> connectSendTransport({
    required String iceParametersJson,
    required String iceCandidatesJson,
    required String dtlsParametersJson,
  }) async {
    if (_localStream == null) {
      throw Exception('Must call startAudioCapture() before connectSendTransport()');
    }

    final iceParams = jsonDecode(iceParametersJson) as Map<String, dynamic>;
    final iceCandidates = jsonDecode(iceCandidatesJson) as List<dynamic>;
    final serverDtls = jsonDecode(dtlsParametersJson) as Map<String, dynamic>;

    Map<String, dynamic> localDtls;
    Map<String, dynamic> rtpParams;

    try {
      // 1. Create PeerConnection (no ICE servers needed — mediasoup provides direct candidates)
      _peerConnection = await createPeerConnection({
        'iceServers': <Map<String, dynamic>>[],
        'sdpSemantics': 'unified-plan',
      });

      // 2. Add audio track to PeerConnection
      final audioTrack = _localStream!.getAudioTracks().first;
      await _peerConnection!.addTrack(audioTrack, _localStream!);

      // 3. Create SDP offer
      final offer = await _peerConnection!.createOffer({
        'offerToReceiveAudio': false,
        'offerToReceiveVideo': false,
      });

      // 4. Keep offer as-is (must have a=setup:actpass per WebRTC spec on Windows)
      final offerSdp = offer.sdp!;

      // 5. Set offer as local description
      await _peerConnection!.setLocalDescription(
        RTCSessionDescription(offerSdp, 'offer'),
      );

      // 6. Extract real DTLS fingerprint from local offer
      localDtls = _extractDtlsParameters(offerSdp);

      // 7. Extract real RTP parameters from local offer
      rtpParams = _extractRtpParameters(offerSdp);

      // 8. Build remote answer SDP from server's ICE/DTLS/candidates
      final answerSdp = _buildRemoteAnswerSdp(
        iceParams: iceParams,
        iceCandidates: iceCandidates,
        serverDtls: serverDtls,
        localOfferSdp: offerSdp,
      );

      // 9. Set remote answer as remote description
      await _peerConnection!.setRemoteDescription(
        RTCSessionDescription(answerSdp, 'answer'),
      );
    } catch (e, st) {
      debugPrint('[WebRtcService] SDP negotiation failed: $e');
      rethrow;
    }

    // Monitor connection state
    _peerConnection!.onIceConnectionState = (state) {
      _lastIceState = state;
      debugPrint('[WebRtcService] ICE connection state: $state');
    };
    _peerConnection!.onConnectionState = (state) {
      _lastConnectionState = state;
      debugPrint('[WebRtcService] PeerConnection state: $state');
    };

    return MediasoupSendParams(
      dtlsParameters: jsonEncode(localDtls),
      rtpParameters: jsonEncode(rtpParams),
    );
  }

  /// Extract DTLS parameters from a local SDP.
  /// Role is 'server' because the answer has a=setup:active (remote initiates DTLS),
  /// making our client the passive/server side.
  Map<String, dynamic> _extractDtlsParameters(String sdp) {
    final lines = sdp.split('\n');
    final fingerprints = <Map<String, String>>[];

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
    }

    return {
      'role': 'server',
      'fingerprints': fingerprints,
    };
  }

  /// Extract RTP parameters from a local SDP offer for the first audio m= section.
  Map<String, dynamic> _extractRtpParameters(String sdp) {
    final lines = sdp.split('\n');
    final codecs = <Map<String, dynamic>>[];
    final headerExtensions = <Map<String, dynamic>>[];
    final encodings = <Map<String, dynamic>>[];
    String? cname;
    int? ssrc;
    bool inAudioSection = false;

    // Parse payload types from m= line
    final payloadTypes = <int>[];

    for (final rawLine in lines) {
      final line = rawLine.trim();

      if (line.startsWith('m=audio')) {
        inAudioSection = true;
        // m=audio 9 UDP/TLS/RTP/SAVPF 111 9 0 ...
        final parts = line.split(' ');
        for (int i = 3; i < parts.length; i++) {
          final pt = int.tryParse(parts[i]);
          if (pt != null) payloadTypes.add(pt);
        }
        continue;
      }

      if (line.startsWith('m=') && !line.startsWith('m=audio')) {
        inAudioSection = false;
        continue;
      }

      if (!inAudioSection) continue;

      // Parse rtpmap: a=rtpmap:111 opus/48000/2
      if (line.startsWith('a=rtpmap:')) {
        final content = line.substring('a=rtpmap:'.length);
        final spaceIdx = content.indexOf(' ');
        if (spaceIdx == -1) continue;
        final pt = int.tryParse(content.substring(0, spaceIdx));
        if (pt == null) continue;
        final codecStr = content.substring(spaceIdx + 1);
        final codecParts = codecStr.split('/');
        final encodingName = codecParts[0];
        final clockRate = int.tryParse(codecParts.length > 1 ? codecParts[1] : '') ?? 48000;
        final channels = int.tryParse(codecParts.length > 2 ? codecParts[2] : '') ?? 1;

        codecs.add({
          'mimeType': 'audio/$encodingName',
          'payloadType': pt,
          'clockRate': clockRate,
          'channels': channels,
          'parameters': <String, dynamic>{},
          'rtcpFeedback': <Map<String, String>>[],
        });
      }

      // Parse fmtp: a=fmtp:111 minptime=10;useinbandfec=1
      if (line.startsWith('a=fmtp:')) {
        final content = line.substring('a=fmtp:'.length);
        final spaceIdx = content.indexOf(' ');
        if (spaceIdx == -1) continue;
        final pt = int.tryParse(content.substring(0, spaceIdx));
        if (pt == null) continue;
        final paramsStr = content.substring(spaceIdx + 1);
        final params = <String, dynamic>{};
        for (final param in paramsStr.split(';')) {
          final eqIdx = param.indexOf('=');
          if (eqIdx != -1) {
            final key = param.substring(0, eqIdx).trim();
            final value = param.substring(eqIdx + 1).trim();
            // Try to parse as int
            final intValue = int.tryParse(value);
            params[key] = intValue ?? value;
          }
        }
        // Find the matching codec and add parameters
        for (final codec in codecs) {
          if (codec['payloadType'] == pt) {
            codec['parameters'] = params;
            break;
          }
        }
      }

      // Parse rtcp-fb: a=rtcp-fb:111 transport-cc
      if (line.startsWith('a=rtcp-fb:')) {
        final content = line.substring('a=rtcp-fb:'.length);
        final spaceIdx = content.indexOf(' ');
        if (spaceIdx == -1) continue;
        final pt = int.tryParse(content.substring(0, spaceIdx));
        if (pt == null) continue;
        final fbStr = content.substring(spaceIdx + 1).trim();
        final fbParts = fbStr.split(' ');
        for (final codec in codecs) {
          if (codec['payloadType'] == pt) {
            (codec['rtcpFeedback'] as List).add({
              'type': fbParts[0],
              'parameter': fbParts.length > 1 ? fbParts.sublist(1).join(' ') : '',
            });
            break;
          }
        }
      }

      // Parse extmap: a=extmap:1 urn:ietf:params:rtp-hdrext:sdes:mid
      if (line.startsWith('a=extmap:')) {
        final content = line.substring('a=extmap:'.length);
        final parts = content.split(' ');
        if (parts.length >= 2) {
          // Handle direction prefix like "1/sendonly"
          final idPart = parts[0].split('/')[0];
          final id = int.tryParse(idPart);
          if (id != null) {
            headerExtensions.add({
              'uri': parts[1].trim(),
              'id': id,
              'encrypt': false,
              'parameters': <String, dynamic>{},
            });
          }
        }
      }

      // Parse SSRC: a=ssrc:12345678 cname:some-cname
      if (line.startsWith('a=ssrc:')) {
        final content = line.substring('a=ssrc:'.length);
        final spaceIdx = content.indexOf(' ');
        if (spaceIdx != -1) {
          ssrc ??= int.tryParse(content.substring(0, spaceIdx));
          final attrStr = content.substring(spaceIdx + 1);
          if (attrStr.startsWith('cname:')) {
            cname = attrStr.substring('cname:'.length).trim();
          }
        }
      }
    }

    // Only include opus codec (first audio codec that mediasoup supports)
    final opusCodec = codecs.firstWhere(
      (c) => (c['mimeType'] as String).toLowerCase() == 'audio/opus',
      orElse: () => codecs.isNotEmpty ? codecs.first : <String, dynamic>{},
    );

    if (ssrc != null) {
      encodings.add({'ssrc': ssrc});
    }

    return {
      'codecs': opusCodec.isNotEmpty ? [opusCodec] : codecs.take(1).toList(),
      'headerExtensions': headerExtensions,
      'encodings': encodings,
      'rtcp': {
        'cname': cname ?? '',
        'reducedSize': true,
      },
    };
  }

  /// Build a remote SDP answer from the mediasoup server's transport parameters.
  /// This tells the local PeerConnection where the server is and how to connect.
  String _buildRemoteAnswerSdp({
    required Map<String, dynamic> iceParams,
    required List<dynamic> iceCandidates,
    required Map<String, dynamic> serverDtls,
    required String localOfferSdp,
  }) {
    final offerLines = localOfferSdp.split('\n');

    // Extract mid from offer
    String mid = '0';
    for (final line in offerLines) {
      final trimmed = line.trim();
      if (trimmed.startsWith('a=mid:')) {
        mid = trimmed.substring('a=mid:'.length).trim();
        break;
      }
    }

    // Extract the m= audio line from the offer (to match codec payload types)
    String mLine = 'm=audio 7 UDP/TLS/RTP/SAVPF 111';
    for (final line in offerLines) {
      if (line.trim().startsWith('m=audio')) {
        mLine = line.trim();
        break;
      }
    }

    // Extract codec lines from offer
    final codecLines = <String>[];
    bool inAudio = false;
    for (final rawLine in offerLines) {
      final line = rawLine.trim();
      if (line.startsWith('m=audio')) {
        inAudio = true;
        continue;
      }
      if (line.startsWith('m=') && !line.startsWith('m=audio')) {
        inAudio = false;
        continue;
      }
      if (!inAudio) continue;
      if (line.startsWith('a=rtpmap:') ||
          line.startsWith('a=fmtp:') ||
          line.startsWith('a=rtcp-fb:')) {
        codecLines.add(line);
      }
    }

    // Server DTLS fingerprint — prefer sha-256
    final fingerprints = serverDtls['fingerprints'] as List<dynamic>? ?? [];
    final fingerprint = fingerprints.firstWhere(
      (f) => f['algorithm'] == 'sha-256',
      orElse: () => fingerprints.isNotEmpty ? fingerprints[0] : null,
    );

    final sb = StringBuffer();
    sb.writeln('v=0');
    sb.writeln('o=- 0 0 IN IP4 0.0.0.0');
    sb.writeln('s=-');
    sb.writeln('t=0 0');
    sb.writeln('a=ice-lite'); // mediasoup is ICE-lite
    sb.writeln('a=group:BUNDLE $mid');
    sb.writeln('a=msid-semantic: WMS');
    // Media section
    sb.writeln(mLine);
    sb.writeln('c=IN IP4 127.0.0.1');
    sb.writeln('a=rtcp:9 IN IP4 0.0.0.0');
    // ICE parameters
    sb.writeln('a=ice-ufrag:${iceParams['usernameFragment']}');
    sb.writeln('a=ice-pwd:${iceParams['password']}');
    // DTLS
    if (fingerprint != null) {
      sb.writeln('a=fingerprint:${fingerprint['algorithm']} ${fingerprint['value']}');
    }
    sb.writeln('a=setup:active'); // server (remote) initiates DTLS, client is passive
    sb.writeln('a=mid:$mid');
    sb.writeln('a=recvonly'); // server receives audio from us
    sb.writeln('a=rtcp-mux');
    // Codecs
    for (final line in codecLines) {
      sb.writeln(line);
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

  /// Get audio level from the audio track (approximate, null if unavailable).
  Future<double?> getAudioLevel() async {
    if (_peerConnection != null && _localStream != null) {
      try {
        final audioTracks = _localStream!.getAudioTracks();
        if (audioTracks.isNotEmpty) {
          final stats = await _peerConnection!.getStats(audioTracks.first);
          for (final report in stats) {
            if (report.type == 'media-source' || report.type == 'outbound-rtp') {
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
            }
          }
        }
      } catch (_) {}
    }
    return null;
  }

  /// Collects a diagnostics snapshot to troubleshoot capture vs send vs server receive.
  /// Avoids secrets; safe to paste into issue reports.
  Future<Map<String, dynamic>> diagnosticsSnapshot() async {
    final out = <String, dynamic>{
      'hasLocalStream': _localStream != null,
      'hasPeerConnection': _peerConnection != null,
      'lastIceState': _lastIceState?.toString(),
      'lastConnectionState': _lastConnectionState?.toString(),
    };

    // Track info
    try {
      final tracks = _localStream?.getAudioTracks() ?? [];
      out['audioTracks'] = tracks.map((t) {
        return {
          'id': t.id,
          'enabled': t.enabled,
          'muted': t.muted,
        };
      }).toList();
    } catch (e) {
      out['audioTracksError'] = e.toString();
    }

    // Stats (best-effort)
    try {
      if (_peerConnection != null && _localStream != null) {
        final tracks = _localStream!.getAudioTracks();
        final stats = tracks.isNotEmpty
            ? await _peerConnection!.getStats(tracks.first)
            : await _peerConnection!.getStats();

        Map<String, dynamic>? mediaSource;
        Map<String, dynamic>? outboundRtp;

        for (final report in stats) {
          final type = report.type;
          final values = Map<String, dynamic>.from(report.values);
          if (type == 'media-source' && mediaSource == null) {
            mediaSource = values;
          }
          if (type == 'outbound-rtp' && outboundRtp == null) {
            outboundRtp = values;
          }
        }

        // Keep only a small, high-signal subset.
        out['mediaSource'] = mediaSource == null
            ? null
            : {
                'audioLevel': mediaSource['audioLevel'],
                'totalAudioEnergy': mediaSource['totalAudioEnergy'],
                'totalSamplesDuration': mediaSource['totalSamplesDuration'],
              };

        out['outboundRtp'] = outboundRtp == null
            ? null
            : {
                'bytesSent': outboundRtp['bytesSent'],
                'packetsSent': outboundRtp['packetsSent'],
                'roundTripTime': outboundRtp['roundTripTime'],
                'targetBitrate': outboundRtp['targetBitrate'],
              };
      }
    } catch (e) {
      out['statsError'] = e.toString();
    }

    return out;
  }

  Future<void> stopAudioCapture() async {
    if (_peerConnection != null) {
      await _peerConnection!.close();
      _peerConnection = null;
    }
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
