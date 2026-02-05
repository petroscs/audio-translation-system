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
    await connection.start();
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
    final result = await _invoke('CreateTransport', {
      'SessionId': sessionId,
      'Direction': direction.apiValue,
    });
    return TransportCreated.fromJson(result);
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
    final result = await _invoke('Consume', {
      'TransportId': transportId,
      'ProducerId': producerId,
    });
    return ConsumerCreated.fromJson(result);
  }

  Future<Map<String, dynamic>> _invoke(String method, Map<String, dynamic> payload) async {
    if (_connection == null || state != HubConnectionState.connected) {
      throw Exception('SignalR is not connected.');
    }

    final result = await _connection!.invoke(method, args: [payload]);
    if (result is Map<String, dynamic>) {
      return result;
    }
    if (result is Map) {
      return Map<String, dynamic>.from(result);
    }
    if (result == null) {
      return <String, dynamic>{};
    }
    throw Exception('Unexpected response for $method.');
  }
}
