import 'dart:io';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_dimensions.dart';
import '../../core/widgets/custom_button.dart';
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
    widget.visitorRepo.addListener(_handleRepoUpdate);
  }

  void _handleRepoUpdate() {
    final current = widget.visitorRepo.allRequests.firstWhere(
      (r) => r.id == widget.request.id,
      orElse: () => widget.request,
    );

    if (!mounted) return;

    if (current.status == VisitorStatus.approved) {
      widget.visitorRepo.removeListener(_handleRepoUpdate);
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(
          builder: (_) => EntryApprovedScreen(
            request: current,
            visitorRepo: widget.visitorRepo,
            guardRepo: widget.guardRepo,
          ),
        ),
      );
    } else if (current.status == VisitorStatus.rejected) {
      widget.visitorRepo.removeListener(_handleRepoUpdate);
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(
          builder: (_) => EntryRejectedScreen(
            request: current,
            visitorRepo: widget.visitorRepo,
            guardRepo: widget.guardRepo,
          ),
        ),
      );
    }
  }

  void _navigateBackToDashboard() {
    widget.visitorRepo.removeListener(_handleRepoUpdate);
    Navigator.of(context).popUntil((route) => route.isFirst);
  }

  @override
  void dispose() {
    widget.visitorRepo.removeListener(_handleRepoUpdate);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final reqTimeFormatted = DateFormat('hh:mm a').format(widget.request.requestTime);

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) {
          _navigateBackToDashboard();
        }
      },
      child: Scaffold(
        backgroundColor: AppColors.background,
        appBar: AppBar(
          title: const Text('Waiting for Resident Approval'),
          leading: IconButton(
            icon: const Icon(Icons.arrow_back, size: 26),
            onPressed: _navigateBackToDashboard,
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

                // Return to Dashboard Button (keeps request PENDING in background)
                CustomButton(
                  text: 'BACK TO DASHBOARD',
                  icon: Icons.home_outlined,
                  variant: CustomButtonVariant.outline,
                  height: 56,
                  onPressed: _navigateBackToDashboard,
                ),

                const SizedBox(height: 12),

                // Helper note explaining background status
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
                  decoration: BoxDecoration(
                    color: AppColors.surfaceLow,
                    borderRadius: AppDimensions.roundedLg,
                    border: Border.all(color: AppColors.border, width: 1.0),
                  ),
                  child: Row(
                    children: const [
                      Icon(Icons.info_outline, size: 20, color: AppColors.textSecondary),
                      SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          'This request remains Pending in the background. You can register another visitor or monitor status in History.',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: AppColors.textSecondary,
                            height: 1.3,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildPhoto(String? path) {
    if (path == null) {
      return const Icon(Icons.person, size: 44, color: AppColors.textMuted);
    }
    if (path.startsWith('assets/')) {
      return Image.asset(path, fit: BoxFit.cover);
    }
    return Image.file(File(path), fit: BoxFit.cover);
  }
}
