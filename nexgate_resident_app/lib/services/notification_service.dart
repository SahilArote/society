import 'package:flutter/foundation.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'api_service.dart';

/// Top-level background message handler for Firebase Cloud Messaging (FCM).
@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  try {
    await Firebase.initializeApp();
  } catch (_) {}
  debugPrint('[FCM Background] Received background message: ${message.messageId}');
}

/// Service for handling Push (FCM) and Local Notifications in NexGate Resident App.
class NotificationService {
  NotificationService._();

  static final FlutterLocalNotificationsPlugin _notificationsPlugin =
      FlutterLocalNotificationsPlugin();

  static bool _isInitialized = false;

  /// Callback when user taps a notification
  static void Function(String? payload)? onNotificationTapped;

  /// Initialize notification channels, FCM and platform settings
  static Future<void> initialize({void Function(String? payload)? onTapped}) async {
    if (_isInitialized) return;

    onNotificationTapped = onTapped;

    // 1. Initialize Local Notification Plugin
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
        debugPrint('[NotificationService] Local notification tapped: ${response.payload}');
        if (onNotificationTapped != null) {
          onNotificationTapped!(response.payload);
        }
      },
    );

    // Request notification permission for Android 13+
    await requestPermissions();

    // 2. Initialize Firebase Core & Cloud Messaging
    try {
      await Firebase.initializeApp();
      FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);

      // Request FCM permission
      final settings = await FirebaseMessaging.instance.requestPermission(
        alert: true,
        badge: true,
        sound: true,
        provisional: false,
      );
      debugPrint('[FCM] Permission status: ${settings.authorizationStatus}');

      // Enable foreground notification presentation
      await FirebaseMessaging.instance.setForegroundNotificationPresentationOptions(
        alert: true,
        badge: true,
        sound: true,
      );

      // 3. Obtain & Register FCM Device Token
      await syncFcmToken();

      // Listen for token refreshes
      FirebaseMessaging.instance.onTokenRefresh.listen((newToken) {
        debugPrint('[FCM] Token refreshed: $newToken');
        ApiService.registerFcmToken(newToken);
      });

      // 4. Foreground Message Listener -> Show Heads-Up Alert Banner
      FirebaseMessaging.onMessage.listen((RemoteMessage message) {
        debugPrint('[FCM] Foreground push message received: ${message.data}');
        final title = message.notification?.title ?? message.data['title'] ?? '🚨 Gate Alert';
        final body = message.notification?.body ?? message.data['body'] ?? 'Visitor arrived at gate';
        final requestId = message.data['requestId'];

        showGeneralNotification(
          title: title,
          body: body,
          payload: requestId,
        );
      });

      // 5. Message Opened from Background
      FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
        debugPrint('[FCM] Notification clicked from background: ${message.data}');
        final requestId = message.data['requestId'];
        if (onNotificationTapped != null && requestId != null) {
          onNotificationTapped!(requestId);
        }
      });

      // 6. Check if app was opened from terminated state by a notification
      final initialMessage = await FirebaseMessaging.instance.getInitialMessage();
      if (initialMessage != null) {
        debugPrint('[FCM] App launched from terminated state via notification: ${initialMessage.data}');
        final requestId = initialMessage.data['requestId'];
        if (onNotificationTapped != null && requestId != null) {
          onNotificationTapped!(requestId);
        }
      }

      debugPrint('[FCM] Firebase Cloud Messaging setup complete.');
    } catch (e) {
      debugPrint('[FCM] Firebase initialization notice: $e');
    }

    _isInitialized = true;
    debugPrint('[NotificationService] Initialized successfully.');
  }

  /// Syncs device FCM token with backend
  static Future<void> syncFcmToken() async {
    try {
      final fcmToken = await FirebaseMessaging.instance.getToken();
      if (fcmToken != null && fcmToken.isNotEmpty) {
        debugPrint('[FCM] Device Token: $fcmToken');
        await ApiService.registerFcmToken(fcmToken);
      }
    } catch (e) {
      debugPrint('[FCM] Error obtaining FCM token: $e');
    }
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
      importance: Importance.max,
      priority: Priority.high,
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
