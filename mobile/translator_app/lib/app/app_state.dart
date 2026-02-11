import 'dart:convert';

import 'package:flutter/material.dart';

import '../models/channel.dart';
import '../models/enums.dart';
import '../models/event.dart';
import '../models/session.dart';
import '../services/api_client.dart';
import '../services/auth_service.dart';
import '../services/event_service.dart';
import '../services/session_service.dart';
import '../signaling/signaling_client.dart';
import '../webrtc/webrtc_service.dart';

class AppState extends ChangeNotifier {
  AppState() {
    _authService = AuthService();
    _apiClient = ApiClient(_authService);
    _eventService = EventService(_apiClient);
    _sessionService = SessionService(_apiClient);
    _signalingClient = SignalingClient(_authService);
    _webRtcService = WebRtcService();
  }

  late final AuthService _authService;
  late final ApiClient _apiClient;
  late final EventService _eventService;
  late final SessionService _sessionService;
  late final SignalingClient _signalingClient;
  late final WebRtcService _webRtcService;

  bool _isInitializing = true;
  bool _isBusy = false;
  String? _errorMessage;

  List<Event> _events = [];
  List<Channel> _channels = [];
  Event? _selectedEvent;
  Channel? _selectedChannel;
  Session? _activeSession;
  String? _activeTransportId;
  String? _producerId;
  String? _mediasoupProducerId;

  bool get isInitializing => _isInitializing;
  bool get isBusy => _isBusy;
  bool get isAuthenticated => _authService.isAuthenticated;
  bool get isAdmin => _authService.isAdmin;
  String? get errorMessage => _errorMessage;

  List<Event> get events => _events;
  List<Channel> get channels => _channels;
  Event? get selectedEvent => _selectedEvent;
  Channel? get selectedChannel => _selectedChannel;
  Session? get activeSession => _activeSession;
  String? get activeTransportId => _activeTransportId;
  String? get producerId => _producerId;
  String? get mediasoupProducerId => _mediasoupProducerId;
  WebRtcService get webRtcService => _webRtcService;

  AuthService get authService => _authService;
  SignalingClient get signalingClient => _signalingClient;

  Future<void> initialize() async {
    await _authService.loadTokens();
    _isInitializing = false;
    notifyListeners();
  }

  Future<void> login(String usernameOrEmail, String password) async {
    await _runBusy(() async {
      await _authService.login(usernameOrEmail, password);
      _errorMessage = null;
    });
  }

  Future<void> logout() async {
    await _runBusy(() async {
      await _authService.logout();
      _events = [];
      _channels = [];
      _selectedEvent = null;
      _selectedChannel = null;
      _activeSession = null;
      _producerId = null;
      _mediasoupProducerId = null;
      _activeTransportId = null;
      _errorMessage = null;
    });
  }

  Future<void> loadEvents() async {
    await _runBusy(() async {
      _events = await _eventService.fetchEvents();
      _errorMessage = null;
    });
  }

  Future<void> loadChannels(Event event) async {
    await _runBusy(() async {
      _channels = await _eventService.fetchChannels(event.id);
      _errorMessage = null;
    });
  }

  void selectEvent(Event event) {
    _selectedEvent = event;
    _selectedChannel = null;
    _channels = [];
    notifyListeners();
  }

  void selectChannel(Channel channel) {
    _selectedChannel = channel;
    notifyListeners();
  }

  /// Create a session for a specific channel from the channel list screen.
  /// Sets _activeSession and _selectedChannel on success.
  Future<void> createSessionForChannel(Channel channel) async {
    if (_selectedEvent == null) {
      throw Exception('Select an event first.');
    }
    await _runBusy(() async {
      _activeSession = await _sessionService.createSession(
        eventId: _selectedEvent!.id,
        channelId: channel.id,
        role: SessionRole.translator,
      );
      _selectedChannel = channel;
      _errorMessage = null;
    });
  }

  Future<void> startSession(SessionRole role) async {
    await _runBusy(() async {
      await _startSessionInternal(role);
    });
  }

  Future<void> endSession() async {
    if (_producerId != null) {
      throw Exception('Stop broadcasting before ending the session.');
    }
    await _runBusy(() async {
      await _endSessionInternal();
    });
  }

