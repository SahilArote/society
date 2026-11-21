import 'package:flutter_test/flutter_test.dart';
import 'package:nexgate_resident_app/models/society_service_model.dart';
import 'package:nexgate_resident_app/models/lost_found_model.dart';
import 'package:nexgate_resident_app/models/society_event_model.dart';

void main() {
  group('SocietyServiceModel Serialization & Helpers', () {
    test('parses full service JSON correctly', () {
      final json = {
        'id': 'svc_elec_01',
        'societyId': 'soc_greengate',
        'serviceType': 'VENDOR',
        'name': 'Shri Ganesh Electricals',
        'category': 'Electrician',
        'providerName': 'Ganesh Sharma',
        'phone': '+91 98201 11223',
        'alternatePhone': '+91 98201 11224',
        'address': 'Shop 12, Chandivali Farm Road, Powai, Mumbai',
        'description': 'Certified licensed electrician for house wiring & inverter repairs.',
        'rating': 4.7,
        'reviewCount': 34,
        'isVerified': true,
        'timing': '9:00 AM - 9:00 PM',
      };

      final service = SocietyServiceModel.fromJson(json);
      expect(service.id, 'svc_elec_01');
      expect(service.name, 'Shri Ganesh Electricals');
      expect(service.serviceType, 'VENDOR');
      expect(service.category, 'Electrician');
      expect(service.phone, '+91 98201 11223');
      expect(service.rating, 4.7);
      expect(service.reviewCount, 34);
      expect(service.isVerified, isTrue);
      expect(service.timing, '9:00 AM - 9:00 PM');
      expect(service.initials, 'SG');

      final serialized = service.toJson();
      expect(serialized['id'], 'svc_elec_01');
      expect(serialized['serviceType'], 'VENDOR');
      expect(serialized['rating'], 4.7);
    });

    test('handles fallback defaults gracefully for empty fields', () {
      final json = {
        'id': 'svc_bare',
        'societyId': 'soc_greengate',
        'name': 'Ramesh',
        'category': 'Cook',
        'phone': '9876543210',
      };

      final service = SocietyServiceModel.fromJson(json);
      expect(service.id, 'svc_bare');
      expect(service.serviceType, 'VENDOR');
      expect(service.rating, 4.5);
      expect(service.reviewCount, 0);
      expect(service.initials, 'RA');
    });
  });

  group('LostFoundModel Serialization & Status Helpers', () {
    test('parses lost item correctly and evaluates status helpers', () {
      final json = {
        'id': 'lf_01',
        'societyId': 'soc_greengate',
        'authorId': 'usr_101',
        'authorName': 'Rohit Patil',
        'authorFlat': 'Flat A-402',
        'authorPhone': '+91 98209 87654',
        'type': 'LOST',
        'title': 'Brown leather wallet',
        'description': 'Lost near the pool area. Has Aadhaar card inside.',
        'category': 'Wallets & Bags',
        'location': 'Near Club House & Pool',
        'incidentDate': '2026-08-03T18:30:00.000Z',
        'status': 'ACTIVE',
        'createdAt': '2026-08-03T18:30:00.000Z',
      };

      final item = LostFoundModel.fromJson(json);
      expect(item.id, 'lf_01');
      expect(item.type, 'LOST');
      expect(item.isLost, isTrue);
      expect(item.isFound, isFalse);
      expect(item.isActive, isTrue);
      expect(item.isResolved, isFalse);
      expect(item.authorName, 'Rohit Patil');
      expect(item.authorFlat, 'Flat A-402');

      final serialized = item.toJson();
      expect(serialized['type'], 'LOST');
      expect(serialized['status'], 'ACTIVE');
    });

    test('parses found item with resolved status', () {
      final json = {
        'id': 'lf_02',
        'societyId': 'soc_greengate',
        'authorId': 'usr_guard_1',
        'authorName': 'Ganesh Kale (Security)',
        'authorFlat': 'Gate 1 Guard Cabin',
        'type': 'FOUND',
        'title': 'Car keys (Honda logo)',
        'description': 'Found near X wing parking.',
        'category': 'Keys',
        'location': 'X Wing Parking',
        'incidentDate': '2026-08-02T10:00:00.000Z',
        'status': 'RESOLVED',
        'createdAt': '2026-08-02T10:00:00.000Z',
      };

      final item = LostFoundModel.fromJson(json);
      expect(item.isFound, isTrue);
      expect(item.isLost, isFalse);
      expect(item.isResolved, isTrue);
      expect(item.isActive, isFalse);
    });
  });

  group('SocietyEventModel Serialization & Registration Helpers', () {
    test('parses society event and checks registration status', () {
      final futureDate = DateTime.now().add(const Duration(days: 10)).toIso8601String();
      final json = {
        'id': 'evt_01',
        'societyId': 'soc_greengate',
        'createdBy': 'usr_admin',
        'title': 'Ganesh Chaturthi Utsav 2026',
        'description': 'Grand celebration of Ganesh Festival at Central Amphitheatre.',
        'category': 'Celebration',
        'coverImage': 'https://images.unsplash.com/photo-1567591974584-f1832dfcad52?w=800',
        'eventDate': futureDate,
        'timeStr': '6:00 PM - 10:00 PM',
        'venue': 'Society Central Amphitheatre',
        'organizer': 'Eco Residency Cultural Committee',
        'capacity': 250,
        'registrationCount': 84,
        'status': 'UPCOMING',
        'isRegistered': true,
        'guestCount': 2,
      };

      final event = SocietyEventModel.fromJson(json);
      expect(event.id, 'evt_01');
      expect(event.title, 'Ganesh Chaturthi Utsav 2026');
      expect(event.isUpcoming, isTrue);
      expect(event.isRegistered, isTrue);
      expect(event.guestCount, 2);
      expect(event.isFull, isFalse);
      expect(event.timeStr, '6:00 PM - 10:00 PM');
      expect(event.venue, 'Society Central Amphitheatre');
      expect(event.organizer, 'Eco Residency Cultural Committee');

      final serialized = event.toJson();
      expect(serialized['status'], 'UPCOMING');
      expect(serialized['isRegistered'], isTrue);
    });

    test('detects full capacity and past events correctly', () {
      final pastDate = DateTime.now().subtract(const Duration(days: 5)).toIso8601String();
      final json = {
        'id': 'evt_past',
        'societyId': 'soc_greengate',
        'createdBy': 'usr_admin',
        'title': 'Yoga Morning Workshop',
        'description': 'Morning yoga session',
        'category': 'Sports',
        'eventDate': pastDate,
        'timeStr': '06:30 AM',
        'venue': 'Clubhouse Terrace',
        'organizer': 'Fitness Club',
        'capacity': 20,
        'registrationCount': 20,
        'status': 'COMPLETED',
        'isRegistered': false,
      };

      final event = SocietyEventModel.fromJson(json);
      expect(event.isUpcoming, isFalse);
      expect(event.isCompleted, isTrue);
      expect(event.isFull, isTrue);
      expect(event.isRegistered, isFalse);
    });
  });
}
