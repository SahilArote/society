package com.nexbuild.nexguard

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

/**
 * CallNotificationReceiver - Handles notification action clicks (Answer, Reject, Silence)
 * for incoming calls in background, lock screen, and screen pinned / kiosk mode.
 */
class CallNotificationReceiver : BroadcastReceiver() {
    companion object {
        private const val TAG = "NexCall"
        const val ACTION_ANSWER = "com.nexbuild.nexguard.ACTION_ANSWER"
        const val ACTION_REJECT = "com.nexbuild.nexguard.ACTION_REJECT"
        const val ACTION_SILENCE = "com.nexbuild.nexguard.ACTION_SILENCE"
    }

    override fun onReceive(context: Context, intent: Intent?) {
        val action = intent?.action ?: return
        Log.i(TAG, "CallNotificationReceiver received action: $action")

        when (action) {
            ACTION_ANSWER -> {
                Log.i(TAG, "Notification action: ANSWER tapped")
                CallManager.answer()

                // Bring MainActivity to the front in the SAME TASK so screen pinning / lock task is never broken
                try {
                    val mainIntent = Intent(context, MainActivity::class.java).apply {
                        this.action = Intent.ACTION_MAIN
                        addCategory(Intent.CATEGORY_LAUNCHER)
                        flags = Intent.FLAG_ACTIVITY_NEW_TASK or
                                Intent.FLAG_ACTIVITY_REORDER_TO_FRONT or
                                Intent.FLAG_ACTIVITY_SINGLE_TOP
                        putExtra("incoming_call", true)
                        putExtra("phone_number", CallManager.phoneNumber)
                    }
                    context.startActivity(mainIntent)
                    Log.i(TAG, "MainActivity brought to front on call answer")
                } catch (e: Exception) {
                    Log.e(TAG, "Failed to bring MainActivity to front on answer: ${e.message}", e)
                }
            }

            ACTION_REJECT -> {
                Log.i(TAG, "Notification action: REJECT tapped")
                CallManager.reject()
            }

            ACTION_SILENCE -> {
                Log.i(TAG, "Notification action: SILENCE tapped")
                CallManager.silenceRinger()
            }
        }
    }
}
