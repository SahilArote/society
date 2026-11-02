import 'dart:ui';
import 'package:flutter/material.dart';
import '../../../models/visitor_model.dart';
import '../../../services/api_service.dart';
import '../../../services/dialer_service.dart';

/// Premium & Classy Doorbell Decision Modal matching top-tier gate security standards.
/// Displays an immersive, warm coral-rose ambient backdrop, a floating hero card with
/// visitor credentials, dynamic arrival headline, and iconic circular Deny / Allow action buttons.
class VisitorDecisionBottomSheet extends StatefulWidget {
  final VisitorModel visitor;
  final VoidCallback onAllow;
  final Function(String reason) onDeny;

  const VisitorDecisionBottomSheet({
    super.key,
    required this.visitor,
    required this.onAllow,
    required this.onDeny,
  });

  /// Presents the classy modal dialog with smooth spring scale-fade transition.
  static Future<void> show(
    BuildContext context, {
    required VisitorModel visitor,
    required VoidCallback onAllow,
    required Function(String reason) onDeny,
  }) {
    return showGeneralDialog(
      context: context,
      barrierDismissible: true,
      barrierLabel: 'Visitor Alert',
      barrierColor: Colors.black.withOpacity(0.45),
      transitionDuration: const Duration(milliseconds: 320),
      transitionBuilder: (context, anim1, anim2, child) {
        final curve = CurvedAnimation(parent: anim1, curve: Curves.easeOutBack);
        return ScaleTransition(
          scale: Tween<double>(begin: 0.88, end: 1.0).animate(curve),
          child: FadeTransition(opacity: anim1, child: child),
        );
      },
      pageBuilder: (ctx, anim1, anim2) => VisitorDecisionBottomSheet(
        visitor: visitor,
        onAllow: onAllow,
        onDeny: onDeny,
      ),
    );
  }

  @override
  State<VisitorDecisionBottomSheet> createState() =>
      _VisitorDecisionBottomSheetState();
}

class _VisitorDecisionBottomSheetState extends State<VisitorDecisionBottomSheet> {
  bool _isProcessing = false;
  bool _isAllowing = false;
  bool _isDenying = false;

  /// Generate contextual, natural language arrival headline
  String get _headlineText {
    final gate = widget.visitor.gate.trim();
    final gateDisplay = gate.isNotEmpty ? gate.toLowerCase() : 'main gate';
    final purpose = widget.visitor.purpose.toLowerCase();

    if (purpose.contains('deliver') ||
        (widget.visitor.deliveryCompany != null &&
            widget.visitor.deliveryCompany!.isNotEmpty)) {
      return "You've got a Delivery at\nthe $gateDisplay";
    } else if (purpose.contains('cab') ||
        purpose.contains('taxi') ||
        purpose.contains('uber') ||
        purpose.contains('ola')) {
      return "You've got a Cab at\nthe $gateDisplay";
    } else {
      return "You've got a Guest at\nthe $gateDisplay";
    }
  }

  /// Contextual subtext for visitor (e.g. Swiggy, Flat A-202, or Guest)
  String get _subtext {
    if (widget.visitor.deliveryCompany != null &&
        widget.visitor.deliveryCompany!.isNotEmpty) {
      return widget.visitor.deliveryCompany!;
    }
    if (widget.visitor.flatNumber.isNotEmpty) {
      return 'Flat ${widget.visitor.flatNumber}';
    }
    return widget.visitor.purpose.toUpperCase();
  }

