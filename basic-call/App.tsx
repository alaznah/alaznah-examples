import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import {
  CallingProvider,
  CallingUI,
  handleBackgroundIncomingCall,
  useCall,
  useCallingClient,
  useCallingReady,
  useIncomingCall,
  useWakingForCall,
} from '@alaznah/calling';
import { clearSession, loadSession, saveSession } from './src/session';
import useFirebase from './src/useFirebase';

// Physical devices must use the Mac/Laptop LAN IP (not localhost / 10.0.2.2).
const DEFAULT_SIGNALING_URL = Platform.select({
  ios: 'ws://192.168.0.102:8080',
  android: 'ws://192.168.0.102:8080',
  default: 'ws://192.168.114.114:8080',
})!;
const PREVIOUS_LAN_URLS = [
  'ws://10.0.2.2:8080',
  'ws://192.168.0.104:8080',
  'ws://192.168.114.114:8080',
];
const RING_TIMEOUT_MS = 60_000;

/** Docs website dark theme (`documentation-website` globals.css). */
const DOCS = {
  bg: '#0b1220',
  surface: '#111827',
  surface2: '#1f2937',
  text: '#f9fafb',
  textMuted: '#9ca3af',
  accent: '#3b82f6',
  accentHover: '#2563eb',
  success: '#22c55e',
  danger: '#f87171',
  border: '#374151',
  errorBg: '#3f1515',
  errorText: '#fecaca',
} as const;

function DialerButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        disabled && styles.disabledButton,
        pressed && styles.pressedButton,
      ]}
    >
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

