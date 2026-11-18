import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../core/utils/haptic_helper.dart';
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
    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: const SystemUiOverlayStyle(
        statusBarColor: Colors.transparent,
        statusBarIconBrightness: Brightness.dark,
        statusBarBrightness: Brightness.light,
      ),
      child: Scaffold(
        backgroundColor: const Color(0xFFF8FAFC),
        body: SafeArea(
          bottom: false,
          child: Column(
            children: [
              // Header Section matching design
              _buildHeader(),

              // Tab Content: Strictly Lost & Found and Events (NO Marketplace)
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
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Container(
      color: Colors.white,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Title
          const Padding(
            padding: EdgeInsets.fromLTRB(16, 16, 16, 10),
            child: Text(
              'Community',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.w800,
                color: Color(0xFF0F172A),
                letterSpacing: -0.4,
              ),
            ),
          ),

          // Thin Header Divider
          const Divider(height: 1, thickness: 1, color: Color(0xFFF1F5F9)),

          // Segmented Pill Tabs: Lost & Found | Events
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
            child: Container(
              height: 48,
              padding: const EdgeInsets.all(4),
              decoration: BoxDecoration(
                color: const Color(0xFFF1F5F9),
                borderRadius: BorderRadius.circular(24),
              ),
              child: Row(
                children: [
                  _buildSegmentTab('Lost & Found', 0),
                  _buildSegmentTab('Events', 1),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSegmentTab(String label, int index) {
    final isSelected = _activeTab == index;
    return Expanded(
      child: GestureDetector(
        onTap: () => _onTabChanged(index),
        behavior: HitTestBehavior.opaque,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          curve: Curves.easeInOut,
          decoration: BoxDecoration(
            color: isSelected ? const Color(0xFF1E60D5) : Colors.transparent,
            borderRadius: BorderRadius.circular(20),
            boxShadow: isSelected
                ? [
                    BoxShadow(
                      color: const Color(0xFF1E60D5).withValues(alpha: 0.3),
                      blurRadius: 8,
                      offset: const Offset(0, 3),
                    ),
                  ]
                : null,
          ),
          alignment: Alignment.center,
          child: Text(
            label,
            style: TextStyle(
              fontSize: 14,
              fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
              color: isSelected ? Colors.white : const Color(0xFF64748B),
            ),
          ),
        ),
      ),
    );
  }
}
