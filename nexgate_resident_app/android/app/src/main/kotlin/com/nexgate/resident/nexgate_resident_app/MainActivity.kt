package com.nexgate.resident.nexgate_resident_app

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
            } else {
                result.notImplemented()
            }
        }
    }
}
