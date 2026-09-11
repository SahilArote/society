import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_dimensions.dart';
import '../../core/widgets/custom_button.dart';
import '../../repositories/guard_repository.dart';
import '../dashboard/main_navigation.dart';

class LoginScreen extends StatefulWidget {
  final GuardRepository guardRepo;

  const LoginScreen({super.key, required this.guardRepo});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _idController = TextEditingController(text: 'GRD-8821');
  final _pinController = TextEditingController();
  bool _obscurePin = true;
  bool _isLoading = false;
  String? _errorMessage;

  @override
  void dispose() {
    _idController.dispose();
    _pinController.dispose();
    super.dispose();
  }

  void _onKeypadTap(String value) {
    if (_pinController.text.length < 4) {
      setState(() {
        _pinController.text += value;
        _errorMessage = null;
      });
    }
  }

  void _onKeypadBackspace() {
    if (_pinController.text.isNotEmpty) {
      setState(() {
        _pinController.text = _pinController.text.substring(0, _pinController.text.length - 1);
        _errorMessage = null;
      });
    }
  }

  void _onKeypadClear() {
    setState(() {
      _pinController.clear();
      _errorMessage = null;
    });
  }

  Future<void> _handleLogin() async {
    final id = _idController.text.trim();
    final pin = _pinController.text.trim();

    if (id.isEmpty) {
      setState(() => _errorMessage = 'Please enter your Guard ID or Mobile');
      return;
    }

    if (pin.length < 4) {
      setState(() => _errorMessage = 'Please enter your 4-digit PIN');
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    final success = await widget.guardRepo.login(id, pin);

    if (!mounted) return;
    setState(() => _isLoading = false);

    if (success) {
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(
          builder: (_) => MainNavigation(guardRepo: widget.guardRepo),
        ),
      );
    } else {
      setState(() {
        _errorMessage = 'Invalid ID or PIN. (Default: 1234)';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final pinLength = _pinController.text.length;

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              const SizedBox(height: 8),
              // App Logo & Header
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Container(
                    width: 52,
                    height: 52,
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: AppColors.surface,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: AppColors.border, width: 1.5),
                      boxShadow: AppDimensions.cardShadow,
                    ),
                    child: Image.asset(
                      'assets/images/logo.png',
                      fit: BoxFit.contain,
                      errorBuilder: (context, error, stackTrace) => const Icon(
                        Icons.shield,
                        size: 28,
                        color: AppColors.primary,
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  const Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'GreenGate Guard',
                        style: TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.w800,
                          color: AppColors.textPrimary,
                          letterSpacing: -0.3,
                        ),
                      ),
                      Text(
                        'Gate Security Terminal',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 20),

              // Login Card
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: AppDimensions.roundedXl,
                  border: Border.all(color: AppColors.border, width: 1.5),
                  boxShadow: AppDimensions.cardShadow,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Guard ID / Mobile
                    const Text(
                      'GUARD ID OR MOBILE',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w800,
                        color: AppColors.textPrimary,
                        letterSpacing: 0.5,
                      ),
                    ),
                    const SizedBox(height: 8),
                    TextField(
                      controller: _idController,
                      style: const TextStyle(
                        fontSize: 17,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textPrimary,
                      ),
                      decoration: InputDecoration(
                        prefixIcon: const Icon(Icons.badge, size: 24, color: AppColors.primary),
                        hintText: 'GRD-8821 or Mobile Number',
                        suffixIcon: _idController.text.isNotEmpty
                            ? IconButton(
                                icon: const Icon(Icons.clear, size: 22, color: AppColors.textSecondary),
                                onPressed: () => setState(() => _idController.clear()),
                              )
                            : null,
                      ),
                      onChanged: (_) => setState(() {}),
                    ),
                    const SizedBox(height: 18),

                    // 4-Digit Security PIN
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          '4-DIGIT SECURITY PIN',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w800,
                            color: AppColors.textPrimary,
                            letterSpacing: 0.5,
                          ),
                        ),
                        GestureDetector(
                          onTap: () => setState(() => _obscurePin = !_obscurePin),
                          child: Padding(
                            padding: const EdgeInsets.symmetric(vertical: 4, horizontal: 8),
                            child: Row(
                              children: [
                                Icon(
                                  _obscurePin ? Icons.visibility : Icons.visibility_off,
                                  size: 18,
                                  color: AppColors.primary,
                                ),
                                const SizedBox(width: 4),
                                Text(
                                  _obscurePin ? 'Show' : 'Hide',
                                  style: const TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w700,
                                    color: AppColors.primary,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),

                    // PIN Dots Container
                    Container(
                      height: 56,
                      padding: const EdgeInsets.symmetric(horizontal: 18),
                      decoration: BoxDecoration(
                        color: AppColors.surfaceLow,
                        borderRadius: AppDimensions.roundedMd,
                        border: Border.all(
                          color: _errorMessage != null ? AppColors.error : AppColors.border,
                          width: 1.5,
                        ),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          if (_obscurePin)
                            Row(
                              children: List.generate(4, (index) {
                                final isFilled = index < pinLength;
                                return Container(
                                  margin: const EdgeInsets.only(right: 14),
                                  width: 18,
                                  height: 18,
                                  decoration: BoxDecoration(
                                    color: isFilled ? AppColors.primary : AppColors.border,
                                    shape: BoxShape.circle,
                                    border: Border.all(
                                      color: isFilled ? AppColors.primaryDark : AppColors.textMuted,
                                      width: 1.5,
                                    ),
                                  ),
                                );
                              }),
                            )
                          else
                            Text(
                              _pinController.text.padRight(4, '—'),
                              style: const TextStyle(
                                fontSize: 24,
                                fontWeight: FontWeight.w800,
                                letterSpacing: 10,
                                color: AppColors.primary,
                              ),
                            ),
                          Text(
                            '$pinLength of 4',
                            style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                              color: AppColors.textSecondary,
                            ),
                          ),
                        ],
                      ),
                    ),

                    if (_errorMessage != null) ...[
                      const SizedBox(height: 10),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        decoration: BoxDecoration(
                          color: AppColors.errorLight,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.error_outline, size: 18, color: AppColors.error),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                _errorMessage!,
                                style: const TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.errorText,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],

                    const SizedBox(height: 18),

                    // Large 3x4 On-Screen Keypad (56px high buttons for wet/outdoor fingers)
                    Column(
                      children: [
                        _buildKeypadRow(['1', '2', '3']),
                        const SizedBox(height: 10),
                        _buildKeypadRow(['4', '5', '6']),
                        const SizedBox(height: 10),
                        _buildKeypadRow(['7', '8', '9']),
                        const SizedBox(height: 10),
                        Row(
                          children: [
                            Expanded(
                              child: _buildKeypadButton(
                                label: 'CLEAR',
                                isAction: true,
                                onTap: _onKeypadClear,
                              ),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: _buildKeypadButton(
                                label: '0',
                                onTap: () => _onKeypadTap('0'),
                              ),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: _buildKeypadButton(
                                icon: Icons.backspace,
                                isAction: true,
                                isDanger: true,
                                onTap: _onKeypadBackspace,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),

                    const SizedBox(height: 22),

                    // Primary Login Button (60px height)
                    CustomButton(
                      text: 'LOGIN TO GATE KIOSK',
                      icon: Icons.login,
                      height: 60,
                      isLoading: _isLoading,
                      onPressed: _handleLogin,
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 16),
              const Text(
                'Default PIN: 1234 • Gate 01',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textSecondary,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildKeypadRow(List<String> keys) {
    return Row(
      children: keys.map((key) {
        return Expanded(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 5),
            child: _buildKeypadButton(
              label: key,
              onTap: () => _onKeypadTap(key),
            ),
          ),
        );
      }).toList(),
    );
  }

  Widget _buildKeypadButton({
    String? label,
    IconData? icon,
    bool isAction = false,
    bool isDanger = false,
    required VoidCallback onTap,
  }) {
    return SizedBox(
      height: 56, // 56px minimum touch target for fingers
      child: Material(
        color: isAction ? AppColors.surfaceLow : AppColors.surface,
        borderRadius: AppDimensions.roundedMd,
        elevation: 1,
        shape: RoundedRectangleBorder(
          borderRadius: AppDimensions.roundedMd,
          side: const BorderSide(color: AppColors.border, width: 1.5),
        ),
        child: InkWell(
          borderRadius: AppDimensions.roundedMd,
          onTap: onTap,
          child: Center(
            child: icon != null
                ? Icon(
                    icon,
                    size: 24,
                    color: isDanger ? AppColors.error : AppColors.textPrimary,
                  )
                : Text(
                    label ?? '',
                    style: TextStyle(
                      fontSize: isAction ? 14 : 22,
                      fontWeight: FontWeight.w800,
                      color: isDanger ? AppColors.error : AppColors.textPrimary,
                    ),
                  ),
          ),
        ),
      ),
    );
  }
}
