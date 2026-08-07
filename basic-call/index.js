/**
 * @format
 */

import { AppRegistry } from 'react-native';
import {
  getMessaging,
  setBackgroundMessageHandler,
} from '@react-native-firebase/messaging';
import App from './App';
import { name as appName } from './app.json';
import { handleBackgroundIncomingCall } from '@alaznah/calling';

// Background/quit-state data messages (must be registered before App mounts).
// On Android this is the ONLY reliable kill-state wake path: show a native
// full-screen ringing notification immediately. Signaling reconnect + invite
// sync happens once React mounts.
setBackgroundMessageHandler(getMessaging(), async remoteMessage => {
  console.log('[FCM] background message:', remoteMessage?.data ?? {});
  await handleBackgroundIncomingCall(remoteMessage);
});

AppRegistry.registerComponent(appName, () => App);
