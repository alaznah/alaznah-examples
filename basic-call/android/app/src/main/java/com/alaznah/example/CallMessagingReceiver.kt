package com.alaznah.example

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.util.Log
import com.alaznah.calling.AlaznahCallingModule
import com.alaznah.calling.IncomingCallActionReceiver
import io.invertase.firebase.messaging.ReactNativeFirebaseMessagingReceiver

/**
 * Intercepts FCM before React Native's headless JS task.
 *
 * Kill-state JS is too late / flaky for call cancel (TurboModule often null),
 * which left the ringing notification up and sometimes re-posted a bogus
 * "Incoming call is calling…" banner. Incoming invites are shown once natively
 * so the JS handler cannot duplicate them.
 */
class CallMessagingReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent?) {
    val extras = intent?.extras
    if (extras == null) {
      Log.e(TAG, "FCM intent missing extras")
      return
    }

    val type = readData(extras, "type")
    val callId = readData(extras, "callId")

    if (callId.isNotEmpty() && (
        type == "call_canceled" ||
          type == "call_cancelled" ||
          type == "call_end"
        )
    ) {
      Log.i(TAG, "native cancel callId=$callId")
      AlaznahCallingModule.cancelCall(context.applicationContext, callId)
      // Do not forward to RN — prevents duplicate / bogus invite UI.
      return
    }

    if (callId.isNotEmpty() && type == "incoming_call") {
      val callerId = readData(extras, "callerId").ifEmpty {
        readData(extras, "handle").ifEmpty { "Incoming call" }
      }
      val mediaType = if (readData(extras, "mediaType") == "video") "video" else "audio"
      val signalingHttp = readData(extras, "signalingHttp").trim()
      val calleeId = readData(extras, "calleeId").trim()

      if (signalingHttp.isNotEmpty() && calleeId.isNotEmpty()) {
        IncomingCallActionReceiver.preferences(context).edit()
          .putString(AlaznahCallingModule.KEY_HTTP_BASE, signalingHttp)
          .putString(AlaznahCallingModule.KEY_USER_ID, calleeId)
          .commit()
        Log.i(TAG, "stored decline endpoint=$signalingHttp user=$calleeId")
      } else {
        Log.w(TAG, "invite missing signalingHttp/calleeId — Decline may not reach signaling")
      }

      val rejectToken = readData(extras, "rejectToken").trim()
      if (rejectToken.isNotEmpty()) {
        AlaznahCallingModule.storeRejectToken(context.applicationContext, callId, rejectToken)
      } else {
        Log.w(TAG, "invite missing rejectToken — kill-state Decline will be rejected by server")
      }

      val title = "Incoming ${if (mediaType == "video") "Video" else "Audio"} call"
      val body = "$callerId is calling…"
      Log.i(TAG, "native incoming callId=$callId from=$callerId")
      AlaznahCallingModule.showFromPush(
        context.applicationContext,
        title,
        body,
        callId,
        callerId,
        mediaType,
      )
      // Do not forward to RN — JS handleBackgroundIncomingCall would show again.
      return
    }

    // Non-call messages: keep default React Native Firebase behaviour.
    ReactNativeFirebaseMessagingReceiver().onReceive(context, intent)
  }

  private fun readData(extras: Bundle, key: String): String {
    val raw = extras.get(key) ?: return ""
    return raw.toString().trim()
  }

  companion object {
    private const val TAG = "CallMessagingReceiver"
  }
}
