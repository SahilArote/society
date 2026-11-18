import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../repositories/guard_repository.dart';
import '../../repositories/visitor_repository.dart';
import '../../services/language_service.dart';
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
    _visitorRepo = VisitorRepository(widget.guardRepo.storage);
    _isInit = true;
  }

  @override
  Widget build(BuildContext context) {
    if (!_isInit) {
      return const Scaffold(
        backgroundColor: AppColors.pageBackground,
        body: Center(
          child: CircularProgressIndicator(
            valueColor: AlwaysStoppedAnimation<Color>(AppColors.primary),
          ),
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

    return WillPopScope(
      onWillPop: () async {
        if (_currentIndex != 0) {
          setState(() => _currentIndex = 0);
          return false;
        }
        return false; // Prevent accidental exit in kiosk terminal mode
      },
      child: Scaffold(
        backgroundColor: AppColors.pageBackground,
        body: IndexedStack(
          index: _currentIndex,
          children: screens,
        ),
        bottomNavigationBar: Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            border: Border(
              top: BorderSide(color: AppColors.border, width: 1.0),
            ),
          ),
          child: SafeArea(
            top: false,
            child: SizedBox(
              height: 72,
              child: Row(
                children: [
                  _buildNavItem(
                    index: 0,
                    icon: Icons.shield_outlined,
                    label: tr('navHome'),
                  ),
                  _buildNavItem(
                    index: 1,
                    icon: Icons.badge_outlined,
                    label: tr('navVisitors'),
                  ),
                  _buildNavItem(
                    index: 2,
                    icon: Icons.history_rounded,
                    label: tr('navLogs'),
                  ),
                  _buildNavItem(
                    index: 3,
                    icon: Icons.person_outline_rounded,
                    label: tr('navProfile'),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildNavItem({
    required int index,
    required IconData icon,
    required String label,
  }) {
    final bool isSelected = _currentIndex == index;

    return Expanded(
      child: InkWell(
        onTap: () => setState(() => _currentIndex = index),
        splashColor: Colors.transparent,
        highlightColor: Colors.transparent,
        child: SizedBox(
          height: 72,
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              if (isSelected)
                Container(
                  width: 56,
                  height: 30,
                  decoration: BoxDecoration(
                    color: AppColors.navActivePillBg, // #E8E9FF
                    borderRadius: BorderRadius.circular(15),
                  ),
                  alignment: Alignment.center,
                  child: Icon(
                    icon,
                    size: 22,
                    color: AppColors.navActive, // #2B2F8F
                  ),
                )
              else
                SizedBox(
                  width: 56,
                  height: 30,
                  child: Center(
                    child: Icon(
                      icon,
                      size: 22,
                      color: AppColors.navInactive, // #4B5565
                    ),
                  ),
                ),
              const SizedBox(height: 4),
              Text(
                label,
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                  color:
                      isSelected ? AppColors.navActive : AppColors.navInactive,
                  fontFamily: 'Inter',
                  height: 1.1,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}