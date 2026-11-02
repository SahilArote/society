import 'package:flutter_test/flutter_test.dart';
import 'package:nexgate_resident_app/models/invite_model.dart';

void main() {
  group('InviteModel Unit Tests', () {
    test('Correctly parses valid JSON payload', () {
      final json = {
        'id': 'inv_1234567890abcdef',
        'passCode': '482910',
        'visitorName': 'Rahul Sharma',
        'visitorPhone': '9876543210',
        'purpose': 'guest',
        'validFrom': '2026-11-03T10:00:00.000Z',
        'validUntil': '2026-11-03T23:59:59.000Z',
        'notes': 'Please allow parking at slot B2',
        'status': 'ACTIVE',
        'flatNumber': 'A-202',
        'wing': 'Tower A',
        'residentName': 'Sahil Arote',
      };

      final invite = InviteModel.fromJson(json);

      expect(invite.id, 'inv_1234567890abcdef');
      expect(invite.passCode, '482910');
      expect(invite.visitorName, 'Rahul Sharma');
      expect(invite.visitorPhone, '9876543210');
      expect(invite.purpose, 'guest');
      expect(invite.flatNumber, 'A-202');
      expect(invite.residentName, 'Sahil Arote');
      expect(invite.isUsed, false);
      expect(invite.isCancelled, false);
    });

    test('Correctly identifies status flags (USED, CANCELLED)', () {
      final usedInvite = InviteModel(
        id: 'inv_used',
        passCode: '112233',
        visitorName: 'Swiggy Delivery',
        validFrom: DateTime.now().subtract(const Duration(hours: 1)),
        validUntil: DateTime.now().add(const Duration(hours: 2)),
        status: 'USED',
        createdAt: DateTime.now(),
      );

      expect(usedInvite.isUsed, true);
      expect(usedInvite.isActive, false);

      final cancelledInvite = InviteModel(
        id: 'inv_cancelled',
        passCode: '445566',
        visitorName: 'Friend',
        validFrom: DateTime.now(),
        validUntil: DateTime.now().add(const Duration(hours: 5)),
        status: 'CANCELLED',
        createdAt: DateTime.now(),
      );

      expect(cancelledInvite.isCancelled, true);
      expect(cancelledInvite.isActive, false);
    });
  });
}

