import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../repositories/guard_repository.dart';
import '../../services/api_service.dart';
import '../dashboard/main_navigation.dart';
import 'login_tokens.dart';

class LoginScreen extends StatefulWidget {
  final GuardRepository guardRepo;

  const LoginScreen({super.key, required this.guardRepo});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen>
    with SingleTickerProviderStateMixin {
  final _mobileController = TextEditingController();
  final _mobileFocusNode = FocusNode();

  final List<TextEditingController> _pinControllers =
      List.generate(4, (_) => TextEditingController());
  final List<FocusNode> _pinFocusNodes = List.generate(4, (_) => FocusNode());

  late AnimationController _shakeController;
  late Animation<double> _shakeAnimation;

  bool _obscurePin = true;
  bool _isLoading = false;
  bool _isButtonPressed = false;
  String? _errorMessage;

  String get _fullPin => _pinControllers.map((c) => c.text).join();

  @override
  void initState() {
    super.initState();

    // 300ms single cycle shake animation on invalid login
    _shakeController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 300),
    );
    _shakeAnimation = TweenSequence<double>([
      TweenSequenceItem(tween: Tween(begin: 0.0, end: -8.0), weight: 1),
      TweenSequenceItem(tween: Tween(begin: -8.0, end: 8.0), weight: 2),
      TweenSequenceItem(tween: Tween(begin: 8.0, end: -6.0), weight: 2),
      TweenSequenceItem(tween: Tween(begin: -6.0, end: 6.0), weight: 2),
      TweenSequenceItem(tween: Tween(begin: 6.0, end: -3.0), weight: 2),
      TweenSequenceItem(tween: Tween(begin: -3.0, end: 0.0), weight: 1),
    ]).animate(CurvedAnimation(
      parent: _shakeController,
      curve: Curves.easeInOut,
    ));

    _mobileFocusNode.addListener(() {
      if (mounted) setState(() {});
    });

