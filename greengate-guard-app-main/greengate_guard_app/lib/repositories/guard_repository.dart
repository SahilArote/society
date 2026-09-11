import 'package:flutter/foundation.dart';
import '../models/guard.dart';
import '../services/storage_service.dart';
import '../services/api_service.dart';

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
    final token = _storage.getToken();
    if (token != null) {
      ApiService.setAuthToken(token);
    }
  }

  static const Guard _defaultGuard = Guard(
    id: 'GRD-8821',
    name: 'Officer Vikram Singh',
    badgeNumber: 'GG-SEC-8821',
    societyName: 'GreenGate Heights',
    assignedGate: 'Gate 01 - Main Entrance',
    shift: 'Morning Shift A (07:00 AM - 03:30 PM)',
  );

  /// Authenticate guard using ID / Phone and 4-digit PIN against backend
  Future<bool> login(String guardIdOrPhone, String pin) async {
    final cleanInput = guardIdOrPhone.trim();
    final cleanPin = pin.trim();

    if (cleanInput.isEmpty || cleanPin.isEmpty) return false;

    // 1. Attempt Real Backend API Authentication
    final apiData = await ApiService.login(
      guardIdOrPhone: cleanInput,
      pin: cleanPin,
    );

    if (apiData != null && apiData['token'] != null) {
      final userJson = apiData['user'] ?? {};
      final guardJson = userJson['guard'] ?? {};

      final guard = Guard(
        id: userJson['id'] ?? cleanInput,
        name: userJson['name'] ?? 'Officer Ramesh Singh',
        badgeNumber: guardJson['badgeNumber'] ?? 'GG-SEC-8821',
        societyName: userJson['societyName'] ?? 'GreenGate Heights',
        assignedGate: (guardJson['gateId'] == 'gate_back') ? 'Gate 02 - Back Entrance' : 'Gate 01 - Main Entrance',
        shift: guardJson['shift'] != null ? '${guardJson['shift']} shift' : 'Morning Shift A (07:00 AM - 03:30 PM)',
      );

      _isAuthenticated = true;
      _currentGuard = guard;
      await _storage.setToken(apiData['token']);
      await _storage.setLoggedIn(true);
      await _storage.saveGuard(guard);
      notifyListeners();
      return true;
    }

    // 2. Local Fallback for Offline / Demo Testing
    final storedPin = _storage.getPin();
    if (cleanPin == storedPin || cleanPin == '1234' || cleanPin == '8821') {
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
