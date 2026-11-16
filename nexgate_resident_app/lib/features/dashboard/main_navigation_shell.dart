import 'dart:async';
import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../core/utils/haptic_helper.dart';
import '../../models/visitor_model.dart';
import '../../services/api_service.dart';
import '../../services/notification_service.dart';
import '../../services/socket_service.dart';
import '../community/community_screen.dart';
import '../profile/profile_screen.dart';
import '../services/services_screen.dart';
import '../visitors/visitor_detail_screen.dart';
import '../visitors/visitors_hub_screen.dart';
import '../visitors/widgets/visitor_decision_bottom_sheet.dart';
import 'home_dashboard_screen.dart';

/// Root navigation shell with 4-tab bottom navigation and global socket alert handling.
class MainNavigationShell extends StatefulWidget {
  final int initialTab;

  const MainNavigationShell({super.key, this.initialTab = 0});

  @override
  State<MainNavigationShell> createState() => _MainNavigationShellState();
}

class _MainNavigationShellState extends State<MainNavigationShell> with WidgetsBindingObserver {
  late int _currentIndex;
  StreamSubscription<VisitorModel>? _globalVisitorSub;
  StreamSubscription<Map<String, dynamic>>? _globalVisitorUpdatedSub;
  final Set<String> _activePopupRequestIds = {};

