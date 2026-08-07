import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  CallingProvider,
  LocalVideoView,
  RemoteVideoView,
  useCall,
  useCallQuality,
  useCallingClient,
  useCallingReady,
  useIncomingCall,
} from '@alaznah/calling';

const SIGNALING_URL = process.env.EXPO_PUBLIC_SIGNALING_URL ?? 'ws://localhost:8080';

type DemoProps = {
  userId: string;
};

function CallScreen({ userId }: DemoProps) {
  const client = useCallingClient();
  const ready = useCallingReady();
  const call = useCall();
  const incoming = useIncomingCall();
  const quality = useCallQuality();
  const [peerId, setPeerId] = useState(userId === 'alice' ? 'bob' : 'alice');

  const status = useMemo(() => {
    if (!ready) return 'Connecting to signaling…';
    if (incoming?.state === 'ringing') return `Incoming ${incoming.mediaType} call from ${incoming.peerId}`;
    if (call) return `Call ${call.state} with ${call.peerId}`;
    return 'Ready';
  }, [ready, incoming, call]);

  return (
    <SafeAreaView style={styles.root}>
      <Text style={styles.title}>Alaznah Calling</Text>
      <Text style={styles.meta}>You are: {userId}</Text>
      <Text style={styles.meta}>{status}</Text>
      {!ready && <ActivityIndicator style={{ marginVertical: 12 }} />}

      <TextInput
        style={styles.input}
        value={peerId}
        onChangeText={setPeerId}
        autoCapitalize="none"
        placeholder="Peer user id"
      />

      <View style={styles.row}>
        <Btn
          label="Audio Call"
          onPress={() => void client.startCall({ calleeId: peerId, mediaType: 'audio' })}
        />
        <Btn
          label="Video Call"
          onPress={() => void client.startCall({ calleeId: peerId, mediaType: 'video' })}
        />
      </View>

      {incoming?.state === 'ringing' && (
        <View style={styles.row}>
          <Btn label="Accept" onPress={() => void client.accept(incoming.callId)} />
          <Btn label="Reject" onPress={() => void client.reject(incoming.callId)} />
        </View>
      )}

      {call && !['ended', 'failed', 'rejected', 'missed', 'busy'].includes(call.state) && (
        <>
          <View style={styles.videoBox}>
            <RemoteVideoView stream={call.remoteStream} style={styles.remote} objectFit="cover" />
            <LocalVideoView stream={call.localStream} style={styles.local} mirror />
          </View>

          <Text style={styles.meta}>
            Quality: {quality?.tier ?? call.quality.tier}
            {quality?.rttMs != null ? ` · RTT ${quality.rttMs}ms` : ''}
            {quality?.packetLoss != null ? ` · loss ${(quality.packetLoss * 100).toFixed(1)}%` : ''}
            {quality?.candidateType ? ` · ${quality.candidateType}` : ''}
          </Text>

          <View style={styles.row}>
            <Btn
              label={call.muted ? 'Unmute' : 'Mute'}
              onPress={() => void client.setMuted(!call.muted)}
            />
            <Btn
              label={call.videoEnabled ? 'Cam Off' : 'Cam On'}
              onPress={() => void client.setVideoEnabled(!call.videoEnabled)}
            />
            <Btn label="Flip" onPress={() => void client.switchCamera()} />
            <Btn label="End" onPress={() => void client.end()} />
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

function Btn({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.btn} onPress={onPress}>
      <Text style={styles.btnText}>{label}</Text>
    </Pressable>
  );
}

export default function App() {
  const [userId, setUserId] = useState('alice');
  const [started, setStarted] = useState(false);

  if (!started) {
    return (
      <SafeAreaView style={styles.root}>
        <Text style={styles.title}>Pick demo identity</Text>
        <TextInput style={styles.input} value={userId} onChangeText={setUserId} autoCapitalize="none" />
        <Btn label="Start" onPress={() => setStarted(true)} />
        <Text style={styles.meta}>Signaling: {SIGNALING_URL}</Text>
        <Text style={styles.meta}>Use two devices/simulators as alice & bob with the same signaling server.</Text>
      </SafeAreaView>
    );
  }

  return (
    <CallingProvider
      config={{
        signalingUrl: SIGNALING_URL,
        userId,
        getAuthToken: async () => `dev:${userId}`,
        enableCallKeep: true,
        callKeepOptions: { appName: 'Alaznah Calling', supportsVideo: true },
        logger: console,
      }}
    >
      <CallScreen userId={userId} />
    </CallingProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 16, backgroundColor: '#0b1220' },
  title: { color: '#fff', fontSize: 22, fontWeight: '700', marginBottom: 8 },
  meta: { color: '#9fb0d0', marginBottom: 6 },
  input: {
    backgroundColor: '#18233a',
    color: '#fff',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginVertical: 10,
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 8 },
  btn: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  btnText: { color: '#fff', fontWeight: '600' },
  videoBox: {
    flex: 1,
    minHeight: 280,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#111827',
    marginTop: 8,
  },
  remote: { ...StyleSheet.absoluteFillObject },
  local: {
    position: 'absolute',
    width: 110,
    height: 160,
    right: 12,
    top: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
});
