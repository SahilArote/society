import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

/// Service for handling Push and Local Notifications in NexGate Resident App.
class NotificationService {
  NotificationService._();

  static final FlutterLocalNotificationsPlugin _notificationsPlugin =
      FlutterLocalNotificationsPlugin();

  static bool _isInitialized = false;

  /// Callback when user taps a notification
  static void Function(String? payload)? onNotificationTapped;

  /// Initialize notification channels and platform settings
  static Future<void> initialize({void Function(String? payload)? onTapped}) async {
    if (_isInitialized) return;

    onNotificationTapped = onTapped;

    const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
    const iosSettings = DarwinInitializationSettings(
      requestAlertPermission: true,
      requestBadgePermission: true,
      requestSoundPermission: true,
    );

    const initSettings = InitializationSettings(
      android: androidSettings,
      iOS: iosSettings,
    );

    await _notificationsPlugin.initialize(
      settings: initSettings,
      onDidReceiveNotificationResponse: (NotificationResponse response) {
        debugPrint('[NotificationService] Notification tapped: ${response.payload}');
        if (onNotificationTapped != null) {
          onNotificationTapped!(response.payload);
        }
      },
    );

    // Request notification permission for Android 13+
    await requestPermissions();

    _isInitialized = true;
    debugPrint('[NotificationService] Initialized successfully.');
  }

  /// Request runtime notification permissions
  static Future<bool> requestPermissions() async {
    try {
      final androidImplementation = _notificationsPlugin
          .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>();

      final granted = await androidImplementation?.requestNotificationsPermission();
      debugPrint('[NotificationService] Android Notification Permission: $granted');
      return granted ?? true;
    } catch (e) {
      debugPrint('[NotificationService] Error requesting permission: $e');
      return false;
    }
  }

  /// Show high-priority visitor gate alert notification
  static Future<void> showVisitorAlert({
    required String visitorName,
    required String flatNumber,
    required String gateName,
    String? requestId,
  }) async {
    const androidDetails = AndroidNotificationDetails(
      'nexgate_visitor_alerts',
      'Gate Visitor Alerts',
      channelDescription: 'Instant alerts when a visitor or delivery arrives at the gate',
      importance: Importance.max,
      priority: Priority.high,
      playSound: true,
      enableVibration: true,
      category: AndroidNotificationCategory.call,
      fullScreenIntent: true,
      styleInformation: BigTextStyleInformation(''),
    );

    const notificationDetails = NotificationDetails(
      android: androidDetails,
      iOS: DarwinNotificationDetails(
        presentAlert: true,
        presentBadge: true,
        presentSound: true,
        interruptionLevel: InterruptionLevel.timeSensitive,
      ),
    );

    final notificationId = DateTime.now().millisecondsSinceEpoch ~/ 1000;

    await _notificationsPlugin.show(
      id: notificationId,
      title: '🚨 Visitor at Gate: $visitorName',
      body: '$visitorName is waiting at $gateName for Flat $flatNumber. Tap to view and approve.',
      notificationDetails: notificationDetails,
      payload: requestId,
    );

    debugPrint('[NotificationService] Dispatched visitor alert for $visitorName');
  }

  /// Show general notification (e.g. status updates, society notices)
  static Future<void> showGeneralNotification({
    required String title,
    required String body,
    String? payload,
  }) async {
    const androidDetails = AndroidNotificationDetails(
      'nexgate_general_alerts',
      'General Notifications',
      channelDescription: 'Updates on entry approvals, registrations, and announcements',
      importance: Importance.defaultImportance,
      priority: Priority.defaultPriority,
      playSound: true,
      enableVibration: true,
    );

    const notificationDetails = NotificationDetails(
      android: androidDetails,
      iOS: DarwinNotificationDetails(
        presentAlert: true,
        presentBadge: true,
        presentSound: true,
      ),
    );

    final notificationId = DateTime.now().millisecondsSinceEpoch ~/ 1000;

    await _notificationsPlugin.show(
      id: notificationId,
      title: title,
      body: body,
      notificationDetails: notificationDetails,
      payload: payload,
    );
  }
}
