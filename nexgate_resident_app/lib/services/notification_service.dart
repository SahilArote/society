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

  /// Pending request ID from terminated launch
  static String? _pendingInitialRequestId;
  static void Function(String? payload)? _onNotificationTapped;

  /// Callback when user taps a notification
  static void Function(String? payload)? get onNotificationTapped => _onNotificationTapped;
  static set onNotificationTapped(void Function(String? payload)? callback) {
    _onNotificationTapped = callback;
    if (_onNotificationTapped != null && _pendingInitialRequestId != null) {
      final reqId = _pendingInitialRequestId;
      _pendingInitialRequestId = null;
      debugPrint('[NotificationService] Delivering buffered initial notification requestId: $reqId');
      _onNotificationTapped!(reqId);
    }
  }

  /// Initialize notification channels, FCM and platform settings
  static Future<void> initialize({void Function(String? payload)? onTapped}) async {
    if (_isInitialized) return;

    if (onTapped != null) {
      onNotificationTapped = onTapped;
    }

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

    // Explicitly create notification channels with Max Importance for Android OS
    final androidImplementation = _notificationsPlugin
        .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>();

    await androidImplementation?.createNotificationChannel(
      const AndroidNotificationChannel(
        'nexgate_general_alerts',
        'General Notifications',
        description: 'Updates on visitor entries, approvals, and announcements',
        importance: Importance.max,
        playSound: true,
        enableVibration: true,
      ),
    );

    await androidImplementation?.createNotificationChannel(
      const AndroidNotificationChannel(
        'nexgate_visitor_alerts',
        'Gate Visitor Alerts',
        description: 'Instant alerts when a visitor or delivery arrives at the gate',
        importance: Importance.max,
        playSound: true,
        enableVibration: true,
      ),
    );

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
        if (requestId != null) {
          if (onNotificationTapped != null) {
            onNotificationTapped!(requestId);
          } else {
            _pendingInitialRequestId = requestId;
          }
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

  /// Show high-priority visitor gate alert notification (Heads-Up)
  static Future<void> showVisitorAlert({
    required String visitorName,
    required String flatNumber,
    required String gateName,
    String? requestId,
  }) async {
    const androidDetails = AndroidNotificationDetails(
      'nexgate_general_alerts',
      'General Notifications',
      channelDescription: 'Updates on entry approvals, registrations, and announcements',
      importance: Importance.max,
      priority: Priority.high,
      playSound: true,
      enableVibration: true,
      icon: '@mipmap/ic_launcher',
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

    final notificationId = (requestId != null
            ? requestId.hashCode
            : DateTime.now().millisecondsSinceEpoch ~/ 1000)
        .abs();

    await _notificationsPlugin.show(
      id: notificationId,
      title: '🚨 New Visitor Request',
      body: '$visitorName is waiting at $gateName for Flat $flatNumber. Tap to view and respond.',
      notificationDetails: notificationDetails,
      payload: requestId,
    );

    debugPrint('[NotificationService] Dispatched heads-up visitor alert for $visitorName');
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
      icon: '@mipmap/ic_launcher',
    );

    const notificationDetails = NotificationDetails(
      android: androidDetails,
      iOS: DarwinNotificationDetails(
        presentAlert: true,
        presentBadge: true,
        presentSound: true,
      ),
    );

    final notificationId = (payload != null
            ? payload.hashCode
            : DateTime.now().millisecondsSinceEpoch ~/ 1000)
        .abs();

    await _notificationsPlugin.show(
      id: notificationId,
      title: title,
      body: body,
      notificationDetails: notificationDetails,
      payload: payload,
    );
  }
}
