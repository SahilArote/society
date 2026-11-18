import 'dart:async';
import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../services/call_service.dart';

const bool kCallSpikeEnabled = true;

class CallSpikeScreen extends StatefulWidget {
  final String? initialNumber;
  final String? contactName;
  final bool autoCall;

  const CallSpikeScreen({
    super.key,
    this.initialNumber,
    this.contactName,
    this.autoCall = false,
  });

  @override
  State<CallSpikeScreen> createState() => _CallSpikeScreenState();
}

class _CallSpikeScreenState extends State<CallSpikeScreen> {
  final TextEditingController _numberController = TextEditingController();
  final CallService _callService = CallService.instance;

  bool _isDefaultDialer = false;
  bool _isLoadingStatus = true;
  bool _initialCallInitiated = false;
  bool _callWasActiveOrDialing = false;

  @override
  void initState() {
    super.initState();
    if (widget.initialNumber != null && widget.initialNumber!.isNotEmpty) {
      _numberController.text = widget.initialNumber!;
    }
    _checkDialerStatus();
    _callService.addListener(_onCallStateChanged);
  }

  @override
  void dispose() {
    _callService.removeListener(_onCallStateChanged);
    _numberController.dispose();
    super.dispose();
  }

  void _onCallStateChanged() {
    if (!mounted) return;
    final state = _callService.currentState;
    if (state.isActive || state.isDialing || state.isRinging) {
      _callWasActiveOrDialing = true;
    } else if ((state.isDisconnected || state.state == CallState.idle) && _callWasActiveOrDialing) {
      if (widget.autoCall) {
        // Auto dismiss when the call ends if launched from waiting or visitors screen
        Future.delayed(const Duration(milliseconds: 1400), () {
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
      // Wait a moment then check
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

  String _formatDuration(int seconds) {
    final m = (seconds ~/ 60).toString().padLeft(2, '0');
    final s = (seconds % 60).toString().padLeft(2, '0');
    return '$m:$s';
  }

  @override
  Widget build(BuildContext context) {
    final callState = _callService.currentState;
    final hasActiveCall = callState.hasCall;

    return Scaffold(
      backgroundColor: AppColors.pageBackground,
      appBar: AppBar(
        title: Text(
          widget.contactName != null ? 'Calling Resident' : 'In-App Dialer',
          style: const TextStyle(
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
              // 1. DIALER ROLE STATUS BANNER
              _buildDialerStatusCard(),
              const SizedBox(height: 16),

              // 2. IN-CALL UI OR DIALPAD
              if (hasActiveCall)
                _buildActiveCallCard(callState)
              else
                _buildDialpadCard(),
            ],
          ),
        ),
      ),
    );
  }

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
            'Enter a mobile number to test the in-app calling spike without native dialer popup.',
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

          // Call Action Button (Min height 56px)
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
                backgroundColor: const Color(0xFF16A34A), // Success Green
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

  // Active / Incoming Call UI
  Widget _buildActiveCallCard(CallStateData call) {
    final isRinging = call.isRinging;
    final isActive = call.isActive;
    final isDialing = call.isDialing;
    final isDisconnected = call.isDisconnected;

    Color badgeBg;
    Color badgeText;
    String statusTitle;

    if (isRinging) {
      badgeBg = AppColors.statPendingBg;
      badgeText = AppColors.statPendingText;
      statusTitle = 'INCOMING CALL';
    } else if (isActive) {
      badgeBg = AppColors.statApprovedBg;
      badgeText = AppColors.statApprovedText;
      statusTitle = 'ACTIVE CALL';
    } else if (isDialing) {
      badgeBg = AppColors.indigoTint;
      badgeText = AppColors.primary;
      statusTitle = 'DIALING...';
    } else if (isDisconnected) {
      badgeBg = AppColors.statRejectedBg;
      badgeText = AppColors.statRejectedText;
      statusTitle = 'CALL DISCONNECTED';
    } else {
      badgeBg = AppColors.fieldBg;
      badgeText = AppColors.textSecondary;
      statusTitle = call.state.name.toUpperCase();
    }

    final displayNumber = call.number.isNotEmpty
        ? call.number
        : (_numberController.text.isNotEmpty ? _numberController.text : 'Unknown Number');

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 28),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: AppColors.border, width: 1.2),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 16,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        children: [
          // Status Badge Pill
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
            decoration: BoxDecoration(
              color: badgeBg,
              borderRadius: BorderRadius.circular(20),
            ),
            child: Text(
              statusTitle,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w800,
                letterSpacing: 0.8,
                color: badgeText,
                fontFamily: 'Inter',
              ),
            ),
          ),
          const SizedBox(height: 24),

          // Large High-Contrast Avatar
          Container(
            width: 104,
            height: 104,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: isRinging
                  ? const Color(0xFFFEF3C7) // Amber tint
                  : (isActive ? const Color(0xFFEAF8F0) : AppColors.indigoTint),
              border: Border.all(
                color: isRinging
                    ? const Color(0xFFF59E0B)
                    : (isActive ? const Color(0xFF16A34A) : AppColors.primary),
                width: 3.0,
              ),
            ),
            child: Icon(
              isRinging ? Icons.phone_callback_rounded : (isActive ? Icons.phone_in_talk_rounded : Icons.call_outlined),
              size: 52,
              color: isRinging
                  ? const Color(0xFFD97706)
                  : (isActive ? const Color(0xFF16A34A) : AppColors.primary),
            ),
          ),
          const SizedBox(height: 20),

          // Resident / Contact Name (if available)
          if (widget.contactName != null && widget.contactName!.isNotEmpty) ...[
            Text(
              widget.contactName!,
              style: const TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w800,
                letterSpacing: 0.3,
                color: AppColors.textPrimary,
                fontFamily: 'Inter',
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 4),
          ],

          // Phone Number / Caller ID
          Text(
            displayNumber,
            style: TextStyle(
              fontSize: (widget.contactName != null && widget.contactName!.isNotEmpty) ? 17 : 24,
              fontWeight: (widget.contactName != null && widget.contactName!.isNotEmpty) ? FontWeight.w600 : FontWeight.w800,
              letterSpacing: 0.5,
              color: (widget.contactName != null && widget.contactName!.isNotEmpty) ? AppColors.textSecondary : AppColors.textPrimary,
              fontFamily: 'Inter',
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 6),

          // Subtitle / Timer
          if (isActive)
            Text(
              _formatDuration(call.duration),
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w700,
                color: Color(0xFF16A34A),
                fontFamily: 'Inter',
                letterSpacing: 1.0,
              ),
            )
          else
            Text(
              isRinging
                  ? 'Incoming call on Gate SIM'
                  : (isDialing ? 'Connecting to cellular network...' : 'Call status: ${call.state.name}'),
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w500,
                color: AppColors.textMuted,
                fontFamily: 'Inter',
              ),
            ),
          const SizedBox(height: 32),

