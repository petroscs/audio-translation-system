import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../app/app_state.dart';
import 'channel_list_screen.dart';
import 'listener_dashboard.dart';
import 'qr_scanner_screen.dart';

class EventListScreen extends StatefulWidget {
  const EventListScreen({super.key});

  @override
  State<EventListScreen> createState() => _EventListScreenState();
}

class _EventListScreenState extends State<EventListScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<AppState>().loadEvents();
    });
  }

  Future<void> _joinBySessionId(BuildContext context, String sessionId) async {
    final appState = context.read<AppState>();
    await appState.startListeningBySessionId(sessionId);
    if (!context.mounted) return;
    if (appState.errorMessage == null) {
      Navigator.of(context).push(
        MaterialPageRoute(builder: (_) => const ListenerDashboard()),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(appState.errorMessage ?? 'Error')),
      );
    }
  }

  void _showEnterSessionIdDialog(BuildContext context) {
    final controller = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Enter Session ID'),
        content: TextField(
          controller: controller,
          decoration: const InputDecoration(
            hintText: 'Paste session ID here',
          ),
          autofocus: true,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () {
              final id = controller.text.trim();
              Navigator.of(ctx).pop();
              if (id.isNotEmpty) {
                _joinBySessionId(context, id);
              }
            },
            child: const Text('Join'),
          ),
        ],
      ),
    );
  }

  Future<void> _scanQr(BuildContext context) async {
    final result = await Navigator.of(context).push<String>(
      MaterialPageRoute(builder: (_) => const QrScannerScreen()),
    );
    if (result == null || result.isEmpty) return;

    // The QR may contain a raw GUID or a URL like listenerapp://session/{id}.
    // Parse session ID from it.
    final sessionId = _parseSessionId(result);
    if (!context.mounted) return;
    if (sessionId != null && sessionId.isNotEmpty) {
      _joinBySessionId(context, sessionId);
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Invalid QR code')),
      );
    }
  }

  /// Extract session ID from a raw GUID string or a URL like
  /// `listenerapp://session/{id}`.
  String? _parseSessionId(String raw) {
    final trimmed = raw.trim();
    // Try URL format: scheme://session/{id}
    final uri = Uri.tryParse(trimmed);
    if (uri != null && uri.pathSegments.length >= 2 && uri.pathSegments[0] == 'session') {
      return uri.pathSegments[1];
    }
    // Otherwise treat entire string as the session ID (raw GUID)
    return trimmed;
  }

  @override
  Widget build(BuildContext context) {
    final appState = context.watch<AppState>();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Select Event'),
        actions: [
          IconButton(
            icon: const Icon(Icons.qr_code_scanner),
            tooltip: 'Scan QR to listen',
            onPressed: appState.isBusy ? null : () => _scanQr(context),
          ),
          IconButton(
            icon: const Icon(Icons.link),
            tooltip: 'Enter session ID',
            onPressed: appState.isBusy ? null : () => _showEnterSessionIdDialog(context),
          ),
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: appState.isBusy ? null : () => appState.logout(),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () => appState.loadEvents(),
        child: ListView.builder(
          itemCount: appState.events.length,
          itemBuilder: (context, index) {
            final event = appState.events[index];
            return ListTile(
              title: Text(event.name),
              subtitle: Text(event.status),
              onTap: () {
                appState.selectEvent(event);
                Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const ChannelListScreen()),
                );
              },
            );
          },
        ),
      ),
    );
  }
}
