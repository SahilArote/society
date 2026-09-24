import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;
import '../core/constants/api_endpoints.dart';
import '../models/visitor_model.dart';
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
          .enableAutoConnect()
          .enableReconnection()
          .setReconnectionAttempts(10)
          .setReconnectionDelay(1500)
          .build(),
    );

    _socket!.onConnect((_) {
      debugPrint('[SocketService] Connected successfully: ${_socket?.id}');
      final user = StorageService.getUser();
      if (user != null) {
        _socket?.emit('join', {
          'role': 'RESIDENT',
          'residentId': user.id,
          'societyId': user.societyId,
        });
      }
    });

    _socket!.onDisconnect((reason) {
      debugPrint('[SocketService] Disconnected: $reason');
    });

    _socket!.onConnectError((err) {
      debugPrint('[SocketService] Connection error: $err');
    });

    // Inbound: Gate Guard creates a new visitor request
    _socket!.on('visitor:request_created', (data) {
      debugPrint('[SocketService] Received visitor:request_created: $data');
      if (data is Map<String, dynamic>) {
        try {
          final model = VisitorModel.fromJson(data);
          _visitorCreatedController.add(model);
        } catch (e) {
          debugPrint('[SocketService] Parsing error on visitor created: $e');
        }
      }
    });

    // Inbound: Request updated (approved, rejected, entered, exited)
    _socket!.on('visitor:request_updated', (data) {
      debugPrint('[SocketService] Received visitor:request_updated: $data');
      if (data is Map<String, dynamic>) {
        _visitorUpdatedController.add(data);
      }
    });

    // Inbound: Resident registration approved or rejected by admin
    _socket!.on('resident:registration_updated', (data) {
      debugPrint('[SocketService] Received resident:registration_updated: $data');
      if (data is Map<String, dynamic>) {
        _registrationUpdatedController.add(data);
      }
    });
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
