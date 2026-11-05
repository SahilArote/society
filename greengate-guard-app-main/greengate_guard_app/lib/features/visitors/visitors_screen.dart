import '../../core/widgets/visitor_photo_avatar.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../models/visitor.dart';
import '../../models/visitor_request.dart';
import '../../repositories/visitor_repository.dart';
import '../../repositories/guard_repository.dart';
import '../visitor_entry/waiting_approval_screen.dart';
import '../visitor_entry/entry_approved_screen.dart';
import '../visitor_entry/entry_rejected_screen.dart';

/// Professional, high-visibility Visitors Screen for Gate Security Guards.
/// Optimized for fast readability (including elderly guards), high contrast in sunlight,
/// pull-to-refresh live sync, and instant search across flats and visitors.
class VisitorsScreen extends StatefulWidget {
  final VisitorRepository visitorRepo;
  final GuardRepository guardRepo;

  const VisitorsScreen({
    super.key,
    required this.visitorRepo,
    required this.guardRepo,
  });

  @override
  State<VisitorsScreen> createState() => _VisitorsScreenState();
}

class _VisitorsScreenState extends State<VisitorsScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';
  bool _isRefreshing = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _handleRefresh() async {
    setState(() => _isRefreshing = true);
    await widget.visitorRepo.fetchRecentRequests();
    if (mounted) {
      setState(() => _isRefreshing = false);
    }
  }

  void _onRequestTap(VisitorRequest request) {
    if (request.status == VisitorStatus.pending) {
      Navigator.of(context).push(
        MaterialPageRoute(
          builder: (_) => WaitingApprovalScreen(
            request: request,
            visitorRepo: widget.visitorRepo,
            guardRepo: widget.guardRepo,
          ),
        ),
      );
    } else if (request.status == VisitorStatus.approved) {
      Navigator.of(context).push(
        MaterialPageRoute(
          builder: (_) => EntryApprovedScreen(
            request: request,
            visitorRepo: widget.visitorRepo,
            guardRepo: widget.guardRepo,
          ),
        ),
      );
    } else if (request.status == VisitorStatus.rejected) {
      Navigator.of(context).push(
        MaterialPageRoute(
          builder: (_) => EntryRejectedScreen(
            request: request,
            visitorRepo: widget.visitorRepo,
            guardRepo: widget.guardRepo,
          ),
        ),
      );
    } else {
      _showDetailsSheet(context, request);
    }
  }

  List<VisitorRequest> _filterList(List<VisitorRequest> source) {
    if (_searchQuery.isEmpty) return source;
    final query = _searchQuery.toLowerCase();
    return source.where((r) {
      final name = r.visitor.name.toLowerCase();
      final flat = r.flatNumber.toLowerCase();
      final phone = (r.visitor.phoneNumber ?? '').toLowerCase();
      final resident = r.residentName.toLowerCase();
      return name.contains(query) ||
          flat.contains(query) ||
          phone.contains(query) ||
          resident.contains(query);
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: SafeArea(
        child: Column(
          children: [
            // 1. Top Header Bar
            _buildHeader(),

            // 2. Search & Quick Lookup Bar
            _buildSearchBar(),

            // 3. Segmented Pill Tab Bar
            _buildSegmentedTabs(),

            // 4. Tab Views with Pull-to-Refresh & List
            Expanded(
              child: AnimatedBuilder(
                animation: widget.visitorRepo,
                builder: (context, _) {
                  final all = widget.visitorRepo.allRequests;
                  final pending = widget.visitorRepo.pendingRequests;
                  final approved = widget.visitorRepo.approvedRequests;

                  return TabBarView(
                    controller: _tabController,
                    children: [
                      // Tab 1: PENDING
                      _buildRefreshableList(
                        items: _filterList(pending),
                        emptyTitle: 'No Pending Visitors',
                        emptySubtitle:
                            'All gate visitor requests have been addressed.',
                        emptyIcon: Icons.access_time_rounded,
                        accentColor: const Color(0xFFD97706),
                      ),

                      // Tab 2: APPROVED
                      _buildRefreshableList(
                        items: _filterList(approved),
                        emptyTitle: 'No Approved Visitors',
                        emptySubtitle:
                            'Approved visitors waiting for gate entry will appear here.',
                        emptyIcon: Icons.check_circle_outline_rounded,
                        accentColor: const Color(0xFF059669),
                      ),

                      // Tab 3: ALL TODAY
                      _buildRefreshableList(
                        items: _filterList(all),
                        emptyTitle: 'No Activity Today',
                        emptySubtitle:
                            'New visitor entries logged today will show here.',
                        emptyIcon: Icons.badge_outlined,
                        accentColor: const Color(0xFF4F46E5),
                      ),
                    ],
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  // Top Screen Header
  Widget _buildHeader() {
    return Container(
      padding: const EdgeInsets.fromLTRB(20, 14, 20, 12),
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(
          bottom: BorderSide(color: Color(0xFFE2E8F0), width: 1),
        ),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: const Color(0xFFEEF2FF),
                  borderRadius: BorderRadius.circular(14),
                  border:
                      Border.all(color: const Color(0xFFC7D2FE), width: 1.5),
                ),
                child: const Icon(
                  Icons.people_alt_rounded,
                  color: Color(0xFF4F46E5),
                  size: 24,
                ),
              ),
              const SizedBox(width: 12),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Gate Visitors',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w900,
                      color: Color(0xFF0F172A),
                      letterSpacing: -0.5,
                    ),
                  ),
                  Row(
                    children: [
                      Container(
                        width: 7,
                        height: 7,
                        decoration: const BoxDecoration(
                          color: Color(0xFF10B981),
                          shape: BoxShape.circle,
                        ),
                      ),
                      const SizedBox(width: 6),
                      const Text(
                        'Live Queue & Activity',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: Color(0xFF64748B),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ],
          ),

          // Refresh Button with state indicator
          Material(
            color: Colors.transparent,
            child: InkWell(
              borderRadius: BorderRadius.circular(12),
              onTap: _isRefreshing ? null : _handleRefresh,
              child: Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: const Color(0xFFF1F5F9),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFCBD5E1)),
                ),
                child: Row(
                  children: [
                    _isRefreshing
                        ? const SizedBox(
                            width: 14,
                            height: 14,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Color(0xFF4F46E5),
                            ),
                          )
                        : const Icon(Icons.refresh_rounded,
                            size: 16, color: Color(0xFF0F172A)),
                    const SizedBox(width: 6),
                    const Text(
                      'Sync',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w800,
                        color: Color(0xFF0F172A),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // Search Bar
  Widget _buildSearchBar() {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.fromLTRB(16, 10, 16, 10),
      child: TextField(
        controller: _searchController,
        style: const TextStyle(
          fontSize: 15,
          fontWeight: FontWeight.w700,
          color: Color(0xFF0F172A),
        ),
        onChanged: (val) => setState(() => _searchQuery = val.trim()),
        decoration: InputDecoration(
          isDense: true,
          contentPadding:
              const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          hintText: 'Search visitor, flat (e.g. A-402), or phone...',
          hintStyle: const TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w500,
            color: Color(0xFF94A3B8),
          ),
          prefixIcon: const Icon(Icons.search_rounded,
              size: 22, color: Color(0xFF6366F1)),
          suffixIcon: _searchQuery.isNotEmpty
              ? IconButton(
                  icon: const Icon(Icons.close_rounded,
                      size: 18, color: Color(0xFF64748B)),
                  onPressed: () {
                    _searchController.clear();
                    setState(() => _searchQuery = '');
                  },
                )
              : null,
          filled: true,
          fillColor: const Color(0xFFF8FAFC),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(14),
            borderSide: const BorderSide(color: Color(0xFFE2E8F0), width: 1.5),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(14),
            borderSide: const BorderSide(color: Color(0xFFE2E8F0), width: 1.5),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(14),
            borderSide: const BorderSide(color: Color(0xFF4F46E5), width: 2),
          ),
        ),
      ),
    );
  }

  // Segmented Pill Tab Bar (High-Contrast, Touch-Friendly for Seniors)
  Widget _buildSegmentedTabs() {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
      child: AnimatedBuilder(
        animation: widget.visitorRepo,
        builder: (context, _) {
          final pendingCount = widget.visitorRepo.pendingCount;
          final approvedCount = widget.visitorRepo.approvedRequests.length;
          final totalCount = widget.visitorRepo.totalTodayCount;

          return Container(
            height: 48,
            padding: const EdgeInsets.all(4),
            decoration: BoxDecoration(
              color: const Color(0xFFF1F5F9),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: TabBar(
              controller: _tabController,
              indicator: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(11),
                boxShadow: const [
                  BoxShadow(
                    color: Color.fromRGBO(15, 23, 42, 0.08),
                    blurRadius: 8,
                    offset: Offset(0, 2),
                  ),
                ],
              ),
              indicatorSize: TabBarIndicatorSize.tab,
              labelPadding: EdgeInsets.zero,
              dividerColor: Colors.transparent,
              labelColor: const Color(0xFF0F172A),
              unselectedLabelColor: const Color(0xFF64748B),
              labelStyle:
                  const TextStyle(fontWeight: FontWeight.w900, fontSize: 13),
              unselectedLabelStyle:
                  const TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
              tabs: [
                _buildTabItem(
                  title: 'PENDING',
                  count: pendingCount,
                  badgeColor: const Color(0xFFD97706),
                  badgeTextColor: Colors.white,
                ),
                _buildTabItem(
                  title: 'APPROVED',
                  count: approvedCount,
                  badgeColor: const Color(0xFF059669),
                  badgeTextColor: Colors.white,
                ),
                _buildTabItem(
                  title: 'ALL TODAY',
                  count: totalCount,
                  badgeColor: const Color(0xFF64748B),
                  badgeTextColor: Colors.white,
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildTabItem({
    required String title,
    required int count,
    required Color badgeColor,
    required Color badgeTextColor,
  }) {
    return Tab(
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(title),
          if (count > 0) ...[
            const SizedBox(width: 6),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: badgeColor,
                borderRadius: BorderRadius.circular(999),
              ),
              child: Text(
                '$count',
                style: TextStyle(
                  color: badgeTextColor,
                  fontSize: 10,
                  fontWeight: FontWeight.w900,
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  // Refreshable List View
  Widget _buildRefreshableList({
    required List<VisitorRequest> items,
    required String emptyTitle,
    required String emptySubtitle,
    required IconData emptyIcon,
    required Color accentColor,
  }) {
    if (items.isEmpty) {
      return RefreshIndicator(
        onRefresh: _handleRefresh,
        color: const Color(0xFF4F46E5),
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 48),
          children: [
            Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Container(
                    width: 72,
                    height: 72,
                    decoration: BoxDecoration(
                      color: accentColor.withValues(alpha: 0.1),
                      shape: BoxShape.circle,
                      border: Border.all(
                          color: accentColor.withValues(alpha: 0.25), width: 1.5),
                    ),
                    child: Icon(emptyIcon, size: 34, color: accentColor),
                  ),
                  const SizedBox(height: 18),
                  Text(
                    emptyTitle,
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w800,
                      color: Color(0xFF0F172A),
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    emptySubtitle,
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w500,
                      color: Color(0xFF64748B),
                    ),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _handleRefresh,
      color: const Color(0xFF4F46E5),
      child: ListView.separated(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
        itemCount: items.length,
        separatorBuilder: (_, __) => const SizedBox(height: 10),
        itemBuilder: (context, index) {
          final req = items[index];
          return _buildVisitorCard(req);
        },
      ),
    );
  }

  // Polished Visitor Card (High Readability for Gate Guards)
  Widget _buildVisitorCard(VisitorRequest req) {
    final timeFormatted = DateFormat('hh:mm a').format(req.requestTime);
    final isPending = req.status == VisitorStatus.pending;
    final isApproved = req.status == VisitorStatus.approved;
    final isRejected = req.status == VisitorStatus.rejected;

    // Accent line color on the left of card
    final Color borderAccent = isPending
        ? const Color(0xFFD97706)
        : (isApproved
            ? const Color(0xFF059669)
            : (isRejected ? const Color(0xFFDC2626) : const Color(0xFF94A3B8)));

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isPending
              ? const Color(0xFFFCD34D)
              : (isApproved
                  ? const Color(0xFFA7F3D0)
                  : const Color(0xFFE2E8F0)),
          width: isPending || isApproved ? 1.5 : 1.2,
        ),
        boxShadow: const [
          BoxShadow(
            color: Color.fromRGBO(15, 23, 42, 0.04),
            blurRadius: 10,
            offset: Offset(0, 3),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(16),
        child: Container(
          decoration: BoxDecoration(
            border: Border(
              left: BorderSide(color: borderAccent, width: 4.5),
            ),
          ),
          child: Material(
            color: Colors.transparent,
            child: InkWell(
              onTap: () => _onRequestTap(req),
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Row 1: Photo, Name, Visitor Type, Flat Tag
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Visitor Photo Avatar (50x50)
                        ClipRRect(
                          borderRadius: BorderRadius.circular(12),
                          child: Container(
                            width: 50,
                            height: 50,
                            color: const Color(0xFFF1F5F9),
                            child: _buildPhoto(req.visitor.photoPath),
                          ),
                        ),
                        const SizedBox(width: 12),

                        // Visitor Name & Details
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Expanded(
                                    child: Text(
                                      req.visitor.name,
                                      style: const TextStyle(
                                        fontSize: 16,
                                        fontWeight: FontWeight.w900,
                                        color: Color(0xFF0F172A),
                                        letterSpacing: -0.2,
                                      ),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                  const SizedBox(width: 6),
                                  _buildVisitorTypeChip(req.visitor.type),
                                ],
                              ),
                              const SizedBox(height: 4),

                              // Flat Badge & Resident Name
                              Row(
                                children: [
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                        horizontal: 7, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFFF1F5F9),
                                      borderRadius: BorderRadius.circular(6),
                                      border: Border.all(
                                          color: const Color(0xFFCBD5E1)),
                                    ),
                                    child: Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        const Icon(Icons.home_work_rounded,
                                            size: 11, color: Color(0xFF475569)),
                                        const SizedBox(width: 4),
                                        Text(
                                          'Flat ${req.flatNumber} (${req.buildingWing})',
                                          style: const TextStyle(
                                            fontSize: 11,
                                            fontWeight: FontWeight.w800,
                                            color: Color(0xFF0F172A),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  const SizedBox(width: 6),
                                  Expanded(
                                    child: Text(
                                      '• ${req.residentName}',
                                      style: const TextStyle(
                                        fontSize: 12,
                                        fontWeight: FontWeight.w600,
                                        color: Color(0xFF475569),
                                      ),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),

                    const SizedBox(height: 12),
                    const Divider(height: 1, color: Color(0xFFF1F5F9)),
                    const SizedBox(height: 10),

                    // Row 2: Purpose & Time | Status Pill
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        // Purpose & Clock
                        Row(
                          children: [
                            const Icon(Icons.access_time_rounded,
                                size: 14, color: Color(0xFF64748B)),
                            const SizedBox(width: 4),
                            Text(
                              timeFormatted,
                              style: const TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                                color: Color(0xFF64748B),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Container(
                              constraints: const BoxConstraints(maxWidth: 130),
                              child: Text(
                                '• ${req.purpose}',
                                style: const TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                  color: Color(0xFF475569),
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ),

                        // Status Badge
                        _buildStatusPill(req.status),
                      ],
                    ),

                    // Quick Action Helper for Guards
                    if (isApproved) ...[
                      const SizedBox(height: 10),
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.symmetric(
                            horizontal: 10, vertical: 6),
                        decoration: BoxDecoration(
                          color: const Color(0xFFECFDF5),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: const Color(0xFFA7F3D0)),
                        ),
                        child: const Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.check_circle_rounded,
                                size: 14, color: Color(0xFF047857)),
                            SizedBox(width: 6),
                            Text(
                              'Resident Approved • Tap to Allow Gate Entry',
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w800,
                                color: Color(0xFF047857),
                              ),
                            ),
                            SizedBox(width: 4),
                            Icon(Icons.arrow_forward_rounded,
                                size: 13, color: Color(0xFF047857)),
                          ],
                        ),
                      ),
                    ] else if (isPending) ...[
                      const SizedBox(height: 8),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.end,
                        children: [
                          Text(
                            'Waiting for resident response',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                              color: Colors.amber.shade800,
                            ),
                          ),
                          const SizedBox(width: 4),
                          Icon(Icons.chevron_right_rounded,
                              size: 16, color: Colors.amber.shade800),
                        ],
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  // Colored chip for Visitor Type (Delivery, Cab, Guest, etc.)
  Widget _buildVisitorTypeChip(VisitorType type) {
    Color bg;
    Color fg;

    switch (type) {
      case VisitorType.delivery:
        bg = const Color(0xFFFEF3C7);
        fg = const Color(0xFF92400E);
        break;
      case VisitorType.cab:
        bg = const Color(0xFFEDE9FE);
        fg = const Color(0xFF5B21B6);
        break;
      case VisitorType.maintenance:
        bg = const Color(0xFFE0F2FE);
        fg = const Color(0xFF0369A1);
        break;
      case VisitorType.guest:
      default:
        bg = const Color(0xFFEEF2FF);
        fg = const Color(0xFF3730A3);
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2.5),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        type.displayName,
        style: TextStyle(
          fontSize: 10.5,
          fontWeight: FontWeight.w800,
          color: fg,
          letterSpacing: 0.2,
        ),
      ),
    );
  }

  // High-contrast Status Pill
  Widget _buildStatusPill(VisitorStatus status) {
    Color bg;
    Color fg;
    Color border;
    IconData icon;
    String label;

    switch (status) {
      case VisitorStatus.pending:
        bg = const Color(0xFFFEF3C7);
        fg = const Color(0xFF92400E);
        border = const Color(0xFFFDE68A);
        icon = Icons.access_time_filled_rounded;
        label = 'Pending';
        break;
      case VisitorStatus.approved:
        bg = const Color(0xFFECFDF5);
        fg = const Color(0xFF047857);
        border = const Color(0xFFA7F3D0);
        icon = Icons.check_circle_rounded;
        label = 'Approved';
        break;
      case VisitorStatus.rejected:
        bg = const Color(0xFFFFF1F2);
        fg = const Color(0xFFBE123C);
        border = const Color(0xFFFECDD3);
        icon = Icons.cancel_rounded;
        label = 'Rejected';
        break;
      case VisitorStatus.completed:
        bg = const Color(0xFFF1F5F9);
        fg = const Color(0xFF334155);
        border = const Color(0xFFCBD5E1);
        icon = Icons.task_alt_rounded;
        label = 'Entered';
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3.5),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: border),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: fg),
          const SizedBox(width: 4),
          Text(
            label,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w800,
              color: fg,
            ),
          ),
        ],
      ),
    );
  }

  // Safe Photo Loader (supports local capture, CDN URL, backend endpoint, assets)
  Widget _buildPhoto(String? path) {
    return VisitorPhotoAvatar.buildImageWidget(path, size: 50);
  }

  // Details Modal Bottom Sheet
  void _showDetailsSheet(BuildContext context, VisitorRequest req) {
    final timeFormatted =
        DateFormat('hh:mm a, dd MMM yyyy').format(req.requestTime);
    final decisionTimeFormatted = req.decisionTime != null
        ? DateFormat('hh:mm a, dd MMM yyyy').format(req.decisionTime!)
        : null;

    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Center(
                  child: Container(
                    width: 40,
                    height: 5,
                    decoration: BoxDecoration(
                      color: const Color(0xFFE2E8F0),
                      borderRadius: BorderRadius.circular(999),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(12),
                      child: Container(
                        width: 54,
                        height: 54,
                        color: const Color(0xFFF1F5F9),
                        child: _buildPhoto(req.visitor.photoPath),
                      ),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            req.visitor.name,
                            style: const TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w900,
                              color: Color(0xFF0F172A),
                            ),
                          ),
                          const SizedBox(height: 3),
                          Text(
                            '${req.visitor.type.displayName}${req.visitor.phoneNumber != null ? " • ${req.visitor.phoneNumber!}" : ""}',
                            style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                              color: Color(0xFF64748B),
                            ),
                          ),
                        ],
                      ),
                    ),
                    _buildStatusPill(req.status),
                  ],
                ),
                const SizedBox(height: 16),
                const Divider(color: Color(0xFFE2E8F0)),
                const SizedBox(height: 12),
                _buildModalRow(
                    'Flat & Wing:', '${req.flatNumber} (${req.buildingWing})'),
                const SizedBox(height: 8),
                _buildModalRow(
                    'Resident:', '${req.residentName} (${req.residentPhone})'),
                const SizedBox(height: 8),
                _buildModalRow('Purpose:', req.purpose),
                if (req.visitor.vehicleNumber != null &&
                    req.visitor.vehicleNumber!.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  _buildModalRow('Vehicle:', req.visitor.vehicleNumber!),
                ],
                const SizedBox(height: 8),
                _buildModalRow('Request Time:', timeFormatted),
                if (decisionTimeFormatted != null) ...[
                  const SizedBox(height: 8),
                  _buildModalRow('Decision Time:', decisionTimeFormatted),
                ],
                if (req.decisionBy != null && req.decisionBy!.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  _buildModalRow('Decision By:', req.decisionBy!),
                ],
                if (req.rejectionReason != null &&
                    req.rejectionReason!.isNotEmpty) ...[
                  const SizedBox(height: 10),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFFF1F2),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: const Color(0xFFFECDD3)),
                    ),
                    child: Text(
                      'Reason: ${req.rejectionReason}',
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFFBE123C),
                      ),
                    ),
                  ),
                ],
                const SizedBox(height: 20),
                SizedBox(
                  width: double.infinity,
                  height: 50,
                  child: ElevatedButton(
                    onPressed: () => Navigator.of(context).pop(),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF0F172A),
                      foregroundColor: Colors.white,
                      elevation: 0,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                    ),
                    child: const Text(
                      'CLOSE',
                      style:
                          TextStyle(fontWeight: FontWeight.w800, fontSize: 14),
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildModalRow(String label, String value) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: 110,
          child: Text(
            label,
            style: const TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w700,
              color: Color(0xFF64748B),
            ),
          ),
        ),
        Expanded(
          child: Text(
            value,
            style: const TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w800,
              color: Color(0xFF0F172A),
            ),
          ),
        ),
      ],
    );
  }
}
