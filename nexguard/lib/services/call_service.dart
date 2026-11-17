import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

enum CallState {
  idle,
  dialing,
  ringing,
  active,
  holding,
  disconnected,
}

class CallStateData {
  final CallState state;
  final String number;
  final bool muted;
  final bool speaker;
  final int duration;

  const CallStateData({
    this.state = CallState.idle,
    this.number = '',
    this.muted = false,
    this.speaker = false,
    this.duration = 0,
  });

  bool get isIdle => state == CallState.idle;
  bool get isDialing => state == CallState.dialing;
  bool get isRinging => state == CallState.ringing;
  bool get isActive => state == CallState.active;
  bool get isHolding => state == CallState.holding;
  bool get isDisconnected => state == CallState.disconnected;
  bool get hasCall => state != CallState.idle;

  factory CallStateData.fromMap(Map<dynamic, dynamic> map) {
    final stateStr = (map['state'] as String?)?.toLowerCase() ?? 'idle';
    CallState state;
    switch (stateStr) {
      case 'dialing':
      case 'connecting':
        state = CallState.dialing;
        break;
      case 'ringing':
        state = CallState.ringing;
        break;
      case 'active':
        state = CallState.active;
        break;
      case 'holding':
        state = CallState.holding;
        break;
      case 'disconnected':
      case 'disconnecting':
        state = CallState.disconnected;
        break;
      default:
        state = CallState.idle;
    }

    return CallStateData(
      state: state,
      number: map['number'] as String? ?? '',
      muted: map['muted'] as bool? ?? false,
      speaker: map['speaker'] as bool? ?? false,
      duration: (map['duration'] as num?)?.toInt() ?? 0,
    );
  }

  @override
  String toString() =>
      'CallStateData(state: ${state.name}, number: $number, muted: $muted, speaker: $speaker, duration: ${duration}s)';
}

/// CallService - Flutter bridge service for NexGuard native InCallService calling spike.
/// Provides methods to check/request dialer role, place and control SIM calls,
/// and streams call state events with detailed '[NexCall]' logs.
class CallService extends ChangeNotifier {
  static const String _tag = '[NexCall]';
  static const MethodChannel _methodChannel = MethodChannel('nexguard/call');
  static const EventChannel _eventChannel = EventChannel('nexguard/call_events');

  static final CallService instance = CallService._internal();

  CallService._internal() {
    _initEventStream();
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
            final newState = CallStateData.fromMap(event);
            final changed = _currentState.state != newState.state ||
                _currentState.number != newState.number ||
                _currentState.muted != newState.muted ||
                _currentState.speaker != newState.speaker ||
                _currentState.duration != newState.duration;

            if (changed) {
              debugPrint('$_tag State update: ${newState.state.name}, number: ${newState.number}, duration: ${newState.duration}s, mute: ${newState.muted}, speaker: ${newState.speaker}');
              _currentState = newState;
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

  Future<CallStateData> fetchCallState() async {
    try {
      final res = await _methodChannel.invokeMethod<dynamic>('getCallState');
      if (res is Map) {
        _currentState = CallStateData.fromMap(res);
        notifyListeners();
      }
    } catch (e) {
      debugPrint('$_tag fetchCallState error: $e');
    }
    return _currentState;
  }

  @override
  void dispose() {
    _eventSubscription?.cancel();
    _streamController.close();
    super.dispose();
  }
}

