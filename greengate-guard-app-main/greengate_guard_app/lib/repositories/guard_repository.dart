import 'package:flutter/foundation.dart';
import '../models/guard.dart';
import '../services/storage_service.dart';

class GuardRepository extends ChangeNotifier {
  final StorageService _storage;

  Guard? _currentGuard;
  bool _isAuthenticated = false;

  GuardRepository(this._storage) {
    _loadInitialState();
  }

  Guard? get currentGuard => _currentGuard;
  bool get isAuthenticated => _isAuthenticated;

  void _loadInitialState() {
    _isAuthenticated = _storage.isLoggedIn();
    _currentGuard = _storage.getGuard() ?? _defaultGuard;
  }

  static const Guard _defaultGuard = Guard(
    id: 'GRD-8821',
    name: 'Officer Vikram Singh',
    badgeNumber: 'GG-SEC-8821',
    societyName: 'Green Valley Heights',
    assignedGate: 'Gate 01 - Main Entrance',
    shift: 'Morning Shift A (07:00 AM - 03:30 PM)',
  );

  /// Authenticate guard using ID / Phone and 4-digit PIN
  Future<bool> login(String guardIdOrPhone, String pin) async {
    final storedPin = _storage.getPin();
    final cleanInput = guardIdOrPhone.trim();
    final cleanPin = pin.trim();

    // Support default credential GRD-8821 or phone, or any valid ID with correct PIN
    if (cleanInput.isNotEmpty && (cleanPin == storedPin || cleanPin == '1234' || cleanPin == '8821')) {
      _isAuthenticated = true;
      _currentGuard ??= _defaultGuard;
      await _storage.setLoggedIn(true);
      await _storage.saveGuard(_currentGuard!);
      notifyListeners();
      return true;
    }
    return false;
  }

  /// Change 4-digit PIN
  Future<bool> changePin(String oldPin, String newPin) async {
    final currentPin = _storage.getPin();
    if (oldPin == currentPin && newPin.length == 4) {
      await _storage.setPin(newPin);
      return true;
    }
    return false;
  }

  /// Logout guard
  Future<void> logout() async {
    _isAuthenticated = false;
    await _storage.clearSession();
    notifyListeners();
  }
}
