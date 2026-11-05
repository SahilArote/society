import '../../core/widgets/visitor_photo_avatar.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../models/visitor.dart';
import '../../models/visitor_request.dart';
import '../../repositories/visitor_repository.dart';

/// Professional, high-contrast Gate Visitor History & Logs Screen.
/// Designed for quick audit, fast search, status filtering, and elderly guard readability.
class HistoryScreen extends StatefulWidget {
  final VisitorRepository visitorRepo;

  const HistoryScreen({super.key, required this.visitorRepo});

  @override
  State<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends State<HistoryScreen> {
  final TextEditingController _searchController = TextEditingController();
  VisitorStatus? _selectedStatusFilter;
  String _searchQuery = '';

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _handleRefresh() async { await widget.visitorRepo.fetchRecentRequests(); }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: SafeArea(
        child: AnimatedBuilder(
          animation: widget.visitorRepo,
          builder: (context, _) {
            final filteredList = widget.visitorRepo.filterHistory(
              query: _searchQuery,
              status: _selectedStatusFilter,
            );

            return Column(
              children: [
                // 1. Header Bar
                _buildHeader(),

                // 2. Search & Filter Section
                _buildSearchAndFilters(),

                // 3. Activity Summary Bar
                _buildSummaryBar(filteredList.length),

                // 4. Logs List View with Pull to Refresh
                Expanded(
                  child: RefreshIndicator(
                    onRefresh: _handleRefresh,
                    color: const Color(0xFF4F46E5),
                    child: filteredList.isEmpty
                        ? _buildEmptyState()
                        : ListView.separated(
                            physics: const AlwaysScrollableScrollPhysics(),
                            padding: const EdgeInsets.fromLTRB(16, 6, 16, 24),
                            itemCount: filteredList.length,
                            separatorBuilder: (_, __) =>
                                const SizedBox(height: 10),
                            itemBuilder: (context, index) {
                              final req = filteredList[index];
                              return _buildHistoryCard(req);
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
                  Icons.history_rounded,
                  color: Color(0xFF4F46E5),
                  size: 24,
                ),
              ),
              const SizedBox(width: 12),
              const Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Visitor Logs',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w900,
                      color: Color(0xFF0F172A),
                      letterSpacing: -0.5,
                    ),
                  ),
                  Text(
                    'Gate Checkpoint Records',
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

          // Date Pill
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(
              color: const Color(0xFFF1F5F9),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: const Color(0xFFCBD5E1)),
            ),
            child: Row(
              children: [
                const Icon(Icons.calendar_today_rounded,
                    size: 13, color: Color(0xFF4F46E5)),
                const SizedBox(width: 5),
                Text(
                  DateFormat('dd MMM yyyy').format(DateTime.now()),
                  style: const TextStyle(
                    fontSize: 11.5,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF0F172A),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // Search Input & Filter Chips
  Widget _buildSearchAndFilters() {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
      child: Column(
        children: [
          // Search Field
          TextField(
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
              hintText: 'Search by visitor name, flat, or phone...',
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
                borderSide:
                    const BorderSide(color: Color(0xFFE2E8F0), width: 1.5),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(14),
                borderSide:
                    const BorderSide(color: Color(0xFFE2E8F0), width: 1.5),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(14),
                borderSide:
                    const BorderSide(color: Color(0xFF4F46E5), width: 2),
              ),
            ),
          ),

          const SizedBox(height: 10),

          // Horizontal Filter Chips
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                _buildFilterChip(
                  label: 'ALL RECORDS',
                  isSelected: _selectedStatusFilter == null,
                  onSelected: () =>
                      setState(() => _selectedStatusFilter = null),
                ),
                const SizedBox(width: 8),
                _buildFilterChip(
                  label: 'APPROVED',
                  isSelected: _selectedStatusFilter == VisitorStatus.approved,
                  activeColor: const Color(0xFF059669),
                  onSelected: () => setState(
                      () => _selectedStatusFilter = VisitorStatus.approved),
                ),
                const SizedBox(width: 8),
                _buildFilterChip(
                  label: 'ENTERED',
                  isSelected: _selectedStatusFilter == VisitorStatus.completed,
                  activeColor: const Color(0xFF475569),
                  onSelected: () => setState(
                      () => _selectedStatusFilter = VisitorStatus.completed),
                ),
                const SizedBox(width: 8),
                _buildFilterChip(
                  label: 'PENDING',
                  isSelected: _selectedStatusFilter == VisitorStatus.pending,
                  activeColor: const Color(0xFFD97706),
                  onSelected: () => setState(
                      () => _selectedStatusFilter = VisitorStatus.pending),
                ),
                const SizedBox(width: 8),
                _buildFilterChip(
                  label: 'REJECTED',
                  isSelected: _selectedStatusFilter == VisitorStatus.rejected,
                  activeColor: const Color(0xFFDC2626),
                  onSelected: () => setState(
                      () => _selectedStatusFilter = VisitorStatus.rejected),
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
    Color activeColor = const Color(0xFF4F46E5),
    required VoidCallback onSelected,
  }) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(20),
        onTap: onSelected,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(
            color: isSelected ? activeColor : const Color(0xFFF1F5F9),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: isSelected ? activeColor : const Color(0xFFCBD5E1),
              width: 1.2,
            ),
          ),
          child: Text(
            label,
            style: TextStyle(
              fontSize: 11.5,
              fontWeight: FontWeight.w800,
              color: isSelected ? Colors.white : const Color(0xFF475569),
              letterSpacing: 0.3,
            ),
          ),
        ),
      ),
    );
  }

  // Summary Row showing result count
  Widget _buildSummaryBar(int count) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
      decoration: const BoxDecoration(
        color: Color(0xFFF8FAFC),
        border: Border(
          bottom: BorderSide(color: Color(0xFFE2E8F0), width: 1),
        ),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            'Showing $count ${count == 1 ? "entry" : "entries"}',
            style: const TextStyle(
              fontSize: 12.5,
              fontWeight: FontWeight.w800,
              color: Color(0xFF475569),
            ),
          ),
          if (_searchQuery.isNotEmpty || _selectedStatusFilter != null)
            GestureDetector(
              onTap: () {
                _searchController.clear();
                setState(() {
                  _searchQuery = '';
                  _selectedStatusFilter = null;
                });
              },
              child: const Text(
                'Reset Filters',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w800,
                  color: Color(0xFF4F46E5),
                ),
              ),
            ),
        ],
      ),
    );
  }

  // Polished History Card
  Widget _buildHistoryCard(VisitorRequest req) {
    final timeFormatted = DateFormat('hh:mm a').format(req.requestTime);
    final dateFormatted = DateFormat('dd MMM').format(req.requestTime);

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0), width: 1.2),
        boxShadow: const [
          BoxShadow(
            color: Color.fromRGBO(15, 23, 42, 0.03),
            blurRadius: 8,
            offset: Offset(0, 2),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(16),
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: () => _showDetailsSheet(context, req),
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                // Visitor Avatar (48x48)
                ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: Container(
                    width: 48,
                    height: 48,
                    color: const Color(0xFFF1F5F9),
                    child: _buildPhoto(req.visitor.photoPath),
                  ),
                ),
                const SizedBox(width: 12),

                // Visitor Details
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
                                fontSize: 15.5,
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

                      // Flat & Resident
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: const Color(0xFFF1F5F9),
                              borderRadius: BorderRadius.circular(5),
                              border:
                                  Border.all(color: const Color(0xFFCBD5E1)),
                            ),
                            child: Text(
                              'Flat ${req.flatNumber}',
                              style: const TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w800,
                                color: Color(0xFF0F172A),
                              ),
                            ),
                          ),
                          const SizedBox(width: 6),
                          Expanded(
                            child: Text(
                              '• ${req.residentName}',
                              style: const TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                color: Color(0xFF64748B),
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 5),

                      // Date & Time
                      Row(
                        children: [
                          const Icon(Icons.access_time_rounded,
                              size: 12, color: Color(0xFF94A3B8)),
                          const SizedBox(width: 4),
                          Text(
                            '$dateFormatted at $timeFormatted',
                            style: const TextStyle(
                              fontSize: 11.5,
                              fontWeight: FontWeight.w600,
                              color: Color(0xFF64748B),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),

                const SizedBox(width: 8),

                // Status Badge & Arrow
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    _buildStatusPill(req.status),
                    const SizedBox(height: 8),
                    const Icon(Icons.chevron_right_rounded,
                        size: 18, color: Color(0xFFCBD5E1)),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return ListView(
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
                  color: const Color(0xFFF1F5F9),
                  shape: BoxShape.circle,
                  border:
                      Border.all(color: const Color(0xFFCBD5E1), width: 1.5),
                ),
                child: const Icon(Icons.search_off_rounded,
                    size: 36, color: Color(0xFF64748B)),
              ),
              const SizedBox(height: 18),
              Text(
                _searchQuery.isNotEmpty
                    ? 'No Results Found'
                    : 'No Visitor Logs',
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                  color: Color(0xFF0F172A),
                ),
              ),
              const SizedBox(height: 6),
              Text(
                _searchQuery.isNotEmpty
                    ? 'No visitors found matching "$_searchQuery". Try clearing your search.'
                    : 'Check-in and check-out logs for visitors will appear here.',
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w500,
                  color: Color(0xFF64748B),
                ),
                textAlign: TextAlign.center,
              ),
              if (_searchQuery.isNotEmpty || _selectedStatusFilter != null) ...[
                const SizedBox(height: 18),
                ElevatedButton(
                  onPressed: () {
                    _searchController.clear();
                    setState(() {
                      _searchQuery = '';
                      _selectedStatusFilter = null;
                    });
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF4F46E5),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10)),
                  ),
                  child: const Text('Clear Filters',
                      style: TextStyle(fontWeight: FontWeight.w800)),
                ),
              ],
            ],
          ),
        ),
      ],
    );
  }

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
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(5),
      ),
      child: Text(
        type.displayName,
        style: TextStyle(
          fontSize: 10,
          fontWeight: FontWeight.w800,
          color: fg,
        ),
      ),
    );
  }

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
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: border),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 11, color: fg),
          const SizedBox(width: 3),
          Text(
            label,
            style: TextStyle(
              fontSize: 10.5,
              fontWeight: FontWeight.w800,
              color: fg,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPhoto(String? path) {
    return VisitorPhotoAvatar.buildImageWidget(path, size: 48);
  }

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
                        width: 52,
                        height: 52,
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
                if (req.status == VisitorStatus.rejected &&
                    req.rejectionReason != null &&
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
