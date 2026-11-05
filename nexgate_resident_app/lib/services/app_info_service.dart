import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

/// Service to fetch runtime app version and build number.
class AppInfoService {
  AppInfoService._();

  static const MethodChannel _channel = MethodChannel('com.nexgate.resident/phone');
  static String? _cachedVersionString;

  /// Returns formatted version string, e.g. "v1.1.0 (Build 2)"
  static Future<String> getAppVersionString() async {
    if (_cachedVersionString != null) {
      return _cachedVersionString!;
    }

    try {
      final res = await _channel.invokeMethod<Map>('getAppVersion');
      if (res != null) {
        final version = res['version']?.toString() ?? '1.1.0';
        final buildNumber = res['buildNumber']?.toString() ?? '2';
        _cachedVersionString = 'v$version (Build $buildNumber)';
        return _cachedVersionString!;
      }
    } catch (e) {
      debugPrint('[AppInfoService] Could not retrieve platform version: $e');
    }

    // Default fallback matching pubspec.yaml
    _cachedVersionString = 'v1.1.0 (Build 2)';
    return _cachedVersionString!;
  }
}

