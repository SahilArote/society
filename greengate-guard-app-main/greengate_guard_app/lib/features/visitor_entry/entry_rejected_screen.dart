import 'dart:io';
import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_dimensions.dart';
import '../../core/widgets/custom_button.dart';
import '../../core/widgets/safe_image.dart';
import '../../models/visitor_request.dart';
import '../../repositories/visitor_repository.dart';
import '../../repositories/guard_repository.dart';
import '../dashboard/main_navigation.dart';

class EntryRejectedScreen extends StatelessWidget {
  final VisitorRequest request;
  final VisitorRepository visitorRepo;
  final GuardRepository guardRepo;

  const EntryRejectedScreen({
    super.key,
    required this.request,
    required this.visitorRepo,
    required this.guardRepo,
  });

  void _handleDone(BuildContext context) {
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(
        builder: (_) => MainNavigation(guardRepo: guardRepo),
      ),
      (route) => false,
    );
  }

  @override
  Widget build(BuildContext context) {
    final reason = request.rejectionReason ?? 'Entry declined by resident';

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Visitor Rejected'),
        automaticallyImplyLeading: false,
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
          child: Column(
            children: [
              // Large Visually Obvious Red Rejection Banner
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 26, horizontal: 16),
                decoration: BoxDecoration(
                  color: AppColors.errorLight,
                  borderRadius: AppDimensions.roundedXl,
                  border: Border.all(color: AppColors.error, width: 2.5),
                ),
                child: Column(
                  children: [
                    // Large Red Rejected Cross Icon
                    Container(
                      width: 76,
                      height: 76,
                      decoration: const BoxDecoration(
                        color: AppColors.error,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.close, color: Colors.white, size: 48),
                    ),
                    const SizedBox(height: 16),
                    const Text(
                      'ENTRY REJECTED',
                      style: TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.w900,
                        letterSpacing: -0.3,
                        color: AppColors.errorText,
                      ),
                    ),
                    const SizedBox(height: 6),
                    const Text(
                      'Resident has rejected this visitor request',
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                        color: AppColors.errorText,
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 20),

              // Rejection Details Card
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: AppDimensions.roundedXl,
                  border: Border.all(color: AppColors.border, width: 1.5),
                  boxShadow: AppDimensions.cardShadow,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Visitor Summary Row
                    Row(
                      children: [
                        ClipRRect(
                          borderRadius: BorderRadius.circular(12),
                          child: Container(
                            width: 64,
                            height: 64,
                            color: AppColors.surfaceLow,
                            child: _buildPhoto(request.visitor.photoPath),
                          ),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                request.visitor.name,
                                style: const TextStyle(
                                  fontSize: 19,
                                  fontWeight: FontWeight.w900,
                                  color: AppColors.textPrimary,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                'Flat ${request.flatNumber} • ${request.buildingWing}',
                                style: const TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w700,
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

                    // Resident Reason
                    const Text(
                      'REASON FROM RESIDENT',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w800,
                        color: AppColors.error,
                        letterSpacing: 0.5,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: AppColors.errorLight,
                        borderRadius: AppDimensions.roundedMd,
                      ),
                      child: Text(
                        '“$reason”',
                        style: const TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                          color: AppColors.errorText,
                          fontStyle: FontStyle.italic,
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 24),

              // Large DONE Button (64px height)
              CustomButton(
                text: 'DONE',
                icon: Icons.check,
                height: 64,
                variant: CustomButtonVariant.primary,
                onPressed: () => _handleDone(context),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildPhoto(String? path) {
    if (path == null) {
      return const Icon(Icons.person, size: 36, color: AppColors.textMuted);
    }
    return SafeImage(path: path, fit: BoxFit.cover);
  }
}
