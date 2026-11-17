import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../core/constants/app_colors.dart';
import '../../core/utils/haptic_helper.dart';
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
import '../maintenance/maintenance_screen.dart';
import 'widgets/quick_actions_grid.dart';
import 'widgets/recent_visitors_section.dart';
import 'widgets/security_status_card.dart';
import 'widgets/society_life_section.dart';
import 'widgets/urgent_gate_alert_card.dart';

/// Redesigned Premium NexGate Resident Home Dashboard Screen.
/// Pixel-matched to the official reference specification.
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
    _visitorCreatedSub = SocketService.onVisitorCreated.listen((newVisitor) async {
      debugPrint('[STATE] Received visitor created event: ${newVisitor.name} (${newVisitor.status})');

      if (!mounted) return;

      // Condition: If visitor is already approved or not pending, do NOT show in pending gate alert!
      if (!newVisitor.isPending) {
        debugPrint('[Dashboard] Visitor already resolved (${newVisitor.status}), refreshing recent activity');
        _loadDashboardData(silent: true);
        return;
      }

      // Check with backend to verify if guard already approved it
      try {
        final latest = await ApiService.fetchVisitorRequestById(newVisitor.id);
        if (latest != null && !latest.isPending) {
          debugPrint('[Dashboard] Visitor verified non-pending from API: ${latest.status}');
          if (mounted) _loadDashboardData(silent: true);
          return;
        }
      } catch (_) {}

      if (!mounted) return;
      HapticHelper.heavyImpact();

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
      final reqId = updatedData['requestId']?.toString() ?? updatedData['id']?.toString() ?? updatedData['_id']?.toString();
      final status = updatedData['status']?.toString().toUpperCase();

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

  String _getGreeting() {
    final hour = DateTime.now().hour;
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  }

  @override
  Widget build(BuildContext context) {
    final user = AuthService.currentUser.value;
    final fullName = user?.name.trim() ?? 'Sahil';
    final rawFirst = fullName.isNotEmpty ? fullName.split(' ').first : 'Resident';
    final firstName = rawFirst.isNotEmpty
        ? '${rawFirst[0].toUpperCase()}${rawFirst.substring(1)}'
        : 'Resident';
    final flatNumber = user?.flatNumber ?? 'A-101';
    final societyName = user?.societyName ?? 'Eco Residency Co-operative Housing Society';
    final greeting = _getGreeting();

    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: const SystemUiOverlayStyle(
        statusBarColor: Colors.transparent,
        statusBarIconBrightness: Brightness.dark,
        statusBarBrightness: Brightness.light,
      ),
      child: Scaffold(
        backgroundColor: const Color(0xFFF5F7FC), // Premium light background
        body: RefreshIndicator(
          onRefresh: () => _loadDashboardData(silent: true),
          color: const Color(0xFF155EEF),
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Top Hero Section with building photo & header
                _buildHeroHeader(
                  context: context,
                  firstName: firstName,
                  flatNumber: flatNumber,
                  societyName: societyName,
                  greeting: greeting,
                ),

                // Main Dashboard Body
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Quick Actions Section (4 items)
                      QuickActionsGrid(
                        onInviteVisitor: () {
                          Navigator.of(context).push(
                            MaterialPageRoute(builder: (_) => const InviteVisitorScreen()),
                          ).then((_) => _loadDashboardData(silent: true));
                        },
                        onVisitors: () {
                          if (widget.onNavigateTab != null) widget.onNavigateTab!(3);
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

                      const SizedBox(height: 16),

                      // Direct UPI Maintenance Payment Card (₹0 Gateway Fees)
                      _buildMaintenanceBanner(context),

                      // Urgent Pending Gate Alert (only show if visitor is actually pending & not approved)
                      if (_pendingVisitors.isNotEmpty && _pendingVisitors.first.isPending) ...[
                        const SizedBox(height: 16),
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
                      ],

                      const SizedBox(height: 22),

                      // Society Life & Services Section
                      SocietyLifeSection(
                        onServicesTap: () {
                          if (widget.onNavigateTab != null) widget.onNavigateTab!(1);
                        },
                        onCommunityTap: () {
                          if (widget.onNavigateTab != null) widget.onNavigateTab!(2);
                        },
                        onExploreAll: () {
                          if (widget.onNavigateTab != null) widget.onNavigateTab!(1);
                        },
                      ),

                      const SizedBox(height: 18),

                      // Security Monitoring Card
                      const SecurityStatusCard(
                        isOnline: true,
                        gateName: 'Main Gate',
                      ),

                      const SizedBox(height: 22),

                      // Recent Gate Activity Section
                      if (_isLoading)
                        Column(
                          children: List.generate(
                            3,
                            (i) => Padding(
                              padding: const EdgeInsets.only(bottom: 10.0),
                              child: LoadingSkeleton(
                                width: double.infinity,
                                height: 72,
                                borderRadius: BorderRadius.circular(20),
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

                      // Extra spacing for bottom bar
                      const SizedBox(height: 24),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildHeroHeader({
    required BuildContext context,
    required String firstName,
    required String flatNumber,
    required String societyName,
    required String greeting,
  }) {
    final topPadding = MediaQuery.of(context).padding.top;
    final screenWidth = MediaQuery.of(context).size.width;

    return SizedBox(
      height: topPadding + 225,
      child: Stack(
        children: [
          // Background soft sky-blue gradient
          Container(
            height: topPadding + 225,
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                colors: [Color(0xFFE9F2FE), Color(0xFFF5F7FC)],
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
              ),
            ),
          ),

          // Residential Building Photograph on right with soft gradient fade
          Positioned(
            top: 0,
            right: 0,
            width: screenWidth * 0.72,
            height: topPadding + 220,
            child: ShaderMask(
              shaderCallback: (rect) {
                return const LinearGradient(
                  begin: Alignment.centerLeft,
                  end: Alignment.centerRight,
                  colors: [Colors.transparent, Colors.white],
                  stops: [0.0, 0.45],
                ).createShader(rect);
              },
              blendMode: BlendMode.dstIn,
              child: ShaderMask(
                shaderCallback: (rect) {
                  return const LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [Colors.white, Colors.transparent],
                    stops: [0.65, 1.0],
                  ).createShader(rect);
                },
                blendMode: BlendMode.dstIn,
                child: Image.asset(
                  'assets/images/building_hero.jpg',
                  fit: BoxFit.cover,
                  alignment: Alignment.centerRight,
                  errorBuilder: (ctx, err, stack) => const SizedBox(),
                ),
              ),
            ),
          ),

          // Decorative soft curved light overlay
          Positioned(
            top: topPadding - 10,
            right: 40,
            child: Container(
              width: 180,
              height: 180,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: RadialGradient(
                  colors: [
                    Colors.white.withValues(alpha: 0.5),
                    Colors.transparent,
                  ],
                ),
              ),
            ),
          ),

          // Header Content
          SafeArea(
            bottom: false,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Top Row: Logo, NexGate, Society, Flat Badge, Notification Bell
                  Row(
                    children: [
                      // NexGate Official Logo Box
                      Container(
                        width: 44,
                        height: 44,
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(13),
                          boxShadow: [
                            BoxShadow(
                              color: const Color(0xFF2563EB).withValues(alpha: 0.25),
                              blurRadius: 10,
                              offset: const Offset(0, 3),
                            ),
                          ],
                        ),
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(13),
                          child: Image.asset(
                            'assets/images/logo.png',
                            fit: BoxFit.contain,
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),

                      // NexGate & Society Name
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'NexGate',
                              style: TextStyle(
                                fontSize: 20,
                                fontWeight: FontWeight.w800,
                                color: Color(0xFF0F172A),
                                letterSpacing: -0.4,
                              ),
                            ),
                            const SizedBox(height: 1),
                            Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Flexible(
                                  child: Text(
                                    societyName,
                                    style: const TextStyle(
                                      fontSize: 11.5,
                                      fontWeight: FontWeight.w500,
                                      color: Color(0xFF64748B),
                                    ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                                const SizedBox(width: 2),
                                const Icon(
                                  Icons.keyboard_arrow_down_rounded,
                                  size: 15,
                                  color: Color(0xFF64748B),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),

                      // Flat Number Badge
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
                        decoration: BoxDecoration(
                          color: const Color(0xFFE0EDFF),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          flatNumber,
                          style: const TextStyle(
                            color: Color(0xFF155EEF),
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                            letterSpacing: -0.2,
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),

                      // Notification Bell
                      InkWell(
                        onTap: () {
                          HapticHelper.lightImpact();
                          Navigator.of(context).push(
                            MaterialPageRoute(builder: (_) => const NotificationsScreen()),
                          );
                        },
                        borderRadius: BorderRadius.circular(20),
                        child: Container(
                          width: 38,
                          height: 38,
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.8),
                            shape: BoxShape.circle,
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withValues(alpha: 0.04),
                                blurRadius: 8,
                                offset: const Offset(0, 2),
                              ),
                            ],
                          ),
                          child: Stack(
                            alignment: Alignment.center,
                            children: [
                              const Icon(
                                Icons.notifications_none_rounded,
                                color: Color(0xFF0F172A),
                                size: 22,
                              ),
                              Positioned(
                                top: 7,
                                right: 7,
                                child: Container(
                                  width: 7.5,
                                  height: 7.5,
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFEF4444),
                                    shape: BoxShape.circle,
                                    border: Border.all(color: Colors.white, width: 1.5),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: 20),

                  // Greeting Section: Greeting on first line, user name on next line
                  Text(
                    '$greeting,',
                    style: const TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.w700,
                      color: Color(0xFF0F172A),
                      letterSpacing: -0.4,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    '$firstName 👋',
                    style: const TextStyle(
                      fontSize: 26,
                      fontWeight: FontWeight.w800,
                      color: Color(0xFF0F172A),
                      letterSpacing: -0.5,
                    ),
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'Welcome to your community',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                      color: Color(0xFF64748B),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMaintenanceBanner(BuildContext context) {
    return InkWell(
      onTap: () {
        HapticHelper.lightImpact();
        Navigator.of(context).push(
          MaterialPageRoute(builder: (_) => const MaintenanceScreen()),
        );
      },
      borderRadius: BorderRadius.circular(22),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [Color(0xFF0F172A), Color(0xFF1E293B)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(22),
          border: Border.all(color: const Color(0xFF334155), width: 1),
          boxShadow: [
            BoxShadow(
              color: const Color(0xFF0F172A).withValues(alpha: 0.2),
              blurRadius: 16,
              offset: const Offset(0, 6),
            ),
          ],
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: const Color(0xFF38BDF8).withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(14),
              ),
              child: const Icon(
                Icons.account_balance_wallet_rounded,
                color: Color(0xFF38BDF8),
                size: 22,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Text(
                        'Maintenance Due',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: const Color(0xFF10B981).withValues(alpha: 0.2),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: const Text(
                          '₹0 Fee',
                          style: TextStyle(
                            color: Color(0xFF34D399),
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 2),
                  const Text(
                    'Nov 2026 • ₹2,500 due 10 Dec',
                    style: TextStyle(
                      color: Color(0xFF94A3B8),
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    'Pay',
                    style: TextStyle(
                      color: Color(0xFF0F172A),
                      fontSize: 13,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  SizedBox(width: 4),
                  Icon(
                    Icons.arrow_forward_rounded,
                    size: 14,
                    color: Color(0xFF0F172A),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
