import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import '../models/resident.dart';

enum CallState {
  idle,
  dialing,
  ringing,
  incoming,
  active,
  holding,
  disconnected,
  missed,
}

class CallerProfile {
  final String name;
  final String flat;
  final String phone;

  const CallerProfile({
    required this.name,
    required this.flat,
    required this.phone,
  });
}

class MissedCallInfo {
  final String number;
  final String residentName;
  final String flat;
  final DateTime timestamp;

  const MissedCallInfo({
    required this.number,
    required this.residentName,
    required this.flat,
    required this.timestamp,
  });
}

class CallStateData {
  final CallState state;
  final String number;
  final bool muted;
  final bool speaker;
  final int duration;
  final String direction; // 'incoming' | 'outgoing'
  final bool isIncoming;
  final String? residentName;
  final String? destinationFlat;

  const CallStateData({
    this.state = CallState.idle,
    this.number = '',
    this.muted = false,
    this.speaker = false,
    this.duration = 0,
    this.direction = 'outgoing',
    this.isIncoming = false,
    this.residentName,
    this.destinationFlat,
  });

  bool get isIdle => state == CallState.idle;
  bool get isDialing => state == CallState.dialing;
  bool get isRinging => state == CallState.ringing;
  bool get isIncomingCall => state == CallState.incoming || (isIncoming && state == CallState.ringing);
  bool get isActive => state == CallState.active;
  bool get isHolding => state == CallState.holding;
  bool get isDisconnected => state == CallState.disconnected;
  bool get isMissed => state == CallState.missed;
  bool get hasCall => state != CallState.idle && state != CallState.missed;

  factory CallStateData.fromMap(Map<dynamic, dynamic> map) {
    final stateStr = (map['state'] as String?)?.toLowerCase() ?? 'idle';
    final dir = (map['direction'] as String?)?.toLowerCase() ??
        ((map['isIncoming'] == true) ? 'incoming' : 'outgoing');
    final incomingFlag = (map['isIncoming'] == true) || (dir == 'incoming') || (stateStr == 'incoming');

    CallState state;
    switch (stateStr) {
      case 'incoming':
        state = CallState.incoming;
        break;
      case 'ringing':
        state = incomingFlag ? CallState.incoming : CallState.ringing;
        break;
      case 'dialing':
      case 'connecting':
        state = CallState.dialing;
        break;
      case 'active':
        state = CallState.active;
        break;
      case 'holding':
        state = CallState.holding;
        break;
      case 'missed':
        state = CallState.missed;
        break;
      case 'disconnected':
      case 'disconnecting':
        state = CallState.disconnected;
        break;
      default:
        state = CallState.idle;
    }

    final rawNumber = map['number'] as String? ?? '';
    final caller = CallService.instance.resolveCaller(rawNumber);

    return CallStateData(
      state: state,
      number: rawNumber,
      muted: map['muted'] as bool? ?? false,
      speaker: map['speaker'] as bool? ?? false,
      duration: (map['duration'] as num?)?.toInt() ?? 0,
      direction: dir,
      isIncoming: incomingFlag,
      residentName: caller?.name ?? (map['residentName'] as String?),
      destinationFlat: caller?.flat ?? (map['destinationFlat'] as String?),
    );
  }

  @override
  String toString() =>
      'CallStateData(state: ${state.name}, number: $number, dir: $direction, mute: $muted, speaker: $speaker, duration: ${duration}s)';
}

/// CallService - Flutter bridge service for NexGuard native InCallService calling spike.
/// Provides methods to check/request dialer role, place and control SIM calls,
/// manage incoming calls, ringtone silence, spam filter whitelist, and streams call state events.
class CallService extends ChangeNotifier {
  static const String _tag = '[NexCall]';
  static const MethodChannel _methodChannel = MethodChannel('nexguard/call');
  static const EventChannel _eventChannel = EventChannel('nexguard/call_events');

  static final CallService instance = CallService._internal();

  CallService._internal() {
    _initEventStream();
  }

  /// Double-push guard to prevent launching CallSpikeScreen multiple times
  bool isCallScreenOpen = false;

  /// Latest missed call notification for non-blocking UI banner
  final ValueNotifier<MissedCallInfo?> latestMissedCall = ValueNotifier<MissedCallInfo?>(null);
  final List<MissedCallInfo> recentMissedCalls = [];

  void clearMissedCallBanner() {
    latestMissedCall.value = null;
  }

  /// Resident directory lookup cache (last 10 digits -> Resident)
  final Map<String, Resident> _residentPhoneMap = {};

  static String normalizePhone(String raw) {
    final digits = raw.replaceAll(RegExp(r'\D'), '');
    if (digits.length > 10) {
      return digits.substring(digits.length - 10);
    }
    return digits;
  }

