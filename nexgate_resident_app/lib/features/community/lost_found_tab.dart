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
    return RefreshIndicator(
      onRefresh: () => _loadItems(silent: true),
      color: AppColors.primaryBlue,
      child: Column(
        children: [
          // Header Action Row (+ Report Item & Search Bar)
          Container(
            color: Colors.white,
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 10),
            child: Column(
              children: [
                Row(
                  children: [
                    ElevatedButton.icon(
                      onPressed: () async {
                        HapticHelper.mediumImpact();
                        final created = await Navigator.of(context).push<bool>(
                          MaterialPageRoute(
                            builder: (_) => const ReportItemScreen(),
                          ),
                        );
                        if (created == true) {
                          _loadItems();
                        }
                      },
                      icon: const Icon(Icons.add_rounded, size: 16, color: Colors.white),
                      label: const Text(
                        'Report Item',
                        style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Colors.white),
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF0F172A),
                        foregroundColor: Colors.white,
                        elevation: 0,
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10),
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Container(
                        height: 38,
                        decoration: BoxDecoration(
                          color: const Color(0xFFF8FAFC),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: AppColors.border),
                        ),
                        child: Row(
                          children: [
                            const Padding(
                              padding: EdgeInsets.symmetric(horizontal: 8),
                              child: Icon(Icons.search_rounded, color: AppColors.secondaryText, size: 18),
                            ),
                            Expanded(
                              child: TextField(
                                controller: _searchController,
                                style: const TextStyle(fontSize: 12),
                                decoration: const InputDecoration(
                                  hintText: 'Search items...',
                                  hintStyle: TextStyle(color: AppColors.mutedText, fontSize: 12),
                                  border: InputBorder.none,
                                  isDense: true,
                                  contentPadding: EdgeInsets.symmetric(vertical: 8),
                                ),
                                onChanged: (val) {
                                  _searchQuery = val;
                                  _loadItems(silent: true);
                                },
                              ),
                            ),
                            if (_searchQuery.isNotEmpty)
                              GestureDetector(
                                onTap: () {
                                  _searchController.clear();
                                  _searchQuery = '';
                                  _loadItems(silent: true);
                                },
                                child: const Padding(
                                  padding: EdgeInsets.only(right: 8),
                                  child: Icon(Icons.clear_rounded, size: 16, color: AppColors.secondaryText),
                                ),
                              ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),

                // Horizontal Filter Chips
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      _buildChip('All', 'ALL'),
                      const SizedBox(width: 8),
                      _buildChip('Lost Items', 'LOST'),
                      const SizedBox(width: 8),
                      _buildChip('Found Items', 'FOUND'),
                      const SizedBox(width: 8),
                      _buildChip('Resolved', 'RESOLVED'),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const Divider(height: 1, color: AppColors.border),

          // Main List
          Expanded(child: _buildList()),
        ],
      ),
    );
  }

  Widget _buildChip(String label, String value) {
    final isSelected = _filter == value;
    return GestureDetector(
      onTap: () => _onFilterChanged(value),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFF0F172A) : Colors.white,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: isSelected ? const Color(0xFF0F172A) : AppColors.border,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 12,
            fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
            color: isSelected ? Colors.white : AppColors.secondaryText,
          ),
        ),
      ),
    );
  }

  Widget _buildList() {
    if (_isLoading) {
      return ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: 4,
        separatorBuilder: (_, index) => const SizedBox(height: 12),
        itemBuilder: (_, index) => const LoadingSkeleton(width: double.infinity, height: 100, borderRadius: BorderRadius.all(Radius.circular(16))),
      );
    }

    if (_errorMessage != null) {
      return ErrorStateWidget(
        message: 'Could not load community items: $_errorMessage',
        onRetry: _loadItems,
      );
    }

    if (_items.isEmpty) {
      return EmptyStateWidget(
        icon: Icons.search_off_rounded,
        title: 'No Items Found',
        description: _searchQuery.isNotEmpty
            ? 'No lost or found posts match "$_searchQuery".'
            : 'No posts in this category currently. If you lost or found something, tap "+ Report Item" above.',
        buttonLabel: 'Report Item',
        onButtonPressed: () async {
          final created = await Navigator.of(context).push<bool>(
            MaterialPageRoute(
              builder: (_) => const ReportItemScreen(),
            ),
          );
          if (created == true) _loadItems();
        },
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
      itemCount: _items.length,
      separatorBuilder: (_, index) => const SizedBox(height: 12),
      itemBuilder: (context, index) {
        final item = _items[index];
        return _buildItemCard(item);
      },
    );
  }

  Widget _buildItemCard(LostFoundModel item) {
    final isLost = item.isLost;
    final badgeColor = isLost ? const Color(0xFFDC2626) : const Color(0xFF16A34A);
    final badgeBg = isLost ? const Color(0xFFFEE2E2) : const Color(0xFFDCFCE7);

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
          border: Border.all(color: AppColors.border),
          boxShadow: AppDimensions.subtleShadow,
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Circular L / F Badge
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: badgeColor,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Center(
                child: Text(
                  isLost ? 'L' : 'F',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 15,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 12),

            // Content
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Pill tags row
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: badgeBg,
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          item.type,
                          style: TextStyle(
                            color: badgeColor,
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                      if (item.isResolved) ...[
                        const SizedBox(width: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: const Color(0xFFDCFCE7),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: const Text(
                            'Resolved',
                            style: TextStyle(
                              color: Color(0xFF16A34A),
                              fontSize: 10,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                      ],
                      const Spacer(),
                      Text(
                        DateFormatter.formatRelative(item.createdAt),
                        style: const TextStyle(
                          fontSize: 11,
                          color: AppColors.mutedText,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),

                  // Title
                  Text(
                    item.title,
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      color: AppColors.primaryText,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 3),

                  // Description
                  Text(
                    item.description,
                    style: const TextStyle(
                      fontSize: 12,
                      color: AppColors.secondaryText,
                      height: 1.35,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 6),

                  // Footer: Author · Location
                  Text(
                    '${item.authorName} · ${item.authorFlat}',
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w500,
                      color: AppColors.mutedText,
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
}
