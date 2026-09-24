import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_dimensions.dart';
import '../../core/constants/app_typography.dart';
import '../../core/widgets/custom_text_field.dart';
import '../../core/widgets/primary_button.dart';
import '../../services/api_service.dart';
import 'otp_verify_screen.dart';
import 'register_screen.dart';

/// Resident Login Screen with 10-digit mobile number entry.
class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final TextEditingController _phoneController = TextEditingController();
  bool _isLoading = false;
  String? _errorMessage;

  Future<void> _handleSendOtp() async {
    final raw = _phoneController.text.trim();
    final clean = raw.replaceAll(RegExp(r'\D'), '');

    if (clean.length < 10) {
      setState(() {
        _errorMessage = 'Please enter a valid 10-digit mobile number';
      });
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      await ApiService.sendOtp(clean);
      if (!mounted) return;
      Navigator.of(context).push(
        MaterialPageRoute(
          builder: (_) => OtpVerifyScreen(mobile: clean),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      if (e is ApiException) {
        if (e.code == 'REGISTRATION_PENDING') {
          Navigator.of(context).push(
            MaterialPageRoute(
              builder: (_) => RegisterScreen(
                initialMobile: clean,
                initialStep: 4,
              ),
            ),
          );
          return;
        } else if (e.code == 'REGISTRATION_REJECTED') {
          setState(() {
            _errorMessage = 'Registration rejected: ${e.message}';
          });
          return;
        } else if (e.code == 'USER_NOT_REGISTERED' || e.statusCode == 404) {
          setState(() {
            _errorMessage = 'Mobile number is not registered. Tap below to register your flat.';
          });
          return;
        }
      }
      setState(() {
        _errorMessage = e.toString().replaceFirst('Exception: ', '');
      });
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  void dispose() {
    _phoneController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Top Brand Header
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Container(
                        width: 38,
                        height: 38,
                        decoration: BoxDecoration(
                          color: AppColors.lightBlue,
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: const Color(0xFFBFDBFE)),
                        ),
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(9),
                          child: Image.asset(
                            'assets/images/logo.png',
                            fit: BoxFit.contain,
                            errorBuilder: (ctx, err, stack) => const Icon(
                              Icons.shield_rounded,
                              color: AppColors.primaryBlue,
                              size: 22,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Text(
                        'NexGate',
                        style: AppTypography.titleLarge.copyWith(
                          fontWeight: FontWeight.w800,
                          color: AppColors.primaryText,
                        ),
                      ),
                    ],
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppColors.mainBackground,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: AppColors.border),
                    ),
                    child: Text(
                      'Resident Portal',
                      style: AppTypography.caption.copyWith(
                        color: AppColors.secondaryText,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 48),

              // Title Section
              Text(
                'Welcome back 👋',
                style: AppTypography.displayLarge,
              ),
              const SizedBox(height: 8),
              Text(
                'Enter your registered mobile number associated with your society flat.',
                style: AppTypography.bodyMedium.copyWith(
                  color: AppColors.secondaryText,
                  height: 1.5,
                ),
              ),

              const SizedBox(height: 36),

              // Mobile Input
              CustomTextField(
                controller: _phoneController,
                label: 'Registered Mobile Number',
                hint: 'Enter 10-digit number',
                keyboardType: TextInputType.phone,
                autofocus: true,
                inputFormatters: [
                  FilteringTextInputFormatter.digitsOnly,
                  LengthLimitingTextInputFormatter(10),
                ],
                prefix: Container(
                  width: 58,
                  alignment: Alignment.center,
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        '+91',
                        style: AppTypography.bodyLarge.copyWith(
                          fontWeight: FontWeight.w700,
                          color: AppColors.primaryText,
                        ),
                      ),
                      const SizedBox(width: 4),
                      Container(
                        width: 1,
                        height: 18,
                        color: AppColors.border,
                      ),
                    ],
                  ),
                ),
                onChanged: (_) {
                  if (_errorMessage != null) {
                    setState(() => _errorMessage = null);
                  }
                },
              ),

              if (_errorMessage != null) ...[
                const SizedBox(height: 14),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppColors.errorBackground,
                    borderRadius: AppDimensions.roundedMedium,
                    border: Border.all(color: AppColors.errorBorder),
                  ),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Icon(
                        Icons.error_outline_rounded,
                        size: 18,
                        color: AppColors.error,
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          _errorMessage!,
                          style: AppTypography.caption.copyWith(
                            color: AppColors.error,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],

              const SizedBox(height: 28),

              PrimaryButton(
                label: 'Send Verification Code',
                isLoading: _isLoading,
                icon: Icons.arrow_forward_rounded,
                onPressed: _handleSendOtp,
              ),

              const SizedBox(height: 28),

              // Register Flat Navigation Link
              Center(
                child: TextButton(
                  onPressed: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (_) => RegisterScreen(
                          initialMobile: _phoneController.text.trim(),
                        ),
                      ),
                    );
                  },
                  child: RichText(
                    text: TextSpan(
                      text: "New resident? ",
                      style: AppTypography.bodySmall,
                      children: [
                        TextSpan(
                          text: 'Register your flat',
                          style: AppTypography.bodySmall.copyWith(
                            color: AppColors.primaryBlue,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),

              const SizedBox(height: 40),

              // Security Trust Badge
              Center(
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(
                      Icons.lock_outline_rounded,
                      size: 14,
                      color: AppColors.mutedText,
                    ),
                    const SizedBox(width: 6),
                    Text(
                      'End-to-End Encrypted Society Security',
                      style: AppTypography.caption.copyWith(
                        color: AppColors.mutedText,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