function CallingScreen({
  userId,
  onLogout,
}: {
  userId: string;
  onLogout: () => void;
}) {
  const client = useCallingClient();
  const ready = useCallingReady();
  const wakingForCall = useWakingForCall();
  const call = useCall();
  const incoming = useIncomingCall();
  const {
    fcmToken,
    foregroundMessage,
    openedNotification,
    initialNotification,
  } = useFirebase();
  const [peerId, setPeerId] = useState(userId === 'alice' ? 'bob' : 'alice');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready || !fcmToken) return;
    void client
      .registerPushToken(fcmToken, Platform.OS === 'ios' ? 'ios' : 'android')
      .catch(() => undefined);
  }, [client, ready, fcmToken]);

  useEffect(() => {
    if (!ready) return;
    const data =
      foregroundMessage?.data ??
      openedNotification?.data ??
      initialNotification?.data;
    if (!data) return;
    if (data.type === 'call_canceled' && typeof data.callId === 'string') {
      void handleBackgroundIncomingCall({ data }).finally(() => {
        void client.syncPendingCalls().catch(() => undefined);
      });
      return;
    }
    if (data.type === 'incoming_call' || data.callId) {
      void client.syncPendingCalls().catch(() => undefined);
    }
  }, [
    client,
    ready,
    foregroundMessage,
    openedNotification,
    initialNotification,
  ]);

  const status = useMemo(() => {
    if (!ready) return 'Connecting to signaling…';
    if (incoming?.state === 'ringing') {
      return `Incoming ${incoming.mediaType} call from ${incoming.peerId}`;
    }
    if (call) return `${call.peerId}: ${call.state}`;
    return 'Ready to call';
  }, [call, incoming, ready]);

  const run = (operation: () => Promise<unknown>) => {
    setError(null);
    operation().catch(reason => {
      setError(reason instanceof Error ? reason.message : String(reason));
    });
  };

  const callActive =
    call != null &&
    !['ended', 'failed', 'rejected', 'missed', 'busy'].includes(call.state);
  const showIncoming = incoming?.state === 'ringing';
  const showDialer = ready && !callActive && !showIncoming && !wakingForCall;

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.screen}>
        <StatusBar barStyle="light-content" backgroundColor={DOCS.bg} />
        <View style={styles.header}>
          {!wakingForCall ? (
            <>
              <Text style={styles.title}>Alaznah Calling</Text>
              <Text style={styles.subtitle}>Signed in as {userId}</Text>
              <View style={styles.statusRow}>
                <View
                  style={[styles.dot, ready ? styles.online : styles.offline]}
                />
                <Text style={styles.status}>{status}</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={onLogout}
                style={styles.logoutLink}
              >
                <Text style={styles.logoutText}>Logout / clear session</Text>
              </Pressable>
            </>
          ) : null}
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {!ready ? (
          <ActivityIndicator color={DOCS.accent} style={styles.loader} />
        ) : null}

        {wakingForCall && !callActive ? (
          <View style={styles.center}>
            <ActivityIndicator color={DOCS.accent} size="large" />
            <Text style={styles.subtitle}>Connecting call…</Text>
          </View>
        ) : null}

        {showDialer && !callActive && !showIncoming ? (
          <View style={styles.card}>
            <Text style={styles.label}>Call user</Text>
            <TextInput
              accessibilityLabel="Peer user ID"
              autoCapitalize="none"
              autoCorrect={false}
              onChangeText={setPeerId}
              placeholder="bob"
              placeholderTextColor={DOCS.textMuted}
              style={styles.input}
              value={peerId}
            />
            <View style={styles.row}>
              <DialerButton
                disabled={!ready || !peerId.trim()}
                label="Audio call"
                onPress={() =>
                  run(() =>
                    client.startCall({
                      calleeId: peerId.trim(),
                      calleeDisplayName: peerId.trim(),
                      mediaType: 'audio',
                    }),
                  )
                }
              />
              <DialerButton
                disabled={!ready || !peerId.trim()}
                label="Video call"
                onPress={() =>
                  run(() =>
                    client.startCall({
                      calleeId: peerId.trim(),
                      calleeDisplayName: peerId.trim(),
                      mediaType: 'video',
                    }),
                  )
                }
              />
            </View>
            <Text style={styles.hint}>
              Default UI is WhatsApp-style from the SDK (`CallingUI`). Override
              theme/slots or replace screens entirely. iOS lock-screen/killed
              presentation remains native CallKit.
            </Text>
          </View>
        ) : null}
      </SafeAreaView>

      {/*
        CallingUI sits on the Activity root (outside SafeAreaView) so Android
        system PiP captures the call surface. Full-screen UI still uses Modal
        inside CallingUI — layout is unchanged from the proven Modal path.
      */}
      <CallingUI
        client={client}
        onError={err => setError(err.message)}
        theme={{
          colors: {
            background: DOCS.bg,
            accent: DOCS.accent,
            success: DOCS.success,
            danger: DOCS.danger,
            text: DOCS.text,
            textMuted: DOCS.textMuted,
            surface: DOCS.surface,
            control: DOCS.surface2,
            controlActive: DOCS.accent,
            overlay: 'rgba(11,18,32,0.55)',
            controlBar: DOCS.surface,
            iconDisabled: DOCS.textMuted,
          },
        }}
      />
    </View>
  );
}

