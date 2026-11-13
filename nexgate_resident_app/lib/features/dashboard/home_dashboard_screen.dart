import 'dart:async';
import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_dimensions.dart';
import '../../core/utils/haptic_helper.dart';
import '../../core/widgets/custom_app_bar.dart';
import '../../core/widgets/loading_skeleton.dart';
import '../../models/visitor_model.dart';
import '../../services/api_service.dart';
import '../../services/auth_service.dart';
import '../../services/socket_service.dart';
import '../household/family_members_screen.dart';
import '../household/vehicles_screen.dart';
import '../visitors/invite_visitor_screen.dart';
import '../visitors/visitor_detail_screen.dart';
import '../notifications/notifications_screen.dart';
import 'widgets/quick_actions_grid.dart';
import 'widgets/recent_visitors_section.dart';
import 'widgets/security_status_card.dart';
import 'widgets/urgent_gate_alert_card.dart';

/// Primary Resident Dashboard Screen.
class HomeDashboardScreen extends StatefulWidget {
  final Function(int tabIndex)? onNavigateTab;

  const HomeDashboardScreen({super.key, this.onNavigateTab});

  @override
  State<HomeDashboardScreen> createState() => _HomeDashboardScreenState();
}

class _HomeDashboardScreenState extends State<HomeDashboardScreen> with WidgetsBindingObserver {
  bool _isLoading = true;
  List<VisitorModel> _pendingVisitors = [];
  List<VisitorModel> _recentVisitors = [];
  StreamSubscription<VisitorModel>? _visitorCreatedSub;
  StreamSubscription<Map<String, dynamic>>? _visitorUpdatedSub;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _loadDashboardData();
    _subscribeToSocketEvents();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      debugPrint('[LIFECYCLE] Dashboard resumed - silently syncing latest visitor data');
      _loadDashboardData(silent: true);
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _visitorCreatedSub?.cancel();
    _visitorUpdatedSub?.cancel();
    super.dispose();
  }

  void _subscribeToSocketEvents() {
    _visitorCreatedSub = SocketService.onVisitorCreated.listen((newVisitor) {
      debugPrint('[STATE] Updating visitor requests');
      HapticHelper.heavyImpact();

      if (!mounted) return;
      setState(() {
        final existingIdx = _pendingVisitors.indexWhere((v) => v.id == newVisitor.id);
        if (existingIdx >= 0) {
          _pendingVisitors[existingIdx] = newVisitor;
        } else {
          _pendingVisitors.insert(0, newVisitor);
        }
      });
      debugPrint('[STATE] Pending requests: ${_pendingVisitors.length}');
      debugPrint('[UI] New visitor request detected: ${newVisitor.name} (${newVisitor.id})');
    });

    _visitorUpdatedSub = SocketService.onVisitorUpdated.listen((updatedData) {
      debugPrint('[Dashboard] Visitor updated via socket: $updatedData');
      if (!mounted) return;
      final reqId = updatedData['requestId']?.toString();
      final status = updatedData['status']?.toString();

      if (reqId != null && status != null && status != 'PENDING') {
        setState(() {
          _pendingVisitors.removeWhere((v) => v.id == reqId);
        });
        _loadDashboardData(silent: true);
      }
    });
  }

  Future<void> _loadDashboardData({bool silent = false}) async {
    if (!silent) {
      setState(() => _isLoading = true);
    }

    try {
      final all = await ApiService.fetchVisitorRequests();
      if (!mounted) return;

      final pending = <VisitorModel>[];
      final recent = <VisitorModel>[];

      for (final v in all) {
        if (v.isPending) {
          pending.add(v);
        } else {
          recent.add(v);
        }
      }

      setState(() {
        _pendingVisitors = pending;
        _recentVisitors = recent;
      });
    } catch (e) {
      debugPrint('[Dashboard] Error loading visitor requests: $e');
    } finally {
      if (mounted && !silent) {
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _handleAllow(String id) async {
    HapticHelper.success();
    try {
      await ApiService.approveVisitorRequest(id);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Visitor access granted successfully'),
          backgroundColor: AppColors.success,
        ),
      );
    } catch (e) {
      debugPrint('[Dashboard] Approve request note: $e');
    }
    setState(() {
      _pendingVisitors.removeWhere((v) => v.id == id);
    });
    _loadDashboardData(silent: true);
  }

  Future<void> _handleDeny(String id, String reason) async {
    HapticHelper.error();
    try {
      await ApiService.rejectVisitorRequest(id, reason: reason);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Visitor access denied'),
          backgroundColor: AppColors.error,
        ),
      );
    } catch (e) {
      debugPrint('[Dashboard] Reject request note: $e');
    }
    setState(() {
      _pendingVisitors.removeWhere((v) => v.id == id);
    });
    _loadDashboardData(silent: true);
  }

  @override
  Widget build(BuildContext context) {
    final user = AuthService.currentUser.value;

    return Scaffold(
      backgroundColor: AppColors.mainBackground,
      appBar: CustomAppBar(
        isHome: true,
        flatNumber: user != null ? 'Flat ${user.flatNumber}' : 'Resident',
        societyName: user?.societyName ?? 'Eco Residency Co-operative Housing Society Ltd',
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications_none_rounded, color: AppColors.primaryText),
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const NotificationsScreen()),
              );
            },
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () => _loadDashboardData(silent: true),
        color: AppColors.primaryBlue,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 14.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Urgent Pending Gate Approvals
              if (_pendingVisitors.isNotEmpty) ...[
                UrgentGateAlertCard(
                  visitor: _pendingVisitors.first,
                  onAllow: () => _handleAllow(_pendingVisitors.first.id),
                  onDeny: () => _handleDeny(_pendingVisitors.first.id, 'Denied by resident'),
                  onTapDetails: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (_) => VisitorDetailScreen(
                          visitorId: _pendingVisitors.first.id,
                        ),
                      ),
                    ).then((_) => _loadDashboardData(silent: true));
                  },
                ),
                const SizedBox(height: 16),
              ],

              // Quick Actions Grid
              QuickActionsGrid(
                onInviteVisitor: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(builder: (_) => const InviteVisitorScreen()),
                  ).then((_) => _loadDashboardData(silent: true));
                },
                onVisitors: () {
                  if (widget.onNavigateTab != null) {
                    widget.onNavigateTab!(3); // Visitors Tab
                  }
                },
                onFamily: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(builder: (_) => const FamilyMembersScreen()),
                  );
                },
                onVehicles: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(builder: (_) => const VehiclesScreen()),
                  );
                },
              ),

              const SizedBox(height: 20),

              // Society Services & Community Quick Cards
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF0F172A), Color(0xFF1E293B)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: AppDimensions.roundedLarge,
                  boxShadow: AppDimensions.subtleShadow,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(6),
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Icon(Icons.hub_rounded, color: Colors.amberAccent, size: 18),
                        ),
                        const SizedBox(width: 8),
                        const Text(
                          'Society Life & Services',
                          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: InkWell(
                            onTap: () {
                              HapticHelper.lightImpact();
                              if (widget.onNavigateTab != null) widget.onNavigateTab!(1);
                            },
                            borderRadius: BorderRadius.circular(12),
                            child: Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: Colors.white.withValues(alpha: 0.08),
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: Colors.white.withValues(alpha: 0.12)),
                              ),
                              child: const Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Icon(Icons.build_circle_rounded, color: Colors.lightBlueAccent, size: 24),
                                  SizedBox(height: 8),
                                  Text('Services', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 13)),
                                  SizedBox(height: 2),
                                  Text('Vendors & Staff', style: TextStyle(color: Colors.white70, fontSize: 11)),
                                ],
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: InkWell(
                            onTap: () {
                              HapticHelper.lightImpact();
                              if (widget.onNavigateTab != null) widget.onNavigateTab!(2);
                            },
                            borderRadius: BorderRadius.circular(12),
                            child: Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: Colors.white.withValues(alpha: 0.08),
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: Colors.white.withValues(alpha: 0.12)),
                              ),
                              child: const Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Icon(Icons.groups_rounded, color: Color(0xFF34D399), size: 24),
                                  SizedBox(height: 8),
                                  Text('Community', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 13)),
                                  SizedBox(height: 2),
                                  Text('Lost & Events', style: TextStyle(color: Colors.white70, fontSize: 11)),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 20),

              // Society Security Status Banner
              const SecurityStatusCard(),

              const SizedBox(height: 24),

              // Recent Visitors Activity
              if (_isLoading)
                Column(
                  children: List.generate(
                    3,
                    (i) => Padding(
                      padding: const EdgeInsets.only(bottom: 10.0),
                      child: LoadingSkeleton(
                        width: double.infinity,
                        height: 72,
                        borderRadius: AppDimensions.roundedLarge,
                      ),
                    ),
                  ),
                )
              else
                RecentVisitorsSection(
                  visitors: _recentVisitors,
                  onViewAll: () {
                    if (widget.onNavigateTab != null) {
                      widget.onNavigateTab!(3); // Visitors Tab
                    }
                  },
                  onRefresh: () => _loadDashboardData(silent: true),
                ),

              const SizedBox(height: 80),
            ],
          ),
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: AppColors.primaryBlue,
        foregroundColor: Colors.white,
        elevation: 4,
        icon: const Icon(Icons.add_rounded, size: 22),
        label: const Text('Invite Visitor', style: TextStyle(fontWeight: FontWeight.w700)),
        onPressed: () {
          HapticHelper.lightImpact();
          Navigator.of(context).push(
            MaterialPageRoute(builder: (_) => const InviteVisitorScreen()),
          ).then((_) => _loadDashboardData(silent: true));
        },
      ),
    );
  }
}
