import 'dart:async';
import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'core/constants/app_colors.dart';
import 'core/theme/app_theme.dart';
import 'features/auth/login_screen.dart';
import 'features/auth/splash_screen.dart';
import 'features/call_spike/call_spike_screen.dart';
import 'repositories/guard_repository.dart';
import 'services/call_service.dart';
import 'services/storage_service.dart';
import 'services/api_service.dart';
import 'services/language_service.dart';

final GlobalKey<NavigatorState> guardNavigatorKey = GlobalKey<NavigatorState>();

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Production Error Boundary: Prevent unhandled exceptions from terminating the terminal
  FlutterError.onError = (FlutterErrorDetails details) {
    FlutterError.presentError(details);
    debugPrint('[Production FlutterError] ${details.exceptionAsString()}');
  };

  PlatformDispatcher.instance.onError = (error, stack) {
    debugPrint('[Production PlatformDispatcher Error] $error\n$stack');
    return true; // Prevents crash
  };

  // Dedicated gate kiosk mobile devices run in portrait orientation
  try {
    await SystemChrome.setPreferredOrientations([
      DeviceOrientation.portraitUp,
      DeviceOrientation.portraitDown,
    ]);
  } catch (_) {}

  // System UI Overlay styling
  try {
    SystemChrome.setSystemUIOverlayStyle(
      const SystemUiOverlayStyle(
        statusBarColor: Colors.transparent,
        statusBarIconBrightness: Brightness.dark,
        systemNavigationBarColor: Colors.white,
        systemNavigationBarIconBrightness: Brightness.dark,
      ),
    );
  } catch (_) {}

  StorageService storage;
  try {
    storage = await StorageService.init().timeout(
      const Duration(seconds: 2),
      onTimeout: () => StorageService.fallback(),
    );
  } catch (_) {
    storage = await StorageService.fallback();
  }

  try {
    LanguageService.instance.init(storage);
    ApiService.setBaseUrl(storage.getServerUrl());
  } catch (_) {}

  final guardRepo = GuardRepository(storage);

  // When token is rejected (401), immediately evict cached session and route to login
  ApiService.onUnauthorized = () {
    guardRepo.logout();
    guardNavigatorKey.currentState?.pushAndRemoveUntil(
      MaterialPageRoute(builder: (_) => LoginScreen(guardRepo: guardRepo)),
      (route) => false,
    );
  };

  runApp(NexGuardApp(guardRepo: guardRepo));
}

class NexGuardApp extends StatefulWidget {
  final GuardRepository guardRepo;

  const NexGuardApp({super.key, required this.guardRepo});

  @override
  State<NexGuardApp> createState() => _NexGuardAppState();
}

class _NexGuardAppState extends State<NexGuardApp> {
  StreamSubscription<CallStateData>? _callSubscription;

  @override
  void initState() {
    super.initState();
    _setupCallListener();
    _checkColdStartCallState();
  }

  @override
  void dispose() {
    _callSubscription?.cancel();
    super.dispose();
  }

  void _setupCallListener() {
    _callSubscription = CallService.instance.callStateStream.listen((state) {
      debugPrint('[NexCall] Global listener received: state=${state.state.name}, isIncoming=${state.isIncoming}, isIncomingCall=${state.isIncomingCall}, number=${state.number}');
      if (state.isIncomingCall || (state.isActive && state.isIncoming)) {
        _handleCallPresentation(state);
      }
    });
  }

