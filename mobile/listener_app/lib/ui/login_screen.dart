import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../app/app_state.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _usernameController = TextEditingController();
  final _passwordController = TextEditingController();

  @override
  void dispose() {
    _usernameController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final appState = context.watch<AppState>();

    return Scaffold(
      appBar: AppBar(title: const Text('Listener Login')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            TextField(
              controller: _usernameController,
              decoration: const InputDecoration(labelText: 'Username or email'),
            ),
            TextField(
              controller: _passwordController,
              decoration: const InputDecoration(labelText: 'Password'),
              obscureText: true,
            ),
            const SizedBox(height: 16),
            if (appState.errorMessage != null)
              Text(
                appState.errorMessage!,
                style: const TextStyle(color: Colors.red),
              ),
            const Spacer(),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: appState.isBusy
                    ? null
                    : () async {
                        await appState.login(
                          _usernameController.text.trim(),
                          _passwordController.text,
                        );
                      },
                child: appState.isBusy
                    ? const CircularProgressIndicator()
                    : const Text('Sign in'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
