import 'dart:async';
import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_typography.dart';
import '../../core/widgets/custom_app_bar.dart';
import '../../core/widgets/custom_text_field.dart';
import '../../core/widgets/primary_button.dart';
import '../../core/widgets/secondary_button.dart';
import '../../models/registration_model.dart';
import '../../services/api_service.dart';
import '../../services/socket_service.dart';
import '../../services/storage_service.dart';
import 'login_screen.dart';

/// Multi-step resident registration and status tracking flow.
class RegisterScreen extends StatefulWidget {
  final String? initialMobile;
  final int initialStep;

  const RegisterScreen({
    super.key,
    this.initialMobile,
    this.initialStep = 1,
  });

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  late int _step;
  final TextEditingController _mobileController = TextEditingController();
  final TextEditingController _nameController = TextEditingController();

  FlatsHierarchy? _hierarchy;
  bool _isLoadingHierarchy = false;

  String? _selectedWing;
  int? _selectedFloor;
  FlatUnit? _selectedFlat;

  bool _isSubmitting = false;
  String? _errorMessage;

  RegistrationStatusData? _activeStatus;
  Timer? _pollingTimer;
  StreamSubscription? _socketSub;

  @override
  void initState() {
    super.initState();
    _step = widget.initialStep;
    if (widget.initialMobile != null && widget.initialMobile!.isNotEmpty) {
      _mobileController.text = widget.initialMobile!;
    }

    _loadExistingPendingRegistration();
    _loadFlats();

    // Listen to real-time registration update via Socket
    _socketSub = SocketService.onRegistrationUpdated.listen((data) {
      debugPrint('[RegisterScreen] Real-time registration updated: $data');
      if (mounted) {
        _checkStatus();
      }
    });
  }

  Future<void> _loadExistingPendingRegistration() async {
    final pending = StorageService.getPendingRegistration();
    if (pending != null && pending['mobile'] != null) {
      _mobileController.text = pending['mobile'].toString();
      _checkStatus();
    }
  }

  Future<void> _loadFlats() async {
    setState(() => _isLoadingHierarchy = true);
    try {
      final h = await ApiService.fetchRegistrationFlats();
      setState(() {
        _hierarchy = h;
        if (h.wings.isNotEmpty) {
          _selectedWing = h.wings.first;
          final floors = h.floors[_selectedWing];
          if (floors != null && floors.isNotEmpty) {
            _selectedFloor = floors.first;
          }
        }
      });
    } catch (e) {
      debugPrint('[RegisterScreen] Failed to load flats hierarchy: $e');
    } finally {
      if (mounted) {
        setState(() => _isLoadingHierarchy = false);
      }
    }
  }

  Future<void> _checkStatus() async {
    final mobile = _mobileController.text.trim();
    if (mobile.isEmpty) return;

    try {
      final status = await ApiService.checkRegistrationStatus(mobile);
      if (!mounted) return;
      setState(() {
        _activeStatus = status;
        if (status.status == 'APPROVED') {
          _pollingTimer?.cancel();
          StorageService.removePendingRegistration();
        } else if (status.status == 'PENDING') {
          _step = 4;
        } else if (status.status == 'REJECTED') {
          _step = 5;
          _pollingTimer?.cancel();
        }
      });
    } catch (_) {}
  }

  void _startPolling() {
    _pollingTimer?.cancel();
    _pollingTimer = Timer.periodic(const Duration(seconds: 8), (_) {
      _checkStatus();
    });
  }

