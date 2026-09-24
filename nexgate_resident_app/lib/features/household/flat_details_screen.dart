import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_dimensions.dart';
import '../../core/constants/app_typography.dart';
import '../../core/widgets/custom_app_bar.dart';
import '../../core/widgets/status_badge.dart';
import '../../services/auth_service.dart';
import 'family_members_screen.dart';
import 'vehicles_screen.dart';

/// Screen displaying Society Unit, Flat details, and quick manage links.
class FlatDetailsScreen extends StatelessWidget {
  const FlatDetailsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final user = AuthService.currentUser.value;
    final flatNumber = user?.flatNumber ?? 'Unit';
    final wing = user?.wing ?? 'Tower A';
    final society = user?.societyName ?? 'Green Gate Residency';

    return Scaffold(
      backgroundColor: AppColors.mainBackground,
      appBar: const CustomAppBar(
        title: 'Flat & Society Details',
        showBack: true,
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 14.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Society Banner
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  gradient: AppColors.brandGradient,
                  borderRadius: AppDimensions.roundedLarge,
                  boxShadow: AppDimensions.cardShadow,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      society,
                      style: AppTypography.titleLarge.copyWith(
                        color: Colors.white,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'Residential Gate Access Authorized',
                      style: AppTypography.bodySmall.copyWith(
                        color: const Color(0xFFC7D2FE),
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 20),

              // Unit Details Card
              Text('RESIDENCE UNIT', style: AppTypography.sectionHeader),
              const SizedBox(height: 8),
              Container(
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: AppDimensions.roundedLarge,
                  border: Border.all(color: AppColors.border),
                  boxShadow: AppDimensions.subtleShadow,
                ),
                child: Column(
                  children: [
                    _buildRow('Building Wing', wing),
                    const Divider(),
                    _buildRow('Flat Number', flatNumber),
                    const Divider(),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text('Resident Status', style: AppTypography.caption),
                          const StatusBadge(label: 'Active Resident', type: BadgeType.approved),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 24),

              // Quick Manage Links (Family & Vehicles)
              Text('HOUSEHOLD MANAGEMENT', style: AppTypography.sectionHeader),
              const SizedBox(height: 8),

              _buildNavCard(
                context,
                icon: Icons.family_restroom_rounded,
                iconBg: AppColors.lightPurple,
                iconColor: AppColors.deepPurple,
                title: 'Family Members',
                subtitle: 'Manage co-residents & gate access permissions',
                onTap: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(builder: (_) => const FamilyMembersScreen()),
                  );
                },
              ),

              const SizedBox(height: 10),

              _buildNavCard(
                context,
                icon: Icons.directions_car_rounded,
                iconBg: const Color(0xFFFEF3C7),
                iconColor: AppColors.warning,
                title: 'Authorized Vehicles',
                subtitle: 'Manage parking tags & automatic gate registration',
                onTap: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(builder: (_) => const VehiclesScreen()),
                  );
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: AppTypography.caption),
          Text(value, style: AppTypography.bodyMedium.copyWith(fontWeight: FontWeight.w700)),
        ],
      ),
    );
  }

  Widget _buildNavCard(
    BuildContext context, {
    required IconData icon,
    required Color iconBg,
    required Color iconColor,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: AppDimensions.roundedLarge,
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: AppDimensions.roundedLarge,
          border: Border.all(color: AppColors.border),
          boxShadow: AppDimensions.subtleShadow,
        ),
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: iconBg,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, color: iconColor, size: 22),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: AppTypography.titleSmall),
                  const SizedBox(height: 2),
                  Text(subtitle, style: AppTypography.caption),
                ],
              ),
            ),
            const Icon(Icons.chevron_right_rounded, color: AppColors.secondaryText),
          ],
        ),
      ),
    );
  }
}
