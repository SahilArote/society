import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_dimensions.dart';
import '../../core/constants/app_typography.dart';
import '../../core/utils/date_formatter.dart';
import '../../core/widgets/custom_app_bar.dart';
import '../../core/widgets/empty_state_widget.dart';
import '../../core/widgets/loading_skeleton.dart';
import '../../models/notification_model.dart';
import '../../services/api_service.dart';
import '../visitors/visitor_detail_screen.dart';

/// Notifications & Announcements hub screen.
class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  List<NotificationModel> _notifications = [];
  bool _isLoading = true;
  String _activeCategory = 'all';

  final List<Map<String, String>> _categories = const [
    {'id': 'all', 'label': 'All Alerts'},
    {'id': 'visitor', 'label': 'Gate Alerts'},
    {'id': 'security', 'label': 'Security'},
    {'id': 'society', 'label': 'Notices'},
  ];

  @override
  void initState() {
    super.initState();
    _loadNotifications();
  }

  Future<void> _loadNotifications() async {
    setState(() => _isLoading = true);
    try {
      final list = await ApiService.fetchNotifications();
      if (!mounted) return;
      setState(() {
        _notifications = list;
      });
    } catch (e) {
      debugPrint('[Notifications] Error: $e');
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  void _markAllRead() {
    setState(() {
      _notifications = _notifications.map((n) => n.copyWith(read: true)).toList();
    });
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('All notifications marked as read')),
    );
  }

  List<NotificationModel> get _filteredList {
    if (_activeCategory == 'all') return _notifications;
    return _notifications
        .where((n) => n.type.toLowerCase() == _activeCategory)
        .toList();
  }

  IconData _getCategoryIcon(String type) {
    switch (type.toLowerCase()) {
      case 'visitor':
        return Icons.doorbell_rounded;
      case 'security':
        return Icons.security_rounded;
      case 'society':
        return Icons.campaign_rounded;
      default:
        return Icons.notifications_rounded;
    }
  }

  Color _getCategoryColor(String type) {
    switch (type.toLowerCase()) {
      case 'visitor':
        return AppColors.primaryBlue;
      case 'security':
        return AppColors.error;
      case 'society':
        return AppColors.deepPurple;
      default:
        return AppColors.secondaryText;
    }
  }

  @override
  Widget build(BuildContext context) {
    final list = _filteredList;
    final unreadCount = _notifications.where((n) => !n.read).length;

    return Scaffold(
      backgroundColor: AppColors.mainBackground,
      appBar: CustomAppBar(
        title: 'Notifications',
        subtitle: unreadCount > 0 ? '$unreadCount unread' : 'All caught up',
        actions: [
          if (unreadCount > 0)
            TextButton(
              onPressed: _markAllRead,
              child: Text(
                'Mark All Read',
                style: AppTypography.button.copyWith(
                  color: AppColors.primaryBlue,
                  fontSize: 12,
                ),
              ),
            ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Category Filter Chips
            Container(
              color: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 10.0),
              child: SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: _categories.map((c) {
                    final isSelected = _activeCategory == c['id'];
                    return Padding(
                      padding: const EdgeInsets.only(right: 8.0),
                      child: ChoiceChip(
                        label: Text(c['label']!),
                        selected: isSelected,
                        selectedColor: AppColors.primaryBlue,
                        labelStyle: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          color: isSelected ? Colors.white : AppColors.primaryText,
                        ),
                        onSelected: (_) {
                          setState(() => _activeCategory = c['id']!);
                        },
                      ),
                    );
                  }).toList(),
                ),
              ),
            ),

            // Notifications List
            Expanded(
              child: RefreshIndicator(
                onRefresh: _loadNotifications,
                color: AppColors.primaryBlue,
                child: _isLoading
                    ? ListView.separated(
                        padding: const EdgeInsets.all(16),
                        itemCount: 4,
                        separatorBuilder: (ctx, index) => const SizedBox(height: 10),
                        itemBuilder: (ctx, index) => LoadingSkeleton(
                          width: double.infinity,
                          height: 70,
                          borderRadius: AppDimensions.roundedLarge,
                        ),
                      )
                    : list.isEmpty
                        ? ListView(
                            children: const [
                              SizedBox(height: 60),
                              EmptyStateWidget(
                                icon: Icons.notifications_none_rounded,
                                title: 'No notifications',
                                description:
                                    'When visitors arrive or notices are posted, you will receive alerts here.',
                              ),
                            ],
                          )
                        : ListView.separated(
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                            itemCount: list.length,
                            separatorBuilder: (ctx, index) => const SizedBox(height: 10),
                            itemBuilder: (context, index) {
                              final notif = list[index];
                              final iconColor = _getCategoryColor(notif.type);

                              return InkWell(
                                onTap: () {
                                  // Mark read
                                  setState(() {
                                    _notifications = _notifications.map((n) {
                                      return n.id == notif.id ? n.copyWith(read: true) : n;
                                    }).toList();
                                  });

                                  if (notif.relatedEntityId != null &&
                                      notif.relatedEntityId!.isNotEmpty) {
                                    Navigator.of(context).push(
                                      MaterialPageRoute(
                                        builder: (_) => VisitorDetailScreen(
                                          visitorId: notif.relatedEntityId!,
                                        ),
                                      ),
                                    );
                                  }
                                },
                                borderRadius: AppDimensions.roundedLarge,
                                child: Container(
                                  padding: const EdgeInsets.all(14),
                                  decoration: BoxDecoration(
                                    color: notif.read ? Colors.white : const Color(0xFFF0FDF4),
                                    borderRadius: AppDimensions.roundedLarge,
                                    border: Border.all(
                                      color: notif.read ? AppColors.border : const Color(0xFFBBF7D0),
                                    ),
                                    boxShadow: AppDimensions.subtleShadow,
                                  ),
                                  child: Row(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Container(
                                        width: 38,
                                        height: 38,
                                        decoration: BoxDecoration(
                                          color: iconColor.withValues(alpha: 0.1),
                                          borderRadius: BorderRadius.circular(10),
                                        ),
                                        child: Icon(
                                          _getCategoryIcon(notif.type),
                                          color: iconColor,
                                          size: 20,
                                        ),
                                      ),
                                      const SizedBox(width: 12),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Row(
                                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                              children: [
                                                Expanded(
                                                  child: Text(
                                                    notif.title,
                                                    style: AppTypography.titleSmall.copyWith(
                                                      fontWeight: notif.read
                                                          ? FontWeight.w600
                                                          : FontWeight.w800,
                                                    ),
                                                  ),
                                                ),
                                                Text(
                                                  DateFormatter.formatRelative(notif.timestamp),
                                                  style: AppTypography.caption.copyWith(fontSize: 10),
                                                ),
                                              ],
                                            ),
                                            const SizedBox(height: 4),
                                            Text(
                                              notif.message,
                                              style: AppTypography.bodySmall.copyWith(
                                                color: AppColors.secondaryText,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              );
                            },
                          ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
