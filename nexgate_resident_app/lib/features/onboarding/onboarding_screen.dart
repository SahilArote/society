import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_typography.dart';
import '../../core/widgets/primary_button.dart';
import '../../services/storage_service.dart';
import '../auth/login_screen.dart';

class OnboardingItem {
  final IconData icon;
  final Color iconBg;
  final Color iconColor;
  final String title;
  final String description;

  const OnboardingItem({
    required this.icon,
    required this.iconBg,
    required this.iconColor,
    required this.title,
    required this.description,
  });
}

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  final PageController _pageController = PageController();
  int _currentIndex = 0;

  final List<OnboardingItem> _items = const [
    OnboardingItem(
      icon: Icons.shield_rounded,
      iconBg: AppColors.lightBlue,
      iconColor: AppColors.primaryBlue,
      title: 'Smart Society Access',
      description:
          'Experience verified security and modern digital gate management built specifically for residential society residents.',
    ),
    OnboardingItem(
      icon: Icons.doorbell_rounded,
      iconBg: AppColors.lightPurple,
      iconColor: AppColors.deepPurple,
      title: 'Instant Gate Approvals',
      description:
          'Receive real-time doorbell alerts with visitor photo, company details, and 1-tap Allow or Deny authorization right from your phone.',
    ),
    OnboardingItem(
      icon: Icons.qr_code_2_rounded,
      iconBg: Color(0xFFDCFCE7),
      iconColor: AppColors.success,
      title: 'Digital Visitor Passes',
      description:
          'Pre-invite guests and service professionals with shareable digital QR entry passes for seamless entry through the guard gate.',
    ),
    OnboardingItem(
      icon: Icons.directions_car_rounded,
      iconBg: Color(0xFFFEF3C7),
      iconColor: AppColors.warning,
      title: 'Household & Vehicles',
      description:
          'Easily manage family members, co-residents, and authorized parking tags for cars and two-wheelers in one secure place.',
    ),
  ];

  void _finishOnboarding() {
    StorageService.setOnboardingCompleted(true);
    Navigator.of(context).pushReplacement(
      MaterialPageRoute(builder: (_) => const LoginScreen()),
    );
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isLastPage = _currentIndex == _items.length - 1;

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        actions: [
          if (!isLastPage)
            TextButton(
              onPressed: _finishOnboarding,
              child: Text(
                'Skip',
                style: AppTypography.button.copyWith(color: AppColors.secondaryText),
              ),
            ),
          const SizedBox(width: 8),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: PageView.builder(
                controller: _pageController,
                itemCount: _items.length,
                onPageChanged: (index) {
                  setState(() => _currentIndex = index);
                },
                itemBuilder: (context, index) {
                  final item = _items[index];
                  return Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 32.0),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        // Visual Circle with Icon
                        Container(
                          width: 140,
                          height: 140,
                          decoration: BoxDecoration(
                            color: item.iconBg,
                            shape: BoxShape.circle,
                            border: Border.all(
                              color: item.iconColor.withValues(alpha: 0.25),
                              width: 3,
                            ),
                            boxShadow: [
                              BoxShadow(
                                color: item.iconColor.withValues(alpha: 0.15),
                                blurRadius: 28,
                                offset: const Offset(0, 10),
                              ),
                            ],
                          ),
                          child: Icon(
                            item.icon,
                            size: 64,
                            color: item.iconColor,
                          ),
                        ),

                        const SizedBox(height: 48),

                        Text(
                          item.title,
                          style: AppTypography.displayMedium,
                          textAlign: TextAlign.center,
                        ),

                        const SizedBox(height: 16),

                        Text(
                          item.description,
                          style: AppTypography.bodyLarge.copyWith(
                            color: AppColors.secondaryText,
                            height: 1.5,
                          ),
                          textAlign: TextAlign.center,
                        ),
                      ],
                    ),
                  );
                },
              ),
            ),

            // Page Indicator Dots & CTA Button
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 24.0),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: List.generate(
                      _items.length,
                      (index) => AnimatedContainer(
                        duration: const Duration(milliseconds: 300),
                        margin: const EdgeInsets.symmetric(horizontal: 4.0),
                        width: _currentIndex == index ? 24 : 8,
                        height: 8,
                        decoration: BoxDecoration(
                          color: _currentIndex == index
                              ? AppColors.primaryBlue
                              : AppColors.border,
                          borderRadius: BorderRadius.circular(4),
                        ),
                      ),
                    ),
                  ),

                  const SizedBox(height: 32),

                  PrimaryButton(
                    label: isLastPage ? 'Get Started' : 'Continue',
                    icon: isLastPage ? Icons.check_circle_outline_rounded : Icons.arrow_forward_rounded,
                    onPressed: () {
                      if (isLastPage) {
                        _finishOnboarding();
                      } else {
                        _pageController.nextPage(
                          duration: const Duration(milliseconds: 350),
                          curve: Curves.easeInOut,
                        );
                      }
                    },
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
