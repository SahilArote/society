import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:flutter_phone_direct_caller/flutter_phone_direct_caller.dart';
import 'package:url_launcher/url_launcher.dart';

class PhoneService {
  static Future<void> call(String rawPhone) async {
    final cleanPhone = rawPhone.replaceAll(RegExp(r'[^\d+]'), '');
    if (cleanPhone.isEmpty) return;

    try {
      // 1. Direct cellular SIM call (Bypasses system dialer keypad)
      final directSuccess = await FlutterPhoneDirectCaller.callNumber(cleanPhone);
      if (directSuccess == true) {
        return;
      }
    } catch (e) {
      debugPrint('Direct call exception: $e');
    }

    // 2. Fallback: url_launcher tel scheme
    try {
      final uri = Uri.parse('tel:$cleanPhone');
      final launched = await launchUrl(uri, mode: LaunchMode.externalApplication);
      if (!launched) {
        await launchUrl(uri);
      }
    } catch (e) {
      // 3. Fallback: Copy to clipboard
      await Clipboard.setData(ClipboardData(text: cleanPhone));
    }
  }
}

