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
  final TextEditingController _otpController = TextEditingController();
  final FocusNode _otpFocusNode = FocusNode();

  int _countdown = 30;
  Timer? _timer;
  bool _isVerifying = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _startTimer();
    _otpController.addListener(() {
      if (mounted) setState(() {});
    });
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

  String get _otpCode => _otpController.text.trim();

  Future<void> _pasteFromClipboard() async {
    try {
      final data = await Clipboard.getData(Clipboard.kTextPlain);
      final raw = data?.text ?? '';
      final digits = raw.replaceAll(RegExp(r'\D'), '');
      if (digits.isNotEmpty) {
        final code = digits.length >= 6 ? digits.substring(0, 6) : digits;
        _otpController.text = code;
        _otpController.selection = TextSelection.collapsed(offset: code.length);
        if (_errorMessage != null) {
          setState(() => _errorMessage = null);
        }
        if (code.length == 6) {
          _otpFocusNode.unfocus();
          _handleVerify();
        }
      }
    } catch (_) {}
  }

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
        societyId: userJson['societyId']?.toString() ?? societyJson?['id']?.toString() ?? '',
        flatId: userJson['flatId']?.toString() ?? flatJson?['id']?.toString() ?? '',
        flatNumber: userJson['flatNumber']?.toString() ?? flatJson?['flatNumber']?.toString() ?? 'Unit',
        wing: userJson['wing']?.toString() ?? flatJson?['buildingWing']?.toString() ?? '',
        societyName: societyJson?['name']?.toString() ?? 'Eco Residency Co-operative Housing Society Ltd',
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
    _otpController.dispose();
    _otpFocusNode.dispose();
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

              // 6 OTP Digit Boxes with full Cut / Copy / Paste & Autofill support
              AutofillGroup(
                child: Stack(
                  children: [
                    // Visual 6 digit pin containers
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: List.generate(6, (index) {
                        final digit = index < _otpController.text.length
                            ? _otpController.text[index]
                            : '';
                        final isFocused = _otpFocusNode.hasFocus &&
                            (index == _otpController.text.length.clamp(0, 5) ||
                                (_otpController.text.length == 6 && index == 5));
                        final isFilled = digit.isNotEmpty;

                        return Container(
                          width: 48,
                          height: 56,
                          alignment: Alignment.center,
                          decoration: BoxDecoration(
                            color: isFilled || isFocused
                                ? AppColors.lightBlue
                                : AppColors.mainBackground,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: isFocused
                                  ? AppColors.primaryBlue
                                  : (isFilled ? AppColors.primaryBlue : AppColors.border),
                              width: isFocused ? 2.0 : 1.5,
                            ),
                          ),
                          child: Text(
                            digit,
                            style: AppTypography.titleLarge.copyWith(
                              fontWeight: FontWeight.w700,
                              color: AppColors.primaryText,
                            ),
                          ),
                        );
                      }),
                    ),

                    // Invisible transparent TextField covering the entire OTP area
                    Positioned.fill(
                      child: Opacity(
                        opacity: 0.0,
                        child: TextField(
                          controller: _otpController,
                          focusNode: _otpFocusNode,
                          autofocus: true,
                          showCursor: false,
                          keyboardType: TextInputType.number,
                          autofillHints: const [AutofillHints.oneTimeCode],
                          enableInteractiveSelection: true,
                          inputFormatters: [
                            FilteringTextInputFormatter.digitsOnly,
                            LengthLimitingTextInputFormatter(6),
                          ],
                          onChanged: (val) {
                            if (_errorMessage != null) {
                              setState(() => _errorMessage = null);
                            }
                            if (val.length == 6) {
                              _otpFocusNode.unfocus();
                              _handleVerify();
                            }
                          },
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 12),

              // Clipboard Paste Shortcut Helper
              Center(
                child: InkWell(
                  onTap: _pasteFromClipboard,
                  borderRadius: BorderRadius.circular(20),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
                    decoration: BoxDecoration(
                      color: AppColors.lightBlue,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: AppColors.border.withValues(alpha: 0.5)),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(
                          Icons.content_paste_rounded,
                          size: 15,
                          color: AppColors.primaryBlue,
                        ),
                        const SizedBox(width: 6),
                        Text(
                          'Paste code from clipboard',
                          style: AppTypography.caption.copyWith(
                            color: AppColors.primaryBlue,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
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
            ],
          ),
        ),
      ),
    );
  }
}
