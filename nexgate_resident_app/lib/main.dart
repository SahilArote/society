import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'core/constants/app_colors.dart';
import 'core/theme/app_theme.dart';
import 'features/splash/splash_screen.dart';
import 'services/storage_service.dart';

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
      statusBarBrightness: Brightness.light,
      systemNavigationBarColor: Colors.white,
      systemNavigationBarIconBrightness: Brightness.dark,
      systemNavigationBarDividerColor: AppColors.border,
    ),
  );

  // Initialize local persistent storage
  await StorageService.init();

  runApp(const NexGateResidentApp());
}

/// Root Application Widget for NexGate Resident Mobile.
class NexGateResidentApp extends StatelessWidget {
  const NexGateResidentApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'NexGate Resident',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      home: const SplashScreen(),
    );
  }
}
