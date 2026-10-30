import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'core/constants/app_colors.dart';
import 'core/theme/app_theme.dart';
import 'features/auth/login_screen.dart';
import 'features/splash/splash_screen.dart';
import 'services/auth_service.dart';
import 'services/notification_service.dart';
import 'services/storage_service.dart';

final GlobalKey<NavigatorState> residentNavigatorKey = GlobalKey<NavigatorState>();

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Lock to portrait orientation for native mobile consistency
  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);

  // Configure Android status bar & navigation bar overlay
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.dark,
      systemNavigationBarColor: Colors.white,
      systemNavigationBarIconBrightness: Brightness.dark,
      systemNavigationBarDividerColor: AppColors.border,
    ),
  );

  // Initialize local persistent storage
  await StorageService.init();

  // Initialize push & local notification channels
  await NotificationService.initialize();

  // Route user to login and clear navigation stack whenever 401 occurs
  AuthService.onUnauthorized = () {
    residentNavigatorKey.currentState?.pushAndRemoveUntil(
      MaterialPageRoute(builder: (_) => const LoginScreen()),
      (route) => false,
    );
  };

  runApp(const NexGateResidentApp());
}

/// Root Application Widget for NexGate Resident Mobile.
class NexGateResidentApp extends StatelessWidget {
  const NexGateResidentApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      navigatorKey: residentNavigatorKey,
      title: 'NexGate Resident',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      home: const SplashScreen(),
    );
  }
}