    for (int i = 0; i < 4; i++) {
      final index = i;
      _pinFocusNodes[index].addListener(() {
        if (mounted) setState(() {});
      });

      // Backspace moves focus to previous box
      _pinFocusNodes[index].onKeyEvent = (node, event) {
        if (event is KeyDownEvent &&
            event.logicalKey == LogicalKeyboardKey.backspace) {
          if (_pinControllers[index].text.isEmpty && index > 0) {
            _pinFocusNodes[index - 1].requestFocus();
            _pinControllers[index - 1].clear();
            setState(() {});
            return KeyEventResult.handled;
          }
        }
        return KeyEventResult.ignored;
      };
    }
  }

  @override
  void dispose() {
    _shakeController.dispose();
    _mobileController.dispose();
    _mobileFocusNode.dispose();
    for (final c in _pinControllers) {
      c.dispose();
    }
    for (final fn in _pinFocusNodes) {
      fn.dispose();
    }
    super.dispose();
  }

  void _clearError() {
    if (_errorMessage != null) {
      setState(() => _errorMessage = null);
    }
  }

  void _showServerConfigDialog() {
    final currentUrl = widget.guardRepo.storage.getServerUrl();
    final urlController = TextEditingController(text: currentUrl);

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: LoginTokens.card,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
        title: Row(
          children: [
            const Icon(Icons.dns_rounded, color: LoginTokens.primary, size: 20),
            const SizedBox(width: 8),
            Text(
              'Server Connection',
              style: LoginTokens.font(
                size: 16,
                weight: FontWeight.w700,
                color: LoginTokens.ink,
              ),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Backend API URL:',
              style: LoginTokens.font(
                size: 12,
                weight: FontWeight.w600,
                color: LoginTokens.muted,
              ),
            ),
            const SizedBox(height: 6),
            TextField(
              controller: urlController,
              keyboardType: TextInputType.url,
              style: LoginTokens.font(
                size: 13,
                weight: FontWeight.w600,
                color: LoginTokens.inputText,
              ),
              decoration: InputDecoration(
                hintText: 'https://dazclothess.com/api',
                filled: true,
                fillColor: LoginTokens.bg,
                contentPadding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: const BorderSide(color: LoginTokens.borderSoft),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: const BorderSide(color: LoginTokens.borderSoft),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide:
                      const BorderSide(color: LoginTokens.primary, width: 1.5),
                ),
                isDense: true,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              'Default endpoint: https://dazclothess.com/api',
              style: LoginTokens.font(
                size: 11,
                weight: FontWeight.w500,
                color: LoginTokens.footer,
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: Text(
              'Cancel',
              style: LoginTokens.font(
                size: 13,
                weight: FontWeight.w600,
                color: LoginTokens.muted,
              ),
            ),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: LoginTokens.primary,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8),
              ),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            ),
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
            child: Text(
              'Save',
              style: LoginTokens.font(
                size: 13,
                weight: FontWeight.w700,
                color: Colors.white,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _handleLogin() async {
    final mobile = _mobileController.text.trim();
    final pin = _fullPin.trim();

    if (mobile.isEmpty) {
      setState(() => _errorMessage = 'Please enter Guard Mobile Number');
      _mobileFocusNode.requestFocus();
      return;
    }

    if (mobile.length < 10) {
      setState(
          () => _errorMessage = 'Please enter valid 10-digit Mobile Number');
      _mobileFocusNode.requestFocus();
      return;
    }

    if (pin.length < 4) {
      setState(() => _errorMessage = 'Please enter 4-digit Security PIN');
      for (int i = 0; i < 4; i++) {
        if (_pinControllers[i].text.isEmpty) {
          _pinFocusNodes[i].requestFocus();
          break;
        }
      }
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    final success = await widget.guardRepo.login(mobile, pin);

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
        _errorMessage = 'Invalid mobile number or security PIN';
        for (final c in _pinControllers) {
          c.clear();
        }
      });
      _shakeController.forward(from: 0.0);
      _pinFocusNodes[0].requestFocus();
    }
  }

  void _onPinDigitChanged(int index, String value) {
    _clearError();

    final digits = value.replaceAll(RegExp(r'\D'), '');

    // Paste of 4 digits fills all boxes
    if (digits.length >= 4) {
      for (int i = 0; i < 4; i++) {
        _pinControllers[i].text = digits[i];
      }
      _pinFocusNodes[3].requestFocus();
      setState(() {});
      if (_mobileController.text.length == 10) {
        _handleLogin();
      }
      return;
    }

    // Single digit input
    if (digits.isNotEmpty) {
      final singleChar = digits[digits.length - 1];
      if (_pinControllers[index].text != singleChar) {
        _pinControllers[index].text = singleChar;
      }
      if (index < 3) {
        _pinFocusNodes[index + 1].requestFocus();
      } else {
        _pinFocusNodes[3].unfocus();
        if (_mobileController.text.length == 10 && _fullPin.length == 4) {
          _handleLogin();
        }
      }
    } else {
      _pinControllers[index].clear();
    }
    setState(() {});
  }

  void _onDemoLoginTap(String mobile, String pin) {
    _clearError();
    _mobileController.text = mobile;
    for (int i = 0; i < 4 && i < pin.length; i++) {
      _pinControllers[i].text = pin[i];
    }
    FocusScope.of(context).unfocus();
    setState(() {});
    _handleLogin();
  }

  // ===========================================================================
  // 1. LIVE CLOUD CHIP (compact 32px height)
  // ===========================================================================
  Widget _buildLiveCloudChip() {
    return Align(
      alignment: Alignment.centerRight,
      child: Semantics(
        button: true,
        label: 'Live Cloud server connection settings',
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: _showServerConfigDialog,
            borderRadius: BorderRadius.circular(LoginTokens.liveChipRadius),
            child: Container(
              height: LoginTokens.liveChipHeight,
              padding: const EdgeInsets.symmetric(
                horizontal: LoginTokens.liveChipPaddingHorizontal,
              ),
              decoration: BoxDecoration(
                color: LoginTokens.card,
                borderRadius:
                    BorderRadius.circular(LoginTokens.liveChipRadius),
                border: Border.all(
                  color: LoginTokens.borderSoft,
                  width: 1.0,
                ),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: LoginTokens.liveDotSize,
                    height: LoginTokens.liveDotSize,
                    decoration: const BoxDecoration(
                      color: LoginTokens.live,
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 6),
                  Text(
                    'Live Cloud',
                    style: LoginTokens.font(
                      size: 12,
                      weight: FontWeight.w600,
                      color: LoginTokens.liveChipTextColor,
                    ),
                  ),
                  const SizedBox(width: 5),
                  const Icon(
                    Icons.tune_rounded,
                    size: 13,
                    color: LoginTokens.muted,
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  // ===========================================================================
  // 2. LOGO TILE (54px squircle)
  // ===========================================================================
  Widget _buildLogoTile() {
    return Container(
      width: LoginTokens.logoTileSize,
      height: LoginTokens.logoTileSize,
      decoration: BoxDecoration(
        color: LoginTokens.primary,
        borderRadius: BorderRadius.circular(LoginTokens.logoTileRadius),
        boxShadow: LoginTokens.logoShadow,
      ),
      alignment: Alignment.center,
      child: Text(
        'N',
        style: LoginTokens.font(
          size: 26,
          weight: FontWeight.w800,
          color: Colors.white,
        ),
      ),
    );
  }

  // ===========================================================================
  // 5a. MOBILE NUMBER FIELD (Pure solid white, no grey fill inside)
  // ===========================================================================
  Widget _buildMobileSection() {
    final isFocused = _mobileFocusNode.hasFocus;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Guard Mobile Number',
          style: LoginTokens.font(
            size: 12,
            weight: FontWeight.w700,
            color: LoginTokens.ink,
          ),
        ),
        const SizedBox(height: 6),
        Semantics(
          label: 'Guard Mobile Number',
          textField: true,
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 150),
            height: LoginTokens.fieldHeight,
            padding: const EdgeInsets.symmetric(
              horizontal: LoginTokens.fieldPaddingHorizontal,
            ),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(LoginTokens.fieldRadius),
              border: Border.all(
                color: isFocused ? LoginTokens.primary : LoginTokens.borderField,
                width: LoginTokens.fieldBorderWidth,
              ),
              boxShadow: isFocused
                  ? const [
                      BoxShadow(
                        color: LoginTokens.focusRing,
                        spreadRadius: LoginTokens.focusRingSpread,
                        blurRadius: 0,
                      ),
                    ]
                  : null,
            ),
            child: Row(
              children: [
                const Icon(
                  Icons.phone_android_rounded,
                  size: 18,
                  color: LoginTokens.ink,
                ),
                const SizedBox(width: LoginTokens.fieldGap),
                Text(
                  '+91',
                  style: LoginTokens.font(
                    size: 14,
                    weight: FontWeight.w700,
                    color: LoginTokens.ink,
                  ),
                ),
                const SizedBox(width: LoginTokens.fieldGap),
                Container(
                  width: 1.0,
                  height: 20.0,
                  color: LoginTokens.borderField,
                ),
                const SizedBox(width: LoginTokens.fieldGap),
                Expanded(
                  child: TextField(
                    controller: _mobileController,
                    focusNode: _mobileFocusNode,
                    keyboardType: TextInputType.number,
                    textInputAction: TextInputAction.next,
                    style: LoginTokens.font(
                      size: 14,
                      weight: FontWeight.w600,
                      color: LoginTokens.inputText,
                    ),
                    inputFormatters: [
                      FilteringTextInputFormatter.digitsOnly,
                      LengthLimitingTextInputFormatter(10),
                    ],
                    decoration: InputDecoration(
                      hintText: '98000 11122',
                      filled: false,
                      fillColor: Colors.transparent,
                      hintStyle: LoginTokens.font(
                        size: 14,
                        weight: FontWeight.w500,
                        color: LoginTokens.borderField,
                      ),
                      border: InputBorder.none,
                      enabledBorder: InputBorder.none,
                      focusedBorder: InputBorder.none,
                      errorBorder: InputBorder.none,
                      focusedErrorBorder: InputBorder.none,
                      isDense: true,
                      contentPadding: EdgeInsets.zero,
                    ),
                    onChanged: (val) {
                      _clearError();
                      if (val.length == 10) {
                        _pinFocusNodes[0].requestFocus();
                      }
                      setState(() {});
                    },
                    onSubmitted: (_) {
                      _pinFocusNodes[0].requestFocus();
                    },
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  // ===========================================================================
  // 5b. 4-DIGIT SECURITY PIN SECTION (Pure solid white, no grey fill inside)
  // ===========================================================================
  Widget _buildPinSection() {
    final hasError = _errorMessage != null;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Header Row: Label + Show/Hide PIN Button
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              '4-Digit Security PIN',
              style: LoginTokens.font(
                size: 12,
                weight: FontWeight.w700,
                color: LoginTokens.ink,
              ),
            ),
            Semantics(
              button: true,
              label: _obscurePin ? 'Show PIN' : 'Hide PIN',
              child: Material(
                color: Colors.transparent,
                child: InkWell(
                  onTap: () => setState(() => _obscurePin = !_obscurePin),
                  borderRadius:
                      BorderRadius.circular(LoginTokens.pinButtonRadius),
                  child: Container(
                    height: LoginTokens.pinButtonHeight,
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    decoration: BoxDecoration(
                      color: LoginTokens.primaryTint,
                      borderRadius:
                          BorderRadius.circular(LoginTokens.pinButtonRadius),
                    ),
                    alignment: Alignment.center,
                    child: Text(
                      _obscurePin ? 'Show PIN' : 'Hide PIN',
                      style: LoginTokens.font(
                        size: 11,
                        weight: FontWeight.w700,
                        color: LoginTokens.primaryDark,
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 6),

        // 4 PIN Boxes in a Row with Shake Animation on error
        AnimatedBuilder(
          animation: _shakeAnimation,
          builder: (context, child) {
            return Transform.translate(
              offset: Offset(_shakeAnimation.value, 0),
              child: child,
            );
          },
          child: LayoutBuilder(
            builder: (context, constraints) {
              final availableWidth = constraints.maxWidth;
              final boxWidth = ((availableWidth - 3 * 8.0) / 4)
                  .clamp(44.0, LoginTokens.pinBoxWidth);

              return Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: List.generate(4, (index) {
                  return _buildPinBox(index, boxWidth, hasError);
                }),
              );
            },
          ),
        ),

        // Error message under PIN boxes
        if (hasError) ...[
          const SizedBox(height: 6),
          Text(
            _errorMessage!,
            style: LoginTokens.font(
              size: 11,
              weight: FontWeight.w600,
              color: LoginTokens.error,
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildPinBox(int index, double boxWidth, bool hasError) {
    final controller = _pinControllers[index];
    final focusNode = _pinFocusNodes[index];
    final isFocused = focusNode.hasFocus;

    return Semantics(
      label: 'PIN digit ${index + 1}',
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        width: boxWidth,
        height: LoginTokens.pinBoxHeight,
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(LoginTokens.pinBoxRadius),
          border: Border.all(
            color: hasError
                ? LoginTokens.error
                : (isFocused ? LoginTokens.primary : LoginTokens.borderField),
            width: LoginTokens.pinBoxBorderWidth,
          ),
          boxShadow: isFocused && !hasError
              ? const [
                  BoxShadow(
                    color: LoginTokens.focusRing,
                    spreadRadius: LoginTokens.focusRingSpread,
                    blurRadius: 0,
                  ),
                ]
              : null,
        ),
        child: Center(
          child: TextField(
            controller: controller,
            focusNode: focusNode,
            keyboardType: TextInputType.number,
            textAlign: TextAlign.center,
            maxLength: 4,
            buildCounter: (context,
                    {required currentLength,
                    required isFocused,
                    maxLength}) =>
                null,
            obscureText: _obscurePin,
            obscuringCharacter: '●',
            style: LoginTokens.font(
              size: 20,
              weight: FontWeight.w700,
              color: LoginTokens.inputText,
            ),
            cursorColor: LoginTokens.primary,
            showCursor: isFocused,
            decoration: const InputDecoration(
              filled: false,
              fillColor: Colors.transparent,
              border: InputBorder.none,
              enabledBorder: InputBorder.none,
              focusedBorder: InputBorder.none,
              errorBorder: InputBorder.none,
              focusedErrorBorder: InputBorder.none,
              contentPadding: EdgeInsets.zero,
              isDense: true,
            ),
            inputFormatters: [
              FilteringTextInputFormatter.digitsOnly,
            ],
            onChanged: (val) => _onPinDigitChanged(index, val),
          ),
        ),
      ),
    );
  }

  // ===========================================================================
  // 5c. PRIMARY BUTTON "UNLOCK GATE TERMINAL" (48px height)
  // ===========================================================================
  Widget _buildPrimaryButton() {
    final bool isMobileValid = _mobileController.text.trim().length == 10;
    final bool isPinValid = _fullPin.length == 4;
    final bool isEnabled = isMobileValid && isPinValid && !_isLoading;

    return Semantics(
      button: true,
      enabled: isEnabled,
      label: 'UNLOCK GATE TERMINAL',
      child: GestureDetector(
        onTapDown: isEnabled ? (_) => setState(() => _isButtonPressed = true) : null,
        onTapUp: isEnabled
            ? (_) {
                setState(() => _isButtonPressed = false);
                _handleLogin();
              }
            : null,
        onTapCancel: () {
          if (_isButtonPressed) setState(() => _isButtonPressed = false);
        },
        child: AnimatedScale(
          scale: _isButtonPressed ? 0.98 : 1.0,
          duration: const Duration(milliseconds: 100),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 150),
            height: LoginTokens.buttonHeight,
            width: double.infinity,
            decoration: BoxDecoration(
              color: !isEnabled
                  ? LoginTokens.primary.withOpacity(0.5)
                  : (_isButtonPressed
                      ? LoginTokens.primaryDark
                      : LoginTokens.primary),
              borderRadius: BorderRadius.circular(LoginTokens.buttonRadius),
              boxShadow: isEnabled ? LoginTokens.buttonShadow : null,
            ),
            child: Center(
              child: _isLoading
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2.0,
                        valueColor:
                            AlwaysStoppedAnimation<Color>(Colors.white),
                      ),
                    )
                  : Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(
                          Icons.vpn_key_rounded,
                          size: 18,
                          color: Colors.white,
                        ),
                        const SizedBox(width: LoginTokens.buttonIconGap),
                        Text(
                          'UNLOCK GATE TERMINAL',
                          style: LoginTokens.font(
                            size: 14,
                            weight: FontWeight.w800,
                            color: Colors.white,
                            letterSpacing: 14 * 0.06,
                          ),
                        ),
                      ],
                    ),
            ),
          ),
        ),
      ),
    );
  }

  // ===========================================================================
  // 5d. DEMO SECTION (compact 42px chips)
  // ===========================================================================
  Widget _buildDemoSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding:
              const EdgeInsets.only(top: LoginTokens.demoDividerPaddingTop),
          child: Container(
            height: 1.0,
            color: LoginTokens.divider,
          ),
        ),
        const SizedBox(height: 10),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'Quick demo login',
              style: LoginTokens.font(
                size: 11,
                weight: FontWeight.w600,
                color: LoginTokens.muted,
              ),
            ),
            Text(
              'PIN 1234',
              style: LoginTokens.font(
                size: 11,
                weight: FontWeight.w600,
                color: LoginTokens.primaryDark,
              ),
            ),
          ],
        ),
        const SizedBox(height: LoginTokens.demoRowGap),
        Row(
          children: [
            Expanded(
              child: _buildDemoChip(
                name: 'Ramesh',
                mobile: '98000 11122',
              ),
            ),
            const SizedBox(width: LoginTokens.demoChipGap),
            Expanded(
              child: _buildDemoChip(
                name: 'Suresh',
                mobile: '98000 11123',
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildDemoChip({
    required String name,
    required String mobile,
  }) {
    return Semantics(
      button: true,
      label: 'Quick demo login for $name, mobile $mobile, PIN 1234',
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () => _onDemoLoginTap(mobile, '1234'),
          borderRadius: BorderRadius.circular(LoginTokens.demoChipRadius),
          child: Container(
            height: LoginTokens.demoChipHeight,
            padding: const EdgeInsets.symmetric(
              horizontal: LoginTokens.demoChipPaddingHorizontal,
            ),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(LoginTokens.demoChipRadius),
              border: Border.all(
                color: LoginTokens.borderSoft,
                width: 1.0,
              ),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(
                  Icons.shield_rounded,
                  size: 18,
                  color: LoginTokens.ink,
                ),
                const SizedBox(width: 6),
                Text(
                  name,
                  style: LoginTokens.font(
                    size: 13,
                    weight: FontWeight.w700,
                    color: LoginTokens.ink,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  // ===========================================================================
  // MAIN BUILD - BALANCED COHESIVE LAYOUT (NO GIANT GAP, PURE WHITE FIELDS)
  // ===========================================================================
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: LoginTokens.bg,
      body: SafeArea(
        child: GestureDetector(
          onTap: () => FocusScope.of(context).unfocus(),
          behavior: HitTestBehavior.opaque,
          child: LayoutBuilder(
            builder: (context, constraints) {
              final isKeyboardOpen =
                  MediaQuery.of(context).viewInsets.bottom > 0;

              return SingleChildScrollView(
                physics: isKeyboardOpen
                    ? const BouncingScrollPhysics()
                    : const NeverScrollableScrollPhysics(),
                child: ConstrainedBox(
                  constraints: BoxConstraints(
                    minHeight: constraints.maxHeight,
                  ),
                  child: Center(
                    child: ConstrainedBox(
                      constraints: const BoxConstraints(maxWidth: 400.0),
                      child: Padding(
                        padding: const EdgeInsets.fromLTRB(
                          LoginTokens.screenPaddingSides,
                          LoginTokens.screenPaddingTop,
                          LoginTokens.screenPaddingSides,
                          LoginTokens.screenPaddingBottom,
                        ),
                        child: Theme(
                          data: Theme.of(context).copyWith(
                            inputDecorationTheme: const InputDecorationTheme(
                              filled: false,
                              fillColor: Colors.transparent,
                            ),
                          ),
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            crossAxisAlignment: CrossAxisAlignment.center,
                            children: [
                              // 1. LIVE CLOUD CHIP
                              _buildLiveCloudChip(),

                              const SizedBox(height: 12),

                              // 2. LOGO TILE (54px)
                              _buildLogoTile(),

                              const SizedBox(height: 10),

                              // 3. TITLE "NexGate Guard"
                              Text(
                                'NexGate Guard',
                                style: LoginTokens.font(
                                  size: 24,
                                  weight: FontWeight.w800,
                                  color: LoginTokens.ink,
                                  letterSpacing: -0.3,
                                ),
                                textAlign: TextAlign.center,
                              ),

                              const SizedBox(height: 4),

                              // 4. SUBTITLE
                              Text(
                                'Gate Security Terminal · Guard Access',
                                style: LoginTokens.font(
                                  size: 13,
                                  weight: FontWeight.w500,
                                  color: LoginTokens.muted,
                                ),
                                textAlign: TextAlign.center,
                              ),

                              // TIGHT, BALANCED GAP (20px) - Card sits right under subtitle!
                              const SizedBox(height: 20),

                              // 5. MAIN CARD
                              Container(
                                width: double.infinity,
                                padding: const EdgeInsets.symmetric(
                                  horizontal: LoginTokens.cardPadding,
                                  vertical: 16.0,
                                ),
                                decoration: BoxDecoration(
                                  color: Colors.white,
                                  borderRadius: BorderRadius.circular(
                                      LoginTokens.cardRadius),
                                  boxShadow: LoginTokens.cardShadow,
                                ),
                                child: Column(
                                  mainAxisSize: MainAxisSize.min,
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    _buildMobileSection(),
                                    const SizedBox(
                                        height: LoginTokens.cardSectionGap),
                                    _buildPinSection(),
                                    const SizedBox(
                                        height: LoginTokens.cardSectionGap),
                                    _buildPrimaryButton(),
                                    _buildDemoSection(),
                                  ],
                                ),
                              ),

                              const SizedBox(height: 20),

                              // 6. FOOTER
                              Padding(
                                padding: const EdgeInsets.only(bottom: 6.0),
                                child: Text(
                                  'Encrypted terminal session · NexGate Security',
                                  style: LoginTokens.font(
                                    size: 11,
                                    weight: FontWeight.w500,
                                    color: LoginTokens.footer,
                                  ),
                                  textAlign: TextAlign.center,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              );
            },
          ),
        ),
      ),
    );
  }
}
