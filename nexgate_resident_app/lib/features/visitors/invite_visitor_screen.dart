import 'dart:math';
import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_dimensions.dart';
import '../../core/constants/app_typography.dart';
import '../../core/utils/date_formatter.dart';
import '../../core/widgets/custom_app_bar.dart';
import '../../core/widgets/custom_text_field.dart';
import '../../core/widgets/primary_button.dart';
import 'digital_pass_screen.dart';

/// Screen to create a pre-approved visitor entry invitation.
class InviteVisitorScreen extends StatefulWidget {
  const InviteVisitorScreen({super.key});

  @override
  State<InviteVisitorScreen> createState() => _InviteVisitorScreenState();
}

class _InviteVisitorScreenState extends State<InviteVisitorScreen> {
  final TextEditingController _nameController = TextEditingController();
  final TextEditingController _phoneController = TextEditingController();
  final TextEditingController _notesController = TextEditingController();

  String _selectedPurpose = 'guest';
  DateTime _selectedDate = DateTime.now();
  TimeOfDay _selectedTime = TimeOfDay.now();

  final List<String> _purposes = const ['guest', 'delivery', 'service', 'cab'];

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate,
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 30)),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: const ColorScheme.light(
              primary: AppColors.primaryBlue,
            ),
          ),
          child: child!,
        );
      },
    );
    if (picked != null) {
      setState(() => _selectedDate = picked);
    }
  }

  Future<void> _pickTime() async {
    final picked = await showTimePicker(
      context: context,
      initialTime: _selectedTime,
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: const ColorScheme.light(
              primary: AppColors.primaryBlue,
            ),
          ),
          child: child!,
        );
      },
    );
    if (picked != null) {
      setState(() => _selectedTime = picked);
    }
  }

  void _handleCreatePass() {
    final name = _nameController.text.trim();
    if (name.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter visitor name')),
      );
      return;
    }

    final code = '${100000 + Random().nextInt(900000)}';
    final dateStr = DateFormatter.formatDate(_selectedDate);
    final timeStr = _selectedTime.format(context);

    Navigator.of(context).pushReplacement(
      MaterialPageRoute(
        builder: (_) => DigitalPassScreen(
          passId: code,
          visitorName: name,
          purpose: _selectedPurpose,
          date: dateStr,
          time: timeStr,
          notes: _notesController.text.trim(),
        ),
      ),
    );
  }

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.mainBackground,
      appBar: const CustomAppBar(
        title: 'Invite Visitor',
        showBack: true,
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 14.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Guest Identity Card
              Text('GUEST INFORMATION', style: AppTypography.sectionHeader),
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: AppDimensions.roundedLarge,
                  border: Border.all(color: AppColors.border),
                  boxShadow: AppDimensions.subtleShadow,
                ),
                child: Column(
                  children: [
                    CustomTextField(
                      controller: _nameController,
                      label: 'Visitor Full Name *',
                      hint: 'e.g. Rahul Sharma',
                      autofocus: true,
                    ),
                    const SizedBox(height: 16),
                    CustomTextField(
                      controller: _phoneController,
                      label: 'Mobile Number (Optional)',
                      hint: '10-digit mobile number',
                      keyboardType: TextInputType.phone,
                      prefix: const Padding(
                        padding: EdgeInsets.symmetric(horizontal: 12),
                        child: Text('+91', style: TextStyle(fontWeight: FontWeight.bold)),
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 20),

              // Visit Purpose Selector
              Text('VISIT PURPOSE', style: AppTypography.sectionHeader),
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: AppDimensions.roundedLarge,
                  border: Border.all(color: AppColors.border),
                  boxShadow: AppDimensions.subtleShadow,
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: _purposes.map((p) {
                    final isSelected = _selectedPurpose == p;
                    return InkWell(
                      onTap: () => setState(() => _selectedPurpose = p),
                      borderRadius: BorderRadius.circular(10),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                        decoration: BoxDecoration(
                          color: isSelected ? AppColors.primaryBlue : AppColors.mainBackground,
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(
                            color: isSelected ? AppColors.primaryBlue : AppColors.border,
                          ),
                        ),
                        child: Text(
                          p.toUpperCase(),
                          style: AppTypography.caption.copyWith(
                            color: isSelected ? Colors.white : AppColors.primaryText,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    );
                  }).toList(),
                ),
              ),

              const SizedBox(height: 20),

              // Date & Time Scheduling
              Text('SCHEDULE', style: AppTypography.sectionHeader),
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: AppDimensions.roundedLarge,
                  border: Border.all(color: AppColors.border),
                  boxShadow: AppDimensions.subtleShadow,
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: InkWell(
                        onTap: _pickDate,
                        borderRadius: BorderRadius.circular(10),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                          decoration: BoxDecoration(
                            color: AppColors.mainBackground,
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: AppColors.border),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('Date', style: AppTypography.caption),
                              const SizedBox(height: 4),
                              Row(
                                children: [
                                  const Icon(Icons.calendar_today_rounded,
                                      size: 16, color: AppColors.primaryBlue),
                                  const SizedBox(width: 6),
                                  Text(
                                    DateFormatter.formatDate(_selectedDate),
                                    style: AppTypography.bodySmall
                                        .copyWith(fontWeight: FontWeight.w700),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: InkWell(
                        onTap: _pickTime,
                        borderRadius: BorderRadius.circular(10),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                          decoration: BoxDecoration(
                            color: AppColors.mainBackground,
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: AppColors.border),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('Time', style: AppTypography.caption),
                              const SizedBox(height: 4),
                              Row(
                                children: [
                                  const Icon(Icons.access_time_rounded,
                                      size: 16, color: AppColors.primaryBlue),
                                  const SizedBox(width: 6),
                                  Text(
                                    _selectedTime.format(context),
                                    style: AppTypography.bodySmall
                                        .copyWith(fontWeight: FontWeight.w700),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 20),

              // Instructions / Gate Notes
              Text('INSTRUCTIONS (OPTIONAL)', style: AppTypography.sectionHeader),
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: AppDimensions.roundedLarge,
                  border: Border.all(color: AppColors.border),
                  boxShadow: AppDimensions.subtleShadow,
                ),
                child: CustomTextField(
                  controller: _notesController,
                  hint: 'e.g. Leave package with security guard if not home',
                  maxLines: 2,
                ),
              ),

              const SizedBox(height: 32),

              PrimaryButton(
                label: 'Generate Digital Entry Pass',
                icon: Icons.qr_code_2_rounded,
                onPressed: _handleCreatePass,
              ),

              const SizedBox(height: 20),
            ],
          ),
        ),
      ),
    );
  }
}
