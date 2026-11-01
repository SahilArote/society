import 'package:flutter/material.dart';

class NexGateSplash extends StatefulWidget {
  const NexGateSplash({super.key, required this.onDone});
  final VoidCallback onDone;
  @override
  State<NexGateSplash> createState() => _NexGateSplashState();
}

class _NexGateSplashState extends State<NexGateSplash> with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(vsync: this, duration: const Duration(milliseconds: 1600))
    ..forward().whenComplete(widget.onDone);
  @override
  void dispose() { _c.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size.width * 0.30;
    return Scaffold(
      backgroundColor: const Color(0xFF2563EB),
      body: Center(
        child: AnimatedBuilder(
          animation: _c,
          builder: (_, __) {
            final t = _c.value * 1.6; // seconds
            final pop = Curves.easeOutBack.transform(((t - 0.1) / 0.6).clamp(0.0, 1.0));
            final ping = ((t - 1.05) / 0.8).clamp(0.0, 1.0);
            return CustomPaint(size: Size(size, size), painter: _MarkPainter(pop, ping, t > 0.7 ? ((t - 0.7) / 0.35).clamp(0.0, 1.0) : 0));
          },
        ),
      ),
    );
  }
}

class _MarkPainter extends CustomPainter {
  _MarkPainter(this.pop, this.ping, this.dot);
  final double pop, ping, dot;
  @override
  void paint(Canvas c, Size s) {
    final k = s.width / 108;
    c.save();
    c.translate(s.width / 2, s.height / 2);
    c.scale(0.82 + 0.18 * pop);
    c.translate(-s.width / 2, -s.height / 2);
    final w = 11.92 * k;
    final tint = Paint()..color = const Color(0xFFCFE0FF)..strokeWidth = w..strokeCap = StrokeCap.round;
    final white = Paint()..color = Colors.white..strokeWidth = w..strokeCap = StrokeCap.round;
    c.drawLine(Offset(38.29 * k, 34.50 * k), Offset(69.71 * k, 73.50 * k), tint);
    c.drawLine(Offset(38.29 * k, 34.50 * k), Offset(38.29 * k, 73.50 * k), white);
    c.drawLine(Offset(69.71 * k, 50.21 * k), Offset(69.71 * k, 73.50 * k), white);
    c.restore();
    final mint = Paint()..color = const Color(0xFF34D399);
    final dc = Offset(69.71 * k, 34.50 * k);
    c.drawCircle(dc, 5.96 * k * dot, mint);
    if (ping > 0 && ping < 1) {
      c.drawCircle(dc, 5.96 * k * (1 + 3 * ping), Paint()..style = PaintingStyle.stroke..strokeWidth = 1.2 * k..color = const Color(0xFF34D399).withOpacity(0.9 * (1 - ping)));
    }
  }
  @override
  bool shouldRepaint(_MarkPainter o) => true;
}
