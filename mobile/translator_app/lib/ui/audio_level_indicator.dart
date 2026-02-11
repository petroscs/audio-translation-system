import 'dart:async';
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart';

import '../webrtc/webrtc_service.dart';

/// A visual indicator that shows audio capture activity
/// Displays animated waveform bars that respond to *real* audio levels (when available).
class AudioLevelIndicator extends StatefulWidget {
  final MediaStream? stream;
  final WebRtcService? webRtcService;
  final double height;
  final Color activeColor;
  final Color inactiveColor;

  const AudioLevelIndicator({
    super.key,
    required this.stream,
    this.webRtcService,
    this.height = 60,
    this.activeColor = Colors.green,
    this.inactiveColor = Colors.grey,
  });

  @override
  State<AudioLevelIndicator> createState() => _AudioLevelIndicatorState();
}

class _AudioLevelIndicatorState extends State<AudioLevelIndicator>
    with TickerProviderStateMixin {
  Timer? _statsTimer;
  List<double> _audioLevels = List.filled(20, 0.0);
  bool _isActive = false;
  double? _lastRealAudioLevel;
  int _noAudioFrames = 0;

  @override
  void initState() {
    super.initState();
    _startMonitoring();
  }

  @override
  void didUpdateWidget(AudioLevelIndicator oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.stream != widget.stream) {
      _stopMonitoring();
      _startMonitoring();
    }
  }

  void _startMonitoring() {
    if (widget.stream == null) {
      setState(() {
        _isActive = false;
        _audioLevels = List.filled(20, 0.0);
      });
      return;
    }

    _statsTimer = Timer.periodic(const Duration(milliseconds: 100), (_) async {
      if (!mounted || widget.stream == null) {
        setState(() {
          _isActive = false;
          _audioLevels = List.filled(20, 0.0);
        });
        return;
      }

      try {
        // Try to get audio track
        final audioTracks = widget.stream!.getAudioTracks();
        if (audioTracks.isEmpty) {
          setState(() {
            _isActive = false;
            _audioLevels = List.filled(20, 0.0);
          });
          return;
        }

        final track = audioTracks.first;
        final isEnabled = (track.enabled ?? true) && !(track.muted ?? false);
        
        if (!isEnabled) {
          setState(() {
            _isActive = false;
            _audioLevels = List.filled(20, 0.0);
          });
          return;
        }

        // Try to get real audio level from WebRTC stats
        double? realAudioLevel;
        if (widget.webRtcService != null) {
          try {
            realAudioLevel = await widget.webRtcService!.getAudioLevel();
            if (realAudioLevel != null && realAudioLevel > 0.05) {
              _lastRealAudioLevel = realAudioLevel;
              _noAudioFrames = 0;
            } else {
              _noAudioFrames++;
            }
          } catch (e) {
            // Stats not available
            _noAudioFrames++;
          }
        } else {
          _noAudioFrames++;
        }
        
        setState(() {
          // Only show active if we have real audio level data
          if (realAudioLevel != null && realAudioLevel > 0.05) {
            // Real audio detected - use actual level
            _isActive = true;
            final baseLevel = realAudioLevel;
            for (int i = 0; i < _audioLevels.length; i++) {
              // Distribute the real audio level across bars with variation
              final position = i / _audioLevels.length;
              final variation = sin(position * 10 + DateTime.now().millisecondsSinceEpoch * 0.01) * 0.2;
              _audioLevels[i] = (baseLevel + variation).clamp(0.0, 1.0);
            }
          } else if (_lastRealAudioLevel != null && _noAudioFrames < 10) {
            // Fade out previous real level
            _isActive = true;
            final fadeFactor = (10 - _noAudioFrames) / 10;
            final baseLevel = _lastRealAudioLevel! * fadeFactor;
            for (int i = 0; i < _audioLevels.length; i++) {
              final variation = sin(i * 0.5) * 0.05;
              _audioLevels[i] = (baseLevel + variation).clamp(0.0, 0.3);
            }
          } else {
            _isActive = false;
            _audioLevels = List.filled(20, 0.0);
          }
        });
      } catch (e) {
        // If monitoring fails, show inactive state
        if (mounted) {
          setState(() {
            _isActive = false;
            _audioLevels = List.filled(20, 0.0);
          });
        }
      }
    });
  }

  void _stopMonitoring() {
    _statsTimer?.cancel();
    _statsTimer = null;
    _isActive = false;
  }

  @override
  void dispose() {
    _stopMonitoring();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (widget.stream == null) {
      return SizedBox(
        height: widget.height,
        child: Center(
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.mic_off, color: widget.inactiveColor),
              const SizedBox(width: 8),
              Text(
                'No audio capture',
                style: TextStyle(color: widget.inactiveColor),
              ),
            ],
          ),
        ),
      );
    }

    return Container(
      height: widget.height,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.black12,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Icon(
            Icons.mic,
            color: _isActive ? widget.activeColor : widget.inactiveColor,
            size: 24,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: CustomPaint(
              painter: WaveformPainter(
                levels: _audioLevels,
                activeColor: widget.activeColor,
                inactiveColor: widget.inactiveColor,
              ),
              child: Container(),
            ),
          ),
          const SizedBox(width: 12),
          Text(
            _isActive ? 'Capturing' : 'Idle',
            style: TextStyle(
              color: _isActive ? widget.activeColor : widget.inactiveColor,
              fontWeight: FontWeight.w500,
              fontSize: 12,
            ),
          ),
        ],
      ),
    );
  }
}

/// Custom painter that draws a waveform visualization
class WaveformPainter extends CustomPainter {
  final List<double> levels;
  final Color activeColor;
  final Color inactiveColor;

  WaveformPainter({
    required this.levels,
    required this.activeColor,
    required this.inactiveColor,
  });

  @override
  void paint(Canvas canvas, Size size) {
    if (levels.isEmpty) return;

    final paint = Paint()
      ..style = PaintingStyle.fill
      ..strokeCap = StrokeCap.round;

    final barWidth = size.width / levels.length;
    final maxBarHeight = size.height * 0.8;
    final centerY = size.height / 2;

    for (int i = 0; i < levels.length; i++) {
      final level = levels[i];
      final barHeight = maxBarHeight * level;
      final x = i * barWidth + barWidth / 2;

      // Use active color when level is above threshold
      paint.color = level > 0.1 ? activeColor : inactiveColor;
      paint.strokeWidth = barWidth * 0.6;

      // Draw bar from center, extending up and down
      canvas.drawLine(
        Offset(x, centerY - barHeight / 2),
        Offset(x, centerY + barHeight / 2),
        paint,
      );
    }
  }

  @override
  bool shouldRepaint(WaveformPainter oldDelegate) {
    return oldDelegate.levels != levels;
  }
}
