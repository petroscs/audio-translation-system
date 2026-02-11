import 'dart:async';
import 'package:flutter/material.dart';
import 'package:signalr_core/signalr_core.dart';
import 'package:wakelock_plus/wakelock_plus.dart';

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
  String? _consumerId;
  String? _currentProducerId;
  String? _broadcastSessionId;
  bool _isSwitchingProducer = false;
  final List<Map<String, dynamic>> _captions = [];
  bool _captionsEnabled = true;
  DateTime? _lastCaptionReceivedAt;
  Timer? _audioLevelTimer;
  double? _currentAudioLevel;

  bool get isInitializing => _isInitializing;
  bool get isBusy => _isBusy;
  bool get isAuthenticated => _authService.isAuthenticated;
  String? get errorMessage => _errorMessage;

  List<Event> get events => _events;
  List<Channel> get channels => _channels;
  Event? get selectedEvent => _selectedEvent;
  Channel? get selectedChannel => _selectedChannel;
  Session? get activeSession => _activeSession;
  String? get activeTransportId => _activeTransportId;
  String? get consumerId => _consumerId;
  List<Map<String, dynamic>> get captions => List.unmodifiable(_captions);
  bool get captionsEnabled => _captionsEnabled;
  WebRtcService get webRtcService => _webRtcService;

  AuthService get authService => _authService;
  SignalingClient get signalingClient => _signalingClient;

  bool get isSignalingConnected => _signalingClient.state == HubConnectionState.connected;
  bool get isReceivingCaptions {
    if (_captions.isEmpty) return false;
    // Consider receiving if we got captions in the last 5 seconds
    if (_lastCaptionReceivedAt == null) return false;
    return DateTime.now().difference(_lastCaptionReceivedAt!).inSeconds < 5;
  }
  double? get currentAudioLevel => _currentAudioLevel;
  bool get isReceivingAudio => _currentAudioLevel != null && _currentAudioLevel! > 0.1;

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
      await _disableWakeLock();
      await _authService.logout();
      _events = [];
      _channels = [];
      _selectedEvent = null;
      _selectedChannel = null;
      _activeSession = null;
      _consumerId = null;
      _activeTransportId = null;
      _currentProducerId = null;
      _broadcastSessionId = null;
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

  void toggleCaptions() {
    _captionsEnabled = !_captionsEnabled;
    notifyListeners();
  }

  Future<void> startSession(SessionRole role) async {
    await _runBusy(() async {
      await _startSessionInternal(role);
    });
  }

  Future<void> endSession() async {
    await _runBusy(() async {
      await _endSessionInternal();
    });
  }

  /// Join a session by its ID (e.g. from a QR code).
  /// Resolves event, channel and producer from the backend, then starts listening.
  Future<void> startListeningBySessionId(String sessionId) async {
    final trimmed = sessionId.trim();
    if (trimmed.isEmpty) {
      _errorMessage = 'Please enter or scan a session ID.';
      notifyListeners();
      return;
    }
    await _runBusy(() async {
      // 1. Fetch join info (producer, event, channel) from backend
      final joinInfo = await _sessionService.getActiveProducerJoinInfo(trimmed);
      if (joinInfo == null) {
        throw Exception('No active broadcast for this session.');
      }

      // 2. Load events if needed and find matching event
      if (_events.isEmpty) {
        _events = await _eventService.fetchEvents();
      }
      final event = _events.cast<Event?>().firstWhere(
        (e) => e!.id == joinInfo.eventId,
        orElse: () => null,
      );
      if (event == null) {
        throw Exception('Event not found for this session.');
      }

      // 3. Load channels for the event and find matching channel
      _channels = await _eventService.fetchChannels(event.id);
      final channel = _channels.cast<Channel?>().firstWhere(
        (c) => c!.id == joinInfo.channelId,
        orElse: () => null,
      );
      if (channel == null) {
        throw Exception('Channel not found for this session.');
      }

      // 4. Set event + channel selection
      _selectedEvent = event;
      _selectedChannel = channel;

      // 5. Keep the translator session id for push updates.
      _broadcastSessionId = trimmed;

      // 5. Now run the full listen flow inline (same as startListening)
      await _startListeningInternal(joinInfo.producerId);
    });
  }

  Future<void> startListening({
    required String producerId,
  }) async {
    final trimmedProducerId = producerId.trim();
    if (trimmedProducerId.isEmpty) {
      _errorMessage = 'Please enter the Producer ID from the translator app (shown after Start Broadcast).';
      notifyListeners();
      return;
    }
    await _runBusy(() async {
      _broadcastSessionId = null;
      await _startListeningInternal(trimmedProducerId);
    });
  }

  /// Shared listen logic used by both [startListening] and [startListeningBySessionId].
  /// Must be called inside [_runBusy].
  Future<void> _startListeningInternal(String producerId) async {
    // 1. Create session if needed
    if (_activeSession == null) {
      await _startSessionInternal(SessionRole.listener);
    }

    // 2. Connect signaling
    await _signalingClient.start();

    // 3. Create a receive transport on the server
    final transport = await _signalingClient.createTransport(
      sessionId: _activeSession!.id,
      direction: TransportDirection.receive,
    );
    _activeTransportId = transport.transportId;
    debugPrint('[AppState] Recv transport created: ${transport.transportId}');

    // 4. Create a consumer first (we need the consumer's RTP params for SDP)
    final consumer = await _signalingClient.consume(
      transportId: transport.transportId,
      producerId: producerId,
    );
    _consumerId = consumer.consumerId;
    debugPrint('[AppState] Consumer created: ${consumer.consumerId}');

    // 5. Create a real PeerConnection and negotiate with server's ICE/DTLS
    final recvParams = await _webRtcService.connectRecvTransport(
      iceParametersJson: transport.iceParameters,
      iceCandidatesJson: transport.iceCandidates,
      dtlsParametersJson: transport.dtlsParameters,
      consumerRtpParametersJson: consumer.rtpParameters,
    );
    debugPrint('[AppState] PeerConnection negotiated for receiving');

    // 6. Send real DTLS fingerprint to server
    await _signalingClient.connectTransport(
      transportId: transport.transportId,
      dtlsParameters: recvParams.dtlsParameters,
    );
    debugPrint('[AppState] Transport connected with real DTLS params');

    // 7. Join session for captions
    await _signalingClient.joinSession(_activeSession!.id);

    _signalingClient.removeCaptionHandler();
    _signalingClient.onCaption((caption) {
      _captions.add(caption);
      _lastCaptionReceivedAt = DateTime.now();
      if (_captions.length > 50) {
        _captions.removeAt(0);
      }
      notifyListeners();
    });

    _currentProducerId = producerId;
    if (_broadcastSessionId != null) {
      await _signalingClient.subscribeToBroadcastSession(_broadcastSessionId!);
      _signalingClient.removeActiveProducerChangedHandler();
      _signalingClient.onActiveProducerChanged((sessionId, producerId) {
        if (_broadcastSessionId == null || sessionId != _broadcastSessionId) {
          return;
        }
        if (producerId == _currentProducerId || _isSwitchingProducer) {
          return;
        }
        unawaited(_switchToProducer(producerId));
      });
    } else {
      _signalingClient.removeActiveProducerChangedHandler();
    }

    // Start monitoring audio levels
    _startAudioLevelMonitoring();
    await _enableWakeLock();

    _errorMessage = null;
  }

  Future<void> stopListening() async {
    await _runBusy(() async {
      _signalingClient.removeActiveProducerChangedHandler();
      if (_broadcastSessionId != null) {
        try {
          await _signalingClient.unsubscribeFromBroadcastSession(_broadcastSessionId!);
        } catch (_) {}
      }
      _stopAudioLevelMonitoring();
      _signalingClient.removeCaptionHandler();
      _captions.clear();
      _lastCaptionReceivedAt = null;
      await _signalingClient.stop();
      await _webRtcService.stopRemoteAudio();
      await _endSessionInternal();
      await _disableWakeLock();
    });
  }

  Future<void> _switchToProducer(String newProducerId) async {
    if (_activeSession == null || _isSwitchingProducer) {
      return;
    }

    _isSwitchingProducer = true;
    try {
      _stopAudioLevelMonitoring();
      _signalingClient.removeCaptionHandler();
      _signalingClient.removeActiveProducerChangedHandler();
      await _signalingClient.stop();
      await _webRtcService.stopRemoteAudio();
      _consumerId = null;
      _activeTransportId = null;

      await _startListeningInternal(newProducerId);
      _errorMessage = null;
    } catch (error, stackTrace) {
      _errorMessage = error.toString();
      debugPrint('[AppState] Failed to switch producer: $error');
      debugPrint('Stack trace:\n$stackTrace');
    } finally {
      _isSwitchingProducer = false;
      notifyListeners();
    }
  }

  void _startAudioLevelMonitoring() {
    _stopAudioLevelMonitoring();
    _audioLevelTimer = Timer.periodic(const Duration(milliseconds: 200), (_) async {
      if (_consumerId == null) {
        _currentAudioLevel = null;
        return;
      }

      try {
        final level = await _webRtcService.getRemoteAudioLevel();
        if (_currentAudioLevel != level) {
          _currentAudioLevel = level;
          notifyListeners();
        }
      } catch (e) {
        // If we can't get audio level, fall back to caption-based detection
        _currentAudioLevel = null;
      }
    });
  }

  void _stopAudioLevelMonitoring() {
    _audioLevelTimer?.cancel();
    _audioLevelTimer = null;
    _currentAudioLevel = null;
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

  Future<void> _endSessionInternal() async {
    if (_activeSession == null) {
      return;
    }
    await _sessionService.endSession(_activeSession!.id);
    _activeSession = null;
    _consumerId = null;
    _activeTransportId = null;
    _currentProducerId = null;
    _broadcastSessionId = null;
    _isSwitchingProducer = false;
    _captions.clear();
    _lastCaptionReceivedAt = null;
    await _disableWakeLock();
    _errorMessage = null;
  }

  void handleLifecycleChange(AppLifecycleState state) {
    // Only stop on detached (app being destroyed).
    // On desktop, 'inactive' fires on window focus loss — must NOT kill the connection.
    if (state == AppLifecycleState.detached) {
      _signalingClient.stop();
      unawaited(_disableWakeLock());
    }
  }

  Future<void> _enableWakeLock() async {
    try {
      await WakelockPlus.enable();
    } catch (e) {
      debugPrint('[AppState] Failed to enable wake lock: $e');
    }
  }

  Future<void> _disableWakeLock() async {
    try {
      await WakelockPlus.disable();
    } catch (e) {
      debugPrint('[AppState] Failed to disable wake lock: $e');
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
      debugPrint('=== Listener app error ===');
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
    _stopAudioLevelMonitoring();
    _signalingClient.removeActiveProducerChangedHandler();
    _signalingClient.stop();
    _webRtcService.stopAudioCapture();
    _webRtcService.stopRemoteAudio();
    unawaited(_disableWakeLock());
    super.dispose();
  }
}
