import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../app/app_state.dart';
import 'audio_reception_indicator.dart';
import 'qr_scanner_screen.dart';

class ListenerDashboard extends StatefulWidget {
  const ListenerDashboard({super.key});

  @override
  State<ListenerDashboard> createState() => _ListenerDashboardState();
}

class _ListenerDashboardState extends State<ListenerDashboard> {
  final _sessionIdController = TextEditingController();
  final _captionScrollController = ScrollController();

  @override
  void dispose() {
    _sessionIdController.dispose();
    _captionScrollController.dispose();
    super.dispose();
  }

  /// Extract session ID from a raw GUID or URL like listenerapp://session/{id}.
  static String? _parseSessionId(String raw) {
    final trimmed = raw.trim();
    final uri = Uri.tryParse(trimmed);
    if (uri != null && uri.pathSegments.length >= 2 && uri.pathSegments[0] == 'session') {
      return uri.pathSegments[1];
    }
    return trimmed;
  }

  Future<void> _joinBySessionId(BuildContext context, AppState appState) async {
    await appState.startListeningBySessionId(_sessionIdController.text.trim());
    if (!context.mounted) return;
    if (appState.errorMessage != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(appState.errorMessage ?? 'Error')),
      );
    }
  }

  Future<void> _scanQr(BuildContext context, AppState appState) async {
    final result = await Navigator.of(context).push<String>(
      MaterialPageRoute(builder: (_) => const QrScannerScreen()),
    );
    if (result == null || result.isEmpty || !context.mounted) return;
    final sessionId = _parseSessionId(result);
    if (sessionId == null || sessionId.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Invalid QR code')),
      );
      return;
    }
    await appState.startListeningBySessionId(sessionId);
    if (!context.mounted) return;
    if (appState.errorMessage != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(appState.errorMessage ?? 'Error')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final appState = context.watch<AppState>();
    final session = appState.activeSession;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Listener Dashboard'),
        actions: [
          if (appState.consumerId != null)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text('Captions'),
                  Switch(
                    value: appState.captionsEnabled,
                    onChanged: (_) => appState.toggleCaptions(),
                  ),
                ],
              ),
            ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Event: ${appState.selectedEvent?.name ?? '-'}'),
                  Text('Channel: ${appState.selectedChannel?.name ?? '-'}'),
                  Text('Session: ${session?.id ?? 'Not started'}'),
                  const SizedBox(height: 16),
                  TextField(
                    controller: _sessionIdController,
                    decoration: const InputDecoration(
                      labelText: 'Session ID',
                      helperText: 'Enter the session ID or scan the QR code from the translator or admin.',
                    ),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: (appState.isBusy || appState.consumerId != null)
                              ? null
                              : () => _scanQr(context, appState),
                          icon: const Icon(Icons.qr_code_scanner),
                          label: const Text('Scan QR'),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        flex: 2,
                        child: ElevatedButton(
                          onPressed: (appState.isBusy || appState.consumerId != null)
                              ? null
                              : () => _joinBySessionId(context, appState),
                          child: appState.isBusy
                              ? const SizedBox(
                                  height: 20,
                                  width: 20,
                                  child: CircularProgressIndicator(strokeWidth: 2),
                                )
                              : const Text('Join'),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  if (appState.consumerId != null)
                    SelectableText('Consumer ID: ${appState.consumerId}'),
                  if (appState.errorMessage != null)
                    Padding(
                      padding: const EdgeInsets.only(top: 8),
                      child: Text(appState.errorMessage!, style: const TextStyle(color: Colors.red)),
                    ),
                  if (appState.consumerId != null) ...[
                    const SizedBox(height: 16),
                    AudioReceptionIndicator(
                      isConnected: appState.isSignalingConnected,
                      hasConsumer: appState.consumerId != null,
                      audioLevel: appState.currentAudioLevel,
                      height: 60,
                      activeColor: Colors.green,
                      inactiveColor: Colors.grey,
                    ),
                    const SizedBox(height: 16),
                    SizedBox(
                      height: 120,
                      child: Image.asset(
                        'assets/listening.gif',
                        fit: BoxFit.contain,
                        errorBuilder: (_, __, ___) => const Center(
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.headphones, size: 48, color: Colors.blue),
                              SizedBox(height: 8),
                              Text('Listening', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                            ],
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),
                  ],
                  const SizedBox(height: 16),
                  if (appState.consumerId != null)
                    SizedBox(
                      width: double.infinity,
                      child: OutlinedButton(
                        onPressed: appState.isBusy ? null : () => appState.stopListening(),
                        child: const Text('Stop'),
                      ),
                    ),
                ],
              ),
            ),
          ),
          if (appState.consumerId != null && appState.captionsEnabled)
            Container(
              height: 120,
              color: Colors.black87,
              padding: const EdgeInsets.all(8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Captions', style: TextStyle(color: Colors.white70, fontSize: 12)),
                  Expanded(
                    child: ListView.builder(
                      controller: _captionScrollController,
                      itemCount: appState.captions.length,
                      itemBuilder: (context, index) {
                        final caption = appState.captions[index];
                        final text = caption['text'] as String? ?? '';
                        if (text.isEmpty) return const SizedBox.shrink();
                        return Padding(
                          padding: const EdgeInsets.symmetric(vertical: 2),
                          child: Text(
                            text,
                            style: const TextStyle(color: Colors.white, fontSize: 14),
                          ),
                        );
                      },
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}
