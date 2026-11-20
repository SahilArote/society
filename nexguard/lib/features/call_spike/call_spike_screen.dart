import 'dart:async';
import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../services/call_service.dart';

const bool kCallSpikeEnabled = true;

class CallSpikeScreen extends StatefulWidget {
  final String? initialNumber;
  final String? contactName;
  final String? flat;
  final bool autoCall;
  final bool isIncoming;

  const CallSpikeScreen({
    super.key,
    this.initialNumber,
    this.contactName,
    this.flat,
    this.autoCall = false,
    this.isIncoming = false,
  });

  @override
  State<CallSpikeScreen> createState() => _CallSpikeScreenState();
}

class _CallSpikeScreenState extends State<CallSpikeScreen> with SingleTickerProviderStateMixin {
  final TextEditingController _numberController = TextEditingController();
  final CallService _callService = CallService.instance;

  bool _isDefaultDialer = false;
  bool _isLoadingStatus = true;
  bool _initialCallInitiated = false;
  bool _callWasActiveOrDialing = false;
  bool _isSilenced = false;

  AnimationController? _pulseController;
  Animation<double>? _pulseAnimation;
  Animation<double>? _glowAnimation;

  @override
  void initState() {
    super.initState();
    _callService.isCallScreenOpen = true;

    if (widget.initialNumber != null && widget.initialNumber!.isNotEmpty) {
      _numberController.text = widget.initialNumber!;
    }
    if (widget.isIncoming) {
      _callWasActiveOrDialing = true;
    }

    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1400),
    )..repeat(reverse: true);

    _pulseAnimation = Tween<double>(begin: 0.94, end: 1.06).animate(
      CurvedAnimation(parent: _pulseController!, curve: Curves.easeInOut),
    );

    _glowAnimation = Tween<double>(begin: 4.0, end: 18.0).animate(
      CurvedAnimation(parent: _pulseController!, curve: Curves.easeInOut),
    );

    _checkDialerStatus();
    _callService.addListener(_onCallStateChanged);
  }

  @override
  void dispose() {
    _callService.isCallScreenOpen = false;
    _pulseController?.dispose();
    _callService.removeListener(_onCallStateChanged);
    _numberController.dispose();
    super.dispose();
  }

  void _onCallStateChanged() {
    if (!mounted) return;
    final state = _callService.currentState;
    if (state.isActive || state.isDialing || state.isRinging || state.isIncomingCall) {
      _callWasActiveOrDialing = true;
    } else if ((state.isDisconnected || state.isMissed || state.state == CallState.idle) && _callWasActiveOrDialing) {
      if (widget.autoCall || widget.isIncoming) {
        Future.delayed(const Duration(milliseconds: 1200), () {
          if (mounted && Navigator.of(context).canPop()) {
            Navigator.of(context).pop();
          }
        });
      }
    }
    setState(() {});
  }

  Future<void> _checkDialerStatus() async {
    setState(() => _isLoadingStatus = true);
    final isDefault = await _callService.isDefaultDialer();
    if (mounted) {
      setState(() {
        _isDefaultDialer = isDefault;
        _isLoadingStatus = false;
      });

      if (widget.autoCall &&
          !_initialCallInitiated &&
          widget.initialNumber != null &&
          widget.initialNumber!.isNotEmpty) {
        _initialCallInitiated = true;
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (mounted) {
            _handlePlaceCall();
          }
        });
      }
    }
  }

  Future<void> _requestDialerRole() async {
    final launched = await _callService.requestDialerRole();
    if (!mounted) return;
    if (launched) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Requested default phone app prompt. Refresh status after selecting NexGuard.'),
          backgroundColor: AppColors.primary,
        ),
      );
      Future.delayed(const Duration(seconds: 2), () {
        if (mounted) _checkDialerStatus();
      });
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Could not open default dialer selector on this device.'),
          backgroundColor: AppColors.error,
        ),
      );
    }
  }

  Future<void> _handlePlaceCall() async {
    final number = _numberController.text.trim();
    if (number.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please enter a phone number to place a call'),
          backgroundColor: AppColors.error,
        ),
      );
      return;
    }

    final success = await _callService.placeCall(number);
    if (!success && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Failed to initiate call. Ensure NexGuard is default dialer and CALL_PHONE permission is granted.'),
          backgroundColor: AppColors.error,
        ),
      );
    }
  }

  Future<void> _handleSilence() async {
    final success = await _callService.silenceRinger();
    if (success && mounted) {
      setState(() {
        _isSilenced = true;
      });
    }
  }

  String _formatDuration(int seconds) {
    final m = (seconds ~/ 60).toString().padLeft(2, '0');
    final s = (seconds % 60).toString().padLeft(2, '0');
    return '$m:$s';
  }

  String _formatPhoneNumber(String raw) {
    final clean = raw.trim();
    if (clean.startsWith('+91') && clean.length == 13) {
      return '+91 ${clean.substring(3, 8)} ${clean.substring(8)}';
    } else if (clean.length == 10 && RegExp(r'^\d{10}$').hasMatch(clean)) {
      return '+91 ${clean.substring(0, 5)} ${clean.substring(5)}';
    }
    return clean;
  }

  @override
  Widget build(BuildContext context) {
    final callState = _callService.currentState;
    final hasCall = callState.hasCall || widget.isIncoming;

    // When there is an incoming or active/disconnected call, show the modern immersive call screen
    if (hasCall) {
      return _buildModernCallScreen(callState);
    }

    // Default In-App Dialer page (when idle)
    return Scaffold(
      backgroundColor: AppColors.pageBackground,
      appBar: AppBar(
        title: const Text(
          'In-App Dialer',
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w700,
            color: Colors.white,
            fontFamily: 'Inter',
          ),
        ),
        backgroundColor: AppColors.hero,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded, color: Colors.white),
            tooltip: 'Check Status',
            onPressed: _checkDialerStatus,
          ),
        ],
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              _buildDialerStatusCard(),
              const SizedBox(height: 16),
              _buildDialpadCard(),
            ],
          ),
        ),
      ),
    );
  }

  /// Modern Immersive Full-Screen Call Experience
  Widget _buildModernCallScreen(CallStateData call) {
    final isIncoming = call.isIncomingCall || (widget.isIncoming && !call.isActive && !call.isDisconnected && !call.isMissed);
    final isRinging = call.isRinging && !isIncoming;
    final isActive = call.isActive;
    final isDialing = call.isDialing;
    final isDisconnected = call.isDisconnected || call.isMissed;

    final caller = _callService.resolveCaller(call.number);
    final callerName = widget.contactName ?? caller?.name ?? (call.residentName?.isNotEmpty == true ? call.residentName : null);
    final flatDetails = widget.flat ?? caller?.flat ?? (call.destinationFlat?.isNotEmpty == true ? call.destinationFlat : null);
    final rawNumber = call.number.isNotEmpty
        ? call.number
        : (_numberController.text.isNotEmpty ? _numberController.text : 'Unknown Number');
    final formattedNumber = _formatPhoneNumber(rawNumber);

    return Scaffold(
      backgroundColor: const Color(0xFF0F172A), // Deep Slate Navy
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              Color(0xFF0F172A), // Deep Slate
              Color(0xFF1E1B4B), // Brand Indigo Navy
              Color(0xFF0F172A),
            ],
          ),
        ),
        child: SafeArea(
          child: Column(
            children: [
              // 1. Sleek Top Bar
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    // Back / Minimize Button
                    IconButton(
                      icon: const Icon(Icons.keyboard_arrow_down_rounded, color: Colors.white70, size: 28),
                      tooltip: 'Minimize Call',
                      splashRadius: 22,
                      onPressed: () {
                        if (Navigator.of(context).canPop()) {
                          Navigator.of(context).pop();
                        }
                      },
                    ),

                    // Security Intercom Badge
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.08),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: Colors.white.withOpacity(0.12)),
                      ),
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.security_rounded, size: 14, color: Color(0xFF818CF8)),
                          SizedBox(width: 6),
                          Text(
                            'NexGuard Gate Intercom',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: Colors.white70,
                              letterSpacing: 0.4,
                              fontFamily: 'Inter',
                            ),
                          ),
                        ],
                      ),
                    ),

                    // Placeholder to balance the row
                    const SizedBox(width: 44),
                  ],
                ),
              ),

              const Spacer(flex: 1),

              // 2. Status Badge Pill
              _buildStatusPill(isIncoming, isRinging, isActive, isDialing, isDisconnected, call),
              const SizedBox(height: 28),

              // 3. Caller Avatar with Ambient Ripple Animation
              _buildAnimatedAvatar(isIncoming, isActive),
              const SizedBox(height: 28),

              // 4. Caller Name
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: Text(
                  callerName ?? 'Resident / Visitor',
                  style: const TextStyle(
                    fontSize: 26,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.3,
                    color: Colors.white,
                    fontFamily: 'Inter',
                  ),
                  textAlign: TextAlign.center,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              const SizedBox(height: 8),

              // 5. Flat Badge (if present)
              if (flatDetails != null && flatDetails.isNotEmpty)
                Container(
                  margin: const EdgeInsets.only(bottom: 8),
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 5),
                  decoration: BoxDecoration(
                    color: const Color(0xFF312E81).withOpacity(0.6),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFF6366F1).withOpacity(0.4)),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.apartment_rounded, size: 15, color: Color(0xFFA5B4FC)),
                      const SizedBox(width: 6),
                      Text(
                        flatDetails,
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                          color: Color(0xFFE0E7FF),
                          fontFamily: 'Inter',
                        ),
                      ),
                    ],
                  ),
                ),

              // 6. Formatted Phone Number
              Text(
                formattedNumber,
                style: TextStyle(
                  fontSize: (callerName != null) ? 18 : 24,
                  fontWeight: FontWeight.w600,
                  letterSpacing: 1.1,
                  color: (callerName != null) ? Colors.white70 : Colors.white,
                  fontFamily: 'Inter',
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),

              // 7. Subtitle / Live Duration Timer
              if (isActive)
                Text(
                  _formatDuration(call.duration),
                  style: const TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF4ADE80), // Emerald Green
                    fontFamily: 'Inter',
                    letterSpacing: 1.5,
                  ),
                )
              else
                Text(
                  isIncoming
                      ? (_isSilenced ? 'Ringer Silenced • Call Ringing' : 'Gate SIM Incoming Cellular Call')
                      : (isDialing ? 'Connecting to cellular network...' : 'Call Status: ${call.state.name}'),
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w500,
                    color: _isSilenced ? const Color(0xFFFBBF24) : Colors.white54,
                    fontFamily: 'Inter',
                  ),
                ),

              const Spacer(flex: 2),

              // 8. Bottom Action Controls (NEVER wrap text)
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
                child: isIncoming
                    ? _buildIncomingControls()
                    : _buildActiveControls(call, isDisconnected),
              ),

              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatusPill(
    bool isIncoming,
    bool isRinging,
    bool isActive,
    bool isDialing,
    bool isDisconnected,
    CallStateData call,
  ) {
    Color bg;
    Color border;
    Color text;
    String label;
    IconData icon;

    if (isIncoming) {
      bg = const Color(0xFFF59E0B).withOpacity(0.18);
      border = const Color(0xFFF59E0B).withOpacity(0.4);
      text = const Color(0xFFFBBF24);
      label = _isSilenced ? 'RINGER SILENCED' : 'INCOMING CALL';
      icon = Icons.phone_callback_rounded;
    } else if (isActive) {
      bg = const Color(0xFF16A34A).withOpacity(0.18);
      border = const Color(0xFF16A34A).withOpacity(0.4);
      text = const Color(0xFF4ADE80);
      label = 'CALL IN PROGRESS';
      icon = Icons.phone_in_talk_rounded;
    } else if (isDialing) {
      bg = const Color(0xFF6366F1).withOpacity(0.18);
      border = const Color(0xFF6366F1).withOpacity(0.4);
      text = const Color(0xFFA5B4FC);
      label = 'DIALING...';
      icon = Icons.call_outlined;
    } else if (isDisconnected) {
      bg = const Color(0xFFDC2626).withOpacity(0.18);
      border = const Color(0xFFDC2626).withOpacity(0.4);
      text = const Color(0xFFF87171);
      label = call.isMissed ? 'MISSED CALL' : 'CALL ENDED';
      icon = Icons.call_end_rounded;
    } else {
      bg = Colors.white.withOpacity(0.08);
      border = Colors.white.withOpacity(0.15);
      text = Colors.white70;
      label = call.state.name.toUpperCase();
      icon = Icons.phone_rounded;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 7),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: border, width: 1.2),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 15, color: text),
          const SizedBox(width: 8),
          Text(
            label,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w800,
              letterSpacing: 0.8,
              color: text,
              fontFamily: 'Inter',
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAnimatedAvatar(bool isIncoming, bool isActive) {
    return ScaleTransition(
      scale: (isIncoming && _pulseAnimation != null)
          ? _pulseAnimation!
          : const AlwaysStoppedAnimation(1.0),
      child: AnimatedBuilder(
        animation: _glowAnimation ?? const AlwaysStoppedAnimation(8.0),
        builder: (context, child) {
          final glowRadius = _glowAnimation?.value ?? 8.0;
          return Container(
            width: 112,
            height: 112,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: isIncoming
                  ? const Color(0xFF312E81)
                  : (isActive ? const Color(0xFF064E3B) : const Color(0xFF1E293B)),
              border: Border.all(
                color: isIncoming
                    ? const Color(0xFFF59E0B)
                    : (isActive ? const Color(0xFF22C55E) : const Color(0xFF6366F1)),
                width: 3.5,
              ),
              boxShadow: [
                BoxShadow(
                  color: isIncoming
                      ? const Color(0xFFF59E0B).withOpacity(0.35)
                      : (isActive ? const Color(0xFF22C55E).withOpacity(0.35) : const Color(0xFF6366F1).withOpacity(0.2)),
                  blurRadius: glowRadius * 1.5,
                  spreadRadius: glowRadius * 0.4,
                ),
              ],
            ),
            child: Icon(
              isIncoming
                  ? Icons.phone_callback_rounded
                  : (isActive ? Icons.phone_in_talk_rounded : Icons.call_outlined),
              size: 54,
              color: isIncoming
                  ? const Color(0xFFFBBF24)
                  : (isActive ? const Color(0xFF4ADE80) : const Color(0xFFA5B4FC)),
            ),
          );
        },
      ),
    );
  }

  /// Modern Circular Calling Action Controls (No text wrapping)
  Widget _buildIncomingControls() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        // 1. DECLINE BUTTON
        _buildCircleActionButton(
          label: 'Decline',
          size: 68,
          iconSize: 32,
          icon: Icons.call_end_rounded,
          backgroundColor: const Color(0xFFDC2626), // Error Red
          iconColor: Colors.white,
          onTap: () => _callService.reject(),
        ),

        // 2. SILENCE RINGER BUTTON
        _buildCircleActionButton(
          label: _isSilenced ? 'Silenced' : 'Silence',
          size: 54,
          iconSize: 26,
          icon: _isSilenced ? Icons.volume_off_rounded : Icons.notifications_off_outlined,
          backgroundColor: _isSilenced ? Colors.white.withOpacity(0.08) : Colors.white.withOpacity(0.16),
          iconColor: _isSilenced ? Colors.white38 : const Color(0xFFFBBF24),
          borderColor: _isSilenced ? Colors.white12 : const Color(0xFFF59E0B).withOpacity(0.5),
          onTap: _isSilenced ? null : _handleSilence,
        ),

        // 3. ACCEPT BUTTON
        _buildCircleActionButton(
          label: 'Accept',
          size: 68,
          iconSize: 32,
          icon: Icons.call_rounded,
          backgroundColor: const Color(0xFF16A34A), // Success Green
          iconColor: Colors.white,
          onTap: () => _callService.answer(),
        ),
      ],
    );
  }

  Widget _buildActiveControls(CallStateData call, bool isDisconnected) {
    if (isDisconnected) {
      return const SizedBox(
        height: 80,
        child: Center(
          child: Text(
            'Closing...',
            style: TextStyle(color: Colors.white54, fontSize: 14, fontFamily: 'Inter'),
          ),
        ),
      );
    }

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        // In-Call Function Toggles (Mute & Speaker)
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            // Mute Button
            _buildCircleActionButton(
              label: call.muted ? 'Unmute' : 'Mute',
              size: 60,
              iconSize: 28,
              icon: call.muted ? Icons.mic_off_rounded : Icons.mic_rounded,
              backgroundColor: call.muted ? const Color(0xFF6366F1) : Colors.white.withOpacity(0.14),
              iconColor: Colors.white,
              onTap: () => _callService.setMute(!call.muted),
            ),
            const SizedBox(width: 48),

            // Speakerphone Button
            _buildCircleActionButton(
              label: call.speaker ? 'Earpiece' : 'Speaker',
              size: 60,
              iconSize: 28,
              icon: call.speaker ? Icons.volume_up_rounded : Icons.volume_down_rounded,
              backgroundColor: call.speaker ? const Color(0xFF6366F1) : Colors.white.withOpacity(0.14),
              iconColor: Colors.white,
              onTap: () => _callService.setSpeaker(!call.speaker),
            ),
          ],
        ),
        const SizedBox(height: 28),

        // Red Full-Width End Call Button
        SizedBox(
          width: double.infinity,
          height: 56,
          child: ElevatedButton.icon(
            onPressed: () => _callService.hangup(),
            icon: const Icon(Icons.call_end_rounded, size: 24),
            label: const Text(
              'End Call',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w700,
                letterSpacing: 0.4,
                fontFamily: 'Inter',
              ),
            ),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFDC2626),
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
              ),
              elevation: 4,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildCircleActionButton({
    required String label,
    required double size,
    required double iconSize,
    required IconData icon,
    required Color backgroundColor,
    required Color iconColor,
    Color? borderColor,
    VoidCallback? onTap,
  }) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: onTap,
            borderRadius: BorderRadius.circular(size / 2),
            child: Container(
              width: size,
              height: size,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: backgroundColor,
                border: Border.all(
                  color: borderColor ?? Colors.transparent,
                  width: 1.5,
                ),
                boxShadow: [
                  BoxShadow(
                    color: backgroundColor.withOpacity(0.3),
                    blurRadius: 12,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Center(
                child: Icon(
                  icon,
                  size: iconSize,
                  color: iconColor,
                ),
              ),
            ),
          ),
        ),
        const SizedBox(height: 8),
        Text(
          label,
          style: const TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: Colors.white,
            fontFamily: 'Inter',
          ),
          maxLines: 1,
        ),
      ],
    );
  }

  // --- Normal Idle Dialer Widgets (Used when idle) ---

  Widget _buildDialerStatusCard() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: _isDefaultDialer ? AppColors.statApprovedBorder : AppColors.statPendingBorder,
          width: 1.2,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 38,
                height: 38,
                decoration: BoxDecoration(
                  color: _isDefaultDialer ? AppColors.statApprovedBg : AppColors.statPendingBg,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(
                  _isDefaultDialer ? Icons.verified_user_rounded : Icons.warning_amber_rounded,
                  color: _isDefaultDialer ? AppColors.statApprovedText : AppColors.statPendingText,
                  size: 22,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _isDefaultDialer ? 'Default Phone App Active' : 'Not Default Phone App',
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                        color: _isDefaultDialer ? AppColors.statApprovedText : AppColors.statPendingText,
                        fontFamily: 'Inter',
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      _isDefaultDialer
                          ? 'NexInCallService is active. SIM calls route inside NexGuard.'
                          : 'Required for custom in-app call UI and kiosk lock.',
                      style: const TextStyle(
                        fontSize: 12,
                        color: AppColors.textMuted,
                        fontFamily: 'Inter',
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          if (!_isDefaultDialer) ...[
            const SizedBox(height: 14),
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton.icon(
                onPressed: _isLoadingStatus ? null : _requestDialerRole,
                icon: const Icon(Icons.settings_phone_rounded, size: 20),
                label: const Text(
                  'Set as Default Phone App',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                    fontFamily: 'Inter',
                  ),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  elevation: 0,
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildDialpadCard() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.border, width: 1.0),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text(
            'Place Outgoing SIM Call',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w700,
              color: AppColors.textPrimary,
              fontFamily: 'Inter',
            ),
          ),
          const SizedBox(height: 6),
          const Text(
            'Enter a mobile number to place a cellular call directly inside NexGuard.',
            style: TextStyle(
              fontSize: 13,
              color: AppColors.textMuted,
              fontFamily: 'Inter',
            ),
          ),
          const SizedBox(height: 18),

          // Number Input Field
          TextField(
            controller: _numberController,
            keyboardType: TextInputType.phone,
            style: const TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w700,
              letterSpacing: 1.2,
              color: AppColors.textPrimary,
              fontFamily: 'Inter',
            ),
            decoration: InputDecoration(
              labelText: 'Phone Number',
              hintText: 'e.g. 9876543210',
              prefixIcon: const Icon(Icons.phone_rounded, color: AppColors.primary),
              suffixIcon: _numberController.text.isNotEmpty
                  ? IconButton(
                      icon: const Icon(Icons.clear_rounded, color: AppColors.textMuted),
                      onPressed: () => setState(() => _numberController.clear()),
                    )
                  : null,
              filled: true,
              fillColor: AppColors.fieldBg,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(14),
                borderSide: const BorderSide(color: AppColors.border),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(14),
                borderSide: const BorderSide(color: AppColors.border),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(14),
                borderSide: const BorderSide(color: AppColors.primary, width: 2.0),
              ),
            ),
            onChanged: (_) => setState(() {}),
          ),
          const SizedBox(height: 14),

          // Quick Presets
          Row(
            children: [
              _buildPresetChip('100 (Emergency)'),
              const SizedBox(width: 8),
              _buildPresetChip('112 (Emergency)'),
            ],
          ),
          const SizedBox(height: 20),

          // Call Action Button
          SizedBox(
            height: 56,
            child: ElevatedButton.icon(
              onPressed: _handlePlaceCall,
              icon: const Icon(Icons.call_rounded, size: 24),
              label: const Text(
                'Call Number',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 0.3,
                  fontFamily: 'Inter',
                ),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF16A34A),
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
                elevation: 0,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPresetChip(String label) {
    final number = label.split(' ').first;
    return ActionChip(
      label: Text(
        label,
        style: const TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w600,
          color: AppColors.textSecondary,
          fontFamily: 'Inter',
        ),
      ),
      backgroundColor: AppColors.fieldBg,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(8),
        side: const BorderSide(color: AppColors.border),
      ),
      onPressed: () {
        setState(() {
          _numberController.text = number;
        });
      },
    );
  }
}
