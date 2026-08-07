import { getApp } from '@react-native-firebase/app';
import {
  AuthorizationStatus,
  FirebaseMessagingTypes,
  getInitialNotification as getInitialNotif,
  getMessaging,
  getToken as getMessagingToken,
  onMessage as onMsgListener,
  onNotificationOpenedApp as onNotificationOpenedListener,
  onTokenRefresh as onTokenRefreshListener,
  requestPermission,
} from '@react-native-firebase/messaging';
import { useEffect, useRef, useState } from 'react';
import {
  PermissionsAndroid,
  Platform,
} from 'react-native';
import {
  onIosVoipToken,
  registerIosVoipToken,
} from '@alaznah/calling';

interface UnsubscribeRefs {
  tokenRefresh: (() => void) | null;
  onMessage: (() => void) | null;
  onNotificationOpened: (() => void) | null;
  voipToken: (() => void) | null;
}

export type UseFirebaseReturn = {
  /** Platform push token used for wake-ups: FCM on Android, PushKit VoIP on iOS. */
  fcmToken: string | null;
  requestNotificationPermissions: () => Promise<boolean>;
  foregroundMessage: FirebaseMessagingTypes.RemoteMessage | null;
  openedNotification: FirebaseMessagingTypes.RemoteMessage | null;
  initialNotification: FirebaseMessagingTypes.RemoteMessage | null;
};

async function registerVoipToken(): Promise<string | null> {
  if (Platform.OS !== 'ios') return null;
  try {
    const token = await registerIosVoipToken();
    return typeof token === 'string' && token.length > 0 ? token : null;
  } catch (err) {
    console.warn('[VoipPush] register failed', err);
    return null;
  }
}

const useFirebase = (): UseFirebaseReturn => {
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [foregroundMessage, setForegroundMessage] =
    useState<FirebaseMessagingTypes.RemoteMessage | null>(null);
  const [openedNotification, setOpenedNotification] =
    useState<FirebaseMessagingTypes.RemoteMessage | null>(null);
  const [initialNotification, setInitialNotification] =
    useState<FirebaseMessagingTypes.RemoteMessage | null>(null);

  const unsubRef = useRef<UnsubscribeRefs>({
    tokenRefresh: null,
    onMessage: null,
    onNotificationOpened: null,
    voipToken: null,
  });

  const requestNotificationPermissions = async (): Promise<boolean> => {
    try {
      if (Platform.OS === 'ios') {
        const messagingInstance = getMessaging(getApp());
        const authorizationStatus = await requestPermission(messagingInstance);
        return (
          authorizationStatus === AuthorizationStatus.AUTHORIZED ||
          authorizationStatus === AuthorizationStatus.PROVISIONAL
        );
      }
      if (Platform.OS === 'android') {
        if (Platform.Version >= 33) {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
          );
          return granted === PermissionsAndroid.RESULTS.GRANTED;
        }
        return true;
      }
      return true;
    } catch (error) {
      console.warn('[FCM] permission error:', error);
      return false;
    }
  };

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        if (Platform.OS === 'ios') {
          // Standard notification permission is independent from PushKit /
          // CallKit. A denial must not disable incoming VoIP calls.
          await requestNotificationPermissions();
          if (cancelled) return;
          // iOS kill/background wake requires a PushKit VoIP token → APNs VoIP push
          // → CallKit. FCM alone cannot show a native incoming-call UI when killed.
          const voip = await registerVoipToken();
          if (!cancelled && voip) {
            setFcmToken(voip);
            console.log('[VoipPush] token:', voip);
          }
          unsubRef.current.voipToken = onIosVoipToken(token => {
            console.log('[VoipPush] token updated:', token);
            setFcmToken(token);
          });
        } else {
          const hasPerm = await requestNotificationPermissions();
          if (!hasPerm || cancelled) return;
          const messagingInstance = getMessaging(getApp());
          const token = await getMessagingToken(messagingInstance);
          if (!cancelled) {
            setFcmToken(token);
            console.log('[FCM] token:', token);
          }

          unsubRef.current.tokenRefresh = onTokenRefreshListener(
            messagingInstance,
            newToken => {
              console.log('[FCM] token refreshed:', newToken);
              setFcmToken(newToken);
            },
          );

          unsubRef.current.onMessage = onMsgListener(
            messagingInstance,
            (remoteMessage: FirebaseMessagingTypes.RemoteMessage) => {
              console.log('[FCM] foreground message:', remoteMessage);
              setForegroundMessage(remoteMessage);
            },
          );

          unsubRef.current.onNotificationOpened = onNotificationOpenedListener(
            messagingInstance,
            (remoteMessage: FirebaseMessagingTypes.RemoteMessage) => {
              console.log('[FCM] opened from background:', remoteMessage?.data);
              setOpenedNotification(remoteMessage);
            },
          );

          const initNotif = await getInitialNotif(messagingInstance);
          if (initNotif && !cancelled) {
            console.log('[FCM] opened from quit:', initNotif?.data);
            setInitialNotification(initNotif);
          }
        }
      } catch (err) {
        console.error('[push] init error:', err);
      }
    };

    void init();

    return () => {
      cancelled = true;
      unsubRef.current.tokenRefresh?.();
      unsubRef.current.onMessage?.();
      unsubRef.current.onNotificationOpened?.();
      unsubRef.current.voipToken?.();
    };
  }, []);

  return {
    fcmToken,
    requestNotificationPermissions,
    foregroundMessage,
    openedNotification,
    initialNotification,
  };
};

export default useFirebase;
