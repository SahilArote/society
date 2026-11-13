package com.nexgate.resident

import android.content.Intent
import android.net.Uri
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterActivity() {
    private val CHANNEL = "com.nexgate.resident/phone"

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, CHANNEL).setMethodCallHandler { call, result ->
            if (call.method == "openDialer") {
                val phone = call.argument<String>("phoneNumber")
                if (!phone.isNullOrBlank()) {
                    try {
                        val intent = Intent(Intent.ACTION_DIAL).apply {
                            data = Uri.parse("tel:${phone.trim()}")
                            flags = Intent.FLAG_ACTIVITY_NEW_TASK
                        }
                        startActivity(intent)
                        result.success(true)
                    } catch (e: Exception) {
                        result.error("DIALER_ERROR", e.localizedMessage, null)
                    }
                } else {
                    result.error("INVALID_PHONE", "Phone number is null or empty", null)
                }
            } else if (call.method == "getAppVersion") {
                try {
                    val pInfo = context.packageManager.getPackageInfo(context.packageName, 0)
                    val versionName = pInfo.versionName ?: "1.1.0"
                    val versionCode = if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.P) {
                        pInfo.longVersionCode
                    } else {
                        @Suppress("DEPRECATION")
                        pInfo.versionCode.toLong()
                    }
                    val data = HashMap<String, Any>()
                    data["version"] = versionName
                    data["buildNumber"] = versionCode.toString()
                    result.success(data)
                } catch (e: Exception) {
                    val fallback = HashMap<String, Any>()
                    fallback["version"] = "1.1.0"
                    fallback["buildNumber"] = "16"
                    result.success(fallback)
                }
            } else {
                result.notImplemented()
            }
        }
    }
}

