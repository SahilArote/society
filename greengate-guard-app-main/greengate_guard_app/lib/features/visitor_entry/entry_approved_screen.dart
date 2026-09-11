import 'dart:io';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_dimensions.dart';
import '../../core/widgets/custom_button.dart';
import '../../core/widgets/safe_image.dart';
import '../../models/visitor_request.dart';
import '../../repositories/visitor_repository.dart';
import '../../repositories/guard_repository.dart';
import '../dashboard/main_navigation.dart';

class EntryApprovedScreen extends StatefulWidget {
  final VisitorRequest request;
  final VisitorRepository visitorRepo;
  final GuardRepository guardRepo;

  const EntryApprovedScreen({
    super.key,
    required this.request,
    required this.visitorRepo,
    required this.guardRepo,
  });

  @override
  State<EntryApprovedScreen> createState() => _EntryApprovedScreenState();
}

class _EntryApprovedScreenState extends State<EntryApprovedScreen> {
  bool _isProcessing = false;

  Future<void> _handleAllowEntry() async {
    setState(() => _isProcessing = true);
    await widget.visitorRepo.completeEntry(widget.request.id);
    if (!mounted) return;
    setState(() => _isProcessing = false);

    // Return to Dashboard clean stack
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(
        builder: (_) => MainNavigation(guardRepo: widget.guardRepo),
      ),
      (route) => false,
    );
  }

  @override
  Widget build(BuildContext context) {
    final decisionTime = widget.request.decisionTime ?? DateTime.now();
    final timeFormatted = DateFormat('hh:mm a').format(decisionTime);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Visitor Approved'),
        automaticallyImplyLeading: false,
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
          child: Column(
            children: [
              // Large Visually Obvious Green Approval Banner
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 26, horizontal: 16),
                decoration: BoxDecoration(
                  color: AppColors.successLight,
                  borderRadius: AppDimensions.roundedXl,
                  border: Border.all(color: AppColors.success, width: 2.5),
                ),
                child: Column(
                  children: [
                    // Large Green Success Check Icon
                    Container(
                      width: 76,
                      height: 76,
                      decoration: const BoxDecoration(
                        color: AppColors.success,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.check, color: Colors.white, size: 48),
                    ),
                    const SizedBox(height: 16),
                    const Text(
                      'ENTRY APPROVED',
                      style: TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.w900,
                        letterSpacing: -0.3,
                        color: AppColors.successText,
                      ),
                    ),
                    const SizedBox(height: 6),
                    const Text(
                      'Resident has approved this visitor',
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                        color: AppColors.successText,
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 20),

              // Visitor & Authorization Details Card
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: AppDimensions.roundedXl,
                  border: Border.all(color: AppColors.border, width: 1.5),
                  boxShadow: AppDimensions.cardShadow,
                ),
                child: Column(
                  children: [
                    // Visitor Profile
                    Row(
                      children: [
                        ClipRRect(
                          borderRadius: BorderRadius.circular(14),
                          child: Container(
                            width: 68,
                            height: 68,
                            color: AppColors.surfaceLow,
                            child: _buildPhoto(widget.request.visitor.photoPath),
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                widget.request.visitor.name,
                                style: const TextStyle(
                                  fontSize: 20,
                                  fontWeight: FontWeight.w900,
                                  color: AppColors.textPrimary,
                                ),
                              ),
                              const SizedBox(height: 3),
                              Text(
                                '${widget.request.visitor.type.displayName} ${widget.request.visitor.deliveryCompany != null ? "• ${widget.request.visitor.deliveryCompany!}" : ""}',
                                style: const TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w600,
                                  color: AppColors.textSecondary,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),

                    const SizedBox(height: 18),
                    const Divider(height: 1, color: AppColors.border),
                    const SizedBox(height: 18),

                    // Destination Unit
                    _buildInfoRow(
                      icon: Icons.apartment,
                      title: 'FLAT NUMBER',
                      value: '${widget.request.flatNumber} (${widget.request.buildingWing})',
                    ),
                    const SizedBox(height: 14),
                    // Approved By
                    _buildInfoRow(
                      icon: Icons.how_to_reg,
                      title: 'APPROVED BY',
                      value: widget.request.residentName,
                    ),
                    const SizedBox(height: 14),
                    // Approval Time
                    _buildInfoRow(
                      icon: Icons.access_time_filled,
                      title: 'APPROVAL TIME',
                      value: timeFormatted,
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 24),

              // Large COMPLETE ENTRY Button (64px height)
              CustomButton(
                text: 'COMPLETE ENTRY',
                icon: Icons.done_all,
                height: 64,
                variant: CustomButtonVariant.success,
                isLoading: _isProcessing,
                onPressed: _handleAllowEntry,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildInfoRow({
    required IconData icon,
    required String title,
    required String value,
  }) {
    return Row(
      children: [
        Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: AppColors.surfaceLow,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: AppColors.border),
          ),
          child: Icon(icon, size: 20, color: AppColors.primary),
        ),
        const SizedBox(width: 14),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textSecondary,
                  letterSpacing: 0.5,
                ),
              ),
              Text(
                value,
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w800,
                  color: AppColors.textPrimary,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildPhoto(String? path) {
    if (path == null) {
      return const Icon(Icons.person, size: 40, color: AppColors.textMuted);
    }
    return SafeImage(path: path, fit: BoxFit.cover);
  }
}
