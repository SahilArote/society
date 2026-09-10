import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'core/theme/app_theme.dart';
import 'features/auth/splash_screen.dart';
import 'repositories/guard_repository.dart';
import 'services/storage_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Dedicated gate kiosk mobile devices run in portrait orientation
  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);

  // System UI Overlay styling
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.dark,
      systemNavigationBarColor: Colors.white,
      systemNavigationBarIconBrightness: Brightness.dark,
    ),
  );

  final storage = await StorageService.init();
  final guardRepo = GuardRepository(storage);

  runApp(GreenGateGuardApp(guardRepo: guardRepo));
}

class GreenGateGuardApp extends StatelessWidget {
  final GuardRepository guardRepo;

  const GreenGateGuardApp({super.key, required this.guardRepo});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'GreenGate Guard',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      home: SplashScreen(guardRepo: guardRepo),
    );
  }
}
