import 'package:flutter_test/flutter_test.dart';
import 'package:nexgate_resident_app/models/user_model.dart';
import 'package:nexgate_resident_app/models/visitor_model.dart';
import 'package:nexgate_resident_app/models/family_member_model.dart';
import 'package:nexgate_resident_app/models/vehicle_model.dart';

void main() {
  group('UserModel Serialization', () {
    test('parses JSON correctly with flat hierarchy', () {
      final json = {
        'id': 'usr_123',
        'name': 'Sahil Arote',
        'mobile': '9876543210',
        'role': 'RESIDENT',
        'societyId': 'soc_greengate',
        'flatId': 'flat_456',
        'flatNumber': '402',
        'wing': 'A',
        'societyName': 'Green Gate Residency',
      };

      final user = UserModel.fromJson(json);
      expect(user.id, 'usr_123');
      expect(user.name, 'Sahil Arote');
      expect(user.flatNumber, '402');
      expect(user.wing, 'A');
      expect(user.formattedFlat, 'Wing A - Flat 402');

      final serialized = user.toJson();
      expect(serialized['name'], 'Sahil Arote');
      expect(serialized['mobile'], '9876543210');
    });
  });

  group('VisitorModel Serialization', () {
    test('parses visitor data with status helpers', () {
      final json = {
        'id': 'vis_999',
        'name': 'Rahul Verma',
        'phone': '9123456780',
        'purpose': 'delivery',
        'status': 'PENDING',
        'gate': 'Gate 1',
        'requestedAt': '2026-09-24T17:45:00.000Z',
      };

      final visitor = VisitorModel.fromJson(json);
      expect(visitor.id, 'vis_999');
      expect(visitor.name, 'Rahul Verma');
      expect(visitor.isPending, isTrue);
      expect(visitor.isApproved, isFalse);
      expect(visitor.isEntered, isFalse);
    });

    test('correctly identifies entered/inside status', () {
      final json = {
        'id': 'vis_888',
        'name': 'Pooja Sharma',
        'phone': '9988776655',
        'purpose': 'guest',
        'status': 'ENTERED',
        'gate': 'Gate 2',
        'requestedAt': '2026-09-24T17:00:00.000Z',
      };

      final visitor = VisitorModel.fromJson(json);
      expect(visitor.isEntered, isTrue);
      expect(visitor.isPending, isFalse);
    });
  });

  group('FamilyMemberModel Serialization', () {
    test('parses family member fields correctly', () {
      final json = {
        'id': 'fam_1',
        'name': 'Aditi Arote',
        'relationship': 'Spouse',
        'phone': '9876500000',
      };

      final member = FamilyMemberModel.fromJson(json);
      expect(member.name, 'Aditi Arote');
      expect(member.relationship, 'Spouse');
      expect(member.phone, '9876500000');
    });
  });

  group('VehicleModel Serialization', () {
    test('parses vehicle data and type formatting', () {
      final json = {
        'id': 'veh_1',
        'vehicleNumber': 'MH 12 AB 1234',
        'type': 'car',
        'brand': 'Tata',
        'model': 'Nexon EV',
      };

      final vehicle = VehicleModel.fromJson(json);
      expect(vehicle.number, 'MH 12 AB 1234');
      expect(vehicle.isTwoWheeler, isFalse);
      expect(vehicle.brand, 'Tata');
      expect(vehicle.model, 'Nexon EV');
    });
  });
}
