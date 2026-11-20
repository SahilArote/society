package com.nexbuild.nexguard

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.AudioManager
import android.media.Ringtone
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.telecom.Call
import android.telecom.CallAudioState
import android.telecom.PhoneAccount
import android.telecom.TelecomManager
import android.telecom.VideoProfile
import android.telephony.TelephonyManager
import android.util.Log

/**
 * CallManager - Central singleton for managing InCallService incoming and outgoing calls,
 * call states, audio routing, mute/speaker status, and dispatching events to Flutter.
 *
 * Implements kiosk-safe Screen Pinning calling with zero double-ringing and spam control.
 */
object CallManager {
    private const val TAG = "NexCall"
    const val CHANNEL_ID = "nexguard_incoming_calls"
    const val NOTIFICATION_ID = 9911

    var currentCall: Call? = null
        private set

    var callState: String = "idle"
        private set

    var callDirection: String = "outgoing" // "incoming" | "outgoing"
        private set

    var phoneNumber: String = ""
        private set

    var isMuted: Boolean = false
        private set

    var isSpeaker: Boolean = false
        private set

    var callDurationSeconds: Int = 0
        private set

    // Security / Spam whitelist settings
    var allowOnlyKnownNumbers: Boolean = false
    private val whitelistNumbers: MutableSet<String> = mutableSetOf()

    // Outgoing call placement flag to reliably separate inbound Telecom calls from outbound ones
    private var isPlacingOutgoingCall: Boolean = false

    private var inCallService: NexInCallService? = null
    private var appContext: Context? = null
    private val mainHandler = Handler(Looper.getMainLooper())
    private var durationRunnable: Runnable? = null
    private var callStartTime: Long = 0L

    // Dedicated Ringer & Vibrator (to ensure single ring with zero double-ringing)
    private var ringtone: Ringtone? = null
    private var vibrator: Vibrator? = null

    private val listeners = mutableListOf<(Map<String, Any?>) -> Unit>()

