import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_dimensions.dart';
import '../../core/widgets/custom_button.dart';
import '../../repositories/guard_repository.dart';
import '../../services/api_service.dart';
import '../dashboard/main_navigation.dart';

class LoginScreen extends StatefulWidget {
  final GuardRepository guardRepo;

  const LoginScreen({super.key, required this.guardRepo});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _idController = TextEditingController();
  final _pinController = TextEditingController();
  final _idFocusNode = FocusNode();
  final _pinFocusNode = FocusNode();

  bool _isMobileMode = true; // Default: Mobile number with numeric keyboard
  bool _obscurePin = true;
  bool _isLoading = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _idFocusNode.addListener(() {
      if (mounted) setState(() {});
    });
    _pinFocusNode.addListener(() {
      if (mounted) setState(() {});
    });
  }

  @override
  void dispose() {
    _idController.dispose();
    _pinController.dispose();
    _idFocusNode.dispose();
    _pinFocusNode.dispose();
    super.dispose();
  }

  void _showServerConfigDialog() {
    final currentUrl = widget.guardRepo.storage.getServerUrl();
    final urlController = TextEditingController(text: currentUrl);

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Row(
          children: [
            Icon(Icons.dns, color: AppColors.primary, size: 24),
            SizedBox(width: 8),
            Text('Server Connection', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Backend API URL:',
              style: TextStyle(fontSize: 13, color: AppColors.textSecondary, fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: urlController,
              keyboardType: TextInputType.url,
              style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
              decoration: const InputDecoration(
                hintText: 'https://dazclothess.com/api',
                border: OutlineInputBorder(),
                isDense: true,
              ),
            ),
            const SizedBox(height: 10),
            const Text(
              'Make sure your phone and laptop are connected to the same Wi-Fi.',
              style: TextStyle(fontSize: 11, color: AppColors.textMuted),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
            onPressed: () async {
              final newUrl = urlController.text.trim();
              if (newUrl.isNotEmpty) {
                await widget.guardRepo.storage.setServerUrl(newUrl);
                ApiService.setBaseUrl(newUrl);
                if (mounted) {
                  Navigator.of(ctx).pop();
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Server connected to: $newUrl')),
                  );
                }
              }
            },
            child: const Text('Save', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  void _onKeypadTap(String value) {
    if (_pinController.text.length < 4) {
      setState(() {
        _pinController.text += value;
        _pinController.selection = TextSelection.fromPosition(
          TextPosition(offset: _pinController.text.length),
        );
        _errorMessage = null;
      });
    }
  }

  void _onKeypadBackspace() {
    if (_pinController.text.isNotEmpty) {
      setState(() {
        _pinController.text = _pinController.text.substring(0, _pinController.text.length - 1);
        _pinController.selection = TextSelection.fromPosition(
          TextPosition(offset: _pinController.text.length),
        );
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
      setState(() => _errorMessage = _isMobileMode
          ? 'Please enter 10-digit Mobile Number'
          : 'Please enter your Guard ID');
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
        _errorMessage = 'Invalid ID or PIN. (Default PIN: 1234)';
      });
    }
  }

  Widget _buildQuickChip(String label, String idVal, String pinVal, bool isMobile) {
    return InkWell(
      onTap: () {
        setState(() {
          _isMobileMode = isMobile;
          _idController.text = idVal;
          _pinController.text = pinVal;
          _errorMessage = null;
        });
        FocusScope.of(context).unfocus();
      },
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
        decoration: BoxDecoration(
          color: AppColors.primaryLight,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: AppColors.primary.withOpacity(0.3), width: 1),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.bolt, size: 14, color: AppColors.primary),
            const SizedBox(width: 4),
            Text(
              label,
              style: const TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w700,
                color: AppColors.primaryDark,
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;
    final isKeyboardOpen = bottomInset > 0;

    return Scaffold(
      backgroundColor: AppColors.background,
      resizeToAvoidBottomInset: true,
      body: GestureDetector(
        onTap: () => FocusScope.of(context).unfocus(),
        behavior: HitTestBehavior.opaque,
        child: SafeArea(
          child: SingleChildScrollView(
            keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
            physics: const BouncingScrollPhysics(parent: AlwaysScrollableScrollPhysics()),
            padding: EdgeInsets.fromLTRB(20, 16, 20, isKeyboardOpen ? 40 : 20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                const SizedBox(height: 8),

                // App Logo, Header & Server Settings Button
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        Container(
                          width: 46,
                          height: 46,
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: AppColors.surface,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: AppColors.border, width: 1.5),
                            boxShadow: AppDimensions.cardShadow,
                          ),
                          child: Image.asset(
                            'assets/images/logo.png',
                            fit: BoxFit.contain,
                            errorBuilder: (context, error, stackTrace) => const Icon(
                              Icons.shield,
                              size: 24,
                              color: AppColors.primary,
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
                        const Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'NexGuard',
                              style: TextStyle(
                                fontSize: 20,
                                fontWeight: FontWeight.w800,
                                color: AppColors.textPrimary,
                                letterSpacing: -0.3,
                              ),
                            ),
                            Text(
                              'Gate Terminal · Smart Access',
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                                color: AppColors.textSecondary,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                    IconButton(
                      icon: const Icon(Icons.settings_ethernet, color: AppColors.primary, size: 26),
                      tooltip: 'Server Connection Settings',
                      onPressed: _showServerConfigDialog,
                    ),
                  ],
                ),
                const SizedBox(height: 18),

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
                      // Mode Selector Tabs (Mobile Number / Guard ID)
                      Container(
                        decoration: BoxDecoration(
                          color: AppColors.surfaceLow,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: AppColors.borderLight, width: 1.2),
                        ),
                        padding: const EdgeInsets.all(4),
                        child: Row(
                          children: [
                            Expanded(
                              child: GestureDetector(
                                onTap: () {
                                  setState(() {
                                    _isMobileMode = true;
                                    _idController.clear();
                                    _errorMessage = null;
                                  });
                                  _idFocusNode.requestFocus();
                                },
                                child: AnimatedContainer(
                                  duration: const Duration(milliseconds: 180),
                                  padding: const EdgeInsets.symmetric(vertical: 8),
                                  decoration: BoxDecoration(
                                    color: _isMobileMode ? AppColors.surface : Colors.transparent,
                                    borderRadius: BorderRadius.circular(9),
                                    boxShadow: _isMobileMode ? AppDimensions.cardShadow : null,
                                    border: _isMobileMode
                                        ? Border.all(color: AppColors.primary.withOpacity(0.3), width: 1)
                                        : null,
                                  ),
                                  child: Row(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      Icon(
                                        Icons.phone_android,
                                        size: 16,
                                        color: _isMobileMode ? AppColors.primary : AppColors.textSecondary,
                                      ),
                                      const SizedBox(width: 6),
                                      Text(
                                        'Mobile (Numbers)',
                                        style: TextStyle(
                                          fontSize: 12.5,
                                          fontWeight: _isMobileMode ? FontWeight.w800 : FontWeight.w600,
                                          color: _isMobileMode ? AppColors.primary : AppColors.textSecondary,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                            Expanded(
                              child: GestureDetector(
                                onTap: () {
                                  setState(() {
                                    _isMobileMode = false;
                                    _idController.clear();
                                    _errorMessage = null;
                                  });
                                  _idFocusNode.requestFocus();
                                },
                                child: AnimatedContainer(
                                  duration: const Duration(milliseconds: 180),
                                  padding: const EdgeInsets.symmetric(vertical: 8),
                                  decoration: BoxDecoration(
                                    color: !_isMobileMode ? AppColors.surface : Colors.transparent,
                                    borderRadius: BorderRadius.circular(9),
                                    boxShadow: !_isMobileMode ? AppDimensions.cardShadow : null,
                                    border: !_isMobileMode
                                        ? Border.all(color: AppColors.primary.withOpacity(0.3), width: 1)
                                        : null,
                                  ),
                                  child: Row(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      Icon(
                                        Icons.badge_outlined,
                                        size: 16,
                                        color: !_isMobileMode ? AppColors.primary : AppColors.textSecondary,
                                      ),
                                      const SizedBox(width: 6),
                                      Text(
                                        'Guard ID',
                                        style: TextStyle(
                                          fontSize: 12.5,
                                          fontWeight: !_isMobileMode ? FontWeight.w800 : FontWeight.w600,
                                          color: !_isMobileMode ? AppColors.primary : AppColors.textSecondary,
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
                      const SizedBox(height: 14),

                      // Guard ID / Mobile Label
                      Text(
                        _isMobileMode ? 'MOBILE NUMBER' : 'GUARD USERNAME / ID',
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w800,
                          color: AppColors.textPrimary,
                          letterSpacing: 0.5,
                        ),
                      ),
                      const SizedBox(height: 8),

                      // First Field (Numeric keypad for Mobile, Text for Guard ID)
                      TextField(
                        controller: _idController,
                        focusNode: _idFocusNode,
                        keyboardType: _isMobileMode ? TextInputType.phone : TextInputType.text,
                        textInputAction: TextInputAction.next,
                        inputFormatters: _isMobileMode
                            ? [
                                FilteringTextInputFormatter.digitsOnly,
                                LengthLimitingTextInputFormatter(10),
                              ]
                            : [
                                LengthLimitingTextInputFormatter(30),
                              ],
                        scrollPadding: const EdgeInsets.only(bottom: 120),
                        style: TextStyle(
                          fontSize: 17,
                          fontWeight: FontWeight.w700,
                          color: AppColors.textPrimary,
                          letterSpacing: _isMobileMode ? 1.5 : 0.5,
                        ),
                        decoration: InputDecoration(
                          prefixIcon: Icon(
                            _isMobileMode ? Icons.phone_android : Icons.badge,
                            size: 22,
                            color: AppColors.primary,
                          ),
                          prefixText: _isMobileMode ? '+91 ' : null,
                          prefixStyle: const TextStyle(
                            fontSize: 17,
                            fontWeight: FontWeight.w800,
                            color: AppColors.primary,
                          ),
                          hintText: _isMobileMode ? '9800011122' : 'guard_ramesh',
                          hintStyle: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w500,
                            color: AppColors.textMuted.withOpacity(0.7),
                            letterSpacing: 0,
                          ),
                          suffixIcon: _idController.text.isNotEmpty
                              ? IconButton(
                                  icon: const Icon(Icons.clear, size: 20, color: AppColors.textSecondary),
                                  onPressed: () => setState(() => _idController.clear()),
                                )
                              : null,
                        ),
                        onChanged: (_) => setState(() {}),
                        onSubmitted: (_) {
                          // Jump smoothly to 4-digit PIN!
                          FocusScope.of(context).requestFocus(_pinFocusNode);
                        },
                      ),
                      const SizedBox(height: 18),

                      // 4-Digit Security PIN Section Header
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text(
                            '4-DIGIT SECURITY PIN',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w800,
                              color: AppColors.textPrimary,
                              letterSpacing: 0.5,
                            ),
                          ),
                          GestureDetector(
                            onTap: () => setState(() => _obscurePin = !_obscurePin),
                            child: Padding(
                              padding: const EdgeInsets.symmetric(vertical: 4, horizontal: 6),
                              child: Row(
                                children: [
                                  Icon(
                                    _obscurePin ? Icons.visibility : Icons.visibility_off,
                                    size: 16,
                                    color: AppColors.primary,
                                  ),
                                  const SizedBox(width: 4),
                                  Text(
                                    _obscurePin ? 'Show' : 'Hide',
                                    style: const TextStyle(
                                      fontSize: 12,
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

                      // 4-Digit Interactive PIN Boxes + Invisible Keyboard Target
                      GestureDetector(
                        onTap: () {
                          _pinFocusNode.requestFocus();
                        },
                        behavior: HitTestBehavior.opaque,
                        child: Stack(
                          alignment: Alignment.center,
                          children: [
                            // Visual PIN Boxes
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: List.generate(4, (index) {
                                final pin = _pinController.text;
                                final isFilled = index < pin.length;
                                final isCurrent = _pinFocusNode.hasFocus &&
                                    (index == pin.length || (pin.length == 4 && index == 3));
                                final digit = isFilled ? pin[index] : '';

                                return Container(
                                  width: 64,
                                  height: 60,
                                  decoration: BoxDecoration(
                                    color: isCurrent
                                        ? AppColors.primaryLight.withOpacity(0.6)
                                        : (isFilled ? AppColors.surface : AppColors.surfaceLow),
                                    borderRadius: BorderRadius.circular(14),
                                    border: Border.all(
                                      color: _errorMessage != null
                                          ? AppColors.error
                                          : (isCurrent
                                              ? AppColors.primary
                                              : (isFilled
                                                  ? AppColors.primary.withOpacity(0.5)
                                                  : AppColors.border)),
                                      width: isCurrent ? 2.2 : 1.5,
                                    ),
                                    boxShadow: isCurrent ? AppDimensions.cardShadow : null,
                                  ),
                                  child: Center(
                                    child: isFilled
                                        ? (_obscurePin
                                            ? Container(
                                                width: 16,
                                                height: 16,
                                                decoration: const BoxDecoration(
                                                  color: AppColors.primary,
                                                  shape: BoxShape.circle,
                                                ),
                                              )
                                            : Text(
                                                digit,
                                                style: const TextStyle(
                                                  fontSize: 24,
                                                  fontWeight: FontWeight.w800,
                                                  color: AppColors.primaryDark,
                                                ),
                                              ))
                                        : (isCurrent
                                            ? Container(
                                                width: 2.2,
                                                height: 22,
                                                decoration: BoxDecoration(
                                                  color: AppColors.primary,
                                                  borderRadius: BorderRadius.circular(2),
                                                ),
                                              )
                                            : Container(
                                                width: 8,
                                                height: 8,
                                                decoration: const BoxDecoration(
                                                  color: AppColors.border,
                                                  shape: BoxShape.circle,
                                                ),
                                              )),
                                  ),
                                );
                              }),
                            ),

                            // Invisible TextField capturing soft keyboard events
                            Opacity(
                              opacity: 0.0,
                              child: SizedBox(
                                height: 60,
                                child: TextField(
                                  controller: _pinController,
                                  focusNode: _pinFocusNode,
                                  keyboardType: TextInputType.number,
                                  inputFormatters: [
                                    FilteringTextInputFormatter.digitsOnly,
                                    LengthLimitingTextInputFormatter(4),
                                  ],
                                  textInputAction: TextInputAction.done,
                                  enableSuggestions: false,
                                  autocorrect: false,
                                  scrollPadding: const EdgeInsets.only(bottom: 120),
                                  onChanged: (val) {
                                    setState(() {
                                      _errorMessage = null;
                                    });
                                  },
                                  onSubmitted: (_) {
                                    _handleLogin();
                                  },
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),

                      // Error message banner
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

                      // Quick Demo Login Chips
                      const SizedBox(height: 14),
                      Row(
                        children: [
                          const Text(
                            'QUICK:',
                            style: TextStyle(
                              fontSize: 10.5,
                              fontWeight: FontWeight.w800,
                              color: AppColors.textMuted,
                              letterSpacing: 0.5,
                            ),
                          ),
                          const SizedBox(width: 6),
                          Expanded(
                            child: SingleChildScrollView(
                              scrollDirection: Axis.horizontal,
                              physics: const BouncingScrollPhysics(),
                              child: Row(
                                children: [
                                  _buildQuickChip('Ramesh (9800011122)', '9800011122', '1234', true),
                                  const SizedBox(width: 6),
                                  _buildQuickChip('Suresh (9800011123)', '9800011123', '1234', true),
                                  const SizedBox(width: 6),
                                  _buildQuickChip('guard_ramesh', 'guard_ramesh', '1234', false),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),

                      const SizedBox(height: 16),

                      // On-Screen Keypad (Visible when soft keyboard is NOT open)
                      if (!isKeyboardOpen) ...[
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
                        const SizedBox(height: 18),
                      ] else ...[
                        // Micro helper when soft keyboard is open
                        Container(
                          padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 12),
                          decoration: BoxDecoration(
                            color: AppColors.surfaceLow,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.keyboard, size: 15, color: AppColors.textMuted),
                              SizedBox(width: 6),
                              Text(
                                'Press Enter ↵ on keyboard to sign in directly',
                                style: TextStyle(
                                  fontSize: 11.5,
                                  fontWeight: FontWeight.w600,
                                  color: AppColors.textSecondary,
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 12),
                      ],

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
                  'Default PIN: 1234 • Gate Terminal v1.0',
                  style: TextStyle(
                    fontSize: 12.5,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textSecondary,
                  ),
                ),
              ],
            ),
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
      height: 56,
      child: Material(
        color: isAction ? AppColors.surfaceLow : AppColors.surface,
        borderRadius: AppDimensions.roundedMd,
        elevation: 1,
        shape: const RoundedRectangleBorder(
          borderRadius: AppDimensions.roundedMd,
          side: BorderSide(color: AppColors.border, width: 1.5),
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
