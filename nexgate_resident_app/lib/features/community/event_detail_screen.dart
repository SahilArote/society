import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_dimensions.dart';
import '../../core/utils/haptic_helper.dart';
import '../../core/widgets/confirmation_dialog.dart';
import '../../core/widgets/custom_app_bar.dart';
import '../../core/widgets/primary_button.dart';
import '../../core/widgets/secondary_button.dart';
import '../../models/society_event_model.dart';
import '../../services/api_service.dart';

class EventDetailScreen extends StatefulWidget {
  final SocietyEventModel event;

  const EventDetailScreen({super.key, required this.event});

  @override
  State<EventDetailScreen> createState() => _EventDetailScreenState();
}

class _EventDetailScreenState extends State<EventDetailScreen> {
  late SocietyEventModel _event;
  bool _isActing = false;

  @override
  void initState() {
    super.initState();
    _event = widget.event;
    _refreshEventDetail();
  }

  Future<void> _refreshEventDetail() async {
    try {
      final updated = await ApiService.fetchSocietyEventDetail(_event.id);
      if (mounted) setState(() => _event = updated);
    } catch (_) {}
  }

  Future<void> _handleRegister() async {
    int selectedGuests = 1;

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogCtx) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
              title: const Text(
                'Register for Event',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
              ),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    _event.title,
                    style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.primaryBlue),
                  ),
                  const SizedBox(height: 14),
                  const Text(
                    'Number of Attendees from your Flat:',
                    style: TextStyle(fontSize: 13, color: AppColors.secondaryText),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      IconButton(
                        onPressed: selectedGuests > 1
                            ? () => setDialogState(() => selectedGuests--)
                            : null,
                        icon: const Icon(Icons.remove_circle_outline_rounded),
                        color: AppColors.primaryBlue,
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                        decoration: BoxDecoration(
                          color: AppColors.lightBlue,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Text(
                          '$selectedGuests Person${selectedGuests > 1 ? 's' : ''}',
                          style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.primaryBlue),
                        ),
                      ),
                      IconButton(
                        onPressed: selectedGuests < 5
                            ? () => setDialogState(() => selectedGuests++)
                            : null,
                        icon: const Icon(Icons.add_circle_outline_rounded),
                        color: AppColors.primaryBlue,
                      ),
                    ],
                  ),
                ],
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.of(dialogCtx).pop(false),
                  child: const Text('Cancel', style: TextStyle(color: AppColors.secondaryText)),
                ),
                ElevatedButton(
                  onPressed: () => Navigator.of(dialogCtx).pop(true),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primaryBlue,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  child: const Text('Confirm RSVP'),
                ),
              ],
            );
          },
        );
      },
    );

    if (confirmed != true) return;

    HapticHelper.mediumImpact();
    setState(() => _isActing = true);

    try {
      await ApiService.registerForEvent(_event.id, guestCount: selectedGuests);
      if (!mounted) return;
      HapticHelper.success();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Registered $selectedGuests attendee(s) successfully!'),
          backgroundColor: AppColors.success,
        ),
      );
      await _refreshEventDetail();
    } catch (e) {
      if (!mounted) return;
      HapticHelper.error();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Registration failed: $e'),
          backgroundColor: AppColors.error,
        ),
      );
    } finally {
      if (mounted) setState(() => _isActing = false);
    }
  }

  Future<void> _handleCancelRegistration() async {
    final confirmed = await ConfirmationDialog.show(
      context,
      title: 'Cancel Event Registration?',
      message: 'Are you sure you want to cancel your RSVP for "${_event.title}"?',
      confirmLabel: 'Cancel RSVP',
      isDestructive: true,
    );

    if (confirmed != true) return;

    HapticHelper.mediumImpact();
    setState(() => _isActing = true);

    try {
      await ApiService.cancelEventRegistration(_event.id);
      if (!mounted) return;
      HapticHelper.success();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Registration cancelled'),
          backgroundColor: AppColors.warning,
        ),
      );
      await _refreshEventDetail();
    } catch (e) {
      if (!mounted) return;
      HapticHelper.error();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Failed to cancel: $e'),
          backgroundColor: AppColors.error,
        ),
      );
    } finally {
      if (mounted) setState(() => _isActing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    final dateStr = '${_event.eventDate.day} ${monthNames[_event.eventDate.month - 1]} ${_event.eventDate.year}';

    return Scaffold(
      backgroundColor: AppColors.mainBackground,
      appBar: CustomAppBar(
        title: _event.title,
        showBack: true,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Cover Image
            if (_event.coverImage != null && _event.coverImage!.isNotEmpty) ...[
              ClipRRect(
                borderRadius: BorderRadius.circular(18),
                child: Image.network(
                  _event.coverImage!,
                  height: 200,
                  width: double.infinity,
                  fit: BoxFit.cover,
                  errorBuilder: (context, error, stackTrace) => _buildCoverPlaceholder(),
                ),
              ),
              const SizedBox(height: 16),
            ] else ...[
              _buildCoverPlaceholder(),
              const SizedBox(height: 16),
            ],

            // Event Header Card
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: AppColors.border),
                boxShadow: AppDimensions.subtleShadow,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: AppColors.lightBlue,
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          _event.category,
                          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.primaryBlue),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: _event.isUpcoming ? const Color(0xFFFEF3C7) : const Color(0xFFE2E8F0),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          _event.status,
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            color: _event.isUpcoming ? const Color(0xFFD97706) : AppColors.secondaryText,
                          ),
                        ),
                      ),
                      const Spacer(),
                      if (_event.capacity > 0)
                        Text(
                          '${_event.registrationCount} / ${_event.capacity} seats',
                          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.secondaryText),
                        ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  // Title
                  Text(
                    _event.title,
                    style: const TextStyle(fontSize: 19, fontWeight: FontWeight.w800, color: AppColors.primaryText),
                  ),
                  const SizedBox(height: 16),
                  const Divider(height: 1, color: AppColors.borderLight),
                  const SizedBox(height: 14),

                  // Date, Time, Venue, Organizer
                  _buildEventDetailRow(Icons.calendar_today_rounded, 'Date', dateStr),
                  const SizedBox(height: 10),
                  _buildEventDetailRow(Icons.access_time_rounded, 'Time', _event.timeStr),
                  const SizedBox(height: 10),
                  _buildEventDetailRow(Icons.location_on_outlined, 'Venue', _event.venue),
                  const SizedBox(height: 10),
                  _buildEventDetailRow(Icons.groups_rounded, 'Organizer', _event.organizer),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Description
            const Text(
              'About the Event',
              style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: AppColors.primaryText),
            ),
            const SizedBox(height: 8),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.border),
              ),
              child: Text(
                _event.description,
                style: const TextStyle(fontSize: 14, color: AppColors.secondaryText, height: 1.5),
              ),
            ),
            const SizedBox(height: 24),

            // Registration Action Section
            if (_event.isRegistered) ...[
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: const Color(0xFFDCFCE7),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: const Color(0xFF86EFAC)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.check_circle_rounded, color: Color(0xFF16A34A), size: 24),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'You are Registered!',
                            style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: Color(0xFF16A34A)),
                          ),
                          Text(
                            'RSVP confirmed for ${_event.guestCount ?? 1} attendee(s)',
                            style: const TextStyle(fontSize: 12, color: Color(0xFF15803D)),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 14),
              SecondaryButton(
                label: 'Cancel Registration',
                icon: Icons.cancel_outlined,
                isLoading: _isActing, textColor: AppColors.error, borderColor: AppColors.error,
                onPressed: _handleCancelRegistration,
              ),
            ] else if (_event.isUpcoming) ...[
              if (_event.isFull)
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF1F5F9),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: const Text(
                    'Event Registration is Full',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.mutedText),
                  ),
                )
              else
                PrimaryButton(
                  label: 'Register for Event (RSVP)',
                  icon: Icons.how_to_reg_rounded,
                  isLoading: _isActing,
                  onPressed: _handleRegister,
                ),
            ] else ...[
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 14),
                decoration: BoxDecoration(
                  color: const Color(0xFFF1F5F9),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: const Text(
                  'Event has Concluded',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: AppColors.mutedText),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildCoverPlaceholder() {
    return Container(
      height: 140,
      width: double.infinity,
      decoration: BoxDecoration(
        color: const Color(0xFF0F172A),
        borderRadius: BorderRadius.circular(18),
      ),
      child: const Center(
        child: Icon(Icons.event_rounded, size: 48, color: Color(0xFFF59E0B)),
      ),
    );
  }

  Widget _buildEventDetailRow(IconData icon, String label, String value) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 18, color: AppColors.primaryBlue),
        const SizedBox(width: 10),
        Text(
          '$label: ',
          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.secondaryText),
        ),
        Expanded(
          child: Text(
            value,
            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.primaryText),
          ),
        ),
      ],
    );
  }
}
