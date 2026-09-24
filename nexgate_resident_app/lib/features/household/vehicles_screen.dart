import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../core/constants/app_dimensions.dart';
import '../../core/constants/app_typography.dart';
import '../../core/widgets/confirmation_dialog.dart';
import '../../core/widgets/custom_app_bar.dart';
import '../../core/widgets/empty_state_widget.dart';
import '../../core/widgets/loading_skeleton.dart';
import '../../models/vehicle_model.dart';
import '../../services/api_service.dart';
import 'add_vehicle_screen.dart';

/// Screen listing registered resident vehicles.
class VehiclesScreen extends StatefulWidget {
  const VehiclesScreen({super.key});

  @override
  State<VehiclesScreen> createState() => _VehiclesScreenState();
}

class _VehiclesScreenState extends State<VehiclesScreen> {
  List<VehicleModel> _vehicles = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadVehicles();
  }

  Future<void> _loadVehicles() async {
    setState(() => _isLoading = true);
    try {
      final list = await ApiService.fetchVehicles();
      if (!mounted) return;
      setState(() {
        _vehicles = list;
      });
    } catch (e) {
      debugPrint('[Vehicles] Error: $e');
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _handleDelete(VehicleModel vehicle) async {
    final confirmed = await ConfirmationDialog.show(
      context,
      title: 'Remove Vehicle',
      message: 'Are you sure you want to remove ${vehicle.number} from your registered vehicles?',
      confirmLabel: 'Remove',
      isDestructive: true,
      icon: Icons.no_crash_rounded,
    );

    if (confirmed == true) {
      try {
        await ApiService.deleteVehicle(vehicle.id);
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Vehicle ${vehicle.number} removed')),
        );
        _loadVehicles();
      } catch (e) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to remove: $e')),
        );
      }
    }
  }

  Color _parseColor(String hex) {
    try {
      final clean = hex.replaceAll('#', '');
      return Color(int.parse('FF$clean', radix: 16));
    } catch (_) {
      return Colors.black;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.mainBackground,
      appBar: CustomAppBar(
        title: 'Registered Vehicles',
        subtitle: _isLoading ? 'Loading...' : '${_vehicles.length} authorized tags',
        showBack: true,
      ),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _loadVehicles,
          color: AppColors.primaryBlue,
          child: _isLoading
              ? ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: 2,
                  separatorBuilder: (ctx, index) => const SizedBox(height: 10),
                  itemBuilder: (ctx, index) => LoadingSkeleton(
                    width: double.infinity,
                    height: 70,
                    borderRadius: AppDimensions.roundedLarge,
                  ),
                )
              : _vehicles.isEmpty
                  ? ListView(
                      children: [
                        const SizedBox(height: 60),
                        EmptyStateWidget(
                          icon: Icons.directions_car_outlined,
                          title: 'No Registered Vehicles',
                          description:
                              'Register your four-wheeler or two-wheeler for authorized barrier gate entry.',
                          buttonLabel: 'Add Vehicle',
                          onButtonPressed: () {
                            Navigator.of(context).push(
                              MaterialPageRoute(
                                builder: (_) => const AddVehicleScreen(),
                              ),
                            ).then((_) => _loadVehicles());
                          },
                        ),
                      ],
                    )
                  : ListView.separated(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                      itemCount: _vehicles.length,
                      separatorBuilder: (ctx, index) => const SizedBox(height: 10),
                      itemBuilder: (context, index) {
                        final v = _vehicles[index];
                        return Container(
                          padding: const EdgeInsets.all(12),
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
                                  color: AppColors.lightBlue,
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: Icon(
                                  v.isTwoWheeler
                                      ? Icons.two_wheeler_rounded
                                      : Icons.directions_car_rounded,
                                  color: AppColors.primaryBlue,
                                  size: 22,
                                ),
                              ),
                              const SizedBox(width: 14),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      children: [
                                        Container(
                                          padding: const EdgeInsets.symmetric(
                                              horizontal: 8, vertical: 2),
                                          decoration: BoxDecoration(
                                            color: const Color(0xFF0F172A),
                                            borderRadius: BorderRadius.circular(6),
                                          ),
                                          child: Text(
                                            v.number,
                                            style: const TextStyle(
                                              fontFamily: 'monospace',
                                              color: Colors.white,
                                              fontWeight: FontWeight.w800,
                                              letterSpacing: 1.0,
                                              fontSize: 12,
                                            ),
                                          ),
                                        ),
                                        const SizedBox(width: 8),
                                        Container(
                                          width: 10,
                                          height: 10,
                                          decoration: BoxDecoration(
                                            color: _parseColor(v.color),
                                            shape: BoxShape.circle,
                                            border: Border.all(color: AppColors.border),
                                          ),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      '${v.brand.isNotEmpty ? v.brand : ''} ${v.model.isNotEmpty ? v.model : ''} (${v.type.toUpperCase()})'
                                          .trim(),
                                      style: AppTypography.caption.copyWith(
                                        color: AppColors.secondaryText,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              IconButton(
                                icon: const Icon(Icons.delete_outline_rounded,
                                    color: AppColors.secondaryText, size: 20),
                                onPressed: () => _handleDelete(v),
                              ),
                            ],
                          ),
                        );
                      },
                    ),
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: AppColors.primaryBlue,
        foregroundColor: Colors.white,
        icon: const Icon(Icons.add_rounded),
        label: const Text('Add Vehicle', style: TextStyle(fontWeight: FontWeight.w700)),
        onPressed: () {
          Navigator.of(context).push(
            MaterialPageRoute(builder: (_) => const AddVehicleScreen()),
          ).then((_) => _loadVehicles());
        },
      ),
    );
  }
}