  Future<void> _checkColdStartCallState() async {
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      try {
        final state = await CallService.instance.getCurrentCallState();
        debugPrint('[NexCall] Cold-start check state=${state.state.name}, isIncomingCall=${state.isIncomingCall}, number=${state.number}');
        if (state.isIncomingCall || state.isActive) {
          _handleCallPresentation(state);
        }
      } catch (e) {
        debugPrint('[NexCall] Cold-start check error: $e');
      }
    });
  }

  void _handleCallPresentation(CallStateData state) {
    if (CallService.instance.isCallScreenOpen) {
      debugPrint('[NexCall] CallSpikeScreen already open. Skipping duplicate full-screen push.');
      return;
    }

    void doPush() {
      final nav = guardNavigatorKey.currentState;
      if (nav == null) {
        debugPrint('[NexCall] Root navigator currentState is null; retrying on next frame');
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (mounted && (CallService.instance.currentState.isIncomingCall || CallService.instance.currentState.isActive)) {
            doPush();
          }
        });
        return;
      }

      if (CallService.instance.isCallScreenOpen) return;

      final caller = CallService.instance.resolveCaller(state.number);
      CallService.instance.isCallScreenOpen = true;
      debugPrint('[NexCall] Pushing full-screen CallSpikeScreen for ${state.number} (${caller?.name})');

      nav.push(
        MaterialPageRoute(
          builder: (_) => CallSpikeScreen(
            initialNumber: state.number,
            contactName: caller?.name ?? state.residentName,
            flat: caller?.flat ?? state.destinationFlat,
            isIncoming: true,
          ),
        ),
      ).then((_) {
        CallService.instance.isCallScreenOpen = false;
        debugPrint('[NexCall] CallSpikeScreen popped/dismissed');
      });
    }

    doPush();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: LanguageService.instance,
      builder: (context, _) {
        return MaterialApp(
          navigatorKey: guardNavigatorKey,
          title: 'NexGuard',
          debugShowCheckedModeBanner: false,
          theme: AppTheme.lightTheme,
          home: SplashScreen(guardRepo: widget.guardRepo),
          builder: (context, child) {
            return Stack(
              children: [
                child ?? const SizedBox.shrink(),

                // 1. GLOBAL IN-APP INCOMING CALL CARD (Visible across Home, Visitors, Logs, Profile)
                AnimatedBuilder(
                  animation: CallService.instance,
                  builder: (context, _) {
                    final callState = CallService.instance.currentState;
                    // Only show floating card if incoming call is ringing AND full-screen screen is not open
                    if (!callState.isIncomingCall || CallService.instance.isCallScreenOpen) {
                      return const SizedBox.shrink();
                    }

                    final caller = CallService.instance.resolveCaller(callState.number);
                    final displayName = caller?.name ?? (callState.residentName?.isNotEmpty == true ? callState.residentName! : 'Incoming Call');
                    final displayFlat = caller?.flat ?? (callState.destinationFlat ?? '');
                    final displayNumber = callState.number.isNotEmpty ? callState.number : 'Unknown Number';

                    return SafeArea(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                        child: Align(
                          alignment: Alignment.topCenter,
                          child: IncomingCallPopupCard(
                            displayName: displayName,
                            displayFlat: displayFlat,
                            displayNumber: displayNumber,
                            onTap: () {
                              _handleCallPresentation(callState);
                            },
                            onAnswer: () async {
                              await CallService.instance.answer();
                              _handleCallPresentation(CallService.instance.currentState);
                            },
                            onReject: () {
                              CallService.instance.reject();
                            },
                            onSilence: () {
                              CallService.instance.silenceRinger();
                            },
                          ),
                        ),
                      ),
                    );
                  },
                ),

                // 2. Non-blocking Missed Call Banner overlay
                ValueListenableBuilder<MissedCallInfo?>(
                  valueListenable: CallService.instance.latestMissedCall,
                  builder: (context, missed, _) {
                    if (missed == null) return const SizedBox.shrink();
                    return SafeArea(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                        child: Align(
                          alignment: Alignment.topCenter,
                          child: _buildMissedCallBanner(context, missed),
                        ),
                      ),
                    );
                  },
                ),
              ],
            );
          },
        );
      },
    );
  }

  Widget _buildMissedCallBanner(BuildContext context, MissedCallInfo missed) {
    return Material(
      color: Colors.transparent,
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFFCA5A5), width: 1.2),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.12),
              blurRadius: 16,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        child: Row(
          children: [
            // Icon Pill
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: const Color(0xFFFEE2E2),
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(
                Icons.phone_missed_rounded,
                color: Color(0xFFDC2626),
                size: 22,
              ),
            ),
            const SizedBox(width: 12),

            // Caller Details
            Expanded(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'MISSED CALL',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                      color: Color(0xFFDC2626),
                      letterSpacing: 0.6,
                      fontFamily: 'Inter',
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    missed.residentName.isNotEmpty ? missed.residentName : missed.number,
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      color: AppColors.textPrimary,
                      fontFamily: 'Inter',
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  if (missed.flat.isNotEmpty || missed.number.isNotEmpty)
                    Text(
                      missed.flat.isNotEmpty ? '${missed.flat} • ${missed.number}' : missed.number,
                      style: const TextStyle(
                        fontSize: 12,
                        color: AppColors.textMuted,
                        fontFamily: 'Inter',
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                ],
              ),
            ),
            const SizedBox(width: 8),

            // Call Back Action
            ElevatedButton(
              onPressed: () {
                CallService.instance.clearMissedCallBanner();
                if (CallService.instance.isCallScreenOpen) return;
                CallService.instance.isCallScreenOpen = true;
                guardNavigatorKey.currentState?.push(
                  MaterialPageRoute(
                    builder: (_) => CallSpikeScreen(
                      initialNumber: missed.number,
                      contactName: missed.residentName,
                      flat: missed.flat,
                      autoCall: true,
                    ),
                  ),
                );
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF16A34A),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                minimumSize: const Size(0, 36),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10),
                ),
                elevation: 0,
              ),
              child: const Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.call_rounded, size: 16),
                  SizedBox(width: 4),
                  Text(
                    'Call',
                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, fontFamily: 'Inter'),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 4),

            // Dismiss Button
            IconButton(
              icon: const Icon(Icons.close_rounded, size: 20, color: AppColors.textMuted),
              padding: EdgeInsets.zero,
              constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
              splashRadius: 18,
              onPressed: () {
                CallService.instance.clearMissedCallBanner();
              },
            ),
          ],
        ),
      ),
    );
  }
}