          // INCOMING CALL CONTROLS (Answer vs Reject)
          if (isRinging) ...[
            Row(
              children: [
                // Reject Button (Min height 56px, Red)
                Expanded(
                  child: SizedBox(
                    height: 56,
                    child: ElevatedButton.icon(
                      onPressed: () => _callService.reject(),
                      icon: const Icon(Icons.call_end_rounded, size: 22),
                      label: const Text(
                        'Reject',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          fontFamily: 'Inter',
                        ),
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFFDC2626), // Error Red
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                        ),
                        elevation: 0,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 14),

                // Answer Button (Min height 56px, Green)
                Expanded(
                  child: SizedBox(
                    height: 56,
                    child: ElevatedButton.icon(
                      onPressed: () => _callService.answer(),
                      icon: const Icon(Icons.call_rounded, size: 22),
                      label: const Text(
                        'Answer',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          fontFamily: 'Inter',
                        ),
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF16A34A), // Success Green
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                        ),
                        elevation: 0,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ] else ...[
            // ACTIVE / OUTGOING CONTROLS (Mute, Speaker, Hangup)
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                // Mute Control
                _buildCircleControlButton(
                  icon: call.muted ? Icons.mic_off_rounded : Icons.mic_rounded,
                  label: call.muted ? 'Unmute' : 'Mute',
                  isActive: call.muted,
                  onTap: () => _callService.setMute(!call.muted),
                ),
                const SizedBox(width: 32),

                // Speaker Control
                _buildCircleControlButton(
                  icon: call.speaker ? Icons.volume_up_rounded : Icons.volume_down_rounded,
                  label: call.speaker ? 'Earpiece' : 'Speaker',
                  isActive: call.speaker,
                  onTap: () => _callService.setSpeaker(!call.speaker),
                ),
              ],
            ),
            const SizedBox(height: 28),

            // Red End Call Button (Min height 56px, High Contrast)
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
                    fontWeight: FontWeight.bold,
                    letterSpacing: 0.4,
                    fontFamily: 'Inter',
                  ),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFDC2626), // Error Red
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
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

  Widget _buildCircleControlButton({
    required IconData icon,
    required String label,
    required bool isActive,
    required VoidCallback onTap,
  }) {
    return Column(
      children: [
        Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: onTap,
            borderRadius: BorderRadius.circular(30),
            child: Container(
              width: 58,
              height: 58,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: isActive ? AppColors.primary : AppColors.fieldBg,
                border: Border.all(
                  color: isActive ? AppColors.primary : AppColors.border,
                  width: 1.5,
                ),
              ),
              child: Icon(
                icon,
                size: 26,
                color: isActive ? Colors.white : AppColors.textPrimary,
              ),
            ),
          ),
        ),
        const SizedBox(height: 8),
        Text(
          label,
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: isActive ? AppColors.primary : AppColors.textSecondary,
            fontFamily: 'Inter',
          ),
        ),
      ],
    );
  }
}