  void _handleCall() {
    final phone = widget.visitor.phone;
    if (phone != null && phone.trim().isNotEmpty) {
      DialerService.openDialer(phone, context: context);
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Visitor contact number was not provided by gate guard'),
          backgroundColor: Color(0xFFEF4444),
          duration: Duration(seconds: 2),
        ),
      );
    }
  }

  void _handleAllow() {
    if (_isProcessing) return;
    setState(() {
      _isProcessing = true;
      _isAllowing = true;
    });
    Navigator.of(context).pop();
    widget.onAllow();
  }

  void _handleDeny() {
    if (_isProcessing) return;
    setState(() {
      _isProcessing = true;
      _isDenying = true;
    });
    Navigator.of(context).pop();
    widget.onDeny('Denied by resident');
  }

  Widget _buildAvatarFallback() {
    return Container(
      decoration: const BoxDecoration(
        shape: BoxShape.circle,
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFF60A5FA), Color(0xFF2563EB)],
        ),
      ),
      child: const Icon(
        Icons.person_rounded,
        size: 32,
        color: Colors.white,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final photoUrl = ApiService.getSecurePhotoUrl(widget.visitor.photoUrl);

    return Scaffold(
      backgroundColor: Colors.transparent,
      body: Stack(
        children: [
          // 1. Ambient Warm Coral/Rose Blurred Backdrop
          Positioned.fill(
            child: BackdropFilter(
              filter: ImageFilter.blur(sigmaX: 12, sigmaY: 12),
              child: Container(
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      Color(0xF0FF5E64),
                      Color(0xF0FF7A78),
                      Color(0xF0FD5A64),
                    ],
                  ),
                ),
              ),
            ),
          ),

          // 2. Safe Area Interactive Content
          SafeArea(
            child: Stack(
              children: [
                // Top Dismiss '✕' Button
                Positioned(
                  top: 12,
                  right: 16,
                  child: GestureDetector(
                    onTap: () => Navigator.of(context).pop(),
                    child: Container(
                      width: 38,
                      height: 38,
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.24),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.close_rounded,
                        color: Colors.white,
                        size: 20,
                      ),
                    ),
                  ),
                ),

                // Center Decision Modal Card & Circular Buttons
                Center(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        // The Pristine White Hero Card with Overlapping Top Badge
                        Stack(
                          clipBehavior: Clip.none,
                          alignment: Alignment.topCenter,
                          children: [
                            // White Card Body
                            Container(
                              width: double.infinity,
                              constraints: const BoxConstraints(maxWidth: 360),
                              margin: const EdgeInsets.only(top: 42),
                              padding: const EdgeInsets.fromLTRB(24, 52, 24, 28),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(28),
                                boxShadow: [
                                  BoxShadow(
                                    color: Colors.black.withOpacity(0.12),
                                    blurRadius: 28,
                                    offset: const Offset(0, 14),
                                  ),
                                  BoxShadow(
                                    color: const Color(0xFFFF5252).withOpacity(0.14),
                                    blurRadius: 36,
                                    offset: const Offset(0, 18),
                                  ),
                                ],
                              ),
                              child: Column(
                                mainAxisSize: MainAxisSize.min,
                                crossAxisAlignment: CrossAxisAlignment.center,
                                children: [
                                  // Headline: "You've got a Guest at the main gate"
                                  Text(
                                    _headlineText,
                                    textAlign: TextAlign.center,
                                    style: const TextStyle(
                                      fontFamily: 'Inter',
                                      fontSize: 22,
                                      fontWeight: FontWeight.w600,
                                      color: Color(0xFF222B45),
                                      height: 1.35,
                                      letterSpacing: -0.3,
                                    ),
                                  ),

                                  const SizedBox(height: 24),

                                  // Visitor Info Card / Strip
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 14,
                                      vertical: 12,
                                    ),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFFF8FAFC),
                                      borderRadius: BorderRadius.circular(20),
                                      border: Border.all(
                                        color: const Color(0xFFE2E8F0),
                                        width: 1,
                                      ),
                                    ),
                                    child: Row(
                                      children: [
                                        // Circular Visitor Photo
                                        Container(
                                          width: 58,
                                          height: 58,
                                          decoration: BoxDecoration(
                                            shape: BoxShape.circle,
                                            border: Border.all(
                                              color: Colors.white,
                                              width: 2.5,
                                            ),
                                            boxShadow: [
                                              BoxShadow(
                                                color: Colors.black.withOpacity(0.08),
                                                blurRadius: 10,
                                                offset: const Offset(0, 3),
                                              ),
                                            ],
                                          ),
                                          child: ClipOval(
                                            child: photoUrl.isNotEmpty
                                                ? Image.network(
                                                    photoUrl,
                                                    headers: ApiService.getAuthHeaders(),
                                                    fit: BoxFit.cover,
                                                    errorBuilder: (ctx, err, stack) =>
                                                        _buildAvatarFallback(),
                                                  )
                                                : _buildAvatarFallback(),
                                          ),
                                        ),

                                        const SizedBox(width: 14),

                                        // Visitor Name & Context Tag
                                        Expanded(
                                          child: Column(
                                            crossAxisAlignment:
                                                CrossAxisAlignment.start,
                                            mainAxisSize: MainAxisSize.min,
                                            children: [
                                              Text(
                                                widget.visitor.name,
                                                style: const TextStyle(
                                                  fontSize: 17,
                                                  fontWeight: FontWeight.w700,
                                                  color: Color(0xFF1E293B),
                                                  letterSpacing: -0.2,
                                                ),
                                                maxLines: 1,
                                                overflow: TextOverflow.ellipsis,
                                              ),
                                              const SizedBox(height: 3),
                                              Text(
                                                _subtext,
                                                style: TextStyle(
                                                  fontSize: 13,
                                                  fontWeight: FontWeight.w500,
                                                  color: Colors.grey.shade600,
                                                ),
                                                maxLines: 1,
                                                overflow: TextOverflow.ellipsis,
                                              ),
                                            ],
                                          ),
                                        ),

                                        // Phone Call Button with Star Emblem (Opens Native Dialer)
                                        GestureDetector(
                                          onTap: _handleCall,
                                          child: Stack(
                                            clipBehavior: Clip.none,
                                            children: [
                                              Container(
                                                width: 44,
                                                height: 44,
                                                decoration: BoxDecoration(
                                                  color: const Color(0xFFE8F8EC),
                                                  shape: BoxShape.circle,
                                                  border: Border.all(
                                                    color: const Color(0xFFB7EB8F)
                                                        .withOpacity(0.8),
                                                  ),
                                                  boxShadow: [
                                                    BoxShadow(
                                                      color: const Color(0xFF52C41A).withOpacity(0.20),
                                                      blurRadius: 8,
                                                      offset: const Offset(0, 2),
                                                    ),
                                                  ],
                                                ),
                                                child: const Icon(
                                                  Icons.phone_rounded,
                                                  color: Color(0xFF389E0D),
                                                  size: 22,
                                                ),
                                              ),
                                              Positioned(
                                                top: -2,
                                                right: -2,
                                                child: Container(
                                                  padding: const EdgeInsets.all(2),
                                                  decoration: const BoxDecoration(
                                                    color: Color(0xFF52C41A),
                                                    shape: BoxShape.circle,
                                                  ),
                                                  child: const Icon(
                                                    Icons.star_rounded,
                                                    size: 8,
                                                    color: Colors.white,
                                                  ),
                                                ),
                                              ),
                                            ],
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            ),

                            // Floating Top Badge with Sparkles
                            Positioned(
                              top: 0,
                              child: Container(
                                width: 84,
                                height: 84,
                                decoration: BoxDecoration(
                                  color: Colors.white,
                                  shape: BoxShape.circle,
                                  boxShadow: [
                                    BoxShadow(
                                      color: Colors.black.withOpacity(0.08),
                                      blurRadius: 16,
                                      offset: const Offset(0, 6),
                                    ),
                                  ],
                                ),
                                padding: const EdgeInsets.all(5),
                                child: Container(
                                  decoration: const BoxDecoration(
                                    shape: BoxShape.circle,
                                    gradient: LinearGradient(
                                      begin: Alignment.topLeft,
                                      end: Alignment.bottomRight,
                                      colors: [
                                        Color(0xFFFF7E79),
                                        Color(0xFFFF5252),
                                      ],
                                    ),
                                  ),
                                  child: Stack(
                                    alignment: Alignment.center,
                                    children: [
                                      // Top Left Sparkle
                                      Positioned(
                                        top: 14,
                                        left: 14,
                                        child: Icon(
                                          Icons.star_rounded,
                                          size: 8,
                                          color: Colors.white.withOpacity(0.85),
                                        ),
                                      ),
                                      // Bottom Right Sparkle
                                      Positioned(
                                        bottom: 18,
                                        right: 14,
                                        child: Icon(
                                          Icons.star_rounded,
                                          size: 9,
                                          color: Colors.white.withOpacity(0.85),
                                        ),
                                      ),
                                      // Person Icon
                                      const Icon(
                                        Icons.person_rounded,
                                        size: 40,
                                        color: Colors.white,
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),

                        const SizedBox(height: 36),

                        // Bottom Decision Buttons (DENY ENTRY & ALLOW ENTRY)
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                          children: [
                            // DENY ENTRY Button
                            GestureDetector(
                              onTap: _isProcessing ? null : _handleDeny,
                              child: Column(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Container(
                                    width: 74,
                                    height: 74,
                                    decoration: BoxDecoration(
                                      color: Colors.white,
                                      shape: BoxShape.circle,
                                      border: Border.all(
                                        color: const Color(0xFFFF4D4F).withOpacity(0.35),
                                        width: 2,
                                      ),
                                      boxShadow: [
                                        BoxShadow(
                                          color: Colors.black.withOpacity(0.12),
                                          blurRadius: 18,
                                          offset: const Offset(0, 8),
                                        ),
                                        BoxShadow(
                                          color: const Color(0xFFFF4D4F).withOpacity(0.20),
                                          blurRadius: 14,
                                          offset: const Offset(0, 4),
                                        ),
                                      ],
                                    ),
                                    child: Center(
                                      child: _isDenying
                                          ? const SizedBox(
                                              width: 26,
                                              height: 26,
                                              child: CircularProgressIndicator(
                                                strokeWidth: 2.5,
                                                valueColor: AlwaysStoppedAnimation(
                                                  Color(0xFFFF4D4F),
                                                ),
                                              ),
                                            )
                                          : const Icon(
                                              Icons.close_rounded,
                                              size: 38,
                                              color: Color(0xFFFF4D4F),
                                            ),
                                    ),
                                  ),
                                  const SizedBox(height: 12),
                                  const Text(
                                    'DENY\nENTRY',
                                    textAlign: TextAlign.center,
                                    style: TextStyle(
                                      color: Colors.white,
                                      fontSize: 12,
                                      fontWeight: FontWeight.w800,
                                      letterSpacing: 1.2,
                                      height: 1.25,
                                      shadows: [
                                        Shadow(
                                          color: Colors.black38,
                                          blurRadius: 8,
                                          offset: Offset(0, 2),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            ),

                            // ALLOW ENTRY Button
                            GestureDetector(
                              onTap: _isProcessing ? null : _handleAllow,
                              child: Column(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Container(
                                    width: 74,
                                    height: 74,
                                    decoration: BoxDecoration(
                                      gradient: const LinearGradient(
                                        begin: Alignment.topLeft,
                                        end: Alignment.bottomRight,
                                        colors: [
                                          Color(0xFF52C41A),
                                          Color(0xFF389E0D),
                                        ],
                                      ),
                                      shape: BoxShape.circle,
                                      border: Border.all(
                                        color: Colors.white.withOpacity(0.35),
                                        width: 2,
                                      ),
                                      boxShadow: [
                                        BoxShadow(
                                          color: const Color(0xFF52C41A).withOpacity(0.45),
                                          blurRadius: 20,
                                          offset: const Offset(0, 8),
                                        ),
                                        BoxShadow(
                                          color: Colors.black.withOpacity(0.12),
                                          blurRadius: 16,
                                          offset: const Offset(0, 6),
                                        ),
                                      ],
                                    ),
                                    child: Center(
                                      child: _isAllowing
                                          ? const SizedBox(
                                              width: 26,
                                              height: 26,
                                              child: CircularProgressIndicator(
                                                strokeWidth: 2.5,
                                                valueColor: AlwaysStoppedAnimation(
                                                  Colors.white,
                                                ),
                                              ),
                                            )
                                          : const Icon(
                                              Icons.check_rounded,
                                              size: 42,
                                              color: Colors.white,
                                            ),
                                    ),
                                  ),
                                  const SizedBox(height: 12),
                                  const Text(
                                    'ALLOW\nENTRY',
                                    textAlign: TextAlign.center,
                                    style: TextStyle(
                                      color: Colors.white,
                                      fontSize: 12,
                                      fontWeight: FontWeight.w800,
                                      letterSpacing: 1.2,
                                      height: 1.25,
                                      shadows: [
                                        Shadow(
                                          color: Colors.black38,
                                          blurRadius: 8,
                                          offset: Offset(0, 2),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