    private val callCallback = object : Call.Callback() {
        override fun onStateChanged(call: Call, state: Int) {
            super.onStateChanged(call, state)
            Log.i(TAG, "Call.Callback onStateChanged: rawState=$state (${stateToString(state)})")
            if (state == Call.STATE_RINGING) {
                callDirection = "incoming"
            }
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

    fun setWhitelist(numbers: List<String>) {
        whitelistNumbers.clear()
        for (num in numbers) {
            val normalized = normalizeNumber(num)
            if (normalized.isNotEmpty()) {
                whitelistNumbers.add(normalized)
            }
        }
        Log.i(TAG, "Whitelist updated with ${whitelistNumbers.size} resident numbers")
    }

    fun isNumberAllowed(raw: String): Boolean {
        if (!allowOnlyKnownNumbers) return true
        val norm = normalizeNumber(raw)
        return whitelistNumbers.contains(norm)
    }

    fun normalizeNumber(raw: String): String {
        val digits = raw.replace(Regex("[^0-9]"), "")
        return if (digits.length >= 10) {
            digits.takeLast(10)
        } else {
            digits
        }
    }

    fun registerInCallService(service: NexInCallService) {
        Log.i(TAG, "NexInCallService registered with CallManager")
        inCallService = service
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

        // 1. KIOSK CALL WAITING PROTECTION:
        // If a call is already active/ringing, auto-reject the 2nd call to prevent kiosk UI crash/overlap.
        if (currentCall != null && currentCall != call &&
            (callState == "active" || callState == "dialing" || callState == "ringing" || callState == "incoming")
        ) {
            Log.w(TAG, "[NexCall] Call waiting detected: rejecting incoming call $call to preserve kiosk stability")
            try {
                call.reject(false, null)
            } catch (e: Exception) {
                Log.e(TAG, "Error auto-rejecting waiting call: ${e.message}", e)
            }
            return
        }

        currentCall = call
        call.registerCallback(callCallback)
        extractNumber(call)

        // 2. DETECT DIRECTION (ROBUST TELECOM DETECTION):
        val isIncomingByDetails = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            call.details?.callDirection == Call.Details.DIRECTION_INCOMING
        } else false
        val isIncomingByState = (call.state == Call.STATE_RINGING)

        // If the app did not explicitly place this call, or if state/details indicate incoming, it is incoming!
        val isIncoming = isIncomingByDetails || isIncomingByState || !isPlacingOutgoingCall
        callDirection = if (isIncoming) "incoming" else "outgoing"
        isPlacingOutgoingCall = false
        Log.i(TAG, "onCallAdded resolved: direction=$callDirection, isIncoming=$isIncoming, rawState=${call.state}")

        // 3. SPAM CONTROL / WHITELIST CHECK:
        if (isIncoming && allowOnlyKnownNumbers && !isNumberAllowed(phoneNumber)) {
            Log.w(TAG, "[NexCall] Spam filter active: rejected unlisted incoming call from $phoneNumber")
            try {
                call.reject(false, null)
            } catch (e: Exception) {
                Log.e(TAG, "Error rejecting spam call: ${e.message}")
            }
            return
        }

        updateStateFromCall(call)
    }

    fun onCallRemoved(call: Call) {
        Log.i(TAG, "onCallRemoved: call=$call")
        call.unregisterCallback(callCallback)
        if (currentCall == call) {
            val wasIncomingUnanswered = (callDirection == "incoming" && (callState == "incoming" || callState == "ringing"))
            stopRingtoneAndVibration()
            stopDurationTimer()
            cancelNotification()
            restoreAudioMode()

            val endState = if (wasIncomingUnanswered) "missed" else "disconnected"
            callState = endState
            Log.i(TAG, "Call ended. Transitioning to $endState (wasIncomingUnanswered=$wasIncomingUnanswered)")
            notifyListeners()

            // Reset back to idle after 1.5 seconds so UI can cleanly show "Call Ended" / "Missed Call"
            mainHandler.postDelayed({
                if (currentCall == call) {
                    currentCall = null
                    callState = "idle"
                    callDirection = "outgoing"
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
            Call.STATE_RINGING -> "incoming"
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
        Log.i(TAG, "Call state transition: $previousState -> $newState (direction=$callDirection, raw=${call.state})")

        when (newState) {
            "incoming" -> {
                stopDurationTimer()
                callDurationSeconds = 0
                startRingtoneAndVibration()
                showIncomingCallNotification()
            }
            "ringing" -> {
                stopDurationTimer()
                callDurationSeconds = 0
                cancelNotification()
            }
            "active" -> {
                stopRingtoneAndVibration()
                cancelNotification()
                if (previousState != "active") {
                    callStartTime = System.currentTimeMillis()
                    startDurationTimer()
                }
                ensureAudioActive()
            }
            "disconnected" -> {
                stopRingtoneAndVibration()
                stopDurationTimer()
                cancelNotification()
                restoreAudioMode()
            }
            else -> {
                stopRingtoneAndVibration()
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

    // =============================================================
    // RINGTONE & VIBRATION ENGINE (Guarantees zero double-ringing)
    // =============================================================
    fun startRingtoneAndVibration() {
        val ctx = appContext ?: return
        stopRingtoneAndVibration()

        val audioManager = ctx.getSystemService(Context.AUDIO_SERVICE) as? AudioManager ?: return
        val ringerMode = audioManager.ringerMode

        // 1. Silent Mode -> Do nothing
        if (ringerMode == AudioManager.RINGER_MODE_SILENT) {
            Log.i(TAG, "Device in silent mode: no ringtone or vibration")
            return
        }

        // 2. Vibration (Normal & Vibrate Modes)
        if (ringerMode == AudioManager.RINGER_MODE_NORMAL || ringerMode == AudioManager.RINGER_MODE_VIBRATE) {
            try {
                vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    val vm = ctx.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager
                    vm?.defaultVibrator
                } else {
                    @Suppress("DEPRECATION")
                    ctx.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
                }
                val pattern = longArrayOf(0, 1000, 1000)
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    vibrator?.vibrate(VibrationEffect.createWaveform(pattern, 0))
                } else {
                    @Suppress("DEPRECATION")
                    vibrator?.vibrate(pattern, 0)
                }
                Log.i(TAG, "In-app vibration started")
            } catch (e: Exception) {
                Log.w(TAG, "Could not start vibration: ${e.message}")
            }
        }

        // 3. Ringtone Audio:
        // Android Telecom framework automatically plays the incoming cellular ringtone for the default dialer.
        // We do NOT play a second Ringtone instance here, preventing any duplicate/overlapping audio.
        Log.i(TAG, "Ringtone handled by native Telecom system ringer (zero duplicate ringtone)")
    }

    fun stopRingtoneAndVibration() {
        try {
            ringtone?.let {
                if (it.isPlaying) {
                    it.stop()
                }
            }
        } catch (e: Exception) {
            Log.w(TAG, "Error stopping ringtone: ${e.message}")
        }
        ringtone = null

        try {
            vibrator?.cancel()
        } catch (e: Exception) {
            Log.w(TAG, "Error stopping vibrator: ${e.message}")
        }
        vibrator = null
    }

    fun silenceRinger(): Boolean {
        Log.i(TAG, "CallManager.silenceRinger invoked")
        stopRingtoneAndVibration()
        try {
            val telecomManager = appContext?.getSystemService(Context.TELECOM_SERVICE) as? TelecomManager
            telecomManager?.silenceRinger()
            Log.i(TAG, "TelecomManager.silenceRinger() successfully invoked to silence ringer")
        } catch (e: Exception) {
            Log.w(TAG, "Error invoking telecomManager.silenceRinger: ${e.message}")
        }
        return true
    }

    // =============================================================
    // CALL CONTROLS
    // =============================================================
    fun answer(): Boolean {
        Log.i(TAG, "CallManager.answer called")
        stopRingtoneAndVibration()
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
        stopRingtoneAndVibration()
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
        stopRingtoneAndVibration()
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

        if (isEmergencyNumber(cleanNumber, context)) {
            Log.i(TAG, "Emergency number detected: $cleanNumber. Delegating directly to Android Telecom.")
        }

        phoneNumber = cleanNumber
        isPlacingOutgoingCall = true
        callDirection = "outgoing"
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
            Log.e(TAG, "SecurityException placing call: ${e.message}", e)
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

            // Interactive Actions (Answer, Reject, Silence) via CallNotificationReceiver
            val answerIntent = Intent(ctx, CallNotificationReceiver::class.java).apply {
                action = CallNotificationReceiver.ACTION_ANSWER
            }
            val rejectIntent = Intent(ctx, CallNotificationReceiver::class.java).apply {
                action = CallNotificationReceiver.ACTION_REJECT
            }
            val silenceIntent = Intent(ctx, CallNotificationReceiver::class.java).apply {
                action = CallNotificationReceiver.ACTION_SILENCE
            }

            val answerPendingIntent = PendingIntent.getBroadcast(ctx, 101, answerIntent, flags)
            val rejectPendingIntent = PendingIntent.getBroadcast(ctx, 102, rejectIntent, flags)
            val silencePendingIntent = PendingIntent.getBroadcast(ctx, 103, silenceIntent, flags)

            val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                Notification.Builder(ctx, CHANNEL_ID)
            } else {
                @Suppress("DEPRECATION")
                Notification.Builder(ctx)
            }

            builder.setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle("Incoming Gate Intercom")
                .setContentText(if (phoneNumber.isNotEmpty()) "Call from $phoneNumber" else "Incoming Call")
                .setCategory(Notification.CATEGORY_CALL)
                .setFullScreenIntent(fullScreenPendingIntent, true)
                .setContentIntent(fullScreenPendingIntent)
                .setAutoCancel(false)
                .setOngoing(true)

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                // Android 12+ Notification.CallStyle for prominent Answer & Reject heads-up UI
                val callerPerson = android.app.Person.Builder()
                    .setName(if (phoneNumber.isNotEmpty()) phoneNumber else "Resident / Caller")
                    .setUri(if (phoneNumber.isNotEmpty()) "tel:$phoneNumber" else null)
                    .setImportant(true)
                    .build()

                val callStyle = Notification.CallStyle.forIncomingCall(
                    callerPerson,
                    rejectPendingIntent,
                    answerPendingIntent
                )
                builder.style = callStyle

                // Also provide silence action
                builder.addAction(
                    Notification.Action.Builder(
                        null,
                        "Silence",
                        silencePendingIntent
                    ).build()
                )
            } else {
                // Below Android 12 fallback actions
                builder.addAction(R.mipmap.ic_launcher, "Reject", rejectPendingIntent)
                builder.addAction(R.mipmap.ic_launcher, "Answer", answerPendingIntent)
                builder.addAction(R.mipmap.ic_launcher, "Silence", silencePendingIntent)
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                builder.setVisibility(Notification.VISIBILITY_PUBLIC)
                @Suppress("DEPRECATION")
                builder.setPriority(Notification.PRIORITY_MAX)
            }

            val notificationManager = ctx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.notify(NOTIFICATION_ID, builder.build())
            Log.i(TAG, "Incoming call notification posted with CallStyle & actions for $phoneNumber")

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
                // Set sound to null so NotificationManager does NOT double-ring on top of our Ringtone!
                setSound(null, null)
                enableVibration(false)
                lockscreenVisibility = Notification.VISIBILITY_PUBLIC
            }
            val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.createNotificationChannel(channel)
        }
    }

    fun toStateMap(): Map<String, Any?> {
        val isIncomingBool = (callDirection == "incoming" || callState == "incoming")
        return mapOf(
            "state" to callState,
            "number" to phoneNumber,
            "direction" to (if (isIncomingBool) "incoming" else "outgoing"),
            "isIncoming" to isIncomingBool,
            "muted" to isMuted,
            "speaker" to isSpeaker,
            "duration" to callDurationSeconds
        )
    }

    fun addListener(listener: (Map<String, Any?>) -> Unit) {
        listeners.add(listener)
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
