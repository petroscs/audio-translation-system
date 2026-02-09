import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../app/app_state.dart';
import 'audio_level_indicator.dart';

class TranslatorDashboard extends StatefulWidget {
  const TranslatorDashboard({super.key});

  @override
  State<TranslatorDashboard> createState() => _TranslatorDashboardState();
}

class _TranslatorDashboardState extends State<TranslatorDashboard> {
  @override
  Widget build(BuildContext context) {
    final appState = context.watch<AppState>();
    final session = appState.activeSession;

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
            const SizedBox(height: 16),
            // Audio level indicator
            AudioLevelIndicator(
              stream: appState.webRtcService.localStream,
              webRtcService: appState.webRtcService,
              height: 60,
              activeColor: Colors.green,
              inactiveColor: Colors.grey,
            ),
            const SizedBox(height: 12),
            if (appState.producerId != null)
              SelectableText('Producer ID: ${appState.producerId}'),
            if (appState.errorMessage != null)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Text(appState.errorMessage!, style: const TextStyle(color: Colors.red)),
              ),
            if (appState.producerId != null) ...[
              const SizedBox(height: 16),
              SizedBox(
                height: 120,
                child: Image.asset(
                  'assets/broadcasting.gif',
                  fit: BoxFit.contain,
                  errorBuilder: (_, __, ___) => const Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.mic, size: 48, color: Colors.green),
                        SizedBox(height: 8),
                        Text('Live', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                      ],
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 8),
            ],
            const Spacer(),
            Row(
              children: [
                Expanded(
                  child: ElevatedButton(
                    onPressed: (appState.isBusy || appState.producerId != null)
                        ? null
                        : () => appState.startBroadcast(),
                    child: appState.isBusy
                        ? const CircularProgressIndicator()
                        : const Text('Start Broadcast'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: OutlinedButton(
                    onPressed: (appState.isBusy || appState.producerId == null)
                        ? null
                        : () => appState.stopBroadcast(),
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
