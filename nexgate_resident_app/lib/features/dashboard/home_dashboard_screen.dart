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
import '../visitors/widgets/visitor_decision_bottom_sheet.dart';
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

class _HomeDashboardScreenState extends State<HomeDashboardScreen> {
  bool _isLoading = true;
  List<VisitorModel> _pendingVisitors = [];
  List<VisitorModel> _recentVisitors = [];
  StreamSubscription<VisitorModel>? _visitorCreatedSub;
  StreamSubscription<Map<String, dynamic>>? _visitorUpdatedSub;

  @override
  void initState() {
    super.initState();
    _loadDashboardData();
    _subscribeToSocketEvents();
  }

  void _subscribeToSocketEvents() {
    _visitorCreatedSub = SocketService.onVisitorCreated.listen((newVisitor) {
      debugPrint('[Dashboard] Realtime new visitor at gate: ${newVisitor.name}');
      HapticHelper.heavyImpact();

      if (!mounted) return;
      setState(() {
        _pendingVisitors.insert(0, newVisitor);
      });

      // Show bottom sheet popup immediately
      VisitorDecisionBottomSheet.show(
        context,
        visitor: newVisitor,
        onAllow: () => _handleAllow(newVisitor.id),
        onDeny: (reason) => _handleDeny(newVisitor.id, reason),
      );
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
  void dispose() {
    _visitorCreatedSub?.cancel();
    _visitorUpdatedSub?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final user = AuthService.currentUser.value;

    return Scaffold(
      backgroundColor: AppColors.mainBackground,
      appBar: CustomAppBar(
        isHome: true,
        flatNumber: user != null ? 'Flat ${user.flatNumber}' : 'Resident',
        societyName: user?.societyName ?? 'Green Gate Residency',
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications_none_rounded, color: AppColors.primaryText),
            onPressed: () {
              if (widget.onNavigateTab != null) {
                widget.onNavigateTab!(2); // Navigate to Notifications Tab
              }
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
                    widget.onNavigateTab!(1); // Visitors Tab
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
                      widget.onNavigateTab!(1); // Visitors Tab
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
