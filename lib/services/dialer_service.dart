import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

/// Service to interact with native platform phone dialer.
class DialerService {
  DialerService._();

  static const MethodChannel _channel =
      MethodChannel('com.nexgate.resident/phone');

  /// Opens the native Android/iOS phone dialer with the phone number pre-filled.
  static Future<bool> openDialer(String? phoneNumber,
      {BuildContext? context}) async {
    if (phoneNumber == null || phoneNumber.trim().isEmpty) {
      if (context != null && context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Visitor phone number is not available'),
            backgroundColor: Color(0xFFEF4444),
            duration: Duration(seconds: 2),
          ),
        );
      }
      return false;
    }

    final cleanPhone = phoneNumber.replaceAll(RegExp(r'[^\d+]'), '');

    try {
      final bool? success = await _channel.invokeMethod<bool>('openDialer', {
        'phoneNumber': cleanPhone,
      });
      return success ?? true;
    } on PlatformException catch (e) {
      debugPrint('[DialerService] Platform exception: ${e.message}');
      if (context != null && context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Could not open dialer: ${e.message}'),
            backgroundColor: const Color(0xFFEF4444),
          ),
        );
      }
      return false;
    } catch (e) {
      debugPrint('[DialerService] Error: $e');
      return false;
    }
  }
}