  CallerProfile? resolveCaller(String rawNumber) {
    final norm = normalizePhone(rawNumber);
    if (norm.isEmpty) return null;
    final res = _residentPhoneMap[norm];
    if (res != null) {
      final wingPrefix = res.buildingWing.isNotEmpty ? '${res.buildingWing} ' : '';
      return CallerProfile(
        name: res.name,
        flat: '$wingPrefix${res.flatNumber}',
        phone: res.phoneNumber,
      );
    }
    return null;
  }

  void updateResidentDirectory(List<Resident> residents) {
    _residentPhoneMap.clear();
    final whitelist = <String>[];
    for (final r in residents) {
      final norm = normalizePhone(r.phoneNumber);
      if (norm.isNotEmpty) {
        _residentPhoneMap[norm] = r;
        whitelist.add(norm);
      }
    }
    debugPrint('$_tag Updated resident directory cache: ${_residentPhoneMap.length} residents');
    if (whitelist.isNotEmpty) {
      setWhitelist(whitelist);
    }
  }

  CallStateData _currentState = const CallStateData();
  CallStateData get currentState => _currentState;

  StreamSubscription<dynamic>? _eventSubscription;
  final StreamController<CallStateData> _streamController =
      StreamController<CallStateData>.broadcast();
  Stream<CallStateData> get callStateStream => _streamController.stream;

  void _initEventStream() {
    try {
      _eventSubscription = _eventChannel.receiveBroadcastStream().listen(
        (dynamic event) {
          if (event is Map) {
            final oldState = _currentState;
            final newState = CallStateData.fromMap(event);
            debugPrint('$_tag [EventChannel Received] raw=$event -> parsedState=${newState.state.name}, isIncomingCall=${newState.isIncomingCall}, number=${newState.number}');

            if (newState.state == CallState.idle ||
                newState.state == CallState.disconnected ||
                newState.state == CallState.missed) {
              isCallScreenOpen = false;
            }

            final changed = _currentState.state != newState.state ||
                _currentState.number != newState.number ||
                _currentState.muted != newState.muted ||
                _currentState.speaker != newState.speaker ||
                _currentState.duration != newState.duration ||
                _currentState.direction != newState.direction;

            if (changed) {
              debugPrint('$_tag State update: ${newState.state.name}, number: ${newState.number}, dir: ${newState.direction}, duration: ${newState.duration}s, mute: ${newState.muted}, speaker: ${newState.speaker}');
              _currentState = newState;

              // Check for missed incoming call
              if (newState.state == CallState.missed ||
                  (oldState.isIncomingCall && newState.state == CallState.disconnected && oldState.duration == 0)) {
                _recordMissedCall(oldState.number.isNotEmpty ? oldState.number : newState.number);
              }

              _streamController.add(newState);
              notifyListeners();
            }
          }
        },
        onError: (dynamic error) {
          debugPrint('$_tag EventChannel error: $error');
        },
      );
    } catch (e) {
      debugPrint('$_tag Failed to initialize EventChannel: $e');
    }
  }

  void _recordMissedCall(String rawNumber) {
    final caller = resolveCaller(rawNumber);
    final missed = MissedCallInfo(
      number: rawNumber,
      residentName: caller?.name ?? 'Unknown Caller',
      flat: caller?.flat ?? '',
      timestamp: DateTime.now(),
    );
    recentMissedCalls.insert(0, missed);
    if (recentMissedCalls.length > 20) {
      recentMissedCalls.removeLast();
    }
    latestMissedCall.value = missed;
    debugPrint('$_tag Recorded Missed Call from ${missed.residentName} (${missed.number})');
  }

  Future<bool> isDefaultDialer() async {
    try {
      final res = await _methodChannel.invokeMethod<bool>('isDefaultDialer');
      final isDefault = res ?? false;
      debugPrint('$_tag isDefaultDialer check: $isDefault');
      return isDefault;
    } on PlatformException catch (e) {
      debugPrint('$_tag isDefaultDialer PlatformException: ${e.message}');
      return false;
    } catch (e) {
      debugPrint('$_tag isDefaultDialer error: $e');
      return false;
    }
  }

  Future<bool> requestDialerRole() async {
    try {
      debugPrint('$_tag Requesting dialer role from system...');
      final res = await _methodChannel.invokeMethod<bool>('requestDialerRole');
      final launched = res ?? false;
      debugPrint('$_tag requestDialerRole intent launch result: $launched');
      return launched;
    } on PlatformException catch (e) {
      debugPrint('$_tag requestDialerRole PlatformException: ${e.message}');
      return false;
    } catch (e) {
      debugPrint('$_tag requestDialerRole error: $e');
      return false;
    }
  }

