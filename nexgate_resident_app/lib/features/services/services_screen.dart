import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_dimensions.dart';
import '../../core/constants/app_typography.dart';
import '../../core/utils/haptic_helper.dart';
import '../../core/widgets/custom_app_bar.dart';
import '../../core/widgets/empty_state_widget.dart';
import '../../core/widgets/error_state_widget.dart';
import '../../core/widgets/loading_skeleton.dart';
import '../../models/society_service_model.dart';
import '../../services/api_service.dart';
import '../../services/dialer_service.dart';
import 'service_detail_screen.dart';

class ServicesScreen extends StatefulWidget {
  const ServicesScreen({super.key});

  @override
  State<ServicesScreen> createState() => _ServicesScreenState();
}

class _ServicesScreenState extends State<ServicesScreen> {
  String _selectedTab = 'VENDORS'; // 'VENDORS', 'UTILITIES', 'STAFF'
  String _selectedCategory = 'All';
  String _searchQuery = '';
  final TextEditingController _searchController = TextEditingController();

  bool _isLoading = true;
  String? _errorMessage;
  List<SocietyServiceModel> _services = [];

  static const List<String> _categories = [
    'All',
    'Electrician',
    'Plumber',
    'AC Repair',
    'Carpenter',
    'Pest Control',
    'Lift AMC',
    'Deep Cleaning',
    'Water Purifier',
    'CCTV / Security',
    'Water Can',
    'Milk Delivery',
    'Painter',
    'Packers & Movers',
    'Maid & Housekeeping',
  ];

  static const List<Color> _avatarColors = [
    Color(0xFF0D9488),
    Color(0xFF2563EB),
    Color(0xFF9333EA),
    Color(0xFFDB2777),
    Color(0xFFD97706),
    Color(0xFF16A34A),
    Color(0xFF4F46E5),
    Color(0xFFE11D48),
  ];

  Color _getAvatarColor(String name) {
    if (name.isEmpty) return _avatarColors[0];
    final code = name.codeUnits.reduce((a, b) => a + b);
    return _avatarColors[code % _avatarColors.length];
  }

