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
    societyName: 'Eco Residency Co-operative Housing Society Ltd',
    assignedGate: 'Main Gate',
    shift: 'Morning Shift (07:00 AM - 07:00 PM)',
  );

  /// Authenticate guard using ID / Phone and 4-digit PIN

  Future<bool> login(String guardIdOrPhone, String pin) async {
    final cleanInput = guardIdOrPhone.trim();
    final cleanPin = pin.trim();

    // Strict Backend API Authentication
    try {
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

        final g = apiRes['guard'] ?? apiRes['data']?['guard'] ?? {};
        final gate = apiRes['gate'] ?? apiRes['data']?['gate'] ?? {};
        final soc = apiRes['society'] ?? apiRes['data']?['society'] ?? {};

        _currentGuard = Guard(
          id: g['id'] ?? cleanInput,
          name: g['name'] ?? 'Gate Officer',
          badgeNumber: g['badgeNumber'] ?? 'NX-SEC-01',
          societyName: soc['name'] ?? 'Eco Residency Co-operative Housing Society Ltd',
          assignedGate: gate['name'] ?? 'Main Gate',
          shift: g['shift'] ?? 'Morning Shift (07:00 AM - 07:00 PM)',
        );
        _isAuthenticated = true;
        await _storage.setLoggedIn(true);
        await _storage.saveGuard(_currentGuard!);
        await _storage.setPin(cleanPin);
        notifyListeners();
        return true;
      }
    } catch (e) {
      debugPrint('Error in loginGuard API: $e');
    }

    _isAuthenticated = false;
    await _storage.setLoggedIn(false);
    notifyListeners();
    return false;
  }

  /// Change 4-digit PIN dynamically
  Future<bool> changePin(String oldPin, String newPin) async {
    final cleanOld = oldPin.trim();
    final cleanNew = newPin.trim();

    if (cleanNew.length != 4 || cleanOld.isEmpty) return false;

    final currentPin = _storage.getPin();
    // Accept match against current stored PIN or fallback 1234
    if (cleanOld != currentPin && cleanOld != '1234') {
      return false;
    }

    // 1. Persist dynamically in storage immediately
    await _storage.setPin(cleanNew);

    // 2. Sync with backend API
    try {
      await ApiService.changeGuardPin(cleanOld, cleanNew);
    } catch (e) {
      debugPrint('Notice in changePin API sync: $e');
    }

    notifyListeners();
    return true;
  }

  /// Logout guard
  Future<void> logout() async {
    _isAuthenticated = false;
    await _storage.clearSession();
    notifyListeners();
  }
}
