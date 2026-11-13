import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_dimensions.dart';
import '../../core/utils/haptic_helper.dart';
import '../../core/widgets/custom_app_bar.dart';
import '../../core/widgets/primary_button.dart';
import '../../core/widgets/secondary_button.dart';
import '../../models/society_service_model.dart';
import '../../services/dialer_service.dart';

class ServiceDetailScreen extends StatelessWidget {
  final SocietyServiceModel service;

  const ServiceDetailScreen({super.key, required this.service});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.mainBackground,
      appBar: CustomAppBar(
        title: service.name,
        showBack: true,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Top Header Card
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AppColors.border),
                boxShadow: AppDimensions.subtleShadow,
              ),
              child: Column(
                children: [
                  Row(
                    children: [
                      Container(
                        width: 56,
                        height: 56,
                        decoration: BoxDecoration(
                          color: AppColors.primaryBlue.withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: Center(
                          child: Text(
                            service.initials,
                            style: const TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w800,
                              color: AppColors.primaryBlue,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Flexible(
                                  child: Text(
                                    service.name,
                                    style: const TextStyle(
                                      fontSize: 17,
                                      fontWeight: FontWeight.w700,
                                      color: AppColors.primaryText,
                                    ),
                                  ),
                                ),
                                if (service.isVerified) ...[
                                  const SizedBox(width: 6),
                                  const Icon(
                                    Icons.verified_rounded,
                                    color: AppColors.success,
                                    size: 18,
                                  ),
                                ],
                              ],
                            ),
                            const SizedBox(height: 4),
                            Text(
                              service.category,
                              style: const TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                                color: AppColors.primaryBlue,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  const Divider(height: 1, color: AppColors.border),
                  const SizedBox(height: 14),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceAround,
                    children: [
                      _buildHeaderStat(
                        icon: Icons.star_rounded,
                        iconColor: const Color(0xFFF59E0B),
                        label: 'Rating',
                        value: '${service.rating.toStringAsFixed(1)} / 5.0',
                      ),
                      _buildHeaderStat(
                        icon: Icons.reviews_rounded,
                        iconColor: AppColors.primaryPurple,
                        label: 'Reviews',
                        value: '${service.reviewCount} verified',
                      ),
                      _buildHeaderStat(
                        icon: Icons.shield_rounded,
                        iconColor: AppColors.success,
                        label: 'Verification',
                        value: service.isVerified ? 'Society Verified' : 'Standard',
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 18),

            // Service Overview & Scope
            if (service.description != null && service.description!.isNotEmpty) ...[
              _buildSectionTitle('Service Scope & Description'),
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
                  service.description!,
                  style: const TextStyle(
                    fontSize: 14,
                    color: AppColors.secondaryText,
                    height: 1.5,
                  ),
                ),
              ),
              const SizedBox(height: 18),
            ],

            // Contact & Operating Details
            _buildSectionTitle('Provider Details & Location'),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.border),
              ),
              child: Column(
                children: [
                  if (service.providerName != null) ...[
                    _buildInfoRow(
                      icon: Icons.person_outline_rounded,
                      title: 'Contact Person',
                      value: service.providerName!,
                    ),
                    const Divider(height: 20, color: AppColors.borderLight),
                  ],
                  _buildInfoRow(
                    icon: Icons.phone_outlined,
                    title: 'Phone Number',
                    value: service.phone,
                  ),
                  if (service.alternatePhone != null) ...[
                    const Divider(height: 20, color: AppColors.borderLight),
                    _buildInfoRow(
                      icon: Icons.phone_in_talk_outlined,
                      title: 'Alternate Phone',
                      value: service.alternatePhone!,
                    ),
                  ],
                  if (service.timing != null) ...[
                    const Divider(height: 20, color: AppColors.borderLight),
                    _buildInfoRow(
                      icon: Icons.access_time_rounded,
                      title: 'Operating Hours',
                      value: service.timing!,
                    ),
                  ],
                  if (service.address != null) ...[
                    const Divider(height: 20, color: AppColors.borderLight),
                    _buildInfoRow(
                      icon: Icons.location_on_outlined,
                      title: 'Address / Location',
                      value: service.address!,
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 32),

            // Call Button
            PrimaryButton(
              label: 'Call Provider (${service.phone})',
              icon: Icons.phone_rounded,
              onPressed: () {
                HapticHelper.mediumImpact();
                DialerService.openDialer(service.phone, context: context);
              },
            ),
            const SizedBox(height: 12),
            if (service.alternatePhone != null)
              SecondaryButton(
                label: 'Call Alternate (${service.alternatePhone})',
                icon: Icons.phone_forwarded_rounded,
                onPressed: () {
                  HapticHelper.mediumImpact();
                  DialerService.openDialer(service.alternatePhone, context: context);
                },
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Text(
      title,
      style: const TextStyle(
        fontSize: 15,
        fontWeight: FontWeight.w700,
        color: AppColors.primaryText,
      ),
    );
  }

  Widget _buildHeaderStat({
    required IconData icon,
    required Color iconColor,
    required String label,
    required String value,
  }) {
    return Column(
      children: [
        Icon(icon, size: 20, color: iconColor),
        const SizedBox(height: 4),
        Text(
          value,
          style: const TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w700,
            color: AppColors.primaryText,
          ),
        ),
        Text(
          label,
          style: const TextStyle(
            fontSize: 10,
            color: AppColors.mutedText,
          ),
        ),
      ],
    );
  }

  Widget _buildInfoRow({
    required IconData icon,
    required String title,
    required String value,
  }) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 20, color: AppColors.primaryBlue),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: const TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w500,
                  color: AppColors.mutedText,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                value,
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: AppColors.primaryText,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