  @override
  void initState() {
    super.initState();
    _loadServices();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadServices({bool silent = false}) async {
    if (!silent) {
      setState(() {
        _isLoading = true;
        _errorMessage = null;
      });
    }

    try {
      final typeParam = _selectedTab == 'VENDORS'
          ? 'vendors'
          : (_selectedTab == 'UTILITIES' ? 'utilities' : 'staff');

      final results = await ApiService.fetchServices(
        type: typeParam,
        category: _selectedCategory,
        search: _searchQuery,
      );

      if (!mounted) return;
      setState(() {
        _services = results;
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

  void _onTabChanged(String tab) {
    if (_selectedTab == tab) return;
    HapticHelper.selectionClick();
    setState(() {
      _selectedTab = tab;
      _selectedCategory = 'All';
    });
    _loadServices();
  }

  void _onCategoryChanged(String category) {
    if (_selectedCategory == category) return;
    HapticHelper.selectionClick();
    setState(() => _selectedCategory = category);
    _loadServices();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.mainBackground,
      appBar: const CustomAppBar(
        title: 'Services',
        subtitle: 'Verified society vendors & daily utilities',
        showBack: false,
      ),
      body: RefreshIndicator(
        onRefresh: () => _loadServices(silent: true),
        color: AppColors.primaryBlue,
        child: Column(
          children: [
            // Top Filter Tabs (Vendors, Utilities, Staff Hire)
            _buildTypeFilterTabs(),

            // Search Bar & Horizontal Category Filter
            _buildSearchAndCategories(),

            // Main Services List
            Expanded(child: _buildBody()),
          ],
        ),
      ),
    );
  }

  Widget _buildTypeFilterTabs() {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      child: Row(
        children: [
          _buildPillTab('Vendors', 'VENDORS'),
          const SizedBox(width: 8),
          _buildPillTab('Utilities', 'UTILITIES'),
          const SizedBox(width: 8),
          _buildPillTab('Staff Hire', 'STAFF'),
        ],
      ),
    );
  }

  Widget _buildPillTab(String label, String value) {
    final isSelected = _selectedTab == value;
    return Expanded(
      child: GestureDetector(
        onTap: () => _onTabChanged(value),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          padding: const EdgeInsets.symmetric(vertical: 9),
          decoration: BoxDecoration(
            color: isSelected ? const Color(0xFF0F172A) : Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: isSelected ? const Color(0xFF0F172A) : AppColors.border,
              width: 1,
            ),
            boxShadow: isSelected ? AppDimensions.subtleShadow : null,
          ),
          child: Text(
            label,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 13,
              fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
              color: isSelected ? Colors.white : AppColors.secondaryText,
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSearchAndCategories() {
    return Container(
      color: Colors.white,
      child: Column(
        children: [
          // Search Input
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 10),
            child: Container(
              height: 44,
              decoration: BoxDecoration(
                color: const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.border),
              ),
              child: Row(
                children: [
                  const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 12),
                    child: Icon(Icons.search_rounded, color: AppColors.secondaryText, size: 20),
                  ),
                  Expanded(
                    child: TextField(
                      controller: _searchController,
                      style: AppTypography.bodySmall,
                      decoration: const InputDecoration(
                        hintText: 'Search vendors, services, or category...',
                        hintStyle: TextStyle(color: AppColors.mutedText, fontSize: 13),
                        border: InputBorder.none,
                        isDense: true,
                        contentPadding: EdgeInsets.symmetric(vertical: 10),
                      ),
                      onChanged: (val) {
                        _searchQuery = val;
                        _loadServices(silent: true);
                      },
                    ),
                  ),
                  if (_searchQuery.isNotEmpty)
                    IconButton(
                      icon: const Icon(Icons.clear_rounded, size: 18, color: AppColors.secondaryText),
                      onPressed: () {
                        _searchController.clear();
                        _searchQuery = '';
                        _loadServices(silent: true);
                      },
                    ),
                ],
              ),
            ),
          ),

          // Horizontal Category Filter Chips
          SizedBox(
            height: 38,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: _categories.length,
              separatorBuilder: (_, index) => const SizedBox(width: 8),
              itemBuilder: (context, index) {
                final cat = _categories[index];
                final isSelected = _selectedCategory == cat;
                return GestureDetector(
                  onTap: () => _onCategoryChanged(cat),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 150),
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
                    decoration: BoxDecoration(
                      color: isSelected ? const Color(0xFF0F172A) : Colors.white,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                        color: isSelected ? const Color(0xFF0F172A) : AppColors.border,
                      ),
                    ),
                    child: Text(
                      cat,
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
                        color: isSelected ? Colors.white : AppColors.secondaryText,
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
          const SizedBox(height: 10),
          const Divider(height: 1, color: AppColors.border),
        ],
      ),
    );
  }

  Widget _buildBody() {
    if (_isLoading) {
      return ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: 5,
        separatorBuilder: (_, index) => const SizedBox(height: 12),
        itemBuilder: (_, index) => const LoadingSkeleton(width: double.infinity, height: 90, borderRadius: BorderRadius.all(Radius.circular(16))),
      );
    }

    if (_errorMessage != null) {
      return ErrorStateWidget(
        message: 'Could not load society services: $_errorMessage',
        onRetry: _loadServices,
      );
    }

    if (_services.isEmpty) {
      return EmptyStateWidget(
        icon: Icons.search_off_rounded,
        title: 'No Services Found',
        description: _searchQuery.isNotEmpty
            ? 'No services matching "$_searchQuery". Try another keyword or category.'
            : 'No services available in this category currently.',
        buttonLabel: 'Clear Filters',
        onButtonPressed: () {
          setState(() {
            _searchController.clear();
            _searchQuery = '';
            _selectedCategory = 'All';
          });
          _loadServices();
        },
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 24),
      itemCount: _services.length,
      separatorBuilder: (_, index) => const SizedBox(height: 12),
      itemBuilder: (context, index) {
        final service = _services[index];
        return _buildServiceCard(service);
      },
    );
  }

  Widget _buildServiceCard(SocietyServiceModel service) {
    final avatarColor = _getAvatarColor(service.name);

    return InkWell(
      onTap: () {
        HapticHelper.lightImpact();
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (_) => ServiceDetailScreen(service: service),
          ),
        );
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
            // Avatar with initials
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: avatarColor.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Center(
                child: Text(
                  service.initials,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: avatarColor,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 12),

            // Info Column
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Flexible(
                        child: Text(
                          service.name,
                          style: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w700,
                            color: AppColors.primaryText,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      if (service.isVerified) ...[
                        const SizedBox(width: 4),
                        const Icon(
                          Icons.verified_rounded,
                          size: 14,
                          color: AppColors.success,
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 3),
                  Text(
                    '${service.category}${service.address != null ? ' · ${service.address}' : ''}',
                    style: const TextStyle(
                      fontSize: 12,
                      color: AppColors.secondaryText,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 5),
                  Row(
                    children: [
                      const Icon(Icons.star_rounded, size: 14, color: Color(0xFFF59E0B)),
                      const SizedBox(width: 3),
                      Text(
                        service.rating.toStringAsFixed(1),
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          color: AppColors.primaryText,
                        ),
                      ),
                      const SizedBox(width: 3),
                      Text(
                        '(${service.reviewCount} reviews)',
                        style: const TextStyle(
                          fontSize: 11,
                          color: AppColors.mutedText,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),

            // Call Button
            ElevatedButton.icon(
              onPressed: () {
                HapticHelper.mediumImpact();
                DialerService.openDialer(service.phone, context: context);
              },
              icon: const Icon(Icons.phone_rounded, size: 13, color: Colors.white),
              label: const Text(
                'Call',
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.white),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF0F172A),
                foregroundColor: Colors.white,
                elevation: 0,
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                minimumSize: const Size(0, 36),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
