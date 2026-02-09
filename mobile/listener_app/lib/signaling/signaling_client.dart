import 'package:flutter/foundation.dart';
import 'package:signalr_core/signalr_core.dart';

import '../config/api_config.dart';
import '../models/enums.dart';
import '../models/signaling_models.dart';
import '../services/auth_service.dart';

class SignalingClient {
  SignalingClient(this._authService);

  final AuthService _authService;
  HubConnection? _connection;

  HubConnectionState get state => _connection?.state ?? HubConnectionState.disconnected;

  Future<void> start() async {
    if (state == HubConnectionState.connected || state == HubConnectionState.connecting) {
      return;
    }

    final connection = HubConnectionBuilder()
        .withUrl(
          ApiConfig.signalingUri().toString(),
          HttpConnectionOptions(
            accessTokenFactory: () async => _authService.accessToken ?? '',
          ),
        )
        .withAutomaticReconnect()
        .build();

    _connection = connection;
    try {
      debugPrint('[SignalingClient] Connecting to ${ApiConfig.signalingUri()}...');
      await connection.start();
      debugPrint('[SignalingClient] Connected.');
    } catch (e, st) {
      debugPrint('[SignalingClient] connection.start() failed: $e');
      debugPrint('[SignalingClient] $st');
      rethrow;
    }
  }

  Future<void> stop() async {
    if (_connection == null) {
      return;
    }
    await _connection!.stop();
  }

  Future<TransportCreated> createTransport({
    required String sessionId,
    required TransportDirection direction,
  }) async {
    try {
      debugPrint('[SignalingClient] CreateTransport...');
      final result = await _invoke('CreateTransport', {
        'SessionId': sessionId,
        'Direction': direction.apiValue,
      });
      debugPrint('[SignalingClient] CreateTransport raw result keys: ${result.keys.toList()}');
      return TransportCreated.fromJson(result);
    } catch (e, st) {
      debugPrint('[SignalingClient] createTransport failed: $e');
      debugPrint('[SignalingClient] $st');
      rethrow;
    }
  }

  Future<void> connectTransport({
    required String transportId,
    required String dtlsParameters,
  }) async {
    await _invoke('ConnectTransport', {
      'TransportId': transportId,
      'DtlsParameters': dtlsParameters,
    });
  }

  Future<ProducerCreated> produce({
    required String transportId,
    required MediaKind kind,
    required String rtpParameters,
  }) async {
    final result = await _invoke('Produce', {
      'TransportId': transportId,
      'Kind': kind.apiValue,
      'RtpParameters': rtpParameters,
    });
    return ProducerCreated.fromJson(result);
  }

  Future<ConsumerCreated> consume({
    required String transportId,
    required String producerId,
  }) async {
    try {
      debugPrint('[SignalingClient] Consume transportId=$transportId producerId=$producerId');
      final result = await _invoke('Consume', {
        'TransportId': transportId,
        'ProducerId': producerId,
      });
      debugPrint('[SignalingClient] Consume raw result keys: ${result.keys.toList()}');
      return ConsumerCreated.fromJson(result);
    } catch (e, st) {
      debugPrint('[SignalingClient] consume failed: $e');
      debugPrint('[SignalingClient] $st');
      rethrow;
    }
  }

  Future<void> joinSession(String sessionId) async {
    if (_connection == null || state != HubConnectionState.connected) {
      throw Exception('SignalR is not connected.');
    }
    await _connection!.invoke('JoinSession', args: [sessionId]);
  }

  void onCaption(void Function(Map<String, dynamic> caption) callback) {
    _connection?.on('Caption', (arguments) {
      if (arguments != null && arguments.isNotEmpty) {
        final data = arguments[0];
        if (data is Map) {
          callback(Map<String, dynamic>.from(data));
        }
      }
    });
  }

  void removeCaptionHandler() {
    _connection?.off('Caption');
  }

  Future<Map<String, dynamic>> _invoke(String method, Map<String, dynamic> payload) async {
    if (_connection == null || state != HubConnectionState.connected) {
      throw Exception('SignalR is not connected.');
    }

    debugPrint('[SignalingClient] _invoke $method...');
    var result = await _connection!.invoke(method, args: [payload]);
    debugPrint('[SignalingClient] _invoke $method result type: ${result.runtimeType}');
    if (result is List && result.isNotEmpty) {
      result = result.first;
    }
    if (result is Map<String, dynamic>) {
      return result;
    }
    if (result is Map) {
      return Map<String, dynamic>.from(result);
    }
    if (result == null) {
      return <String, dynamic>{};
    }
    throw Exception('Unexpected response for $method: ${result.runtimeType}');
  }
}
