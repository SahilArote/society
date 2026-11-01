Android integration
1) Native: copy the "res" folder into android/app/src/main/res (merge). Set android:icon="@mipmap/ic_launcher"
   and android:roundIcon="@mipmap/ic_launcher_round" in AndroidManifest.xml.
   Notification small icon: use @drawable/ic_stat_nexgate (white on transparent, required by Android).
2) Flutter: copy flutter_adaptive_*.png and nexgate_icon_fullbleed_1024.png to assets/icon/, add
   flutter_launcher_icons.yaml settings to pubspec.yaml, run: dart run flutter_launcher_icons
3) Android 12+ splash: use splash_icon_1152.png as windowSplashScreenAnimatedIcon / flutter_native_splash "image",
   splash background colour #2563EB.
