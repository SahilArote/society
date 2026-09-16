import 'dart:io';
import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_dimensions.dart';
import '../../core/widgets/custom_button.dart';
import '../../models/visitor.dart';
import '../../repositories/visitor_repository.dart';
import '../../repositories/guard_repository.dart';
import 'waiting_approval_screen.dart';

class VisitorDetailsScreen extends StatefulWidget {
  final String photoPath;
  final VisitorRepository visitorRepo;
  final GuardRepository guardRepo;

  const VisitorDetailsScreen({
    super.key,
    required this.photoPath,
    required this.visitorRepo,
    required this.guardRepo,
  });

  @override
  State<VisitorDetailsScreen> createState() => _VisitorDetailsScreenState();
}

class _VisitorDetailsScreenState extends State<VisitorDetailsScreen> {
  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _purposeController = TextEditingController();

  VisitorType _selectedType = VisitorType.guest;
  String _selectedCompany = 'Zomato';
  String _selectedWing = '';
  String _selectedFlat = '';
  String _selectedResidentName = '';
  String _selectedResidentPhone = '';

  final List<String> _deliveryCompanies = [
    'Zomato',
    'Swiggy',
    'Amazon',
    'Flipkart',
    'Blinkit',
    'Other',
  ];

  bool _isSending = false;
  String? _validationError;

  bool _isLoadingDirectory = false;

  @override
  void initState() {
    super.initState();
    widget.visitorRepo.addListener(_onRepoUpdated);
    _loadDirectory();
  }

  @override
  void dispose() {
    widget.visitorRepo.removeListener(_onRepoUpdated);
    _nameController.dispose();
    _phoneController.dispose();
    _purposeController.dispose();
    super.dispose();
  }

  void _onRepoUpdated() {
    if (!mounted) return;
    if (_selectedWing.isEmpty && widget.visitorRepo.wings.isNotEmpty) {
      _applyFirstWing();
    }
  }

  void _applyFirstWing() {
    if (widget.visitorRepo.wings.isEmpty) return;
    final firstWing = widget.visitorRepo.wings.first;
    final flats = widget.visitorRepo.wingFlats[firstWing] ?? [];
    setState(() {
      _selectedWing = firstWing;
      if (flats.isNotEmpty) {
        _selectedFlat = flats.first.flatNumber;
        _selectedResidentName = flats.first.primaryResident?.name ?? 'Resident';
        _selectedResidentPhone = flats.first.primaryResident?.phoneNumber ?? '';
      }
    });
  }

  Future<void> _loadDirectory() async {
    setState(() => _isLoadingDirectory = true);
    await widget.visitorRepo.fetchDirectoryFromBackend();
    if (!mounted) return;
    setState(() => _isLoadingDirectory = false);
    _applyFirstWing();
  }

  void _onWingChanged(String wing) {
    setState(() {
      _selectedWing = wing;
      final flats = widget.visitorRepo.wingFlats[wing] ?? [];
      if (flats.isNotEmpty) {
        _selectedFlat = flats.first.flatNumber;
        _selectedResidentName = flats.first.primaryResident?.name ?? 'Resident';
        _selectedResidentPhone = flats.first.primaryResident?.phoneNumber ?? '';
      } else {
        _selectedFlat = '';
        _selectedResidentName = '';
        _selectedResidentPhone = '';
      }
    });
  }

  void _updateFlatSelection(String flatNumber) {
    final flats = widget.visitorRepo.wingFlats[_selectedWing] ?? [];
    final match = flats.firstWhere(
      (f) => f.flatNumber == flatNumber,
      orElse: () => flats.isNotEmpty ? flats.first : flats.first,
    );
    setState(() {
      _selectedFlat = match.flatNumber;
      _selectedResidentName = match.primaryResident?.name ?? 'Resident';
      _selectedResidentPhone = match.primaryResident?.phoneNumber ?? '';
    });
  }

