import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_dimensions.dart';
import '../../core/utils/date_formatter.dart';
import '../../core/utils/haptic_helper.dart';
import '../../core/widgets/empty_state_widget.dart';
import '../../core/widgets/error_state_widget.dart';
import '../../core/widgets/loading_skeleton.dart';
import '../../models/lost_found_model.dart';
import '../../services/api_service.dart';
import 'lost_found_detail_screen.dart';
import 'report_item_screen.dart';

class LostFoundTab extends StatefulWidget {
  const LostFoundTab({super.key});

  @override
  State<LostFoundTab> createState() => _LostFoundTabState();
}

class _LostFoundTabState extends State<LostFoundTab> {
  String _filter = 'ALL'; // ALL, LOST, FOUND, RESOLVED
  String _searchQuery = '';
  final TextEditingController _searchController = TextEditingController();

  bool _isLoading = true;
  String? _errorMessage;
  List<LostFoundModel> _items = [];

  @override
  void initState() {
    super.initState();
    _loadItems();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadItems({bool silent = false}) async {
    if (!silent) {
      setState(() {
        _isLoading = true;
        _errorMessage = null;
      });
    }

    try {
      String? typeParam;
      String? statusParam;

      if (_filter == 'LOST') typeParam = 'LOST';
      if (_filter == 'FOUND') typeParam = 'FOUND';
      if (_filter == 'RESOLVED') statusParam = 'RESOLVED';

      final results = await ApiService.fetchLostFoundItems(
        type: typeParam,
        status: statusParam,
        search: _searchQuery,
      );

      if (!mounted) return;
      setState(() {
        _items = results;
        _isLoading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _errorMessage = e.toString();
        _isLoading = false;
      });
    }
  }

  void _onFilterChanged(String filter) {
    if (_filter == filter) return;
    HapticHelper.selectionClick();
    setState(() => _filter = filter);
    _loadItems();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () async {
          HapticHelper.mediumImpact();
          final created = await Navigator.of(context).push<bool>(
            MaterialPageRoute(
              builder: (_) => const ReportItemScreen(),
            ),
          );
          if (created == true) _loadItems();
        },
        backgroundColor: const Color(0xFF155EEF),
        elevation: 3,
        shape: const StadiumBorder(),
        icon: const Icon(Icons.add_rounded, color: Colors.white, size: 20),
        label: const Text(
          'Report Item',
          style: TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.w700,
            fontSize: 14,
          ),
        ),
      ),
      body: RefreshIndicator(
        onRefresh: () => _loadItems(silent: true),
        color: AppColors.primaryBlue,
        child: Column(
          children: [
            // Top Section: Search Bar & Vertical-pipe Filter Row
            _buildTopControls(),

            // Main List
            Expanded(child: _buildList()),
          ],
        ),
      ),
    );
  }

  Widget _buildTopControls() {
    return Container(
      color: Colors.white,
      child: Column(
        children: [
          // Search Bar
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 10),
            child: Container(
              height: 46,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: const Color(0xFFE2E8F0), width: 1.2),
              ),
              child: Row(
                children: [
                  const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 14),
                    child: Icon(Icons.search_rounded, color: Color(0xFF94A3B8), size: 22),
                  ),
                  Expanded(
                    child: TextField(
                      controller: _searchController,
                      style: const TextStyle(
                        fontSize: 14,
                        color: Color(0xFF0F172A),
                        fontWeight: FontWeight.w500,
                      ),
                      decoration: const InputDecoration(
                        hintText: 'Search items...',
                        hintStyle: TextStyle(
                          color: Color(0xFF94A3B8),
                          fontSize: 13.5,
                          fontWeight: FontWeight.w400,
                        ),
                        border: InputBorder.none,
                        isDense: true,
                        contentPadding: EdgeInsets.symmetric(vertical: 12),
                      ),
                      onChanged: (val) {
                        _searchQuery = val;
                        _loadItems(silent: true);
                      },
                    ),
                  ),
                  if (_searchQuery.isNotEmpty)
                    IconButton(
                      icon: const Icon(Icons.clear_rounded, size: 18, color: Color(0xFF94A3B8)),
                      onPressed: () {
                        _searchController.clear();
                        _searchQuery = '';
                        _loadItems(silent: true);
                      },
                    ),
                ],
              ),
            ),
          ),

          // Horizontal Filter Row: All | Lost | Found | Resolved
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 12),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                _buildFilterItem('All', 'ALL'),
                _buildPipeDivider(),
                _buildFilterItem('Lost', 'LOST'),
                _buildPipeDivider(),
                _buildFilterItem('Found', 'FOUND'),
                _buildPipeDivider(),
                _buildFilterItem('Resolved', 'RESOLVED'),
              ],
            ),
          ),

          // Thin Bottom Divider
          const Divider(height: 1, thickness: 1, color: Color(0xFFF1F5F9)),
        ],
      ),
    );
  }

  Widget _buildFilterItem(String label, String value) {
    final isSelected = _filter == value;
    return GestureDetector(
      onTap: () => _onFilterChanged(value),
      behavior: HitTestBehavior.opaque,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 14,
            fontWeight: isSelected ? FontWeight.w800 : FontWeight.w500,
            color: isSelected ? const Color(0xFF0F172A) : const Color(0xFF64748B),
          ),
        ),
      ),
    );
  }

  Widget _buildPipeDivider() {
    return Container(
      width: 1,
      height: 14,
      color: const Color(0xFFCBD5E1),
    );
  }

  Widget _buildList() {
    if (_isLoading) {
      return ListView.separated(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 80),
        itemCount: 4,
        separatorBuilder: (_, index) => const SizedBox(height: 12),
        itemBuilder: (_, index) => const LoadingSkeleton(
          width: double.infinity,
          height: 100,
          borderRadius: BorderRadius.all(Radius.circular(16)),
        ),
      );
    }

    if (_errorMessage != null) {
      return ErrorStateWidget(
        message: 'Could not load community items: $_errorMessage',
        onRetry: _loadItems,
      );
    }

    if (_items.isEmpty) {
      return _buildEmptyState();
    }

    return ListView.separated(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 80),
      itemCount: _items.length,
      separatorBuilder: (_, index) => const SizedBox(height: 12),
      itemBuilder: (context, index) {
        final item = _items[index];
        return _buildItemCard(item);
      },
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 32.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 90,
              height: 90,
              decoration: const BoxDecoration(
                color: Color(0xFFEFF6FF),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.backpack_outlined,
                size: 44,
                color: Color(0xFF3B82F6),
              ),
            ),
            const SizedBox(height: 16),
            Text(
              _searchQuery.isNotEmpty ? 'No Matching Items' : 'No Items Found',
              style: const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w700,
                color: Color(0xFF0F172A),
              ),
            ),
            const SizedBox(height: 6),
            Text(
              _searchQuery.isNotEmpty
                  ? 'No lost or found items match "$_searchQuery".'
                  : 'Items reported as lost or found in the society will appear here.',
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w400,
                color: Color(0xFF64748B),
                height: 1.4,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildItemCard(LostFoundModel item) {
    final isLost = item.isLost;
    final isResolved = item.isResolved;

    return InkWell(
      onTap: () async {
        HapticHelper.lightImpact();
        final updated = await Navigator.of(context).push<bool>(
          MaterialPageRoute(
            builder: (_) => LostFoundDetailScreen(item: item),
          ),
        );
        if (updated == true) {
          _loadItems();
        }
      },
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFE2E8F0), width: 1.2),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.03),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Left Thumbnail with item image or fallback icon
            Container(
              width: 58,
              height: 58,
              decoration: BoxDecoration(
                color: const Color(0xFFF1F5F9),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(11),
                child: item.imageUrl != null && item.imageUrl!.isNotEmpty
                    ? Image.network(
                        item.imageUrl!,
                        fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => _buildFallbackThumbnail(isLost),
                      )
                    : _buildFallbackThumbnail(isLost),
              ),
            ),
            const SizedBox(width: 14),

            // Right Details
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Badges & Time Row
                  Row(
                    children: [
                      // LOST / FOUND Badge
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                        decoration: BoxDecoration(
                          color: isLost ? const Color(0xFFFEE2E2) : const Color(0xFFDCFCE7),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          isLost ? 'LOST' : 'FOUND',
                          style: TextStyle(
                            color: isLost ? const Color(0xFFEF4444) : const Color(0xFF16A34A),
                            fontSize: 10.5,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 0.2,
                          ),
                        ),
                      ),

                      // Optional FOUND/RESOLVED Badge
                      if (isResolved) ...[
                        const SizedBox(width: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                          decoration: BoxDecoration(
                            color: const Color(0xFFDCFCE7),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: const Text(
                            'FOUND/RESOLVED',
                            style: TextStyle(
                              color: Color(0xFF16A34A),
                              fontSize: 10.5,
                              fontWeight: FontWeight.w800,
                              letterSpacing: 0.2,
                            ),
                          ),
                        ),
                      ],

                      const Spacer(),

                      // Relative Time (e.g. 2d ago)
                      Text(
                        DateFormatter.formatRelative(item.createdAt),
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                          color: Color(0xFF94A3B8),
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: 6),

                  // Item Title
                  Text(
                    item.title,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w800,
                      color: Color(0xFF0F172A),
                      letterSpacing: -0.2,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),

                  const SizedBox(height: 3),

                  // Color / Description
                  if (item.description.isNotEmpty)
                    Text(
                      item.description,
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w400,
                        color: Color(0xFF475569),
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),

                  const SizedBox(height: 2),

                  // Finder / Contact
                  Text(
                    '${isLost ? 'Owner/Contact' : 'Finder/Contact'}: ${item.authorName}${item.authorFlat.isNotEmpty ? ', ${item.authorFlat}' : ''}',
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w400,
                      color: Color(0xFF475569),
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFallbackThumbnail(bool isLost) {
    return Center(
      child: Icon(
        isLost ? Icons.backpack_outlined : Icons.check_circle_outline_rounded,
        color: isLost ? const Color(0xFFEF4444) : const Color(0xFF16A34A),
        size: 26,
      ),
    );
  }
}
