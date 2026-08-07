import AsyncStorage from '@react-native-async-storage/async-storage';

const SESSION_KEY = '@alaznah/demo-session/v1';

export type SavedSession = {
  userId: string;
  signalingUrl: string;
  deviceId: string;
  savedAt: number;
};

function createDeviceId(): string {
  return `device-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function loadSession(): Promise<SavedSession | null> {
  try {
    const raw = await AsyncStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedSession;
    if (!parsed?.userId || !parsed?.signalingUrl) return null;
    if (!parsed.deviceId) {
      parsed.deviceId = createDeviceId();
      await saveSession(parsed);
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function saveSession(
  input: Omit<SavedSession, 'savedAt' | 'deviceId'> & { deviceId?: string },
): Promise<SavedSession> {
  const existing = await loadSession();
  const session: SavedSession = {
    userId: input.userId.trim(),
    signalingUrl: input.signalingUrl.trim(),
    deviceId: input.deviceId ?? existing?.deviceId ?? createDeviceId(),
    savedAt: Date.now(),
  };
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export async function clearSession(): Promise<void> {
  await AsyncStorage.removeItem(SESSION_KEY);
}
