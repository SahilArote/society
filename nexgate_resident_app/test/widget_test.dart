import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:nexgate_resident_app/core/widgets/primary_button.dart';
import 'package:nexgate_resident_app/core/widgets/status_badge.dart';
import 'package:nexgate_resident_app/core/widgets/custom_text_field.dart';
import 'package:nexgate_resident_app/core/widgets/empty_state_widget.dart';
import 'package:nexgate_resident_app/services/storage_service.dart';
import 'package:nexgate_resident_app/main.dart';

void main() {
  setUp(() async {
    SharedPreferences.setMockInitialValues({});
    await StorageService.init();
  });

  group('NexGate Design System Component Tests', () {
    testWidgets('PrimaryButton renders label and triggers onTap', (WidgetTester tester) async {
      bool tapped = false;
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: PrimaryButton(
              label: 'Allow Entry',
              onPressed: () => tapped = true,
            ),
          ),
        ),
      );

      expect(find.text('Allow Entry'), findsOneWidget);
      await tester.tap(find.text('Allow Entry'));
      await tester.pump();
      expect(tapped, isTrue);
    });

    testWidgets('StatusBadge displays correct label for approved status',
        (WidgetTester tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: StatusBadge.fromStatus('approved'),
          ),
        ),
      );

      expect(find.text('Approved'), findsOneWidget);
    });

    testWidgets('CustomTextField accepts input text', (WidgetTester tester) async {
      final controller = TextEditingController();
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: CustomTextField(
              controller: controller,
              label: 'Full Name',
              hint: 'Enter your full name',
            ),
          ),
        ),
      );

      expect(find.text('Full Name'), findsOneWidget);
      await tester.enterText(find.byType(TextField), 'John Doe');
      expect(controller.text, 'John Doe');
    });

    testWidgets('EmptyStateWidget renders title and description', (WidgetTester tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: EmptyStateWidget(
              title: 'No Visitors Yet',
              description: 'When guests arrive at the security gate, they will show up here.',
              icon: Icons.person_off_rounded,
            ),
          ),
        ),
      );

      expect(find.text('No Visitors Yet'), findsOneWidget);
      expect(find.text('When guests arrive at the security gate, they will show up here.'),
          findsOneWidget);
    });
  });

  group('NexGate App Lifecycle & Root Smoke Test', () {
    testWidgets('NexGate Resident App boots splash and handles animations',
        (WidgetTester tester) async {
      await tester.pumpWidget(const NexGateResidentApp());
      expect(find.byType(NexGateResidentApp), findsOneWidget);

      // Advance clock past splash animation and navigation timer (2100ms + transitions)
      await tester.pump(const Duration(milliseconds: 500));
      await tester.pump(const Duration(milliseconds: 1000));
      await tester.pump(const Duration(milliseconds: 1500));
      await tester.pumpAndSettle();

      // App should transition smoothly without unhandled exceptions or hanging timers
      expect(find.byType(MaterialApp), findsOneWidget);
    });
  });
}
