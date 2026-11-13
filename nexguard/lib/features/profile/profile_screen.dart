import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../repositories/guard_repository.dart';
import '../auth/login_screen.dart';

/// Guard App - Profile Screen
/// Matches the reference design pixel-by-pixel.
class ProfileScreen extends StatelessWidget {
  final GuardRepository guardRepo;

  const ProfileScreen({super.key, required this.guardRepo});

  void _showChangePinDialog(BuildContext context) {
    final oldPinController = TextEditingController();
    final newPinController = TextEditingController();
    String? error;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setState) => AlertDialog(
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
          ),
          backgroundColor: Colors.white,
          title: const Row(
            children: [
              Icon(Icons.lock_reset_rounded,
                  color: AppColors.primary, size: 24),
              SizedBox(width: 10),
              Text(
                'Change Security PIN',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: AppColors.textPrimary,
                  fontFamily: 'Inter',
                ),
              ),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text(
                'Enter your current 4-digit PIN and choose a new 4-digit PIN for gate access.',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w400,
                  color: AppColors.textMuted,
                  fontFamily: 'Inter',
                ),
              ),
              const SizedBox(height: 18),
              TextField(
                controller: oldPinController,
                obscureText: true,
                keyboardType: TextInputType.number,
                maxLength: 4,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 6.0,
                  color: AppColors.textPrimary,
                  fontFamily: 'Inter',
                ),
                decoration: InputDecoration(
                  counterText: '',
                  labelText: 'Current 4-Digit PIN',
                  labelStyle: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    fontFamily: 'Inter',
                  ),
                  filled: true,
                  fillColor: AppColors.fieldBg,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                    borderSide: const BorderSide(color: AppColors.border),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                    borderSide: const BorderSide(color: AppColors.border),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                    borderSide:
                        const BorderSide(color: AppColors.primary, width: 2),
                  ),
                ),
              ),
              const SizedBox(height: 14),
              TextField(
                controller: newPinController,
                obscureText: true,
                keyboardType: TextInputType.number,
                maxLength: 4,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 6.0,
                  color: AppColors.primary,
                  fontFamily: 'Inter',
                ),
                decoration: InputDecoration(
                  counterText: '',
                  labelText: 'New 4-Digit PIN',
                  labelStyle: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    fontFamily: 'Inter',
                  ),
                  filled: true,
                  fillColor: AppColors.fieldBg,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                    borderSide: const BorderSide(color: AppColors.border),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                    borderSide: const BorderSide(color: AppColors.border),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(14),
                    borderSide:
                        const BorderSide(color: AppColors.primary, width: 2),
                  ),
                ),
              ),
              if (error != null) ...[
                const SizedBox(height: 10),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: AppColors.statRejectedBg,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: AppColors.statRejectedBorder),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.error_outline_rounded,
                          color: AppColors.error, size: 16),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          error!,
                          style: const TextStyle(
                            color: AppColors.error,
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            fontFamily: 'Inter',
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ],
          ),
          actionsPadding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(),
              child: const Text(
                'Cancel',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textMuted,
                  fontFamily: 'Inter',
                ),
              ),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
                padding:
                    const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              onPressed: () async {
                final oldPin = oldPinController.text.trim();
                final newPin = newPinController.text.trim();
                if (oldPin.isEmpty || newPin.length != 4) {
                  setState(() => error = 'Please enter valid 4-digit PINs');
                  return;
                }
                final success = await guardRepo.changePin(oldPin, newPin);
                if (success) {
                  if (context.mounted) {
                    Navigator.of(ctx).pop();
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('PIN successfully updated!'),
                        backgroundColor: AppColors.success,
                      ),
                    );
                  }
                } else {
                  setState(() => error = 'Current PIN is incorrect');
                }
              },
              child: const Text(
                'Update PIN',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                  fontFamily: 'Inter',
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _handleLogout(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        backgroundColor: Colors.white,
        title: const Row(
          children: [
            Icon(Icons.logout_rounded, color: AppColors.error, size: 24),
            SizedBox(width: 10),
            Text(
              'Logout from Terminal',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w700,
                color: AppColors.textPrimary,
                fontFamily: 'Inter',
              ),
            ),
          ],
        ),
        content: const Text(
          'Are you sure you want to log out from Gate Terminal? You will need your Mobile Number & PIN to sign back in.',
          style: TextStyle(
            fontSize: 14,
            color: AppColors.textMuted,
            fontWeight: FontWeight.w400,
            fontFamily: 'Inter',
          ),
        ),
        actionsPadding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text(
              'Cancel',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: AppColors.textMuted,
                fontFamily: 'Inter',
              ),
            ),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.error,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 12),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
            onPressed: () async {
              Navigator.of(ctx).pop();
              await guardRepo.logout();
              if (context.mounted) {
                Navigator.of(context).pushAndRemoveUntil(
                  MaterialPageRoute(
                    builder: (_) => LoginScreen(guardRepo: guardRepo),
                  ),
                  (route) => false,
                );
              }
            },
            child: const Text(
              'Logout',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                fontFamily: 'Inter',
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _formatShift(String shift) {
    if (shift.isEmpty) return 'Morning · 07:00 AM – 07:00 PM';
    final regExp = RegExp(
      r'(Morning|Evening|Night)\s*(?:Shift)?\s*\(?([0-9:APM\s–\-]+)\)?',
      caseSensitive: false,
    );
    final match = regExp.firstMatch(shift);
    if (match != null) {
      final name = match.group(1);
      final times = match.group(2)?.replaceAll('-', '–').trim();
      return '$name · $times';
    }
    return shift;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.pageBackground, // #F5F7FB
      body: SafeArea(
        child: AnimatedBuilder(
          animation: guardRepo,
          builder: (context, _) {
            final guard = guardRepo.currentGuard;
            if (guard == null) {
              return _buildLoadingSkeleton();
            }

            final guardName = guard.name.isNotEmpty ? guard.name : 'Ramesh Singh';
            final guardId = guard.badgeNumber.isNotEmpty ? guard.badgeNumber : 'NX-SEC-01';
            final society = guard.societyName.isNotEmpty ? guard.societyName : 'Green Gate Residency';
            final gate = guard.assignedGate.isNotEmpty ? guard.assignedGate : 'Main Gate';
            final shift = _formatShift(guard.shift);

            return SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.only(bottom: 24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // 1. TITLE ROW (padding 20 16 12, space-between, center)
                  _buildTitleRow(),

                  // 2. OFFICER CARD (margin 0 16, bg #2B2F8F, radius 24, padding 18, column gap 16)
                  _buildOfficerCard(guardName, guardId, gate),

                  // 3. STATION ASSIGNMENT CARD (margin 12 16 0, white, 1px border #E4E8F0, radius 20, padding 16, column gap 12)
                  _buildStationAssignmentCard(society, gate, shift),

                  // 4. SECURITY & TERMINAL CARD (margin 12 16 0, same card style)
                  _buildSecurityTerminalCard(context),

                  // 5. LOGOUT BUTTON
                  _buildLogoutButton(context),
                ],
              ),
            );
          },
        ),
      ),
    );
  }

  // 1. TITLE ROW
  Widget _buildTitleRow() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 20, 16, 12),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          // "Profile"
          const Text(
            'Profile',
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.w700,
              color: AppColors.textPrimary,
              letterSpacing: -0.4,
              fontFamily: 'Inter',
            ),
          ),

          // "ON DUTY" pill (height 28, padding 0 12, radius 14, bg #E7F6EC, text #0B6B38, 12px bold, 8px green dot #16A34A)
          Container(
            height: 28,
            padding: const EdgeInsets.symmetric(horizontal: 12),
            decoration: BoxDecoration(
              color: AppColors.dutyPillBg,
              borderRadius: BorderRadius.circular(14),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                Container(
                  width: 8,
                  height: 8,
                  decoration: const BoxDecoration(
                    color: AppColors.dutyDot,
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 6),
                const Text(
                  'ON DUTY',
                  style: TextStyle(
                    fontSize: 11.5,
                    fontWeight: FontWeight.w700,
                    color: AppColors.dutyPillText,
                    fontFamily: 'Inter',
                    letterSpacing: 0.3,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // 2. OFFICER CARD
  Widget _buildOfficerCard(String name, String badgeId, String gate) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: AppColors.hero, // #2B2F8F
        borderRadius: BorderRadius.circular(24),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Row (gap 16): 64x64 icon box / name + subtitle
          Row(
            children: [
              Container(
                width: 64,
                height: 64,
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.16),
                  borderRadius: BorderRadius.circular(20),
                ),
                alignment: Alignment.center,
                child: const Icon(
                  Icons.shield_outlined,
                  size: 32,
                  color: Colors.white,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      name,
                      style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w600,
                        color: Colors.white,
                        fontFamily: 'Inter',
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 3),
                    Text(
                      'Security Officer · $gate',
                      style: const TextStyle(
                        fontSize: 14,
                        color: AppColors.heroSubText, // #C7CBFF
                        fontFamily: 'Inter',
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
            ],
          ),

          const SizedBox(height: 16),

          // 1px divider rgba(255,255,255,.2)
          Divider(
            color: Colors.white.withOpacity(0.2),
            height: 1,
            thickness: 1,
          ),

          const SizedBox(height: 16),

          // Bottom row (space-between, center): BADGE ID & Verified pill
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text(
                    'BADGE ID',
                    style: TextStyle(
                      fontSize: 11.5,
                      color: AppColors.heroSubText, // #C7CBFF
                      fontFamily: 'Inter',
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    badgeId,
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w600,
                      color: Colors.white,
                      letterSpacing: 0.5,
                      fontFamily: 'Inter',
                    ),
                  ),
                ],
              ),

              // Verified pill (height 36, padding 0 12, radius 18, bg #D6F5E3, text #0B5B30)
              Container(
                height: 36,
                padding: const EdgeInsets.symmetric(horizontal: 12),
                decoration: BoxDecoration(
                  color: AppColors.verifiedPillBg, // #D6F5E3
                  borderRadius: BorderRadius.circular(18),
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      Icons.check_rounded,
                      size: 16,
                      color: AppColors.verifiedPillText, // #0B5B30
                    ),
                    SizedBox(width: 5),
                    Text(
                      'Verified',
                      style: TextStyle(
                        fontSize: 13.5,
                        fontWeight: FontWeight.w600,
                        color: AppColors.verifiedPillText, // #0B5B30
                        fontFamily: 'Inter',
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // 3. STATION ASSIGNMENT CARD
  Widget _buildStationAssignmentCard(
    String society,
    String gate,
    String shift,
  ) {
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 12, 16, 0),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.border, width: 1.0),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Label "STATION ASSIGNMENT"
          const Text(
            'STATION ASSIGNMENT',
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              letterSpacing: 0.6,
              color: Color(0xFF64748B),
              fontFamily: 'Inter',
            ),
          ),
          const SizedBox(height: 12),

          // a) Building icon: "Society complex" / "Green Gate Residency"
          _buildStationRow(
            icon: Icons.apartment_rounded,
            iconBg: AppColors.indigoTint,
            iconColor: AppColors.primary,
            label: 'Society complex',
            value: society,
          ),
          const SizedBox(height: 12),

          // b) Door icon: "Gate checkpoint" / "Main Gate"
          _buildStationRow(
            icon: Icons.meeting_room_outlined,
            iconBg: AppColors.dutyPillBg,
            iconColor: AppColors.dutyPillText,
            label: 'Gate checkpoint',
            value: gate,
          ),
          const SizedBox(height: 12),

          // c) Clock icon: "Shift hours" / "Morning · 07:00 AM – 07:00 PM"
          _buildStationRow(
            icon: Icons.access_time_rounded,
            iconBg: AppColors.pillWaitingBg,
            iconColor: AppColors.pillWaitingText,
            label: 'Shift hours',
            value: shift,
            isShift: true,
          ),
        ],
      ),
    );
  }

  Widget _buildStationRow({
    required IconData icon,
    required Color iconBg,
    required Color iconColor,
    required String label,
    required String value,
    bool isShift = false,
  }) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 42,
          height: 42,
          decoration: BoxDecoration(
            color: iconBg,
            borderRadius: BorderRadius.circular(13),
          ),
          alignment: Alignment.center,
          child: Icon(icon, color: iconColor, size: 20),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                label,
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w500,
                  color: Color(0xFF64748B),
                  fontFamily: 'Inter',
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 3),
              Text(
                value,
                style: TextStyle(
                  fontSize: isShift ? 13.5 : 14.5,
                  fontWeight: FontWeight.w600,
                  color: const Color(0xFF1E293B),
                  fontFamily: 'Inter',
                  letterSpacing: isShift ? -0.2 : 0,
                  height: 1.3,
                ),
                maxLines: 3,
                softWrap: true,
              ),
            ],
          ),
        ),
      ],
    );
  }

  // 4. SECURITY & TERMINAL CARD
  Widget _buildSecurityTerminalCard(BuildContext context) {
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 12, 16, 0),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.border, width: 1.0),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Label "SECURITY & TERMINAL"
          const Text(
            'SECURITY & TERMINAL',
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              letterSpacing: 0.6,
              color: Color(0xFF64748B),
              fontFamily: 'Inter',
            ),
          ),
          const SizedBox(height: 12),

          // Row: 44x44 lock icon box + "Change security PIN" + chevron
          Material(
            color: Colors.transparent,
            child: InkWell(
              onTap: () => _showChangePinDialog(context),
              borderRadius: BorderRadius.circular(14),
              child: Row(
                children: [
                  Container(
                    width: 42,
                    height: 42,
                    decoration: BoxDecoration(
                      color: AppColors.indigoTint,
                      borderRadius: BorderRadius.circular(13),
                    ),
                    alignment: Alignment.center,
                    child: const Icon(
                      Icons.lock_outline_rounded,
                      color: AppColors.primary,
                      size: 20,
                    ),
                  ),
                  const SizedBox(width: 12),
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          'Change security PIN',
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w600,
                            color: Color(0xFF1E293B),
                            fontFamily: 'Inter',
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        SizedBox(height: 2),
                        Text(
                          'Update 4-digit gate access PIN',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w400,
                            color: Color(0xFF64748B),
                            fontFamily: 'Inter',
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  const Icon(
                    Icons.chevron_right_rounded,
                    color: Color(0xFF98A2B3),
                    size: 20,
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  // Logout Danger Action
  Widget _buildLogoutButton(BuildContext context) {
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 16, 16, 16),
      width: double.infinity,
      height: 50,
      child: OutlinedButton(
        onPressed: () => _handleLogout(context),
        style: OutlinedButton.styleFrom(
          side: const BorderSide(color: Color(0xFFFECDD3), width: 1.0),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          backgroundColor: const Color(0xFFFFF1F2),
        ),
        child: const Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.logout_rounded, size: 18, color: Color(0xFFDC2626)),
            SizedBox(width: 8),
            Text(
              'Logout from Terminal',
              style: TextStyle(
                fontSize: 14.5,
                fontWeight: FontWeight.w600,
                color: Color(0xFFDC2626),
                fontFamily: 'Inter',
              ),
            ),
          ],
        ),
      ),
    );
  }

  // Loading Skeleton
  Widget _buildLoadingSkeleton() {
    return SingleChildScrollView(
      physics: const NeverScrollableScrollPhysics(),
      padding: const EdgeInsets.only(bottom: 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 20, 16, 12),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(
                  width: 120,
                  height: 32,
                  decoration: BoxDecoration(
                    color: AppColors.border,
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
                Container(
                  width: 90,
                  height: 28,
                  decoration: BoxDecoration(
                    color: AppColors.dutyPillBg,
                    borderRadius: BorderRadius.circular(14),
                  ),
                ),
              ],
            ),
          ),
          Container(
            height: 180,
            margin: const EdgeInsets.symmetric(horizontal: 16),
            decoration: BoxDecoration(
              color: AppColors.hero.withOpacity(0.4),
              borderRadius: BorderRadius.circular(24),
            ),
          ),
          const SizedBox(height: 12),
          Container(
            height: 220,
            margin: const EdgeInsets.symmetric(horizontal: 16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: AppColors.border),
            ),
          ),
        ],
      ),
    );
  }
}