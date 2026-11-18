import 'package:flutter/material.dart';
import '../../services/auth_service.dart';
import '../../services/storage_service.dart';
import '../auth/login_screen.dart';
import '../dashboard/main_navigation_shell.dart';
import '../onboarding/onboarding_screen.dart';

/// Official animated branded splash screen for NexGate Resident App.
/// Adheres strictly to NexGate brand guidelines v1.1:
/// - Gate Blue #2563EB full-screen background
/// - Vector N mark (two gate posts + gate leaf in tint #CFE0FF & white)
/// - Popping mint #34D399 live visitor alert dot with subtle ping wave
/// - Seamless 1.6-second duration with concurrent session restoration
class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  bool _isNavigated = false;

  @override
  void initState() {
    super.initState();

    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1600),
    )..forward();

    // Concurrently restore user session and navigate upon animation finish
    _handleSessionAndNavigation();
  }

  Future<void> _handleSessionAndNavigation() async {
    // 1. Concurrently restore auth token and user profile
    final sessionFuture = AuthService.restoreSession();

    // 2. Guarantee exact 1.6s brand timeline before handoff
    final timingFuture = Future.delayed(const Duration(milliseconds: 1600));

    final results = await Future.wait([sessionFuture, timingFuture]);
    final isAuth = results[0] as bool;

    if (!mounted || _isNavigated) return;
    _isNavigated = true;

    final Widget destination;
    if (isAuth) {
      destination = const MainNavigationShell();
    } else {
      final onboardingDone = StorageService.isOnboardingCompleted();
      destination =
          onboardingDone ? const LoginScreen() : const OnboardingScreen();
    }

    Navigator.of(context).pushReplacement(
      PageRouteBuilder(
        transitionDuration: const Duration(milliseconds: 500),
        pageBuilder: (context, animation, secondaryAnimation) => destination,
        transitionsBuilder: (context, animation, secondaryAnimation, child) {
          return FadeTransition(opacity: animation, child: child);
        },
      ),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final screenWidth = MediaQuery.of(context).size.width;
    final markSize = (screenWidth * 0.32).clamp(100.0, 140.0);

    return Scaffold(
      backgroundColor: const Color(0xFF2563EB),
      body: SizedBox.expand(
        child: SafeArea(
          child: Stack(
            alignment: Alignment.center,
            children: [
              // Dead Center Hero (Brand Mark + Wordmark + Tagline)
              Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    // Animated NexGate Precision Brand Mark
                    AnimatedBuilder(
                      animation: _controller,
                      builder: (context, child) {
                        final t = _controller.value * 1.6; // Timeline in seconds
                        final pop = Curves.easeOutBack
                            .transform(((t - 0.1) / 0.6).clamp(0.0, 1.0));
                        final ping = ((t - 1.05) / 0.8).clamp(0.0, 1.0);
                        final dot = t > 0.7 ? ((t - 0.7) / 0.35).clamp(0.0, 1.0) : 0.0;

                        return CustomPaint(
                          size: Size(markSize, markSize),
                          painter: _NexGateMarkPainter(pop: pop, ping: ping, dot: dot),
                        );
                      },
                    ),

                    const SizedBox(height: 24),

                    // NexGate Wordmark & Tagline Centered
                    AnimatedBuilder(
                      animation: _controller,
                      builder: (context, child) {
                        final opacity = Curves.easeOut
                            .transform(((_controller.value - 0.25) / 0.45).clamp(0.0, 1.0));
                        final offset = 12.0 * (1.0 - opacity);
                        return Opacity(
                          opacity: opacity,
                          child: Transform.translate(
                            offset: Offset(0, offset),
                            child: child,
                          ),
                        );
                      },
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        crossAxisAlignment: CrossAxisAlignment.center,
                        children: [
                          RichText(
                            textAlign: TextAlign.center,
                            text: const TextSpan(
                              style: TextStyle(
                                fontFamily: 'Poppins',
                                fontSize: 36,
                                letterSpacing: -0.5,
                                color: Colors.white,
                              ),
                              children: [
                                TextSpan(
                                  text: 'Nex',
                                  style: TextStyle(fontWeight: FontWeight.w500),
                                ),
                                TextSpan(
                                  text: 'Gate',
                                  style: TextStyle(fontWeight: FontWeight.w800),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 6),
                          const Text(
                            'SOCIETY LIVING, SIMPLIFIED.',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              fontFamily: 'Poppins',
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                              letterSpacing: 2.2,
                              color: Color(0xFFCFE0FF),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

              // Bottom footer pinned to bottom
              Positioned(
                bottom: 24,
                child: AnimatedBuilder(
                  animation: _controller,
                  builder: (context, child) {
                    final opacity = Curves.easeIn
                        .transform(((_controller.value - 0.5) / 0.4).clamp(0.0, 1.0));
                    return Opacity(
                      opacity: opacity * 0.7,
                      child: child,
                    );
                  },
                  child: const Text(
                    'BY NEXBUILD TECHNOLOGIES',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontFamily: 'Poppins',
                      fontSize: 9.5,
                      fontWeight: FontWeight.w600,
                      letterSpacing: 1.8,
                      color: Color(0xFFCFE0FF),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Precision painter for official NexGate N glyph:
/// - 2 vertical gate posts + 1 diagonal gate leaf
/// - Gate blue & tint #CFE0FF color balance
/// - Animated mint #34D399 live visitor alert dot with ping ring
class _NexGateMarkPainter extends CustomPainter {
  final double pop;
  final double ping;
  final double dot;

  const _NexGateMarkPainter({
    required this.pop,
    required this.ping,
    required this.dot,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final k = size.width / 108.0;

    canvas.save();
    canvas.translate(size.width / 2, size.height / 2);
    canvas.scale(0.82 + 0.18 * pop);
    canvas.translate(-size.width / 2, -size.height / 2);

    final strokeW = 11.92 * k;

    // Gate leaf diagonal (Tint #CFE0FF)
    final tintPaint = Paint()
      ..color = const Color(0xFFCFE0FF)
      ..strokeWidth = strokeW
      ..strokeCap = StrokeCap.round;

    // Gate posts vertical (Pure White)
    final whitePaint = Paint()
      ..color = Colors.white
      ..strokeWidth = strokeW
      ..strokeCap = StrokeCap.round;

    // 1. Diagonal gate leaf connecting the posts
    canvas.drawLine(
      Offset(38.29 * k, 34.50 * k),
      Offset(69.71 * k, 73.50 * k),
      tintPaint,
    );

    // 2. Left vertical gate post
    canvas.drawLine(
      Offset(38.29 * k, 34.50 * k),
      Offset(38.29 * k, 73.50 * k),
      whitePaint,
    );

    // 3. Right vertical gate post (lower stem)
    canvas.drawLine(
      Offset(69.71 * k, 50.21 * k),
      Offset(69.71 * k, 73.50 * k),
      whitePaint,
    );

    canvas.restore();

    // 4. Live visitor alert mint dot (#34D399) on right post
    final mintPaint = Paint()..color = const Color(0xFF34D399);
    final dotCenter = Offset(69.71 * k, 34.50 * k);

    if (dot > 0) {
      canvas.drawCircle(dotCenter, 5.96 * k * dot, mintPaint);
    }

    // 5. Ping ripple wave expanding from the alert dot
    if (ping > 0 && ping < 1) {
      final ripplePaint = Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.2 * k
        ..color = const Color(0xFF34D399).withValues(alpha: 0.9 * (1.0 - ping));

      canvas.drawCircle(dotCenter, 5.96 * k * (1.0 + 3.0 * ping), ripplePaint);
    }
  }

  @override
  bool shouldRepaint(covariant _NexGateMarkPainter oldDelegate) {
    return oldDelegate.pop != pop ||
        oldDelegate.ping != ping ||
        oldDelegate.dot != dot;
  }
}
