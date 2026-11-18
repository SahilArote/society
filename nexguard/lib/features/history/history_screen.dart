import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../core/constants/app_colors.dart';
import '../../core/widgets/visitor_photo_avatar.dart';
import '../../models/visitor_request.dart';
import '../../repositories/visitor_repository.dart';
import '../../services/language_service.dart';
import '../../services/phone_service.dart';

/// Guard App - Visitor Logs / History Screen
/// Senior UI/UX Architect Implementation:
/// - Top header features the dedicated Calendar Picker button.
/// - Horizontal quick date strip: [ Today ] [ Yesterday ] [ All Dates ].
/// - Clean language reactivity across all labels.
/// - Designed for maximum legibility and comfort for 50+ year old security guards.
class HistoryScreen extends StatefulWidget {
  final VisitorRepository visitorRepo;

  const HistoryScreen({super.key, required this.visitorRepo});

  @override
  State<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends State<HistoryScreen> {
  final TextEditingController _searchController = TextEditingController();
  VisitorStatus? _selectedStatusFilter;

  // Date Filter: Defaults to Today for immediate relevant shift logs
  // null means "All Dates"
  DateTime? _selectedDateFilter;
  bool _isAllDates = false;

  String _searchQuery = '';
  bool _isRefreshing = false;

  @override
  void initState() {
    super.initState();
    // Default to Today so the guard immediately sees today's active shift logs
    _selectedDateFilter = DateTime.now();
    _isAllDates = false;
  }

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

  bool _isSameDay(DateTime a, DateTime b) {
    final la = a.toLocal();
    final lb = b.toLocal();
    return la.year == lb.year && la.month == lb.month && la.day == lb.day;
  }

  bool _matchesDate(VisitorRequest r, DateTime target) {
    // A visitor record belongs to this day if:
    // 1. Requested on this day, OR
    // 2. Responded on this day (decisionTime), OR
    // 3. Entered on this day (entryTime), OR
    // 4. Exited on this day (exitTime)
    if (_isSameDay(r.requestTime, target)) return true;
    if (r.entryTime != null && _isSameDay(r.entryTime!, target)) return true;
    if (r.decisionTime != null && _isSameDay(r.decisionTime!, target)) return true;
    if (r.exitTime != null && _isSameDay(r.exitTime!, target)) return true;
    return false;
  }

  String _resolveResidentPhone(VisitorRequest req) {
    if (req.residentPhone.trim().isNotEmpty) {
      return req.residentPhone.trim();
    }
    for (final flatList in widget.visitorRepo.wingFlats.values) {
      for (final flat in flatList) {
        if (flat.flatNumber.trim().toLowerCase() == req.flatNumber.trim().toLowerCase() &&
            (req.buildingWing.isEmpty ||
                flat.buildingWing.trim().toLowerCase() ==
                    req.buildingWing.trim().toLowerCase())) {
          for (final resident in flat.residents) {
            if (resident.name.trim().toLowerCase() ==
                req.residentName.trim().toLowerCase()) {
              if (resident.phoneNumber.trim().isNotEmpty) {
                return resident.phoneNumber.trim();
              }
            }
          }
          final phone = flat.primaryResident?.phoneNumber;
          if (phone != null && phone.trim().isNotEmpty) {
            return phone.trim();
          }
        }
      }
    }
    return '';
  }

  Future<void> _pickDate() async {
    final initial = _selectedDateFilter ?? DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: initial,
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
                textStyle: const TextStyle(fontWeight: FontWeight.bold),
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
        _isAllDates = false;
      });
    }
  }

  void _selectToday() {
    setState(() {
      _selectedDateFilter = DateTime.now();
      _isAllDates = false;
    });
  }

  void _selectYesterday() {
    setState(() {
      _selectedDateFilter = DateTime.now().subtract(const Duration(days: 1));
      _isAllDates = false;
    });
  }

  void _selectAllDates() {
    setState(() {
      _selectedDateFilter = null;
      _isAllDates = true;
    });
  }

  void _resetFilters() {
    _searchController.clear();
    setState(() {
      _searchQuery = '';
      _selectedStatusFilter = null;
      _selectedDateFilter = DateTime.now();
      _isAllDates = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.pageBackground, // #F5F7FB
      body: SafeArea(
        child: AnimatedBuilder(
          animation: Listenable.merge([widget.visitorRepo, LanguageService.instance]),
          builder: (context, _) {
            // 1. Start with all requests from repository
            List<VisitorRequest> list = List.from(widget.visitorRepo.allRequests);

            // 2. Filter by Date (Flawless All-Status Day Match)
            if (!_isAllDates && _selectedDateFilter != null) {
              list = list.where((r) => _matchesDate(r, _selectedDateFilter!)).toList();
            }

            // 3. Filter by Status (If a specific status is chosen)
            if (_selectedStatusFilter != null) {
              list = list.where((r) => r.status == _selectedStatusFilter).toList();
            }

            // 4. Filter by Search Query (Name, Flat, Phone, Vehicle, Resident)
            if (_searchQuery.isNotEmpty) {
              final q = _searchQuery.toLowerCase();
              list = list.where((r) {
                final matchName = r.visitor.name.toLowerCase().contains(q);
                final matchFlat = r.flatNumber.toLowerCase().contains(q);
                final matchPhone = r.visitor.phoneNumber != null &&
                    r.visitor.phoneNumber!.toLowerCase().contains(q);
                final matchResident =
                    r.residentName.toLowerCase().contains(q);
                final matchVehicle = r.visitor.vehicleNumber != null &&
                    r.visitor.vehicleNumber!.toLowerCase().contains(q);
                final matchCompany = r.visitor.deliveryCompany != null &&
                    r.visitor.deliveryCompany!.toLowerCase().contains(q);

                return matchName ||
                    matchFlat ||
                    matchPhone ||
                    matchResident ||
                    matchVehicle ||
                    matchCompany;
              }).toList();
            }

            // 5. Always sort newest requests first
            list.sort((a, b) => b.requestTime.compareTo(a.requestTime));

            return Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // 1. TOP HEADER WITH CALENDAR BUTTON
                _buildTopBlock(),

                // 2. QUICK DATE BAR (Today / Yesterday / All Dates)
                _buildDateSelectorStrip(),

                // 3. STATUS FILTER PILLS (All, Entered, Exited, Approved, Pending, Rejected)
                _buildStatusFilterRow(),

                // 4. COUNT ROW
                _buildCountRow(list.length),

                // 5. LIST OF LOGS
                Expanded(
                  child: RefreshIndicator(
                    onRefresh: _handleRefresh,
                    color: AppColors.primary,
                    backgroundColor: Colors.white,
                    child: _isRefreshing
                        ? _buildLoadingSkeletons()
                        : list.isEmpty
                            ? _buildEmptyState()
                            : ListView.separated(
                                physics: const AlwaysScrollableScrollPhysics(),
                                padding:
                                    const EdgeInsets.fromLTRB(16, 4, 16, 20),
                                itemCount: list.length,
                                separatorBuilder: (_, __) =>
                                    const SizedBox(height: 10),
                                itemBuilder: (context, index) {
                                  return _buildLogCard(list[index]);
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

  // 1. TOP HEADER & SEARCH (Calendar Button placed on top right)
  Widget _buildTopBlock() {
    final isToday = !_isAllDates &&
        _selectedDateFilter != null &&
        _isSameDay(_selectedDateFilter!, DateTime.now());

    final isYesterday = !_isAllDates &&
        _selectedDateFilter != null &&
        _isSameDay(_selectedDateFilter!,
            DateTime.now().subtract(const Duration(days: 1)));

    final isCustomDate = !_isAllDates &&
        _selectedDateFilter != null &&
        !isToday &&
        !isYesterday;

    final calendarBtnLabel = isCustomDate
        ? DateFormat('dd MMM').format(_selectedDateFilter!)
        : tr('selectDate');

    return Container(
      color: Colors.white,
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header Row: Icon + Title + Calendar Action Button
          Row(
            children: [
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
                  size: 24,
                  color: AppColors.primary,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      tr('logsTitle'),
                      style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w800,
                        color: AppColors.textPrimary,
                        letterSpacing: -0.3,
                        fontFamily: 'Inter',
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 2),
                    Text(
                      tr('logsSubtitle'),
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w500,
                        color: AppColors.textMuted,
                        fontFamily: 'Inter',
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),

              // Calendar Button (Replaces previous Language Button)
              Material(
                color: Colors.transparent,
                child: InkWell(
                  onTap: _pickDate,
                  borderRadius: BorderRadius.circular(16),
                  child: Container(
                    height: 38,
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    decoration: BoxDecoration(
                      color: isCustomDate ? AppColors.primary : AppColors.indigoTint,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                        color: isCustomDate
                            ? AppColors.primary
                            : AppColors.primary.withOpacity(0.35),
                        width: 1.2,
                      ),
                      boxShadow: isCustomDate
                          ? [
                              BoxShadow(
                                color: AppColors.primary.withOpacity(0.3),
                                blurRadius: 8,
                                offset: const Offset(0, 2),
                              )
                            ]
                          : null,
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          Icons.calendar_month_rounded,
                          size: 16,
                          color: isCustomDate ? Colors.white : AppColors.primary,
                        ),
                        const SizedBox(width: 6),
                        Text(
                          calendarBtnLabel,
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                            color: isCustomDate ? Colors.white : AppColors.primary,
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

          // Search Field: 46px height, high-contrast, easy to tap
          Container(
            height: 46,
            decoration: BoxDecoration(
              color: AppColors.fieldBg,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: AppColors.border, width: 1.0),
            ),
            child: TextField(
              controller: _searchController,
              style: const TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w600,
                color: AppColors.textPrimary,
                fontFamily: 'Inter',
              ),
              onChanged: (val) => setState(() => _searchQuery = val.trim()),
              decoration: InputDecoration(
                isDense: true,
                border: InputBorder.none,
                enabledBorder: InputBorder.none,
                focusedBorder: InputBorder.none,
                contentPadding: const EdgeInsets.symmetric(vertical: 13),
                prefixIcon: const Icon(
                  Icons.search_rounded,
                  size: 20,
                  color: Color(0xFF64748B),
                ),
                hintText: tr('searchPlaceholder'),
                hintStyle: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w400,
                  color: Color(0xFF64748B),
                  fontFamily: 'Inter',
                ),
                suffixIcon: _searchQuery.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.close_rounded,
                            size: 20, color: Color(0xFF64748B)),
                        onPressed: () {
                          _searchController.clear();
                          setState(() => _searchQuery = '');
                        },
                      )
                    : null,
              ),
            ),
          ),
        ],
      ),
    );
  }

  // 2. QUICK DATE BAR (Today / Yesterday / All Dates - Calendar removed as requested)
  Widget _buildDateSelectorStrip() {
    final isToday = !_isAllDates &&
        _selectedDateFilter != null &&
        _isSameDay(_selectedDateFilter!, DateTime.now());

    final isYesterday = !_isAllDates &&
        _selectedDateFilter != null &&
        _isSameDay(_selectedDateFilter!,
            DateTime.now().subtract(const Duration(days: 1)));

    final isCustomDate = !_isAllDates &&
        _selectedDateFilter != null &&
        !isToday &&
        !isYesterday;

    return Container(
      color: Colors.white,
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 10),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        physics: const BouncingScrollPhysics(),
        child: Row(
          children: [
            // Today Button
            _buildDateChip(
              icon: Icons.today_rounded,
              label: tr('today'),
              isSelected: isToday,
              onTap: _selectToday,
            ),
            const SizedBox(width: 8),

            // Yesterday Button
            _buildDateChip(
              icon: Icons.history_toggle_off_rounded,
              label: tr('yesterday'),
              isSelected: isYesterday,
              onTap: _selectYesterday,
            ),
            const SizedBox(width: 8),

            // All Dates Button
            _buildDateChip(
              icon: Icons.all_inclusive_rounded,
              label: tr('allDates'),
              isSelected: _isAllDates,
              onTap: _selectAllDates,
            ),

            // If a custom date is selected from top calendar, display active indicator chip
            if (isCustomDate) ...[
              const SizedBox(width: 8),
              _buildDateChip(
                icon: Icons.calendar_month_rounded,
                label: DateFormat('dd MMM yyyy').format(_selectedDateFilter!),
                isSelected: true,
                onTap: _pickDate,
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildDateChip({
    required IconData icon,
    required String label,
    required bool isSelected,
    required VoidCallback onTap,
  }) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          height: 38,
          padding: const EdgeInsets.symmetric(horizontal: 12),
          decoration: BoxDecoration(
            color: isSelected ? AppColors.primary : AppColors.fieldBg,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: isSelected ? AppColors.primary : AppColors.border,
              width: 1.2,
            ),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                icon,
                size: 16,
                color: isSelected ? Colors.white : AppColors.primary,
              ),
              const SizedBox(width: 6),
              Text(
                label,
                style: TextStyle(
                  fontSize: 13.5,
                  fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
                  color: isSelected ? Colors.white : AppColors.textPrimary,
                  fontFamily: 'Inter',
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // 3. STATUS FILTER PILLS
  Widget _buildStatusFilterRow() {
    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(
          bottom: BorderSide(color: AppColors.border, width: 1.0),
        ),
      ),
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        physics: const BouncingScrollPhysics(),
        child: Row(
          children: [
            _buildStatusChip(
              label: tr('statusAll'),
              isSelected: _selectedStatusFilter == null,
              onTap: () => setState(() => _selectedStatusFilter = null),
            ),
            const SizedBox(width: 8),
            _buildStatusChip(
              label: tr('statusEntered'),
              dotColor: AppColors.dotApproved,
              isSelected: _selectedStatusFilter == VisitorStatus.completed,
              onTap: () => setState(
                  () => _selectedStatusFilter = VisitorStatus.completed),
            ),
            const SizedBox(width: 8),
            _buildStatusChip(
              label: tr('statusExited'),
              dotColor: const Color(0xFF64748B),
              isSelected: _selectedStatusFilter == VisitorStatus.exited,
              onTap: () => setState(
                  () => _selectedStatusFilter = VisitorStatus.exited),
            ),
            const SizedBox(width: 8),
            _buildStatusChip(
              label: tr('statusApproved'),
              dotColor: AppColors.dotApproved,
              isSelected: _selectedStatusFilter == VisitorStatus.approved,
              onTap: () => setState(
                  () => _selectedStatusFilter = VisitorStatus.approved),
            ),
            const SizedBox(width: 8),
            _buildStatusChip(
              label: tr('statusPending'),
              dotColor: AppColors.dotPending,
              isSelected: _selectedStatusFilter == VisitorStatus.pending,
              onTap: () => setState(
                  () => _selectedStatusFilter = VisitorStatus.pending),
            ),
            const SizedBox(width: 8),
            _buildStatusChip(
              label: tr('statusRejected'),
              dotColor: AppColors.dotRejected,
              isSelected: _selectedStatusFilter == VisitorStatus.rejected,
              onTap: () => setState(
                  () => _selectedStatusFilter = VisitorStatus.rejected),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatusChip({
    required String label,
    required bool isSelected,
    required VoidCallback onTap,
    Color? dotColor,
  }) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          height: 34,
          padding: const EdgeInsets.symmetric(horizontal: 14),
          decoration: BoxDecoration(
            color: isSelected ? AppColors.navActive : Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: isSelected
                ? null
                : Border.all(color: AppColors.chipBorderInactive, width: 1.0),
          ),
          alignment: Alignment.center,
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (dotColor != null && !isSelected) ...[
                Container(
                  width: 7,
                  height: 7,
                  decoration: BoxDecoration(
                    color: dotColor,
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 6),
              ],
              Text(
                label,
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: isSelected ? Colors.white : AppColors.textPrimary,
                  fontFamily: 'Inter',
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // 4. COUNT ROW
  Widget _buildCountRow(int count) {
    String dateLabel = '';
    if (_isAllDates || _selectedDateFilter == null) {
      dateLabel = tr('allDates');
    } else if (_isSameDay(_selectedDateFilter!, DateTime.now())) {
      dateLabel = tr('today');
    } else if (_isSameDay(_selectedDateFilter!,
        DateTime.now().subtract(const Duration(days: 1)))) {
      dateLabel = tr('yesterday');
    } else {
      dateLabel = DateFormat('dd MMM yyyy').format(_selectedDateFilter!);
    }

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          RichText(
            text: TextSpan(
              style: const TextStyle(
                fontSize: 13.5,
                color: Color(0xFF475569),
                fontFamily: 'Inter',
              ),
              children: [
                TextSpan(text: '${tr("showing")} '),
                TextSpan(
                  text: '$count',
                  style: const TextStyle(
                    fontWeight: FontWeight.w800,
                    color: AppColors.textPrimary,
                    fontSize: 14.5,
                  ),
                ),
                TextSpan(text: ' ${count == 1 ? tr("entry") : tr("entries")} ('),
                TextSpan(
                  text: dateLabel,
                  style: const TextStyle(
                    fontWeight: FontWeight.w700,
                    color: AppColors.primary,
                  ),
                ),
                const TextSpan(text: ')'),
              ],
            ),
          ),
          Text(
            tr('newestFirst'),
            style: const TextStyle(
              fontSize: 12.5,
              fontWeight: FontWeight.w500,
              color: AppColors.textMuted,
              fontFamily: 'Inter',
            ),
          ),
        ],
      ),
    );
  }

  // 5. VISITOR LOG CARD
  Widget _buildLogCard(VisitorRequest req) {
    final entryTime = req.entryTime ?? req.decisionTime ?? req.requestTime;
    final entryTimeStr = DateFormat('hh:mm a').format(entryTime);

    final exitTimeStr = req.exitTime != null
        ? DateFormat('hh:mm a').format(req.exitTime!)
        : null;

    final dateStr = DateFormat('dd MMM').format(entryTime);

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
                // a) 52x52 Photo Avatar
                _buildAvatar(req, size: 52),
                const SizedBox(width: 12),

                // b) Visitor Info
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      // Visitor Name & Type Chip
                      Row(
                        children: [
                          Flexible(
                            child: Text(
                              req.visitor.name,
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w700,
                                color: Color(0xFF0F172A),
                                fontFamily: 'Inter',
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          const SizedBox(width: 6),
                          Container(
                            height: 20,
                            padding: const EdgeInsets.symmetric(horizontal: 8),
                            decoration: BoxDecoration(
                              color: AppColors.indigoTint,
                              borderRadius: BorderRadius.circular(10),
                            ),
                            alignment: Alignment.center,
                            child: Text(
                              req.visitor.type.displayName,
                              style: const TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                                color: AppColors.primary,
                                fontFamily: 'Inter',
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),

                      // Flat & Host Row
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 6, vertical: 1),
                            decoration: BoxDecoration(
                              color: const Color(0xFFF1F5F9),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              '${tr("flat")} ${req.flatNumber}',
                              style: const TextStyle(
                                fontSize: 12.5,
                                fontWeight: FontWeight.w700,
                                color: Color(0xFF1E293B),
                                fontFamily: 'Inter',
                              ),
                            ),
                          ),
                          const SizedBox(width: 6),
                          Flexible(
                            child: Text(
                              '· ${tr("host")}: ${req.residentName}',
                              style: const TextStyle(
                                fontSize: 12.5,
                                fontWeight: FontWeight.w500,
                                color: Color(0xFF475569),
                                fontFamily: 'Inter',
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),

                      // Time & Activity Line
                      Row(
                        children: [
                          Icon(
                            req.status == VisitorStatus.exited
                                ? Icons.logout_rounded
                                : (req.status == VisitorStatus.completed
                                    ? Icons.check_circle_outline_rounded
                                    : Icons.access_time_rounded),
                            size: 13,
                            color: req.status == VisitorStatus.exited
                                ? const Color(0xFF475569)
                                : const Color(0xFF64748B),
                          ),
                          const SizedBox(width: 5),
                          Flexible(
                            child: Text(
                              req.status == VisitorStatus.exited
                                  ? '${tr("inTime")}: $entryTimeStr · ${tr("outTime")}: $exitTimeStr ($dateStr)'
                                  : (req.status == VisitorStatus.completed
                                      ? '${tr("statusEntered")}: $entryTimeStr ($dateStr)'
                                      : '$entryTimeStr · $dateStr'),
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: req.status == VisitorStatus.exited
                                    ? FontWeight.w600
                                    : FontWeight.w500,
                                color: req.status == VisitorStatus.exited
                                    ? const Color(0xFF334155)
                                    : const Color(0xFF64748B),
                                fontFamily: 'Inter',
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
                const SizedBox(width: 8),

                // c) Status Pill
                _buildStatusPill(req.status),
              ],
            ),
          ),
        ),
      ),
    );
  }

  // Avatar Widget with Zoom Tap
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
              ? VisitorPhotoAvatar.buildImageWidget(req.visitor.displayPhoto,
                  size: size)
              : Text(
                  req.visitor.name.isNotEmpty
                      ? req.visitor.name[0].toUpperCase()
                      : '?',
                  style: TextStyle(
                    fontSize: size * 0.42,
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
            Text(
              tr('pinchToZoom'),
              style: const TextStyle(
                color: Colors.white70,
                fontSize: 12.5,
                fontWeight: FontWeight.w500,
                fontFamily: 'Inter',
              ),
            ),
          ],
        ),
      ),
    );
  }

  // Status Pill
  Widget _buildStatusPill(VisitorStatus status) {
    Color bg;
    Color text;
    Color dot;
    String label;

    switch (status) {
      case VisitorStatus.rejected:
        bg = AppColors.pillRejectedBg;
        text = AppColors.pillRejectedText;
        dot = AppColors.dotRejected;
        label = tr('statusRejected');
        break;
      case VisitorStatus.approved:
        bg = AppColors.pillApprovedBg;
        text = AppColors.pillApprovedText;
        dot = AppColors.dotApproved;
        label = tr('statusApproved');
        break;
      case VisitorStatus.completed:
        bg = AppColors.pillApprovedBg;
        text = AppColors.pillApprovedText;
        dot = AppColors.dotApproved;
        label = tr('statusEntered');
        break;
      case VisitorStatus.exited:
        bg = const Color(0xFFF1F5F9);
        text = const Color(0xFF334155);
        dot = const Color(0xFF64748B);
        label = tr('statusExited');
        break;
      case VisitorStatus.pending:
      default:
        bg = AppColors.pillWaitingBg;
        text = AppColors.pillWaitingText;
        dot = AppColors.dotPending;
        label = tr('statusPending');
        break;
    }

    return Container(
      height: 28,
      padding: const EdgeInsets.symmetric(horizontal: 10),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(14),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Container(
            width: 6,
            height: 6,
            decoration: BoxDecoration(
              color: dot,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 5),
          Text(
            label,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w700,
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
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 16),
      itemCount: 4,
      separatorBuilder: (_, __) => const SizedBox(height: 10),
      itemBuilder: (_, __) => Container(
        height: 88,
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: AppColors.border, width: 1.0),
        ),
        child: Row(
          children: [
            Container(
              width: 52,
              height: 52,
              decoration: BoxDecoration(
                color: const Color(0xFFF2F4F8),
                borderRadius: BorderRadius.circular(14),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Container(
                    width: 130,
                    height: 16,
                    decoration: BoxDecoration(
                      color: const Color(0xFFF2F4F8),
                      borderRadius: BorderRadius.circular(4),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Container(
                    width: 170,
                    height: 13,
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

  // Empty State
  Widget _buildEmptyState() {
    final bool hasFilter = _searchQuery.isNotEmpty ||
        _selectedStatusFilter != null ||
        !_isAllDates;

    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 48),
      children: [
        Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 68,
                height: 68,
                decoration: const BoxDecoration(
                  color: AppColors.indigoTint,
                  shape: BoxShape.circle,
                ),
                alignment: Alignment.center,
                child: const Icon(
                  Icons.history_toggle_off_rounded,
                  size: 36,
                  color: AppColors.primary,
                ),
              ),
              const SizedBox(height: 16),
              Text(
                tr('noRecordsTitle'),
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: AppColors.textPrimary,
                  fontFamily: 'Inter',
                ),
              ),
              const SizedBox(height: 6),
              Text(
                hasFilter ? tr('noRecordsDesc') : tr('logsSubtitle'),
                style: const TextStyle(
                  fontSize: 13.5,
                  fontWeight: FontWeight.w400,
                  color: AppColors.textMuted,
                  fontFamily: 'Inter',
                ),
                textAlign: TextAlign.center,
              ),
              if (hasFilter) ...[
                const SizedBox(height: 18),
                ElevatedButton.icon(
                  onPressed: _resetFilters,
                  icon: const Icon(Icons.refresh_rounded, size: 18),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    elevation: 0,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                    padding: const EdgeInsets.symmetric(
                        horizontal: 20, vertical: 12),
                  ),
                  label: Text(
                    tr('resetFilters'),
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
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

  // Detailed Modal Bottom Sheet (Modern UI/UX for Security Guards)
  void _showDetailsSheet(BuildContext context, VisitorRequest req) {
    final timeFormatted =
        DateFormat('hh:mm a, dd MMM yyyy').format(req.requestTime);
    final decisionTimeFormatted = req.decisionTime != null
        ? DateFormat('hh:mm a, dd MMM yyyy').format(req.decisionTime!)
        : null;
    final entryDateTime = req.entryTime ??
        ((req.status == VisitorStatus.completed ||
                req.status == VisitorStatus.exited)
            ? (req.decisionTime ?? req.requestTime)
            : null);
    final entryTimeFormatted = entryDateTime != null
        ? DateFormat('hh:mm a, dd MMM yyyy').format(entryDateTime)
        : null;
    final exitTimeFormatted = req.exitTime != null
        ? DateFormat('hh:mm a, dd MMM yyyy').format(req.exitTime!)
        : null;

    final resolvedPhone = _resolveResidentPhone(req);

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (sheetCtx) {
        return SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // 1. Top Drag Handle
                Center(
                  child: Container(
                    width: 36,
                    height: 4,
                    decoration: BoxDecoration(
                      color: const Color(0xFFCBD5E1),
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                const SizedBox(height: 12),

                // 2. Top Title Bar with (X) Close Button
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF1F5F9),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Text(
                        'VISITOR LOG DETAILS',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w800,
                          color: Color(0xFF64748B),
                          letterSpacing: 0.6,
                          fontFamily: 'Inter',
                        ),
                      ),
                    ),
                    Material(
                      color: Colors.transparent,
                      child: InkWell(
                        onTap: () => Navigator.of(sheetCtx).pop(),
                        borderRadius: BorderRadius.circular(20),
                        child: Container(
                          width: 32,
                          height: 32,
                          decoration: const BoxDecoration(
                            color: Color(0xFFF1F5F9),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(Icons.close_rounded,
                              size: 18, color: Color(0xFF64748B)),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),

                // 3. Visitor Profile Header
                Row(
                  children: [
                    _buildAvatar(req, size: 56),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            req.visitor.name,
                            style: const TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w800,
                              color: Color(0xFF0F172A),
                              fontFamily: 'Inter',
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          const SizedBox(height: 4),
                          Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 8, vertical: 2),
                                decoration: BoxDecoration(
                                  color: AppColors.indigoTint,
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: Text(
                                  req.visitor.type.displayName,
                                  style: const TextStyle(
                                    fontSize: 11.5,
                                    fontWeight: FontWeight.w700,
                                    color: AppColors.primary,
                                    fontFamily: 'Inter',
                                  ),
                                ),
                              ),
                              if (req.visitor.phoneNumber != null &&
                                  req.visitor.phoneNumber!.trim().isNotEmpty) ...[
                                const SizedBox(width: 8),
                                Flexible(
                                  child: Text(
                                    req.visitor.phoneNumber!.trim(),
                                    style: const TextStyle(
                                      fontSize: 12.5,
                                      fontWeight: FontWeight.w600,
                                      color: Color(0xFF64748B),
                                      fontFamily: 'Inter',
                                    ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                              ],
                            ],
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                    _buildStatusPill(req.status),
                  ],
                ),
                const SizedBox(height: 16),

                // 4. Destination & Host Resident Card
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF8FAFC),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                  ),
                  child: Column(
                    children: [
                      // Destination Row
                      Row(
                        children: [
                          Container(
                            width: 36,
                            height: 36,
                            decoration: BoxDecoration(
                              color: const Color(0xFFEEF2FF),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            alignment: Alignment.center,
                            child: const Icon(Icons.apartment_rounded,
                                size: 18, color: Color(0xFF4F46E5)),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  'DESTINATION RESIDENCE',
                                  style: TextStyle(
                                    fontSize: 10,
                                    fontWeight: FontWeight.w700,
                                    color: Color(0xFF64748B),
                                    letterSpacing: 0.5,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  'Flat ${req.flatNumber} (${req.buildingWing})',
                                  style: const TextStyle(
                                    fontSize: 14.5,
                                    fontWeight: FontWeight.w700,
                                    color: Color(0xFF0F172A),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),
                      const Divider(height: 1, color: Color(0xFFE2E8F0)),
                      const SizedBox(height: 10),

                      // Host Resident Row
                      Row(
                        children: [
                          Container(
                            width: 36,
                            height: 36,
                            decoration: BoxDecoration(
                              color: const Color(0xFFDCFCE7),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            alignment: Alignment.center,
                            child: const Icon(Icons.person_rounded,
                                size: 18, color: Color(0xFF16A34A)),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  'HOST RESIDENT',
                                  style: TextStyle(
                                    fontSize: 10,
                                    fontWeight: FontWeight.w700,
                                    color: Color(0xFF64748B),
                                    letterSpacing: 0.5,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  req.residentName,
                                  style: const TextStyle(
                                    fontSize: 14.5,
                                    fontWeight: FontWeight.w700,
                                    color: Color(0xFF0F172A),
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                                if (resolvedPhone.isNotEmpty)
                                  Text(
                                    resolvedPhone,
                                    style: const TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w600,
                                      color: Color(0xFF64748B),
                                    ),
                                  ),
                              ],
                            ),
                          ),
                          if (resolvedPhone.isNotEmpty)
                            Material(
                              color: Colors.transparent,
                              child: InkWell(
                                onTap: () => PhoneService.call(
                                  resolvedPhone,
                                  context: context,
                                  contactName:
                                      '${req.buildingWing}-${req.flatNumber} · ${req.residentName}',
                                ),
                                borderRadius: BorderRadius.circular(10),
                                child: Container(
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 12, vertical: 7),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFF16A34A),
                                    borderRadius: BorderRadius.circular(10),
                                    boxShadow: [
                                      BoxShadow(
                                        color: const Color(0xFF16A34A)
                                            .withOpacity(0.25),
                                        blurRadius: 6,
                                        offset: const Offset(0, 2),
                                      ),
                                    ],
                                  ),
                                  child: const Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Icon(Icons.phone_rounded,
                                          size: 14, color: Colors.white),
                                      SizedBox(width: 5),
                                      Text(
                                        'Call',
                                        style: TextStyle(
                                          fontSize: 13,
                                          fontWeight: FontWeight.w700,
                                          color: Colors.white,
                                        ),
                                      ),
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
                const SizedBox(height: 12),

                // 5. Visit Information & Timestamps Card
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF8FAFC),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                  ),
                  child: Column(
                    children: [
                      _buildInfoRow(
                        icon: Icons.info_outline_rounded,
                        iconColor: const Color(0xFF64748B),
                        label: tr('purpose'),
                        value: req.purpose.isNotEmpty ? req.purpose : 'Visit',
                      ),
                      if (req.visitor.deliveryCompany != null &&
                          req.visitor.deliveryCompany!.isNotEmpty) ...[
                        const SizedBox(height: 8),
                        _buildInfoRow(
                          icon: Icons.local_shipping_outlined,
                          iconColor: const Color(0xFF4F46E5),
                          label: tr('company'),
                          value: req.visitor.deliveryCompany!,
                        ),
                      ],
                      if (req.visitor.vehicleNumber != null &&
                          req.visitor.vehicleNumber!.isNotEmpty) ...[
                        const SizedBox(height: 8),
                        _buildInfoRow(
                          icon: Icons.directions_car_outlined,
                          iconColor: const Color(0xFF0284C7),
                          label: tr('vehicle'),
                          value: req.visitor.vehicleNumber!,
                        ),
                      ],
                      const SizedBox(height: 10),
                      const Divider(height: 1, color: Color(0xFFE2E8F0)),
                      const SizedBox(height: 10),

                      // Timestamps
                      _buildInfoRow(
                        icon: Icons.access_time_rounded,
                        iconColor: const Color(0xFF64748B),
                        label: tr('requestTime'),
                        value: timeFormatted,
                      ),
                      if (decisionTimeFormatted != null) ...[
                        const SizedBox(height: 8),
                        _buildInfoRow(
                          icon: req.status == VisitorStatus.rejected
                              ? Icons.cancel_outlined
                              : Icons.how_to_reg_rounded,
                          iconColor: req.status == VisitorStatus.rejected
                              ? const Color(0xFFDC2626)
                              : const Color(0xFF16A34A),
                          label: req.status == VisitorStatus.rejected
                              ? tr('rejectionTime')
                              : tr('approvalTime'),
                          value: req.decisionBy != null &&
                                  req.decisionBy!.isNotEmpty
                              ? '$decisionTimeFormatted (${req.decisionBy!})'
                              : decisionTimeFormatted,
                        ),
                      ],
                      if (entryTimeFormatted != null) ...[
                        const SizedBox(height: 8),
                        _buildInfoRow(
                          icon: Icons.login_rounded,
                          iconColor: const Color(0xFF16A34A),
                          label: tr('entryTime'),
                          value: entryTimeFormatted,
                        ),
                      ],
                      if (exitTimeFormatted != null) ...[
                        const SizedBox(height: 8),
                        _buildInfoRow(
                          icon: Icons.logout_rounded,
                          iconColor: const Color(0xFF475569),
                          label: tr('exitTime'),
                          value: exitTimeFormatted,
                        ),
                      ],
                    ],
                  ),
                ),

                // 6. Rejection Reason Banner (if rejected)
                if (req.status == VisitorStatus.rejected &&
                    req.rejectionReason != null &&
                    req.rejectionReason!.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(
                        horizontal: 14, vertical: 12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFFF1F2),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFFFECDD3)),
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Icon(Icons.error_outline_rounded,
                            size: 18, color: Color(0xFFE11D48)),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            '${tr("rejectionReason")}: ${req.rejectionReason!}',
                            style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                              color: Color(0xFFBE123C),
                              fontFamily: 'Inter',
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],

                // 7. Close Button
                const SizedBox(height: 18),
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: ElevatedButton.icon(
                    onPressed: () => Navigator.of(sheetCtx).pop(),
                    icon: const Icon(Icons.close_rounded,
                        size: 18, color: Colors.white),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF0F172A),
                      foregroundColor: Colors.white,
                      elevation: 0,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                    ),
                    label: Text(
                      tr('close'),
                      style: const TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: 15,
                        color: Colors.white,
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

  Widget _buildInfoRow({
    required IconData icon,
    required Color iconColor,
    required String label,
    required String value,
  }) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 16, color: iconColor),
        const SizedBox(width: 8),
        SizedBox(
          width: 95,
          child: Text(
            label,
            style: const TextStyle(
              fontSize: 12.5,
              fontWeight: FontWeight.w600,
              color: Color(0xFF64748B),
              fontFamily: 'Inter',
            ),
          ),
        ),
        const SizedBox(width: 6),
        Expanded(
          child: Text(
            value,
            style: const TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w700,
              color: Color(0xFF0F172A),
              fontFamily: 'Inter',
            ),
          ),
        ),
      ],
    );
  }
}
