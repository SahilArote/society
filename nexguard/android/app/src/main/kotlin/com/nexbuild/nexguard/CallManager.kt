package com.nexbuild.nexguard

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.AudioManager
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.telecom.Call
import android.telecom.CallAudioState
import android.telecom.PhoneAccount
import android.telecom.TelecomManager
import android.telecom.VideoProfile
import android.telephony.TelephonyManager
import android.util.Log

/**
 * CallManager - Central singleton for managing InCallService calls,
 * call states, audio routing, mute status, and dispatching events to Flutter.
 *
 * Logs tagged with "NexCall" for observability during the spike.
 */
object CallManager {
    private const val TAG = "NexCall"
    const val CHANNEL_ID = "nexguard_incoming_calls"
    const val NOTIFICATION_ID = 9911

    var currentCall: Call? = null
        private set

    var callState: String = "idle"
        private set

    var phoneNumber: String = ""
        private set

    var isMuted: Boolean = false
        private set

    var isSpeaker: Boolean = false
        private set

    var callDurationSeconds: Int = 0
        private set

    private var inCallService: NexInCallService? = null
    private var appContext: Context? = null
    private val mainHandler = Handler(Looper.getMainLooper())
    private var durationRunnable: Runnable? = null
    private var callStartTime: Long = 0L

    private val listeners = mutableListOf<(Map<String, Any?>) -> Unit>()

    private val callCallback = object : Call.Callback() {
        override fun onStateChanged(call: Call, state: Int) {
            super.onStateChanged(call, state)
            Log.i(TAG, "Call.Callback onStateChanged: rawState=$state (${stateToString(state)})")
            updateStateFromCall(call)
        }

        override fun onDetailsChanged(call: Call, details: Call.Details) {
            super.onDetailsChanged(call, details)
            extractNumber(call)
            notifyListeners()
        }
    }

    fun init(context: Context) {
        if (appContext != null) return
        appContext = context.applicationContext
        try {
            createNotificationChannel(appContext!!)
        } catch (e: Exception) {
            Log.e(TAG, "Error initializing notification channel: ${e.message}")
        }
        Log.i(TAG, "CallManager initialized with context")
    }

    fun registerInCallService(service: NexInCallService) {
        Log.i(TAG, "NexInCallService registered with CallManager")
        inCallService = service
        // Sync initial audio state if available
        service.callAudioState?.let { updateAudioState(it) }
    }

    fun unregisterInCallService(service: NexInCallService) {
        if (inCallService == service) {
            Log.i(TAG, "NexInCallService unregistered from CallManager")
            inCallService = null
        }
    }

    fun onCallAdded(call: Call, service: NexInCallService) {
        Log.i(TAG, "onCallAdded: call=$call, initialRawState=${call.state} (${stateToString(call.state)})")
        inCallService = service
        currentCall = call
        call.registerCallback(callCallback)
        extractNumber(call)
        updateStateFromCall(call)
    }

    fun onCallRemoved(call: Call) {
        Log.i(TAG, "onCallRemoved: call=$call")
        call.unregisterCallback(callCallback)
        if (currentCall == call) {
            val prev = callState
            callState = "disconnected"
            Log.i(TAG, "Call ended. Transitioning: $prev -> disconnected")
            stopDurationTimer()
            cancelNotification()
            notifyListeners()

            // Return to idle after a brief moment so Flutter UI can render disconnected state
            mainHandler.postDelayed({
                if (currentCall == call) {
                    currentCall = null
                    callState = "idle"
                    phoneNumber = ""
                    callDurationSeconds = 0
                    isMuted = false
                    isSpeaker = false
                    Log.i(TAG, "Call reset to idle")
                    notifyListeners()
                }
            }, 1500)
        }
    }

    fun onAudioStateChanged(audioState: CallAudioState) {
        updateAudioState(audioState)
    }

