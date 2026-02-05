import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../app/app_state.dart';

class ListenerDashboard extends StatefulWidget {
  const ListenerDashboard({super.key});

  @override
  State<ListenerDashboard> createState() => _ListenerDashboardState();
}

class _ListenerDashboardState extends State<ListenerDashboard> {
  final _dtlsController = TextEditingController(text: '{"role":"auto"}');
  final _producerController = TextEditingController();
  final _captionScrollController = ScrollController();

  @override
  void dispose() {
    _dtlsController.dispose();
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
            child: Padding(
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
                  TextField(
                    controller: _dtlsController,
                    decoration: const InputDecoration(
                      labelText: 'DTLS Parameters (JSON)',
                      helperText: 'Replace with client DTLS params from WebRTC stack.',
                    ),
                    maxLines: 2,
                  ),
                  const SizedBox(height: 12),
                  if (appState.consumerId != null)
                    SelectableText('Consumer ID: ${appState.consumerId}'),
                  if (appState.errorMessage != null)
                    Text(appState.errorMessage!, style: const TextStyle(color: Colors.red)),
                  const Spacer(),
                  Row(
                    children: [
                      Expanded(
                        child: ElevatedButton(
                          onPressed: appState.isBusy
                              ? null
                              : () => appState.startListening(
                                    dtlsParameters: _dtlsController.text.trim(),
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
                          onPressed: appState.isBusy ? null : () => appState.stopListening(),
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