  Future<void> _sendRequest() async {
    final name = _nameController.text.trim();
    if (name.isEmpty) {
      setState(() => _validationError = 'Please enter visitor name');
      return;
    }

    if (_selectedWing.trim().isEmpty) {
      if (widget.visitorRepo.wings.isNotEmpty) {
        _applyFirstWing();
      } else {
        setState(() => _validationError = 'Please select a building / wing');
        return;
      }
    }

    if (_selectedFlat.trim().isEmpty) {
      final flats = widget.visitorRepo.wingFlats[_selectedWing] ?? [];
      if (flats.isNotEmpty) {
        _updateFlatSelection(flats.first.flatNumber);
      } else {
        setState(() => _validationError = 'Please select a valid destination flat');
        return;
      }
    }

    setState(() {
      _isSending = true;
      _validationError = null;
    });

    try {
      final request = await widget.visitorRepo.createVisitorRequest(
        name: name,
        phoneNumber: _phoneController.text.trim().isNotEmpty ? _phoneController.text.trim() : null,
        photoPath: widget.photoPath,
        type: _selectedType,
        deliveryCompany: _selectedType == VisitorType.delivery ? _selectedCompany : null,
        buildingWing: _selectedWing,
        flatNumber: _selectedFlat,
        residentName: _selectedResidentName,
        purpose: _purposeController.text.trim().isNotEmpty
            ? _purposeController.text.trim()
            : (_selectedType == VisitorType.delivery
                ? (_selectedCompany.isNotEmpty ? _selectedCompany : 'Delivery')
                : _selectedType.displayName),

      if (!mounted) return;
      setState(() => _isSending = false);

      Navigator.of(context).pushReplacement(
        MaterialPageRoute(
          builder: (_) => WaitingApprovalScreen(
            request: request,
            visitorRepo: widget.visitorRepo,
            guardRepo: widget.guardRepo,
          ),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _isSending = false;
        _validationError = e.toString().replaceAll('Exception: ', '');
      });
    }
  }


  @override
  Widget build(BuildContext context) {
    final flatsInCurrentWing = widget.visitorRepo.wingFlats[_selectedWing] ?? [];

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Visitor Details'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, size: 26),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Photo Thumbnail Header Card
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: AppDimensions.roundedLg,
                  border: Border.all(color: AppColors.border, width: 1.5),
                  boxShadow: AppDimensions.cardShadow,
                ),
                child: Row(
                  children: [
                    ClipRRect(
                      borderRadius: AppDimensions.roundedMd,
                      child: Container(
                        width: 72,
                        height: 72,
                        color: AppColors.surfaceLow,
                        child: _buildPhotoThumbnail(),
                      ),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Row(
                            children: [
                              Icon(Icons.check_circle, size: 18, color: AppColors.success),
                              SizedBox(width: 6),
                              Text(
                                'VISITOR PHOTO CONFIRMED',
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w800,
                                  color: AppColors.successText,
                                  letterSpacing: 0.3,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 6),
                          TextButton.icon(
                            style: TextButton.styleFrom(
                              padding: EdgeInsets.zero,
                              minimumSize: Size.zero,
                              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                            ),
                            icon: const Icon(Icons.replay, size: 16, color: AppColors.primary),
                            label: const Text(
                              'Retake Photo',
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w700,
                                color: AppColors.primary,
                              ),
                            ),
                            onPressed: () => Navigator.of(context).pop(),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 16),

              // Form: Visitor Information
              Container(
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: AppDimensions.roundedLg,
                  border: Border.all(color: AppColors.border, width: 1.5),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'VISITOR NAME & MOBILE',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w800,
                        color: AppColors.textPrimary,
                        letterSpacing: 0.5,
                      ),
                    ),
                    const SizedBox(height: 12),
                    // Name
                    TextField(
                      controller: _nameController,
                      style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
                      decoration: const InputDecoration(
                        labelText: 'Visitor Full Name *',
                        prefixIcon: Icon(Icons.person, size: 24, color: AppColors.primary),
                        hintText: 'Enter full name',
                      ),
                    ),
                    const SizedBox(height: 14),
                    // Mobile
                    TextField(
                      controller: _phoneController,
                      keyboardType: TextInputType.phone,
                      style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
                      decoration: const InputDecoration(
                        labelText: 'Mobile Number (Optional)',
                        prefixIcon: Icon(Icons.phone, size: 24, color: AppColors.primary),
                        hintText: 'Enter phone number',
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 16),

              // Form: Visitor Type (Large selectable chips)
              Container(
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: AppDimensions.roundedLg,
                  border: Border.all(color: AppColors.border, width: 1.5),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'VISITOR TYPE',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w800,
                        color: AppColors.textPrimary,
                        letterSpacing: 0.5,
                      ),
                    ),
                    const SizedBox(height: 12),
                    Wrap(
                      spacing: 10,
                      runSpacing: 10,
                      children: VisitorType.values.map((type) {
                        final isSelected = _selectedType == type;
                        return ChoiceChip(
                          label: Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 4),
                            child: Text(type.displayName),
                          ),
                          selected: isSelected,
                          onSelected: (val) {
                            if (val) setState(() => _selectedType = type);
                          },
                          selectedColor: AppColors.primary,
                          labelStyle: TextStyle(
                            color: isSelected ? Colors.white : AppColors.textPrimary,
                            fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                            fontSize: 15,
                          ),
                          backgroundColor: AppColors.surfaceLow,
                          shape: RoundedRectangleBorder(
                            borderRadius: AppDimensions.roundedMd,
                            side: BorderSide(
                              color: isSelected ? AppColors.primaryDark : AppColors.border,
                              width: 1.5,
                            ),
                          ),
                        );
                      }).toList(),
                    ),

                    // Delivery Company Options (when Delivery selected)
                    if (_selectedType == VisitorType.delivery) ...[
                      const SizedBox(height: 18),
                      const Text(
                        'DELIVERY COMPANY',
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w800,
                          color: AppColors.textPrimary,
                          letterSpacing: 0.5,
                        ),
                      ),
                      const SizedBox(height: 10),
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: _deliveryCompanies.map((company) {
                          final isSelected = _selectedCompany == company;
                          return ChoiceChip(
                            label: Text(company),
                            selected: isSelected,
                            onSelected: (val) {
                              if (val) setState(() => _selectedCompany = company);
                            },
                            selectedColor: AppColors.primaryLight,
                            labelStyle: TextStyle(
                              color: isSelected ? AppColors.primary : AppColors.textPrimary,
                              fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                              fontSize: 14,
                            ),
                            backgroundColor: AppColors.surfaceLow,
                            shape: RoundedRectangleBorder(
                              borderRadius: AppDimensions.roundedMd,
                              side: BorderSide(
                                color: isSelected ? AppColors.primary : AppColors.border,
                                width: 1.5,
                              ),
                            ),
                          );
                        }).toList(),
                      ),
                    ],
                  ],
                ),
              ),

              const SizedBox(height: 16),

              // Form: Building/Wing & Flat & Resident
              Container(
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: AppDimensions.roundedLg,
                  border: Border.all(color: AppColors.border, width: 1.5),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'DESTINATION RESIDENCE',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w800,
                        color: AppColors.textPrimary,
                        letterSpacing: 0.5,
                      ),
                    ),
                    const SizedBox(height: 14),

                    // Select Wing (Large touch-friendly buttons)
                    const Text(
                      'Select Building / Wing',
                      style: TextStyle(fontSize: 13, color: AppColors.textSecondary, fontWeight: FontWeight.w700),
                    ),
                    const SizedBox(height: 8),
                    if (widget.visitorRepo.wings.isEmpty)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                        decoration: BoxDecoration(
                          color: AppColors.surfaceLow,
                          borderRadius: AppDimensions.roundedMd,
                          border: Border.all(color: AppColors.border),
                        ),
                        child: Row(
                          children: [
                            if (_isLoadingDirectory)
                              const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                            else
                              const Icon(Icons.info_outline, size: 18, color: AppColors.textSecondary),
                            const SizedBox(width: 10),
                            const Expanded(
                              child: Text(
                                'Loading flats from database...',
                                style: TextStyle(fontSize: 13, color: AppColors.textSecondary, fontWeight: FontWeight.w600),
                              ),
                            ),
                            TextButton(
                              onPressed: _loadDirectory,
                              child: const Text('Refresh', style: TextStyle(fontWeight: FontWeight.w800)),
                            ),
                          ],
                        ),
                      )
                    else
                      Row(
                        children: widget.visitorRepo.wings.map((wing) {
                          final isSelected = _selectedWing == wing;
                          return Expanded(
                            child: Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 4),
                              child: SizedBox(
                                height: 52, // 52px button height
                                child: ElevatedButton(
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: isSelected ? AppColors.primary : AppColors.surfaceLow,
                                    foregroundColor: isSelected ? Colors.white : AppColors.textPrimary,
                                    elevation: isSelected ? 2 : 0,
                                    side: BorderSide(
                                      color: isSelected ? AppColors.primaryDark : AppColors.border,
                                      width: 1.5,
                                    ),
                                    shape: RoundedRectangleBorder(
                                      borderRadius: AppDimensions.roundedMd,
                                    ),
                                    padding: EdgeInsets.zero,
                                  ),
                                  onPressed: () => _onWingChanged(wing),
                                  child: Text(
                                    wing.replaceFirst('Tower ', 'Wing '),
                                    style: TextStyle(
                                      fontSize: 13,
                                      fontWeight: FontWeight.w800,
                                      color: isSelected ? Colors.white : AppColors.textPrimary,
                                    ),
                                  ),
                                ),
                              ),
                            ),
                          );
                        }).toList(),
                      ),

                    const SizedBox(height: 16),

                    // Select Flat Number
                    const Text(
                      'Select Flat Number',
                      style: TextStyle(fontSize: 13, color: AppColors.textSecondary, fontWeight: FontWeight.w700),
                    ),
                    const SizedBox(height: 8),
                    Container(
                      height: 56,
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      decoration: BoxDecoration(
                        color: AppColors.surfaceLow,
                        borderRadius: AppDimensions.roundedMd,
                        border: Border.all(color: AppColors.border, width: 1.5),
                      ),
                      child: DropdownButtonHideUnderline(
                        child: DropdownButton<String>(
                          value: flatsInCurrentWing.any((f) => f.flatNumber == _selectedFlat)
                              ? _selectedFlat
                              : (flatsInCurrentWing.isNotEmpty ? flatsInCurrentWing.first.flatNumber : null),
                          isExpanded: true,
                          hint: const Text('Loading flats from database...', style: TextStyle(fontSize: 15, color: AppColors.textSecondary)),
                          icon: const Icon(Icons.arrow_drop_down, size: 28, color: AppColors.textPrimary),
                          items: flatsInCurrentWing.map((flat) {
                            return DropdownMenuItem<String>(
                              value: flat.flatNumber,
                              child: Text(
                                '${flat.flatNumber}  —  ${flat.primaryResident?.name ?? "Resident"}',
                                style: const TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.textPrimary,
                                ),
                              ),
                            );
                          }).toList(),
                          onChanged: (val) {
                            if (val != null) _updateFlatSelection(val);
                          },
                        ),
                      ),
                    ),

                    const SizedBox(height: 14),

                    // Resident Summary Pill
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: AppColors.primaryLight,
                        borderRadius: AppDimensions.roundedMd,
                        border: Border.all(color: AppColors.primary.withValues(alpha: 0.2)),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.person, size: 22, color: AppColors.primary),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              'Resident: $_selectedResidentName • Flat $_selectedFlat',
                              style: const TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w800,
                                color: AppColors.primary,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 14),

                    // Purpose of Visit
                    TextField(
                      controller: _purposeController,
                      style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                      decoration: const InputDecoration(
                        labelText: 'Purpose of Visit',
                        prefixIcon: Icon(Icons.description, size: 24, color: AppColors.primary),
                        hintText: 'e.g. Delivery, Guest',
                      ),
                    ),
                  ],
                ),
              ),

              if (_validationError != null) ...[
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: AppColors.errorLight,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    _validationError!,
                    style: const TextStyle(
                      color: AppColors.errorText,
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ],

              const SizedBox(height: 22),

              // SEND REQUEST Button (64px height)
              CustomButton(
                text: 'SEND REQUEST',
                icon: Icons.send,
                height: 64,
                isLoading: _isSending,
                onPressed: _sendRequest,
              ),

              const SizedBox(height: 20),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildPhotoThumbnail() {
    if (widget.photoPath.startsWith('assets/')) {
      return Image.asset(widget.photoPath, fit: BoxFit.cover);
    }
    return Image.file(File(widget.photoPath), fit: BoxFit.cover);
  }
}
