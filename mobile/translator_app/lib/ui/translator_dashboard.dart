import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:qr_flutter/qr_flutter.dart';

import '../app/app_state.dart';
import 'audio_level_indicator.dart';

class TranslatorDashboard extends StatefulWidget {
  const TranslatorDashboard({super.key});

  @override
  State<TranslatorDashboard> createState() => _TranslatorDashboardState();
}

class _TranslatorDashboardState extends State<TranslatorDashboard> {
  String? _diagText;

  Future<void> _takeDiagnosticsSnapshot(AppState appState) async {
    try {
      final webrtc = await appState.webRtcService.diagnosticsSnapshot();
      final producer = await appState.getProducerStats();
      final ts = DateTime.now().toIso8601String();

      final payload = <String, dynamic>{
        'ts': ts,
        'webrtc': webrtc,
        'producerStats': producer,
      };

      final text = payload.toString();
      // Runtime evidence (copyable from flutter run output)
      // Avoid secrets: no tokens/passwords included.
      // ignore: avoid_print
      print('[DIAG] $text');

      if (mounted) {
        setState(() {
          _diagText = text;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _diagText = 'Diagnostics failed: $e';
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final appState = context.watch<AppState>();
    final session = appState.activeSession;

    return Scaffold(
      appBar: AppBar(title: const Text('Translator Dashboard')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('Event: ${appState.selectedEvent?.name ?? '-'}'),
            Text('Channel: ${appState.selectedChannel?.name ?? '-'}'),
            SelectableText('Session: ${session?.id ?? 'Not started'}'),
            const SizedBox(height: 16),
            // Audio level indicator (real level only; see Diagnostics for deeper troubleshooting)
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
            if (appState.producerId != null && session != null) ...[
              if (appState.isAdmin) ...[
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: appState.isBusy ? null : () => _takeDiagnosticsSnapshot(appState),
                        child: const Text('Diagnostics snapshot'),
                      ),
                    ),
                  ],
                ),
                if (_diagText != null) ...[
                  const SizedBox(height: 8),
                  SizedBox(
                    height: 120,
                    child: SingleChildScrollView(
                      child: SelectableText(
                        _diagText!,
                        style: const TextStyle(fontSize: 11),
                      ),
                    ),
                  ),
                ],
              ],
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
              const SizedBox(height: 12),
              const Text(
                'Listeners: scan to join',
                style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500),
              ),
              const SizedBox(height: 8),
              Center(
                child: QrImageView(
                  data: session.id,
                  version: QrVersions.auto,
                  size: 160,
                ),
              ),
              const SizedBox(height: 8),
            ],
            const SizedBox(height: 24),
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
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton(
                style: OutlinedButton.styleFrom(
                  foregroundColor: Colors.red,
                  side: const BorderSide(color: Colors.red),
                ),
                onPressed: (appState.isBusy ||
                        session == null ||
                        appState.producerId != null)
                    ? null
                    : () async {
                        await appState.endSession();
                        if (!context.mounted) return;
                        if (appState.errorMessage == null) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Session ended')),
                          );
                          Navigator.of(context).pop();
                        }
                      },
                child: const Text('End Session'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
