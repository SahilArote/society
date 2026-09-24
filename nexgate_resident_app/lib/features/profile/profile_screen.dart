import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_dimensions.dart';
import '../../core/constants/app_typography.dart';
import '../../core/utils/haptic_helper.dart';
import '../../core/widgets/confirmation_dialog.dart';
import '../../core/widgets/custom_app_bar.dart';
import '../../services/auth_service.dart';
import '../auth/login_screen.dart';
import '../household/family_members_screen.dart';
import '../household/flat_details_screen.dart';
import '../household/vehicles_screen.dart';

/// Resident Profile & Settings Screen.
class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  Future<void> _handleLogout(BuildContext context) async {
    final confirmed = await ConfirmationDialog.show(
      context,
      title: 'Sign Out of NexGate',
      message: 'Are you sure you want to sign out? You will need your mobile number to log back in.',
      confirmLabel: 'Sign Out',
      isDestructive: true,
      icon: Icons.logout_rounded,
    );

    if (confirmed == true) {
      await AuthService.logout();
      if (!context.mounted) return;
      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(builder: (_) => const LoginScreen()),
        (route) => false,
      );
    }
  }

  void _testDoorbell(BuildContext context) {
    HapticHelper.heavyImpact();
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Row(
          children: [
            Icon(Icons.doorbell_rounded, color: Colors.white, size: 20),
            SizedBox(width: 10),
            Text('🔔 Gate Doorbell Chime & Haptic Alert Active!'),
          ],
        ),
        backgroundColor: AppColors.primaryBlue,
        duration: Duration(seconds: 2),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final user = AuthService.currentUser.value;
    final name = user?.name ?? 'Resident';
    final flat = user?.flatNumber ?? 'Unit';
    final wing = user?.wing ?? '';
    final mobile = user?.mobile ?? '';
    final society = user?.societyName ?? 'Green Gate Residency';

    return Scaffold(
      backgroundColor: AppColors.mainBackground,
      appBar: const CustomAppBar(
        title: 'My Profile & Settings',
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 14.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // User Profile Header Card
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
                    Container(
                      width: 56,
                      height: 56,
                      decoration: const BoxDecoration(
                        gradient: AppColors.brandGradient,
                        shape: BoxShape.circle,
                      ),
                      child: Center(
                        child: Text(
                          name.isNotEmpty ? name[0].toUpperCase() : 'R',
                          style: AppTypography.displayMedium.copyWith(
                            color: Colors.white,
                            fontSize: 22,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            name,
                            style: AppTypography.titleMedium.copyWith(
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: AppColors.lightPurple,
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: Text(
                                  'Flat $flat ${wing.isNotEmpty ? "($wing)" : ""}',
                                  style: AppTypography.caption.copyWith(
                                    fontWeight: FontWeight.w700,
                                    color: AppColors.deepPurple,
                                    fontSize: 10,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          if (mobile.isNotEmpty) ...[
                            const SizedBox(height: 2),
                            Text(
                              '+91 $mobile',
                              style: AppTypography.caption.copyWith(
                                color: AppColors.secondaryText,
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 24),

              // Residence Management Group
              Text('RESIDENCE & HOUSEHOLD', style: AppTypography.sectionHeader),
              const SizedBox(height: 8),
              _buildSettingsGroup([
                _SettingsTile(
                  icon: Icons.apartment_rounded,
                  iconColor: AppColors.primaryBlue,
                  iconBg: AppColors.lightBlue,
                  title: 'Society Unit & Flat Details',
                  subtitle: '$society • Flat $flat',
                  onTap: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(builder: (_) => const FlatDetailsScreen()),
                    );
                  },
                ),
                _SettingsTile(
                  icon: Icons.family_restroom_rounded,
                  iconColor: const Color(0xFFDB2777),
                  iconBg: const Color(0xFFFCE7F3),
                  title: 'Household Family Members',
                  subtitle: 'Register family & access permissions',
                  onTap: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(builder: (_) => const FamilyMembersScreen()),
                    );
                  },
                ),
                _SettingsTile(
                  icon: Icons.directions_car_rounded,
                  iconColor: AppColors.warning,
                  iconBg: const Color(0xFFFEF3C7),
                  title: 'Registered Vehicles',
                  subtitle: 'Authorized parking & gate access tags',
                  onTap: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(builder: (_) => const VehiclesScreen()),
                    );
                  },
                ),
              ]),

              const SizedBox(height: 24),

              // Security & Alerts Group
              Text('SECURITY & ALERTS', style: AppTypography.sectionHeader),
              const SizedBox(height: 8),
              _buildSettingsGroup([
                _SettingsTile(
                  icon: Icons.doorbell_rounded,
                  iconColor: AppColors.deepPurple,
                  iconBg: AppColors.lightPurple,
                  title: 'Test Gate Doorbell Chime',
                  subtitle: 'Simulate gate guard arrival alert chime',
                  onTap: () => _testDoorbell(context),
                ),
                _SettingsTile(
                  icon: Icons.security_rounded,
                  iconColor: AppColors.success,
                  iconBg: AppColors.successBackground,
                  title: 'Security Gate Intercom',
                  subtitle: 'Main Security Gate • Guard on Duty',
                  onTap: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Gate Intercom: Main Security Desk (Ext: 101)')),
                    );
                  },
                ),
              ]),

              const SizedBox(height: 24),

              // App Version & Sign Out
              Text('SYSTEM', style: AppTypography.sectionHeader),
              const SizedBox(height: 8),
              _buildSettingsGroup([
                _SettingsTile(
                  icon: Icons.info_outline_rounded,
                  iconColor: AppColors.secondaryText,
                  iconBg: AppColors.mainBackground,
                  title: 'NexGate Resident App',
                  subtitle: 'Version 1.0.0 (Native Flutter Edition)',
                  onTap: () {},
                ),
                _SettingsTile(
                  icon: Icons.logout_rounded,
                  iconColor: AppColors.error,
                  iconBg: AppColors.errorBackground,
                  title: 'Sign Out',
                  subtitle: 'Log out of this resident device',
                  isDestructive: true,
                  onTap: () => _handleLogout(context),
                ),
              ]),

              const SizedBox(height: 40),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSettingsGroup(List<Widget> children) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: AppDimensions.roundedLarge,
        border: Border.all(color: AppColors.border),
        boxShadow: AppDimensions.subtleShadow,
      ),
      child: Column(
        children: List.generate(children.length, (index) {
          return Column(
            children: [
              children[index],
              if (index < children.length - 1)
                const Divider(height: 1, indent: 56),
            ],
          );
        }),
      ),
    );
  }
}

class _SettingsTile extends StatelessWidget {
  final IconData icon;
  final Color iconColor;
  final Color iconBg;
  final String title;
  final String subtitle;
  final VoidCallback onTap;
  final bool isDestructive;

  const _SettingsTile({
    required this.icon,
    required this.iconColor,
    required this.iconBg,
    required this.title,
    required this.subtitle,
    required this.onTap,
    this.isDestructive = false,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: () {
        HapticHelper.lightImpact();
        onTap();
      },
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0),
        child: Row(
          children: [
            Container(
              width: 38,
              height: 38,
              decoration: BoxDecoration(
                color: iconBg,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(icon, color: iconColor, size: 20),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: AppTypography.titleSmall.copyWith(
                      color: isDestructive ? AppColors.error : AppColors.primaryText,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: AppTypography.caption.copyWith(
                      color: AppColors.secondaryText,
                    ),
                  ),
                ],
              ),
            ),
            const Icon(
              Icons.chevron_right_rounded,
              color: AppColors.secondaryText,
              size: 20,
            ),
          ],
        ),
      ),
    );
  }
}
