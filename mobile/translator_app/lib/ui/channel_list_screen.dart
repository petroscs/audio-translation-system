import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../app/app_state.dart';
import 'translator_dashboard.dart';

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
            final hasSessionForChannel =
                appState.activeSession?.channelId == channel.id;
            return ListTile(
              title: Text(channel.name),
              subtitle: Text(channel.languageCode),
              trailing: hasSessionForChannel
                  ? const Chip(label: Text('Session active'))
                  : IconButton(
                      icon: const Icon(Icons.add_circle_outline),
                      tooltip: 'Create session',
                      onPressed: appState.isBusy
                          ? null
                          : () async {
                              await appState.createSessionForChannel(channel);
                              if (!context.mounted) return;
                              if (appState.errorMessage == null) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(
                                    content: Text(
                                        'Session created for ${channel.name}'),
                                  ),
                                );
                                Navigator.of(context).push(
                                  MaterialPageRoute(
                                      builder: (_) =>
                                          const TranslatorDashboard()),
                                );
                              } else {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(
                                    content:
                                        Text(appState.errorMessage ?? 'Error'),
                                  ),
                                );
                              }
                            },
                    ),
              onTap: () {
                appState.selectChannel(channel);
                Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const TranslatorDashboard()),
                );
              },
            );
          },
        ),
      ),
    );
  }
}
