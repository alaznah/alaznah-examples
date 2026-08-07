# Alaznah Examples

**Repository:** [Alaznah/alaznah-examples](https://github.com/Alaznah/alaznah-examples)  
**Status:** Public

Sample React Native apps for **Alaznah Calling**. Use these to validate signaling, TURN, and SDK integration against Alaznah Cloud or a self-hosted stack.

## Apps

| Folder | Focus |
| --- | --- |
| `basic-call/` | Primary 1:1 audio/video demo (iOS + Android) |
| `video-chat/` | Lightweight video-oriented scaffold |
| `group-call/` | Reserved for future group / SFU demos |

Exact package names live in each app’s `package.json`.

## Prerequisites

- Node 18+
- Xcode / Android Studio as needed
- Alaznah Calling SDK ([alaznah-sdk](https://github.com/Alaznah/alaznah-sdk))
- Calling JWT from [alaznah.dev](https://alaznah.dev) (or your mint backend)
- Signaling URL, e.g. `wss://signal.alaznah.com`

## Quick start (`basic-call`)

```bash
cd basic-call
npm install
# configure signalingUrl + getAuthToken in the app entry

# iOS
cd ios && pod install && cd ..
npm run ios

# Android
npm run android
```

Do **not** commit Firebase private keys, APNs `.p8`, or production API keys. Use env files / CI secrets (gitignored).

## Configuration checklist

- [ ] `signalingUrl` → `wss://signal.alaznah.com` (or self-host)
- [ ] Short-lived JWT via your backend → docs mint API
- [ ] Same `userId` space on both devices for 1:1 tests
- [ ] Physical devices for VoIP / FCM kill-state tests

## Related repositories

| Repo | Role |
| --- | --- |
| [alaznah-sdk](https://github.com/Alaznah/alaznah-sdk) | SDK source |
| [alaznah-docs](https://github.com/Alaznah/alaznah-docs) | Console + JWT |
| [alaznah-signaling](https://github.com/Alaznah/alaznah-signaling) | Server stack |
| [alaznah-protocol](https://github.com/Alaznah/alaznah-protocol) | Wire protocol |

## License

MIT for sample code unless a subdirectory states otherwise. Alaznah trademarks remain Alaznah’s.
