import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../app/app_state.dart';

class TranslatorDashboard extends StatefulWidget {
  const TranslatorDashboard({super.key});

  @override
  State<TranslatorDashboard> createState() => _TranslatorDashboardState();
}

class _TranslatorDashboardState extends State<TranslatorDashboard> {
  final _dtlsController = TextEditingController(text: '{"role":"auto"}');
  final _rtpController = TextEditingController(text: '{"codecs":[],"encodings":[]}');

  @override
  void dispose() {
    _dtlsController.dispose();
    _rtpController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final appState = context.watch<AppState>();
    final session = appState.activeSession;
    final isCapturing = appState.webRtcService.localStream != null;

    return Scaffold(
      appBar: AppBar(title: const Text('Translator Dashboard')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Event: ${appState.selectedEvent?.name ?? '-'}'),
            Text('Channel: ${appState.selectedChannel?.name ?? '-'}'),
            Text('Session: ${session?.id ?? 'Not started'}'),
            Text('Audio capture: ${isCapturing ? 'On' : 'Off'}'),
            const SizedBox(height: 16),
            TextField(
              controller: _dtlsController,
              decoration: const InputDecoration(
                labelText: 'DTLS Parameters (JSON)',
                helperText: 'Replace with client DTLS params from WebRTC stack.',
              ),
              maxLines: 2,
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _rtpController,
              decoration: const InputDecoration(
                labelText: 'RTP Parameters (JSON)',
                helperText: 'Replace with mediasoup-compatible RTP params.',
              ),
              maxLines: 2,
            ),
            const SizedBox(height: 12),
            if (appState.producerId != null)
              SelectableText('Producer ID: ${appState.producerId}'),
            if (appState.errorMessage != null)
              Text(appState.errorMessage!, style: const TextStyle(color: Colors.red)),
            const Spacer(),
            Row(
              children: [
                Expanded(
                  child: ElevatedButton(
                    onPressed: appState.isBusy
                        ? null
                        : () => appState.startBroadcast(
                              dtlsParameters: _dtlsController.text.trim(),
                              rtpParameters: _rtpController.text.trim(),
                            ),
                    child: appState.isBusy
                        ? const CircularProgressIndicator()
                        : const Text('Start Broadcast'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: OutlinedButton(
                    onPressed: appState.isBusy ? null : () => appState.stopBroadcast(),
                    child: const Text('Stop'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
