import 'package:flutter/material.dart';
import '../../../core/utils/date_formatter.dart';
import '../../../core/utils/haptic_helper.dart';
import '../../../models/visitor_model.dart';
import '../../../services/api_service.dart';
import '../../visitors/visitor_detail_screen.dart';

/// Recent Gate Activity Section on Dashboard matching reference design.
class RecentVisitorsSection extends StatelessWidget {
  final List<VisitorModel> visitors;
  final VoidCallback onViewAll;
  final VoidCallback onRefresh;

  const RecentVisitorsSection({
    super.key,
    required this.visitors,
    required this.onViewAll,
    required this.onRefresh,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Section Header Row
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              children: [
                Container(
                  width: 3.5,
                  height: 18,
                  decoration: BoxDecoration(
                    color: const Color(0xFF155EEF),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                const SizedBox(width: 8),
                const Text(
                  'Recent Gate Activity',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF0F172A),
                    letterSpacing: -0.3,
                  ),
                ),
              ],
            ),
            InkWell(
              onTap: () {
                HapticHelper.lightImpact();
                onViewAll();
              },
              borderRadius: BorderRadius.circular(8),
              child: const Padding(
                padding: EdgeInsets.symmetric(horizontal: 4, vertical: 4),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      'View All',
                      style: TextStyle(
                        color: Color(0xFF155EEF),
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    SizedBox(width: 4),
                    Icon(
                      Icons.arrow_forward_rounded,
                      size: 14,
                      color: Color(0xFF155EEF),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),

        if (visitors.isEmpty)
          Container(
            padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 16),
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
            alignment: Alignment.center,
            child: Column(
              children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: const Color(0xFFF1F5F9),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.history_rounded,
                    size: 22,
                    color: Color(0xFF94A3B8),
                  ),
                ),
                const SizedBox(height: 10),
                const Text(
                  'No recent gate activity',
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF0F172A),
                  ),
                ),
                const SizedBox(height: 3),
                const Text(
                  'Visitor entries will appear here in real-time.',
                  style: TextStyle(
                    fontSize: 12,
                    color: Color(0xFF64748B),
                  ),
                ),
              ],
            ),
          )
        else
          ListView.separated(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: visitors.length > 3 ? 3 : visitors.length,
            separatorBuilder: (ctx, index) => const SizedBox(height: 10),
            itemBuilder: (context, index) {
              return _buildVisitorCard(context, visitors[index]);
            },
          ),
      ],
    );
  }

  Widget _buildVisitorCard(BuildContext context, VisitorModel visitor) {
    final photoUrl = ApiService.getSecurePhotoUrl(visitor.photoUrl);

    return InkWell(
      onTap: () {
        HapticHelper.lightImpact();
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (_) => VisitorDetailScreen(visitorId: visitor.id),
          ),
        ).then((_) => onRefresh());
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

    if (s == 'APPROVED' || s == 'ALLOWED') {
      bg = const Color(0xFFE8F8EE);
      text = const Color(0xFF16A34A);
      icon = Icons.check_circle_rounded;
      label = 'Approved';
    } else if (s == 'PENDING') {
      bg = const Color(0xFFEFF6FF);
      text = const Color(0xFF2563EB);
      icon = Icons.access_time_rounded;
      label = 'Pending';
    } else {
      bg = const Color(0xFFFEE2E2);
      text = const Color(0xFFDC2626);
      icon = Icons.cancel_rounded;
      label = 'Rejected';
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
