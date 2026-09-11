import 'resident.dart';

class Flat {
  final String flatNumber;
  final String buildingWing;
  final String floor;
  final List<Resident> residents;

  const Flat({
    required this.flatNumber,
    required this.buildingWing,
    required this.floor,
    required this.residents,
  });

  Resident? get primaryResident => residents.isNotEmpty ? residents.first : null;
}
