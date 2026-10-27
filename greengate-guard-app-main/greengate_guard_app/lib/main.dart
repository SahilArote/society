import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'core/theme/app_theme.dart';
import 'features/auth/splash_screen.dart';
import 'repositories/guard_repository.dart';
import 'services/storage_service.dart';
import 'services/api_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Dedicated gate kiosk mobile devices run in portrait orientation
  try {
    await SystemChrome.setPreferredOrientations([
      DeviceOrientation.portraitUp,
      DeviceOrientation.portraitDown,
    ]);
  } catch (e) {
    debugPrint('Orientation error: $e');
  }

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
  } catch (e) {
    debugPrint('System UI error: $e');
  }

  StorageService storage;
  try {
    storage = await StorageService.init();
    ApiService.setBaseUrl(storage.getServerUrl());
  } catch (e) {
    debugPrint('StorageService init error: $e');
    final prefs = await SharedPreferences.getInstance();
    storage = StorageService(prefs);
  }

  final guardRepo = GuardRepository(storage);

  runApp(NexGuardApp(guardRepo: guardRepo));
}


class NexGuardApp extends StatelessWidget {
  final GuardRepository guardRepo;

  const NexGuardApp({super.key, required this.guardRepo});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'NexGuard',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      home: SplashScreen(guardRepo: guardRepo),
    );
  }
}
