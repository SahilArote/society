import 'package:flutter/foundation.dart';
import 'dart:async';
import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../repositories/guard_repository.dart';
import 'login_screen.dart';
import '../dashboard/main_navigation.dart';

class SplashScreen extends StatefulWidget {
  final GuardRepository guardRepo;

  const SplashScreen({super.key, required this.guardRepo});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen>
    with SingleTickerProviderStateMixin {
  late AnimationController _animController;
  Timer? _navTimer;

  // Staggered cinematic reveal animations
  late Animation<double> _logoScale;
  late Animation<double> _logoFade;
  late Animation<double> _glowScale;
  late Animation<double> _glowFade;
  late Animation<double> _shimmerProgress;
  late Animation<Offset> _textSlide;
  late Animation<double> _textFade;
  late Animation<double> _letterSpacing;
  late Animation<Offset> _taglineSlide;
  late Animation<double> _taglineFade;
  late Animation<double> _progressWidth;

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2200),
    );

    // 1. Logo spring scale (0.0 -> 0.50)
    _logoScale = Tween<double>(begin: 0.55, end: 1.0).animate(
      CurvedAnimation(
        parent: _animController,
        curve: const Interval(0.0, 0.50, curve: Curves.easeOutBack),
      ),
    );

    // 2. Logo opacity fade
    _logoFade = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _animController,
        curve: const Interval(0.0, 0.35, curve: Curves.easeIn),
      ),
    );

    // 3. Ambient halo glow expansion
    _glowScale = Tween<double>(begin: 0.5, end: 1.35).animate(
      CurvedAnimation(
        parent: _animController,
        curve: const Interval(0.10, 0.70, curve: Curves.easeOutCubic),
      ),
    );

    _glowFade = TweenSequence<double>([
      TweenSequenceItem(
        tween: Tween<double>(begin: 0.0, end: 1.0),
        weight: 35,
      ),
      TweenSequenceItem(
        tween: Tween<double>(begin: 1.0, end: 0.55),
        weight: 65,
      ),
    ]).animate(
      CurvedAnimation(
        parent: _animController,
        curve: const Interval(0.10, 0.85, curve: Curves.easeInOut),
      ),
    );

    // 4. Shimmer / light sweep (-1.2 to 1.6) across logo
    _shimmerProgress = Tween<double>(begin: -1.2, end: 1.6).animate(
      CurvedAnimation(
        parent: _animController,
        curve: const Interval(0.30, 0.75, curve: Curves.easeInOutSine),
      ),
    );

    // 5. Brand name typography slide & fade with letter-spacing tracking
    _textSlide = Tween<Offset>(
      begin: const Offset(0, 0.30),
      end: Offset.zero,
    ).animate(
      CurvedAnimation(
        parent: _animController,
        curve: const Interval(0.20, 0.60, curve: Curves.easeOutCubic),
      ),
    );

    _textFade = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _animController,
        curve: const Interval(0.20, 0.50, curve: Curves.easeIn),
      ),
    );

    _letterSpacing = Tween<double>(begin: -0.5, end: 1.2).animate(
      CurvedAnimation(
        parent: _animController,
        curve: const Interval(0.20, 0.65, curve: Curves.easeOutCubic),
      ),
    );

    // 6. Subtitle badge slide & fade
    _taglineSlide = Tween<Offset>(
      begin: const Offset(0, 0.3),
      end: Offset.zero,
    ).animate(
      CurvedAnimation(
        parent: _animController,
        curve: const Interval(0.30, 0.70, curve: Curves.easeOutCubic),
      ),
    );

    _taglineFade = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _animController,
        curve: const Interval(0.30, 0.65, curve: Curves.easeIn),
      ),
    );

    // 7. Progress line expansion (0.25 -> 0.95)
    _progressWidth = Tween<double>(begin: 0.0, end: 140.0).animate(
      CurvedAnimation(
        parent: _animController,
        curve: const Interval(0.25, 0.95, curve: Curves.easeInOutCubic),
      ),
    );

    _animController.forward();
    _checkAuthAndNavigate();
  }

  @override
  void dispose() {
    _navTimer?.cancel();
    _animController.dispose();
    super.dispose();
  }

  void _checkAuthAndNavigate() {
    _navTimer = Timer(const Duration(milliseconds: 2600), () {
      if (!mounted) return;
      if (!kIsWeb && widget.guardRepo.isAuthenticated) {
        Navigator.of(context).pushReplacement(
          PageRouteBuilder(
            pageBuilder: (_, __, ___) =>
                MainNavigation(guardRepo: widget.guardRepo),
            transitionsBuilder: (_, anim, __, child) =>
                FadeTransition(opacity: anim, child: child),
            transitionDuration: const Duration(milliseconds: 400),
          ),
        );
      } else {
        Navigator.of(context).pushReplacement(
          PageRouteBuilder(
            pageBuilder: (_, __, ___) =>
                LoginScreen(guardRepo: widget.guardRepo),
            transitionsBuilder: (_, anim, __, child) =>
                FadeTransition(opacity: anim, child: child),
            transitionDuration: const Duration(milliseconds: 400),
          ),
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: Center(
        child: AnimatedBuilder(
          animation: _animController,
          builder: (context, _) {
            return Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                // Stack holding Ambient Glow + Animated Logo Badge + Light Shimmer
                Stack(
                  alignment: Alignment.center,
                  children: [
                    // 1. Expanding Ambient Radial Glow Halo
                    Opacity(
                      opacity: _glowFade.value.clamp(0.0, 1.0),
                      child: Transform.scale(
                        scale: _glowScale.value,
                        child: Container(
                          width: 170,
                          height: 170,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            gradient: RadialGradient(
                              colors: [
                                AppColors.primary.withOpacity(0.35),
                                const Color(0xFF6366F1).withOpacity(0.18),
                                const Color(0xFF4F46E5).withOpacity(0.06),
                                Colors.transparent,
                              ],
                              stops: const [0.0, 0.40, 0.70, 1.0],
                            ),
                          ),
                        ),
                      ),
                    ),

                    // 2. Animated App Logo (Clean Official Icon)
                    Opacity(
                      opacity: _logoFade.value.clamp(0.0, 1.0),
                      child: Transform.scale(
                        scale: _logoScale.value,
                        child: Container(
                          width: 100,
                          height: 100,
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(24),
                            boxShadow: [
                              BoxShadow(
                                color: AppColors.primary.withOpacity(0.32),
                                blurRadius: 28,
                                spreadRadius: 2,
                                offset: const Offset(0, 8),
                              ),
                              const BoxShadow(
                                color: Color.fromRGBO(0, 0, 0, 0.20),
                                blurRadius: 16,
                                offset: Offset(0, 6),
                              ),
                            ],
                          ),
                          child: ClipRRect(
                            borderRadius: BorderRadius.circular(24),
                            child: Stack(
                              alignment: Alignment.center,
                              children: [
                                // Official App Logo Asset
                                Image.asset(
                                  'assets/images/logo.png',
                                  width: 100,
                                  height: 100,
                                  fit: BoxFit.cover,
                                  errorBuilder: (context, error, stackTrace) =>
                                      const Icon(
                                    Icons.shield_rounded,
                                    size: 54,
                                    color: AppColors.primary,
                                  ),
                                ),

                                // 3. Diagonal High-Gloss Shimmer Light Sweep
                                Positioned.fill(
                                  child: ShaderMask(
                                    blendMode: BlendMode.srcATop,
                                    shaderCallback: (bounds) {
                                      final progress = _shimmerProgress.value;
                                      return LinearGradient(
                                        begin: Alignment(progress - 0.7, -1.0),
                                        end: Alignment(progress + 0.7, 1.0),
                                        colors: [
                                          Colors.transparent,
                                          Colors.white.withOpacity(0.35),
                                          Colors.transparent,
                                        ],
                                        stops: const [0.0, 0.5, 1.0],
                                      ).createShader(bounds);
                                    },
                                    child: Container(
                                      color: Colors.white.withOpacity(0.02),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 32),

                // 4. Slide & Fade Brand Reveal with Tracking
                SlideTransition(
                  position: _textSlide,
                  child: Opacity(
                    opacity: _textFade.value.clamp(0.0, 1.0),
                    child: Column(
                      children: [
                        Text(
                          'NexGuard',
                          style: TextStyle(
                            fontSize: 32,
                            fontWeight: FontWeight.w900,
                            color: const Color(0xFF0F172A),
                            letterSpacing: _letterSpacing.value,
                            fontFamily: 'Inter',
                          ),
                        ),
                        const SizedBox(height: 10),

                        // Subtitle Badge
                        SlideTransition(
                          position: _taglineSlide,
                          child: Opacity(
                            opacity: _taglineFade.value.clamp(0.0, 1.0),
                            child: Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 14,
                                vertical: 6,
                              ),
                              decoration: BoxDecoration(
                                color: const Color(0xFFEEF2FF),
                                borderRadius: BorderRadius.circular(20),
                                border: Border.all(
                                  color: const Color(0xFFE0E7FF),
                                  width: 1.0,
                                ),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Container(
                                    width: 7,
                                    height: 7,
                                    decoration: const BoxDecoration(
                                      color: Color(0xFF16A34A),
                                      shape: BoxShape.circle,
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  const Text(
                                    'GATE SECURITY TERMINAL',
                                    style: TextStyle(
                                      fontSize: 11.5,
                                      color: Color(0xFF3730A3),
                                      fontWeight: FontWeight.w800,
                                      letterSpacing: 1.0,
                                      fontFamily: 'Inter',
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),

                const SizedBox(height: 52),

                // 5. Minimalist Sleek Glowing Loading Line
                Container(
                  height: 3,
                  width: 140,
                  decoration: BoxDecoration(
                    color: const Color(0xFFF1F5F9),
                    borderRadius: BorderRadius.circular(2),
                  ),
                  alignment: Alignment.centerLeft,
                  child: Container(
                    height: 3,
                    width: _progressWidth.value,
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [
                          AppColors.primary,
                          Color(0xFF6366F1),
                        ],
                      ),
                      borderRadius: BorderRadius.circular(2),
                      boxShadow: [
                        BoxShadow(
                          color: AppColors.primary.withOpacity(0.4),
                          blurRadius: 6,
                          offset: const Offset(0, 1),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            );
          },
        ),
      ),
    );
  }
}
