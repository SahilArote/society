import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_dimensions.dart';
import '../../core/constants/app_typography.dart';
import '../../core/widgets/custom_app_bar.dart';
import '../../core/widgets/custom_text_field.dart';
import '../../core/widgets/primary_button.dart';
import '../../services/api_service.dart';

/// Form to register a new vehicle with license plate, type, brand, and color.
class AddVehicleScreen extends StatefulWidget {
  const AddVehicleScreen({super.key});

  @override
  State<AddVehicleScreen> createState() => _AddVehicleScreenState();
}

class _AddVehicleScreenState extends State<AddVehicleScreen> {
  final TextEditingController _numberController = TextEditingController();
  final TextEditingController _brandController = TextEditingController();
  final TextEditingController _modelController = TextEditingController();

  String _selectedType = 'car';
  String _selectedColor = '#000000';
  bool _isSubmitting = false;

  final List<String> _types = const ['car', 'bike', 'scooter', 'ev'];

  final List<Map<String, String>> _colors = const [
    {'name': 'Black', 'hex': '#000000'},
    {'name': 'White', 'hex': '#FFFFFF'},
    {'name': 'Silver', 'hex': '#94A3B8'},
    {'name': 'Red', 'hex': '#DC2626'},
    {'name': 'Blue', 'hex': '#2563EB'},
    {'name': 'Grey', 'hex': '#475569'},
  ];

  Color _parseColor(String hex) {
    try {
      final clean = hex.replaceAll('#', '');
      return Color(int.parse('FF$clean', radix: 16));
    } catch (_) {
      return Colors.black;
    }
  }

  Future<void> _handleSubmit() async {
    final number = _numberController.text.trim();
    if (number.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter vehicle registration number')),
      );
      return;
    }

    setState(() => _isSubmitting = true);
    try {
      await ApiService.addVehicle(
        number: number,
        type: _selectedType,
        brand: _brandController.text.trim(),
        model: _modelController.text.trim(),
        color: _selectedColor,
      );

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Vehicle registered successfully'),
          backgroundColor: AppColors.success,
        ),
      );
      Navigator.of(context).pop();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: $e')),
      );
    } finally {
      if (mounted) {
        setState(() => _isSubmitting = false);
      }
    }
  }

  @override
  void dispose() {
    _numberController.dispose();
    _brandController.dispose();
    _modelController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.mainBackground,
      appBar: const CustomAppBar(
        title: 'Register Vehicle',
        showBack: true,
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 14.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('VEHICLE DETAILS', style: AppTypography.sectionHeader),
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: AppDimensions.roundedLarge,
                  border: Border.all(color: AppColors.border),
                  boxShadow: AppDimensions.subtleShadow,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    CustomTextField(
                      controller: _numberController,
                      label: 'Registration Number Plate *',
                      hint: 'e.g. MH 12 AB 1234',
                      autofocus: true,
                    ),
                    const SizedBox(height: 16),
                    Text('Vehicle Category *', style: AppTypography.caption),
                    const SizedBox(height: 6),
                    Row(
                      children: _types.map((t) {
                        final isSelected = _selectedType == t;
                        return Expanded(
                          child: InkWell(
                            onTap: () => setState(() => _selectedType = t),
                            borderRadius: BorderRadius.circular(10),
                            child: Container(
                              margin: const EdgeInsets.symmetric(horizontal: 3),
                              padding: const EdgeInsets.symmetric(vertical: 8),
                              decoration: BoxDecoration(
                                color: isSelected
                                    ? AppColors.primaryBlue
                                    : AppColors.mainBackground,
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(
                                  color: isSelected
                                      ? AppColors.primaryBlue
                                      : AppColors.border,
                                ),
                              ),
                              alignment: Alignment.center,
                              child: Text(
                                t.toUpperCase(),
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w700,
                                  color: isSelected
                                      ? Colors.white
                                      : AppColors.primaryText,
                                ),
                              ),
                            ),
                          ),
                        );
                      }).toList(),
                    ),
                    const SizedBox(height: 16),
                    CustomTextField(
                      controller: _brandController,
                      label: 'Make / Brand',
                      hint: 'e.g. Hyundai, Honda, Tata',
                    ),
                    const SizedBox(height: 16),
                    CustomTextField(
                      controller: _modelController,
                      label: 'Model Name',
                      hint: 'e.g. Creta, Activa, Nexon',
                    ),
                    const SizedBox(height: 16),
                    Text('Vehicle Color', style: AppTypography.caption),
                    const SizedBox(height: 8),
                    Row(
                      children: _colors.map((c) {
                        final isSelected = _selectedColor == c['hex'];
                        final colorVal = _parseColor(c['hex']!);
                        return GestureDetector(
                          onTap: () => setState(() => _selectedColor = c['hex']!),
                          child: Container(
                            margin: const EdgeInsets.only(right: 12),
                            width: 32,
                            height: 32,
                            decoration: BoxDecoration(
                              color: colorVal,
                              shape: BoxShape.circle,
                              border: Border.all(
                                color: isSelected
                                    ? AppColors.primaryBlue
                                    : AppColors.border,
                                width: isSelected ? 3 : 1,
                              ),
                            ),
                            child: isSelected
                                ? Icon(
                                    Icons.check,
                                    size: 16,
                                    color: colorVal.computeLuminance() > 0.5
                                        ? Colors.black
                                        : Colors.white,
                                  )
                                : null,
                          ),
                        );
                      }).toList(),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 32),

              PrimaryButton(
                label: 'Save & Authorize Vehicle',
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
