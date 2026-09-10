import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

class KioskHelper {
  static const MethodChannel _channel = MethodChannel('com.greengate.guard/kiosk');

  /// Starts Android Lock Task mode (Kiosk pinning)
  static Future<bool> startLockTask() async {
    if (kIsWeb) return false;
    try {
      final bool? result = await _channel.invokeMethod<bool>('startLockTask');
      return result ?? false;
    } catch (e) {
      debugPrint('KioskHelper: Lock task start not available on this platform ($e)');
      return false;
    }
  }

  /// Stops Android Lock Task mode
  static Future<bool> stopLockTask() async {
    if (kIsWeb) return false;
    try {
      final bool? result = await _channel.invokeMethod<bool>('stopLockTask');
      return result ?? false;
    } catch (e) {
      debugPrint('KioskHelper: Lock task stop not available ($e)');
      return false;
    }
  }

  /// Checks whether kiosk mode is currently active
  static Future<bool> isKioskActive() async {
    if (kIsWeb) return false;
    try {
      final bool? result = await _channel.invokeMethod<bool>('isKioskActive');
      return result ?? false;
    } catch (e) {
      return false;
    }
  }
}
