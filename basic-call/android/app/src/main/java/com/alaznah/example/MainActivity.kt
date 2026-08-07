package com.alaznah.example

import android.content.Intent
import android.content.res.Configuration
import android.os.Build
import android.os.Bundle
import android.view.WindowManager
import com.alaznah.calling.AlaznahCallingModule
import com.alaznah.calling.AlaznahCallingPipModule
import com.alaznah.calling.IncomingCallActionReceiver
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

  override fun getMainComponentName(): String = "AlaznahExample"

  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

  override fun onCreate(savedInstanceState: Bundle?) {
    // Persist Accept/Decline from the launch Intent before React boots so JS
    // consumePendingAction cannot race a missing SharedPreferences write.
    IncomingCallActionReceiver.persistFromLaunchIntent(this, intent)
    enableShowOverLockScreen(intent)
    super.onCreate(savedInstanceState)
  }

  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    setIntent(intent)
    IncomingCallActionReceiver.persistFromLaunchIntent(this, intent)
    enableShowOverLockScreen(intent)
  }

  override fun onUserLeaveHint() {
    super.onUserLeaveHint()
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      AlaznahCallingPipModule.enterIfEnabled(this)
    }
  }

  override fun onPictureInPictureModeChanged(
      isInPictureInPictureMode: Boolean,
      newConfig: Configuration,
  ) {
    super.onPictureInPictureModeChanged(isInPictureInPictureMode, newConfig)
    AlaznahCallingPipModule.notifyPipModeChanged(isInPictureInPictureMode)
  }

  private fun enableShowOverLockScreen(intent: Intent?) {
    val fromIncomingAccept =
      intent?.getStringExtra(AlaznahCallingModule.EXTRA_ACTION) == "accept" ||
        !intent?.getStringExtra(AlaznahCallingModule.EXTRA_CALL_ID).isNullOrBlank()
    if (!fromIncomingAccept && Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
      return
    }
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
      setShowWhenLocked(true)
      setTurnScreenOn(true)
    } else {
      @Suppress("DEPRECATION")
      window.addFlags(
        WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
          WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
          WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD,
      )
    }
    window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
  }
}
