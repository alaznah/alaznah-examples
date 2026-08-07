/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';

jest.mock('react-native-safe-area-context', () => {
  const ReactModule = require('react');
  const { View } = require('react-native');
  return {
    SafeAreaProvider: ({ children }: { children: React.ReactNode }) =>
      ReactModule.createElement(View, null, children),
    SafeAreaView: ({ children, ...props }: { children: React.ReactNode }) =>
      ReactModule.createElement(View, props, children),
  };
});

jest.mock('@alaznah/calling', () => ({
  CallingProvider: ({ children }: { children: React.ReactNode }) => children,
  useCall: () => null,
  useCallQuality: () => null,
  useCallingClient: () => ({
    startCall: jest.fn(),
    accept: jest.fn(),
    reject: jest.fn(),
    end: jest.fn(),
    setMuted: jest.fn(),
    setVideoEnabled: jest.fn(),
    switchCamera: jest.fn(),
    setTorch: jest.fn(),
    setSpeaker: jest.fn(),
    registerPushToken: jest.fn(),
    syncPendingCalls: jest.fn(),
    on: () => () => undefined,
    getActiveCall: () => null,
  }),
  useCallingReady: () => true,
  useIncomingCall: () => null,
}));

jest.mock('@alaznah/calling/ui', () => ({
  CallingUI: () => null,
}));

jest.mock('../src/useFirebase', () => ({
  __esModule: true,
  default: () => ({
    fcmToken: null,
    foregroundMessage: null,
    openedNotification: null,
    initialNotification: null,
  }),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async () => null),
    setItem: jest.fn(async () => undefined),
    removeItem: jest.fn(async () => undefined),
  },
}));

test('renders identity and signaling setup', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(<App />);
  });

  const root = renderer!.root;
  expect(root.findByProps({ accessibilityLabel: 'Your user ID' }).props.value).toBe(
    'alice',
  );
  expect(
    root.findByProps({ accessibilityLabel: 'Signaling WebSocket URL' }).props.value,
  ).toMatch(/^ws:\/\//);
  expect(root.findAllByProps({ accessibilityRole: 'button' }).length).toBeGreaterThan(0);
});
