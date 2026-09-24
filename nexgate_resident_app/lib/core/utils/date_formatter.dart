import 'package:intl/intl.dart';

/// Date and time formatting helpers for NexGate mobile app.
class DateFormatter {
  DateFormatter._();

  static final DateFormat _timeFormat = DateFormat('hh:mm a');
  static final DateFormat _dateFormat = DateFormat('dd MMM yyyy');
  static final DateFormat _dateTimeFormat = DateFormat('dd MMM, hh:mm a');

  static String formatTime(DateTime? date) {
    if (date == null) return '';
    return _timeFormat.format(date.toLocal());
  }

  static String formatDate(DateTime? date) {
    if (date == null) return '';
    return _dateFormat.format(date.toLocal());
  }

  static String formatDateTime(DateTime? date) {
    if (date == null) return '';
    return _dateTimeFormat.format(date.toLocal());
  }

  static String formatRelative(DateTime? date) {
    if (date == null) return '';
    final now = DateTime.now();
    final difference = now.difference(date);

    if (difference.inSeconds < 45) {
      return 'Just now';
    } else if (difference.inMinutes < 60) {
      final mins = difference.inMinutes;
      return '${mins}m ago';
    } else if (difference.inHours < 24) {
      final hours = difference.inHours;
      return '${hours}h ago';
    } else if (difference.inDays == 1) {
      return 'Yesterday';
    } else if (difference.inDays < 7) {
      return '${difference.inDays}d ago';
    } else {
      return _dateFormat.format(date);
    }
  }
}
