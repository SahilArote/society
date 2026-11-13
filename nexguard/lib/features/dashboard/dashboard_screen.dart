import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:image_picker/image_picker.dart';
import 'package:intl/intl.dart';
import '../../core/constants/app_colors.dart';
import '../../core/widgets/visitor_photo_avatar.dart';
import '../../models/visitor_request.dart';
import '../../repositories/guard_repository.dart';
import '../../repositories/visitor_repository.dart';
import '../../services/image_compress_service.dart';
import '../visitor_entry/camera_capture_screen.dart';
import '../visitor_entry/visitor_details_screen.dart';
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

  Future<void> _startNewVisitor(BuildContext context) async {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (sheetCtx) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: SafeArea(
          top: false,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: const Color(0xFFE2E8F0),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 18),
              const Text(
                'Capture Visitor Photo',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                  color: Color(0xFF0F172A),
                  letterSpacing: -0.3,
                  fontFamily: 'Inter',
                ),
              ),
              const SizedBox(height: 6),
              const Text(
                'Take a photo with the camera or choose from gallery',
                style: TextStyle(
                  fontSize: 13,
                  color: Color(0xFF64748B),
                  fontFamily: 'Inter',
                ),
              ),
              const SizedBox(height: 20),
              Row(
                children: [
                  Expanded(
                    child: InkWell(
                      borderRadius: BorderRadius.circular(16),
                      onTap: () {
                        Navigator.pop(sheetCtx);
                        _pickAndProceed(context, ImageSource.camera);
                      },
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 18),
                        decoration: BoxDecoration(
                          color: const Color(0xFFEEF2FF),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                            color: const Color(0xFFC7D2FE),
                            width: 1.5,
                          ),
                        ),
                        child: const Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(
                              Icons.camera_alt_rounded,
                              size: 36,
                              color: AppColors.primary,
                            ),
                            SizedBox(height: 8),
                            Text(
                              'Take Photo',
                              style: TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.w700,
                                color: AppColors.primary,
                                fontFamily: 'Inter',
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: InkWell(
                      borderRadius: BorderRadius.circular(16),
                      onTap: () {
                        Navigator.pop(sheetCtx);
                        _pickAndProceed(context, ImageSource.gallery);
                      },
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 18),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF8FAFC),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                            color: const Color(0xFFE2E8F0),
                            width: 1.5,
                          ),
                        ),
                        child: const Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(
                              Icons.photo_library_rounded,
                              size: 36,
                              color: Color(0xFF334155),
                            ),
                            SizedBox(height: 8),
                            Text(
                              'Gallery',
                              style: TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.w700,
                                color: Color(0xFF334155),
                                fontFamily: 'Inter',
                              ),
                            ),
                          ],
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

  Future<void> _pickAndProceed(BuildContext context, ImageSource source) async {
    // Show non-dismissible loading dialog BEFORE opening camera/gallery so the dashboard NEVER flashes
    showDialog(
      context: context,
      barrierDismissible: false,
      barrierColor: Colors.black.withOpacity(0.35),
      builder: (dlgCtx) => WillPopScope(
        onWillPop: () async => false,
        child: Center(
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 18),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(18),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.15),
                  blurRadius: 20,
                  offset: const Offset(0, 8),
                ),
              ],
            ),
            child: const Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                SizedBox(
                  width: 22,
                  height: 22,
                  child: CircularProgressIndicator(
                    strokeWidth: 2.5,
                    valueColor:
                        AlwaysStoppedAnimation<Color>(AppColors.primary),
                  ),
                ),
                SizedBox(width: 16),
                Text(
                  'Opening visitor form...',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF0F172A),
                    fontFamily: 'Inter',
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );

    try {
      final picker = ImagePicker();
      final XFile? photo = await picker.pickImage(
        source: source,
        preferredCameraDevice: CameraDevice.rear,
      );

      if (photo == null) {
        if (context.mounted) {
          Navigator.of(context, rootNavigator: true).pop();
        }
        return;
      }

      // Fast hardware JPEG compression
      final compressed = await ImageCompressService.compress(photo.path);

      if (!context.mounted) return;
      Navigator.of(context, rootNavigator: true).pop(); // dismiss loading dialog

      Navigator.of(context).push(
        MaterialPageRoute(
          builder: (_) => VisitorDetailsScreen(
            photoPath: compressed,
            visitorRepo: visitorRepo,
            guardRepo: guardRepo,
          ),
        ),
      );
    } catch (e) {
      if (context.mounted) {
        Navigator.of(context, rootNavigator: true).pop();
      }
    }
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
    } else {
      _showDetailsSheet(context, request);
    }
  }

  String _getGreeting() {
    final hour = DateTime.now().hour;
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }

  String _getInitials(String name) {
    final parts = name.trim().split(RegExp(r'\s+'));
    if (parts.isEmpty || parts[0].isEmpty) return 'RS';
    if (parts.length == 1) return parts[0][0].toUpperCase();
    return '${parts[0][0]}${parts[parts.length - 1][0]}'.toUpperCase();
  }

  @override
  Widget build(BuildContext context) {
    final guard = guardRepo.currentGuard;
    final guardName = guard?.name ?? 'Ramesh Singh';
    final societyName = guard?.societyName ?? 'GreenGate Society';
    final gateName = guard?.assignedGate ?? 'Main Gate';
    final guardInitials = _getInitials(guardName);

    final statusBarHeight = MediaQuery.of(context).padding.top;

    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: const SystemUiOverlayStyle(
        statusBarColor: Colors.transparent,
        statusBarIconBrightness: Brightness.dark,
        statusBarBrightness: Brightness.light,
      ),
      child: Scaffold(
        backgroundColor: AppColors.pageBackground,
        body: AnimatedBuilder(
          animation: visitorRepo,
          builder: (context, _) {
            final pendingCount = visitorRepo.pendingCount;
            final approvedCount = visitorRepo.approvedTodayCount;
            final rejectedCount = visitorRepo.rejectedTodayCount;
            final recentActivity = visitorRepo.recentActivity;
            final displayList = recentActivity.take(3).toList();

            return SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(
                parent: BouncingScrollPhysics(),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // ==========================================
                  // 1. HERO & 2. STATS CARD (Stack with Overlap)
                  // ==========================================
                  Stack(
                    clipBehavior: Clip.none,
                    alignment: Alignment.bottomCenter,
                    children: [
                      // HERO CONTAINER
                      Padding(
                        padding: const EdgeInsets.only(bottom: 40),
                        child: Container(
                          width: double.infinity,
                          decoration: const BoxDecoration(
                            color: AppColors.hero, // #2B2F8F
                            borderRadius: BorderRadius.vertical(
                              bottom: Radius.circular(28),
                            ),
                          ),
                          padding: EdgeInsets.only(
                            top: statusBarHeight + 20,
                            left: 16,
                            right: 16,
                            bottom: 92,
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              // Hero Top Row: Avatar + Greeting/Name + ON DUTY Pill
                              Row(
                                children: [
                                  // 48px circle avatar
                                  Container(
                                    width: 48,
                                    height: 48,
                                    decoration: const BoxDecoration(
                                      color: Color(
                                          0x2EFFFFFF), // rgba(255,255,255,.18)
                                      shape: BoxShape.circle,
                                    ),
                                    alignment: Alignment.center,
                                    child: Text(
                                      guardInitials,
                                      style: const TextStyle(
                                        fontSize: 16,
                                        fontWeight: FontWeight.bold,
                                        color: Colors.white,
                                        fontFamily: 'Inter',
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  // Greeting & Guard Name
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        Text(
                                          _getGreeting(),
                                          style: const TextStyle(
                                            fontSize: 12,
                                            fontWeight: FontWeight.w500,
                                            color: AppColors
                                                .heroSubText, // #C7CBFF
                                            fontFamily: 'Inter',
                                          ),
                                        ),
                                        const SizedBox(height: 2),
                                        Text(
                                          guardName,
                                          style: const TextStyle(
                                            fontSize: 20,
                                            fontWeight: FontWeight.bold,
                                            color: Colors.white,
                                            fontFamily: 'Inter',
                                            height: 1.15,
                                          ),
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                      ],
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  // ON DUTY pill
                                  Container(
                                    height: 26,
                                    padding: const EdgeInsets.symmetric(
                                        horizontal: 10),
                                    decoration: BoxDecoration(
                                      color: AppColors.dutyPillBg, // #E7F6EC
                                      borderRadius: BorderRadius.circular(13),
                                    ),
                                    child: Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        Container(
                                          width: 7,
                                          height: 7,
                                          decoration: const BoxDecoration(
                                            color: AppColors.dutyDot, // #16A34A
                                            shape: BoxShape.circle,
                                          ),
                                        ),
                                        const SizedBox(width: 6),
                                        const Text(
                                          'ON DUTY',
                                          style: TextStyle(
                                            fontSize: 11,
                                            fontWeight: FontWeight.bold,
                                            color: AppColors
                                                .dutyPillText, // #0B6B38
                                            fontFamily: 'Inter',
                                            letterSpacing: 0.3,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 12),
                              // Sub-text: Gate & Society Name (Multi-line, fully visible)
                              Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Padding(
                                    padding: EdgeInsets.only(top: 2),
                                    child: Icon(
                                      Icons.apartment_rounded,
                                      size: 15,
                                      color: AppColors.heroSubText,
                                    ),
                                  ),
                                  const SizedBox(width: 6),
                                  Expanded(
                                    child: Text(
                                      '$gateName · $societyName',
                                      style: const TextStyle(
                                        fontSize: 12.5,
                                        fontWeight: FontWeight.w500,
                                        color: AppColors.heroSubText, // #C7CBFF
                                        fontFamily: 'Inter',
                                        height: 1.35,
                                      ),
                                      maxLines: 2,
                                      softWrap: true,
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ),
                      // STATS CARD (Overlaps Hero)
                      Positioned(
                        bottom: 0,
                        left: 16,
                        right: 16,
                        child: Container(
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(20),
                            boxShadow: const [
                              BoxShadow(
                                color: Color.fromRGBO(30, 35, 90, 0.12),
                                blurRadius: 20,
                                offset: Offset(0, 6),
                              ),
                            ],
                          ),
                          child: Row(
                            children: [
                              _buildStatTile(
                                count: pendingCount,
                                label: 'Pending',
                                bg: const Color(0xFFFFF7E8),
                                border: AppColors.statPendingBorder,
                                textColor: AppColors.statPendingText,
                              ),
                              const SizedBox(width: 10),
                              _buildStatTile(
                                count: approvedCount,
                                label: 'Approved',
                                bg: AppColors.statApprovedBg,
                                border: AppColors.statApprovedBorder,
                                textColor: AppColors.statApprovedText,
                              ),
                              const SizedBox(width: 10),
                              _buildStatTile(
                                count: rejectedCount,
                                label: 'Rejected',
                                bg: AppColors.statRejectedBg,
                                border: AppColors.statRejectedBorder,
                                textColor: AppColors.statRejectedText,
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),

                  // ==========================================
                  // 3. ACTION BUTTONS (padding: 14 16 0, gap 10)
                  // ==========================================
                  Padding(
                    padding:
                        const EdgeInsets.only(top: 14, left: 16, right: 16),
                    child: Column(
                      children: [
                        // New Visitor Button
                        SizedBox(
                          width: double.infinity,
                          height: 56,
                          child: ElevatedButton(
                            onPressed: () => _startNewVisitor(context),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppColors.primary, // #3A3FB5
                              foregroundColor: Colors.white,
                              elevation: 0,
                              shadowColor: Colors.transparent,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(16),
                              ),
                              padding: EdgeInsets.zero,
                            ),
                            child: const Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(
                                  Icons.person_add_alt_1_rounded,
                                  size: 22,
                                  color: Colors.white,
                                ),
                                SizedBox(width: 8),
                                Text(
                                  'New Visitor',
                                  style: TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.w600,
                                    color: Colors.white,
                                    fontFamily: 'Inter',
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(height: 10),
                        // Verify Pass / QR Button
                        SizedBox(
                          width: double.infinity,
                          height: 52,
                          child: OutlinedButton(
                            onPressed: () {
                              showDialog(
                                context: context,
                                builder: (_) =>
                                    VerifyPassDialog(visitorRepo: visitorRepo),
                              );
                            },
                            style: OutlinedButton.styleFrom(
                              backgroundColor:
                                  AppColors.statApprovedBg, // #EAF8F0
                              foregroundColor:
                                  AppColors.statApprovedText, // #0B6B38
                              elevation: 0,
                              side: const BorderSide(
                                color: AppColors.statApprovedBorder, // #BFE8D0
                                width: 1.0,
                              ),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(16),
                              ),
                              padding: EdgeInsets.zero,
                            ),
                            child: const Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(
                                  Icons.qr_code_2_rounded,
                                  size: 22,
                                  color: AppColors.statApprovedText,
                                ),
                                SizedBox(width: 8),
                                Text(
                                  'Verify Pass / QR',
                                  style: TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.w600,
                                    color: AppColors.statApprovedText,
                                    fontFamily: 'Inter',
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),

                  // ==========================================
                  // 4. RECENT VISITORS (top padding 16)
                  // ==========================================
                  Padding(
                    padding:
                        const EdgeInsets.only(top: 16, left: 16, right: 16),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        const Text(
                          'Recent visitors',
                          style: TextStyle(
                            fontSize: 17,
                            fontWeight: FontWeight.w700,
                            color: Color(0xFF1E293B),
                            fontFamily: 'Inter',
                          ),
                        ),
                        InkWell(
                          onTap: onNavigateToVisitors,
                          borderRadius: BorderRadius.circular(16),
                          child: Container(
                            height: 32,
                            padding: const EdgeInsets.symmetric(horizontal: 12),
                            decoration: BoxDecoration(
                              color: AppColors.primaryLight, // #EEF0FF
                              borderRadius: BorderRadius.circular(16),
                            ),
                            alignment: Alignment.center,
                            child: const Text(
                              'View all',
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                                color: AppColors.primary, // #3A3FB5
                                fontFamily: 'Inter',
                              ),
                              maxLines: 1,
                              softWrap: false,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),

                  // Visitors List or Empty State
                  if (displayList.isEmpty)
                    _buildEmptyState()
                  else
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      child: Column(
                        children: [
                          for (int i = 0; i < displayList.length; i++) ...[
                            if (i > 0) const SizedBox(height: 8),
                            _buildVisitorCard(context, displayList[i]),
                          ],
                        ],
                      ),
                    ),

                  const SizedBox(height: 24),
                ],
              ),
            );
          },
        ),
      ),
    );
  }

  Widget _buildStatTile({
    required int count,
    required String label,
    required Color bg,
    required Color border,
    required Color textColor,
  }) {
    return Expanded(
      child: Container(
        height: 76,
        decoration: BoxDecoration(
          color: bg,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: border, width: 1.0),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              count.toString(),
              style: TextStyle(
                fontSize: 26,
                fontWeight: FontWeight.bold,
                color: textColor,
                fontFamily: 'Inter',
                height: 1.1,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              label,
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: textColor,
                fontFamily: 'Inter',
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.symmetric(horizontal: 16),
      padding: const EdgeInsets.symmetric(vertical: 32, horizontal: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.border, width: 1.0),
      ),
      child: const Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            Icons.people_outline_rounded,
            size: 36,
            color: Color(0xFF94A3B8),
          ),
          SizedBox(height: 8),
          Text(
            'No visitors yet',
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: AppColors.textMuted, // #4B5565
              fontFamily: 'Inter',
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildVisitorCard(BuildContext context, VisitorRequest req) {
    final timeStr = DateFormat('hh:mm a').format(req.requestTime);
    final initial = req.visitor.name.trim().isNotEmpty
        ? req.visitor.name.trim()[0].toUpperCase()
        : 'V';

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.border, width: 1.0),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(18),
          onTap: () => _onActivityTap(context, req),
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 14),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                // a) Avatar 44x44, radius 14, bg #EEF0FF, initial letter or photo
                ClipRRect(
                  borderRadius: BorderRadius.circular(14),
                  child: Container(
                    width: 44,
                    height: 44,
                    color: AppColors.primaryLight, // #EEF0FF
                    alignment: Alignment.center,
                    child: (req.visitor.photoPath != null &&
                            req.visitor.photoPath!.trim().isNotEmpty)
                        ? VisitorPhotoAvatar.buildImageWidget(
                            req.visitor.photoPath,
                            size: 44,
                          )
                        : Text(
                            initial,
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                              color: AppColors.primary, // #3A3FB5
                              fontFamily: 'Inter',
                            ),
                          ),
                  ),
                ),
                const SizedBox(width: 12),
                // b) Middle: Row 1 = Name + Status Pill; Row 2 = Flat · Type · Time
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        crossAxisAlignment: CrossAxisAlignment.center,
                        children: [
                          Expanded(
                            child: Text(
                              req.visitor.name,
                              style: const TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.w600,
                                color: Color(0xFF1E293B),
                                fontFamily: 'Inter',
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          const SizedBox(width: 8),
                          _buildStatusPill(req.status),
                        ],
                      ),
                      const SizedBox(height: 3),
                      Text(
                        'Flat ${req.flatNumber} · ${req.visitor.type.displayName} · $timeStr',
                        style: const TextStyle(
                          fontSize: 12.5,
                          fontWeight: FontWeight.w400,
                          color: Color(0xFF64748B),
                          fontFamily: 'Inter',
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
    );
  }

  Widget _buildStatusPill(VisitorStatus status) {
    final Color bg;
    final Color textColor;
    final String label;

    switch (status) {
      case VisitorStatus.rejected:
        bg = AppColors.pillRejectedBg; // #FDE8E8
        textColor = AppColors.pillRejectedText; // #A11A1A
        label = 'Rejected';
        break;
      case VisitorStatus.approved:
      case VisitorStatus.completed:
        bg = AppColors.pillApprovedBg; // #E7F6EC
        textColor = AppColors.pillApprovedText; // #0B6B38
        label = 'Approved';
        break;
      case VisitorStatus.pending:
      default:
        bg = AppColors.pillWaitingBg; // #FDE7C3
        textColor = AppColors.pillWaitingText; // #8A4B00
        label = 'Waiting';
        break;
    }

    return Container(
      height: 24,
      padding: const EdgeInsets.symmetric(horizontal: 10),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(12),
      ),
      alignment: Alignment.center,
      child: Text(
        label,
        style: TextStyle(
          fontSize: 11.5,
          fontWeight: FontWeight.w600,
          color: textColor,
          fontFamily: 'Inter',
        ),
      ),
    );
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
                      color: AppColors.border,
                      borderRadius: BorderRadius.circular(999),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(14),
                      child: Container(
                        width: 52,
                        height: 52,
                        color: AppColors.primaryLight,
                        child: (req.visitor.photoPath != null &&
                                req.visitor.photoPath!.trim().isNotEmpty)
                            ? VisitorPhotoAvatar.buildImageWidget(
                                req.visitor.photoPath,
                                size: 52,
                              )
                            : Center(
                                child: Text(
                                  req.visitor.name.isNotEmpty
                                      ? req.visitor.name[0].toUpperCase()
                                      : 'V',
                                  style: const TextStyle(
                                    fontSize: 18,
                                    fontWeight: FontWeight.bold,
                                    color: AppColors.primary,
                                    fontFamily: 'Inter',
                                  ),
                                ),
                              ),
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
                              fontWeight: FontWeight.w800,
                              color: AppColors.textPrimary,
                              fontFamily: 'Inter',
                            ),
                          ),
                          const SizedBox(height: 3),
                          Text(
                            '${req.visitor.type.displayName}${req.visitor.phoneNumber != null ? " • ${req.visitor.phoneNumber!}" : ""}',
                            style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                              color: AppColors.textMuted,
                              fontFamily: 'Inter',
                            ),
                          ),
                        ],
                      ),
                    ),
                    _buildStatusPill(req.status),
                  ],
                ),
                const SizedBox(height: 16),
                const Divider(color: AppColors.border),
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
                      backgroundColor: AppColors.pageBackground,
                      foregroundColor: AppColors.textPrimary,
                      elevation: 0,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                        side: const BorderSide(color: AppColors.border),
                      ),
                    ),
                    child: const Text(
                      'CLOSE',
                      style: TextStyle(
                        fontWeight: FontWeight.w800,
                        fontSize: 15,
                        fontFamily: 'Inter',
                      ),
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
              color: AppColors.textMuted,
              fontFamily: 'Inter',
            ),
          ),
        ),
        Expanded(
          child: Text(
            value,
            style: const TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w800,
              color: AppColors.textPrimary,
              fontFamily: 'Inter',
            ),
          ),
        ),
      ],
    );
  }
}