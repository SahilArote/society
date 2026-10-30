import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
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
  final FlutterSecureStorage _secureStorage;
  String? _cachedToken;

  StorageService(this._prefs, this._secureStorage, this._cachedToken);

  static Future<StorageService> init() async {
    final prefs = await SharedPreferences.getInstance();
    const secureStorage = FlutterSecureStorage(
      aOptions: AndroidOptions(encryptedSharedPreferences: true),
    );
    String? token;
    try {
      token = await secureStorage.read(key: _keyAuthToken);
      // Migration from plaintext SharedPreferences
      if (token == null && prefs.containsKey(_keyAuthToken)) {
        final legacy = prefs.getString(_keyAuthToken);
        if (legacy != null && legacy.isNotEmpty) {
          token = legacy;
          await secureStorage.write(key: _keyAuthToken, value: legacy);
          await prefs.remove(_keyAuthToken);
        }
      }
    } catch (_) {
      token = prefs.getString(_keyAuthToken);
    }
    return StorageService(prefs, secureStorage, token);
  }

  Future<void> saveToken(String token) async {
    _cachedToken = token;
    try {
      await _secureStorage.write(key: _keyAuthToken, value: token);
    } catch (_) {}
    await _prefs.remove(_keyAuthToken);
  }

  String? getToken() {
    return _cachedToken;
  }

  Future<void> removeToken() async {
    _cachedToken = null;
    try {
      await _secureStorage.delete(key: _keyAuthToken);
    } catch (_) {}
    await _prefs.remove(_keyAuthToken);
  }

  String getServerUrl() {
    var url = _prefs.getString(_keyServerUrl) ?? 'https://dazclothess.com/api';
    var clean = url.trim();
    while (clean.endsWith('/')) {
      clean = clean.substring(0, clean.length - 1);
    }
    if (clean.isNotEmpty && !clean.endsWith('/api')) {
      clean = '$clean/api';
    }
    return clean.isNotEmpty ? clean : 'https://dazclothess.com/api';
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
    await setLoggedIn(false);
    await removeToken();
    await _prefs.remove(_keyGuardData);
    await _prefs.remove(_keyVisitorRequests);
  }
}
