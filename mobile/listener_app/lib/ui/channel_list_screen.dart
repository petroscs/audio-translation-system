import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../app/app_state.dart';
import 'listener_dashboard.dart';

class ChannelListScreen extends StatefulWidget {
  const ChannelListScreen({super.key});

  @override
  State<ChannelListScreen> createState() => _ChannelListScreenState();
}

class _ChannelListScreenState extends State<ChannelListScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final appState = context.read<AppState>();
      if (appState.selectedEvent != null) {
        appState.loadChannels(appState.selectedEvent!);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final appState = context.watch<AppState>();
    final event = appState.selectedEvent;

    return Scaffold(
      appBar: AppBar(title: Text(event?.name ?? 'Select Channel')),
      body: RefreshIndicator(
        onRefresh: () async {
          if (event != null) {
            await appState.loadChannels(event);
          }
        },
        child: ListView.builder(
          itemCount: appState.channels.length,
          itemBuilder: (context, index) {
            final channel = appState.channels[index];
            return ListTile(
              title: Text(channel.name),
              subtitle: Text(channel.languageCode),
              onTap: () {
                appState.selectChannel(channel);
                Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const ListenerDashboard()),
                );
              },
            );
          },
        ),
      ),
    );
  }
}