  Future<bool> placeCall(String number) async {
    final clean = number.trim();
    if (clean.isEmpty) {
      debugPrint('$_tag placeCall rejected: empty number');
      return false;
    }
    try {
      debugPrint('$_tag Initiating native placeCall for $clean');
      final res = await _methodChannel.invokeMethod<bool>('placeCall', {'number': clean});
      final success = res ?? false;
      debugPrint('$_tag placeCall invocation result: $success');
      return success;
    } on PlatformException catch (e) {
      debugPrint('$_tag placeCall PlatformException: ${e.message}');
      return false;
    } catch (e) {
      debugPrint('$_tag placeCall error: $e');
      return false;
    }
  }

  Future<bool> answer() async {
    try {
      debugPrint('$_tag InCall action: answer()');
      final res = await _methodChannel.invokeMethod<bool>('answer');
      return res ?? false;
    } on PlatformException catch (e) {
      debugPrint('$_tag answer PlatformException: ${e.message}');
      return false;
    } catch (e) {
      debugPrint('$_tag answer error: $e');
      return false;
    }
  }

  Future<bool> reject() async {
    try {
      debugPrint('$_tag InCall action: reject()');
      final res = await _methodChannel.invokeMethod<bool>('reject');
      return res ?? false;
    } on PlatformException catch (e) {
      debugPrint('$_tag reject PlatformException: ${e.message}');
      return false;
    } catch (e) {
      debugPrint('$_tag reject error: $e');
      return false;
    }
  }

  Future<bool> hangup() async {
    try {
      debugPrint('$_tag InCall action: hangup()');
      final res = await _methodChannel.invokeMethod<bool>('hangup');
      return res ?? false;
    } on PlatformException catch (e) {
      debugPrint('$_tag hangup PlatformException: ${e.message}');
      return false;
    } catch (e) {
      debugPrint('$_tag hangup error: $e');
      return false;
    }
  }

  Future<bool> silenceRinger() async {
    try {
      debugPrint('$_tag InCall action: silenceRinger()');
      final res = await _methodChannel.invokeMethod<bool>('silenceRinger');
      return res ?? false;
    } on PlatformException catch (e) {
      debugPrint('$_tag silenceRinger PlatformException: ${e.message}');
      return false;
    } catch (e) {
      debugPrint('$_tag silenceRinger error: $e');
      return false;
    }
  }

  Future<bool> setMute(bool muted) async {
    try {
      debugPrint('$_tag InCall action: setMute($muted)');
      final res = await _methodChannel.invokeMethod<bool>('setMute', {'muted': muted});
      return res ?? false;
    } on PlatformException catch (e) {
      debugPrint('$_tag setMute PlatformException: ${e.message}');
      return false;
    } catch (e) {
      debugPrint('$_tag setMute error: $e');
      return false;
    }
  }

  Future<bool> setSpeaker(bool speaker) async {
    try {
      debugPrint('$_tag InCall action: setSpeaker($speaker)');
      final res = await _methodChannel.invokeMethod<bool>('setSpeaker', {'speaker': speaker});
      return res ?? false;
    } on PlatformException catch (e) {
      debugPrint('$_tag setSpeaker PlatformException: ${e.message}');
      return false;
    } catch (e) {
      debugPrint('$_tag setSpeaker error: $e');
      return false;
    }
  }

  /// Synchronously or immediately fetches the active/ringing call state on startup (cold-start support)
  Future<CallStateData> getCurrentCallState() async {
    try {
      final res = await _methodChannel.invokeMethod<dynamic>('getCurrentCallState');
      if (res is Map) {
        _currentState = CallStateData.fromMap(res);
        notifyListeners();
      }
    } catch (e) {
      debugPrint('$_tag getCurrentCallState error: $e');
    }
    return _currentState;
  }

  Future<CallStateData> fetchCallState() => getCurrentCallState();

  Future<bool> setWhitelist(List<String> numbers) async {
    try {
      final res = await _methodChannel.invokeMethod<bool>('setWhitelist', {'numbers': numbers});
      return res ?? false;
    } catch (e) {
      debugPrint('$_tag setWhitelist error: $e');
      return false;
    }
  }

  Future<bool> setAllowOnlyKnownNumbers(bool enabled) async {
    try {
      final res = await _methodChannel.invokeMethod<bool>('setAllowOnlyKnownNumbers', {'enabled': enabled});
      return res ?? false;
    } catch (e) {
      debugPrint('$_tag setAllowOnlyKnownNumbers error: $e');
      return false;
    }
  }

  Future<bool> canUseFullScreenIntent() async {
    try {
      final res = await _methodChannel.invokeMethod<bool>('canUseFullScreenIntent');
      return res ?? true;
    } catch (e) {
      return true;
    }
  }

  @override
  void dispose() {
    _eventSubscription?.cancel();
    _streamController.close();
    latestMissedCall.dispose();
    super.dispose();
  }
}