    private fun updateAudioState(audioState: CallAudioState) {
        val newMuted = audioState.isMuted
        val newSpeaker = (audioState.route == CallAudioState.ROUTE_SPEAKER)
        if (isMuted != newMuted || isSpeaker != newSpeaker) {
            isMuted = newMuted
            isSpeaker = newSpeaker
            Log.i(TAG, "Audio state updated: muted=$isMuted, speaker=$isSpeaker (rawRoute=${audioState.route})")
            notifyListeners()
        }
    }

    private fun mapCallState(rawState: Int): String {
        return when (rawState) {
            Call.STATE_NEW, Call.STATE_CONNECTING, Call.STATE_DIALING -> "dialing"
            Call.STATE_RINGING -> "ringing"
            Call.STATE_ACTIVE -> "active"
            Call.STATE_HOLDING -> "holding"
            Call.STATE_DISCONNECTED, Call.STATE_DISCONNECTING -> "disconnected"
            else -> "idle"
        }
    }

    private fun stateToString(rawState: Int): String {
        return when (rawState) {
            Call.STATE_NEW -> "STATE_NEW"
            Call.STATE_CONNECTING -> "STATE_CONNECTING"
            Call.STATE_DIALING -> "STATE_DIALING"
            Call.STATE_RINGING -> "STATE_RINGING"
            Call.STATE_ACTIVE -> "STATE_ACTIVE"
            Call.STATE_HOLDING -> "STATE_HOLDING"
            Call.STATE_DISCONNECTED -> "STATE_DISCONNECTED"
            Call.STATE_DISCONNECTING -> "STATE_DISCONNECTING"
            Call.STATE_SELECT_PHONE_ACCOUNT -> "STATE_SELECT_PHONE_ACCOUNT"
            else -> "STATE_UNKNOWN($rawState)"
        }
    }

    private fun updateStateFromCall(call: Call) {
        val previousState = callState
        val newState = mapCallState(call.state)
        callState = newState
        Log.i(TAG, "Call state transition: $previousState -> $newState (raw=${call.state} ${stateToString(call.state)})")

        when (newState) {
            "ringing" -> {
                stopDurationTimer()
                callDurationSeconds = 0
                showIncomingCallNotification()
            }
            "active" -> {
                cancelNotification()
                if (previousState != "active") {
                    callStartTime = System.currentTimeMillis()
                    startDurationTimer()
                }
                ensureAudioActive()
            }
            "disconnected" -> {
                stopDurationTimer()
                cancelNotification()
                restoreAudioMode()
                mainHandler.postDelayed({
                    if (callState == "disconnected") {
                        callState = "idle"
                        currentCall = null
                        phoneNumber = ""
                        callDurationSeconds = 0
                        isMuted = false
                        isSpeaker = false
                        restoreAudioMode()
                        Log.i(TAG, "Post-disconnect reset to idle")
                        notifyListeners()
                    }
                }, 1500)
            }
            else -> {
                stopDurationTimer()
                cancelNotification()
            }
        }
        notifyListeners()
    }

