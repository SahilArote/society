# NexGuard In-App Cellular Calling Spike — Test & Verification Checklist

**App Package:** `com.nexbuild.nexguard`  
**Purpose:** Verify feasibility of running full in-app SIM cellular calls (incoming and outgoing) using Android `InCallService` and `RoleManager.ROLE_DIALER`, without ever launching the native dialer or breaking kiosk mode / screen pinning.  
**Log Tag Filter:** `adb logcat -s NexCall`

---

## Pre-Requisites
1. **Device:** Physical Android device (Phone or Tablet) with an active physical SIM or eSIM card capable of voice calling.
2. **OS Version:** Android 8.0+ (API 26+) recommended; tested through Android 14 (API 34).
3. **Permissions Granted:**
   - Phone / `CALL_PHONE`
   - `READ_PHONE_STATE`
   - Notifications (`POST_NOTIFICATIONS` on Android 13+)
4. **App Launch:** Open NexGuard, log in or reach the Profile tab, and tap **"Test In-App Dialer (Spike)"** under the **DEBUG SPIKE** card.

---

## 1. Granting Default Dialer Role

| Step | Action | Expected Result | Pass / Fail |
| :--- | :--- | :--- | :--- |
| 1.1 | Open Call Spike Screen. | Status banner displays **"Not Default Phone App"** (amber alert pill) with a button **"Set as Default Phone App"**. | [ ] |
| 1.2 | Tap **"Set as Default Phone App"**. | System dialog appears requesting to set **NexGuard** as default phone app (`RoleManager` prompt on Android 10+; `TelecomManager` dialog on Android 8–9). | [ ] |
| 1.3 | Tap **Cancel** on the system prompt. | Dialog closes, app does NOT crash, and status remains "Not Default Phone App". | [ ] |
| 1.4 | Tap **"Set as Default Phone App"** again and select **NexGuard** -> **Set as default**. | Dialog closes. Status card refreshes to **"Default Phone App Active"** (green verified pill) with message confirming `NexInCallService is active`. | [ ] |
| 1.5 | Check Logcat (`adb logcat -s NexCall`). | Log shows `RoleManager check: isRoleHeld(ROLE_DIALER) = true` (or `TelecomManager check: defaultDialerPackage = com.nexbuild.nexguard -> true`). | [ ] |

---

## 2. Outgoing Call

| Step | Action | Expected Result | Pass / Fail |
| :--- | :--- | :--- | :--- |
| 2.1 | In the **"Place Outgoing SIM Call"** card, type a valid destination phone number. | Number is entered into field with high contrast typography and clear formatting. | [ ] |
| 2.2 | Tap **"Call Number"** (green button). | Call initiates directly via `TelecomManager.placeCall`. **Native dialer app NEVER opens.** | [ ] |
| 2.3 | Observe UI state transition. | In-app calling card appears showing: large avatar, dialed number, status pill **"DIALING..."**, and in-call control strip (Mute, Speaker, End Call). | [ ] |
| 2.4 | Destination phone rings and answers. | Status pill transitions from **"DIALING..."** to **"ACTIVE CALL"** (green pill) and active duration timer starts ticking (`00:01`, `00:02`, ...). | [ ] |
| 2.5 | Check Logcat. | Logs show: `CallManager.placeCall initiated`, `TelecomManager.placeCall successfully invoked`, `onCallAdded`, `Call state transition: idle -> dialing -> active`. | [ ] |

---

## 3. Incoming Call

| Step | Action | Expected Result | Pass / Fail |
| :--- | :--- | :--- | :--- |
| 3.1 | Keep NexGuard open on the Call Spike screen or Dashboard. | Terminal is ready to receive calls. | [ ] |
| 3.2 | From another phone, place a voice call to the gate device's SIM number. | System Telecom subsystem binds `NexInCallService`. **Native incoming call screen does NOT appear.** | [ ] |
| 3.3 | Observe in-app incoming call card. | NexGuard displays **"INCOMING CALL"** (amber pill), large glowing avatar, caller's number, and two 56px action buttons: **"Reject"** (Red) and **"Answer"** (Green). | [ ] |
| 3.4 | Ringtone and Vibration. | Device rings and vibrates via the `nexguard_incoming_calls` high-priority notification channel. | [ ] |
| 3.5 | **Test Rejection:** Tap **"Reject"**. | Call is terminated immediately (`call.reject(false, null)`). Ringing stops, UI transitions to **"CALL DISCONNECTED"** and resets to idle dialpad. | [ ] |
| 3.6 | **Test Answering:** Repeat incoming call and tap **"Answer"**. | Call connects immediately via audio (`call.answer(STATE_AUDIO_ONLY)`). Ringing stops, UI transitions to **"ACTIVE CALL"** with running timer and two-way voice. | [ ] |