function App() {
  const [identity, setIdentity] = useState('alice');
  const [signalingUrl, setSignalingUrl] = useState(DEFAULT_SIGNALING_URL);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const [hydrating, setHydrating] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const saved = await loadSession();
      if (cancelled) return;
      if (saved) {
        setIdentity(saved.userId);
        setSignalingUrl(
          PREVIOUS_LAN_URLS.includes(saved.signalingUrl)
            ? DEFAULT_SIGNALING_URL
            : saved.signalingUrl,
        );
        setDeviceId(saved.deviceId);
        setStarted(true);
      }
      setHydrating(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const startWithSession = async () => {
    const session = await saveSession({
      userId: identity.trim(),
      signalingUrl: signalingUrl.trim(),
      deviceId: deviceId ?? undefined,
    });
    setDeviceId(session.deviceId);
    setIdentity(session.userId);
    setSignalingUrl(session.signalingUrl);
    setStarted(true);
  };

  const logout = async () => {
    await clearSession();
    setStarted(false);
    setDeviceId(null);
  };

  if (hydrating) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={[styles.screen, styles.center]}>
          <ActivityIndicator color={DOCS.accent} size="large" />
          <Text style={styles.subtitle}>Restoring session…</Text>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  if (!started) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.screen}>
          <StatusBar barStyle="light-content" backgroundColor={DOCS.bg} />
          <View style={styles.welcome}>
            <Text style={styles.title}>Alaznah Calling</Text>
            <Text style={styles.subtitle}>
              Your session is saved — reopen after kill to auto sign in.
            </Text>
            <Text style={styles.label}>Your user ID</Text>
            <TextInput
              accessibilityLabel="Your user ID"
              autoCapitalize="none"
              onChangeText={setIdentity}
              style={styles.input}
              value={identity}
            />
            <Text style={styles.label}>Signaling WebSocket URL</Text>
            <TextInput
              accessibilityLabel="Signaling WebSocket URL"
              autoCapitalize="none"
              autoCorrect={false}
              onChangeText={setSignalingUrl}
              style={styles.input}
              value={signalingUrl}
            />
            <DialerButton
              disabled={!identity.trim() || !signalingUrl.trim()}
              label="Start calling app"
              onPress={() => {
                void startWithSession();
              }}
            />
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <CallingProvider
        config={{
          signalingUrl: signalingUrl.trim(),
          userId: identity.trim(),
          displayName: identity.trim(),
          deviceId: deviceId ?? undefined,
          getAuthToken: async () => `dev:${identity.trim()}`,
          ringTimeoutMs: RING_TIMEOUT_MS,
          enableCallKeep: false,
          callKeepOptions: {
            appName: 'Alaznah Calling',
            supportsVideo: true,
          },
          logger: console,
        }}
      >
        <CallingScreen
          userId={identity.trim()}
          onLogout={() => void logout()}
        />
      </CallingProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: DOCS.bg,
  },
  screen: {
    flex: 1,
    backgroundColor: DOCS.bg,
    paddingHorizontal: 18,
  },
  welcome: {
    flex: 1,
    justifyContent: 'center',
    gap: 12,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  logoutLink: {
    alignSelf: 'flex-start',
    marginTop: 10,
  },
  logoutText: {
    color: DOCS.danger,
    fontSize: 13,
    fontWeight: '600',
  },
  header: {
    paddingBottom: 16,
    paddingTop: 10,
  },
  title: {
    color: DOCS.text,
    fontSize: 27,
    fontWeight: '800',
  },
  subtitle: {
    color: DOCS.textMuted,
    fontSize: 14,
    marginTop: 5,
  },
  statusRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: 10,
  },
  dot: {
    borderRadius: 5,
    height: 10,
    marginRight: 8,
    width: 10,
  },
  online: {
    backgroundColor: DOCS.success,
  },
  offline: {
    backgroundColor: '#fb923c',
  },
  status: {
    color: DOCS.text,
  },
  loader: {
    marginVertical: 12,
  },
  error: {
    backgroundColor: DOCS.errorBg,
    borderRadius: 12,
    color: DOCS.errorText,
    marginBottom: 12,
    padding: 10,
  },
  card: {
    backgroundColor: DOCS.surface,
    borderColor: DOCS.border,
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
  },
  hint: {
    color: DOCS.textMuted,
    fontSize: 12,
    marginTop: 14,
    lineHeight: 18,
  },
  label: {
    color: DOCS.text,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 6,
  },
  input: {
    backgroundColor: DOCS.bg,
    borderColor: DOCS.border,
    borderRadius: 12,
    borderWidth: 1,
    color: DOCS.text,
    fontSize: 16,
    marginBottom: 10,
    paddingHorizontal: 13,
    paddingVertical: 12,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
  },
  button: {
    backgroundColor: DOCS.accent,
    borderRadius: 12,
    minWidth: 104,
    paddingHorizontal: 17,
    paddingVertical: 12,
  },
  disabledButton: {
    opacity: 0.4,
  },
  pressedButton: {
    opacity: 0.75,
    backgroundColor: DOCS.accentHover,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '700',
    textAlign: 'center',
  },
});

export default App;