    private fun extractNumber(call: Call) {
        try {
            val handle = call.details?.handle
            if (handle != null) {
                val schemePart = handle.schemeSpecificPart
                if (!schemePart.isNullOrEmpty()) {
                    phoneNumber = schemePart
                    Log.i(TAG, "Extracted phone number from handle: $phoneNumber")
                    return
                }
            }
            val gatewayInfo = call.details?.gatewayInfo
            if (gatewayInfo?.originalAddress != null) {
                phoneNumber = gatewayInfo.originalAddress.schemeSpecificPart ?: ""
                Log.i(TAG, "Extracted phone number from gatewayInfo: $phoneNumber")
                return
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error extracting phone number: ${e.message}", e)
        }
    }

    private fun startDurationTimer() {
        stopDurationTimer()
        callDurationSeconds = 0
        durationRunnable = object : Runnable {
            override fun run() {
                if (callState == "active") {
                    val elapsed = ((System.currentTimeMillis() - callStartTime) / 1000).toInt()
                    callDurationSeconds = elapsed
                    notifyListeners()
                    mainHandler.postDelayed(this, 1000)
                }
            }
        }
        mainHandler.postDelayed(durationRunnable!!, 1000)
    }

    private fun stopDurationTimer() {
        durationRunnable?.let { mainHandler.removeCallbacks(it) }
        durationRunnable = null
    }

    // Call controls
    fun answer(): Boolean {
        Log.i(TAG, "CallManager.answer called")
        val call = currentCall
        if (call != null) {
            try {
                call.answer(VideoProfile.STATE_AUDIO_ONLY)
                cancelNotification()
                Log.i(TAG, "Call answered successfully")
                return true
            } catch (e: Exception) {
                Log.e(TAG, "Failed to answer call: ${e.message}", e)
                return false
            }
        }
        Log.w(TAG, "answer requested but currentCall is null")
        return false
    }

    fun reject(): Boolean {
        Log.i(TAG, "CallManager.reject called")
        val call = currentCall
        if (call != null) {
            try {
                if (call.state == Call.STATE_RINGING) {
                    call.reject(false, null)
                } else {
                    call.disconnect()
                }
                cancelNotification()
                Log.i(TAG, "Call rejected/disconnected successfully")
                return true
            } catch (e: Exception) {
                Log.e(TAG, "Failed to reject call: ${e.message}", e)
                return false
            }
        }
        Log.w(TAG, "reject requested but currentCall is null")
        return false
    }

    fun hangup(): Boolean {
        Log.i(TAG, "CallManager.hangup called")
        val call = currentCall
        if (call != null) {
            try {
                call.disconnect()
                cancelNotification()
                Log.i(TAG, "Call disconnected successfully")
                return true
            } catch (e: Exception) {
                Log.e(TAG, "Failed to hang up call: ${e.message}", e)
                return false
            }
        }
        Log.w(TAG, "hangup requested but currentCall is null")
        return false
    }

    fun setMuted(mute: Boolean): Boolean {
        Log.i(TAG, "CallManager.setMuted: $mute")
        val svc = inCallService
        if (svc != null) {
            try {
                svc.setMuted(mute)
                isMuted = mute
                notifyListeners()
                return true
            } catch (e: Exception) {
                Log.e(TAG, "Failed to setMuted: ${e.message}", e)
                return false
            }
        }
        Log.w(TAG, "inCallService is null, cannot setMuted")
        return false
    }

    fun ensureAudioActive(speaker: Boolean = isSpeaker) {
        val svc = inCallService
        try {
            svc?.setMuted(false)
            isMuted = false
            val route = if (speaker) CallAudioState.ROUTE_SPEAKER else CallAudioState.ROUTE_EARPIECE
            svc?.setAudioRoute(route)
            isSpeaker = speaker

            // Adjust in-call stream volume only if muted/zero, avoiding interference with Telecom hardware AEC
            appContext?.let { ctx ->
                val audioManager = ctx.getSystemService(Context.AUDIO_SERVICE) as? AudioManager
                if (audioManager != null) {
                    try {
                        val maxVol = audioManager.getStreamMaxVolume(AudioManager.STREAM_VOICE_CALL)
                        val curVol = audioManager.getStreamVolume(AudioManager.STREAM_VOICE_CALL)
                        if (curVol <= 1 && maxVol > 1) {
                            val boostVol = (maxVol * 0.75).toInt().coerceAtLeast(1)
                            audioManager.setStreamVolume(AudioManager.STREAM_VOICE_CALL, boostVol, 0)
                            Log.i(TAG, "Ensured in-call volume level: $boostVol/$maxVol")
                        }
                    } catch (ve: Exception) {
                        Log.w(TAG, "Could not adjust in-call volume: ${ve.message}")
                    }
                }
            }
            Log.i(TAG, "ensureAudioActive: unmuted, route=${if (speaker) "SPEAKER" else "EARPIECE"}")
        } catch (e: Exception) {
            Log.e(TAG, "Error in ensureAudioActive: ${e.message}", e)
        }
    }

    fun restoreAudioMode() {
        // Telecom automatically restores audio routing on call teardown
    }

    fun setSpeaker(speaker: Boolean): Boolean {
        Log.i(TAG, "CallManager.setSpeaker: $speaker")
        isSpeaker = speaker
        val svc = inCallService
        if (svc != null) {
            try {
                val route = if (speaker) CallAudioState.ROUTE_SPEAKER else CallAudioState.ROUTE_EARPIECE
                svc.setAudioRoute(route)
                notifyListeners()
                return true
            } catch (e: Exception) {
                Log.e(TAG, "Failed to setAudioRoute: ${e.message}", e)
                return false
            }
        }
        Log.w(TAG, "inCallService is null, cannot setSpeaker")
        return false
    }

    fun placeCall(context: Context, number: String): Boolean {
        val cleanNumber = number.trim()
        Log.i(TAG, "CallManager.placeCall initiated for number: $cleanNumber")

        if (cleanNumber.isEmpty()) {
            Log.e(TAG, "placeCall failed: phone number is empty")
            return false
        }

        // Emergency numbers check: DO NOT block emergency numbers (112, 100, 101, 102).
        // Let Telecom handle them directly.
        if (isEmergencyNumber(cleanNumber, context)) {
            Log.i(TAG, "Emergency number detected: $cleanNumber. Delegating directly to Android Telecom.")
        }

        phoneNumber = cleanNumber
        callState = "dialing"
        notifyListeners()

        return try {
            val telecomManager = context.getSystemService(Context.TELECOM_SERVICE) as? TelecomManager
            if (telecomManager == null) {
                Log.e(TAG, "TelecomManager unavailable on device")
                callState = "idle"
                notifyListeners()
                return false
            }
            val uri = Uri.fromParts("tel", cleanNumber, null)
            val extras = Bundle()

            // Pre-select Default Outgoing Phone Account to eliminate SIM selection latency
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    val defaultAccount = telecomManager.getDefaultOutgoingPhoneAccount(PhoneAccount.SCHEME_TEL)
                    if (defaultAccount != null) {
                        extras.putParcelable(TelecomManager.EXTRA_PHONE_ACCOUNT_HANDLE, defaultAccount)
                        Log.i(TAG, "Attached default phone account handle: $defaultAccount")
                    }
                }
            } catch (e: Exception) {
                Log.w(TAG, "Could not query default outgoing phone account: ${e.message}")
            }

            telecomManager.placeCall(uri, extras)
            Log.i(TAG, "TelecomManager.placeCall successfully invoked for $cleanNumber")
            true
        } catch (e: SecurityException) {
            Log.e(TAG, "SecurityException placing call (check CALL_PHONE permission): ${e.message}", e)
            callState = "idle"
            notifyListeners()
            false
        } catch (e: Exception) {
            Log.e(TAG, "Unexpected exception placing call: ${e.message}", e)
            callState = "idle"
            notifyListeners()
            false
        }
    }

    fun isEmergencyNumber(number: String, context: Context): Boolean {
        val clean = number.replace(Regex("[^0-9+]"), "")
        val knownEmergencyNumbers = setOf("112", "100", "101", "102", "108", "911", "999")
        if (knownEmergencyNumbers.contains(clean)) return true

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            val tele = context.getSystemService(Context.TELEPHONY_SERVICE) as? TelephonyManager
            if (tele != null) {
                try {
                    return tele.isEmergencyNumber(clean)
                } catch (e: Exception) {
                    Log.w(TAG, "isEmergencyNumber check error: ${e.message}")
                }
            }
        }
        return false
    }

    // High priority full-screen notification for incoming calls
    fun showIncomingCallNotification() {
        val ctx = appContext ?: return
        try {
            createNotificationChannel(ctx)
            val fullScreenIntent = Intent(ctx, MainActivity::class.java).apply {
                action = Intent.ACTION_MAIN
                addCategory(Intent.CATEGORY_LAUNCHER)
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or
                        Intent.FLAG_ACTIVITY_REORDER_TO_FRONT or
                        Intent.FLAG_ACTIVITY_SINGLE_TOP
                putExtra("incoming_call", true)
                putExtra("phone_number", phoneNumber)
            }
            val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            } else {
                PendingIntent.FLAG_UPDATE_CURRENT
            }
            val fullScreenPendingIntent = PendingIntent.getActivity(ctx, 0, fullScreenIntent, flags)

            val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                Notification.Builder(ctx, CHANNEL_ID)
            } else {
                @Suppress("DEPRECATION")
                Notification.Builder(ctx)
            }

            builder.setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle("Incoming Gate Call")
                .setContentText(if (phoneNumber.isNotEmpty()) "Call from $phoneNumber" else "Incoming Call")
                .setCategory(Notification.CATEGORY_CALL)
                .setFullScreenIntent(fullScreenPendingIntent, true)
                .setContentIntent(fullScreenPendingIntent)
                .setAutoCancel(true)
                .setOngoing(true)

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                builder.setVisibility(Notification.VISIBILITY_PUBLIC)
                @Suppress("DEPRECATION")
                builder.setPriority(Notification.PRIORITY_MAX)
            }

            val notificationManager = ctx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.notify(NOTIFICATION_ID, builder.build())
            Log.i(TAG, "Incoming call notification posted with full-screen intent for $phoneNumber")

            // Also try to bring MainActivity to the front directly
            try {
                ctx.startActivity(fullScreenIntent)
                Log.i(TAG, "Direct startActivity invoked to surface MainActivity for incoming call")
            } catch (e: Exception) {
                Log.w(TAG, "Direct startActivity failed (relying on fullScreenIntent): ${e.message}")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to show incoming call notification: ${e.message}", e)
        }
    }

    fun cancelNotification() {
        val ctx = appContext ?: return
        try {
            val notificationManager = ctx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.cancel(NOTIFICATION_ID)
            Log.i(TAG, "Incoming call notification cancelled")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to cancel notification: ${e.message}", e)
        }
    }

    private fun createNotificationChannel(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val name = "Incoming Calls"
            val descriptionText = "High-priority alerts for incoming gate phone calls"
            val importance = NotificationManager.IMPORTANCE_HIGH
            val channel = NotificationChannel(CHANNEL_ID, name, importance).apply {
                description = descriptionText
                enableLights(true)
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 1000, 500, 1000)
                lockscreenVisibility = Notification.VISIBILITY_PUBLIC
                try {
                    val audioAttributes = AudioAttributes.Builder()
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                        .build()
                    val ringtoneUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)
                    if (ringtoneUri != null) {
                        setSound(ringtoneUri, audioAttributes)
                    }
                } catch (e: Exception) {
                    Log.w(TAG, "Could not set custom ringtone URI on channel: ${e.message}")
                }
            }
            val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.createNotificationChannel(channel)
        }
    }

    fun toStateMap(): Map<String, Any?> {
        return mapOf(
            "state" to callState,
            "number" to phoneNumber,
            "muted" to isMuted,
            "speaker" to isSpeaker,
            "duration" to callDurationSeconds
        )
    }

    fun addListener(listener: (Map<String, Any?>) -> Unit) {
        listeners.add(listener)
        // Immediately notify with current state
        listener.invoke(toStateMap())
    }

    fun removeListener(listener: (Map<String, Any?>) -> Unit) {
        listeners.remove(listener)
    }

    private fun notifyListeners() {
        val stateMap = toStateMap()
        mainHandler.post {
            for (listener in listeners) {
                try {
                    listener.invoke(stateMap)
                } catch (e: Exception) {
                    Log.e(TAG, "Error invoking call listener: ${e.message}", e)
                }
            }
        }
    }
}

