import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:greengate_guard_app/models/visitor.dart';
import 'package:greengate_guard_app/models/visitor_request.dart';
import 'package:greengate_guard_app/repositories/guard_repository.dart';
import 'package:greengate_guard_app/repositories/visitor_repository.dart';
import 'package:greengate_guard_app/services/storage_service.dart';
import 'package:greengate_guard_app/features/visitor_entry/waiting_approval_screen.dart';
import 'package:greengate_guard_app/features/visitor_entry/entry_approved_screen.dart';
import 'package:greengate_guard_app/features/visitor_entry/entry_rejected_screen.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('GuardRepository Tests', () {
    test('Login validation with valid PIN', () async {
      SharedPreferences.setMockInitialValues({});
      final storage = await StorageService.init();
      final guardRepo = GuardRepository(storage);

      // Default PIN 1234
      final result = await guardRepo.login('GRD-8821', '1234');
      expect(result, isTrue);
      expect(guardRepo.isAuthenticated, isTrue);
      expect(guardRepo.currentGuard?.name, equals('Officer Vikram Singh'));

      // Logout
      await guardRepo.logout();
      expect(guardRepo.isAuthenticated, isFalse);
    });

    test('Login rejection with wrong PIN', () async {
      SharedPreferences.setMockInitialValues({});
      final storage = await StorageService.init();
      final guardRepo = GuardRepository(storage);

      final result = await guardRepo.login('GRD-8821', '0000');
      expect(result, isFalse);
      expect(guardRepo.isAuthenticated, isFalse);
    });
  });

  group('VisitorRepository Tests', () {
    test('Seed requests and counts are populated correctly', () async {
      SharedPreferences.setMockInitialValues({});
      final storage = await StorageService.init();
      final visitorRepo = VisitorRepository(storage);

      expect(visitorRepo.allRequests.isNotEmpty, isTrue);
      expect(visitorRepo.wings.length, equals(4));
      expect(visitorRepo.pendingRequests.isNotEmpty, isTrue);
    });

    test('New visitor request creation and decision flow', () async {
      SharedPreferences.setMockInitialValues({});
      final storage = await StorageService.init();
      final visitorRepo = VisitorRepository(storage);

      final initialCount = visitorRepo.allRequests.length;

      final req = await visitorRepo.createVisitorRequest(
        name: 'Test Delivery Executive',
        type: VisitorType.delivery,
        deliveryCompany: 'Amazon',
        buildingWing: 'Tower B',
        flatNumber: 'B-402',
        residentName: 'Dr. Amit Sharma',
        residentPhone: '+91 98200 44821',
        purpose: 'Package Delivery',
      );

      expect(visitorRepo.allRequests.length, equals(initialCount + 1));
      expect(req.status, equals(VisitorStatus.pending));

      // Simulate Resident Approval
      await visitorRepo.simulateResidentDecision(
        requestId: req.id,
        isApproved: true,
      );

      final approvedReq = visitorRepo.allRequests.firstWhere((r) => r.id == req.id);
      expect(approvedReq.status, equals(VisitorStatus.approved));

      // Guard confirms entry via completeEntry
      await visitorRepo.completeEntry(req.id);
      final completedReq = visitorRepo.allRequests.firstWhere((r) => r.id == req.id);
      expect(completedReq.status, equals(VisitorStatus.completed));
    });

    test('Resident Rejection simulation path', () async {
      SharedPreferences.setMockInitialValues({});
      final storage = await StorageService.init();
      final visitorRepo = VisitorRepository(storage);

      final req = await visitorRepo.createVisitorRequest(
        name: 'Sales Rep',
        type: VisitorType.other,
        buildingWing: 'Tower A',
        flatNumber: 'A-101',
        residentName: 'Priya Sharma',
        residentPhone: '+91 98101 22334',
        purpose: 'Marketing Visit',
      );

      expect(req.status, equals(VisitorStatus.pending));

      // Simulate Resident Rejection
      await visitorRepo.simulateResidentDecision(
        requestId: req.id,
        isApproved: false,
        reason: 'Not expected / Denied',
      );

      final rejectedReq = visitorRepo.allRequests.firstWhere((r) => r.id == req.id);
      expect(rejectedReq.status, equals(VisitorStatus.rejected));
      expect(rejectedReq.rejectionReason, equals('Not expected / Denied'));
    });

    test('Reset to seed data restores defaults', () async {
      SharedPreferences.setMockInitialValues({});
      final storage = await StorageService.init();
      final visitorRepo = VisitorRepository(storage);

      await visitorRepo.createVisitorRequest(
        name: 'Temporary Visitor',
        type: VisitorType.guest,
        buildingWing: 'Tower D',
        flatNumber: 'D-101',
        residentName: 'Rohan Verma',
        residentPhone: '+91 98887 99001',
        purpose: 'Quick Visit',
      );

      expect(visitorRepo.allRequests.length, equals(5));

      await visitorRepo.resetToSeedData();
      expect(visitorRepo.allRequests.length, equals(4));
    });

    test('Filter and search works on visitor history', () async {
      SharedPreferences.setMockInitialValues({});
      final storage = await StorageService.init();
      final visitorRepo = VisitorRepository(storage);

      final results = visitorRepo.filterHistory(query: 'B-402');
      expect(results.any((r) => r.flatNumber == 'B-402'), isTrue);

      final completedResults = visitorRepo.filterHistory(status: VisitorStatus.completed);
      expect(completedResults.every((r) => r.status == VisitorStatus.completed), isTrue);
    });
  });

  group('Visitor Flow UI Tests', () {
    testWidgets('WaitingApprovalScreen displays status and simulation buttons', (tester) async {
      SharedPreferences.setMockInitialValues({});
      final storage = await StorageService.init();
      final visitorRepo = VisitorRepository(storage);
      final guardRepo = GuardRepository(storage);

      final req = visitorRepo.pendingRequests.first;

      await tester.pumpWidget(
        MaterialApp(
          home: WaitingApprovalScreen(
            request: req,
            visitorRepo: visitorRepo,
            guardRepo: guardRepo,
          ),
        ),
      );

      expect(find.text('Waiting for Resident Approval'), findsOneWidget);
      expect(find.text('WAITING FOR APPROVAL'), findsOneWidget);
      expect(find.text('CANCEL REQUEST'), findsOneWidget);
      expect(find.text('Simulate Approve'), findsOneWidget);
      expect(find.text('Simulate Reject'), findsOneWidget);
    });

    testWidgets('EntryApprovedScreen displays APPROVED and COMPLETE ENTRY', (tester) async {
      SharedPreferences.setMockInitialValues({});
      final storage = await StorageService.init();
      final visitorRepo = VisitorRepository(storage);
      final guardRepo = GuardRepository(storage);

      final req = VisitorRequest(
        id: 'REQ-TEST-1',
        visitor: const Visitor(name: 'Test Visitor', type: VisitorType.guest),
        flatNumber: 'B-402',
        buildingWing: 'Tower B',
        residentName: 'Dr. Amit Sharma',
        residentPhone: '+91 98200 44821',
        purpose: 'Test Purpose',
        status: VisitorStatus.approved,
        requestTime: DateTime.now(),
        decisionTime: DateTime.now(),
      );

      await tester.pumpWidget(
        MaterialApp(
          home: EntryApprovedScreen(
            request: req,
            visitorRepo: visitorRepo,
            guardRepo: guardRepo,
          ),
        ),
      );

      expect(find.text('Visitor Approved'), findsOneWidget);
      expect(find.text('ENTRY APPROVED'), findsOneWidget);
      expect(find.text('COMPLETE ENTRY'), findsOneWidget);
    });

    testWidgets('EntryRejectedScreen displays REJECTED and DONE', (tester) async {
      SharedPreferences.setMockInitialValues({});
      final storage = await StorageService.init();
      final visitorRepo = VisitorRepository(storage);
      final guardRepo = GuardRepository(storage);

      final req = VisitorRequest(
        id: 'REQ-TEST-2',
        visitor: const Visitor(name: 'Test Visitor 2', type: VisitorType.other),
        flatNumber: 'C-102',
        buildingWing: 'Tower C',
        residentName: 'Mrs. Neha Gupta',
        residentPhone: '+91 98110 33921',
        purpose: 'Sales',
        status: VisitorStatus.rejected,
        rejectionReason: 'Not expected',
        requestTime: DateTime.now(),
      );

      await tester.pumpWidget(
        MaterialApp(
          home: EntryRejectedScreen(
            request: req,
            visitorRepo: visitorRepo,
            guardRepo: guardRepo,
          ),
        ),
      );

      expect(find.text('Visitor Rejected'), findsOneWidget);
      expect(find.text('ENTRY REJECTED'), findsOneWidget);
      expect(find.text('DONE'), findsOneWidget);
      expect(find.text('“Not expected”'), findsOneWidget);
    });
  });
}
