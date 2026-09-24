/// Model for registered resident vehicles.
class VehicleModel {
  final String id;
  final String number;
  final String type; // car, bike, scooter, ev
  final String brand;
  final String model;
  final String color;
  final String status;

  const VehicleModel({
    required this.id,
    required this.number,
    this.type = 'car',
    this.brand = '',
    this.model = '',
    this.color = '#000000',
    this.status = 'active',
  });

  bool get isTwoWheeler => type.toLowerCase() == 'bike' || type.toLowerCase() == 'scooter';

  factory VehicleModel.fromJson(Map<String, dynamic> json) {
    return VehicleModel(
      id: json['id']?.toString() ?? '',
      number: json['vehicleNumber']?.toString() ?? json['number']?.toString() ?? '',
      type: json['type']?.toString().toLowerCase() ?? 'car',
      brand: json['brand']?.toString() ?? '',
      model: json['model']?.toString() ?? '',
      color: json['color']?.toString() ?? '#000000',
      status: json['status']?.toString() ?? 'active',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'number': number,
      'type': type,
      'brand': brand,
      'model': model,
      'color': color,
    };
  }
}
