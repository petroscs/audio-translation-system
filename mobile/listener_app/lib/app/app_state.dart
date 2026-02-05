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
  String? _consumerId;
  final List<Map<String, dynamic>> _captions = [];
  bool _captionsEnabled = true;

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
      _consumerId = null;
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

  Future<void> startListening({
    required String dtlsParameters,
    required String producerId,
  }) async {
    await _runBusy(() async {
      if (_activeSession == null) {
        await _startSessionInternal(SessionRole.listener);
      }
      await _signalingClient.start();

      final transport = await _signalingClient.createTransport(
        sessionId: _activeSession!.id,
        direction: TransportDirection.receive,
      );
      _activeTransportId = transport.transportId;

      await _signalingClient.connectTransport(
        transportId: transport.transportId,
        dtlsParameters: dtlsParameters,
      );

      final consumer = await _signalingClient.consume(
        transportId: transport.transportId,
        producerId: producerId,
      );
      _consumerId = consumer.consumerId;

      await _signalingClient.joinSession(_activeSession!.id);

      _signalingClient.removeCaptionHandler();
      _signalingClient.onCaption((caption) {
        _captions.add(caption);
        if (_captions.length > 50) {
          _captions.removeAt(0);
        }
        notifyListeners();
      });

      _errorMessage = null;
    });
  }

  Future<void> stopListening() async {
    await _runBusy(() async {
      _signalingClient.removeCaptionHandler();
      _captions.clear();
      await _signalingClient.stop();
      await _endSessionInternal();
    });
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
    _activeSession = await _sessionService.endSession(_activeSession!.id);
    _consumerId = null;
    _activeTransportId = null;
    _captions.clear();
    _errorMessage = null;
  }

  void handleLifecycleChange(AppLifecycleState state) {
    if (state == AppLifecycleState.paused || state == AppLifecycleState.inactive) {
      _signalingClient.stop();
    }
  }

  Future<void> _runBusy(Future<void> Function() action) async {
    _isBusy = true;
    _errorMessage = null;
    notifyListeners();
    try {
      await action();
    } catch (error) {
      _errorMessage = error.toString();
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
