import 'package:flutter/material.dart';
import '../../../core/utils/date_formatter.dart';
import '../../../core/utils/haptic_helper.dart';
import '../../../models/visitor_model.dart';
import '../../../services/api_service.dart';
import '../visitor_detail_screen.dart';

/// Reusable Visitor Card for listings and activity feeds matching reference design.
class VisitorCard extends StatelessWidget {
  final VisitorModel visitor;
  final VoidCallback? onDecisionUpdated;

  const VisitorCard({
    super.key,
    required this.visitor,
    this.onDecisionUpdated,
  });

  @override
  Widget build(BuildContext context) {
    final photoUrl = ApiService.getSecurePhotoUrl(visitor.photoUrl);

    return InkWell(
      onTap: () {
        HapticHelper.lightImpact();
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (_) => VisitorDetailScreen(visitorId: visitor.id),
          ),
        ).then((_) {
          if (onDecisionUpdated != null) {
            onDecisionUpdated!();
          }
        });
      },
      borderRadius: BorderRadius.circular(20),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: const Color(0xFFF1F5F9), width: 1.2),
          boxShadow: [
            BoxShadow(
              color: const Color(0xFF0F172A).withValues(alpha: 0.04),
              blurRadius: 14,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Row(
          children: [
            // Circular Visitor Avatar
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: const Color(0xFFE2E8F0),
                border: Border.all(color: const Color(0xFFE2E8F0), width: 1),
              ),
              child: ClipOval(
                child: photoUrl.isNotEmpty
                    ? Image.network(
                        photoUrl,
                        headers: ApiService.getAuthHeaders(),
                        fit: BoxFit.cover,
                        errorBuilder: (ctx, err, stack) => _buildFallbackAvatar(visitor.name),
                      )
                    : _buildFallbackAvatar(visitor.name),
              ),
            ),
            const SizedBox(width: 12),

            // Visitor Information
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    visitor.name,
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                      color: Color(0xFF0F172A),
                      letterSpacing: -0.2,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Icon(
                        _getPurposeIcon(visitor.purpose),
                        size: 13,
                        color: const Color(0xFF64748B),
                      ),
                      const SizedBox(width: 4),
                      Text(
                        _formatPurpose(visitor.purpose),
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                          color: Color(0xFF64748B),
                        ),
                      ),
                      if (visitor.deliveryCompany != null &&
                          visitor.deliveryCompany!.isNotEmpty) ...[
                        Text(
                          ' (${visitor.deliveryCompany!})',
                          style: const TextStyle(
                            fontSize: 11,
                            color: Color(0xFF94A3B8),
                          ),
                        ),
                      ],
                      const Text(
                        ' • ',
                        style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
                      ),
                      Expanded(
                        child: Text(
                          DateFormatter.formatRelative(visitor.requestedAt),
                          style: const TextStyle(
                            fontSize: 12,
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

            // Status Badge
            _buildStatusBadge(visitor.status),
            const SizedBox(width: 4),

            // Chevron Right
            const Icon(
              Icons.chevron_right_rounded,
              size: 20,
              color: Color(0xFF94A3B8),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFallbackAvatar(String name) {
    final initial = name.isNotEmpty ? name[0].toUpperCase() : 'V';
    return Container(
      color: const Color(0xFFE0EDFF),
      child: Center(
        child: Text(
          initial,
          style: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w700,
            color: Color(0xFF155EEF),
          ),
        ),
      ),
    );
  }

  IconData _getPurposeIcon(String purpose) {
    final lower = purpose.toLowerCase();
    if (lower.contains('delivery')) return Icons.inventory_2_outlined;
    if (lower.contains('meeting')) return Icons.calendar_today_outlined;
    if (lower.contains('cab') || lower.contains('ride')) return Icons.directions_car_outlined;
    if (lower.contains('service') || lower.contains('repair')) return Icons.build_outlined;
    return Icons.work_outline_rounded;
  }

  String _formatPurpose(String raw) {
    if (raw.isEmpty) return 'Guest';
    final lower = raw.toLowerCase();
    if (lower.contains('delivery')) return 'Delivery';
    if (lower.contains('meeting')) return 'Meeting';
    if (lower.contains('personal')) return 'Personal Visit';
    if (lower.contains('service')) return 'Service Visit';
    return raw[0].toUpperCase() + raw.substring(1);
  }

  Widget _buildStatusBadge(String status) {
    final s = status.toUpperCase();
    Color bg;
    Color text;
    IconData icon;
    String label;

    if (s == 'INSIDE' || s == 'ENTERED') {
      bg = const Color(0xFFE0F2FE);
      text = const Color(0xFF0284C7);
      icon = Icons.meeting_room_rounded;
      label = 'Inside';
    } else if (s == 'EXITED' || s == 'LEFT' || s == 'COMPLETED') {
      bg = const Color(0xFFF1F5F9);
      text = const Color(0xFF64748B);
      icon = Icons.logout_rounded;
      label = 'Exited';
    } else if (s == 'APPROVED' || s == 'ALLOWED') {
      bg = const Color(0xFFE8F8EE);
      text = const Color(0xFF16A34A);
      icon = Icons.check_circle_rounded;
      label = 'Approved';
    } else if (s == 'PENDING') {
      bg = const Color(0xFFEFF6FF);
      text = const Color(0xFF2563EB);
      icon = Icons.access_time_rounded;
      label = 'Pending';
    } else if (s == 'REJECTED' || s == 'DENIED') {
      bg = const Color(0xFFFEE2E2);
      text = const Color(0xFFDC2626);
      icon = Icons.cancel_rounded;
      label = 'Rejected';
    } else {
      bg = const Color(0xFFF1F5F9);
      text = const Color(0xFF475569);
      icon = Icons.info_outline_rounded;
      label = status;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: text),
          const SizedBox(width: 5),
          Text(
            label,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: text,
            ),
          ),
        ],
      ),
    );
  }
}
