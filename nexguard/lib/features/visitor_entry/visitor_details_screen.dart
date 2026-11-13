import 'dart:async';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_dimensions.dart';
import '../../core/widgets/custom_button.dart';
import '../../core/widgets/visitor_photo_avatar.dart';
import '../../models/flat.dart';
import '../../models/visitor.dart';
import '../../models/visitor_request.dart';
import '../../repositories/visitor_repository.dart';
import '../../repositories/guard_repository.dart';
import '../../services/image_compress_service.dart';
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
  late String _currentPhotoPath;

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
    _currentPhotoPath = widget.photoPath;
    widget.visitorRepo.addListener(_onRepoUpdated);
    _loadDirectory();
  }

  Future<void> _handleRetakePhoto() async {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (sheetCtx) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: SafeArea(
          top: false,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: const Color(0xFFE2E8F0),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 18),
              const Text(
                'Retake Visitor Photo',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                  color: Color(0xFF0F172A),
                  letterSpacing: -0.3,
                  fontFamily: 'Inter',
                ),
              ),
              const SizedBox(height: 6),
              const Text(
                'Capture a new photo or choose one from your gallery',
                style: TextStyle(
                  fontSize: 13,
                  color: Color(0xFF64748B),
                  fontFamily: 'Inter',
                ),
              ),
              const SizedBox(height: 20),
              Row(
                children: [
                  Expanded(
                    child: InkWell(
                      borderRadius: BorderRadius.circular(16),
                      onTap: () {
                        Navigator.pop(sheetCtx);
                        _pickNewPhoto(ImageSource.camera);
                      },
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 18),
                        decoration: BoxDecoration(
                          color: const Color(0xFFEEF2FF),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                            color: const Color(0xFFC7D2FE),
                            width: 1.5,
                          ),
                        ),
                        child: const Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(
                              Icons.camera_alt_rounded,
                              size: 36,
                              color: AppColors.primary,
                            ),
                            SizedBox(height: 8),
                            Text(
                              'Camera',
                              style: TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.w700,
                                color: AppColors.primary,
                                fontFamily: 'Inter',
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: InkWell(
                      borderRadius: BorderRadius.circular(16),
                      onTap: () {
                        Navigator.pop(sheetCtx);
                        _pickNewPhoto(ImageSource.gallery);
                      },
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 18),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF8FAFC),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                            color: const Color(0xFFE2E8F0),
                            width: 1.5,
                          ),
                        ),
                        child: const Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(
                              Icons.photo_library_rounded,
                              size: 36,
                              color: Color(0xFF334155),
                            ),
                            SizedBox(height: 8),
                            Text(
                              'Gallery',
                              style: TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.w700,
                                color: Color(0xFF334155),
                                fontFamily: 'Inter',
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _pickNewPhoto(ImageSource source) async {
    try {
      final picker = ImagePicker();
      final XFile? photo = await picker.pickImage(
        source: source,
        preferredCameraDevice: CameraDevice.rear,
      );
      if (photo != null && mounted) {
        final compressed = await ImageCompressService.compress(photo.path);
        if (mounted) {
          setState(() {
            _currentPhotoPath = compressed;
          });
        }
      }
    } catch (_) {}
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
    setState(() {
      _selectedWing = firstWing;
      _selectedFlat = '';
      _selectedResidentName = '';
      _selectedResidentPhone = '';
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
      _selectedFlat = '';
      _selectedResidentName = '';
      _selectedResidentPhone = '';
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

  void _openSearchableFlatPicker() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return _SearchableFlatPickerSheet(
          selectedWing: _selectedWing,
          selectedFlat: _selectedFlat,
          wingFlats: widget.visitorRepo.wingFlats,
          wings: widget.visitorRepo.wings,
          onFlatSelected: (wing, flatNumber) {
            setState(() {
              if (_selectedWing != wing) {
                _selectedWing = wing;
              }
            });
            _updateFlatSelection(flatNumber);
          },
        );
      },
    );
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
      setState(
          () => _validationError = 'Please select destination flat number');
      return;
    }

    setState(() => _validationError = null);

    // ── OPTIMISTIC INSTANT TRANSITION (WhatsApp style) ──────────────────────
    // 1. Build a local temp request with a fake id — instantly add to repo
    final localId = 'local_${DateTime.now().millisecondsSinceEpoch}';
    final purposeText = _purposeController.text.trim().isNotEmpty
        ? _purposeController.text.trim()
        : (_selectedType == VisitorType.delivery
            ? (_selectedCompany.isNotEmpty ? _selectedCompany : 'Delivery')
            : _selectedType.displayName);

    final localRequest = VisitorRequest(
      id: localId,
      visitor: Visitor(
        name: name,
        phoneNumber: _phoneController.text.trim().isNotEmpty
            ? _phoneController.text.trim()
            : null,
        photoPath: _currentPhotoPath,
        type: _selectedType,
        deliveryCompany:
            _selectedType == VisitorType.delivery ? _selectedCompany : null,
      ),
      flatNumber: _selectedFlat,
      buildingWing: _selectedWing,
      residentName: _selectedResidentName,
      residentPhone: _selectedResidentPhone,
      purpose: purposeText,
      status: VisitorStatus.pending,
      requestTime: DateTime.now(),
    );

    // 2. Add local request to repo (shows instantly in UI)
    widget.visitorRepo.addLocalPendingRequest(localRequest);

    // 3. Navigate INSTANTLY to WaitingApprovalScreen — 0 delay for guard
    if (!mounted) return;
    Navigator.of(context).pushReplacement(
      MaterialPageRoute(
        builder: (_) => WaitingApprovalScreen(
          request: localRequest,
          visitorRepo: widget.visitorRepo,
          guardRepo: widget.guardRepo,
          isUploading: true,
        ),
      ),
    );

    // 4. Upload to backend in background — guard already sees next screen
    () async {
      try {
        final apiResult = await widget.visitorRepo.createVisitorRequest(
          name: name,
          phoneNumber: _phoneController.text.trim().isNotEmpty
              ? _phoneController.text.trim()
              : null,
          photoPath: _currentPhotoPath,
          type: _selectedType,
          deliveryCompany:
              _selectedType == VisitorType.delivery ? _selectedCompany : null,
          buildingWing: _selectedWing,
          flatNumber: _selectedFlat,
          residentName: _selectedResidentName,
          residentPhone: _selectedResidentPhone,
          purpose: purposeText,
        );
        // Replace local temp request with real server request
        await widget.visitorRepo.upgradeLocalRequest(localId, apiResult);
      } catch (e) {
        // Mark failed so WaitingApprovalScreen can show retry
        widget.visitorRepo.markLocalRequestFailed(localId);
      }
    }();
    // ────────────────────────────────────────────────────────────────────────
  }

  @override
  Widget build(BuildContext context) {
    final flatsInCurrentWing =
        widget.visitorRepo.wingFlats[_selectedWing] ?? [];
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;
    final isKeyboardOpen = bottomInset > 0;

    return Scaffold(
      backgroundColor: AppColors.background,
      resizeToAvoidBottomInset: true,
      appBar: AppBar(
        title: const Text('Visitor Details'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, size: 26),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: GestureDetector(
        onTap: () => FocusScope.of(context).unfocus(),
        behavior: HitTestBehavior.opaque,
        child: SafeArea(
          child: SingleChildScrollView(
            keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
            physics: const BouncingScrollPhysics(
                parent: AlwaysScrollableScrollPhysics()),
            padding: EdgeInsets.fromLTRB(16, 12, 16, isKeyboardOpen ? 180 : 24),
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
                                Icon(Icons.check_circle,
                                    size: 18, color: AppColors.success),
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
                              icon: const Icon(Icons.replay,
                                  size: 16, color: AppColors.primary),
                              label: const Text(
                                'Retake Photo',
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.primary,
                                ),
                              ),
                              onPressed: _handleRetakePhoto,
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
                        textInputAction: TextInputAction.next,
                        scrollPadding: const EdgeInsets.only(bottom: 140),
                        style: const TextStyle(
                            fontSize: 16, fontWeight: FontWeight.w700),
                        decoration: const InputDecoration(
                          labelText: 'Visitor Full Name *',
                          prefixIcon: Icon(Icons.person,
                              size: 24, color: AppColors.primary),
                          hintText: 'Enter full name',
                        ),
                      ),
                      const SizedBox(height: 14),
                      // Mobile
                      TextField(
                        controller: _phoneController,
                        keyboardType: TextInputType.phone,
                        textInputAction: TextInputAction.done,
                        scrollPadding: const EdgeInsets.only(bottom: 140),
                        style: const TextStyle(
                            fontSize: 16, fontWeight: FontWeight.w700),
                        decoration: const InputDecoration(
                          labelText: 'Mobile Number (Optional)',
                          prefixIcon: Icon(Icons.phone,
                              size: 24, color: AppColors.primary),
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
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 4, vertical: 4),
                              child: Text(type.displayName),
                            ),
                            selected: isSelected,
                            onSelected: (val) {
                              if (val) setState(() => _selectedType = type);
                            },
                            selectedColor: AppColors.primary,
                            labelStyle: TextStyle(
                              color: isSelected
                                  ? Colors.white
                                  : AppColors.textPrimary,
                              fontWeight: isSelected
                                  ? FontWeight.w800
                                  : FontWeight.w600,
                              fontSize: 15,
                            ),
                            backgroundColor: AppColors.surfaceLow,
                            shape: RoundedRectangleBorder(
                              borderRadius: AppDimensions.roundedMd,
                              side: BorderSide(
                                color: isSelected
                                    ? AppColors.primaryDark
                                    : AppColors.border,
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
                                if (val) { setState(() => _selectedCompany = company); }
                              },
                              selectedColor: AppColors.primaryLight,
                              labelStyle: TextStyle(
                                color: isSelected
                                    ? AppColors.primary
                                    : AppColors.textPrimary,
                                fontWeight: isSelected
                                    ? FontWeight.w800
                                    : FontWeight.w600,
                                fontSize: 14,
                              ),
                              backgroundColor: AppColors.surfaceLow,
                              shape: RoundedRectangleBorder(
                                borderRadius: AppDimensions.roundedMd,
                                side: BorderSide(
                                  color: isSelected
                                      ? AppColors.primary
                                      : AppColors.border,
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
                        style: TextStyle(
                            fontSize: 13,
                            color: AppColors.textSecondary,
                            fontWeight: FontWeight.w700),
                      ),
                      const SizedBox(height: 8),
                      if (widget.visitorRepo.wings.isEmpty)
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 14, vertical: 10),
                          decoration: BoxDecoration(
                            color: AppColors.surfaceLow,
                            borderRadius: AppDimensions.roundedMd,
                            border: Border.all(color: AppColors.border),
                          ),
                          child: Row(
                            children: [
                              if (_isLoadingDirectory)
                                const SizedBox(
                                    width: 16,
                                    height: 16,
                                    child: CircularProgressIndicator(
                                        strokeWidth: 2))
                              else
                                const Icon(Icons.info_outline,
                                    size: 18, color: AppColors.textSecondary),
                              const SizedBox(width: 10),
                              const Expanded(
                                child: Text(
                                  'Loading flats from database...',
                                  style: TextStyle(
                                      fontSize: 13,
                                      color: AppColors.textSecondary,
                                      fontWeight: FontWeight.w600),
                                ),
                              ),
                              TextButton(
                                onPressed: _loadDirectory,
                                child: const Text('Refresh',
                                    style:
                                        TextStyle(fontWeight: FontWeight.w800)),
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
                                padding:
                                    const EdgeInsets.symmetric(horizontal: 4),
                                child: SizedBox(
                                  height: 52, // 52px button height
                                  child: ElevatedButton(
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: isSelected
                                          ? AppColors.primary
                                          : AppColors.surfaceLow,
                                      foregroundColor: isSelected
                                          ? Colors.white
                                          : AppColors.textPrimary,
                                      elevation: isSelected ? 2 : 0,
                                      side: BorderSide(
                                        color: isSelected
                                            ? AppColors.primaryDark
                                            : AppColors.border,
                                        width: 1.5,
                                      ),
                                      shape: const RoundedRectangleBorder(borderRadius: AppDimensions.roundedMd),
                                      padding: EdgeInsets.zero,
                                    ),
                                    onPressed: () => _onWingChanged(wing),
                                    child: Text(
                                      wing.replaceFirst('Tower ', 'Wing '),
                                      style: TextStyle(
                                        fontSize: 13,
                                        fontWeight: FontWeight.w800,
                                        color: isSelected
                                            ? Colors.white
                                            : AppColors.textPrimary,
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
                        style: TextStyle(
                            fontSize: 13,
                            color: AppColors.textSecondary,
                            fontWeight: FontWeight.w700),
                      ),
                      const SizedBox(height: 8),
                      Material(
                        color: Colors.transparent,
                        child: InkWell(
                          onTap: _openSearchableFlatPicker,
                          borderRadius: AppDimensions.roundedMd,
                          child: Container(
                            height: 56,
                            padding: const EdgeInsets.symmetric(horizontal: 16),
                            decoration: BoxDecoration(
                              color: AppColors.surfaceLow,
                              borderRadius: AppDimensions.roundedMd,
                              border: Border.all(
                                  color: AppColors.border, width: 1.5),
                            ),
                            child: Row(
                              children: [
                                const Icon(Icons.search,
                                    size: 22, color: AppColors.primary),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: Text(
                                    _selectedFlat.isNotEmpty
                                        ? '$_selectedFlat  —  $_selectedResidentName'
                                        : 'Tap to search flat number or resident...',
                                    style: TextStyle(
                                      fontSize: 16,
                                      fontWeight: FontWeight.w700,
                                      color: _selectedFlat.isNotEmpty
                                          ? AppColors.textPrimary
                                          : AppColors.textSecondary,
                                    ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                                const Icon(Icons.arrow_drop_down,
                                    size: 28, color: AppColors.textPrimary),
                              ],
                            ),
                          ),
                        ),
                      ),

                      // Resident Summary Pill (only when flat is selected)
                      if (_selectedFlat.isNotEmpty) ...[
                        const SizedBox(height: 14),
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: AppColors.primaryLight,
                            borderRadius: AppDimensions.roundedMd,
                            border: Border.all(
                                color: AppColors.primary.withOpacity(0.2)),
                          ),
                          child: Row(
                            children: [
                              const Icon(Icons.person,
                                  size: 22, color: AppColors.primary),
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
                      ],

                      const SizedBox(height: 14),

                      // Purpose of Visit
                      TextField(
                        controller: _purposeController,
                        textInputAction: TextInputAction.done,
                        scrollPadding: const EdgeInsets.only(bottom: 160),
                        style: const TextStyle(
                            fontSize: 16, fontWeight: FontWeight.w600),
                        decoration: const InputDecoration(
                          labelText: 'Purpose of Visit',
                          prefixIcon: Icon(Icons.description,
                              size: 24, color: AppColors.primary),
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
                  isLoading: false,
                  onPressed: _sendRequest,
                ),

                const SizedBox(height: 20),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildPhotoThumbnail() {
    return VisitorPhotoAvatar.buildImageWidget(_currentPhotoPath, size: 72);
  }
}

/// Searchable modal bottom sheet to quickly filter and select flat / resident
class _SearchableFlatPickerSheet extends StatefulWidget {
  final String selectedWing;
  final String selectedFlat;
  final Map<String, List<Flat>> wingFlats;
  final List<String> wings;
  final void Function(String wing, String flatNumber) onFlatSelected;

  const _SearchableFlatPickerSheet({
    required this.selectedWing,
    required this.selectedFlat,
    required this.wingFlats,
    required this.wings,
    required this.onFlatSelected,
  });

  @override
  State<_SearchableFlatPickerSheet> createState() =>
      _SearchableFlatPickerSheetState();
}

class _SearchableFlatPickerSheetState extends State<_SearchableFlatPickerSheet> {
  final TextEditingController _searchCtrl = TextEditingController();
  late String _activeWing;
  String _query = '';

  @override
  void initState() {
    super.initState();
    _activeWing = widget.selectedWing;
    _searchCtrl.addListener(() {
      setState(() {
        _query = _searchCtrl.text.trim().toLowerCase();
      });
    });
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  List<Flat> _getFilteredFlats() {
    final all = <Flat>[];
    for (final list in widget.wingFlats.values) {
      all.addAll(list);
    }

    if (_query.isEmpty) {
      if (_activeWing == 'All') {
        return all;
      }
      return widget.wingFlats[_activeWing] ?? [];
    }

    // When searching, match across all flats for maximum convenience
    return all.where((f) {
      final numMatch = f.flatNumber.toLowerCase().contains(_query);
      final nameMatch =
          f.primaryResident?.name.toLowerCase().contains(_query) ?? false;
      final phoneMatch =
          f.primaryResident?.phoneNumber.toLowerCase().contains(_query) ?? false;
      return numMatch || nameMatch || phoneMatch;
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;
    final filteredFlats = _getFilteredFlats();

    return Container(
      height: MediaQuery.of(context).size.height * 0.85,
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        children: [
          // Drag Handle
          Container(
            margin: const EdgeInsets.only(top: 12, bottom: 8),
            width: 44,
            height: 5,
            decoration: BoxDecoration(
              color: Colors.grey.shade300,
              borderRadius: BorderRadius.circular(10),
            ),
          ),

          // Header
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 4, 12, 12),
            child: Row(
              children: [
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Select Flat & Resident',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w800,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      SizedBox(height: 2),
                      Text(
                        'Type flat number or resident name to filter',
                        style: TextStyle(
                          fontSize: 13,
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.close_rounded, size: 24),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
          ),

          // Search Input Bar
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Container(
              decoration: BoxDecoration(
                color: AppColors.surfaceLow,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(
                    color: AppColors.primary.withOpacity(0.35), width: 1.5),
              ),
              child: TextField(
                controller: _searchCtrl,
                autofocus: true,
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textPrimary,
                ),
                decoration: InputDecoration(
                  hintText: 'Search e.g. "101" or "sahil"...',
                  hintStyle: TextStyle(
                    fontSize: 15,
                    color: AppColors.textSecondary.withOpacity(0.7),
                  ),
                  prefixIcon: const Icon(Icons.search_rounded,
                      color: AppColors.primary, size: 24),
                  suffixIcon: _query.isNotEmpty
                      ? IconButton(
                          icon: const Icon(Icons.clear_rounded, size: 20),
                          onPressed: () => _searchCtrl.clear(),
                        )
                      : null,
                  border: InputBorder.none,
                  contentPadding:
                      const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                ),
              ),
            ),
          ),

          // Wing selector tabs (if no active query)
          if (_query.isEmpty && widget.wings.isNotEmpty) ...[
            const SizedBox(height: 12),
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Row(
                children: [
                  Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: ChoiceChip(
                      label: const Text('All Flats'),
                      selected: _activeWing == 'All',
                      selectedColor: AppColors.primary,
                      backgroundColor: AppColors.surfaceLow,
                      labelStyle: TextStyle(
                        color: _activeWing == 'All'
                            ? Colors.white
                            : AppColors.textPrimary,
                        fontWeight: FontWeight.w700,
                        fontSize: 13,
                      ),
                      onSelected: (val) {
                        if (val) setState(() => _activeWing = 'All');
                      },
                    ),
                  ),
                  ...widget.wings.map((wing) {
                    final isSelected = wing == _activeWing;
                    return Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: ChoiceChip(
                        label: Text(wing),
                        selected: isSelected,
                        selectedColor: AppColors.primary,
                        backgroundColor: AppColors.surfaceLow,
                        labelStyle: TextStyle(
                          color: isSelected
                              ? Colors.white
                              : AppColors.textPrimary,
                          fontWeight: FontWeight.w700,
                          fontSize: 13,
                        ),
                        onSelected: (val) {
                          if (val) setState(() => _activeWing = wing);
                        },
                      ),
                    );
                  }),
                ],
              ),
            ),
          ],

          const SizedBox(height: 12),
          const Divider(height: 1, thickness: 1, color: Color(0xFFF1F5F9)),

          // Filtered Flats List
          Expanded(
            child: filteredFlats.isEmpty
                ? Center(
                    child: Padding(
                      padding: const EdgeInsets.all(32),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.search_off_rounded,
                              size: 52, color: AppColors.textMuted),
                          const SizedBox(height: 12),
                          Text(
                            _query.isEmpty
                                ? 'No flats found in $_activeWing'
                                : 'No flats matching "$_query"',
                            textAlign: TextAlign.center,
                            style: const TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w600,
                              color: AppColors.textSecondary,
                            ),
                          ),
                        ],
                      ),
                    ),
                  )
                : ListView.separated(
                    padding: EdgeInsets.fromLTRB(16, 12, 16, bottomInset + 16),
                    itemCount: filteredFlats.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 8),
                    itemBuilder: (ctx, index) {
                      final flat = filteredFlats[index];
                      final isSelected = flat.flatNumber == widget.selectedFlat;
                      final resName =
                          flat.primaryResident?.name ?? 'No Resident';
                      final resPhone = flat.primaryResident?.phoneNumber;

                      return Material(
                        color: isSelected
                            ? AppColors.primaryLight
                            : AppColors.surfaceLow,
                        borderRadius: BorderRadius.circular(14),
                        child: InkWell(
                          onTap: () {
                            widget.onFlatSelected(
                                flat.buildingWing, flat.flatNumber);
                            Navigator.pop(context);
                          },
                          borderRadius: BorderRadius.circular(14),
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 14, vertical: 12),
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(
                                color: isSelected
                                    ? AppColors.primary
                                    : AppColors.border,
                                width: isSelected ? 1.8 : 1.0,
                              ),
                            ),
                            child: Row(
                              children: [
                                // Flat badge
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 12, vertical: 8),
                                  decoration: BoxDecoration(
                                    color: isSelected
                                        ? AppColors.primary
                                        : const Color(0xFF1E293B),
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                  child: Text(
                                    flat.flatNumber,
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontWeight: FontWeight.w800,
                                      fontSize: 15,
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 14),

                                // Resident info
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        resName,
                                        style: TextStyle(
                                          fontSize: 15,
                                          fontWeight: FontWeight.w700,
                                          color: isSelected
                                              ? AppColors.primary
                                              : AppColors.textPrimary,
                                        ),
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        'Wing ${flat.buildingWing}${resPhone != null && resPhone.isNotEmpty ? " • $resPhone" : ""}',
                                        style: const TextStyle(
                                          fontSize: 13,
                                          color: AppColors.textSecondary,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),

                                // Selection checkmark indicator
                                if (isSelected)
                                  const Icon(
                                    Icons.check_circle_rounded,
                                    color: AppColors.primary,
                                    size: 24,
                                  )
                                else
                                  const Icon(
                                    Icons.chevron_right_rounded,
                                    color: AppColors.textMuted,
                                    size: 22,
                                  ),
                              ],
                            ),
                          ),
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}
