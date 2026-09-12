import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../repositories/guard_repository.dart';
import '../../repositories/visitor_repository.dart';
import '../../services/storage_service.dart';
import 'dashboard_screen.dart';
import '../visitors/visitors_screen.dart';
import '../history/history_screen.dart';
import '../profile/profile_screen.dart';
import '../../models/visitor_request.dart';
import '../visitor_entry/entry_approved_screen.dart';

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
  final Map<String, VisitorStatus> _knownStatuses = {};

  @override
  void initState() {
    super.initState();
    _initVisitorRepo();
  }

  Future<void> _initVisitorRepo() async {
    final storage = await StorageService.init();
    final repo = VisitorRepository(storage);
    for (var r in repo.allRequests) {
      _knownStatuses[r.id] = r.status;
    }
    repo.addListener(_onRepoChanged);
    setState(() {
      _visitorRepo = repo;
      _isInit = true;
    });
  }

  void _onRepoChanged() {
    if (!mounted) return;
    for (var r in _visitorRepo.allRequests) {
      final prevStatus = _knownStatuses[r.id];
      if (prevStatus == VisitorStatus.pending) {
        if (r.status == VisitorStatus.approved) {
          _knownStatuses[r.id] = VisitorStatus.approved;
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Row(
                children: [
                  const Icon(Icons.check_circle, color: Colors.white),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      '🎉 Entry APPROVED for ${r.visitor.name} (Flat ${r.flatNumber})!',
                      style: const TextStyle(fontWeight: FontWeight.w700),
                    ),
                  ),
                ],
              ),
              backgroundColor: AppColors.success,
              behavior: SnackBarBehavior.floating,
              duration: const Duration(seconds: 6),
              action: SnackBarAction(
                label: 'OPEN BARRIER',
                textColor: Colors.white,
                onPressed: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) => EntryApprovedScreen(
                        request: r,
                        visitorRepo: _visitorRepo,
                        guardRepo: widget.guardRepo,
                      ),
                    ),
                  );
                },
              ),
            ),
          );
        } else if (r.status == VisitorStatus.rejected) {
          _knownStatuses[r.id] = VisitorStatus.rejected;
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Row(
                children: [
                  const Icon(Icons.cancel, color: Colors.white),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      '❌ Entry DENIED by resident for ${r.visitor.name} (Flat ${r.flatNumber}).',
                      style: const TextStyle(fontWeight: FontWeight.w700),
                    ),
                  ),
                ],
              ),
              backgroundColor: AppColors.error,
              behavior: SnackBarBehavior.floating,
              duration: const Duration(seconds: 5),
            ),
          );
        }
      } else {
        _knownStatuses[r.id] = r.status;
      }
    }
  }

  @override
  void dispose() {
    if (_isInit) {
      _visitorRepo.removeListener(_onRepoChanged);
    }
    super.dispose();
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
