import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;
import '../core/constants/api_endpoints.dart';
import '../models/visitor_model.dart';
import 'notification_service.dart';
import 'storage_service.dart';

/// Real-time WebSocket connection manager for NexGate Resident Mobile App.
class SocketService {
  SocketService._();

  static io.Socket? _socket;
  static bool get isConnected => _socket?.connected ?? false;

  // Stream Controllers for Live Events
  static final _visitorCreatedController = StreamController<VisitorModel>.broadcast();
  static final _visitorUpdatedController = StreamController<Map<String, dynamic>>.broadcast();
  static final _registrationUpdatedController = StreamController<Map<String, dynamic>>.broadcast();

  static Stream<VisitorModel> get onVisitorCreated => _visitorCreatedController.stream;
  static Stream<Map<String, dynamic>> get onVisitorUpdated => _visitorUpdatedController.stream;
  static Stream<Map<String, dynamic>> get onRegistrationUpdated => _registrationUpdatedController.stream;

  /// Initializes authenticated Socket.IO connection.
  static void connect() {
    final token = StorageService.getToken();
    if (token == null || token.isEmpty) {
      debugPrint('[SocketService] Cannot connect: No JWT token found.');
      return;
    }

    if (_socket != null && _socket!.connected) {
      debugPrint('[SocketService] Already connected.');
      return;
    }

    disconnect();

    debugPrint('[SocketService] Connecting to ${ApiEndpoints.socketUrl}...');

    _socket = io.io(
      ApiEndpoints.socketUrl,
      io.OptionBuilder()
          .setTransports(['websocket', 'polling'])
          .setAuth({'token': token})
          .setExtraHeaders({'Authorization': 'Bearer $token'})
          .setQuery({'token': token})
          .enableAutoConnect()
          .enableReconnection()
          .setReconnectionAttempts(20)
          .setReconnectionDelay(1000)
          .build(),
    );

    _socket!.connect();

    _socket!.onConnect((_) {
      debugPrint('[SOCKET] Connected');
      debugPrint('[SOCKET] Authenticated');
      final user = StorageService.getUser();
      if (user != null) {
        debugPrint('[SOCKET] Joined resident room: resident:${user.id}');
        _socket?.emit('join', {
          'role': 'RESIDENT',
          'residentId': user.id,
          'societyId': user.societyId,
        });
      }
      debugPrint('[SOCKET] Listening visitor:request_created');
    });

    _socket!.onDisconnect((reason) {
      debugPrint('[SOCKET] Disconnected: $reason');
    });

    _socket!.onConnectError((err) {
      debugPrint('[SOCKET] Connection error: $err');
    });

    _socket!.on('reconnect', (attempt) {
      debugPrint('[SOCKET] Reconnected successfully on attempt: $attempt');
      final user = StorageService.getUser();
      if (user != null) {
        _socket?.emit('join', {
          'role': 'RESIDENT',
          'residentId': user.id,
          'societyId': user.societyId,
        });
      }
    });

    // Inbound: Gate Guard creates a new visitor request -> Trigger System Notification Alert
    _socket!.on('visitor:request_created', (data) {
      debugPrint('[SOCKET] visitor:request_created RECEIVED: $data');
      if (data is Map) {
        try {
          final map = Map<String, dynamic>.from(data);
          final model = VisitorModel.fromJson(map);
          debugPrint('[SOCKET] Request ID: ${model.id}');
          _visitorCreatedController.add(model);

          // Show heads-up push alert with vibration & sound
          NotificationService.showVisitorAlert(
            visitorName: model.name,
            flatNumber: model.flatNumber,
            gateName: model.gate,
            requestId: model.id,
          );
        } catch (e) {
          debugPrint('[SOCKET] Parsing error on visitor created: $e');
        }
      }
    });

    // Inbound: Request updated (approved, rejected, entered, exited)
    _socket!.on('visitor:request_updated', (data) {
      debugPrint('[SOCKET] visitor:request_updated: $data');
      if (data is Map) {
        final map = Map<String, dynamic>.from(data);
        _visitorUpdatedController.add(map);
        final status = map['status'] ?? '';
        final visitorName = map['visitorName'] ?? map['visitor']?['name'] ?? 'Visitor';
        if (status.isNotEmpty) {
          NotificationService.showGeneralNotification(
            title: 'Gate Pass Status',
            body: '$visitorName has been marked as $status.',
            payload: map['requestId'],
          );
        }
      }
    });

    // Inbound: Resident registration approved or rejected by admin
    _socket!.on('resident:registration_updated', (data) {
      debugPrint('[SOCKET] resident:registration_updated: $data');
      if (data is Map) {
        final map = Map<String, dynamic>.from(data);
        _registrationUpdatedController.add(map);
        final status = map['status'] ?? 'Updated';
        NotificationService.showGeneralNotification(
          title: 'Flat Registration Update',
          body: 'Your apartment registration status is now: $status.',
        );
      }
    });
  }

  /// Checks if socket is connected and reconnects if needed
  static void reconnectIfNeeded() {
    if (_socket == null || !_socket!.connected) {
      debugPrint('[SOCKET] Inactive or disconnected, reconnecting...');
      connect();
    } else {
      debugPrint('[SOCKET] Socket is active (${_socket?.id})');
    }
  }

  /// Listen for registration room when tracking an unapproved registration
  static void joinRegistrationRoom(String registrationId) {
    if (_socket != null && _socket!.connected) {
      _socket?.emit('join_registration', registrationId);
    }
  }

  /// Disconnects socket cleanly.
  static void disconnect() {
    if (_socket != null) {
      _socket!.disconnect();
      _socket!.dispose();
      _socket = null;
    }
  }
}
