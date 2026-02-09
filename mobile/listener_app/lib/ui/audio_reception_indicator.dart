import 'dart:async';
import 'dart:math';
import 'package:flutter/material.dart';

const double pi = 3.1415926535897932;

/// A visual indicator that shows audio reception activity
/// Displays animated waveform bars that respond to real audio levels from WebRTC stats
class AudioReceptionIndicator extends StatefulWidget {
  final bool isConnected;
  final bool hasConsumer;
  final double? audioLevel; // Real audio level from WebRTC stats (0.0 to 1.0)
  final double height;
  final Color activeColor;
  final Color inactiveColor;

  const AudioReceptionIndicator({
    super.key,
    required this.isConnected,
    required this.hasConsumer,
    this.audioLevel,
    this.height = 60,
    this.activeColor = Colors.green,
    this.inactiveColor = Colors.grey,
  });

  @override
  State<AudioReceptionIndicator> createState() => _AudioReceptionIndicatorState();
}

class _AudioReceptionIndicatorState extends State<AudioReceptionIndicator>
    with TickerProviderStateMixin {
  Timer? _animationTimer;
  List<double> _audioLevels = List.filled(20, 0.0);
  final Random _random = Random();
  bool _isReceivingAudio = false;

  @override
  void initState() {
    super.initState();
    _startAnimation();
  }

  void _startAnimation() {
    _animationTimer = Timer.periodic(const Duration(milliseconds: 100), (_) {
      if (!mounted) return;

      final isActive = widget.hasConsumer && widget.isConnected;
      
      // Only use real audio level - no fallback
      final hasRealAudioLevel = widget.audioLevel != null && widget.audioLevel! > 0.1;
      final receivingAudio = isActive && hasRealAudioLevel;

      setState(() {
        _isReceivingAudio = receivingAudio;
        
        if (receivingAudio && widget.audioLevel != null) {
          // Use real audio level to create waveform pattern
          final baseLevel = widget.audioLevel!.clamp(0.1, 1.0);
          // Create waveform pattern based on real audio level
          for (int i = 0; i < _audioLevels.length; i++) {
            // Create a waveform that reflects the actual audio level
            final position = i / _audioLevels.length;
            final wavePattern = (sin(position * 4 * pi + DateTime.now().millisecondsSinceEpoch * 0.003) + 1) / 2;
            final variation = _random.nextDouble() * 0.2;
            _audioLevels[i] = (baseLevel * 0.7 + wavePattern * baseLevel * 0.3 + variation).clamp(0.1, 1.0);
          }
        } else {
          // Show no activity when not receiving real audio
          _audioLevels = List.filled(20, 0.0);
        }
      });
    });
  }

  @override
  void dispose() {
    _animationTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (!widget.hasConsumer) {
      return SizedBox(
        height: widget.height,
        child: Center(
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.volume_off, color: widget.inactiveColor),
              const SizedBox(width: 8),
              Text(
                'Not connected',
                style: TextStyle(color: widget.inactiveColor),
              ),
            ],
          ),
        ),
      );
    }

    if (!widget.isConnected) {
      return SizedBox(
        height: widget.height,
        child: Center(
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.signal_wifi_off, color: widget.inactiveColor),
              const SizedBox(width: 8),
              Text(
                'Connecting...',
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
            _isReceivingAudio ? Icons.headphones : Icons.headphones_outlined,
            color: _isReceivingAudio ? widget.activeColor : widget.inactiveColor,
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
            _isReceivingAudio ? 'Receiving' : (widget.hasConsumer && widget.isConnected ? 'No audio' : 'Connected'),
            style: TextStyle(
              color: _isReceivingAudio ? widget.activeColor : widget.inactiveColor,
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
