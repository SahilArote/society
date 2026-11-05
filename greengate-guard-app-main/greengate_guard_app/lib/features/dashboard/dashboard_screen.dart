import '../../core/widgets/visitor_photo_avatar.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../core/constants/app_colors.dart';
import '../../core/widgets/status_badge.dart';
import '../../models/visitor.dart';
import '../../models/visitor_request.dart';
import '../../repositories/guard_repository.dart';
import '../../repositories/visitor_repository.dart';
import '../visitor_entry/camera_capture_screen.dart';
import '../visitor_entry/waiting_approval_screen.dart';
import '../visitor_entry/entry_approved_screen.dart';
import '../visitor_entry/entry_rejected_screen.dart';
import 'widgets/verify_pass_dialog.dart';

class DashboardScreen extends StatelessWidget {
  final GuardRepository guardRepo;
  final VisitorRepository visitorRepo;
  final VoidCallback? onNavigateToVisitors;

  const DashboardScreen({
    super.key,
    required this.guardRepo,
    required this.visitorRepo,
    this.onNavigateToVisitors,
  });

  void _startNewVisitor(BuildContext context) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => CameraCaptureScreen(
          visitorRepo: visitorRepo,
          guardRepo: guardRepo,
        ),
      ),
    );
  }

  void _onActivityTap(BuildContext context, VisitorRequest request) {
    if (request.status == VisitorStatus.pending) {
      Navigator.of(context).push(
        MaterialPageRoute(
          builder: (_) => WaitingApprovalScreen(
            request: request,
            visitorRepo: visitorRepo,
            guardRepo: guardRepo,
          ),
        ),
      );
    } else if (request.status == VisitorStatus.approved) {
      Navigator.of(context).push(
        MaterialPageRoute(
          builder: (_) => EntryApprovedScreen(
            request: request,
            visitorRepo: visitorRepo,
            guardRepo: guardRepo,
          ),
        ),
      );
    } else if (request.status == VisitorStatus.rejected) {
      Navigator.of(context).push(
        MaterialPageRoute(
          builder: (_) => EntryRejectedScreen(
            request: request,
            visitorRepo: visitorRepo,
            guardRepo: guardRepo,
          ),
        ),
      );
    } else if (request.status == VisitorStatus.completed) {
      _showDetailsSheet(context, request);
    }
  }

  @override
  Widget build(BuildContext context) {
    final guard = guardRepo.currentGuard;
    final guardName = guard?.name ?? 'Ramesh Singh';
    final societyName = guard?.societyName ?? 'Eco Residency Co-operative Housing Society Ltd';
    final gateName = guard?.assignedGate ?? 'Main Gate';

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: SafeArea(
        child: AnimatedBuilder(
          animation: visitorRepo,
          builder: (context, _) {
            final pendingCount = visitorRepo.pendingCount;
            final approvedCount = visitorRepo.approvedTodayCount;
            final rejectedCount = visitorRepo.rejectedTodayCount;
            final recentActivity = visitorRepo.recentActivity;

            return SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(
                  parent: BouncingScrollPhysics()),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // 1. Guard Station & Shift Header Card
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(
                        horizontal: 16, vertical: 14),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                          color: const Color(0xFFE2E8F0), width: 1.2),
                      boxShadow: const [
                        BoxShadow(
                          color: Color.fromRGBO(15, 23, 42, 0.04),
                          blurRadius: 12,
                          offset: Offset(0, 3),
                        ),
                      ],
                    ),
                    child: Row(
                      children: [
                        // Avatar Shield Icon with Soft Gradient
                        Container(
                          width: 48,
                          height: 48,
                          decoration: BoxDecoration(
                            gradient: const LinearGradient(
                              colors: [Color(0xFFEEF2FF), Color(0xFFE0E7FF)],
                              begin: Alignment.topLeft,
                              end: Alignment.bottomRight,
                            ),
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(
                                color: const Color(0xFFCBD5E1), width: 1.0),
                          ),
                          child: const Icon(
                            Icons.security_rounded,
                            color: AppColors.primary,
                            size: 26,
                          ),
                        ),
                        const SizedBox(width: 14),
                        // Guard Name & Gate Info
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(
                                guardName,
                                style: const TextStyle(
                                  fontSize: 17,
                                  fontWeight: FontWeight.w900,
                                  color: Color(0xFF0F172A),
                                  letterSpacing: -0.2,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                              const SizedBox(height: 2),
                              Row(
                                children: [
                                  const Icon(Icons.meeting_room_outlined,
                                      size: 13, color: Color(0xFF64748B)),
                                  const SizedBox(width: 4),
                                  Flexible(
                                    child: Text(
                                      '$gateName • $societyName',
                                      style: const TextStyle(
                                        fontSize: 12,
                                        fontWeight: FontWeight.w600,
                                        color: Color(0xFF64748B),
                                      ),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 8),
                        // Active Shift Status Pill
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 10, vertical: 5),
                          decoration: BoxDecoration(
                            color: const Color(0xFFECFDF5),
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(color: const Color(0xFFA7F3D0)),
                          ),
                          child: const Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.circle,
                                  size: 7, color: Color(0xFF059669)),
                              SizedBox(width: 5),
                              Text(
                                'ON DUTY',
                                style: TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.w800,
                                  color: Color(0xFF047857),
                                  letterSpacing: 0.5,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 16),

                  // 2. Primary Gate Action Buttons (50/50 Balanced & Symmetric)
                  Row(
                    children: [
                      // NEW VISITOR Button
                      Expanded(
                        child: Material(
                          color: Colors.transparent,
                          borderRadius: BorderRadius.circular(18),
                          child: InkWell(
                            onTap: () => _startNewVisitor(context),
                            borderRadius: BorderRadius.circular(18),
                            child: Ink(
                              height: 74,
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 14, vertical: 10),
                              decoration: BoxDecoration(
                                gradient: const LinearGradient(
                                  colors: [
                                    Color(0xFF4F46E5),
                                    Color(0xFF3730A3)
                                  ],
                                  begin: Alignment.topLeft,
                                  end: Alignment.bottomRight,
                                ),
                                borderRadius: BorderRadius.circular(18),
                                boxShadow: [
                                  BoxShadow(
                                    color: const Color(0xFF4F46E5)
                                        .withValues(alpha: 0.32),
                                    blurRadius: 14,
                                    offset: const Offset(0, 4),
                                  ),
                                ],
                              ),
                              child: Row(
                                children: [
                                  Container(
                                    width: 42,
                                    height: 42,
                                    decoration: BoxDecoration(
                                      color: Colors.white.withValues(alpha: 0.18),
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                    child: const Icon(
                                      Icons.person_add_alt_1_rounded,
                                      color: Colors.white,
                                      size: 22,
                                    ),
                                  ),
                                  const SizedBox(width: 10),
                                  const Expanded(
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      mainAxisAlignment:
                                          MainAxisAlignment.center,
                                      children: [
                                        Text(
                                          'NEW VISITOR',
                                          style: TextStyle(
                                            fontSize: 14,
                                            fontWeight: FontWeight.w900,
                                            color: Colors.white,
                                            letterSpacing: 0.3,
                                          ),
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                        SizedBox(height: 2),
                                        Text(
                                          'Camera & Details',
                                          style: TextStyle(
                                            fontSize: 11,
                                            fontWeight: FontWeight.w600,
                                            color: Color(0xFFE0E7FF),
                                          ),
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ),

                      const SizedBox(width: 12),

                      // VERIFY PASS Button
                      Expanded(
                        child: Material(
                          color: Colors.transparent,
                          borderRadius: BorderRadius.circular(18),
                          child: InkWell(
                            onTap: () => VerifyPassDialog.show(context,
                                visitorRepo: visitorRepo),
                            borderRadius: BorderRadius.circular(18),
                            child: Container(
                              height: 74,
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 14, vertical: 10),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(18),
                                border: Border.all(
                                    color: const Color(0xFFCBD5E1), width: 1.5),
                                boxShadow: const [
                                  BoxShadow(
                                    color: Color.fromRGBO(15, 23, 42, 0.04),
                                    blurRadius: 12,
                                    offset: Offset(0, 3),
                                  ),
                                ],
                              ),
                              child: Row(
                                children: [
                                  Container(
                                    width: 42,
                                    height: 42,
                                    decoration: BoxDecoration(
                                      color: const Color(0xFFECFDF5),
                                      borderRadius: BorderRadius.circular(12),
                                      border: Border.all(
                                          color: const Color(0xFFA7F3D0)),
                                    ),
                                    child: const Icon(
                                      Icons.qr_code_scanner_rounded,
                                      color: Color(0xFF059669),
                                      size: 22,
                                    ),
                                  ),
                                  const SizedBox(width: 10),
                                  const Expanded(
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      mainAxisAlignment:
                                          MainAxisAlignment.center,
                                      children: [
                                        Text(
                                          'VERIFY PASS',
                                          style: TextStyle(
                                            fontSize: 14,
                                            fontWeight: FontWeight.w900,
                                            color: Color(0xFF0F172A),
                                            letterSpacing: 0.3,
                                          ),
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                        SizedBox(height: 2),
                                        Text(
                                          'Code or QR Pass',
                                          style: TextStyle(
                                            fontSize: 11,
                                            fontWeight: FontWeight.w600,
                                            color: Color(0xFF64748B),
                                          ),
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                      ],
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

                  const SizedBox(height: 18),

                  // 3. Status Count Metric Cards (Color-Coded for Instant Recognition)
                  Row(
                    children: [
                      // Pending Count
                      Expanded(
                        child: _buildCountCard(
                          label: 'Pending',
                          count: pendingCount.toString(),
                          color: const Color(0xFFB45309),
                          bgColor: const Color(0xFFFFFBEB),
                          borderColor: const Color(0xFFFDE68A),
                          icon: Icons.hourglass_top_rounded,
                        ),
                      ),
                      const SizedBox(width: 10),
                      // Approved Today
                      Expanded(
                        child: _buildCountCard(
                          label: 'Approved',
                          count: approvedCount.toString(),
                          color: const Color(0xFF047857),
                          bgColor: const Color(0xFFECFDF5),
                          borderColor: const Color(0xFFA7F3D0),
                          icon: Icons.check_circle_rounded,
                        ),
                      ),
                      const SizedBox(width: 10),
                      // Rejected Today
                      Expanded(
                        child: _buildCountCard(
                          label: 'Rejected',
                          count: rejectedCount.toString(),
                          color: const Color(0xFFB91C1C),
                          bgColor: const Color(0xFFFEF2F2),
                          borderColor: const Color(0xFFFECACA),
                          icon: Icons.cancel_rounded,
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: 22),

                  // 4. Recent Visitors Section Header
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Recent Visitors',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w900,
                          color: Color(0xFF0F172A),
                          letterSpacing: -0.2,
                        ),
                      ),
                      if (onNavigateToVisitors != null)
                        InkWell(
                          onTap: onNavigateToVisitors,
                          borderRadius: BorderRadius.circular(20),
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: const Color(0xFFEEF2FF),
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: const Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Text(
                                  'View All',
                                  style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w800,
                                    color: AppColors.primary,
                                  ),
                                ),
                                SizedBox(width: 3),
                                Icon(Icons.arrow_forward_rounded,
                                    size: 14, color: AppColors.primary),
                              ],
                            ),
                          ),
                        ),
                    ],
                  ),

                  const SizedBox(height: 12),

                  // 5. Visitor Activity List
                  if (recentActivity.isEmpty)
                    Container(
                      padding: const EdgeInsets.symmetric(
                          vertical: 36, horizontal: 20),
                      width: double.infinity,
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(
                            color: const Color(0xFFE2E8F0), width: 1.2),
                      ),
                      child: Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Container(
                              width: 54,
                              height: 54,
                              decoration: BoxDecoration(
                                color: const Color(0xFFF1F5F9),
                                borderRadius: BorderRadius.circular(16),
                              ),
                              child: const Icon(
                                Icons.people_outline_rounded,
                                size: 30,
                                color: Color(0xFF94A3B8),
                              ),
                            ),
                            const SizedBox(height: 12),
                            const Text(
                              'No Activity Today',
                              style: TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.w800,
                                color: Color(0xFF334155),
                              ),
                            ),
                            const SizedBox(height: 4),
                            const Text(
                              'Visitors checked-in at this gate will appear here',
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
                    )
                  else
                    ...recentActivity
                        .map((req) => _buildVisitorCard(context, req)),
                ],
              ),
            );
          },
        ),
      ),
    );
  }

  Widget _buildCountCard({
    required String label,
    required String count,
    required Color color,
    required Color bgColor,
    required Color borderColor,
    required IconData icon,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: borderColor, width: 1.2),
        boxShadow: const [
          BoxShadow(
            color: Color.fromRGBO(15, 23, 42, 0.02),
            blurRadius: 6,
            offset: Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, size: 14, color: color),
              const SizedBox(width: 4),
              Text(
                label,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w800,
                  color: color,
                  letterSpacing: 0.2,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            count,
            style: TextStyle(
              fontSize: 26,
              fontWeight: FontWeight.w900,
              color: color,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildVisitorCard(BuildContext context, VisitorRequest req) {
    final timeStr = DateFormat('hh:mm a').format(req.requestTime);

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0), width: 1.2),
        boxShadow: const [
          BoxShadow(
            color: Color.fromRGBO(15, 23, 42, 0.03),
            blurRadius: 8,
            offset: Offset(0, 2),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: () => _onActivityTap(context, req),
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Row(
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: Container(
                    width: 48,
                    height: 48,
                    color: const Color(0xFFF1F5F9),
                    child: _buildPhoto(req.visitor.photoPath),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Flexible(
                            child: Text(
                              req.visitor.name,
                              style: const TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.w800,
                                color: Color(0xFF0F172A),
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          const SizedBox(width: 6),
                          _buildTypeBadge(req.visitor.type),
                        ],
                      ),
                      const SizedBox(height: 3),
                      Row(
                        children: [
                          Text(
                            'Flat ${req.flatNumber}',
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w800,
                              color: Color(0xFF334155),
                            ),
                          ),
                          const Text(
                            ' • ',
                            style: TextStyle(
                                color: Color(0xFF94A3B8),
                                fontWeight: FontWeight.bold),
                          ),
                          Text(
                            timeStr,
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: Color(0xFF64748B),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                StatusBadge(status: req.status),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildTypeBadge(VisitorType type) {
    Color bg;
    Color text;
    IconData icon;

    switch (type) {
      case VisitorType.delivery:
        bg = const Color(0xFFFFF7ED);
        text = const Color(0xFFC2410C);
        icon = Icons.local_shipping_outlined;
        break;
      case VisitorType.cab:
        bg = const Color(0xFFF0FDF4);
        text = const Color(0xFF15803D);
        icon = Icons.local_taxi_outlined;
        break;
      case VisitorType.maintenance:
        bg = const Color(0xFFFEF3C7);
        text = const Color(0xFFB45309);
        icon = Icons.build_outlined;
        break;
      default:
        bg = const Color(0xFFF1F5F9);
        text = const Color(0xFF475569);
        icon = Icons.person_outline;
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(6),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 11, color: text),
          const SizedBox(width: 3),
          Text(
            type.displayName,
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w700,
              color: text,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPhoto(String? path) {
    return VisitorPhotoAvatar.buildImageWidget(path, size: 48);
  }

  void _showDetailsSheet(BuildContext context, VisitorRequest req) {
    final timeFormatted =
        DateFormat('hh:mm a, dd MMM yyyy').format(req.requestTime);
    final decisionTimeFormatted = req.decisionTime != null
        ? DateFormat('hh:mm a, dd MMM yyyy').format(req.decisionTime!)
        : null;

    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Center(
                  child: Container(
                    width: 40,
                    height: 5,
                    decoration: BoxDecoration(
                      color: const Color(0xFFE2E8F0),
                      borderRadius: BorderRadius.circular(999),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(12),
                      child: Container(
                        width: 52,
                        height: 52,
                        color: const Color(0xFFF1F5F9),
                        child: _buildPhoto(req.visitor.photoPath),
                      ),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            req.visitor.name,
                            style: const TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w900,
                              color: Color(0xFF0F172A),
                            ),
                          ),
                          const SizedBox(height: 3),
                          Text(
                            '${req.visitor.type.displayName}${req.visitor.phoneNumber != null ? " • ${req.visitor.phoneNumber!}" : ""}',
                            style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                              color: Color(0xFF64748B),
                            ),
                          ),
                        ],
                      ),
                    ),
                    StatusBadge(status: req.status),
                  ],
                ),
                const SizedBox(height: 16),
                const Divider(color: Color(0xFFE2E8F0)),
                const SizedBox(height: 12),
                _buildModalRow(
                    'Flat & Wing:', '${req.flatNumber} (${req.buildingWing})'),
                const SizedBox(height: 8),
                _buildModalRow(
                    'Resident:', '${req.residentName} (${req.residentPhone})'),
                const SizedBox(height: 8),
                _buildModalRow('Purpose:', req.purpose),
                if (req.visitor.vehicleNumber != null &&
                    req.visitor.vehicleNumber!.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  _buildModalRow('Vehicle:', req.visitor.vehicleNumber!),
                ],
                const SizedBox(height: 8),
                _buildModalRow('Request Time:', timeFormatted),
                if (decisionTimeFormatted != null) ...[
                  const SizedBox(height: 8),
                  _buildModalRow('Completion Time:', decisionTimeFormatted),
                ],
                const SizedBox(height: 20),
                SizedBox(
                  width: double.infinity,
                  height: 52,
                  child: ElevatedButton(
                    onPressed: () => Navigator.of(context).pop(),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFFF1F5F9),
                      foregroundColor: const Color(0xFF0F172A),
                      elevation: 0,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                        side: const BorderSide(color: Color(0xFFE2E8F0)),
                      ),
                    ),
                    child: const Text(
                      'CLOSE',
                      style:
                          TextStyle(fontWeight: FontWeight.w800, fontSize: 15),
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildModalRow(String label, String value) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: 120,
          child: Text(
            label,
            style: const TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w700,
              color: Color(0xFF64748B),
            ),
          ),
        ),
        Expanded(
          child: Text(
            value,
            style: const TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w800,
              color: Color(0xFF0F172A),
            ),
          ),
        ),
      ],
    );
  }
}