  Future<void> startBroadcast() async {
    await _runBusy(() async {
      // 1. Capture audio
      await _webRtcService.startAudioCapture();

      // 2. Create session if needed (or if the active session doesn't match the current selection)
      final sessionMatches = _activeSession != null &&
          _activeSession!.eventId == _selectedEvent?.id &&
          _activeSession!.channelId == _selectedChannel?.id;
      if (!sessionMatches) {
        _activeSession = null;
        await _startSessionInternal(SessionRole.translator);
      }

      // 3. Connect signaling
      await _signalingClient.start();

      // 4. Create a send transport on the server
      final transport = await _signalingClient.createTransport(
        sessionId: _activeSession!.id,
        direction: TransportDirection.send,
      );
      _activeTransportId = transport.transportId;
      debugPrint('[AppState] Transport created: ${transport.transportId}');

      // 5. Create a real PeerConnection and negotiate with the server's ICE/DTLS
      final sendParams = await _webRtcService.connectSendTransport(
        iceParametersJson: transport.iceParameters,
        iceCandidatesJson: transport.iceCandidates,
        dtlsParametersJson: transport.dtlsParameters,
      );
      debugPrint('[AppState] PeerConnection negotiated — sending real DTLS + RTP params');

      // 6. Send real DTLS fingerprint to server
      await _signalingClient.connectTransport(
        transportId: transport.transportId,
        dtlsParameters: sendParams.dtlsParameters,
      );
      debugPrint('[AppState] Transport connected with real DTLS params');

      // 7. Send real RTP parameters to server and create producer
      final producer = await _signalingClient.produce(
        transportId: transport.transportId,
        kind: MediaKind.audio,
        rtpParameters: sendParams.rtpParameters,
      );
      _producerId = producer.producerId;
      _mediasoupProducerId = producer.mediasoupProducerId;
      debugPrint('[AppState] Producer created: $_producerId (mediasoup: $_mediasoupProducerId)');
      _errorMessage = null;
    });
  }

  Future<void> stopBroadcast() async {
    await _runBusy(() async {
      await _signalingClient.stop();
      await _webRtcService.stopAudioCapture();
      // Clear only producer/transport state; session stays active so user can
      // start broadcasting again on the same session.
      _producerId = null;
      _mediasoupProducerId = null;
      _activeTransportId = null;
      _errorMessage = null;

      if (_activeSession != null) {
        try {
          await _sessionService.pauseBroadcast(_activeSession!.id);
        } catch (e) {
          debugPrint('[AppState] Pause broadcast failed (recording/STT may not stop): $e');
        }
      }
    });
  }

  Future<void> _endSessionInternal() async {
    if (_activeSession == null) {
      return;
    }
    await _sessionService.endSession(_activeSession!.id);
    _activeSession = null;
    _producerId = null;
    _mediasoupProducerId = null;
    _activeTransportId = null;
    _errorMessage = null;
  }

  Future<void> _startSessionInternal(SessionRole role) async {
    final eventId = _selectedEvent?.id;
    final channelId = _selectedChannel?.id;
    if (eventId == null || channelId == null) {
      throw Exception('Event and channel must be selected.');
    }

    _activeSession = await _sessionService.createSession(
      eventId: eventId,
      channelId: channelId,
      role: role,
    );
    _errorMessage = null;
  }

  void handleLifecycleChange(AppLifecycleState state) {
    // Only stop on detached (app being destroyed).
    // On desktop, 'inactive' fires on window focus loss — must NOT kill the broadcast.
    // On mobile, 'paused' fires on background — acceptable to keep running briefly.
    if (state == AppLifecycleState.detached) {
      _signalingClient.stop();
      _webRtcService.stopAudioCapture();
    }
  }

  /// Get producer stats to verify audio is being sent to mediasoup
  /// Returns a map with stats including bytesSent, packetsSent, etc.
  Future<Map<String, dynamic>?> getProducerStats() async {
    if (_activeSession == null || _mediasoupProducerId == null) {
      return null;
    }

    try {
      final response = await _apiClient.get(
        '/sessions/${_activeSession!.id}/producer-stats?mediasoupProducerId=$_mediasoupProducerId',
      );

      if (response.statusCode == 200) {
        return jsonDecode(response.body) as Map<String, dynamic>;
      } else {
        debugPrint('[AppState] Failed to get producer stats: ${response.statusCode}');
        return null;
      }
    } catch (e) {
      debugPrint('[AppState] Error getting producer stats: $e');
      return null;
    }
  }

  Future<void> _runBusy(Future<void> Function() action) async {
    _isBusy = true;
    _errorMessage = null;
    notifyListeners();
    try {
      await action();
    } catch (error, stackTrace) {
      _errorMessage = error.toString();
      // Log full stack trace so it appears in console/terminal when running via `flutter run`
      debugPrint('=== Translator app error ===');
      debugPrint(error.toString());
      debugPrint('Stack trace:\n$stackTrace');
      debugPrint('==========================');
    } finally {
      _isBusy = false;
      notifyListeners();
    }
  }

  @override
  void dispose() {
    _signalingClient.stop();
    _webRtcService.stopAudioCapture();
    super.dispose();
  }
}
