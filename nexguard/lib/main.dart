import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'core/theme/app_theme.dart';
import 'features/auth/login_screen.dart';
import 'features/auth/splash_screen.dart';
import 'repositories/guard_repository.dart';
import 'services/storage_service.dart';
import 'services/api_service.dart';
import 'services/language_service.dart';

final GlobalKey<NavigatorState> guardNavigatorKey = GlobalKey<NavigatorState>();

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Production Error Boundary: Prevent unhandled exceptions from terminating the terminal
  FlutterError.onError = (FlutterErrorDetails details) {
    FlutterError.presentError(details);
    debugPrint('[Production FlutterError] ${details.exceptionAsString()}');
  };

  PlatformDispatcher.instance.onError = (error, stack) {
    debugPrint('[Production PlatformDispatcher Error] $error\n$stack');
    return true; // Prevents crash
  };

  // Dedicated gate kiosk mobile devices run in portrait orientation
  try {
    await SystemChrome.setPreferredOrientations([
      DeviceOrientation.portraitUp,
      DeviceOrientation.portraitDown,
    ]);
  } catch (_) {}

  // System UI Overlay styling
  try {
    SystemChrome.setSystemUIOverlayStyle(
      const SystemUiOverlayStyle(
        statusBarColor: Colors.transparent,
        statusBarIconBrightness: Brightness.dark,
        systemNavigationBarColor: Colors.white,
        systemNavigationBarIconBrightness: Brightness.dark,
      ),
    );
  } catch (_) {}

  StorageService storage;
  try {
    storage = await StorageService.init().timeout(
      const Duration(seconds: 2),
      onTimeout: () => StorageService.fallback(),
    );
  } catch (_) {
    storage = await StorageService.fallback();
  }

  try {
    LanguageService.instance.init(storage);
    ApiService.setBaseUrl(storage.getServerUrl());
  } catch (_) {}

  final guardRepo = GuardRepository(storage);

  // When token is rejected (401), immediately evict cached session and route to login
  ApiService.onUnauthorized = () {
    guardRepo.logout();
    guardNavigatorKey.currentState?.pushAndRemoveUntil(
      MaterialPageRoute(builder: (_) => LoginScreen(guardRepo: guardRepo)),
      (route) => false,
    );
  };

  runApp(NexGuardApp(guardRepo: guardRepo));
}

class NexGuardApp extends StatelessWidget {
  final GuardRepository guardRepo;

  const NexGuardApp({super.key, required this.guardRepo});

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: LanguageService.instance,
      builder: (context, _) {
        return MaterialApp(
          navigatorKey: guardNavigatorKey,
          title: 'NexGuard',
          debugShowCheckedModeBanner: false,
          theme: AppTheme.lightTheme,
          home: SplashScreen(guardRepo: guardRepo),
        );
      },
    );
  }
}
