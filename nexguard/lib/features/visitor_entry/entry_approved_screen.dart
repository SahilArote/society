import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../core/constants/app_colors.dart';
import '../../core/widgets/visitor_photo_avatar.dart';
import '../../models/visitor_request.dart';
import '../../repositories/guard_repository.dart';
import '../../repositories/visitor_repository.dart';
import '../../services/language_service.dart';
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

  void _handleDone() {
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(
        builder: (_) => MainNavigation(guardRepo: widget.guardRepo),
      ),
      (route) => false,
    );
  }

  Future<void> _handleAllowEntry() async {
    setState(() => _isProcessing = true);
    await widget.visitorRepo.completeEntry(widget.request.id);
    if (!mounted) return;
    setState(() => _isProcessing = false);

    _handleDone();
  }

  @override
  Widget build(BuildContext context) {
    final decisionTime = widget.request.decisionTime ?? DateTime.now();
    final timeFormatted =
        DateFormat('hh:mm a, dd MMM yyyy').format(decisionTime);

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: Text(
          tr('entryApproved'),
          style: const TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w700,
            color: Color(0xFF0F172A),
            fontFamily: 'Inter',
          ),
        ),
        backgroundColor: Colors.white,
        elevation: 0,
        centerTitle: true,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded, color: Color(0xFF0F172A)),
          onPressed: _handleDone,
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // 1. Modern Approval Status Banner
              Container(
                width: double.infinity,
                padding:
                    const EdgeInsets.symmetric(vertical: 24, horizontal: 20),
                decoration: BoxDecoration(
                  color: const Color(0xFFF0FDF4),
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(
                      color: const Color(0xFFBBF7D0), width: 1.2),
                ),
                child: Column(
                  children: [
                    Container(
                      width: 64,
                      height: 64,
                      decoration: BoxDecoration(
                        color: const Color(0xFF16A34A),
                        borderRadius: BorderRadius.circular(20),
                        boxShadow: [
                          BoxShadow(
                            color: const Color(0xFF16A34A).withOpacity(0.3),
                            blurRadius: 12,
                            offset: const Offset(0, 4),
                          ),
                        ],
                      ),
                      alignment: Alignment.center,
                      child: const Icon(
                        Icons.check_rounded,
                        color: Colors.white,
                        size: 34,
                      ),
                    ),
                    const SizedBox(height: 14),
                    const Text(
                      'ENTRY APPROVED',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 0.3,
                        color: Color(0xFF166534),
                        fontFamily: 'Inter',
                      ),
                    ),
                    const SizedBox(height: 5),
                    const Text(
                      'Resident has approved this visitor entry',
                      style: TextStyle(
                        fontSize: 13.5,
                        fontWeight: FontWeight.w500,
                        color: Color(0xFF15803D),
                        fontFamily: 'Inter',
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 16),

              // 2. Visitor Profile Card
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  border:
                      Border.all(color: const Color(0xFFE2E8F0), width: 1.0),
                  boxShadow: const [
                    BoxShadow(
                      color: Color.fromRGBO(0, 0, 0, 0.03),
                      blurRadius: 10,
                      offset: Offset(0, 2),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Profile Header Row
                    Row(
                      children: [
                        ClipRRect(
                          borderRadius: BorderRadius.circular(16),
                          child: Container(
                            width: 58,
                            height: 58,
                            color: const Color(0xFFEEF0FF),
                            child: (widget.request.visitor.photoPath != null &&
                                    widget.request.visitor.photoPath!
                                        .trim()
                                        .isNotEmpty)
                                ? VisitorPhotoAvatar.buildImageWidget(
                                    widget.request.visitor.photoPath,
                                    size: 58,
                                  )
                                : Center(
                                    child: Text(
                                      widget.request.visitor.name.isNotEmpty
                                          ? widget.request.visitor.name[0]
                                              .toUpperCase()
                                          : 'V',
                                      style: const TextStyle(
                                        fontSize: 22,
                                        fontWeight: FontWeight.bold,
                                        color: AppColors.primary,
                                        fontFamily: 'Inter',
                                      ),
                                    ),
                                  ),
                          ),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                widget.request.visitor.name,
                                style: const TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.w800,
                                  color: Color(0xFF0F172A),
                                  fontFamily: 'Inter',
                                ),
                              ),
                              const SizedBox(height: 4),
                              Row(
                                children: [
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                        horizontal: 8, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFFEEF0FF),
                                      borderRadius: BorderRadius.circular(6),
                                    ),
                                    child: Text(
                                      widget.request.visitor.type.displayName,
                                      style: const TextStyle(
                                        fontSize: 11.5,
                                        fontWeight: FontWeight.w700,
                                        color: AppColors.primary,
                                        fontFamily: 'Inter',
                                      ),
                                    ),
                                  ),
                                  if (widget.request.visitor.phoneNumber !=
                                          null &&
                                      widget.request.visitor.phoneNumber!
                                          .trim()
                                          .isNotEmpty) ...[
                                    const SizedBox(width: 8),
                                    Flexible(
                                      child: Text(
                                        widget.request.visitor.phoneNumber!
                                            .trim(),
                                        style: const TextStyle(
                                          fontSize: 12.5,
                                          fontWeight: FontWeight.w600,
                                          color: Color(0xFF64748B),
                                          fontFamily: 'Inter',
                                        ),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ),
                                  ],
                                ],
                              ),
                            ],
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: const Color(0xFFE7F6EC),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text(
                            tr('statusApproved'),
                            style: const TextStyle(
                              fontSize: 11.5,
                              fontWeight: FontWeight.w700,
                              color: Color(0xFF0B6B38),
                              fontFamily: 'Inter',
                            ),
                          ),
                        ),
                      ],
                    ),

                    const SizedBox(height: 16),
                    const Divider(height: 1, color: Color(0xFFE2E8F0)),
                    const SizedBox(height: 14),

                    // Destination Flat
                    _buildDetailRow(
                      icon: Icons.apartment_rounded,
                      iconColor: const Color(0xFF4F46E5),
                      label: 'Destination',
                      value:
                          'Flat ${widget.request.flatNumber} (${widget.request.buildingWing})',
                    ),
                    const SizedBox(height: 10),
                    _buildDetailRow(
                      icon: Icons.person_rounded,
                      iconColor: const Color(0xFF16A34A),
                      label: 'Approved By',
                      value: widget.request.residentName,
                    ),
                    if (widget.request.purpose.isNotEmpty) ...[
                      const SizedBox(height: 10),
                      _buildDetailRow(
                        icon: Icons.info_outline_rounded,
                        iconColor: const Color(0xFF64748B),
                        label: tr('purpose'),
                        value: widget.request.purpose,
                      ),
                    ],
                    const SizedBox(height: 10),
                    _buildDetailRow(
                      icon: Icons.access_time_rounded,
                      iconColor: const Color(0xFF16A34A),
                      label: tr('approvalTime'),
                      value: timeFormatted,
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 24),

              // 3. Action Buttons
              SizedBox(
                width: double.infinity,
                height: 52,
                child: ElevatedButton.icon(
                  onPressed: _isProcessing ? null : _handleAllowEntry,
                  icon: _isProcessing
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : const Icon(Icons.login_rounded, size: 20),
                  label: Text(
                    _isProcessing ? 'Processing...' : tr('allowGateEntry'),
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                      fontFamily: 'Inter',
                    ),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF16A34A),
                    foregroundColor: Colors.white,
                    elevation: 0,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 10),
              SizedBox(
                width: double.infinity,
                height: 50,
                child: OutlinedButton(
                  onPressed: _handleDone,
                  style: OutlinedButton.styleFrom(
                    foregroundColor: const Color(0xFF475569),
                    side: const BorderSide(color: Color(0xFFCBD5E1), width: 1.2),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                  ),
                  child: Text(
                    tr('returnToDashboard'),
                    style: const TextStyle(
                      fontSize: 14.5,
                      fontWeight: FontWeight.w600,
                      fontFamily: 'Inter',
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildDetailRow({
    required IconData icon,
    required Color iconColor,
    required String label,
    required String value,
  }) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 16, color: iconColor),
        const SizedBox(width: 8),
        SizedBox(
          width: 100,
          child: Text(
            label,
            style: const TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: Color(0xFF64748B),
              fontFamily: 'Inter',
            ),
          ),
        ),
        Expanded(
          child: Text(
            value,
            style: const TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w700,
              color: Color(0xFF0F172A),
              fontFamily: 'Inter',
            ),
          ),
        ),
      ],
    );
  }
}
