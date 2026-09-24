import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/user_model.dart';

/// Local persistence service for session tokens and user profiles.
class StorageService {
  static const String _keyToken = 'nexgate_auth_token';
  static const String _keyUser = 'nexgate_auth_user';
  static const String _keyPendingReg = 'nexgate_pending_registration';
  static const String _keyOnboardingDone = 'nexgate_onboarding_completed';

  static SharedPreferences? _prefs;

  static Future<void> init() async {
    _prefs ??= await SharedPreferences.getInstance();
  }

  // Token Management
  static Future<void> saveToken(String token) async {
    await _prefs?.setString(_keyToken, token);
  }

  static String? getToken() {
    return _prefs?.getString(_keyToken);
  }

  static Future<void> removeToken() async {
    await _prefs?.remove(_keyToken);
  }

  // User Management
  static Future<void> saveUser(UserModel user) async {
    final raw = jsonEncode(user.toJson());
    await _prefs?.setString(_keyUser, raw);
  }

  static UserModel? getUser() {
    final raw = _prefs?.getString(_keyUser);
    if (raw == null) return null;
    try {
      final map = jsonDecode(raw) as Map<String, dynamic>;
      return UserModel.fromJson(map);
    } catch (_) {
      return null;
    }
  }

  static Future<void> removeUser() async {
    await _prefs?.remove(_keyUser);
  }

  // Pending Registration Management
  static Future<void> savePendingRegistration(Map<String, dynamic> data) async {
    await _prefs?.setString(_keyPendingReg, jsonEncode(data));
  }

  static Map<String, dynamic>? getPendingRegistration() {
    final raw = _prefs?.getString(_keyPendingReg);
    if (raw == null) return null;
    try {
      return jsonDecode(raw) as Map<String, dynamic>;
    } catch (_) {
      return null;
    }
  }

  static Future<void> removePendingRegistration() async {
    await _prefs?.remove(_keyPendingReg);
  }

  // Onboarding Management
  static bool isOnboardingCompleted() {
    return _prefs?.getBool(_keyOnboardingDone) ?? false;
  }

  static Future<void> setOnboardingCompleted(bool value) async {
    await _prefs?.setBool(_keyOnboardingDone, value);
  }

  // Clear Session
  static Future<void> clearSession() async {
    await removeToken();
    await removeUser();
  }
}
