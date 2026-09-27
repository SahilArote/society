import 'dart:async';
import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../core/utils/haptic_helper.dart';
import '../../models/visitor_model.dart';
import '../../services/api_service.dart';
import '../../services/notification_service.dart';
import '../../services/socket_service.dart';
import '../notifications/notifications_screen.dart';
import '../profile/profile_screen.dart';
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
      if (requestId != null && requestId.isNotEmpty && mounted) {
        debugPrint('[NOTIFICATION] Notification clicked with requestId: $requestId');
        _handleNotificationTap(requestId);
      }
    };

    // Global listener for incoming gate arrivals
    _globalVisitorSub = SocketService.onVisitorCreated.listen((visitor) {
      if (!mounted) return;
      debugPrint('[UI] Showing new visitor popup for: ${visitor.name} (${visitor.id})');
      _showDecisionPopup(visitor);
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
      final target = all.firstWhere(
        (v) => v.id == requestId,
        orElse: () => all.firstWhere((v) => v.isPending, orElse: () => all.first),
      );
      if (target.isPending && mounted) {
        _showDecisionPopup(target);
      }
    } catch (e) {
      debugPrint('[NOTIFICATION] Error resolving tapped visitor request: $e');
    }
  }

  void _showDecisionPopup(VisitorModel visitor) {
    // Duplicate Protection: Avoid displaying duplicate popups for the same request
    if (_activePopupRequestIds.contains(visitor.id)) {
      debugPrint('[UI] Popup for request ${visitor.id} already active, skipping duplicate');
      return;
    }

    _activePopupRequestIds.add(visitor.id);
    HapticHelper.heavyImpact();

    VisitorDecisionBottomSheet.show(
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
    ).then((_) {
      _activePopupRequestIds.remove(visitor.id);
    });
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
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final screens = [
      HomeDashboardScreen(onNavigateTab: _onTabSelected),
      const VisitorsHubScreen(),
      const NotificationsScreen(),
      const ProfileScreen(),
    ];

    return Scaffold(
      body: IndexedStack(
        index: _currentIndex,
        children: screens,
      ),
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          border: Border(
            top: BorderSide(color: AppColors.border, width: 1),
          ),
        ),
        child: SafeArea(
          child: NavigationBar(
            selectedIndex: _currentIndex,
            onDestinationSelected: _onTabSelected,
            backgroundColor: Colors.white,
            elevation: 0,
            indicatorColor: AppColors.lightBlue,
            height: 64,
            labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
            destinations: const [
              NavigationDestination(
                icon: Icon(Icons.home_outlined, color: AppColors.secondaryText),
                selectedIcon: Icon(Icons.home_rounded, color: AppColors.primaryBlue),
                label: 'Home',
              ),
              NavigationDestination(
                icon: Icon(Icons.people_outline_rounded, color: AppColors.secondaryText),
                selectedIcon: Icon(Icons.people_rounded, color: AppColors.primaryBlue),
                label: 'Visitors',
              ),
              NavigationDestination(
                icon: Icon(Icons.notifications_none_rounded, color: AppColors.secondaryText),
                selectedIcon: Icon(Icons.notifications_rounded, color: AppColors.primaryBlue),
                label: 'Alerts',
              ),
              NavigationDestination(
                icon: Icon(Icons.person_outline_rounded, color: AppColors.secondaryText),
                selectedIcon: Icon(Icons.person_rounded, color: AppColors.primaryBlue),
                label: 'Profile',
              ),
            ],
          ),
        ),
      ),
    );
  }
}
