package com.nexbuild.nexguard

import android.app.KeyguardManager
import android.app.NotificationManager
import android.app.admin.DevicePolicyManager
import android.app.role.RoleManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.os.Build
import android.os.Bundle
import android.telecom.TelecomManager
import android.util.Log
import android.view.WindowManager
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.EventChannel
import io.flutter.plugin.common.MethodChannel
import java.io.File
import java.io.FileOutputStream

class MainActivity : FlutterActivity() {
    companion object {
        private const val TAG = "NexCall"
        private const val CHANNEL_IMAGE_COMPRESS = "com.nexbuild.nexguard/image_compress"
        private const val CHANNEL_CALL = "nexguard/call"
        private const val CHANNEL_CALL_EVENTS = "nexguard/call_events"
        private const val REQUEST_CODE_ROLE_DIALER = 51234
    }

    private var eventSink: EventChannel.EventSink? = null

    private val callStateListener: (Map<String, Any?>) -> Unit = { stateMap ->
        runOnUiThread {
            try {
                eventSink?.success(stateMap)
            } catch (e: Exception) {
                Log.e(TAG, "Failed to send call event through sink: ${e.message}", e)
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        try {
            CallManager.init(applicationContext)
        } catch (e: Exception) {
            Log.e(TAG, "Error in CallManager.init: ${e.message}", e)
        }
        ensureLockTaskPackages()
        turnScreenOnAndShowOverLock()
        handleIncomingCallIntent(intent)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        handleIncomingCallIntent(intent)
    }

    private fun handleIncomingCallIntent(intent: Intent?) {
        if (intent == null) return
        val isIncoming = intent.getBooleanExtra("incoming_call", false)
        val phoneNumber = intent.getStringExtra("phone_number")
        if (isIncoming) {
            Log.i(TAG, "MainActivity received incoming_call intent flag for $phoneNumber")
            turnScreenOnAndShowOverLock()
        }
    }

    private fun turnScreenOnAndShowOverLock() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
                setShowWhenLocked(true)
                setTurnScreenOn(true)
            } else {
                @Suppress("DEPRECATION")
                window.addFlags(
                    WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                    WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
                    WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD or
                    WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
                )
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val keyguardManager = getSystemService(Context.KEYGUARD_SERVICE) as? KeyguardManager
                keyguardManager?.requestDismissKeyguard(this, null)
            }
        } catch (e: Exception) {
            Log.w(TAG, "Error setting showWhenLocked flags: ${e.message}")
        }
    }

    /**
     * Requirement 5: If the device is running as Device Owner in Lock Task / Screen Pinning mode,
     * ensure our package is explicitly in setLockTaskPackages so kiosk mode is never broken.
     */
    private fun ensureLockTaskPackages() {
        try {
            val dpm = getSystemService(Context.DEVICE_POLICY_SERVICE) as? DevicePolicyManager
            val adminComponent = ComponentName(this, MainActivity::class.java)
            if (dpm != null && (dpm.isDeviceOwnerApp(packageName) || dpm.isProfileOwnerApp(packageName))) {
                val currentPackages = dpm.getLockTaskPackages(adminComponent)
                if (!currentPackages.contains(packageName)) {
                    dpm.setLockTaskPackages(adminComponent, currentPackages.plus(packageName))
                    Log.i(TAG, "Device Owner: $packageName successfully added to setLockTaskPackages")
                }
            }
        } catch (e: Exception) {
            Log.w(TAG, "DevicePolicyManager check/configure: ${e.message}")
        }
    }

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)

        // 1. Existing Image Compress Channel (untouched)
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, CHANNEL_IMAGE_COMPRESS).setMethodCallHandler { call, result ->
            if (call.method == "compressImage") {
                val path = call.argument<String>("path")
                val maxWidth = call.argument<Int>("maxWidth") ?: 600
                val quality = call.argument<Int>("quality") ?: 70
                if (path == null) {
                    result.error("INVALID_PATH", "Path is null", null)
                    return@setMethodCallHandler
                }
                try {
                    val file = File(path)
                    if (!file.exists()) {
                        result.success(path)
                        return@setMethodCallHandler
                    }

                    val options = BitmapFactory.Options().apply { inJustDecodeBounds = true }
                    BitmapFactory.decodeFile(path, options)
                    val srcWidth = options.outWidth
                    val srcHeight = options.outHeight

                    if (srcWidth <= 0 || srcHeight <= 0) {
                        result.success(path)
                        return@setMethodCallHandler
                    }

                    var inSampleSize = 1
                    var w = srcWidth
                    var h = srcHeight
                    while (w / 2 >= maxWidth || h / 2 >= maxWidth) {
                        w /= 2
                        h /= 2
                        inSampleSize *= 2
                    }

                    val decodeOptions = BitmapFactory.Options().apply {
                        this.inSampleSize = inSampleSize
                    }
                    val bitmap = BitmapFactory.decodeFile(path, decodeOptions)
                    if (bitmap == null) {
                        result.success(path)
                        return@setMethodCallHandler
                    }

                    val cacheDir = applicationContext.cacheDir
                    val compressedFile = File(cacheDir, "comp_${System.currentTimeMillis()}.jpg")
                    val out = FileOutputStream(compressedFile)
                    bitmap.compress(Bitmap.CompressFormat.JPEG, quality, out)
                    out.flush()
                    out.close()
                    bitmap.recycle()

                    result.success(compressedFile.absolutePath)
                } catch (e: Exception) {
                    result.success(path)
                }
            } else {
                result.notImplemented()
            }
        }

        // 2. Call Spike MethodChannel: "nexguard/call"
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, CHANNEL_CALL).setMethodCallHandler { call, result ->
            when (call.method) {
                "isDefaultDialer" -> {
                    val isDefault = checkIsDefaultDialer()
                    Log.i(TAG, "MethodChannel isDefaultDialer called -> $isDefault")
                    result.success(isDefault)
                }
                "requestDialerRole" -> {
                    val success = requestDialerRole()
                    Log.i(TAG, "MethodChannel requestDialerRole called -> $success")
                    result.success(success)
                }
                "placeCall" -> {
                    val number = call.argument<String>("number")
                    if (number.isNullOrEmpty()) {
                        Log.e(TAG, "placeCall failed: number is empty or null")
                        result.error("INVALID_ARGUMENT", "Phone number is required", null)
                        return@setMethodCallHandler
                    }
                    val placed = CallManager.placeCall(this, number)
                    result.success(placed)
                }
                "answer" -> {
                    val answered = CallManager.answer()
                    result.success(answered)
                }
                "reject" -> {
                    val rejected = CallManager.reject()
                    result.success(rejected)
                }
                "hangup" -> {
                    val hungup = CallManager.hangup()
                    result.success(hungup)
                }
                "silenceRinger" -> {
                    val silenced = CallManager.silenceRinger()
                    result.success(silenced)
                }
                "setMute" -> {
                    val muted = call.argument<Boolean>("muted") ?: false
                    val res = CallManager.setMuted(muted)
                    result.success(res)
                }
                "setSpeaker" -> {
                    val speaker = call.argument<Boolean>("speaker") ?: false
                    val res = CallManager.setSpeaker(speaker)
                    result.success(res)
                }
                "getCallState", "getCurrentCallState" -> {
                    result.success(CallManager.toStateMap())
                }
                "setWhitelist" -> {
                    val numbers = call.argument<List<String>>("numbers") ?: emptyList()
                    CallManager.setWhitelist(numbers)
                    result.success(true)
                }
                "setAllowOnlyKnownNumbers" -> {
                    val enabled = call.argument<Boolean>("enabled") ?: false
                    CallManager.allowOnlyKnownNumbers = enabled
                    Log.i(TAG, "allowOnlyKnownNumbers set to: $enabled")
                    result.success(true)
                }
                "canUseFullScreenIntent" -> {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                        val nm = getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
                        result.success(nm?.canUseFullScreenIntent() ?: true)
                    } else {
                        result.success(true)
                    }
                }
                else -> {
                    result.notImplemented()
                }
            }
        }

        // 3. Call Spike EventChannel: "nexguard/call_events"
        EventChannel(flutterEngine.dartExecutor.binaryMessenger, CHANNEL_CALL_EVENTS).setStreamHandler(
            object : EventChannel.StreamHandler {
                override fun onListen(arguments: Any?, events: EventChannel.EventSink?) {
                    Log.i(TAG, "EventChannel nexguard/call_events onListen")
                    eventSink = events
                    CallManager.addListener(callStateListener)
                }

                override fun onCancel(arguments: Any?) {
                    Log.i(TAG, "EventChannel nexguard/call_events onCancel")
                    CallManager.removeListener(callStateListener)
                    eventSink = null
                }
            }
        )
    }

    private fun checkIsDefaultDialer(): Boolean {
        return try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                val roleManager = getSystemService(Context.ROLE_SERVICE) as? RoleManager
                val isHeld = roleManager?.isRoleHeld(RoleManager.ROLE_DIALER) == true
                Log.i(TAG, "RoleManager check: isRoleHeld(ROLE_DIALER) = $isHeld")
                isHeld
            } else {
                val telecomManager = getSystemService(Context.TELECOM_SERVICE) as? TelecomManager
                val defaultPkg = telecomManager?.defaultDialerPackage
                val isDefault = (defaultPkg == packageName)
                Log.i(TAG, "TelecomManager check: defaultDialerPackage = $defaultPkg -> $isDefault")
                isDefault
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error checking default dialer: ${e.message}", e)
            false
        }
    }

    private fun requestDialerRole(): Boolean {
        Log.i(TAG, "requestDialerRole initiated")
        return try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                val roleManager = getSystemService(Context.ROLE_SERVICE) as? RoleManager
                if (roleManager != null && roleManager.isRoleAvailable(RoleManager.ROLE_DIALER)) {
                    val intent = roleManager.createRequestRoleIntent(RoleManager.ROLE_DIALER)
                    startActivityForResult(intent, REQUEST_CODE_ROLE_DIALER)
                    Log.i(TAG, "Launched RoleManager.createRequestRoleIntent")
                    true
                } else {
                    Log.w(TAG, "ROLE_DIALER is not available on this device")
                    false
                }
            } else {
                @Suppress("DEPRECATION")
                val intent = Intent(TelecomManager.ACTION_CHANGE_DEFAULT_DIALER).apply {
                    putExtra(TelecomManager.EXTRA_CHANGE_DEFAULT_DIALER_PACKAGE_NAME, packageName)
                }
                startActivityForResult(intent, REQUEST_CODE_ROLE_DIALER)
                Log.i(TAG, "Launched TelecomManager.ACTION_CHANGE_DEFAULT_DIALER")
                true
            }
        } catch (e: Exception) {
            Log.e(TAG, "Exception requesting dialer role: ${e.message}", e)
            false
        }
    }
}
