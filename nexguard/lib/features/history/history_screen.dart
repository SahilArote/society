import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../core/constants/app_colors.dart';
import '../../core/widgets/visitor_photo_avatar.dart';
import '../../models/visitor_request.dart';
import '../../repositories/visitor_repository.dart';

/// Guard App - Visitor Logs / History Screen
/// Matches the reference design pixel-by-pixel.
class HistoryScreen extends StatefulWidget {
  final VisitorRepository visitorRepo;

  const HistoryScreen({super.key, required this.visitorRepo});

  @override
  State<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends State<HistoryScreen> {
  final TextEditingController _searchController = TextEditingController();
  VisitorStatus? _selectedStatusFilter;
  DateTime? _selectedDateFilter;
  DateTime _displayedDate = DateTime.now();
  String _searchQuery = '';
  bool _isRefreshing = false;

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

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedDateFilter ?? _displayedDate,
      firstDate: DateTime(2023),
      lastDate: DateTime(2030),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: const ColorScheme.light(
              primary: AppColors.primary,
              onPrimary: Colors.white,
              onSurface: AppColors.textPrimary,
            ),
            textButtonTheme: TextButtonThemeData(
              style: TextButton.styleFrom(
                foregroundColor: AppColors.primary,
              ),
            ),
          ),
          child: child!,
        );
      },
    );

    if (picked != null) {
      setState(() {
        _selectedDateFilter = picked;
        _displayedDate = picked;
      });
    }
  }

  void _resetFilters() {
    _searchController.clear();
    setState(() {
      _searchQuery = '';
      _selectedStatusFilter = null;
      _selectedDateFilter = null;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.pageBackground, // #F5F7FB
      body: SafeArea(
        child: AnimatedBuilder(
          animation: widget.visitorRepo,
          builder: (context, _) {
            // Apply filtering: query, status, and optional date
            var filteredList = widget.visitorRepo.filterHistory(
              query: _searchQuery,
              status: _selectedStatusFilter,
            );

            // Additional phone query filter if not caught by repo
            if (_searchQuery.isNotEmpty) {
              final q = _searchQuery.toLowerCase();
              filteredList = filteredList.where((r) {
                final matchName = r.visitor.name.toLowerCase().contains(q);
                final matchFlat = r.flatNumber.toLowerCase().contains(q);
                final matchPhone = r.visitor.phoneNumber != null &&
                    r.visitor.phoneNumber!.toLowerCase().contains(q);
                return matchName || matchFlat || matchPhone;
              }).toList();
            }

            // Date filtering if guard selected a date
            if (_selectedDateFilter != null) {
              filteredList = filteredList.where((r) {
                return r.requestTime.year == _selectedDateFilter!.year &&
                    r.requestTime.month == _selectedDateFilter!.month &&
                    r.requestTime.day == _selectedDateFilter!.day;
              }).toList();
            }

            // Always sort newest requests first
            filteredList.sort((a, b) => b.requestTime.compareTo(a.requestTime));

            return Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // 1. TOP BLOCK (padding 16 16 12, column gap 12, 1px bottom border #E4E8F0)
                _buildTopBlock(),

                // 2. COUNT ROW (padding 14 16 10, space-between, 14px, muted)
                _buildCountRow(filteredList.length),

                // 3. LIST (padding 0 16, column gap 10, scrollable)
                Expanded(
                  child: RefreshIndicator(
                    onRefresh: _handleRefresh,
                    color: AppColors.primary,
                    backgroundColor: Colors.white,
                    child: _isRefreshing
                        ? _buildLoadingSkeletons()
                        : filteredList.isEmpty
                            ? _buildEmptyState()
                            : ListView.separated(
                                physics: const AlwaysScrollableScrollPhysics(),
                                padding:
                                    const EdgeInsets.fromLTRB(16, 0, 16, 16),
                                itemCount: filteredList.length,
                                separatorBuilder: (_, __) =>
                                    const SizedBox(height: 10),
                                itemBuilder: (context, index) {
                                  return _buildLogCard(filteredList[index]);
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

  // 1. TOP BLOCK
  Widget _buildTopBlock() {
    return Container(
      decoration: const BoxDecoration(
        color: AppColors.pageBackground,
        border: Border(
          bottom: BorderSide(color: AppColors.border, width: 1.0),
        ),
      ),
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Row (gap 12): 44x44 icon box / title + subtitle / right: date button
          Row(
            children: [
              // 44x44 icon box (radius 14, bg #EEF0FF, indigo history icon 22px)
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: AppColors.indigoTint,
                  borderRadius: BorderRadius.circular(14),
                ),
                alignment: Alignment.center,
                child: const Icon(
                  Icons.history_rounded,
                  size: 22,
                  color: AppColors.primary,
                ),
              ),
              const SizedBox(width: 12),

              // Title and Subtitle (does not wrap / overlap)
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      'Visitor Logs',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        color: AppColors.textPrimary,
                        letterSpacing: -0.3,
                        fontFamily: 'Inter',
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    SizedBox(height: 2),
                    Text(
                      'Gate checkpoint records',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w400,
                        color: AppColors.textMuted,
                        fontFamily: 'Inter',
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),

              // Date Button: height 38, padding 0 10, radius 12, white, 1px border #E4E8F0,
              // calendar icon 16px #3A3FB5 + "05 Nov" 13.5px weight 600.
              Material(
                color: Colors.transparent,
                child: InkWell(
                  onTap: _pickDate,
                  borderRadius: BorderRadius.circular(12),
                  child: Container(
                    height: 38,
                    padding: const EdgeInsets.symmetric(horizontal: 10),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppColors.border, width: 1.0),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(
                          Icons.calendar_today_outlined,
                          size: 16,
                          color: AppColors.primary,
                        ),
                        const SizedBox(width: 6),
                        Text(
                          DateFormat('dd MMM').format(_selectedDateFilter ?? _displayedDate),
                          style: const TextStyle(
                            fontSize: 13.5,
                            fontWeight: FontWeight.w600,
                            color: AppColors.textPrimary,
                            fontFamily: 'Inter',
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),

          const SizedBox(height: 12),

          // Search Field: height 44, radius 14, bg #F2F4F8, no border, search icon 18px, placeholder "Search name, flat or phone"
          Container(
            height: 44,
            decoration: BoxDecoration(
              color: AppColors.fieldBg, // #F2F4F8
              borderRadius: BorderRadius.circular(14),
            ),
            child: TextField(
              controller: _searchController,
              style: const TextStyle(
                fontSize: 14.5,
                fontWeight: FontWeight.w500,
                color: AppColors.textPrimary,
                fontFamily: 'Inter',
              ),
              onChanged: (val) => setState(() => _searchQuery = val.trim()),
              decoration: InputDecoration(
                isDense: true,
                border: InputBorder.none,
                enabledBorder: InputBorder.none,
                focusedBorder: InputBorder.none,
                contentPadding: const EdgeInsets.symmetric(vertical: 12),
                prefixIcon: const Icon(
                  Icons.search_rounded,
                  size: 18,
                  color: Color(0xFF6B7280),
                ),
                hintText: 'Search name, flat or phone',
                hintStyle: const TextStyle(
                  fontSize: 14.5,
                  fontWeight: FontWeight.w400,
                  color: Color(0xFF6B7280),
                  fontFamily: 'Inter',
                ),
                suffixIcon: _searchQuery.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.close_rounded,
                            size: 18, color: Color(0xFF6B7280)),
                        onPressed: () {
                          _searchController.clear();
                          setState(() => _searchQuery = '');
                        },
                      )
                    : null,
              ),
            ),
          ),

          const SizedBox(height: 12),

          // Filter Chips: horizontal scroll, gap 8, no wrap, the last chip can be cut at the edge.
          // Chips: All, Approved, Entered, Pending, Rejected.
          // Height 36, padding 0 16, radius 18, 14px weight 600.
          // Active (All): bg #3A3FB5, white text. Inactive: white, 1px border #D8DDE8, dark text.
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            physics: const BouncingScrollPhysics(),
            child: Row(
              children: [
                _buildFilterChip(
                  label: 'All',
                  isSelected: _selectedStatusFilter == null,
                  onTap: () => setState(() => _selectedStatusFilter = null),
                ),
                const SizedBox(width: 8),
                _buildFilterChip(
                  label: 'Approved',
                  isSelected: _selectedStatusFilter == VisitorStatus.approved,
                  onTap: () => setState(() =>
                      _selectedStatusFilter = VisitorStatus.approved),
                ),
                const SizedBox(width: 8),
                _buildFilterChip(
                  label: 'Entered',
                  isSelected: _selectedStatusFilter == VisitorStatus.completed,
                  onTap: () => setState(() =>
                      _selectedStatusFilter = VisitorStatus.completed),
                ),
                const SizedBox(width: 8),
                _buildFilterChip(
                  label: 'Exited',
                  isSelected: _selectedStatusFilter == VisitorStatus.exited,
                  onTap: () => setState(() =>
                      _selectedStatusFilter = VisitorStatus.exited),
                ),
                const SizedBox(width: 8),
                _buildFilterChip(
                  label: 'Pending',
                  isSelected: _selectedStatusFilter == VisitorStatus.pending,
                  onTap: () => setState(() =>
                      _selectedStatusFilter = VisitorStatus.pending),
                ),
                const SizedBox(width: 8),
                _buildFilterChip(
                  label: 'Rejected',
                  isSelected: _selectedStatusFilter == VisitorStatus.rejected,
                  onTap: () => setState(() =>
                      _selectedStatusFilter = VisitorStatus.rejected),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterChip({
    required String label,
    required bool isSelected,
    required VoidCallback onTap,
  }) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(17),
        child: Container(
          height: 34,
          padding: const EdgeInsets.symmetric(horizontal: 14),
          decoration: BoxDecoration(
            color: isSelected ? AppColors.primary : Colors.white,
            borderRadius: BorderRadius.circular(17),
            border: isSelected
                ? null
                : Border.all(color: AppColors.chipBorderInactive, width: 1.0),
          ),
          alignment: Alignment.center,
          child: Text(
            label,
            style: TextStyle(
              fontSize: 13.5,
              fontWeight: FontWeight.w600,
              color: isSelected ? Colors.white : AppColors.textPrimary,
              fontFamily: 'Inter',
            ),
          ),
        ),
      ),
    );
  }

  // 2. COUNT ROW
  Widget _buildCountRow(int count) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 10),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          RichText(
            text: TextSpan(
              style: const TextStyle(
                fontSize: 13.5,
                color: AppColors.textMuted,
                fontFamily: 'Inter',
              ),
              children: [
                const TextSpan(text: 'Showing '),
                TextSpan(
                  text: '$count',
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    color: AppColors.textPrimary,
                  ),
                ),
                TextSpan(text: count == 1 ? ' entry' : ' entries'),
              ],
            ),
          ),
          const Text(
            'Newest first',
            style: TextStyle(
              fontSize: 13.5,
              color: AppColors.textMuted,
              fontFamily: 'Inter',
            ),
          ),
        ],
      ),
    );
  }

  // 3. LOG CARD (white, 1px border #E4E8F0, radius 20, padding 14 12, row, gap 12, whole card tappable, no chevron)
  Widget _buildLogCard(VisitorRequest req) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.border, width: 1.0),
        boxShadow: const [
          BoxShadow(
            color: Color.fromRGBO(16, 24, 40, 0.04),
            blurRadius: 8,
            offset: Offset(0, 2),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(18),
        child: InkWell(
          borderRadius: BorderRadius.circular(18),
          onTap: () => _showDetailsSheet(context, req),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                // a) Avatar 48x48, radius 14, bg #EEF0FF. Use photo if available.
                _buildAvatar(req),
                const SizedBox(width: 12),

                // b) Middle (flex 1, min-width 0, column gap 4)
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      // Row a: Name (15.5px weight 600) + "Guest" chip
                      Row(
                        children: [
                          Flexible(
                            child: Text(
                              req.visitor.name,
                              style: const TextStyle(
                                fontSize: 15.5,
                                fontWeight: FontWeight.w600,
                                color: Color(0xFF1E293B),
                                fontFamily: 'Inter',
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          const SizedBox(width: 6),
                          Container(
                            height: 20,
                            padding: const EdgeInsets.symmetric(horizontal: 7),
                            decoration: BoxDecoration(
                              color: AppColors.indigoTint,
                              borderRadius: BorderRadius.circular(10),
                            ),
                            alignment: Alignment.center,
                            child: Text(
                              req.visitor.type.displayName,
                              style: const TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w600,
                                color: AppColors.primary,
                                fontFamily: 'Inter',
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 3),

                      // Row b: "Flat A-202 · Host Raju" (13px, single line with ellipsis)
                      Text(
                        'Flat ${req.flatNumber} · Host ${req.residentName}',
                        style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w400,
                          color: Color(0xFF4B5565),
                          fontFamily: 'Inter',
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 4),

                      // Row c: Clock icon 13px + Date & Time (12.5px, muted)
                      Row(
                        children: [
                          Icon(
                            req.status == VisitorStatus.exited
                                ? Icons.logout_rounded
                                : Icons.access_time_rounded,
                            size: 13,
                            color: req.status == VisitorStatus.exited
                                ? const Color(0xFF475569)
                                : const Color(0xFF64748B),
                          ),
                          const SizedBox(width: 5),
                          Text(
                            req.status == VisitorStatus.exited
                                ? 'In: ${DateFormat('hh:mm a').format(req.decisionTime ?? req.requestTime)} · Out: ${DateFormat('hh:mm a').format(req.exitTime ?? req.requestTime)}'
                                : (req.status == VisitorStatus.completed
                                    ? 'Entered: ${DateFormat('dd MMM · hh:mm a').format(req.decisionTime ?? req.requestTime)}'
                                    : DateFormat('dd MMM · hh:mm a').format(req.requestTime)),
                            style: TextStyle(
                              fontSize: 12.5,
                              fontWeight: req.status == VisitorStatus.exited
                                  ? FontWeight.w600
                                  : FontWeight.w400,
                              color: req.status == VisitorStatus.exited
                                  ? const Color(0xFF334155)
                                  : const Color(0xFF64748B),
                              fontFamily: 'Inter',
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),

                // c) Right: status pill (height 26, padding 0 8, radius 13, 11.5px weight 600, 5px colored dot)
                _buildStatusPill(req.status),
              ],
            ),
          ),
        ),
      ),
    );
  }

  // Avatar: 48x48, radius 14, bg #EEF0FF. Use photo if available.
  Widget _buildAvatar(VisitorRequest req, {double size = 48}) {
    final hasPhoto = req.visitor.photoPath != null &&
        req.visitor.photoPath!.trim().isNotEmpty;

    return GestureDetector(
      onTap: () {
        if (hasPhoto) {
          _showPhotoZoomDialog(context, req.visitor.photoPath, req.visitor.name);
        } else {
          _showDetailsSheet(context, req);
        }
      },
      child: ClipRRect(
        borderRadius: BorderRadius.circular(14),
        child: Container(
          width: size,
          height: size,
          color: AppColors.indigoTint,
          alignment: Alignment.center,
          child: hasPhoto
              ? VisitorPhotoAvatar.buildImageWidget(req.visitor.photoPath, size: size)
              : Text(
                  req.visitor.name.isNotEmpty
                      ? req.visitor.name[0].toUpperCase()
                      : '?',
                  style: TextStyle(
                    fontSize: size * 0.4,
                    fontWeight: FontWeight.bold,
                    color: AppColors.primary,
                    fontFamily: 'Inter',
                  ),
                ),
        ),
      ),
    );
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

  // Status Pill: height 26, padding 0 8, radius 13, 11.5px weight 600, 5px colored dot + label
  Widget _buildStatusPill(VisitorStatus status) {
    Color bg;
    Color text;
    Color dot;
    String label;

    switch (status) {
      case VisitorStatus.rejected:
        bg = AppColors.pillRejectedBg; // #FDE8E8
        text = AppColors.pillRejectedText; // #A11A1A
        dot = AppColors.dotRejected; // #DC2626
        label = 'Rejected';
        break;
      case VisitorStatus.approved:
        bg = AppColors.pillApprovedBg; // #E7F6EC
        text = AppColors.pillApprovedText; // #0B6B38
        dot = AppColors.dotApproved; // #16A34A
        label = 'Approved';
        break;
      case VisitorStatus.completed:
        bg = AppColors.pillApprovedBg; // #E7F6EC
        text = AppColors.pillApprovedText; // #0B6B38
        dot = AppColors.dotApproved; // #16A34A
        label = 'Entered';
        break;
      case VisitorStatus.exited:
        bg = const Color(0xFFF1F5F9);
        text = const Color(0xFF334155);
        dot = const Color(0xFF64748B);
        label = 'Exited';
        break;
      case VisitorStatus.pending:
      default:
        bg = AppColors.pillWaitingBg; // #FDE7C3
        text = AppColors.pillWaitingText; // #8A4B00
        dot = AppColors.dotPending; // #D97706
        label = 'Pending';
        break;
    }

    return Container(
      height: 26,
      padding: const EdgeInsets.symmetric(horizontal: 8),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(13),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Container(
            width: 5,
            height: 5,
            decoration: BoxDecoration(
              color: dot,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 5),
          Text(
            label,
            style: TextStyle(
              fontSize: 11.5,
              fontWeight: FontWeight.w600,
              color: text,
              fontFamily: 'Inter',
            ),
          ),
        ],
      ),
    );
  }

  // Loading Skeletons
  Widget _buildLoadingSkeletons() {
    return ListView.separated(
      physics: const NeverScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
      itemCount: 4,
      separatorBuilder: (_, __) => const SizedBox(height: 10),
      itemBuilder: (_, __) => Container(
        height: 84,
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: AppColors.border, width: 1.0),
        ),
        child: Row(
          children: [
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: const Color(0xFFF2F4F8),
                borderRadius: BorderRadius.circular(16),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Container(
                    width: 120,
                    height: 14,
                    decoration: BoxDecoration(
                      color: const Color(0xFFF2F4F8),
                      borderRadius: BorderRadius.circular(4),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Container(
                    width: 160,
                    height: 12,
                    decoration: BoxDecoration(
                      color: const Color(0xFFF2F4F8),
                      borderRadius: BorderRadius.circular(4),
                    ),
                  ),
                ],
              ),
            ),
            Container(
              width: 72,
              height: 28,
              decoration: BoxDecoration(
                color: const Color(0xFFF2F4F8),
                borderRadius: BorderRadius.circular(14),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // Empty State ("No records found")
  Widget _buildEmptyState() {
    final bool hasFilter = _searchQuery.isNotEmpty ||
        _selectedStatusFilter != null ||
        _selectedDateFilter != null;

    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 48),
      children: [
        Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 64,
                height: 64,
                decoration: const BoxDecoration(
                  color: AppColors.indigoTint,
                  shape: BoxShape.circle,
                ),
                alignment: Alignment.center,
                child: const Icon(
                  Icons.history_toggle_off_rounded,
                  size: 32,
                  color: AppColors.primary,
                ),
              ),
              const SizedBox(height: 16),
              const Text(
                'No records found',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: AppColors.textPrimary,
                  fontFamily: 'Inter',
                ),
              ),
              const SizedBox(height: 6),
              Text(
                hasFilter
                    ? 'No visitors match the active filters or search criteria.'
                    : 'Check-in and check-out logs for visitors will appear here.',
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w400,
                  color: AppColors.textMuted,
                  fontFamily: 'Inter',
                ),
                textAlign: TextAlign.center,
              ),
              if (hasFilter) ...[
                const SizedBox(height: 18),
                ElevatedButton(
                  onPressed: _resetFilters,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    elevation: 0,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    padding: const EdgeInsets.symmetric(
                        horizontal: 20, vertical: 12),
                  ),
                  child: const Text(
                    'Reset Filters',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      fontFamily: 'Inter',
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
      ],
    );
  }

  // Detailed Modal Bottom Sheet
  void _showDetailsSheet(BuildContext context, VisitorRequest req) {
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
      builder: (context) {
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
                      color: AppColors.border,
                      borderRadius: BorderRadius.circular(999),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    _buildAvatar(req, size: 54),
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
                              color: AppColors.textPrimary,
                              fontFamily: 'Inter',
                            ),
                          ),
                          const SizedBox(height: 3),
                          Text(
                            '${req.visitor.type.displayName}${req.visitor.phoneNumber != null ? " • ${req.visitor.phoneNumber!}" : ""}',
                            style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w500,
                              color: AppColors.textMuted,
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
                const Divider(color: AppColors.border, height: 1),
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
                  _buildModalRow('Vehicle:', req.visitor.vehicleNumber!),
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
                if (req.status == VisitorStatus.rejected &&
                    req.rejectionReason != null &&
                    req.rejectionReason!.isNotEmpty) ...[
                  const SizedBox(height: 10),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: AppColors.pillRejectedBg,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: AppColors.statRejectedBorder),
                    ),
                    child: Text(
                      'Rejection Reason: ${req.rejectionReason!}',
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: AppColors.pillRejectedText,
                        fontFamily: 'Inter',
                      ),
                    ),
                  ),
                ],
                const SizedBox(height: 20),
                SizedBox(
                  width: double.infinity,
                  height: 46,
                  child: ElevatedButton(
                    onPressed: () => Navigator.of(context).pop(),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFFF1F5F9),
                      foregroundColor: const Color(0xFF334155),
                      elevation: 0,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    child: const Text(
                      'Close',
                      style: TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: 14,
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
              fontWeight: FontWeight.w600,
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
              fontWeight: FontWeight.bold,
              color: AppColors.textPrimary,
              fontFamily: 'Inter',
            ),
          ),
        ),
      ],
    );
  }
}