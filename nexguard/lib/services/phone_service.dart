import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_phone_direct_caller/flutter_phone_direct_caller.dart';
import 'package:url_launcher/url_launcher.dart';
import 'call_service.dart';
import '../features/call_spike/call_spike_screen.dart';

class PhoneService {
  static Future<void> call(
    String rawPhone, {
    BuildContext? context,
    String? contactName,
  }) async {
    final cleanPhone = rawPhone.replaceAll(RegExp(r'[^\d+]'), '');
    if (cleanPhone.isEmpty) return;

    // 0. Screen-Pinning safe In-App Dialer check
    if (context != null && context.mounted) {
      try {
        final isDefault = await CallService.instance.isDefaultDialer();
        if (!context.mounted) return;
        if (isDefault) {
          await Navigator.of(context).push(
            MaterialPageRoute(
              builder: (_) => CallSpikeScreen(
                initialNumber: cleanPhone,
                contactName: contactName,
                autoCall: true,
              ),
            ),
          );
          return;
        } else {
          // If not yet default dialer, open dialer so guard can tap 'Set as Default Phone App'
          await Navigator.of(context).push(
            MaterialPageRoute(
              builder: (_) => CallSpikeScreen(
                initialNumber: cleanPhone,
                contactName: contactName,
                autoCall: false,
              ),
            ),
          );
          return;
        }
      } catch (e) {
        debugPrint('In-app call check error: $e');
      }
    }

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

