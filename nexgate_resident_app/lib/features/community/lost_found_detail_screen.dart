import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_dimensions.dart';
import '../../core/utils/date_formatter.dart';
import '../../core/utils/haptic_helper.dart';
import '../../core/widgets/confirmation_dialog.dart';
import '../../core/widgets/custom_app_bar.dart';
import '../../core/widgets/primary_button.dart';
import '../../core/widgets/secondary_button.dart';
import '../../models/lost_found_model.dart';
import '../../services/api_service.dart';
import '../../services/auth_service.dart';
import '../../services/dialer_service.dart';

class LostFoundDetailScreen extends StatefulWidget {
  final LostFoundModel item;

  const LostFoundDetailScreen({super.key, required this.item});

  @override
  State<LostFoundDetailScreen> createState() => _LostFoundDetailScreenState();
}

class _LostFoundDetailScreenState extends State<LostFoundDetailScreen> {
  late LostFoundModel _item;
  bool _isActing = false;

  @override
  void initState() {
    super.initState();
    _item = widget.item;
  }

  bool get _isAuthor {
    final currentUserId = AuthService.currentUser.value?.id;
    return currentUserId != null && currentUserId == _item.authorId;
  }

  Future<void> _handleMarkResolved() async {
    HapticHelper.mediumImpact();
    setState(() => _isActing = true);

    try {
      await ApiService.updateLostFoundStatus(_item.id, 'RESOLVED');
      if (!mounted) return;
      HapticHelper.success();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Item marked as Resolved'),
          backgroundColor: AppColors.success,
        ),
      );
      Navigator.of(context).pop(true);
    } catch (e) {
      if (!mounted) return;
      HapticHelper.error();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Failed to update status: $e'),
          backgroundColor: AppColors.error,
        ),
      );
      setState(() => _isActing = false);
    }
  }

  Future<void> _handleDelete() async {
    final confirmed = await ConfirmationDialog.show(
      context,
      title: 'Delete Post?',
      message: 'Are you sure you want to delete this ${_item.type.toLowerCase()} item post? This action cannot be undone.',
      confirmLabel: 'Delete',
      isDestructive: true,
    );

    if (confirmed != true) return;

    HapticHelper.mediumImpact();
    setState(() => _isActing = true);

    try {
      await ApiService.deleteLostFoundItem(_item.id);
      if (!mounted) return;
      HapticHelper.success();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Post deleted successfully'),
          backgroundColor: AppColors.success,
        ),
      );
      Navigator.of(context).pop(true);
    } catch (e) {
      if (!mounted) return;
      HapticHelper.error();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Failed to delete post: $e'),
          backgroundColor: AppColors.error,
        ),
      );
      setState(() => _isActing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isLost = _item.isLost;
    final badgeColor = isLost ? const Color(0xFFDC2626) : const Color(0xFF16A34A);
    final badgeBg = isLost ? const Color(0xFFFEE2E2) : const Color(0xFFDCFCE7);

    return Scaffold(
      backgroundColor: AppColors.mainBackground,
      appBar: CustomAppBar(
        title: _item.title,
        showBack: true,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Photo Preview if available
            if (_item.imageUrl != null && _item.imageUrl!.isNotEmpty) ...[
              ClipRRect(
                borderRadius: BorderRadius.circular(16),
                child: Image.network(
                  _item.imageUrl!,
                  height: 220,
                  width: double.infinity,
                  fit: BoxFit.cover,
                  errorBuilder: (context, error, stackTrace) => Container(
                    height: 120,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: AppColors.border),
                    ),
                    child: const Center(
                      child: Icon(Icons.broken_image_rounded, size: 40, color: AppColors.mutedText),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 16),
            ],

            // Main Info Card
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: AppColors.border),
                boxShadow: AppDimensions.subtleShadow,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Type and Status Pills
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: badgeBg,
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          _item.type,
                          style: TextStyle(
                            color: badgeColor,
                            fontSize: 11,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: _item.isResolved ? const Color(0xFFDCFCE7) : const Color(0xFFFEF3C7),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          _item.status,
                          style: TextStyle(
                            color: _item.isResolved ? const Color(0xFF16A34A) : const Color(0xFFD97706),
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                      const Spacer(),
                      Text(
                        DateFormatter.formatRelative(_item.createdAt),
                        style: const TextStyle(fontSize: 12, color: AppColors.mutedText),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  // Title
                  Text(
                    _item.title,
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                      color: AppColors.primaryText,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    _item.category,
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: AppColors.primaryBlue,
                    ),
                  ),
                  const SizedBox(height: 14),
                  const Divider(height: 1, color: AppColors.borderLight),
                  const SizedBox(height: 14),

                  // Location and Date
                  _buildDetailMetaRow(Icons.location_on_outlined, 'Location', _item.location),
                  const SizedBox(height: 10),
                  _buildDetailMetaRow(
                    Icons.calendar_today_rounded,
                    'Incident Date',
                    '${_item.incidentDate.day}/${_item.incidentDate.month}/${_item.incidentDate.year}',
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Description Box
            const Text(
              'Detailed Description',
              style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: AppColors.primaryText),
            ),
            const SizedBox(height: 8),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.border),
              ),
              child: Text(
                _item.description,
                style: const TextStyle(
                  fontSize: 14,
                  color: AppColors.secondaryText,
                  height: 1.5,
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Posted By Card
            const Text(
              'Posted By Resident',
              style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: AppColors.primaryText),
            ),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.border),
              ),
              child: Row(
                children: [
                  CircleAvatar(
                    radius: 20,
                    backgroundColor: AppColors.primaryBlue.withValues(alpha: 0.12),
                    child: Text(
                      _item.authorName.isNotEmpty ? _item.authorName[0].toUpperCase() : 'R',
                      style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: AppColors.primaryBlue),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _item.authorName,
                          style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.primaryText),
                        ),
                        Text(
                          _item.authorFlat,
                          style: const TextStyle(fontSize: 12, color: AppColors.secondaryText),
                        ),
                      ],
                    ),
                  ),
                  if (_item.authorPhone != null && _item.authorPhone!.isNotEmpty && !_isAuthor)
                    ElevatedButton.icon(
                      onPressed: () {
                        HapticHelper.mediumImpact();
                        DialerService.openDialer(_item.authorPhone, context: context);
                      },
                      icon: const Icon(Icons.phone_rounded, size: 14, color: Colors.white),
                      label: const Text('Call', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.white)),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF0F172A),
                        foregroundColor: Colors.white,
                        elevation: 0,
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                    ),
                ],
              ),
            ),
            const SizedBox(height: 28),

            // Owner Action Buttons
            if (_isAuthor) ...[
              if (!_item.isResolved) ...[
                PrimaryButton(
                  label: 'Mark as Resolved',
                  icon: Icons.check_circle_rounded,
                  isLoading: _isActing,
                  onPressed: _handleMarkResolved,
                ),
                const SizedBox(height: 12),
              ],
              SecondaryButton(
                label: 'Delete Post',
                icon: Icons.delete_outline_rounded,
                textColor: AppColors.error, borderColor: AppColors.error,
                onPressed: _handleDelete,
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildDetailMetaRow(IconData icon, String title, String value) {
    return Row(
      children: [
        Icon(icon, size: 18, color: AppColors.primaryBlue),
        const SizedBox(width: 10),
        Text(
          '$title: ',
          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.secondaryText),
        ),
        Expanded(
          child: Text(
            value,
            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.primaryText),
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }
}
