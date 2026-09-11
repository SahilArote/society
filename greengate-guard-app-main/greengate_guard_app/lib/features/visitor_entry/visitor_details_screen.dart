import 'dart:io';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_dimensions.dart';
import '../../core/widgets/custom_button.dart';
import '../../core/widgets/safe_image.dart';
import '../../models/visitor.dart';
import '../../repositories/visitor_repository.dart';
import '../../repositories/guard_repository.dart';
import 'waiting_approval_screen.dart';

class VisitorDetailsScreen extends StatefulWidget {
  final String photoPath;
  final Uint8List? photoBytes;
  final VisitorRepository visitorRepo;
  final GuardRepository guardRepo;

  const VisitorDetailsScreen({
    super.key,
    required this.photoPath,
    this.photoBytes,
    required this.visitorRepo,
    required this.guardRepo,
  });

  @override
  State<VisitorDetailsScreen> createState() => _VisitorDetailsScreenState();
}

class _VisitorDetailsScreenState extends State<VisitorDetailsScreen> {
  final _nameController = TextEditingController(text: 'Suresh Kumar');
  final _phoneController = TextEditingController(text: '+91 98765 12340');
  final _purposeController = TextEditingController(text: 'Food Delivery');

  VisitorType _selectedType = VisitorType.delivery;
  String _selectedCompany = 'Zomato';
  late String _selectedWing;
  String _selectedFlat = 'B-402';
  String _selectedResidentName = 'Dr. Amit Sharma';
  String _selectedResidentPhone = '+91 98200 44821';

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

  @override
  void initState() {
    super.initState();
    _selectedWing = widget.visitorRepo.wings.contains('Tower B') ? 'Tower B' : widget.visitorRepo.wings.first;
    _updateFlatSelection(_selectedFlat);
  }

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    _purposeController.dispose();
    super.dispose();
  }

  void _onWingChanged(String wing) {
    setState(() {
      _selectedWing = wing;
      final flats = widget.visitorRepo.wingFlats[wing] ?? [];
      if (flats.isNotEmpty) {
        _selectedFlat = flats.first.flatNumber;
        _selectedResidentName = flats.first.primaryResident?.name ?? 'Resident';
        _selectedResidentPhone = flats.first.primaryResident?.phoneNumber ?? '';
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

    setState(() {
      _isSending = true;
      _validationError = null;
    });

    final request = await widget.visitorRepo.createVisitorRequest(
      name: name,
      phoneNumber: _phoneController.text.trim().isNotEmpty ? _phoneController.text.trim() : null,
      photoPath: widget.photoPath,
      photoBytes: widget.photoBytes,
      type: _selectedType,
      deliveryCompany: _selectedType == VisitorType.delivery ? _selectedCompany : null,
      buildingWing: _selectedWing,
      flatNumber: _selectedFlat,
      residentName: _selectedResidentName,
      residentPhone: _selectedResidentPhone,
      purpose: _purposeController.text.trim(),
    );

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
                          value: _selectedFlat,
                          isExpanded: true,
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
                        border: Border.all(color: AppColors.primary.withOpacity(0.2)),
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
    return SafeImage(
      path: widget.photoPath,
      bytes: widget.photoBytes,
      fit: BoxFit.cover,
    );
  }
}