  Future<void> _handleSubmitRegistration() async {
    if (_selectedWing == null || _selectedFloor == null || _selectedFlat == null) {
      setState(() => _errorMessage = 'Please select wing, floor, and flat unit');
      return;
    }

    setState(() {
      _isSubmitting = true;
      _errorMessage = null;
    });

    try {
      await ApiService.submitRegistration(
        mobile: _mobileController.text.trim(),
        name: _nameController.text.trim(),
        wing: _selectedWing!,
        floor: _selectedFloor!,
        flatNumber: _selectedFlat!.flatNumber,
        flatId: _selectedFlat!.id,
      );

      await StorageService.savePendingRegistration({
        'mobile': _mobileController.text.trim(),
        'wing': _selectedWing,
        'floor': _selectedFloor,
        'flatNumber': _selectedFlat!.flatNumber,
      });

      if (!mounted) return;
      setState(() {
        _step = 4;
      });
      _startPolling();
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _errorMessage = e.toString().replaceFirst('Exception: ', '');
      });
    } finally {
      if (mounted) {
        setState(() => _isSubmitting = false);
      }
    }
  }

  @override
  void dispose() {
    _pollingTimer?.cancel();
    _socketSub?.cancel();
    _mobileController.dispose();
    _nameController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: CustomAppBar(
        title: _step == 4 ? 'Registration Status' : 'Register Flat',
        showBack: true,
        onBack: () {
          if (_step > 1 && _step < 4) {
            setState(() => _step--);
          } else {
            Navigator.of(context).pop();
          }
        },
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 20.0),
          child: _buildCurrentStep(),
        ),
      ),
    );
  }

  Widget _buildCurrentStep() {
    switch (_step) {
      case 1:
        return _buildStep1Personal();
      case 2:
        return _buildStep2FlatSelection();
      case 3:
        return _buildStep3Review();
      case 4:
        return _buildStep4Pending();
      case 5:
        return _buildStep5Rejected();
      default:
        return _buildStep1Personal();
    }
  }

  // STEP 1: Personal Info
  Widget _buildStep1Personal() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Resident Details', style: AppTypography.displayMedium),
        const SizedBox(height: 8),
        Text(
          'Provide your full name and 10-digit mobile number for society verification.',
          style: AppTypography.bodySmall,
        ),
        const SizedBox(height: 32),
        CustomTextField(
          controller: _nameController,
          label: 'Full Name',
          hint: 'e.g. Sahil Arote',
          autofocus: true,
        ),
        const SizedBox(height: 20),
        CustomTextField(
          controller: _mobileController,
          label: 'Mobile Number',
          hint: '10-digit phone number',
          keyboardType: TextInputType.phone,
          prefix: const Padding(
            padding: EdgeInsets.symmetric(horizontal: 12),
            child: Text('+91', style: TextStyle(fontWeight: FontWeight.bold)),
          ),
        ),
        const SizedBox(height: 36),
        PrimaryButton(
          label: 'Next: Select Flat',
          icon: Icons.arrow_forward_rounded,
          onPressed: () {
            if (_nameController.text.trim().isEmpty || _mobileController.text.trim().length < 10) {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Please enter valid name and 10-digit mobile')),
              );
              return;
            }
            setState(() => _step = 2);
          },
        ),
      ],
    );
  }

  // STEP 2: Wing, Floor, Flat Unit Selection
  Widget _buildStep2FlatSelection() {
    if (_isLoadingHierarchy || _hierarchy == null) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(48.0),
          child: CircularProgressIndicator(),
        ),
      );
    }

    final floors = _hierarchy!.floors[_selectedWing] ?? [];
    final availableFlats = _hierarchy!.flats.where((f) {
      final wingMatches = f.wing == _selectedWing;
      final floorMatches = _selectedFloor == null || f.floor == _selectedFloor;
      return wingMatches && floorMatches;
    }).toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Select Your Unit', style: AppTypography.displayMedium),
        const SizedBox(height: 8),
        Text(
          'Choose your wing, floor, and assigned apartment number.',
          style: AppTypography.bodySmall,
        ),
        const SizedBox(height: 24),

        // Wing Selector
        Text('Building Wing', style: AppTypography.sectionHeader),
        const SizedBox(height: 10),
        Wrap(
          spacing: 8,
          children: _hierarchy!.wings.map((w) {
            final isSelected = _selectedWing == w;
            return ChoiceChip(
              label: Text(w),
              selected: isSelected,
              selectedColor: AppColors.primaryBlue,
              labelStyle: TextStyle(
                color: isSelected ? Colors.white : AppColors.primaryText,
                fontWeight: FontWeight.w600,
              ),
              onSelected: (val) {
                if (val) {
                  setState(() {
                    _selectedWing = w;
                    final fList = _hierarchy!.floors[w];
                    _selectedFloor = fList?.isNotEmpty == true ? fList!.first : null;
                    _selectedFlat = null;
                  });
                }
              },
            );
          }).toList(),
        ),

        const SizedBox(height: 24),

        // Floor Selector
        if (floors.isNotEmpty) ...[
          Text('Floor', style: AppTypography.sectionHeader),
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            children: floors.map((fl) {
              final isSelected = _selectedFloor == fl;
              return ChoiceChip(
                label: Text('Floor $fl'),
                selected: isSelected,
                selectedColor: AppColors.deepPurple,
                labelStyle: TextStyle(
                  color: isSelected ? Colors.white : AppColors.primaryText,
                  fontWeight: FontWeight.w600,
                ),
                onSelected: (val) {
                  if (val) {
                    setState(() {
                      _selectedFloor = fl;
                      _selectedFlat = null;
                    });
                  }
                },
              );
            }).toList(),
          ),
          const SizedBox(height: 24),
        ],

        // Flat Unit Grid
        Text('Flat Number', style: AppTypography.sectionHeader),
        const SizedBox(height: 10),
        if (availableFlats.isEmpty)
          const Text('No flats found on this floor', style: TextStyle(color: AppColors.mutedText))
        else
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 3,
              crossAxisSpacing: 10,
              mainAxisSpacing: 10,
              childAspectRatio: 2.2,
            ),
            itemCount: availableFlats.length,
            itemBuilder: (context, index) {
              final flat = availableFlats[index];
              final isSelected = _selectedFlat?.id == flat.id;

              return InkWell(
                onTap: () {
                  setState(() => _selectedFlat = flat);
                },
                borderRadius: BorderRadius.circular(10),
                child: Container(
                  decoration: BoxDecoration(
                    color: isSelected ? AppColors.primaryBlue : AppColors.mainBackground,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                      color: isSelected ? AppColors.primaryBlue : AppColors.border,
                      width: 1.5,
                    ),
                  ),
                  alignment: Alignment.center,
                  child: Text(
                    flat.flatNumber,
                    style: TextStyle(
                      fontWeight: FontWeight.w700,
                      color: isSelected ? Colors.white : AppColors.primaryText,
                    ),
                  ),
                ),
              );
            },
          ),

        const SizedBox(height: 36),
        PrimaryButton(
          label: 'Continue to Review',
          onPressed: _selectedFlat == null
              ? null
              : () {
                  setState(() => _step = 3);
                },
        ),
      ],
    );
  }

  // STEP 3: Review & Submit
  Widget _buildStep3Review() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Review Application', style: AppTypography.displayMedium),
        const SizedBox(height: 8),
        Text(
          'Ensure your flat details and contact information are correct.',
          style: AppTypography.bodySmall,
        ),
        const SizedBox(height: 24),

        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppColors.mainBackground,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: AppColors.border),
          ),
          child: Column(
            children: [
              _buildReviewRow('Resident Name', _nameController.text.trim()),
              const Divider(height: 20),
              _buildReviewRow('Mobile Number', '+91 ${_mobileController.text.trim()}'),
              const Divider(height: 20),
              _buildReviewRow('Building Wing', _selectedWing ?? ''),
              const Divider(height: 20),
              _buildReviewRow('Floor', 'Floor ${_selectedFloor ?? ''}'),
              const Divider(height: 20),
              _buildReviewRow('Flat Number', _selectedFlat?.flatNumber ?? ''),
            ],
          ),
        ),

        if (_errorMessage != null) ...[
          const SizedBox(height: 16),
          Text(_errorMessage!, style: const TextStyle(color: AppColors.error)),
        ],

        const SizedBox(height: 32),
        PrimaryButton(
          label: 'Submit for Admin Approval',
          isLoading: _isSubmitting,
          onPressed: _handleSubmitRegistration,
        ),
      ],
    );
  }

  Widget _buildReviewRow(String label, String value) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: AppTypography.caption.copyWith(color: AppColors.secondaryText)),
        Text(value, style: AppTypography.bodyMedium.copyWith(fontWeight: FontWeight.w700)),
      ],
    );
  }

  // STEP 4: Pending Approval Screen
  Widget _buildStep4Pending() {
    return Center(
      child: Column(
        children: [
          const SizedBox(height: 32),
          Container(
            width: 80,
            height: 80,
            decoration: BoxDecoration(
              color: AppColors.warningBackground,
              shape: BoxShape.circle,
              border: Border.all(color: AppColors.warningBorder, width: 2),
            ),
            child: const Icon(Icons.hourglass_top_rounded, size: 40, color: AppColors.warning),
          ),
          const SizedBox(height: 24),
          Text('Approval Pending', style: AppTypography.displayMedium),
          const SizedBox(height: 10),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16.0),
            child: Text(
              'Your flat registration has been submitted and is currently awaiting approval from your society administrator.',
              style: AppTypography.bodySmall,
              textAlign: TextAlign.center,
            ),
          ),
          const SizedBox(height: 32),
          SecondaryButton(
            label: 'Check Status Now',
            icon: Icons.refresh_rounded,
            onPressed: _checkStatus,
          ),
          const SizedBox(height: 16),
          TextButton(
            onPressed: () {
              Navigator.of(context).pushAndRemoveUntil(
                MaterialPageRoute(builder: (_) => const LoginScreen()),
                (route) => false,
              );
            },
            child: const Text('Return to Login'),
          ),
        ],
      ),
    );
  }

  // STEP 5: Rejected Screen
  Widget _buildStep5Rejected() {
    return Center(
      child: Column(
        children: [
          const SizedBox(height: 32),
          Container(
            width: 80,
            height: 80,
            decoration: BoxDecoration(
              color: AppColors.errorBackground,
              shape: BoxShape.circle,
              border: Border.all(color: AppColors.errorBorder, width: 2),
            ),
            child: const Icon(Icons.cancel_rounded, size: 40, color: AppColors.error),
          ),
          const SizedBox(height: 24),
          Text('Registration Rejected', style: AppTypography.displayMedium),
          const SizedBox(height: 10),
          Text(
            _activeStatus?.rejectionReason ?? 'Society administrator rejected the request.',
            style: const TextStyle(color: AppColors.error),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 32),
          PrimaryButton(
            label: 'Re-Apply with Correct Details',
            onPressed: () {
              setState(() => _step = 1);
            },
          ),
        ],
      ),
    );
  }
}