/// Global In-App Incoming Call Card Overlay (Visible on every screen)
class IncomingCallPopupCard extends StatefulWidget {
  final String displayName;
  final String displayFlat;
  final String displayNumber;
  final VoidCallback onTap;
  final VoidCallback onAnswer;
  final VoidCallback onReject;
  final VoidCallback onSilence;

  const IncomingCallPopupCard({
    super.key,
    required this.displayName,
    required this.displayFlat,
    required this.displayNumber,
    required this.onTap,
    required this.onAnswer,
    required this.onReject,
    required this.onSilence,
  });

  @override
  State<IncomingCallPopupCard> createState() => _IncomingCallPopupCardState();
}

class _IncomingCallPopupCardState extends State<IncomingCallPopupCard>
    with SingleTickerProviderStateMixin {
  late AnimationController _animController;
  late Animation<double> _scaleAnimation;
  bool _isSilenced = false;

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    )..repeat(reverse: true);

    _scaleAnimation = Tween<double>(begin: 0.95, end: 1.05).animate(
      CurvedAnimation(parent: _animController, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _animController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: widget.onTap,
        borderRadius: BorderRadius.circular(20),
        child: Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: const Color(0xFFF59E0B), width: 1.8),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.18),
                blurRadius: 20,
                offset: const Offset(0, 6),
              ),
            ],
          ),
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Row(
                children: [
                  // Pulsing Call Avatar
                  ScaleTransition(
                    scale: _scaleAnimation,
                    child: Container(
                      width: 44,
                      height: 44,
                      decoration: const BoxDecoration(
                        color: Color(0xFFFEF3C7),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.phone_callback_rounded,
                        color: Color(0xFFD97706),
                        size: 24,
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),

                  // Caller Name & Flat details
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: const Color(0xFFFEF3C7),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text(
                                _isSilenced ? 'SILENCED' : 'INCOMING CALL',
                                style: TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.w800,
                                  color: _isSilenced ? const Color(0xFF64748B) : const Color(0xFFB45309),
                                  letterSpacing: 0.5,
                                  fontFamily: 'Inter',
                                ),
                              ),
                            ),
                            if (widget.displayFlat.isNotEmpty) ...[
                              const SizedBox(width: 6),
                              Flexible(
                                child: Text(
                                  widget.displayFlat,
                                  style: const TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w700,
                                    color: AppColors.textSecondary,
                                    fontFamily: 'Inter',
                                  ),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ],
                          ],
                        ),
                        const SizedBox(height: 3),
                        Text(
                          widget.displayName,
                          style: const TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w800,
                            color: AppColors.textPrimary,
                            fontFamily: 'Inter',
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        Text(
                          widget.displayNumber,
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w500,
                            color: AppColors.textMuted,
                            fontFamily: 'Inter',
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),

                  // Silence Icon Button
                  IconButton(
                    icon: Icon(
                      _isSilenced ? Icons.volume_off_rounded : Icons.notifications_off_outlined,
                      color: _isSilenced ? AppColors.textMuted : const Color(0xFFD97706),
                      size: 22,
                    ),
                    tooltip: 'Silence',
                    onPressed: () {
                      setState(() => _isSilenced = true);
                      widget.onSilence();
                    },
                  ),
                ],
              ),
              const SizedBox(height: 10),

              // Action Buttons Row (Reject & Answer)
              Row(
                children: [
                  // Reject Button (Red)
                  Expanded(
                    child: SizedBox(
                      height: 44,
                      child: ElevatedButton.icon(
                        onPressed: widget.onReject,
                        icon: const Icon(Icons.call_end_rounded, size: 18),
                        label: const Text(
                          'Reject',
                          style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, fontFamily: 'Inter'),
                        ),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFFDC2626),
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                          elevation: 0,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),

                  // Answer Button (Green)
                  Expanded(
                    child: SizedBox(
                      height: 44,
                      child: ElevatedButton.icon(
                        onPressed: widget.onAnswer,
                        icon: const Icon(Icons.call_rounded, size: 18),
                        label: const Text(
                          'Answer',
                          style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, fontFamily: 'Inter'),
                        ),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF16A34A),
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                          elevation: 0,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
