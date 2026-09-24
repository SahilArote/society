import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_typography.dart';
import '../../services/auth_service.dart';
import '../../services/storage_service.dart';
import '../auth/login_screen.dart';
import '../dashboard/main_navigation_shell.dart';
import '../onboarding/onboarding_screen.dart';

/// Animated branded splash screen for NexGate Resident Mobile App.
class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _logoScale;
  late Animation<double> _logoFade;
  late Animation<double> _textFade;
  late Animation<Offset> _textSlide;
  late Animation<double> _taglineFade;

  @override
  void initState() {
    super.initState();

    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2000),
    );

    // Sequence 1: Logo fades in and gently expands from 0.75 to 1.0
    _logoFade = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0.0, 0.45, curve: Curves.easeOutCubic),
      ),
    );

    _logoScale = Tween<double>(begin: 0.75, end: 1.0).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0.0, 0.55, curve: Curves.easeOutBack),
      ),
    );

    // Sequence 2: NexGate title slides up slightly and fades in
    _textFade = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0.35, 0.7, curve: Curves.easeOut),
      ),
    );

    _textSlide = Tween<Offset>(
      begin: const Offset(0.0, 0.25),
      end: Offset.zero,
    ).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0.35, 0.7, curve: Curves.easeOutCubic),
      ),
    );

    // Sequence 3: Tagline fades in
    _taglineFade = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0.6, 0.95, curve: Curves.easeIn),
      ),
    );

    _controller.forward();

    // Check authentication and navigate after animation completes
    _handleNavigation();
  }

  Future<void> _handleNavigation() async {
    // Restore session concurrently while splash animation runs
    final isAuth = await AuthService.restoreSession();

    // Ensure splash displays for at least 2.1 seconds for smooth visual experience
    await Future.delayed(const Duration(milliseconds: 2100));

    if (!mounted) return;

    if (isAuth) {
      Navigator.of(context).pushReplacement(
        PageRouteBuilder(
          transitionDuration: const Duration(milliseconds: 600),
          pageBuilder: (context, animation, secondaryAnimation) =>
              const MainNavigationShell(),
          transitionsBuilder: (context, animation, secondaryAnimation, child) {
            return FadeTransition(opacity: animation, child: child);
          },
        ),
      );
    } else {
      final onboardingDone = StorageService.isOnboardingCompleted();
      final destination = onboardingDone
          ? const LoginScreen()
          : const OnboardingScreen();

      Navigator.of(context).pushReplacement(
        PageRouteBuilder(
          transitionDuration: const Duration(milliseconds: 600),
          pageBuilder: (context, animation, secondaryAnimation) => destination,
          transitionsBuilder: (context, animation, secondaryAnimation, child) {
            return FadeTransition(opacity: animation, child: child);
          },
        ),
      );
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        width: double.infinity,
        height: double.infinity,
        decoration: const BoxDecoration(
          gradient: AppColors.splashGradient,
        ),
        child: SafeArea(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Spacer(flex: 2),

              // Animated Logo Shield
              AnimatedBuilder(
                animation: _controller,
                builder: (context, child) {
                  return FadeTransition(
                    opacity: _logoFade,
                    child: Transform.scale(
                      scale: _logoScale.value,
                      child: Container(
                        width: 104,
                        height: 104,
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(28),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.25),
                              blurRadius: 30,
                              offset: const Offset(0, 10),
                            ),
                            BoxShadow(
                              color: AppColors.primaryPurple.withValues(alpha: 0.3),
                              blurRadius: 40,
                              spreadRadius: 2,
                            ),
                          ],
                        ),
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(18),
                          child: Image.asset(
                            'assets/images/logo.png',
                            fit: BoxFit.contain,
                            errorBuilder: (ctx, err, stack) => const Icon(
                              Icons.shield_rounded,
                              size: 56,
                              color: AppColors.primaryBlue,
                            ),
                          ),
                        ),
                      ),
                    ),
                  );
                },
              ),

              const SizedBox(height: 28),

              // Animated Brand Name
              SlideTransition(
                position: _textSlide,
                child: FadeTransition(
                  opacity: _textFade,
                  child: Column(
                    children: [
                      Text(
                        'NexGate',
                        style: AppTypography.displayLarge.copyWith(
                          color: Colors.white,
                          fontSize: 32,
                          fontWeight: FontWeight.w900,
                          letterSpacing: -0.5,
                        ),
                      ),
                      const SizedBox(height: 8),
                      // Tagline Reveal
                      FadeTransition(
                        opacity: _taglineFade,
                        child: Text(
                          'Your Society, Smarter & Safer.',
                          style: AppTypography.bodyMedium.copyWith(
                            color: const Color(0xFFC7D2FE),
                            fontWeight: FontWeight.w500,
                            letterSpacing: 0.2,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              const Spacer(flex: 2),

              // Subtle bottom loading indicator
              FadeTransition(
                opacity: _taglineFade,
                child: Padding(
                  padding: const EdgeInsets.only(bottom: 24.0),
                  child: SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      valueColor: AlwaysStoppedAnimation<Color>(
                        Colors.white.withValues(alpha: 0.6),
                      ),
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
