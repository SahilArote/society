import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_dimensions.dart';
import '../../core/utils/haptic_helper.dart';
import '../../core/widgets/custom_app_bar.dart';
import 'events_tab.dart';
import 'lost_found_tab.dart';

class CommunityScreen extends StatefulWidget {
  final int initialSubTab; // 0 for Lost & Found, 1 for Events

  const CommunityScreen({super.key, this.initialSubTab = 0});

  @override
  State<CommunityScreen> createState() => _CommunityScreenState();
}

class _CommunityScreenState extends State<CommunityScreen> {
  late int _activeTab; // 0 = Lost & Found, 1 = Events

  @override
  void initState() {
    super.initState();
    _activeTab = widget.initialSubTab;
  }

  void _onTabChanged(int index) {
    if (_activeTab == index) return;
    HapticHelper.selectionClick();
    setState(() => _activeTab = index);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.mainBackground,
      appBar: const CustomAppBar(
        title: 'Community',
        subtitle: 'Society notices, lost items & upcoming events',
        showBack: false,
      ),
      body: Column(
        children: [
          // Top Pill Tabs: Strictly Lost & Found and Events (NO Marketplace)
          Container(
            color: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            child: Row(
              children: [
                _buildTabButton('Lost & Found', 0),
                const SizedBox(width: 8),
                _buildTabButton('Events', 1),
              ],
            ),
          ),
          const Divider(height: 1, color: AppColors.border),

          // Tab Content
          Expanded(
            child: IndexedStack(
              index: _activeTab,
              children: const [
                LostFoundTab(),
                EventsTab(),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTabButton(String label, int index) {
    final isSelected = _activeTab == index;
    return Expanded(
      child: GestureDetector(
        onTap: () => _onTabChanged(index),
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
}