  @override
  void initState() {
    super.initState();
    _currentIndex = widget.initialTab;
    WidgetsBinding.instance.addObserver(this);

    // Connect socket if not already connected
    SocketService.connect();

    // Setup notification tap handler
    NotificationService.onNotificationTapped = (requestId) {
      if (mounted) {
        debugPrint('[NOTIFICATION] Notification clicked with requestId: $requestId');
        _handleNotificationTap(requestId ?? '');
      }
    };

    // Global listener for incoming gate arrivals
    _globalVisitorSub = SocketService.onVisitorCreated.listen((visitor) {
      if (!mounted) return;
      if (!visitor.isPending) {
        debugPrint('[UI] New visitor already has status: ${visitor.status}, skipping popup');
        return;
      }
      debugPrint('[UI] Checking visitor popup for: ${visitor.name} (${visitor.id})');
      _showDecisionPopup(visitor);
    });

    // Global listener for status changes (e.g. guard approved visitor at gate)
    _globalVisitorUpdatedSub = SocketService.onVisitorUpdated.listen((data) {
      if (!mounted) return;
      final reqId = data['requestId']?.toString() ?? data['id']?.toString() ?? data['_id']?.toString();
      final status = (data['status'] ?? '').toString().toUpperCase();

      if (reqId != null && status.isNotEmpty && status != 'PENDING') {
        // If popup is currently open for this visitor and guard approved/denied it, close the popup immediately!
        if (_activePopupRequestIds.contains(reqId)) {
          debugPrint('[UI] Visitor $reqId status changed to $status by guard, auto-closing popup');
          _activePopupRequestIds.remove(reqId);
          Navigator.of(context, rootNavigator: true).maybePop();
        }
      }
    });
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      debugPrint('[LIFECYCLE] Resident App resumed - checking socket & syncing state');
      SocketService.reconnectIfNeeded();
      _syncPendingRequests();
    }
  }

  Future<void> _syncPendingRequests() async {
    try {
      final all = await ApiService.fetchVisitorRequests();
      final pending = all.where((v) => v.isPending).toList();
      if (pending.isNotEmpty && _activePopupRequestIds.isEmpty && mounted) {
        debugPrint('[SYNC] Auto-displaying pending visitor request on resume: ${pending.first.id}');
        _showDecisionPopup(pending.first);
      }
    } catch (e) {
      debugPrint('[SYNC] Error syncing pending requests on resume: $e');
    }
  }

  Future<void> _handleNotificationTap(String requestId) async {
    try {
      final all = await ApiService.fetchVisitorRequests();
      if (all.isEmpty) return;
      final target = all.firstWhere(
        (v) => v.id == requestId,
        orElse: () => all.firstWhere((v) => v.isPending, orElse: () => all.first),
      );
      if (!mounted) return;
      if (target.isPending) {
        _showDecisionPopup(target);
      } else {
        // If already approved (by guard or resident), navigate to details screen
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (_) => VisitorDetailScreen(visitorId: target.id),
          ),
        );
      }
    } catch (e) {
      debugPrint('[NOTIFICATION] Error resolving tapped visitor request: $e');
    }
  }

  Future<void> _showDecisionPopup(VisitorModel visitor) async {
    // Condition 1: Check if visitor is not pending (e.g. guard approved)
    if (!visitor.isPending) {
      debugPrint('[UI] Visitor is not pending (${visitor.status}), skipping popup');
      return;
    }

    // Duplicate Protection: Avoid displaying duplicate popups for the same request
    if (_activePopupRequestIds.contains(visitor.id)) {
      debugPrint('[UI] Popup for request ${visitor.id} already active, skipping duplicate');
      return;
    }

    // Condition 2: Check latest status from backend before showing popup
    try {
      final latest = await ApiService.fetchVisitorRequestById(visitor.id);
      if (latest != null && !latest.isPending) {
        debugPrint('[UI] Visitor is already resolved on server (${latest.status}), skipping popup');
        return;
      }
    } catch (e) {
      debugPrint('[UI] Error verifying latest visitor status: $e');
    }

    if (!mounted) return;

    _activePopupRequestIds.add(visitor.id);
    HapticHelper.heavyImpact();

    await VisitorDecisionBottomSheet.show(
      context,
      visitor: visitor,
      onAllow: () async {
        try {
          await ApiService.approveVisitorRequest(visitor.id);
          if (!mounted) return;
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Visitor access granted successfully'),
              backgroundColor: AppColors.success,
            ),
          );
        } catch (_) {}
      },
      onDeny: (reason) async {
        try {
          await ApiService.rejectVisitorRequest(visitor.id, reason: reason);
          if (!mounted) return;
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Visitor access denied'),
              backgroundColor: AppColors.error,
            ),
          );
        } catch (_) {}
      },
    );

    _activePopupRequestIds.remove(visitor.id);
  }

  void _onTabSelected(int index) {
    if (_currentIndex == index) return;
    HapticHelper.selectionClick();
    setState(() => _currentIndex = index);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _globalVisitorSub?.cancel();
    _globalVisitorUpdatedSub?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final screens = [
      HomeDashboardScreen(onNavigateTab: _onTabSelected),
      const ServicesScreen(),
      const CommunityScreen(),
      const VisitorsHubScreen(),
      const ProfileScreen(),
    ];

    return PopScope(
      canPop: _currentIndex == 0,
      onPopInvokedWithResult: (bool didPop, Object? result) {
        if (didPop) return;
        if (_currentIndex != 0) {
          setState(() {
            _currentIndex = 0;
          });
        }
      },
      child: Scaffold(
        body: IndexedStack(
          index: _currentIndex,
          children: screens,
        ),
        bottomNavigationBar: Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFF0F172A).withValues(alpha: 0.08),
                blurRadius: 20,
                offset: const Offset(0, -4),
              ),
            ],
          ),
          child: SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.only(top: 8.0, bottom: 4.0),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                  _buildNavItem(0, 'Home', Icons.home_rounded, Icons.home_outlined),
                  _buildNavItem(1, 'Services', Icons.build_rounded, Icons.build_outlined),
                  _buildNavItem(2, 'Community', Icons.groups_rounded, Icons.groups_outlined),
                  _buildNavItem(3, 'Visitors', Icons.people_rounded, Icons.people_outline_rounded),
                  _buildNavItem(4, 'Profile', Icons.person_rounded, Icons.person_outline_rounded),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildNavItem(int index, String label, IconData selectedIcon, IconData unselectedIcon) {
    final isSelected = _currentIndex == index;
    return InkWell(
      onTap: () => _onTabSelected(index),
      borderRadius: BorderRadius.circular(16),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 2),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              isSelected ? selectedIcon : unselectedIcon,
              color: isSelected ? const Color(0xFF155EEF) : const Color(0xFF64748B),
              size: 24,
            ),
            const SizedBox(height: 3),
            Text(
              label,
              style: TextStyle(
                fontSize: 11,
                fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                color: isSelected ? const Color(0xFF155EEF) : const Color(0xFF64748B),
              ),
            ),
            const SizedBox(height: 4),
            Container(
              width: 24,
              height: 2.5,
              decoration: BoxDecoration(
                color: isSelected ? const Color(0xFF155EEF) : Colors.transparent,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
