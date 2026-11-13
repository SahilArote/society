import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../core/utils/haptic_helper.dart';
import '../../core/widgets/custom_app_bar.dart';
import '../../core/widgets/primary_button.dart';
import '../../services/api_service.dart';

class ReportItemScreen extends StatefulWidget {
  const ReportItemScreen({super.key});

  @override
  State<ReportItemScreen> createState() => _ReportItemScreenState();
}

class _ReportItemScreenState extends State<ReportItemScreen> {
  final _formKey = GlobalKey<FormState>();

  String _type = 'LOST'; // LOST or FOUND
  final TextEditingController _titleController = TextEditingController();
  final TextEditingController _locationController = TextEditingController();
  final TextEditingController _descriptionController = TextEditingController();
  final TextEditingController _imageController = TextEditingController();

  String _selectedCategory = 'Wallet & Cards';
  DateTime _incidentDate = DateTime.now();
  bool _isSubmitting = false;

  static const List<String> _categories = [
    'Wallet & Cards',
    'Keys',
    'Electronics',
    'Bags & Luggage',
    'Jewelry & Watches',
    'Documents & IDs',
    'Pets',
    'Clothing & Footwear',
    'Others',
  ];

  @override
  void dispose() {
    _titleController.dispose();
    _locationController.dispose();
    _descriptionController.dispose();
    _imageController.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _incidentDate,
      firstDate: DateTime.now().subtract(const Duration(days: 60)),
      lastDate: DateTime.now(),
      builder: (context, child) {
        return Theme(
          data: ThemeData.light().copyWith(
            primaryColor: AppColors.primaryBlue,
            colorScheme: const ColorScheme.light(primary: AppColors.primaryBlue),
          ),
          child: child!,
        );
      },
    );
    if (picked != null) {
      setState(() => _incidentDate = picked);
    }
  }

  Future<void> _handleSubmit() async {
    if (!_formKey.currentState!.validate()) return;

    HapticHelper.mediumImpact();
    setState(() => _isSubmitting = true);

    try {
      await ApiService.createLostFoundItem(
        type: _type,
        title: _titleController.text.trim(),
        description: _descriptionController.text.trim(),
        category: _selectedCategory,
        location: _locationController.text.trim(),
        incidentDate: _incidentDate,
        imageUrl: _imageController.text.trim().isNotEmpty ? _imageController.text.trim() : null,
      );

      if (!mounted) return;
      HapticHelper.success();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(_type == 'LOST' ? 'Lost item reported to society' : 'Found item reported to society'),
          backgroundColor: AppColors.success,
        ),
      );
      Navigator.of(context).pop(true);
    } catch (e) {
      if (!mounted) return;
      HapticHelper.error();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Failed to submit report: $e'),
          backgroundColor: AppColors.error,
        ),
      );
      setState(() => _isSubmitting = false);
    }
  }

  
  Widget _buildFormField({
    required TextEditingController controller,
    required String label,
    required String hintText,
    IconData? prefixIcon,
    int maxLines = 1,
    String? Function(String?)? validator,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.primaryText),
        ),
        const SizedBox(height: 6),
        TextFormField(
          controller: controller,
          maxLines: maxLines,
          validator: validator,
          style: const TextStyle(fontSize: 13, color: AppColors.primaryText),
          decoration: InputDecoration(
            hintText: hintText,
            hintStyle: const TextStyle(fontSize: 13, color: AppColors.mutedText),
            prefixIcon: prefixIcon != null ? Icon(prefixIcon, size: 20, color: AppColors.secondaryText) : null,
            filled: true,
            fillColor: Colors.white,
            contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: AppColors.border),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: AppColors.border),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: AppColors.primaryBlue, width: 1.5),
            ),
          ),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final isLost = _type == 'LOST';

    return Scaffold(
      backgroundColor: AppColors.mainBackground,
      appBar: const CustomAppBar(
        title: 'Report Item',
        showBack: true,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Toggle: Lost vs Found
              Container(
                padding: const EdgeInsets.all(4),
                decoration: BoxDecoration(
                  color: const Color(0xFFE2E8F0),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: GestureDetector(
                        onTap: () {
                          HapticHelper.selectionClick();
                          setState(() => _type = 'LOST');
                        },
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 150),
                          padding: const EdgeInsets.symmetric(vertical: 10),
                          decoration: BoxDecoration(
                            color: isLost ? const Color(0xFFDC2626) : Colors.transparent,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Text(
                            'I LOST SOMETHING',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                              color: isLost ? Colors.white : AppColors.secondaryText,
                            ),
                          ),
                        ),
                      ),
                    ),
                    Expanded(
                      child: GestureDetector(
                        onTap: () {
                          HapticHelper.selectionClick();
                          setState(() => _type = 'FOUND');
                        },
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 150),
                          padding: const EdgeInsets.symmetric(vertical: 10),
                          decoration: BoxDecoration(
                            color: !isLost ? const Color(0xFF16A34A) : Colors.transparent,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Text(
                            'I FOUND SOMETHING',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                              color: !isLost ? Colors.white : AppColors.secondaryText,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              // Title
              _buildFormField(
                controller: _titleController,
                label: 'Item Title',
                hintText: isLost ? 'e.g., Brown leather wallet with Aadhaar' : 'e.g., Set of Honda car keys',
                prefixIcon: Icons.title_rounded,
                validator: (val) {
                  if (val == null || val.trim().isEmpty) return 'Please provide an item title';
                  return null;
                },
              ),
              const SizedBox(height: 16),

              // Category Dropdown
              const Text(
                'Category',
                style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.primaryText),
              ),
              const SizedBox(height: 6),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.border),
                ),
                child: DropdownButtonHideUnderline(
                  child: DropdownButton<String>(
                    value: _selectedCategory,
                    isExpanded: true,
                    icon: const Icon(Icons.arrow_drop_down_rounded, color: AppColors.secondaryText),
                    items: _categories.map((c) {
                      return DropdownMenuItem(value: c, child: Text(c, style: const TextStyle(fontSize: 13)));
                    }).toList(),
                    onChanged: (val) {
                      if (val != null) setState(() => _selectedCategory = val);
                    },
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // Location
              _buildFormField(
                controller: _locationController,
                label: isLost ? 'Where did you lose it?' : 'Where did you find it?',
                hintText: 'e.g., Near pool area, Wing B lift, Basement 2',
                prefixIcon: Icons.location_on_outlined,
                validator: (val) {
                  if (val == null || val.trim().isEmpty) return 'Location is required';
                  return null;
                },
              ),
              const SizedBox(height: 16),

              // Incident Date Picker
              const Text(
                'Incident Date',
                style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.primaryText),
              ),
              const SizedBox(height: 6),
              InkWell(
                onTap: _pickDate,
                borderRadius: BorderRadius.circular(12),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.calendar_today_rounded, size: 18, color: AppColors.primaryBlue),
                      const SizedBox(width: 10),
                      Text(
                        '${_incidentDate.day}/${_incidentDate.month}/${_incidentDate.year}',
                        style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.primaryText),
                      ),
                      const Spacer(),
                      const Text('Change', style: TextStyle(fontSize: 12, color: AppColors.primaryBlue, fontWeight: FontWeight.w600)),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // Description
              _buildFormField(
                controller: _descriptionController,
                label: 'Description & Identifying Marks',
                hintText: 'Describe color, brand, specific scratches, unique marks, contents...',
                maxLines: 4,
                validator: (val) {
                  if (val == null || val.trim().isEmpty) return 'Detailed description is required';
                  return null;
                },
              ),
              const SizedBox(height: 16),

              // Optional Image URL
              _buildFormField(
                controller: _imageController,
                label: 'Photo Image URL (Optional)',
                hintText: 'https://...',
                prefixIcon: Icons.image_outlined,
              ),
              const SizedBox(height: 32),

              // Submit Button
              PrimaryButton(
                label: isLost ? 'Post Lost Item Alert' : 'Post Found Item Notice',
                icon: isLost ? Icons.search_rounded : Icons.check_circle_outline_rounded,
                isLoading: _isSubmitting,
                onPressed: _handleSubmit,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
