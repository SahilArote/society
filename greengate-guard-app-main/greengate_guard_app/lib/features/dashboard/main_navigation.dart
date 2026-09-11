import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../repositories/guard_repository.dart';
import '../../repositories/visitor_repository.dart';
import '../../services/storage_service.dart';
import 'dashboard_screen.dart';
import '../visitors/visitors_screen.dart';
import '../history/history_screen.dart';
import '../profile/profile_screen.dart';

class MainNavigation extends StatefulWidget {
  final GuardRepository guardRepo;

  const MainNavigation({super.key, required this.guardRepo});

  @override
  State<MainNavigation> createState() => _MainNavigationState();
}

class _MainNavigationState extends State<MainNavigation> {
  int _currentIndex = 0;
  late VisitorRepository _visitorRepo;
  bool _isInit = false;

  @override
  void initState() {
    super.initState();
    _initVisitorRepo();
  }

  Future<void> _initVisitorRepo() async {
    final storage = await StorageService.init();
    setState(() {
      _visitorRepo = VisitorRepository(storage);
      _isInit = true;
    });
  }

  @override
  Widget build(BuildContext context) {
    if (!_isInit) {
      return const Scaffold(
        body: Center(
          child: CircularProgressIndicator(),
        ),
      );
    }

    final screens = [
      DashboardScreen(
        guardRepo: widget.guardRepo,
        visitorRepo: _visitorRepo,
        onNavigateToVisitors: () => setState(() => _currentIndex = 1),
      ),
      VisitorsScreen(
        visitorRepo: _visitorRepo,
        guardRepo: widget.guardRepo,
      ),
      HistoryScreen(
        visitorRepo: _visitorRepo,
      ),
      ProfileScreen(
        guardRepo: widget.guardRepo,
      ),
    ];

    return Scaffold(
      body: IndexedStack(
        index: _currentIndex,
        children: screens,
      ),
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          color: AppColors.surface,
          border: Border(
            top: BorderSide(color: AppColors.border, width: 1),
          ),
          boxShadow: [
            BoxShadow(
              color: Color.fromRGBO(15, 23, 42, 0.04),
              blurRadius: 10,
              offset: Offset(0, -2),
            ),
          ],
        ),
        child: SafeArea(
          child: NavigationBar(
            height: 70,
            elevation: 0,
            backgroundColor: AppColors.surface,
            indicatorColor: AppColors.primaryLight,
            selectedIndex: _currentIndex,
            onDestinationSelected: (idx) => setState(() => _currentIndex = idx),
            destinations: const [
              NavigationDestination(
                icon: Icon(Icons.shield_outlined, size: 26, color: AppColors.textSecondary),
                selectedIcon: Icon(Icons.shield, size: 26, color: AppColors.primary),
                label: 'Home',
              ),
              NavigationDestination(
                icon: Icon(Icons.badge_outlined, size: 26, color: AppColors.textSecondary),
                selectedIcon: Icon(Icons.badge, size: 26, color: AppColors.primary),
                label: 'Visitors',
              ),
              NavigationDestination(
                icon: Icon(Icons.history, size: 26, color: AppColors.textSecondary),
                selectedIcon: Icon(Icons.history, size: 26, color: AppColors.primary),
                label: 'History',
              ),
              NavigationDestination(
                icon: Icon(Icons.person_outline, size: 26, color: AppColors.textSecondary),
                selectedIcon: Icon(Icons.person, size: 26, color: AppColors.primary),
                label: 'Profile',
              ),
            ],
          ),
        ),
      ),
    );
  }
}
