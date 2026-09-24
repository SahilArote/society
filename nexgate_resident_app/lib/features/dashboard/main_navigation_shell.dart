import 'dart:async';
import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../core/utils/haptic_helper.dart';
import '../../models/visitor_model.dart';
import '../../services/api_service.dart';
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

class _MainNavigationShellState extends State<MainNavigationShell> {
  late int _currentIndex;
  StreamSubscription<VisitorModel>? _globalVisitorSub;

  @override
  void initState() {
    super.initState();
    _currentIndex = widget.initialTab;

    // Connect socket if not already connected
    SocketService.connect();

    // Global listener for incoming gate arrivals
    _globalVisitorSub = SocketService.onVisitorCreated.listen((visitor) {
      if (!mounted) return;
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
      );
    });
  }

  void _onTabSelected(int index) {
    if (_currentIndex == index) return;
    HapticHelper.selectionClick();
    setState(() => _currentIndex = index);
  }

  @override
  void dispose() {
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
