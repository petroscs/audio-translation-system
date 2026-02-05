import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../app/app_state.dart';
import 'channel_list_screen.dart';

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

  @override
  Widget build(BuildContext context) {
    final appState = context.watch<AppState>();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Select Event'),
        actions: [
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
