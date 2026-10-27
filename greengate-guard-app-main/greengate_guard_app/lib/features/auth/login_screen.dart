import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../core/constants/app_colors.dart';
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
  final _mobileController = TextEditingController();
  final _pinController = TextEditingController();
  final _mobileFocusNode = FocusNode();
  final _pinFocusNode = FocusNode();

  bool _obscurePin = true;
  bool _isLoading = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _mobileFocusNode.addListener(() {
      if (mounted) setState(() {});
    });
    _pinFocusNode.addListener(() {
      if (mounted) setState(() {});
    });
  }

  @override
  void dispose() {
    _mobileController.dispose();
    _pinController.dispose();
    _mobileFocusNode.dispose();
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
            Icon(Icons.dns_rounded, color: AppColors.primary, size: 22),
            SizedBox(width: 8),
            Text('Server Connection', style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold)),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Backend API URL:',
              style: TextStyle(fontSize: 12, color: AppColors.textSecondary, fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: urlController,
              keyboardType: TextInputType.url,
              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
              decoration: InputDecoration(
                hintText: 'https://dazclothess.com/api',
                filled: true,
                fillColor: const Color(0xFFF8FAFC),
                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                ),
                isDense: true,
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'Default endpoint: https://dazclothess.com/api',
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
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
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
            child: const Text('Save', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  Future<void> _handleLogin() async {
    final mobile = _mobileController.text.trim();
    final pin = _pinController.text.trim();

    if (mobile.isEmpty) {
      setState(() => _errorMessage = 'Please enter Guard Mobile Number');
      _mobileFocusNode.requestFocus();
      return;
    }

    if (mobile.length < 10) {
      setState(() => _errorMessage = 'Please enter valid 10-digit Mobile Number');
      _mobileFocusNode.requestFocus();
      return;
    }

    if (pin.length < 4) {
      setState(() => _errorMessage = 'Please enter your 4-digit Security PIN');
      _pinFocusNode.requestFocus();
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
        _errorMessage = 'Invalid Mobile or PIN. (Default PIN: 1234)';
      });
    }
  }

  Widget _buildQuickGuardCard({
    required String name,
    required String mobile,
    required String gate,
  }) {
    return InkWell(
      onTap: () {
        setState(() {
          _mobileController.text = mobile;
          _pinController.text = '1234';
          _errorMessage = null;
        });
        FocusScope.of(context).unfocus();
      },
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
        decoration: BoxDecoration(
          color: const Color(0xFFF8FAFC),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFFE2E8F0), width: 1.0),
        ),
        child: Row(
          children: [
            Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                color: const Color(0xFFEEF2FF),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(
                Icons.shield_rounded,
                size: 17,
                color: AppColors.primary,
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    name,
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w800,
                      color: AppColors.textPrimary,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  Text(
                    mobile,
                    style: const TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textMuted,
                      letterSpacing: 0.2,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMobileField() {
    final isFocused = _mobileFocusNode.hasFocus;
    final isComplete = _mobileController.text.length == 10;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'GUARD MOBILE NUMBER',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w800,
                color: Color(0xFF475569),
                letterSpacing: 0.5,
              ),
            ),
            if (isComplete)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                decoration: BoxDecoration(
                  color: const Color(0xFFECFDF5),
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(color: const Color(0xFFA7F3D0)),
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.check_circle_rounded, size: 12, color: Color(0xFF059669)),
                    SizedBox(width: 3),
                    Text(
                      '10 Digits',
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF047857),
                      ),
                    ),
                  ],
                ),
              ),
          ],
        ),
        const SizedBox(height: 7),
        AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          height: 52,
          decoration: BoxDecoration(
            color: isFocused ? Colors.white : const Color(0xFFF8FAFC),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(
              color: isFocused ? AppColors.primary : const Color(0xFFE2E8F0),
              width: isFocused ? 2.0 : 1.2,
            ),
            boxShadow: isFocused
                ? [
                    BoxShadow(
                      color: AppColors.primary.withOpacity(0.12),
                      blurRadius: 8,
                      offset: const Offset(0, 2),
                    ),
                  ]
                : null,
          ),
          child: Row(
            children: [
              // Country Code Section
              Padding(
                padding: const EdgeInsets.only(left: 14, right: 10),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.phone_iphone_rounded, size: 18, color: AppColors.primary),
                    const SizedBox(width: 6),
                    const Text(
                      '+91',
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w800,
                        color: Color(0xFF1E293B),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Container(
                      width: 1.2,
                      height: 22,
                      color: const Color(0xFFCBD5E1),
                    ),
                  ],
                ),
              ),
              // Clean Text Field without default nested borders
              Expanded(
                child: TextField(
                  controller: _mobileController,
                  focusNode: _mobileFocusNode,
                  keyboardType: TextInputType.phone,
                  textInputAction: TextInputAction.next,
                  inputFormatters: [
                    FilteringTextInputFormatter.digitsOnly,
                    LengthLimitingTextInputFormatter(10),
                  ],
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF0F172A),
                    letterSpacing: 1.2,
                  ),
                  decoration: InputDecoration(
                    hintText: '98000 11122',
                    hintStyle: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w500,
                      color: const Color(0xFF94A3B8).withOpacity(0.8),
                      letterSpacing: 1.0,
                    ),
                    border: InputBorder.none,
                    enabledBorder: InputBorder.none,
                    focusedBorder: InputBorder.none,
                    errorBorder: InputBorder.none,
                    focusedErrorBorder: InputBorder.none,
                    isDense: true,
                    contentPadding: const EdgeInsets.symmetric(vertical: 14),
                    suffixIcon: _mobileController.text.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.cancel, size: 16, color: Color(0xFF94A3B8)),
                            onPressed: () => setState(() => _mobileController.clear()),
                          )
                        : null,
                  ),
                  onChanged: (val) {
                    setState(() {
                      _errorMessage = null;
                    });
                    if (val.length == 10) {
                      _pinFocusNode.requestFocus();
                    }
                  },
                  onSubmitted: (_) => _pinFocusNode.requestFocus(),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildPinSection() {
    final pin = _pinController.text;
    final isPinFocused = _pinFocusNode.hasFocus;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              '4-DIGIT SECURITY PIN',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w800,
                color: Color(0xFF475569),
                letterSpacing: 0.5,
              ),
            ),
            GestureDetector(
              onTap: () => setState(() => _obscurePin = !_obscurePin),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: const Color(0xFFEEF2FF),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      _obscurePin ? Icons.visibility_rounded : Icons.visibility_off_rounded,
                      size: 13,
                      color: AppColors.primary,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      _obscurePin ? 'Show PIN' : 'Hide PIN',
                      style: const TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: AppColors.primaryDark,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),

        // Sleek Fintech-Grade PIN Input (No ugly nested outer container)
        GestureDetector(
          onTap: () => _pinFocusNode.requestFocus(),
          behavior: HitTestBehavior.opaque,
          child: Stack(
            alignment: Alignment.center,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: List.generate(4, (index) {
                  final isFilled = index < pin.length;
                  final isCurrent = isPinFocused && (index == pin.length || (pin.length == 4 && index == 3));
                  final digit = isFilled ? pin[index] : '';

                  return AnimatedContainer(
                    duration: const Duration(milliseconds: 140),
                    margin: const EdgeInsets.symmetric(horizontal: 9),
                    width: 54,
                    height: 58,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(
                        color: _errorMessage != null
                            ? AppColors.error
                            : (isCurrent
                                ? AppColors.primary
                                : (isFilled
                                    ? AppColors.primary.withOpacity(0.8)
                                    : const Color(0xFFE2E8F0))),
                        width: isCurrent ? 2.2 : (isFilled ? 1.6 : 1.3),
                      ),
                      boxShadow: isCurrent
                          ? [
                              BoxShadow(
                                color: AppColors.primary.withOpacity(0.22),
                                blurRadius: 10,
                                offset: const Offset(0, 3),
                              ),
                            ]
                          : (isFilled
                              ? [
                                  BoxShadow(
                                    color: Colors.black.withOpacity(0.04),
                                    blurRadius: 4,
                                    offset: const Offset(0, 1),
                                  ),
                                ]
                              : [
                                  BoxShadow(
                                    color: Colors.black.withOpacity(0.02),
                                    blurRadius: 3,
                                    offset: const Offset(0, 1),
                                  ),
                                ]),
                    ),
                    child: Center(
                      child: isFilled
                          ? (_obscurePin
                              ? Container(
                                  width: 13,
                                  height: 13,
                                  decoration: const BoxDecoration(
                                    color: Color(0xFF1E1B4B),
                                    shape: BoxShape.circle,
                                  ),
                                )
                              : Text(
                                  digit,
                                  style: const TextStyle(
                                    fontSize: 22,
                                    fontWeight: FontWeight.w900,
                                    color: Color(0xFF0F172A),
                                  ),
                                ))
                          : (isCurrent
                              ? Container(
                                  width: 2.2,
                                  height: 22,
                                  decoration: BoxDecoration(
                                    color: AppColors.primary,
                                    borderRadius: BorderRadius.circular(1),
                                  ),
                                )
                              : const SizedBox.shrink()),
                    ),
                  );
                }),
              ),

              // Transparent native input catching numeric keyboard
              Opacity(
                opacity: 0.0,
                child: SizedBox(
                  height: 58,
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
                    onChanged: (val) {
                      setState(() {
                        _errorMessage = null;
                      });
                      if (val.length == 4 && _mobileController.text.length == 10) {
                        _handleLogin();
                      }
                    },
                    onSubmitted: (_) => _handleLogin(),
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;
    final isKeyboardOpen = bottomInset > 0;

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      resizeToAvoidBottomInset: true,
      body: GestureDetector(
        onTap: () => FocusScope.of(context).unfocus(),
        behavior: HitTestBehavior.opaque,
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
              physics: const BouncingScrollPhysics(parent: AlwaysScrollableScrollPhysics()),
              padding: EdgeInsets.fromLTRB(20, 16, 20, isKeyboardOpen ? 26 : 20),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 400),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    // Top Bar: Server Connection Status
                    Row(
                      mainAxisAlignment: MainAxisAlignment.end,
                      children: [
                        InkWell(
                          onTap: _showServerConfigDialog,
                          borderRadius: BorderRadius.circular(20),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(color: const Color(0xFFE2E8F0)),
                            ),
                            child: const Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(Icons.circle, size: 7, color: Color(0xFF10B981)),
                                SizedBox(width: 5),
                                Text(
                                  'Live Cloud',
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w700,
                                    color: Color(0xFF334155),
                                  ),
                                ),
                                SizedBox(width: 4),
                                Icon(Icons.tune_rounded, size: 12, color: Color(0xFF94A3B8)),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),

                    // Centered Brand Logo & Title
                    Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Container(
                            width: 64,
                            height: 64,
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(18),
                              border: Border.all(color: const Color(0xFFE2E8F0), width: 1.2),
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withOpacity(0.04),
                                  blurRadius: 10,
                                  offset: const Offset(0, 3),
                                ),
                              ],
                            ),
                            child: Image.asset(
                              'assets/images/logo.png',
                              fit: BoxFit.contain,
                              errorBuilder: (context, error, stackTrace) => const Icon(
                                Icons.shield_rounded,
                                size: 30,
                                color: AppColors.primary,
                              ),
                            ),
                          ),
                          const SizedBox(height: 12),
                          const Text(
                            'NexGate',
                            style: TextStyle(
                              fontSize: 22,
                              fontWeight: FontWeight.w900,
                              color: Color(0xFF0F172A),
                              letterSpacing: -0.3,
                            ),
                          ),
                          const SizedBox(height: 4),
                          const Text(
                            'Gate Terminal · Guard Access',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: Color(0xFF64748B),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 22),

                    // Main Card
                    Container(
                      padding: const EdgeInsets.all(22),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: const Color(0xFFE2E8F0), width: 1.2),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.04),
                            blurRadius: 18,
                            offset: const Offset(0, 6),
                          ),
                        ],
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Badge Title
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                            decoration: BoxDecoration(
                              color: const Color(0xFFEEF2FF),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: const Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(Icons.lock_outline_rounded, size: 12, color: AppColors.primary),
                                SizedBox(width: 5),
                                Text(
                                  'SECURITY CHECKPOINT ACCESS',
                                  style: TextStyle(
                                    fontSize: 10,
                                    fontWeight: FontWeight.w800,
                                    color: AppColors.primaryDark,
                                    letterSpacing: 0.5,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 18),

                          // 1. Guard Mobile Number Input
                          _buildMobileField(),
                          const SizedBox(height: 22),

                          // 2. 4-Digit Security PIN Input
                          _buildPinSection(),

                          // Error Banner
                          if (_errorMessage != null) ...[
                            const SizedBox(height: 14),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
                              decoration: BoxDecoration(
                                color: const Color(0xFFFEF2F2),
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(color: const Color(0xFFFECACA)),
                              ),
                              child: Row(
                                children: [
                                  const Icon(Icons.error_outline_rounded, size: 16, color: Color(0xFFDC2626)),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: Text(
                                      _errorMessage!,
                                      style: const TextStyle(
                                        fontSize: 12,
                                        fontWeight: FontWeight.w700,
                                        color: Color(0xFF991B1B),
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],

                          // Symmetrical Quick Demo Cards
                          const SizedBox(height: 22),
                          const Text(
                            'QUICK VERIFICATION (ONE-TAP DEMO):',
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w800,
                              color: Color(0xFF64748B),
                              letterSpacing: 0.5,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Row(
                            children: [
                              Expanded(
                                child: _buildQuickGuardCard(
                                  name: 'Ramesh',
                                  mobile: '98000 11122',
                                  gate: 'Gate 1',
                                ),
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: _buildQuickGuardCard(
                                  name: 'Suresh',
                                  mobile: '98000 11123',
                                  gate: 'Gate 2',
                                ),
                              ),
                            ],
                          ),

                          const SizedBox(height: 22),

                          // Modern Gradient Login Button with Perfect Rounded Geometry
                          Material(
                            color: Colors.transparent,
                            borderRadius: BorderRadius.circular(14),
                            child: InkWell(
                              onTap: _isLoading ? null : _handleLogin,
                              borderRadius: BorderRadius.circular(14),
                              child: Ink(
                                height: 50,
                                decoration: BoxDecoration(
                                  gradient: const LinearGradient(
                                    colors: [Color(0xFF4F46E5), Color(0xFF4338CA)],
                                    begin: Alignment.topLeft,
                                    end: Alignment.bottomRight,
                                  ),
                                  borderRadius: BorderRadius.circular(14),
                                  boxShadow: [
                                    BoxShadow(
                                      color: const Color(0xFF4F46E5).withOpacity(0.35),
                                      blurRadius: 12,
                                      offset: const Offset(0, 4),
                                    ),
                                  ],
                                ),
                                child: Center(
                                  child: _isLoading
                                      ? const SizedBox(
                                          width: 20,
                                          height: 20,
                                          child: CircularProgressIndicator(
                                            strokeWidth: 2.2,
                                            valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                                          ),
                                        )
                                      : const Row(
                                          mainAxisAlignment: MainAxisAlignment.center,
                                          children: [
                                            Icon(Icons.vpn_key_rounded, size: 18, color: Colors.white),
                                            SizedBox(width: 8),
                                            Text(
                                              'UNLOCK GATE TERMINAL',
                                              style: TextStyle(
                                                fontSize: 14,
                                                fontWeight: FontWeight.w800,
                                                color: Colors.white,
                                                letterSpacing: 0.6,
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
                    ),

                    const SizedBox(height: 14),
                    const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.shield_outlined, size: 13, color: Color(0xFF94A3B8)),
                        SizedBox(width: 5),
                        Text(
                          'Encrypted Terminal Session • Default PIN: 1234',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: Color(0xFF94A3B8),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
