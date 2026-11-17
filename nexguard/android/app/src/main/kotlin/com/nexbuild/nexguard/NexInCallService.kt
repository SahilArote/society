package com.nexbuild.nexguard

import android.content.Intent
import android.telecom.Call
import android.telecom.CallAudioState
import android.telecom.InCallService
import android.util.Log

/**
 * NexInCallService - System InCallService implementation for NexGuard.
 * Bound by the Android Telecom subsystem when NexGuard is the default phone app.
 * Relays lifecycle, call additions/removals, and audio updates to CallManager.
 */
class NexInCallService : InCallService() {
    companion object {
        private const val TAG = "NexCall"
        var instance: NexInCallService? = null
            private set
    }

    override fun onCreate() {
        super.onCreate()
        instance = this
        Log.i(TAG, "NexInCallService onCreate")
        CallManager.init(applicationContext)
        CallManager.registerInCallService(this)
    }

    override fun onCallAdded(call: Call) {
        super.onCallAdded(call)
        Log.i(TAG, "NexInCallService onCallAdded: $call (state=${call.state})")
        CallManager.onCallAdded(call, this)
        try {
            setMuted(false)
        } catch (e: Exception) {
            Log.w(TAG, "Could not pre-unmute call: ${e.message}")
        }
    }

    override fun onCallRemoved(call: Call) {
        super.onCallRemoved(call)
        Log.i(TAG, "NexInCallService onCallRemoved: $call")
        CallManager.onCallRemoved(call)
    }

    override fun onCallAudioStateChanged(audioState: CallAudioState) {
        super.onCallAudioStateChanged(audioState)
        Log.i(TAG, "NexInCallService onCallAudioStateChanged: route=${audioState.route}, isMuted=${audioState.isMuted}")
        CallManager.onAudioStateChanged(audioState)
    }

    override fun onBringToForeground(showDialpad: Boolean) {
        super.onBringToForeground(showDialpad)
        Log.i(TAG, "NexInCallService onBringToForeground (showDialpad=$showDialpad)")
        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or
                    Intent.FLAG_ACTIVITY_REORDER_TO_FRONT or
                    Intent.FLAG_ACTIVITY_SINGLE_TOP
        }
        startActivity(intent)
    }

    override fun onDestroy() {
        Log.i(TAG, "NexInCallService onDestroy")
        CallManager.unregisterInCallService(this)
        if (instance == this) {
            instance = null
        }
        super.onDestroy()
    }
}

