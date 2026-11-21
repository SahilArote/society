# NexGate Mobile App Release Notes

## Version 1.1.0 (Build 2) — Production Release
*Release Date: October 31, 2026*

### 🎨 Brand Identity & Visual Assets
- **New Adaptive App Icon:** Official NexGate v1.1 high-resolution adaptive app icon with full-bleed vector layers and legacy round icon support.
- **Android-Compliant Notification Icon:** Replaced full-color notification icons with official `@drawable/ic_stat_nexgate` (monochrome white-on-transparent) accompanied by official `#2563EB` Gate Blue notification accent color for crisp heads-up delivery across Android 8 through 15.
- **Precision Branded Splash Screen:** Implemented official `NexGateSplash` vector mark featuring two gate posts, tinted gate leaf (`#CFE0FF`), and animated live visitor alert mint dot (`#34D399`) with ping ring ripple on `#2563EB` Gate Blue.
- **Native Android 12+ Cold-Start Splash:** Branded window launch background with `@color/splash_background` and `@drawable/splash_icon_1152`.

### 🔒 Enterprise Security Hardening
- **Hardware-Backed Secure Token Storage:** Auth tokens now stored via `flutter_secure_storage` utilizing Android Keystore (AES hardware-level encryption) instead of plain-text SharedPreferences XML.
- **Zero URL Token Leakage:** Removed `?token=` query parameters from all visitor photo preview URLs and WebSocket connections (CWE-598 compliance). Sensitive photos and sockets now strictly authenticate via `Authorization: Bearer <token>` HTTP headers.
- **Post-Logout Push Notification Cleanup:** Registered device FCM push tokens are immediately deleted from both local storage (`FirebaseMessaging.instance.deleteToken()`) and backend database upon resident logout or 401 session expiration.
- **Network Security Configuration:** Cleartext HTTP traffic completely disabled (`android:usesCleartextTraffic="false"`). All endpoints enforced through strict TLS HTTPS with 15-second client timeouts.

### ⚡ Bug Fixes & Performance
- Fixed duplicate flat entries and wing normalization on admin imports.
- Enhanced visitor entry request status synchronizations over secure Socket.IO.
- Smooth 1.6-second cold-start transition with concurrent session restoration.

