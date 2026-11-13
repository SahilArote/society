import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_dimensions.dart';
import '../../core/utils/haptic_helper.dart';
import '../../core/widgets/empty_state_widget.dart';
import '../../core/widgets/error_state_widget.dart';
import '../../core/widgets/loading_skeleton.dart';
import '../../models/society_event_model.dart';
import '../../services/api_service.dart';
import 'event_detail_screen.dart';

class EventsTab extends StatefulWidget {
  const EventsTab({super.key});

  @override
  State<EventsTab> createState() => _EventsTabState();
}

class _EventsTabState extends State<EventsTab> {
  String _filter = 'upcoming'; // 'upcoming' or 'past'
  bool _isLoading = true;
  String? _errorMessage;
  List<SocietyEventModel> _events = [];

  @override
  void initState() {
    super.initState();
    _loadEvents();
  }

  Future<void> _loadEvents({bool silent = false}) async {
    if (!silent) {
      setState(() {
        _isLoading = true;
        _errorMessage = null;
      });
    }

    try {
      final results = await ApiService.fetchSocietyEvents(filter: _filter);
      if (!mounted) return;
      setState(() {
        _events = results;
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
    _loadEvents();
  }

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: () => _loadEvents(silent: true),
      color: AppColors.primaryBlue,
      child: Column(
        children: [
          // Filter Toggle: Upcoming vs Past Events
          Container(
            color: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            child: Row(
              children: [
                _buildToggleButton('Upcoming Events', 'upcoming'),
                const SizedBox(width: 8),
                _buildToggleButton('Past Events', 'past'),
              ],
            ),
          ),
          const Divider(height: 1, color: AppColors.border),

          // Events List
          Expanded(child: _buildList()),
        ],
      ),
    );
  }

  Widget _buildToggleButton(String label, String value) {
    final isSelected = _filter == value;
    return Expanded(
      child: GestureDetector(
        onTap: () => _onFilterChanged(value),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 150),
          padding: const EdgeInsets.symmetric(vertical: 8),
          decoration: BoxDecoration(
            color: isSelected ? const Color(0xFF0F172A) : Colors.white,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: isSelected ? const Color(0xFF0F172A) : AppColors.border,
            ),
          ),
          child: Text(
            label,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 12,
              fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
              color: isSelected ? Colors.white : AppColors.secondaryText,
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildList() {
    if (_isLoading) {
      return ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: 3,
        separatorBuilder: (_, index) => const SizedBox(height: 12),
        itemBuilder: (_, index) => const LoadingSkeleton(width: double.infinity, height: 110, borderRadius: BorderRadius.all(Radius.circular(16))),
      );
    }

    if (_errorMessage != null) {
      return ErrorStateWidget(
        message: 'Could not load society events: $_errorMessage',
        onRetry: _loadEvents,
      );
    }

    if (_events.isEmpty) {
      return EmptyStateWidget(
        icon: Icons.event_busy_rounded,
        title: _filter == 'upcoming' ? 'No Upcoming Events' : 'No Past Events',
        description: _filter == 'upcoming'
            ? 'There are no upcoming society events scheduled right now. Check back soon!'
            : 'No past society event records found.',
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 24),
      itemCount: _events.length,
      separatorBuilder: (_, index) => const SizedBox(height: 12),
      itemBuilder: (context, index) {
        final event = _events[index];
        return _buildEventCard(event);
      },
    );
  }

  Widget _buildEventCard(SocietyEventModel event) {
    const monthNames = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    final day = event.eventDate.day;
    final month = monthNames[event.eventDate.month - 1];

    return InkWell(
      onTap: () async {
        HapticHelper.lightImpact();
        final refreshed = await Navigator.of(context).push<bool>(
          MaterialPageRoute(
            builder: (_) => EventDetailScreen(event: event),
          ),
        );
        if (refreshed == true) {
          _loadEvents();
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
            // Calendar Block
            Container(
              width: 48,
              height: 52,
              decoration: BoxDecoration(
                color: const Color(0xFF0F172A),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    '$day',
                    style: const TextStyle(
                      color: Color(0xFFF59E0B),
                      fontSize: 16,
                      fontWeight: FontWeight.w800,
                      height: 1.1,
                    ),
                  ),
                  Text(
                    month,
                    style: const TextStyle(
                      color: Colors.white70,
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 14),

            // Info Column
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Status Badge & Category
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: AppColors.lightBlue,
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          event.category,
                          style: const TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                            color: AppColors.primaryBlue,
                          ),
                        ),
                      ),
                      const Spacer(),
                      if (event.isRegistered)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: const Color(0xFFDCFCE7),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: const Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.check_rounded, size: 10, color: Color(0xFF16A34A)),
                              SizedBox(width: 2),
                              Text(
                                'Registered',
                                style: TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.w700,
                                  color: Color(0xFF16A34A),
                                ),
                              ),
                            ],
                          ),
                        )
                      else if (event.isFull)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: const Color(0xFFFEF2F2),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: const Text(
                            'Full',
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w700,
                              color: Color(0xFFDC2626),
                            ),
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 6),

                  // Title
                  Text(
                    event.title,
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      color: AppColors.primaryText,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 3),

                  // Time & Venue
                  Text(
                    '${event.timeStr} · ${event.venue}',
                    style: const TextStyle(
                      fontSize: 12,
                      color: AppColors.secondaryText,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),

                  // Organizer
                  Text(
                    'By: ${event.organizer}',
                    style: const TextStyle(
                      fontSize: 11,
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
