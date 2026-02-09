import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../app/app_state.dart';
import 'audio_reception_indicator.dart';

class ListenerDashboard extends StatefulWidget {
  const ListenerDashboard({super.key});

  @override
  State<ListenerDashboard> createState() => _ListenerDashboardState();
}

class _ListenerDashboardState extends State<ListenerDashboard> {
  final _producerController = TextEditingController();
  final _captionScrollController = ScrollController();

  @override
  void dispose() {
    _producerController.dispose();
    _captionScrollController.dispose();
    super.dispose();
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
                    controller: _producerController,
                    decoration: const InputDecoration(
                      labelText: 'Producer ID',
                      helperText: 'Paste the producer ID from the translator app.',
                    ),
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
                    // Audio reception indicator
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
                  Row(
                    children: [
                      Expanded(
                        child: ElevatedButton(
                          onPressed: (appState.isBusy || appState.consumerId != null)
                              ? null
                              : () => appState.startListening(
                                    producerId: _producerController.text.trim(),
                                  ),
                          child: appState.isBusy
                              ? const CircularProgressIndicator()
                              : const Text('Start Listening'),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: OutlinedButton(
                          onPressed: (appState.isBusy || appState.consumerId == null)
                              ? null
                              : () => appState.stopListening(),
                          child: const Text('Stop'),
                        ),
                      ),
                    ],
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
