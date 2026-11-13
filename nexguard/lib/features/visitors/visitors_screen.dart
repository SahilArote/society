import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../core/constants/app_colors.dart';
import '../../core/widgets/visitor_photo_avatar.dart';
import '../../models/visitor.dart';
import '../../models/visitor_request.dart';
import '../../repositories/guard_repository.dart';
import '../../repositories/visitor_repository.dart';

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

class _VisitorsScreenState extends State<VisitorsScreen> {
  int _selectedTabIndex = 1; // Default to Approved tab
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';
  bool _isRefreshing = false;
  final Set<String> _processingEntryIds = {};

  static const List<Map<String, Color>> _avatarColorPalette = [
    {'bg': Color(0xFFEEF0FF), 'text': Color(0xFF3A3FB5)},
    {'bg': Color(0xFFFDE7C3), 'text': Color(0xFF8A4B00)},
    {'bg': Color(0xFFE0F2FE), 'text': Color(0xFF075985)},
  ];

  @override
  void dispose() {
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

  Future<void> _handleAllowEntry(VisitorRequest req) async {
    if (_processingEntryIds.contains(req.id)) return;
    setState(() => _processingEntryIds.add(req.id));
    try {
      await widget.visitorRepo.completeEntry(req.id);
    } catch (_) {
    } finally {
      if (mounted) {
        setState(() => _processingEntryIds.remove(req.id));
      }
    }
  }

  Future<void> _handleGuardApprove(VisitorRequest req) async {
    if (_processingEntryIds.contains(req.id)) return;
    setState(() => _processingEntryIds.add(req.id));
    try {
      await widget.visitorRepo.simulateResidentDecision(
        requestId: req.id,
        isApproved: true,
      );
    } catch (_) {
    } finally {
      if (mounted) {
        setState(() => _processingEntryIds.remove(req.id));
      }
    }
  }

  Future<void> _handleGuardReject(VisitorRequest req) async {
    if (_processingEntryIds.contains(req.id)) return;
    setState(() => _processingEntryIds.add(req.id));
    try {
      await widget.visitorRepo.simulateResidentDecision(
        requestId: req.id,
        isApproved: false,
        reason: 'Denied by Guard at gate',
      );
    } catch (_) {
    } finally {
      if (mounted) {
        setState(() => _processingEntryIds.remove(req.id));
      }
    }
  }

  Future<void> _handleMarkExit(VisitorRequest req) async {
    if (_processingEntryIds.contains(req.id)) return;
    setState(() => _processingEntryIds.add(req.id));
    try {
      await widget.visitorRepo.markExit(req.id);
    } catch (_) {
    } finally {
      if (mounted) {
        setState(() => _processingEntryIds.remove(req.id));
      }
    }
  }

  List<VisitorRequest> _filterList(List<VisitorRequest> source) {
    final List<VisitorRequest> list;
    if (_searchQuery.isEmpty) {
      list = List<VisitorRequest>.from(source);
    } else {
      final query = _searchQuery.toLowerCase();
      list = source.where((r) {
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
    // Always sort descending by requestTime: newest on top
    list.sort((a, b) => b.requestTime.compareTo(a.requestTime));
    return list;
  }

  String _getInitials(String name) {
    final parts = name.trim().split(RegExp(r'\s+'));
    if (parts.isEmpty || parts[0].isEmpty) return 'V';
    if (parts.length == 1) return parts[0][0].toUpperCase();
    return '${parts[0][0]}${parts[parts.length - 1][0]}'.toUpperCase();
  }

  void _showPhotoZoomDialog(
      BuildContext context, String? photoPath, String visitorName) {
    if (photoPath == null || photoPath.trim().isEmpty) return;

    showDialog(
      context: context,
      barrierColor: Colors.black.withOpacity(0.85),
      builder: (dlgCtx) => Dialog(
        backgroundColor: Colors.transparent,
        insetPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Text(
                    visitorName,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                      fontFamily: 'Inter',
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.close_rounded,
                      color: Colors.white, size: 28),
                  onPressed: () => Navigator.of(dlgCtx).pop(),
                ),
              ],
            ),
            const SizedBox(height: 8),
            ClipRRect(
              borderRadius: BorderRadius.circular(16),
              child: Container(
                constraints: BoxConstraints(
                  maxHeight: MediaQuery.of(context).size.height * 0.7,
                  maxWidth: MediaQuery.of(context).size.width,
                ),
                color: Colors.black,
                child: InteractiveViewer(
                  panEnabled: true,
                  minScale: 0.8,
                  maxScale: 4.0,
                  child: VisitorPhotoAvatar.buildImageWidget(
                    photoPath,
                    size: null,
                    fit: BoxFit.contain,
                  ),
                ),
              ),
            ),
            const SizedBox(height: 12),
            const Text(
              'Pinch to zoom in / out',
              style: TextStyle(
                color: Colors.white70,
                fontSize: 12,
                fontWeight: FontWeight.w500,
                fontFamily: 'Inter',
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showFullDetailsModal(VisitorRequest req) {
    final timeFormatted =
        DateFormat('hh:mm a, dd MMM yyyy').format(req.requestTime);
    final decisionTimeFormatted = req.decisionTime != null
        ? DateFormat('hh:mm a, dd MMM yyyy').format(req.decisionTime!)
        : null;
    final entryTimeFormatted = (req.status == VisitorStatus.completed ||
            req.status == VisitorStatus.exited)
        ? (req.decisionTime != null
            ? DateFormat('hh:mm a, dd MMM yyyy').format(req.decisionTime!)
            : DateFormat('hh:mm a, dd MMM yyyy').format(req.requestTime))
        : null;
    final exitTimeFormatted = req.exitTime != null
        ? DateFormat('hh:mm a, dd MMM yyyy').format(req.exitTime!)
        : null;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (sheetCtx) {
        return StatefulBuilder(
          builder: (modalCtx, setModalState) {
            final isProc = _processingEntryIds.contains(req.id);
            return SafeArea(
              child: SingleChildScrollView(
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
                          color: const Color(0xFFCBD5E1),
                          borderRadius: BorderRadius.circular(999),
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    // Header row: Photo (clickable), Name, details, status
                    Row(
                      children: [
                        GestureDetector(
                          onTap: () {
                            if (req.visitor.photoPath != null &&
                                req.visitor.photoPath!.isNotEmpty) {
                              _showPhotoZoomDialog(
                                  context, req.visitor.photoPath, req.visitor.name);
                            }
                          },
                          child: Stack(
                            children: [
                              ClipRRect(
                                borderRadius: BorderRadius.circular(16),
                                child: Container(
                                  width: 58,
                                  height: 58,
                                  color: const Color(0xFFEEF2FF),
                                  alignment: Alignment.center,
                                  child: (req.visitor.photoPath != null &&
                                          req.visitor.photoPath!.isNotEmpty)
                                      ? VisitorPhotoAvatar.buildImageWidget(
                                          req.visitor.photoPath,
                                          size: 58,
                                        )
                                      : Text(
                                          _getInitials(req.visitor.name),
                                          style: const TextStyle(
                                            fontSize: 22,
                                            fontWeight: FontWeight.bold,
                                            color: AppColors.primary,
                                          ),
                                        ),
                                ),
                              ),
                              if (req.visitor.photoPath != null &&
                                  req.visitor.photoPath!.isNotEmpty)
                                Positioned(
                                  right: 2,
                                  bottom: 2,
                                  child: Container(
                                    padding: const EdgeInsets.all(3),
                                    decoration: const BoxDecoration(
                                      color: Colors.black87,
                                      shape: BoxShape.circle,
                                    ),
                                    child: const Icon(
                                      Icons.zoom_in,
                                      size: 13,
                                      color: Colors.white,
                                    ),
                                  ),
                                ),
                            ],
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
                                  fontWeight: FontWeight.bold,
                                  color: Color(0xFF0F172A),
                                  fontFamily: 'Inter',
                                ),
                              ),
                              const SizedBox(height: 3),
                              Text(
                                '${req.visitor.type.displayName}${req.visitor.phoneNumber != null ? " · ${req.visitor.phoneNumber!}" : ""}',
                                style: const TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w500,
                                  color: Color(0xFF64748B),
                                  fontFamily: 'Inter',
                                ),
                              ),
                            ],
                          ),
                        ),
                        _buildStatusPill(req.status),
                      ],
                    ),
                    const SizedBox(height: 16),
                    const Divider(color: Color(0xFFE2E8F0), height: 1),
                    const SizedBox(height: 12),
                    _buildModalRow(
                        'Flat & Wing:', '${req.flatNumber} (${req.buildingWing})'),
                    const SizedBox(height: 8),
                    _buildModalRow(
                        'Resident:', '${req.residentName} (${req.residentPhone})'),
                    const SizedBox(height: 8),
                    _buildModalRow('Purpose:', req.purpose),
                    if (req.visitor.deliveryCompany != null &&
                        req.visitor.deliveryCompany!.isNotEmpty) ...[
                      const SizedBox(height: 8),
                      _buildModalRow('Company:', req.visitor.deliveryCompany!),
                    ],
                    if (req.visitor.vehicleNumber != null &&
                        req.visitor.vehicleNumber!.isNotEmpty) ...[
                      const SizedBox(height: 8),
                      _buildModalRow('Vehicle Number:', req.visitor.vehicleNumber!),
                    ],
                    const SizedBox(height: 8),
                    _buildModalRow('Request Time:', timeFormatted),
                    if (decisionTimeFormatted != null) ...[
                      const SizedBox(height: 8),
                      _buildModalRow('Decision Time:', decisionTimeFormatted),
                    ],
                    if (entryTimeFormatted != null) ...[
                      const SizedBox(height: 8),
                      _buildModalRow('Entry Time:', entryTimeFormatted),
                    ],
                    if (exitTimeFormatted != null) ...[
                      const SizedBox(height: 8),
                      _buildModalRow('Exit Time:', exitTimeFormatted),
                    ],
                    if (req.decisionBy != null && req.decisionBy!.isNotEmpty) ...[
                      const SizedBox(height: 8),
                      _buildModalRow('Action By:', req.decisionBy!),
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
                          'Rejection Reason: ${req.rejectionReason!}',
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: Color(0xFFBE123C),
                            fontFamily: 'Inter',
                          ),
                        ),
                      ),
                    ],
                    const SizedBox(height: 20),

                    // Actions Inside Modal
                    if (req.status == VisitorStatus.pending) ...[
                      Row(
                        children: [
                          Expanded(
                            child: SizedBox(
                              height: 46,
                              child: OutlinedButton.icon(
                                onPressed: isProc
                                    ? null
                                    : () async {
                                        Navigator.pop(sheetCtx);
                                        await _handleGuardReject(req);
                                      },
                                icon: const Icon(Icons.close_rounded,
                                    size: 18, color: Color(0xFFDC2626)),
                                label: const Text(
                                  'Reject',
                                  style: TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w700,
                                    color: Color(0xFFDC2626),
                                  ),
                                ),
                                style: OutlinedButton.styleFrom(
                                  side: const BorderSide(
                                      color: Color(0xFFFCA5A5), width: 1.2),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: SizedBox(
                              height: 46,
                              child: ElevatedButton.icon(
                                onPressed: isProc
                                    ? null
                                    : () async {
                                        Navigator.pop(sheetCtx);
                                        await _handleGuardApprove(req);
                                      },
                                icon: const Icon(Icons.check_rounded,
                                    size: 18, color: Colors.white),
                                label: const Text(
                                  'Approve',
                                  style: TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w700,
                                    color: Colors.white,
                                  ),
                                ),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: const Color(0xFF16A34A),
                                  foregroundColor: Colors.white,
                                  elevation: 0,
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),
                    ] else if (req.status == VisitorStatus.approved) ...[
                      SizedBox(
                        width: double.infinity,
                        height: 48,
                        child: ElevatedButton.icon(
                          onPressed: isProc
                              ? null
                              : () async {
                                  Navigator.pop(sheetCtx);
                                  await _handleAllowEntry(req);
                                },
                          icon: const Icon(Icons.door_sliding_rounded,
                              size: 20, color: Colors.white),
                          label: const Text(
                            'Allow Gate Entry',
                            style: TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w800,
                              color: Colors.white,
                              letterSpacing: 0.3,
                            ),
                          ),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF059669),
                            foregroundColor: Colors.white,
                            elevation: 0,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(14),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 10),
                    ] else if (req.status == VisitorStatus.completed) ...[
                      SizedBox(
                        width: double.infinity,
                        height: 48,
                        child: ElevatedButton.icon(
                          onPressed: isProc
                              ? null
                              : () async {
                                  Navigator.pop(sheetCtx);
                                  await _handleMarkExit(req);
                                },
                          icon: const Icon(Icons.logout_rounded,
                              size: 18, color: Colors.white),
                          label: const Text(
                            'Log Visitor Exit',
                            style: TextStyle(
                              fontSize: 14.5,
                              fontWeight: FontWeight.w800,
                              color: Colors.white,
                            ),
                          ),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF0F172A),
                            foregroundColor: Colors.white,
                            elevation: 0,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(14),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 10),
                    ],

                    SizedBox(
                      width: double.infinity,
                      height: 44,
                      child: TextButton(
                        onPressed: () => Navigator.of(sheetCtx).pop(),
                        style: TextButton.styleFrom(
                          backgroundColor: const Color(0xFFF1F5F9),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        child: const Text(
                          'Close',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w700,
                            color: Color(0xFF475569),
                            fontFamily: 'Inter',
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.pageBackground, // #F5F7FB
      body: SafeArea(
        child: AnimatedBuilder(
          animation: widget.visitorRepo,
          builder: (context, _) {
            final pending = widget.visitorRepo.pendingRequests;
            final approved = widget.visitorRepo.approvedRequests;
            final inside = widget.visitorRepo.completedRequests;

            final pendingCount = pending.length;
            final approvedCount = approved.length;
            final insideCount = inside.length;

            final List<VisitorRequest> currentList;
            if (_selectedTabIndex == 0) {
              currentList = _filterList(pending);
            } else if (_selectedTabIndex == 1) {
              currentList = _filterList(approved);
            } else {
              currentList = _filterList(inside);
            }

            return Column(
              children: [
                // Top Header Block
                Container(
                  decoration: const BoxDecoration(
                    color: Colors.white,
                    border: Border(
                      bottom: BorderSide(color: Color(0xFFE2E8F0), width: 1.0),
                    ),
                  ),
                  padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Header Row
                      Row(
                        children: [
                          Container(
                            width: 44,
                            height: 44,
                            decoration: BoxDecoration(
                              color: const Color(0xFFEEF2FF),
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(color: const Color(0xFFE0E7FF)),
                            ),
                            alignment: Alignment.center,
                            child: const Icon(
                              Icons.group_rounded,
                              size: 22,
                              color: Color(0xFF4F46E5),
                            ),
                          ),
                          const SizedBox(width: 12),
                          // Title & Live queue subtitle
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Text(
                                  'Gate Visitors',
                                  style: TextStyle(
                                    fontSize: 20,
                                    fontWeight: FontWeight.w800,
                                    color: Color(0xFF0F172A),
                                    letterSpacing: -0.3,
                                  ),
                                ),
                                const SizedBox(height: 3),
                                Row(
                                  children: [
                                    Container(
                                      width: 8,
                                      height: 8,
                                      decoration: const BoxDecoration(
                                        color: Color(0xFF16A34A),
                                        shape: BoxShape.circle,
                                      ),
                                    ),
                                    const SizedBox(width: 6),
                                    const Text(
                                      'Live queue · Updated just now',
                                      style: TextStyle(
                                        fontSize: 13,
                                        fontWeight: FontWeight.normal,
                                        color: Color(0xFF64748B),
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                          // Sync button
                          Material(
                            color: Colors.transparent,
                            child: InkWell(
                              onTap: _handleRefresh,
                              borderRadius: BorderRadius.circular(14),
                              child: Container(
                                width: 44,
                                height: 44,
                                decoration: BoxDecoration(
                                  color: Colors.white,
                                  borderRadius: BorderRadius.circular(14),
                                  border: Border.all(color: const Color(0xFFE2E8F0)),
                                ),
                                alignment: Alignment.center,
                                child: _isRefreshing
                                    ? const SizedBox(
                                        width: 18,
                                        height: 18,
                                        child: CircularProgressIndicator(
                                          strokeWidth: 2,
                                          valueColor:
                                              AlwaysStoppedAnimation<Color>(
                                                  Color(0xFF334155)),
                                        ),
                                      )
                                    : const Icon(
                                        Icons.refresh_rounded,
                                        size: 20,
                                        color: Color(0xFF334155),
                                      ),
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),

                      // Search Bar
                      Container(
                        height: 44,
                        decoration: BoxDecoration(
                          color: const Color(0xFFF1F5F9),
                          borderRadius: BorderRadius.circular(14),
                        ),
                        child: TextField(
                          controller: _searchController,
                          onChanged: (val) =>
                              setState(() => _searchQuery = val.trim()),
                          style: const TextStyle(
                            fontSize: 15,
                            color: Color(0xFF0F172A),
                          ),
                          decoration: InputDecoration(
                            hintText: 'Search name, flat or phone',
                            hintStyle: const TextStyle(
                              fontSize: 15,
                              color: Color(0xFF94A3B8),
                            ),
                            prefixIcon: const Icon(
                              Icons.search_rounded,
                              size: 20,
                              color: Color(0xFF94A3B8),
                            ),
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
                            border: InputBorder.none,
                            contentPadding:
                                const EdgeInsets.symmetric(vertical: 12),
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),

                      // Segmented Tabs
                      Container(
                        height: 48,
                        padding: const EdgeInsets.all(4),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF1F5F9),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: const Color(0xFFE2E8F0)),
                        ),
                        child: Row(
                          children: [
                            _buildSegmentedTab(
                              index: 0,
                              label: 'Pending',
                              count: pendingCount,
                              selectedBadgeBg: const Color(0xFFFEF3C7),
                              selectedBadgeText: const Color(0xFFB45309),
                              unselectedBadgeBg:
                                  const Color(0xFFFDE68A).withOpacity(0.5),
                              unselectedBadgeText: const Color(0xFFD97706),
                            ),
                            _buildSegmentedTab(
                              index: 1,
                              label: 'At Gate',
                              count: approvedCount,
                              selectedBadgeBg: const Color(0xFFDCFCE7),
                              selectedBadgeText: const Color(0xFF15803D),
                              unselectedBadgeBg:
                                  const Color(0xFFBBF7D0).withOpacity(0.5),
                              unselectedBadgeText: const Color(0xFF16A34A),
                            ),
                            _buildSegmentedTab(
                              index: 2,
                              label: 'Inside',
                              count: insideCount,
                              selectedBadgeBg: const Color(0xFFDBEAFE),
                              selectedBadgeText: const Color(0xFF1D4ED8),
                              unselectedBadgeBg:
                                  const Color(0xFFBFDBFE).withOpacity(0.5),
                              unselectedBadgeText: const Color(0xFF2563EB),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),

                // Visitor List
                Expanded(
                  child: RefreshIndicator(
                    onRefresh: _handleRefresh,
                    color: AppColors.primary,
                    child: currentList.isEmpty
                        ? _buildEmptyState()
                        : ListView.separated(
                            physics: const AlwaysScrollableScrollPhysics(
                              parent: BouncingScrollPhysics(),
                            ),
                            padding: const EdgeInsets.fromLTRB(16, 14, 16, 24),
                            itemCount: currentList.length,
                            separatorBuilder: (_, __) =>
                                const SizedBox(height: 12),
                            itemBuilder: (context, index) {
                              return _buildVisitorCard(
                                  currentList[index], index);
                            },
                          ),
                  ),
                ),
              ],
            );
          },
        ),
      ),
    );
  }

  Widget _buildSegmentedTab({
    required int index,
    required String label,
    required int count,
    required Color selectedBadgeBg,
    required Color selectedBadgeText,
    required Color unselectedBadgeBg,
    required Color unselectedBadgeText,
  }) {
    final bool isSelected = _selectedTabIndex == index;

    return Expanded(
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: () => setState(() => _selectedTabIndex = index),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          curve: Curves.easeInOut,
          height: 40,
          decoration: BoxDecoration(
            color: isSelected ? Colors.white : Colors.transparent,
            borderRadius: BorderRadius.circular(12),
            boxShadow: isSelected
                ? const [
                    BoxShadow(
                      color: Color.fromRGBO(16, 24, 40, 0.06),
                      blurRadius: 6,
                      offset: Offset(0, 2),
                    ),
                  ]
                : null,
          ),
          alignment: Alignment.center,
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                label,
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                  color: isSelected
                      ? const Color(0xFF0F172A)
                      : const Color(0xFF64748B),
                ),
              ),
              const SizedBox(width: 6),
              Container(
                constraints: const BoxConstraints(minWidth: 20),
                height: 20,
                padding: const EdgeInsets.symmetric(horizontal: 6),
                decoration: BoxDecoration(
                  color: isSelected ? selectedBadgeBg : unselectedBadgeBg,
                  borderRadius: BorderRadius.circular(10),
                ),
                alignment: Alignment.center,
                child: Text(
                  '$count',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w800,
                    color: isSelected
                        ? selectedBadgeText
                        : unselectedBadgeText,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    final IconData emptyIcon;
    final String emptyTitle;
    final String emptySubtitle;

    if (_selectedTabIndex == 0) {
      emptyIcon = Icons.hourglass_empty_rounded;
      emptyTitle = 'No Pending Requests';
      emptySubtitle = 'All visitor requests have been addressed.';
    } else if (_selectedTabIndex == 1) {
      emptyIcon = Icons.meeting_room_rounded;
      emptyTitle = 'Gate Barrier Clear';
      emptySubtitle = 'No approved visitors waiting at the gate barrier.';
    } else {
      emptyIcon = Icons.domain_rounded;
      emptyTitle = 'No Visitors Inside';
      emptySubtitle = 'All checked-in visitors have logged out of the campus.';
    }

    return ListView(
      physics: const AlwaysScrollableScrollPhysics(
        parent: BouncingScrollPhysics(),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 64),
      children: [
        Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 64,
                height: 64,
                decoration: const BoxDecoration(
                  color: Color(0xFFF1F5F9),
                  shape: BoxShape.circle,
                ),
                alignment: Alignment.center,
                child: Icon(
                  emptyIcon,
                  size: 32,
                  color: const Color(0xFF94A3B8),
                ),
              ),
              const SizedBox(height: 16),
              Text(
                emptyTitle,
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: Color(0xFF0F172A),
                  fontFamily: 'Inter',
                ),
              ),
              const SizedBox(height: 6),
              Text(
                emptySubtitle,
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w500,
                  color: Color(0xFF64748B),
                  fontFamily: 'Inter',
                ),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildVisitorCard(VisitorRequest req, int index) {
    final timeFormatted = DateFormat('hh:mm a').format(req.requestTime);
    final isPending = req.status == VisitorStatus.pending;
    final isApproved = req.status == VisitorStatus.approved;
    final isCompleted = req.status == VisitorStatus.completed;
    final isExited = req.status == VisitorStatus.exited;
    final isRejected = req.status == VisitorStatus.rejected;
    final isProcessing = _processingEntryIds.contains(req.id);

    final palette = _avatarColorPalette[index % _avatarColorPalette.length];
    final initials = _getInitials(req.visitor.name);

    final wingText = req.buildingWing.toLowerCase().contains('tower') ||
            req.buildingWing.toLowerCase().contains('wing')
        ? req.buildingWing
        : 'Tower ${req.buildingWing}';
    final subDetails =
        'Flat ${req.flatNumber} · $wingText · Host ${req.residentName}';

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFE2E8F0), width: 1.0),
        boxShadow: const [
          BoxShadow(
            color: Color.fromRGBO(16, 24, 40, 0.04),
            blurRadius: 10,
            offset: Offset(0, 3),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(20),
        child: InkWell(
          borderRadius: BorderRadius.circular(20),
          onTap: () => _showFullDetailsModal(req),
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Row 1: Avatar (clickable to zoom), Name & Details, Time & Status Pill
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Clickable Avatar for photo zoom
                    GestureDetector(
                      onTap: () {
                        if (req.visitor.photoPath != null &&
                            req.visitor.photoPath!.isNotEmpty) {
                          _showPhotoZoomDialog(
                              context, req.visitor.photoPath, req.visitor.name);
                        } else {
                          _showFullDetailsModal(req);
                        }
                      },
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(16),
                        child: Container(
                          width: 50,
                          height: 50,
                          color: palette['bg'],
                          alignment: Alignment.center,
                          child: (req.visitor.photoPath != null &&
                                  req.visitor.photoPath!.trim().isNotEmpty)
                              ? VisitorPhotoAvatar.buildImageWidget(
                                  req.visitor.photoPath,
                                  size: 50,
                                )
                              : Text(
                                  initials,
                                  style: TextStyle(
                                    fontSize: 19,
                                    fontWeight: FontWeight.w700,
                                    color: palette['text'],
                                  ),
                                ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    // Name & Details
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            req.visitor.name,
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w700,
                              color: Color(0xFF0F172A),
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          const SizedBox(height: 3),
                          Text(
                            subDetails,
                            style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w500,
                              color: Color(0xFF64748B),
                              height: 1.25,
                            ),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                    // Time & Status Pill
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(
                          timeFormatted,
                          style: const TextStyle(
                            fontSize: 12.5,
                            fontWeight: FontWeight.w600,
                            color: Color(0xFF64748B),
                          ),
                        ),
                        const SizedBox(height: 8),
                        _buildStatusPill(req.status),
                      ],
                    ),
                  ],
                ),

                const SizedBox(height: 10),

                // Row 2: "Guest" chip + status note
                Row(
                  children: [
                    Container(
                      height: 24,
                      padding: const EdgeInsets.symmetric(horizontal: 10),
                      decoration: BoxDecoration(
                        color: const Color(0xFFEEF2FF),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      alignment: Alignment.center,
                      child: Text(
                        req.visitor.type.displayName,
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          color: Color(0xFF4F46E5),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        isApproved
                            ? 'Approved by resident · Ready for gate entry'
                            : (isPending
                                ? 'Waiting for resident approval'
                                : (isRejected
                                    ? 'Denied at gate'
                                    : (isExited
                                        ? 'Checked out from society'
                                        : 'Currently inside · Entered at ${DateFormat('hh:mm a').format(req.decisionTime ?? req.requestTime)}'))),
                        style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.normal,
                          color: Color(0xFF64748B),
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 12),

                // Row 3: Action Buttons or Status
                if (isPending) ...[
                  Row(
                    children: [
                      Expanded(
                        child: SizedBox(
                          height: 42,
                          child: OutlinedButton.icon(
                            onPressed: isProcessing
                                ? null
                                : () => _handleGuardReject(req),
                            icon: const Icon(Icons.close_rounded,
                                size: 18, color: Color(0xFFDC2626)),
                            label: const Text(
                              'Reject',
                              style: TextStyle(
                                fontSize: 13.5,
                                fontWeight: FontWeight.w700,
                                color: Color(0xFFDC2626),
                              ),
                            ),
                            style: OutlinedButton.styleFrom(
                              side: const BorderSide(
                                  color: Color(0xFFFCA5A5), width: 1.2),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: SizedBox(
                          height: 42,
                          child: ElevatedButton.icon(
                            onPressed: isProcessing
                                ? null
                                : () => _handleGuardApprove(req),
                            icon: const Icon(Icons.check_rounded,
                                size: 18, color: Colors.white),
                            label: const Text(
                              'Approve',
                              style: TextStyle(
                                fontSize: 13.5,
                                fontWeight: FontWeight.w700,
                                color: Colors.white,
                              ),
                            ),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF16A34A),
                              foregroundColor: Colors.white,
                              elevation: 0,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ] else if (isApproved) ...[
                  SizedBox(
                    width: double.infinity,
                    height: 46,
                    child: ElevatedButton(
                      onPressed:
                          isProcessing ? null : () => _handleAllowEntry(req),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF059669),
                        foregroundColor: Colors.white,
                        elevation: 0,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                        ),
                      ),
                      child: isProcessing
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                valueColor:
                                    AlwaysStoppedAnimation<Color>(Colors.white),
                              ),
                            )
                          : const Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(
                                  Icons.door_sliding_rounded,
                                  size: 19,
                                  color: Colors.white,
                                ),
                                SizedBox(width: 8),
                                Text(
                                  'Allow Gate Entry',
                                  style: TextStyle(
                                    fontSize: 14.5,
                                    fontWeight: FontWeight.w800,
                                    color: Colors.white,
                                    letterSpacing: 0.2,
                                  ),
                                ),
                              ],
                            ),
                    ),
                  ),
                ] else if (isCompleted) ...[
                  SizedBox(
                    width: double.infinity,
                    height: 44,
                    child: ElevatedButton.icon(
                      onPressed:
                          isProcessing ? null : () => _handleMarkExit(req),
                      icon: const Icon(Icons.logout_rounded,
                          size: 18, color: Colors.white),
                      label: const Text(
                        'Log Visitor Exit',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                          color: Colors.white,
                          letterSpacing: 0.2,
                        ),
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF0F172A),
                        foregroundColor: Colors.white,
                        elevation: 0,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                    ),
                  ),
                ] else if (isExited) ...[
                  Container(
                    width: double.infinity,
                    padding:
                        const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF1F5F9),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.logout_rounded,
                            size: 15, color: Color(0xFF64748B)),
                        const SizedBox(width: 6),
                        Text(
                          'Exited at ${DateFormat('hh:mm a').format(req.exitTime ?? DateTime.now())}',
                          style: const TextStyle(
                            fontSize: 12.5,
                            fontWeight: FontWeight.w700,
                            color: Color(0xFF475569),
                          ),
                        ),
                      ],
                    ),
                  ),
                ] else ...[
                  Container(
                    width: double.infinity,
                    padding:
                        const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFFF1F2),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: const Color(0xFFFECDD3)),
                    ),
                    child: const Row(
                      children: [
                        Icon(Icons.cancel_rounded,
                            size: 15, color: Color(0xFFDC2626)),
                        SizedBox(width: 6),
                        Text(
                          'Entry denied at gate',
                          style: TextStyle(
                            fontSize: 12.5,
                            fontWeight: FontWeight.w600,
                            color: Color(0xFFBE123C),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildStatusPill(VisitorStatus status) {
    if (status == VisitorStatus.approved || status == VisitorStatus.completed) {
      final isCompleted = status == VisitorStatus.completed;
      return Container(
        height: 26,
        padding: const EdgeInsets.symmetric(horizontal: 10),
        decoration: BoxDecoration(
          color: isCompleted ? const Color(0xFFEFF6FF) : const Color(0xFFDCFCE7),
          borderRadius: BorderRadius.circular(13),
          border: Border.all(
              color: isCompleted
                  ? const Color(0xFFBFDBFE)
                  : const Color(0xFFBBF7D0)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              isCompleted
                  ? Icons.domain_rounded
                  : Icons.check_circle_rounded,
              size: 14,
              color: isCompleted
                  ? const Color(0xFF1D4ED8)
                  : const Color(0xFF15803D),
            ),
            const SizedBox(width: 4),
            Text(
              isCompleted ? 'Inside' : 'Approved',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w700,
                color: isCompleted
                    ? const Color(0xFF1D4ED8)
                    : const Color(0xFF15803D),
              ),
            ),
          ],
        ),
      );
    } else if (status == VisitorStatus.exited) {
      return Container(
        height: 26,
        padding: const EdgeInsets.symmetric(horizontal: 10),
        decoration: BoxDecoration(
          color: const Color(0xFFF1F5F9),
          borderRadius: BorderRadius.circular(13),
          border: Border.all(color: const Color(0xFFCBD5E1)),
        ),
        child: const Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.logout_rounded,
              size: 13,
              color: Color(0xFF475569),
            ),
            SizedBox(width: 4),
            Text(
              'Exited',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w700,
                color: Color(0xFF475569),
              ),
            ),
          ],
        ),
      );
    } else if (status == VisitorStatus.rejected) {
      return Container(
        height: 26,
        padding: const EdgeInsets.symmetric(horizontal: 10),
        decoration: BoxDecoration(
          color: const Color(0xFFFEE2E2),
          borderRadius: BorderRadius.circular(13),
          border: Border.all(color: const Color(0xFFFECACA)),
        ),
        child: const Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.cancel_rounded,
              size: 14,
              color: Color(0xFFB91C1C),
            ),
            SizedBox(width: 4),
            Text(
              'Rejected',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w700,
                color: Color(0xFFB91C1C),
              ),
            ),
          ],
        ),
      );
    } else {
      return Container(
        height: 26,
        padding: const EdgeInsets.symmetric(horizontal: 10),
        decoration: BoxDecoration(
          color: const Color(0xFFFEF3C7),
          borderRadius: BorderRadius.circular(13),
          border: Border.all(color: const Color(0xFFFDE68A)),
        ),
        alignment: Alignment.center,
        child: const Text(
          'Waiting',
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w700,
            color: Color(0xFFB45309),
          ),
        ),
      );
    }
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
              color: AppColors.textMuted,
              fontFamily: 'Inter',
            ),
          ),
        ),
        Expanded(
          child: Text(
            value,
            style: const TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w800,
              color: AppColors.textPrimary,
              fontFamily: 'Inter',
            ),
          ),
        ),
      ],
    );
  }
}
