import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/guard.dart';
import '../models/visitor_request.dart';

class StorageService {
  static const String _keyIsLoggedIn = 'guard_is_logged_in';
  static const String _keyGuardData = 'guard_data';
  static const String _keyGuardPin = 'guard_pin';
  static const String _keyVisitorRequests = 'visitor_requests';
  static const String _keyServerUrl = 'server_base_url';
  static const String _keyAuthToken = 'guard_auth_token';

  final SharedPreferences _prefs;

  StorageService(this._prefs);

  static Future<StorageService> init() async {
    final prefs = await SharedPreferences.getInstance();
    return StorageService(prefs);
  }

  Future<void> saveToken(String token) async {
    await _prefs.setString(_keyAuthToken, token);
  }

  String? getToken() {
    return _prefs.getString(_keyAuthToken);
  }

  String getServerUrl() {
    var url = _prefs.getString(_keyServerUrl) ?? 'https://society-d521.onrender.com/api';
    var clean = url.trim();
    while (clean.endsWith('/')) {
      clean = clean.substring(0, clean.length - 1);
    }
    if (clean.isNotEmpty && !clean.endsWith('/api')) {
      clean = '$clean/api';
    }
    return clean.isNotEmpty ? clean : 'https://society-d521.onrender.com/api';
  }

  Future<void> setServerUrl(String url) async {
    await _prefs.setString(_keyServerUrl, url.trim());
  }


  bool isLoggedIn() {
    return _prefs.getBool(_keyIsLoggedIn) ?? false;
  }

  Future<void> setLoggedIn(bool value) async {
    await _prefs.setBool(_keyIsLoggedIn, value);
  }

  Future<void> saveGuard(Guard guard) async {
    await _prefs.setString(_keyGuardData, jsonEncode(guard.toJson()));
  }

  Guard? getGuard() {
    final raw = _prefs.getString(_keyGuardData);
    if (raw == null) return null;
    try {
      return Guard.fromJson(jsonDecode(raw) as Map<String, dynamic>);
    } catch (_) {
      return null;
    }
  }

  String getPin() {
    return _prefs.getString(_keyGuardPin) ?? '1234';
  }

  Future<void> setPin(String newPin) async {
    await _prefs.setString(_keyGuardPin, newPin);
  }

  Future<void> saveRequests(List<VisitorRequest> requests) async {
    final list = requests.map((r) => r.toJson()).toList();
    await _prefs.setString(_keyVisitorRequests, jsonEncode(list));
  }

  List<VisitorRequest>? getRequests() {
    final raw = _prefs.getString(_keyVisitorRequests);
    if (raw == null) return null;
    try {
      final list = jsonDecode(raw) as List<dynamic>;
      return list
          .map((item) => VisitorRequest.fromJson(item as Map<String, dynamic>))
          .toList();
    } catch (_) {
      return null;
    }
  }

  Future<void> clearSession() async {
    await _prefs.setBool(_keyIsLoggedIn, false);
  }
}
