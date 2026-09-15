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
  StorageService get storage => _storage;


  void _loadInitialState() {
    _isAuthenticated = _storage.isLoggedIn();
    _currentGuard = _storage.getGuard() ?? _defaultGuard;
    final token = _storage.getToken();
    if (token != null) {
      ApiService.setAuthToken(token);
    }
  }

  static const Guard _defaultGuard = Guard(
    id: 'guard_ramesh',
    name: 'Ramesh Singh',
    badgeNumber: 'NX-SEC-01',
    societyName: 'NexGate Residency',
    assignedGate: 'Main Gate',
    shift: 'Morning Shift (07:00 AM - 07:00 PM)',
  );

  /// Authenticate guard using ID / Phone and 4-digit PIN

  Future<bool> login(String guardIdOrPhone, String pin) async {
    final cleanInput = guardIdOrPhone.trim();
    final cleanPin = pin.trim();

    // 1. Try Backend API Authentication First
    final apiRes = await ApiService.loginGuard(
      guardIdOrPhone: cleanInput,
      pin: cleanPin,
    );

    if (apiRes != null && apiRes['success'] == true) {
      final token = apiRes['token'] ?? apiRes['data']?['token'];
      if (token != null) {
        await _storage.saveToken(token);
        ApiService.setAuthToken(token);
      }

      final g = apiRes['guard'] ?? {};
      final gate = apiRes['gate'] ?? {};
      final soc = apiRes['society'] ?? {};

      _currentGuard = Guard(
        id: g['id'] ?? cleanInput,
        name: g['name'] ?? 'Ramesh Singh',
        badgeNumber: 'NX-SEC-01',
        societyName: soc['name'] ?? 'NexGate Residency',
        assignedGate: gate['name'] ?? 'Main Gate',
        shift: g['shift'] ?? 'Morning Shift (07:00 AM - 07:00 PM)',
      );
      _isAuthenticated = true;
      await _storage.setLoggedIn(true);
      await _storage.saveGuard(_currentGuard!);
      notifyListeners();
      return true;
    }

    // Strict verification: If not authenticated by database API, reject!
    _isAuthenticated = false;
    await _storage.setLoggedIn(false);
    notifyListeners();
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