---

## 4. In-Call Audio Controls: Mute & Speaker

| Step | Action | Expected Result | Pass / Fail |
| :--- | :--- | :--- | :--- |
| 4.1 | During an active call, tap **"Mute"**. | Button turns active primary indigo, icon changes to `mic_off`, label changes to `Unmute`. Remote caller cannot hear guard voice. | [ ] |
| 4.2 | Tap **"Unmute"**. | Button returns to default state, icon changes to `mic`. Remote caller can hear guard voice again. | [ ] |
| 4.3 | Tap **"Speaker"**. | Button turns active primary indigo, audio output routes to device loudspeaker (`ROUTE_SPEAKER`), label changes to `Earpiece`. | [ ] |
| 4.4 | Tap **"Earpiece"**. | Audio switches back to handset earpiece/receiver (`ROUTE_EARPIECE`), label changes to `Speaker`. | [ ] |
| 4.5 | Check Logcat. | Logs show `NexInCallService onCallAudioStateChanged: route=..., isMuted=...` and `CallManager.setMuted / setSpeaker`. | [ ] |

---

## 5. Hangup Control

| Step | Action | Expected Result | Pass / Fail |
| :--- | :--- | :--- | :--- |
| 5.1 | During an active call or while dialing, tap the red **"End Call"** button (min height 56px). | Call disconnects immediately (`call.disconnect()`). | [ ] |
| 5.2 | Observe UI. | Status updates to **"CALL DISCONNECTED"** (red pill) for 1.5 seconds, then gracefully resets to the dialpad (`idle` state). | [ ] |
| 5.3 | Notification dismissal. | Any ongoing call notifications are automatically cancelled from the status bar. | [ ] |

---

## 6. Behavior with Screen Locked

| Step | Action | Expected Result | Pass / Fail |
| :--- | :--- | :--- | :--- |
| 6.1 | Lock the device screen (press hardware Power button). | Screen turns off and keyguard is active. | [ ] |
| 6.2 | Call the gate device's SIM number from another phone. | Full-screen intent fires: screen turns on automatically (`turnScreenOn`), and `MainActivity` surfaces over the lock screen (`showWhenLocked`). | [ ] |
| 6.3 | Answer the incoming call while locked. | Guard can tap **"Answer"** directly without unlocking the phone or entering device credentials. Call becomes active immediately. | [ ] |
| 6.4 | Tap **"End Call"** while locked. | Call terminates cleanly and screen returns to locked state or kiosk home. | [ ] |

---

## 7. Behavior Inside Kiosk / SureLock Setup

| Step | Action | Expected Result | Pass / Fail |
| :--- | :--- | :--- | :--- |
| 7.1 | Lock the device in SureLock or Android Lock Task Mode (single-app kiosk). | Only NexGuard is accessible. Status bar and hardware navigation keys are suppressed. | [ ] |
| 7.2 | Place an outgoing call or receive an incoming call. | **Zero unpinning prompts.** Because NexGuard manages the call directly via `InCallService`, Android never detects task switching to an external dialer. | [ ] |
| 7.3 | Complete and terminate the call. | Focus stays 100% within NexGuard. Guard has zero opportunity to escape to system settings, YouTube, browser, or native phone app. | [ ] |

---

## 8. Emergency Numbers Safety Verification

| Step | Action | Expected Result | Pass / Fail |
| :--- | :--- | :--- | :--- |
| 8.1 | Dial **112**, **100**, **101**, or **102** from the dialpad. | App recognizes emergency number and delegates directly to Android Telecom without interference. | [ ] |
| 8.2 | Check Logcat. | Log entry: `[NexCall] Emergency number detected: <number>. Delegating directly to Android Telecom.` | [ ] |

---

## 9. Non-Default Dialer Graceful Fallback

| Step | Action | Expected Result | Pass / Fail |
| :--- | :--- | :--- | :--- |
| 9.1 | In Android Settings -> Default apps, reset Phone app back to native system dialer. | NexGuard is no longer default dialer. | [ ] |
| 9.2 | Open NexGuard and standard visitor flow (e.g., calling resident). | Existing `PhoneService.call()` continues to operate via `FlutterPhoneDirectCaller` or `url_launcher` without crashing or breaking existing behavior. | [ ] |

