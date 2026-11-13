import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_dimensions.dart';
import '../../core/widgets/custom_button.dart';
import '../../core/widgets/visitor_photo_avatar.dart';
import '../../models/visitor_request.dart';
import '../../repositories/guard_repository.dart';
import '../../repositories/visitor_repository.dart';
import 'entry_approved_screen.dart';
import 'entry_rejected_screen.dart';

class WaitingApprovalScreen extends StatefulWidget {
  final VisitorRequest request;
  final VisitorRepository visitorRepo;
  final GuardRepository guardRepo;
  final bool isUploading;

  const WaitingApprovalScreen({
    super.key,
    required this.request,
    required this.visitorRepo,
    required this.guardRepo,
    this.isUploading = false,
  });

  @override
  State<WaitingApprovalScreen> createState() => _WaitingApprovalScreenState();
}

class _WaitingApprovalScreenState extends State<WaitingApprovalScreen>
    with SingleTickerProviderStateMixin {
  late VisitorRequest _liveRequest;
  late AnimationController _pulseController;
  late Animation<double> _pulseAnimation;
  bool _isProcessingGuardDecision = false;

  @override
  void initState() {
    super.initState();
    _liveRequest = widget.request;
    widget.visitorRepo.addListener(_handleRepoUpdate);

    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1400),
    )..repeat(reverse: true);

    _pulseAnimation = Tween<double>(begin: 0.94, end: 1.06).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );
  }

  void _handleRepoUpdate() {
    final origId = widget.request.id;
    VisitorRequest? current;
    for (final r in widget.visitorRepo.allRequests) {
      if (r.id == origId || r.id == _liveRequest.id) {
        current = r;
        break;
      }
    }
    // Also match by name & flat if local temporary request was upgraded to server request
    if (current == null) {
      for (final r in widget.visitorRepo.allRequests) {
        if (r.visitor.name.toLowerCase() ==
                widget.request.visitor.name.toLowerCase() &&
            r.flatNumber == widget.request.flatNumber) {
          current = r;
          break;
        }
      }
    }
    current ??= _liveRequest;

    if (!mounted) return;
    setState(() => _liveRequest = current!);

    if (current.status == VisitorStatus.approved) {
      widget.visitorRepo.removeListener(_handleRepoUpdate);
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(
          builder: (_) => EntryApprovedScreen(
            request: current!,
            visitorRepo: widget.visitorRepo,
            guardRepo: widget.guardRepo,
          ),
        ),
      );
    } else if (current.status == VisitorStatus.rejected &&
        current.rejectionReason != '__upload_failed__') {
      widget.visitorRepo.removeListener(_handleRepoUpdate);
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(
          builder: (_) => EntryRejectedScreen(
            request: current!,
            visitorRepo: widget.visitorRepo,
            guardRepo: widget.guardRepo,
          ),
        ),
      );
    }
  }

  Future<void> _handleGuardApproveOverride() async {
    if (_isProcessingGuardDecision) return;
    setState(() => _isProcessingGuardDecision = true);
    try {
      await widget.visitorRepo.simulateResidentDecision(
        requestId: _liveRequest.id,
        isApproved: true,
      );
      if (!mounted) return;
      widget.visitorRepo.removeListener(_handleRepoUpdate);
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(
          builder: (_) => EntryApprovedScreen(
            request: _liveRequest.copyWith(status: VisitorStatus.approved),
            visitorRepo: widget.visitorRepo,
            guardRepo: widget.guardRepo,
          ),
        ),
      );
    } finally {
      if (mounted) setState(() => _isProcessingGuardDecision = false);
    }
  }

  Future<void> _handleGuardRejectOverride() async {
    if (_isProcessingGuardDecision) return;
    setState(() => _isProcessingGuardDecision = true);
    try {
      await widget.visitorRepo.simulateResidentDecision(
        requestId: _liveRequest.id,
        isApproved: false,
        reason: 'Denied by Guard at gate',
      );
      if (!mounted) return;
      widget.visitorRepo.removeListener(_handleRepoUpdate);
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(
          builder: (_) => EntryRejectedScreen(
            request: _liveRequest.copyWith(
              status: VisitorStatus.rejected,
              rejectionReason: 'Denied by Guard at gate',
            ),
            visitorRepo: widget.visitorRepo,
            guardRepo: widget.guardRepo,
          ),
        ),
      );
    } finally {
      if (mounted) setState(() => _isProcessingGuardDecision = false);
    }
  }

  void _callResident(String phone) {
    Clipboard.setData(ClipboardData(text: phone));
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Resident phone: $phone (Copied to clipboard)'),
        backgroundColor: const Color(0xFF1E293B),
        duration: const Duration(seconds: 2),
      ),
    );
  }

  void _navigateBackToDashboard() {
    widget.visitorRepo.removeListener(_handleRepoUpdate);
    Navigator.of(context).popUntil((route) => route.isFirst);
  }

  @override
  void dispose() {
    _pulseController.dispose();
    widget.visitorRepo.removeListener(_handleRepoUpdate);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final dateFormatted =
        DateFormat('EEEE, dd MMM yyyy').format(_liveRequest.requestTime);
    final timeFormatted =
        DateFormat('hh:mm a').format(_liveRequest.requestTime);

    final wingText = _liveRequest.buildingWing.toLowerCase().contains('wing') ||
            _liveRequest.buildingWing.toLowerCase().contains('tower')
        ? _liveRequest.buildingWing
        : 'Wing ${_liveRequest.buildingWing}';

    return WillPopScope(
      onWillPop: () async {
        _navigateBackToDashboard();
        return false;
      },
      child: Scaffold(
        backgroundColor: const Color(0xFFF8FAFC),
        appBar: AppBar(
          elevation: 0,
          scrolledUnderElevation: 0,
          backgroundColor: Colors.white,
          title: const Text(
            'Waiting for Resident Approval',
            style: TextStyle(
              fontSize: 17,
              fontWeight: FontWeight.w700,
              color: Color(0xFF0F172A),
            ),
          ),
          leading: IconButton(
            icon: const Icon(Icons.arrow_back, size: 24, color: Color(0xFF0F172A)),
            onPressed: _navigateBackToDashboard,
          ),
        ),
        body: SafeArea(
          child: SingleChildScrollView(
            physics: const BouncingScrollPhysics(),
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                // 1. Prominent Status Header Card with Pulse Animation
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(vertical: 22, horizontal: 20),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: const Color(0xFFFED7AA), width: 1.5),
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFFF97316).withOpacity(0.08),
                        blurRadius: 18,
                        offset: const Offset(0, 6),
                      ),
                    ],
                  ),
                  child: Column(
                    children: [
                      ScaleTransition(
                        scale: _pulseAnimation,
                        child: Container(
                          width: 60,
                          height: 60,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: const Color(0xFFFFF7ED),
                            border: Border.all(
                              color: const Color(0xFFF97316).withOpacity(0.3),
                              width: 2,
                            ),
                          ),
                          child: const Center(
                            child: SizedBox(
                              width: 32,
                              height: 32,
                              child: CircularProgressIndicator(
                                strokeWidth: 3.2,
                                valueColor: AlwaysStoppedAnimation<Color>(
                                  Color(0xFFEA580C),
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),
                      const Text(
                        'Awaiting Resident Decision',
                        style: TextStyle(
                          fontSize: 19,
                          fontWeight: FontWeight.w800,
                          color: Color(0xFF9A3412),
                          letterSpacing: -0.2,
                        ),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 6),
                      const Text(
                        'Approval alert sent to resident\'s phone.\nScreen updates automatically.',
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w500,
                          color: Color(0xFF7C2D12),
                          height: 1.35,
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 14),

                // 2. Date & Time Bar
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.calendar_today_rounded,
                          size: 16, color: Color(0xFF4F46E5)),
                      const SizedBox(width: 8),
                      Text(
                        dateFormatted,
                        style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                          color: Color(0xFF0F172A),
                        ),
                      ),
                      const Spacer(),
                      const Icon(Icons.access_time_rounded,
                          size: 16, color: Color(0xFF64748B)),
                      const SizedBox(width: 6),
                      Text(
                        timeFormatted,
                        style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w800,
                          color: Color(0xFF0F172A),
                        ),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 14),

                // 3. Visitor Information Card
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(18),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFF0F172A).withOpacity(0.04),
                        blurRadius: 10,
                        offset: const Offset(0, 3),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'VISITOR DETAILS',
                        style: TextStyle(
                          fontSize: 11.5,
                          fontWeight: FontWeight.w800,
                          color: Color(0xFF64748B),
                          letterSpacing: 0.5,
                        ),
                      ),
                      const SizedBox(height: 14),
                      Row(
                        children: [
                          ClipRRect(
                            borderRadius: BorderRadius.circular(16),
                            child: Container(
                              width: 68,
                              height: 68,
                              color: const Color(0xFFF1F5F9),
                              child: VisitorPhotoAvatar.buildImageWidget(
                                _liveRequest.visitor.photoPath,
                                size: 68,
                              ),
                            ),
                          ),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  _liveRequest.visitor.name,
                                  style: const TextStyle(
                                    fontSize: 18,
                                    fontWeight: FontWeight.w800,
                                    color: Color(0xFF0F172A),
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                                const SizedBox(height: 4),
                                Row(
                                  children: [
                                    const Icon(Icons.phone_outlined,
                                        size: 14, color: Color(0xFF64748B)),
                                    const SizedBox(width: 4),
                                    Text(
                                      _liveRequest.visitor.phoneNumber?.isNotEmpty == true
                                          ? _liveRequest.visitor.phoneNumber!
                                          : 'Phone not provided',
                                      style: const TextStyle(
                                        fontSize: 13,
                                        fontWeight: FontWeight.w600,
                                        color: Color(0xFF64748B),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 8),
                                Wrap(
                                  spacing: 6,
                                  runSpacing: 4,
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.symmetric(
                                          horizontal: 8, vertical: 3),
                                      decoration: BoxDecoration(
                                        color: const Color(0xFFEEF2FF),
                                        borderRadius: BorderRadius.circular(8),
                                      ),
                                      child: Text(
                                        _liveRequest.visitor.type.displayName,
                                        style: const TextStyle(
                                          fontSize: 11.5,
                                          fontWeight: FontWeight.w700,
                                          color: Color(0xFF4F46E5),
                                        ),
                                      ),
                                    ),
                                    if (_liveRequest.visitor.deliveryCompany != null &&
                                        _liveRequest.visitor.deliveryCompany!.isNotEmpty)
                                      Container(
                                        padding: const EdgeInsets.symmetric(
                                            horizontal: 8, vertical: 3),
                                        decoration: BoxDecoration(
                                          color: const Color(0xFFFEF3C7),
                                          borderRadius: BorderRadius.circular(8),
                                        ),
                                        child: Text(
                                          _liveRequest.visitor.deliveryCompany!,
                                          style: const TextStyle(
                                            fontSize: 11.5,
                                            fontWeight: FontWeight.w700,
                                            color: Color(0xFFB45309),
                                          ),
                                        ),
                                      ),
                                    if (_liveRequest.visitor.vehicleNumber != null &&
                                        _liveRequest.visitor.vehicleNumber!.isNotEmpty)
                                      Container(
                                        padding: const EdgeInsets.symmetric(
                                            horizontal: 8, vertical: 3),
                                        decoration: BoxDecoration(
                                          color: const Color(0xFFE2E8F0),
                                          borderRadius: BorderRadius.circular(8),
                                        ),
                                        child: Text(
                                          _liveRequest.visitor.vehicleNumber!,
                                          style: const TextStyle(
                                            fontSize: 11.5,
                                            fontWeight: FontWeight.w700,
                                            color: Color(0xFF334155),
                                          ),
                                        ),
                                      ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 14),
                      const Divider(height: 1, color: Color(0xFFE2E8F0)),
                      const SizedBox(height: 12),
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Icon(Icons.description_outlined,
                              size: 16, color: Color(0xFF64748B)),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              'Purpose: ${_liveRequest.purpose}',
                              style: const TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                                color: Color(0xFF334155),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 14),

                // 4. Destination Flat & Resident Card
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(18),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'DESTINATION RESIDENCE',
                        style: TextStyle(
                          fontSize: 11.5,
                          fontWeight: FontWeight.w800,
                          color: Color(0xFF64748B),
                          letterSpacing: 0.5,
                        ),
                      ),
                      const SizedBox(height: 14),
                      Row(
                        children: [
                          Container(
                            width: 44,
                            height: 44,
                            decoration: BoxDecoration(
                              color: const Color(0xFFEEF2FF),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            alignment: Alignment.center,
                            child: const Icon(Icons.apartment_rounded,
                                size: 22, color: Color(0xFF4F46E5)),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Flat ${_liveRequest.flatNumber}',
                                  style: const TextStyle(
                                    fontSize: 17,
                                    fontWeight: FontWeight.w800,
                                    color: Color(0xFF0F172A),
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  wingText,
                                  style: const TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w600,
                                    color: Color(0xFF64748B),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      const Divider(height: 1, color: Color(0xFFE2E8F0)),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Container(
                            width: 38,
                            height: 38,
                            decoration: BoxDecoration(
                              color: const Color(0xFFDCFCE7),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            alignment: Alignment.center,
                            child: const Icon(Icons.person_rounded,
                                size: 20, color: Color(0xFF16A34A)),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  _liveRequest.residentName,
                                  style: const TextStyle(
                                    fontSize: 15,
                                    fontWeight: FontWeight.w700,
                                    color: Color(0xFF0F172A),
                                  ),
                                ),
                                if (_liveRequest.residentPhone.isNotEmpty) ...[
                                  const SizedBox(height: 2),
                                  Text(
                                    _liveRequest.residentPhone,
                                    style: const TextStyle(
                                      fontSize: 12.5,
                                      fontWeight: FontWeight.w600,
                                      color: Color(0xFF64748B),
                                    ),
                                  ),
                                ],
                              ],
                            ),
                          ),
                          if (_liveRequest.residentPhone.isNotEmpty)
                            IconButton(
                              onPressed: () =>
                                  _callResident(_liveRequest.residentPhone),
                              icon: Container(
                                width: 36,
                                height: 36,
                                decoration: BoxDecoration(
                                  color: const Color(0xFFDCFCE7),
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                alignment: Alignment.center,
                                child: const Icon(Icons.call_rounded,
                                    size: 18, color: Color(0xFF16A34A)),
                              ),
                            ),
                        ],
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 20),

                // 5. Guard Override Decision Actions (Approve / Reject at Gate)
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF1F5F9),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Row(
                        children: [
                          Icon(Icons.shield_outlined,
                              size: 16, color: Color(0xFF475569)),
                          SizedBox(width: 6),
                          Text(
                            'GUARD EMERGENCY ACTION',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w800,
                              color: Color(0xFF475569),
                              letterSpacing: 0.5,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),
                      Row(
                        children: [
                          Expanded(
                            child: SizedBox(
                              height: 46,
                              child: OutlinedButton.icon(
                                onPressed: _isProcessingGuardDecision
                                    ? null
                                    : _handleGuardRejectOverride,
                                icon: const Icon(Icons.close_rounded,
                                    size: 18, color: Color(0xFFDC2626)),
                                label: const Text(
                                  'Deny Entry',
                                  style: TextStyle(
                                    fontSize: 13.5,
                                    fontWeight: FontWeight.w700,
                                    color: Color(0xFFDC2626),
                                  ),
                                ),
                                style: OutlinedButton.styleFrom(
                                  backgroundColor: Colors.white,
                                  side: const BorderSide(
                                      color: Color(0xFFFCA5A5), width: 1.2),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: SizedBox(
                              height: 46,
                              child: ElevatedButton.icon(
                                onPressed: _isProcessingGuardDecision
                                    ? null
                                    : _handleGuardApproveOverride,
                                icon: const Icon(Icons.check_circle_rounded,
                                    size: 18, color: Colors.white),
                                label: const Text(
                                  'Approve at Gate',
                                  style: TextStyle(
                                    fontSize: 13.5,
                                    fontWeight: FontWeight.w700,
                                    color: Colors.white,
                                  ),
                                ),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: const Color(0xFF16A34A),
                                  elevation: 0,
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 14),

                // 6. Return to Dashboard Button
                CustomButton(
                  text: 'BACK TO GATE TERMINAL',
                  icon: Icons.home_outlined,
                  variant: CustomButtonVariant.outline,
                  height: 52,
                  onPressed: _navigateBackToDashboard,
                ),

                const SizedBox(height: 10),
                const Text(
                  'Request will continue running in background. You can check status anytime in Gate Visitors.',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                    color: Color(0xFF94A3B8),
                  ),
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
