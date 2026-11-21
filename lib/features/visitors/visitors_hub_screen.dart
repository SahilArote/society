import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_dimensions.dart';
import '../../core/constants/app_typography.dart';
import '../../core/utils/date_formatter.dart';
import '../../core/widgets/custom_app_bar.dart';
import '../../core/widgets/empty_state_widget.dart';
import '../../core/widgets/loading_skeleton.dart';
import '../../models/invite_model.dart';
import '../../models/visitor_model.dart';
import '../../services/api_service.dart';
import 'digital_pass_screen.dart';
import 'invite_visitor_screen.dart';
import 'widgets/visitor_card.dart';

enum VisitorTab { upcoming, recent, passes, all }

/// Main Visitors Hub screen with search, filters, and list.
class VisitorsHubScreen extends StatefulWidget {
  const VisitorsHubScreen({super.key});

  @override
  State<VisitorsHubScreen> createState() => _VisitorsHubScreenState();
}

class _VisitorsHubScreenState extends State<VisitorsHubScreen> {
  VisitorTab _selectedTab = VisitorTab.upcoming;
  List<VisitorModel> _allVisitors = [];
  List<InviteModel> _allInvites = [];
  bool _isLoading = true;
  String _searchQuery = '';
  bool _isSearchOpen = false;
  final TextEditingController _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadVisitors();
    _loadInvites();
  }

  Future<void> _loadInvites() async {
    try {
      final list = await ApiService.fetchInvites();
      if (!mounted) return;
      setState(() {
        _allInvites = list;
      });
    } catch (e) {
      debugPrint('[VisitorsHub] Error loading invites: $e');
    }
  }

  Future<void> _loadVisitors() async {
    setState(() => _isLoading = true);
    try {
      final list = await ApiService.fetchVisitorRequests();
      if (!mounted) return;
      setState(() {
        _allVisitors = list;
      });
    } catch (e) {
      debugPrint('[VisitorsHub] Error: $e');
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  List<InviteModel> get _filteredInvites {
    return _allInvites.where((invite) {
      if (_searchQuery.isNotEmpty) {
        final q = _searchQuery.toLowerCase();
        return invite.visitorName.toLowerCase().contains(q) ||
            invite.passCode.toLowerCase().contains(q) ||
            invite.purpose.toLowerCase().contains(q) ||
            invite.status.toLowerCase().contains(q);
      }
      return true;
    }).toList();
  }

  List<VisitorModel> get _filteredVisitors {
    return _allVisitors.where((v) {
      // Tab matching
      if (_selectedTab == VisitorTab.upcoming) {
        final isUpcoming = v.isPending || v.isApproved || v.isPreApproved;
        if (!isUpcoming) return false;
      } else if (_selectedTab == VisitorTab.recent) {
        final isRecent = v.isEntered || v.isExited || v.isRejected;
        if (!isRecent) return false;
      }

      // Search query matching
      if (_searchQuery.isNotEmpty) {
        final q = _searchQuery.toLowerCase();
        return v.name.toLowerCase().contains(q) ||
            v.purpose.toLowerCase().contains(q) ||
            v.status.toLowerCase().contains(q) ||
            (v.deliveryCompany?.toLowerCase().contains(q) ?? false);
      }

      return true;
    }).toList();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Widget _buildInviteCard(InviteModel invite) {
    Color statusColor;
    String statusLabel;
    if (invite.isUsed) {
      statusColor = AppColors.primaryBlue;
      statusLabel = 'USED';
    } else if (invite.isCancelled) {
      statusColor = AppColors.error;
      statusLabel = 'CANCELLED';
    } else if (invite.isExpired) {
      statusColor = AppColors.secondaryText;
      statusLabel = 'EXPIRED';
    } else {
      statusColor = AppColors.success;
      statusLabel = 'ACTIVE';
    }

    return InkWell(
      onTap: () {
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (_) => DigitalPassScreen(
              passId: invite.passCode,
              visitorName: invite.visitorName,
              purpose: invite.purpose,
              date: DateFormatter.formatShortDate(invite.validFrom),
              time: DateFormatter.formatTime(invite.validFrom),
              invite: invite,
            ),
          ),
        ).then((_) => _loadInvites());
      },
      borderRadius: AppDimensions.roundedLarge,
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: AppDimensions.roundedLarge,
          border: Border.all(color: AppColors.border),
          boxShadow: AppDimensions.subtleShadow,
        ),
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: statusColor.withValues(alpha: 0.12),
                shape: BoxShape.circle,
              ),
              child: Icon(
                Icons.qr_code_rounded,
                color: statusColor,
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
                      Expanded(
                        child: Text(
                          invite.visitorName,
                          style: AppTypography.titleSmall.copyWith(fontWeight: FontWeight.w700),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: statusColor.withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: statusColor.withValues(alpha: 0.3)),
                        ),
                        child: Text(
                          statusLabel,
                          style: TextStyle(
                            color: statusColor,
                            fontSize: 10,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Text(
                        'Pass: ${invite.passCode}',
                        style: AppTypography.caption.copyWith(
                          fontWeight: FontWeight.w700,
                          color: AppColors.primaryBlue,
                        ),
                      ),
                      const SizedBox(width: 8),
                      const Text('•', style: TextStyle(color: AppColors.secondaryText)),
                      const SizedBox(width: 8),
                      Text(
                        invite.purpose.toUpperCase(),
                        style: AppTypography.caption.copyWith(color: AppColors.secondaryText),
                      ),
                    ],
                  ),
                  const SizedBox(height: 2),
                  Text(
                    'Valid until ${DateFormatter.formatShortDate(invite.validUntil)} at ${DateFormatter.formatTime(invite.validUntil)}',
                    style: AppTypography.caption.copyWith(
                      color: AppColors.secondaryText,
                      fontSize: 11,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            const Icon(Icons.chevron_right_rounded, color: AppColors.secondaryText, size: 20),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isPassesTab = _selectedTab == VisitorTab.passes;
    final passes = _filteredInvites;
    final list = _filteredVisitors;

    return Scaffold(
      backgroundColor: AppColors.mainBackground,
      appBar: CustomAppBar(
        title: 'Visitors Hub',
        subtitle: 'Gate entry passes & activity records',
        actions: [
          IconButton(
            icon: Icon(
              _isSearchOpen ? Icons.close_rounded : Icons.search_rounded,
              color: AppColors.primaryText,
            ),
            onPressed: () {
              setState(() {
                _isSearchOpen = !_isSearchOpen;
                if (!_isSearchOpen) {
                  _searchQuery = '';
                  _searchController.clear();
                }
              });
            },
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Search Bar (if opened)
            if (_isSearchOpen)
              Container(
                color: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
                child: TextField(
                  controller: _searchController,
                  autofocus: true,
                  decoration: InputDecoration(
                    hintText: 'Search by visitor name, purpose, company...',
                    prefixIcon: const Icon(Icons.search_rounded, size: 20),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    fillColor: AppColors.mainBackground,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(10),
                      borderSide: const BorderSide(color: AppColors.border),
                    ),
                  ),
                  onChanged: (val) {
                    setState(() => _searchQuery = val.trim());
                  },
                ),
              ),

            // Segmented Tab Filter
            Container(
              color: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 10.0),
              child: Container(
                padding: const EdgeInsets.all(4),
                decoration: BoxDecoration(
                  color: AppColors.mainBackground,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.border),
                ),
                child: Row(
                  children: [
                    _buildTabItem(VisitorTab.upcoming, 'Upcoming'),
                    _buildTabItem(VisitorTab.recent, 'Recent'),
                    _buildTabItem(VisitorTab.passes, 'My Passes'),
                    _buildTabItem(VisitorTab.all, 'All Passes'),
                  ],
                ),
              ),
            ),

            // Visitors List
            Expanded(
              child: RefreshIndicator(
                onRefresh: () async {
                  await Future.wait([_loadVisitors(), _loadInvites()]);
                },
                color: AppColors.primaryBlue,
                child: _isLoading
                    ? ListView.separated(
                        padding: const EdgeInsets.all(16),
                        itemCount: 4,
                        separatorBuilder: (ctx, index) => const SizedBox(height: 10),
                        itemBuilder: (ctx, index) => LoadingSkeleton(
                          width: double.infinity,
                          height: 72,
                          borderRadius: AppDimensions.roundedLarge,
                        ),
                      )
                    : isPassesTab
                        ? (passes.isEmpty
                            ? ListView(
                                children: [
                                  const SizedBox(height: 60),
                                  EmptyStateWidget(
                                    icon: Icons.qr_code_rounded,
                                    title: _searchQuery.isNotEmpty
                                        ? 'No passes match "$_searchQuery"'
                                        : 'No Pre-Approved Passes',
                                    description: _searchQuery.isNotEmpty
                                        ? 'Check for typos or try searching another term.'
                                        : 'Create digital entry passes for guests, cabs, or deliveries.',
                                    buttonLabel: 'Create Visitor Pass',
                                    onButtonPressed: () {
                                      Navigator.of(context).push(
                                        MaterialPageRoute(
                                          builder: (_) => const InviteVisitorScreen(),
                                        ),
                                      ).then((_) => _loadInvites());
                                    },
                                  ),
                                ],
                              )
                            : ListView.separated(
                                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                                itemCount: passes.length,
                                separatorBuilder: (ctx, index) => const SizedBox(height: 10),
                                itemBuilder: (context, index) => _buildInviteCard(passes[index]),
                              ))
                        : (list.isEmpty
                            ? ListView(
                                children: [
                                  const SizedBox(height: 60),
                                  EmptyStateWidget(
                                    icon: Icons.people_outline_rounded,
                                    title: _searchQuery.isNotEmpty
                                        ? 'No matches found'
                                        : 'No visitors in this tab',
                                    description: _searchQuery.isNotEmpty
                                        ? 'Try checking for typos or searching a different term.'
                                        : 'Passes and gate arrivals will be listed here.',
                                    buttonLabel: _searchQuery.isEmpty ? 'Invite Visitor' : null,
                                    onButtonPressed: _searchQuery.isEmpty
                                        ? () {
                                            Navigator.of(context).push(
                                              MaterialPageRoute(
                                                builder: (_) => const InviteVisitorScreen(),
                                              ),
                                            ).then((_) => _loadVisitors());
                                          }
                                        : null,
                                  ),
                                ],
                              )
                            : ListView.separated(
                                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                                itemCount: list.length,
                                separatorBuilder: (ctx, index) => const SizedBox(height: 10),
                                itemBuilder: (context, index) {
                                  return VisitorCard(
                                    visitor: list[index],
                                    onDecisionUpdated: _loadVisitors,
                                  );
                                },
                              )),
              ),
            ),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton(
        backgroundColor: AppColors.primaryBlue,
        foregroundColor: Colors.white,
        child: const Icon(Icons.add_rounded, size: 28),
        onPressed: () {
          Navigator.of(context).push(
            MaterialPageRoute(builder: (_) => const InviteVisitorScreen()),
          ).then((_) => _loadVisitors());
        },
      ),
    );
  }

  Widget _buildTabItem(VisitorTab tab, String label) {
    final isSelected = _selectedTab == tab;
    return Expanded(
      child: InkWell(
        onTap: () => setState(() => _selectedTab = tab),
        borderRadius: BorderRadius.circular(9),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 8),
          decoration: BoxDecoration(
            color: isSelected ? Colors.white : Colors.transparent,
            borderRadius: BorderRadius.circular(9),
            boxShadow: isSelected ? AppDimensions.subtleShadow : null,
          ),
          alignment: Alignment.center,
          child: Text(
            label,
            style: AppTypography.caption.copyWith(
              fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
              color: isSelected ? AppColors.primaryBlue : AppColors.secondaryText,
            ),
          ),
        ),
      ),
    );
  }
}
