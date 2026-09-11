import 'dart:async';
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
import 'entry_approved_screen.dart';
import 'entry_rejected_screen.dart';

class WaitingApprovalScreen extends StatefulWidget {
  final VisitorRequest request;
  final VisitorRepository visitorRepo;
  final GuardRepository guardRepo;

  const WaitingApprovalScreen({
    super.key,
    required this.request,
    required this.visitorRepo,
    required this.guardRepo,
  });

  @override
  State<WaitingApprovalScreen> createState() => _WaitingApprovalScreenState();
}

class _WaitingApprovalScreenState extends State<WaitingApprovalScreen> {
  @override
  void initState() {
    super.initState();
    widget.visitorRepo.addListener(_onRepositoryChanged);
  }

  void _onRepositoryChanged() {
    if (!mounted) return;
    final match = widget.visitorRepo.allRequests.firstWhere(
      (r) => r.id == widget.request.id,
      orElse: () => widget.request,
    );

    if (match.status == VisitorStatus.approved) {
      widget.visitorRepo.removeListener(_onRepositoryChanged);
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(
          builder: (_) => EntryApprovedScreen(
            request: match,
            visitorRepo: widget.visitorRepo,
            guardRepo: widget.guardRepo,
          ),
        ),
      );
    } else if (match.status == VisitorStatus.rejected) {
      widget.visitorRepo.removeListener(_onRepositoryChanged);
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(
          builder: (_) => EntryRejectedScreen(
            request: match,
            visitorRepo: widget.visitorRepo,
            guardRepo: widget.guardRepo,
          ),
        ),
      );
    }
  }

  Future<void> _simulateDecision(bool isApproved) async {
    await widget.visitorRepo.simulateResidentDecision(
      requestId: widget.request.id,
      isApproved: isApproved,
      reason: isApproved ? null : 'Entry denied by resident (Simulated)',
    );
  }

  @override
  void dispose() {
    widget.visitorRepo.removeListener(_onRepositoryChanged);
    super.dispose();
  }

  Future<void> _cancelRequest() async {
    await widget.visitorRepo.cancelRequest(widget.request.id);
    if (!mounted) return;
    Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    final reqTimeFormatted = DateFormat('hh:mm a').format(widget.request.requestTime);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Waiting for Resident Approval'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, size: 26),
          onPressed: _cancelRequest,
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              // Main Prominent Status Box
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 16),
                decoration: BoxDecoration(
                  color: AppColors.warningLight,
                  borderRadius: AppDimensions.roundedXl,
                  border: Border.all(color: AppColors.warning, width: 2.0),
                ),
                child: Column(
                  children: [
                    // Simple loading indicator
                    const SizedBox(
                      width: 52,
                      height: 52,
                      child: CircularProgressIndicator(
                        strokeWidth: 4.0,
                        valueColor: AlwaysStoppedAnimation<Color>(AppColors.warning),
                      ),
                    ),
                    const SizedBox(height: 18),
                    const Text(
                      'WAITING FOR APPROVAL',
                      style: TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.w900,
                        color: AppColors.warningText,
                        letterSpacing: 0.2,
                      ),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 6),
                    const Text(
                      'Request sent to resident',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        color: AppColors.warningText,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 20),

              // Visitor & Flat Details Card
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
                  children: [
                    // Visitor Photo
                    ClipRRect(
                      borderRadius: BorderRadius.circular(16),
                      child: Container(
                        width: 90,
                        height: 90,
                        color: AppColors.surfaceLow,
                        child: _buildPhoto(widget.request.visitor.photoPath),
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Visitor Name (Big & Bold)
                    Text(
                      widget.request.visitor.name,
                      style: const TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.w900,
                        color: AppColors.textPrimary,
                      ),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      widget.request.visitor.type.displayName,
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textSecondary,
                      ),
                    ),

                    const SizedBox(height: 18),
                    const Divider(height: 1, color: AppColors.border),
                    const SizedBox(height: 18),

                    // Destination Flat & Resident Info
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'FLAT NUMBER',
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w800,
                                color: AppColors.textSecondary,
                                letterSpacing: 0.5,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              widget.request.flatNumber,
                              style: const TextStyle(
                                fontSize: 20,
                                fontWeight: FontWeight.w900,
                                color: AppColors.textPrimary,
                              ),
                            ),
                          ],
                        ),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            const Text(
                              'RESIDENT NAME',
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w800,
                                color: AppColors.textSecondary,
                                letterSpacing: 0.5,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              widget.request.residentName,
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w800,
                                color: AppColors.primary,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),

                    const SizedBox(height: 14),
                    const Divider(height: 1, color: AppColors.border),
                    const SizedBox(height: 14),

                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Request Sent Time',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: AppColors.textSecondary,
                          ),
                        ),
                        Text(
                          reqTimeFormatted,
                          style: const TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w800,
                            color: AppColors.textPrimary,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 24),

              // Cancel Button
              CustomButton(
                text: 'CANCEL REQUEST',
                icon: Icons.close,
                variant: CustomButtonVariant.outline,
                height: 56,
                onPressed: _cancelRequest,
              ),

              // Developer / Test Simulation Section (Resident App Decision Simulation)
              Container(
                width: double.infinity,
                margin: const EdgeInsets.only(top: 24),
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.surfaceLow,
                  borderRadius: AppDimensions.roundedLg,
                  border: Border.all(color: AppColors.border, width: 1.5),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: const [
                        Icon(Icons.phonelink_ring, size: 18, color: AppColors.textSecondary),
                        SizedBox(width: 8),
                        Text(
                          'TEST RESIDENT PHONE SIMULATION',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w800,
                            color: AppColors.textSecondary,
                            letterSpacing: 0.5,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    const Text(
                      'Simulate how the resident responds on their phone:',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                        color: AppColors.textSecondary,
                      ),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: SizedBox(
                            height: 44,
                            child: OutlinedButton.icon(
                              onPressed: () => _simulateDecision(true),
                              icon: const Icon(Icons.check, color: AppColors.success, size: 18),
                              label: const Text(
                                'Simulate Approve',
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.successText,
                                ),
                              ),
                              style: OutlinedButton.styleFrom(
                                side: const BorderSide(color: AppColors.success, width: 1.5),
                                backgroundColor: AppColors.successLight,
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(10),
                                ),
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: SizedBox(
                            height: 44,
                            child: OutlinedButton.icon(
                              onPressed: () => _simulateDecision(false),
                              icon: const Icon(Icons.close, color: AppColors.error, size: 18),
                              label: const Text(
                                'Simulate Reject',
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.errorText,
                                ),
                              ),
                              style: OutlinedButton.styleFrom(
                                side: const BorderSide(color: AppColors.error, width: 1.5),
                                backgroundColor: AppColors.errorLight,
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(10),
                                ),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildPhoto(String? path) {
    if (path == null) {
      return const Icon(Icons.person, size: 44, color: AppColors.textMuted);
    }
    return SafeImage(path: path, fit: BoxFit.cover);
  }
}
