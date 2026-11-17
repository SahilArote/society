import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../core/constants/app_colors.dart';
import '../../core/widgets/visitor_photo_avatar.dart';
import '../../models/visitor_request.dart';
import '../../repositories/guard_repository.dart';
import '../../repositories/visitor_repository.dart';
import '../../services/language_service.dart';
import '../../services/phone_service.dart';
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

  String _resolveResidentPhone() {
    if (request.residentPhone.trim().isNotEmpty) {
      return request.residentPhone.trim();
    }
    for (final flatList in visitorRepo.wingFlats.values) {
      for (final flat in flatList) {
        if (flat.flatNumber.trim().toLowerCase() ==
                request.flatNumber.trim().toLowerCase() &&
            (request.buildingWing.isEmpty ||
                flat.buildingWing.trim().toLowerCase() ==
                    request.buildingWing.trim().toLowerCase())) {
          for (final resident in flat.residents) {
            if (resident.name.trim().toLowerCase() ==
                request.residentName.trim().toLowerCase()) {
              if (resident.phoneNumber.trim().isNotEmpty) {
                return resident.phoneNumber.trim();
              }
            }
          }
          final phone = flat.primaryResident?.phoneNumber;
          if (phone != null && phone.trim().isNotEmpty) {
            return phone.trim();
          }
        }
      }
    }
    return '';
  }

  @override
  Widget build(BuildContext context) {
    final reason = request.rejectionReason != null &&
            request.rejectionReason!.trim().isNotEmpty
        ? request.rejectionReason!.trim()
        : 'Entry denied by resident';

    final timeFormatted =
        DateFormat('hh:mm a, dd MMM yyyy').format(request.requestTime);
    final decisionTimeFormatted = request.decisionTime != null
        ? DateFormat('hh:mm a, dd MMM yyyy').format(request.decisionTime!)
        : null;

    final residentPhone = _resolveResidentPhone();

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: Text(
          tr('entryRejected'),
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
          onPressed: () => _handleDone(context),
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // 1. Modern Rejection Status Banner
              Container(
                width: double.infinity,
                padding:
                    const EdgeInsets.symmetric(vertical: 24, horizontal: 20),
                decoration: BoxDecoration(
                  color: const Color(0xFFFFF1F2),
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(
                      color: const Color(0xFFFECDD3), width: 1.2),
                ),
                child: Column(
                  children: [
                    Container(
                      width: 64,
                      height: 64,
                      decoration: BoxDecoration(
                        color: const Color(0xFFEF4444),
                        borderRadius: BorderRadius.circular(20),
                        boxShadow: [
                          BoxShadow(
                            color: const Color(0xFFEF4444).withOpacity(0.3),
                            blurRadius: 12,
                            offset: const Offset(0, 4),
                          ),
                        ],
                      ),
                      alignment: Alignment.center,
                      child: const Icon(
                        Icons.block_rounded,
                        color: Colors.white,
                        size: 34,
                      ),
                    ),
                    const SizedBox(height: 14),
                    const Text(
                      'ENTRY REJECTED',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 0.3,
                        color: Color(0xFF991B1B),
                        fontFamily: 'Inter',
                      ),
                    ),
                    const SizedBox(height: 5),
                    const Text(
                      'Resident has declined this visitor request',
                      style: TextStyle(
                        fontSize: 13.5,
                        fontWeight: FontWeight.w500,
                        color: Color(0xFFB91C1C),
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
                            child: (request.visitor.photoPath != null &&
                                    request.visitor.photoPath!.trim().isNotEmpty)
                                ? VisitorPhotoAvatar.buildImageWidget(
                                    request.visitor.photoPath,
                                    size: 58,
                                  )
                                : Center(
                                    child: Text(
                                      request.visitor.name.isNotEmpty
                                          ? request.visitor.name[0].toUpperCase()
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
                                request.visitor.name,
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
                                      request.visitor.type.displayName,
                                      style: const TextStyle(
                                        fontSize: 11.5,
                                        fontWeight: FontWeight.w700,
                                        color: AppColors.primary,
                                        fontFamily: 'Inter',
                                      ),
                                    ),
                                  ),
                                  if (request.visitor.phoneNumber != null &&
                                      request.visitor.phoneNumber!
                                          .trim()
                                          .isNotEmpty) ...[
                                    const SizedBox(width: 8),
                                    Flexible(
                                      child: Text(
                                        request.visitor.phoneNumber!.trim(),
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
                            color: const Color(0xFFFDE8E8),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text(
                            tr('statusRejected'),
                            style: const TextStyle(
                              fontSize: 11.5,
                              fontWeight: FontWeight.w700,
                              color: Color(0xFFA11A1A),
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
                          'Flat ${request.flatNumber} (${request.buildingWing})',
                    ),
                    const SizedBox(height: 10),

                    // Resident Row with Call button if phone exists
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Icon(Icons.person_rounded,
                            size: 16, color: Color(0xFF16A34A)),
                        const SizedBox(width: 8),
                        const SizedBox(
                          width: 100,
                          child: Text(
                            'Resident',
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                              color: Color(0xFF64748B),
                              fontFamily: 'Inter',
                            ),
                          ),
                        ),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                request.residentName,
                                style: const TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w700,
                                  color: Color(0xFF0F172A),
                                  fontFamily: 'Inter',
                                ),
                              ),
                              if (residentPhone.isNotEmpty)
                                Text(
                                  residentPhone,
                                  style: const TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w600,
                                    color: Color(0xFF64748B),
                                    fontFamily: 'Inter',
                                  ),
                                ),
                            ],
                          ),
                        ),
                        if (residentPhone.isNotEmpty)
                          Material(
                            color: Colors.transparent,
                            child: InkWell(
                              onTap: () => PhoneService.call(
                                residentPhone,
                                context: context,
                                contactName:
                                    '${request.buildingWing}-${request.flatNumber} · ${request.residentName}',
                              ),
                              borderRadius: BorderRadius.circular(8),
                              child: Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 10, vertical: 5),
                                decoration: BoxDecoration(
                                  color: const Color(0xFF16A34A),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: const Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(Icons.phone_rounded,
                                        size: 13, color: Colors.white),
                                    SizedBox(width: 4),
                                    Text(
                                      'Call',
                                      style: TextStyle(
                                        fontSize: 12,
                                        fontWeight: FontWeight.w700,
                                        color: Colors.white,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                      ],
                    ),

                    if (request.purpose.isNotEmpty) ...[
                      const SizedBox(height: 10),
                      _buildDetailRow(
                        icon: Icons.info_outline_rounded,
                        iconColor: const Color(0xFF64748B),
                        label: tr('purpose'),
                        value: request.purpose,
                      ),
                    ],
                    const SizedBox(height: 10),
                    _buildDetailRow(
                      icon: Icons.access_time_rounded,
                      iconColor: const Color(0xFF64748B),
                      label: tr('requestTime'),
                      value: timeFormatted,
                    ),
                    if (decisionTimeFormatted != null) ...[
                      const SizedBox(height: 10),
                      _buildDetailRow(
                        icon: Icons.cancel_outlined,
                        iconColor: const Color(0xFFDC2626),
                        label: tr('rejectionTime'),
                        value: decisionTimeFormatted,
                      ),
                    ],
                  ],
                ),
              ),

              const SizedBox(height: 16),

              // 3. Resident Rejection Reason Banner
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: const Color(0xFFFFF1F2),
                  borderRadius: BorderRadius.circular(16),
                  border:
                      Border.all(color: const Color(0xFFFECDD3), width: 1.0),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.feedback_outlined,
                            size: 16, color: Color(0xFFE11D48)),
                        const SizedBox(width: 6),
                        Text(
                          tr('rejectionReason').toUpperCase(),
                          style: const TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 0.5,
                            color: Color(0xFFE11D48),
                            fontFamily: 'Inter',
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      '“$reason”',
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF991B1B),
                        fontStyle: FontStyle.italic,
                        fontFamily: 'Inter',
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 24),

              // 4. Return to Dashboard Button
              SizedBox(
                width: double.infinity,
                height: 52,
                child: ElevatedButton.icon(
                  onPressed: () => _handleDone(context),
                  icon: const Icon(Icons.arrow_back_rounded, size: 20),
                  label: Text(
                    tr('returnToDashboard'),
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                      fontFamily: 'Inter',
                    ),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF0F172A),
                    foregroundColor: Colors.white,
                    elevation: 0,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
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
