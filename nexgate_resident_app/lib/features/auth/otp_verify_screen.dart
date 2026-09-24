import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_dimensions.dart';
import '../../core/constants/app_typography.dart';
import '../../core/widgets/primary_button.dart';
import '../../models/user_model.dart';
import '../../services/api_service.dart';
import '../../services/auth_service.dart';
import '../dashboard/main_navigation_shell.dart';

/// 6-digit OTP verification screen with countdown and auto-advancing input.
class OtpVerifyScreen extends StatefulWidget {
  final String mobile;

  const OtpVerifyScreen({super.key, required this.mobile});

  @override
  State<OtpVerifyScreen> createState() => _OtpVerifyScreenState();
}

class _OtpVerifyScreenState extends State<OtpVerifyScreen> {
  final List<TextEditingController> _controllers =
      List.generate(6, (_) => TextEditingController());
  final List<FocusNode> _focusNodes = List.generate(6, (_) => FocusNode());

  int _countdown = 30;
  Timer? _timer;
  bool _isVerifying = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _startTimer();
  }

  void _startTimer() {
    _countdown = 30;
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_countdown > 0) {
        setState(() => _countdown--);
      } else {
        _timer?.cancel();
      }
    });
  }

  String get _otpCode => _controllers.map((c) => c.text).join();

  Future<void> _handleVerify() async {
    final code = _otpCode;
    if (code.length < 6) {
      setState(() => _errorMessage = 'Please enter all 6 digits');
      return;
    }

    setState(() {
      _isVerifying = true;
      _errorMessage = null;
    });

    try {
      final response = await ApiService.verifyOtp(widget.mobile, code);

      final token = response['token']?.toString() ??
          (response['data'] as Map<String, dynamic>?)?['token']?.toString();
      final userJson = response['user'] as Map<String, dynamic>? ??
          (response['data'] as Map<String, dynamic>?)?['user'] as Map<String, dynamic>?;
      final flatJson = response['flat'] as Map<String, dynamic>?;
      final societyJson = response['society'] as Map<String, dynamic>?;

      if (token == null || userJson == null) {
        throw ApiException('Invalid server response payload');
      }

      final user = UserModel(
        id: userJson['id']?.toString() ?? '',
        name: userJson['name']?.toString() ?? 'Resident',
        mobile: userJson['mobile']?.toString() ?? widget.mobile,
        role: userJson['role']?.toString() ?? 'RESIDENT',
        societyId: userJson['societyId']?.toString() ?? societyJson?['id']?.toString() ?? 'soc_greengate',
        flatId: userJson['flatId']?.toString() ?? flatJson?['id']?.toString() ?? '',
        flatNumber: userJson['flatNumber']?.toString() ?? flatJson?['flatNumber']?.toString() ?? 'Unit',
        wing: userJson['wing']?.toString() ?? flatJson?['buildingWing']?.toString() ?? '',
        societyName: societyJson?['name']?.toString() ?? 'Green Gate Residency',
      );

      await AuthService.login(token, user);

      if (!mounted) return;

      Navigator.of(context).pushAndRemoveUntil(
        PageRouteBuilder(
          transitionDuration: const Duration(milliseconds: 500),
          pageBuilder: (context, animation, secondaryAnimation) =>
              const MainNavigationShell(),
          transitionsBuilder: (context, animation, secondaryAnimation, child) {
            return FadeTransition(opacity: animation, child: child);
          },
        ),
        (route) => false,
      );
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _errorMessage = e.toString().replaceFirst('Exception: ', '');
      });
    } finally {
      if (mounted) {
        setState(() => _isVerifying = false);
      }
    }
  }

  Future<void> _handleResend() async {
    setState(() {
      _errorMessage = null;
    });
    try {
      await ApiService.sendOtp(widget.mobile);
      _startTimer();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('A new 6-digit code has been sent'),
          backgroundColor: AppColors.success,
        ),
      );
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _errorMessage = e.toString().replaceFirst('Exception: ', '');
      });
    }
  }

  String _maskPhone(String phone) {
    if (phone.length <= 4) return phone;
    return '${phone.substring(0, 2)}••••••${phone.substring(phone.length - 2)}';
  }

  @override
  void dispose() {
    _timer?.cancel();
    for (final c in _controllers) {
      c.dispose();
    }
    for (final f in _focusNodes) {
      f.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 18),
          onPressed: () => Navigator.of(context).pop(),
        ),
        elevation: 0,
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Enter Verification Code',
                style: AppTypography.displayMedium,
              ),
              const SizedBox(height: 8),
              RichText(
                text: TextSpan(
                  text: 'Enter the 6-digit code sent to ',
                  style: AppTypography.bodyMedium.copyWith(color: AppColors.secondaryText),
                  children: [
                    TextSpan(
                      text: '+91 ${_maskPhone(widget.mobile)}',
                      style: AppTypography.bodyMedium.copyWith(
                        color: AppColors.primaryText,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 36),

              // 6 OTP Digit Boxes
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: List.generate(6, (index) {
                  return SizedBox(
                    width: 48,
                    height: 56,
                    child: TextField(
                      controller: _controllers[index],
                      focusNode: _focusNodes[index],
                      textAlign: TextAlign.center,
                      keyboardType: TextInputType.number,
                      autofocus: index == 0,
                      style: AppTypography.titleLarge.copyWith(
                        fontWeight: FontWeight.w700,
                        color: AppColors.primaryText,
                      ),
                      inputFormatters: [
                        FilteringTextInputFormatter.digitsOnly,
                        LengthLimitingTextInputFormatter(1),
                      ],
                      decoration: InputDecoration(
                        contentPadding: EdgeInsets.zero,
                        filled: true,
                        fillColor: _controllers[index].text.isNotEmpty
                            ? AppColors.lightBlue
                            : AppColors.mainBackground,
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide(
                            color: _controllers[index].text.isNotEmpty
                                ? AppColors.primaryBlue
                                : AppColors.border,
                            width: 1.5,
                          ),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: const BorderSide(
                            color: AppColors.primaryBlue,
                            width: 2.0,
                          ),
                        ),
                      ),
                      onChanged: (val) {
                        if (_errorMessage != null) {
                          setState(() => _errorMessage = null);
                        }
                        if (val.isNotEmpty) {
                          if (index < 5) {
                            _focusNodes[index + 1].requestFocus();
                          } else {
                            _focusNodes[index].unfocus();
                            _handleVerify();
                          }
                        } else if (val.isEmpty && index > 0) {
                          _focusNodes[index - 1].requestFocus();
                        }
                      },
                    ),
                  );
                }),
              ),

              if (_errorMessage != null) ...[
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppColors.errorBackground,
                    borderRadius: AppDimensions.roundedMedium,
                    border: Border.all(color: AppColors.errorBorder),
                  ),
                  child: Row(
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

              const SizedBox(height: 32),

              PrimaryButton(
                label: 'Verify & Continue',
                isLoading: _isVerifying,
                onPressed: _handleVerify,
              ),

              const SizedBox(height: 24),

              // Resend Countdown
              Center(
                child: _countdown > 0
                    ? Text(
                        'Resend code in $_countdown seconds',
                        style: AppTypography.caption.copyWith(
                          color: AppColors.secondaryText,
                        ),
                      )
                    : TextButton(
                        onPressed: _handleResend,
                        child: Text(
                          'Resend Verification Code',
                          style: AppTypography.button.copyWith(
                            color: AppColors.primaryBlue,
                          ),
                        ),
                      ),
              ),

              const SizedBox(height: 32),

              // Dev hint card
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                decoration: BoxDecoration(
                  color: AppColors.lightPurple,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: const Color(0xFFC7D2FE)),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(
                      Icons.info_outline_rounded,
                      size: 16,
                      color: AppColors.deepPurple,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      'Development OTP Hint: 123456',
                      style: AppTypography.caption.copyWith(
                        color: AppColors.deepPurple,
                        fontWeight: FontWeight.w600,
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
