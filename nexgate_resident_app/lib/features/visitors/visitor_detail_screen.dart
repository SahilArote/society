import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_dimensions.dart';
import '../../core/constants/app_typography.dart';
import '../../core/utils/date_formatter.dart';
import '../../core/utils/haptic_helper.dart';
import '../../core/widgets/confirmation_dialog.dart';
import '../../core/widgets/custom_app_bar.dart';
import '../../core/widgets/primary_button.dart';
import '../../core/widgets/secondary_button.dart';
import '../../core/widgets/status_badge.dart';
import '../../models/visitor_model.dart';
import '../../services/api_service.dart';

/// Detailed view of a visitor request with step-by-step gate timeline audit trail.
class VisitorDetailScreen extends StatefulWidget {
  final String visitorId;

  const VisitorDetailScreen({super.key, required this.visitorId});

  @override
  State<VisitorDetailScreen> createState() => _VisitorDetailScreenState();
}

class _VisitorDetailScreenState extends State<VisitorDetailScreen> {
  VisitorModel? _visitor;
  bool _isLoading = true;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _loadVisitor();
  }

  Future<void> _loadVisitor() async {
    setState(() => _isLoading = true);
    try {
      final v = await ApiService.fetchVisitorRequestById(widget.visitorId);
      if (!mounted) return;
      setState(() {
        _visitor = v;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _errorMessage = e.toString();
      });
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _handleAllow() async {
    if (_visitor == null) return;
    HapticHelper.success();
    try {
      await ApiService.approveVisitorRequest(_visitor!.id);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Visitor pass approved successfully'),
          backgroundColor: AppColors.success,
        ),
      );
      _loadVisitor();
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to approve: $e')),
      );
    }
  }

  Future<void> _handleDeny() async {
    if (_visitor == null) return;
    final confirmed = await ConfirmationDialog.show(
      context,
      title: 'Deny Visitor Entry',
      message: 'Are you sure you want to deny access to ${_visitor!.name}?',
      confirmLabel: 'Deny Entry',
      isDestructive: true,
      icon: Icons.block_rounded,
    );

    if (confirmed == true) {
      HapticHelper.error();
      try {
        await ApiService.rejectVisitorRequest(_visitor!.id, reason: 'Denied by resident');
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Visitor access denied'),
            backgroundColor: AppColors.error,
          ),
        );
        _loadVisitor();
      } catch (e) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to deny: $e')),
        );
      }
    }
  }

  void _showFullPhoto(String photoUrl) {
    showDialog(
      context: context,
      builder: (ctx) => Dialog(
        backgroundColor: Colors.transparent,
        insetPadding: const EdgeInsets.all(16),
        child: Stack(
          alignment: Alignment.center,
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(16),
              child: Image.network(
                photoUrl,
                fit: BoxFit.contain,
              ),
            ),
            Positioned(
              top: 8,
              right: 8,
              child: IconButton(
                icon: const Icon(Icons.close_rounded, color: Colors.white, size: 28),
                onPressed: () => Navigator.of(ctx).pop(),
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(
        appBar: CustomAppBar(title: 'Visitor Record', showBack: true),
        body: Center(child: CircularProgressIndicator()),
      );
    }

    if (_visitor == null || _errorMessage != null) {
      return Scaffold(
        appBar: const CustomAppBar(title: 'Visitor Record', showBack: true),
        body: Center(
          child: Text(_errorMessage ?? 'Visitor record not found'),
        ),
      );
    }

    final v = _visitor!;
    final photoUrl = ApiService.getSecurePhotoUrl(v.photoUrl);

    return Scaffold(
      backgroundColor: AppColors.mainBackground,
      appBar: CustomAppBar(
        title: 'Visitor Details',
        showBack: true,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: _loadVisitor,
          ),
        ],
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 14.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Hero Profile Card
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: AppDimensions.roundedLarge,
                  border: Border.all(color: AppColors.border),
                  boxShadow: AppDimensions.subtleShadow,
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Visitor Photo with Zoom badge
                    GestureDetector(
                      onTap: photoUrl.isNotEmpty ? () => _showFullPhoto(photoUrl) : null,
                      child: Stack(
                        children: [
                          Container(
                            width: 72,
                            height: 72,
                            decoration: BoxDecoration(
                              color: AppColors.lightBlue,
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(color: AppColors.border),
                            ),
                            child: ClipRRect(
                              borderRadius: BorderRadius.circular(15),
                              child: photoUrl.isNotEmpty
                                  ? Image.network(
                                      photoUrl,
                                      fit: BoxFit.cover,
                                      errorBuilder: (ctx, err, stack) => const Icon(
                                        Icons.person_rounded,
                                        size: 40,
                                        color: AppColors.primaryBlue,
                                      ),
                                    )
                                  : const Icon(
                                      Icons.person_rounded,
                                      size: 40,
                                      color: AppColors.primaryBlue,
                                    ),
                            ),
                          ),
                          if (photoUrl.isNotEmpty)
                            Positioned(
                              bottom: 4,
                              right: 4,
                              child: Container(
                                padding: const EdgeInsets.all(3),
                                decoration: const BoxDecoration(
                                  color: Colors.black54,
                                  shape: BoxShape.circle,
                                ),
                                child: const Icon(Icons.zoom_in, color: Colors.white, size: 12),
                              ),
                            ),
                        ],
                      ),
                    ),

                    const SizedBox(width: 14),

                    // Name, Purpose, Status Badge
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Expanded(
                                child: Text(
                                  v.name,
                                  style: AppTypography.titleLarge.copyWith(
                                    fontWeight: FontWeight.w800,
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                              StatusBadge.fromStatus(v.status),
                            ],
                          ),
                          const SizedBox(height: 4),
                          Text(
                            v.purpose.toUpperCase(),
                            style: AppTypography.caption.copyWith(
                              color: AppColors.primaryBlue,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          if (v.deliveryCompany != null && v.deliveryCompany!.isNotEmpty) ...[
                            const SizedBox(height: 2),
                            Text(
                              'Company: ${v.deliveryCompany!}',
                              style: AppTypography.caption.copyWith(
                                color: AppColors.secondaryText,
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 16),

              // Visit Information Grid
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: AppDimensions.roundedLarge,
                  border: Border.all(color: AppColors.border),
                  boxShadow: AppDimensions.subtleShadow,
                ),
                child: Column(
                  children: [
                    _buildInfoRow(Icons.apartment_rounded, 'Destination Unit', 'Flat ${v.flatNumber}'),
                    const Divider(height: 20),
                    _buildInfoRow(Icons.meeting_room_rounded, 'Entry Gate', v.gate),
                    if (v.vehicleNumber != null && v.vehicleNumber!.isNotEmpty) ...[
                      const Divider(height: 20),
                      _buildInfoRow(Icons.directions_car_rounded, 'Vehicle Number', v.vehicleNumber!),
                    ],
                    if (v.phone != null && v.phone!.isNotEmpty) ...[
                      const Divider(height: 20),
                      _buildInfoRow(Icons.phone_rounded, 'Visitor Phone', v.phone!),
                    ],
                    if (v.notes != null && v.notes!.isNotEmpty) ...[
                      const Divider(height: 20),
                      _buildInfoRow(Icons.notes_rounded, 'Guard Notes', v.notes!),
                    ],
                  ],
                ),
              ),

              const SizedBox(height: 20),

              // Step-by-Step Gate Audit Timeline
              Text('GATE AUDIT TIMELINE', style: AppTypography.sectionHeader),
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: AppDimensions.roundedLarge,
                  border: Border.all(color: AppColors.border),
                  boxShadow: AppDimensions.subtleShadow,
                ),
                child: Column(
                  children: [
                    _buildTimelineItem(
                      title: 'Gate Entry Initiated',
                      subtitle: 'Visitor arrived at ${v.gate} and was logged by security.',
                      time: DateFormatter.formatDateTime(v.requestedAt),
                      isCompleted: true,
                      isFirst: true,
                    ),
                    _buildTimelineItem(
                      title: v.isApproved
                          ? 'Approved by Resident'
                          : v.isRejected
                              ? 'Denied by Resident'
                              : 'Awaiting Resident Approval',
                      subtitle: v.isApproved
                          ? 'Entry permission granted via mobile app.'
                          : v.isRejected
                              ? (v.rejectionReason ?? 'Entry denied by flat resident.')
                              : 'Waiting for response.',
                      time: v.respondedAt != null ? DateFormatter.formatDateTime(v.respondedAt) : 'Pending',
                      isCompleted: v.isApproved || v.isRejected,
                      isDestructive: v.isRejected,
                    ),
                    _buildTimelineItem(
                      title: 'Campus Arrival',
                      subtitle: v.isEntered
                          ? 'Visitor checked in through barrier gate.'
                          : 'Pending gate clearance.',
                      time: v.isEntered ? 'Inside' : '',
                      isCompleted: v.isEntered || v.isExited,
                    ),
                    _buildTimelineItem(
                      title: 'Exit Completed',
                      subtitle: v.isExited
                          ? 'Visitor departure logged at security barrier.'
                          : 'Departure not yet logged.',
                      time: v.isExited ? 'Exited' : '',
                      isCompleted: v.isExited,
                      isLast: true,
                    ),
                  ],
                ),
              ),

              // Action buttons if pending
              if (v.isPending) ...[
                const SizedBox(height: 24),
                Row(
                  children: [
                    Expanded(
                      child: SecondaryButton(
                        label: 'Deny Entry',
                        borderColor: AppColors.errorBorder,
                        textColor: AppColors.error,
                        backgroundColor: AppColors.errorBackground,
                        onPressed: _handleDeny,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: PrimaryButton(
                        label: 'Allow Entry',
                        backgroundColor: AppColors.success,
                        icon: Icons.check_circle_rounded,
                        onPressed: _handleAllow,
                      ),
                    ),
                  ],
                ),
              ],

              const SizedBox(height: 32),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildInfoRow(IconData icon, String label, String value) {
    return Row(
      children: [
        Icon(icon, size: 18, color: AppColors.secondaryText),
        const SizedBox(width: 10),
        Text(label, style: AppTypography.caption),
        const Spacer(),
        Text(value, style: AppTypography.bodySmall.copyWith(fontWeight: FontWeight.w700)),
      ],
    );
  }

  Widget _buildTimelineItem({
    required String title,
    required String subtitle,
    required String time,
    required bool isCompleted,
    bool isFirst = false,
    bool isLast = false,
    bool isDestructive = false,
  }) {
    final dotColor = isDestructive
        ? AppColors.error
        : isCompleted
            ? AppColors.success
            : AppColors.border;

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Column(
          children: [
            Container(
              width: 12,
              height: 12,
              decoration: BoxDecoration(
                color: dotColor,
                shape: BoxShape.circle,
              ),
            ),
            if (!isLast)
              Container(
                width: 2,
                height: 48,
                color: isCompleted ? AppColors.successBorder : AppColors.border,
              ),
          ],
        ),
        const SizedBox(width: 14),
        Expanded(
          child: Padding(
            padding: const EdgeInsets.only(bottom: 12.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      title,
                      style: AppTypography.bodySmall.copyWith(
                        fontWeight: FontWeight.w700,
                        color: isDestructive ? AppColors.error : AppColors.primaryText,
                      ),
                    ),
                    if (time.isNotEmpty)
                      Text(
                        time,
                        style: AppTypography.caption.copyWith(fontSize: 10),
                      ),
                  ],
                ),
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  style: AppTypography.caption.copyWith(color: AppColors.secondaryText),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
