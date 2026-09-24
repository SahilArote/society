import 'package:flutter/foundation.dart';
import '../models/user_model.dart';
import 'api_service.dart';
import 'socket_service.dart';
import 'storage_service.dart';

/// Centralized session state manager for authentication.
class AuthService {
  AuthService._();

  static final ValueNotifier<UserModel?> currentUser = ValueNotifier<UserModel?>(null);
  static final ValueNotifier<bool> isRestoringSession = ValueNotifier<bool>(true);

  static bool get isAuthenticated =>
      currentUser.value != null && StorageService.getToken() != null;

  /// Restores session on application launch.
  static Future<bool> restoreSession() async {
    isRestoringSession.value = true;
    try {
      final token = StorageService.getToken();
      final cachedUser = StorageService.getUser();

      if (token == null || token.isEmpty) {
        currentUser.value = null;
        return false;
      }

      // Fast optimistic load from local storage
      if (cachedUser != null) {
        currentUser.value = cachedUser;
      }

      // Background verify against backend
      try {
        final verifiedUser = await ApiService.fetchCurrentUser();
        if (verifiedUser != null) {
          currentUser.value = verifiedUser;
          await StorageService.saveUser(verifiedUser);
          SocketService.connect();
          return true;
        } else if (cachedUser != null) {
          // Token still presumed valid if network hiccup
          SocketService.connect();
          return true;
        } else {
          await logout();
          return false;
        }
      } catch (_) {
        if (cachedUser != null) {
          SocketService.connect();
          return true;
        }
        return false;
      }
    } finally {
      isRestoringSession.value = false;
    }
  }

  /// Sets up active session upon successful OTP verification.
  static Future<void> login(String token, UserModel user) async {
    await StorageService.saveToken(token);
    await StorageService.saveUser(user);
    currentUser.value = user;
    SocketService.connect();
  }

  /// Terminates active session.
  static Future<void> logout() async {
    SocketService.disconnect();
    await StorageService.clearSession();
    currentUser.value = null;
  }
}
